/**
 * API-маршруты для работы с конкретным товаром по ID.
 *
 * GET    /api/products/[id]  — получение одного товара
 * PUT    /api/products/[id]  — частичное обновление товара (только переданные поля)
 * DELETE /api/products/[id]  — удаление товара (вместе с файлом изображения)
 *
 * Важно: в Next.js 15+ параметр params является Promise!
 * Его необходимо await-ить перед использованием. Это изменение связано с
 * переходом Next.js на асинхронные API для более эффективного SSR.
 *
 * ── Работа с файлами изображений ─────────────────────────────────────────────
 * При удалении товара (DELETE) и при смене изображения (PUT) файл автоматически
 * удаляется с диска, если его URL начинается с "/uploads/" — то есть файл был
 * загружен через /api/upload и хранится в public/uploads/.
 *
 * Внешние URL (https://...) и пути от сидовых данных (/products/apple.jpg) НЕ
 * удаляются — функция deleteUploadedFile проверяет префикс "/uploads/" перед
 * любым обращением к файловой системе.
 */

import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Удаляет файл изображения с диска, если он был загружен через /api/upload.
 *
 * Безопасность:
 *   - Проверяем префикс "/uploads/" — не трогаем внешние URL и другие пути
 *   - Нормализуем путь через path.join, чтобы исключить directory traversal
 *     (например, "/uploads/../secret.txt" превратится в корректный путь внутри public/)
 *   - Ошибка удаления не является критической: если файл уже удалён вручную или
 *     никогда не существовал — просто логируем предупреждение и продолжаем работу
 *
 * @param imageUrl — значение поля imageUrl из БД (может быть null или пустой строкой)
 */
async function deleteUploadedFile(imageUrl: string | null | undefined): Promise<void> {
  // Пропускаем пустые значения и внешние URL (https://, http://, /products/ и т.д.)
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) {
    return;
  }

  try {
    // Извлекаем имя файла из URL ("/uploads/filename.jpg" → "filename.jpg")
    // и строим абсолютный путь к файлу на диске
    const filename = path.basename(imageUrl);

    // path.join защищает от path traversal: даже если filename содержит "../",
    // результат будет ограничен папкой public/uploads/
    const filePath = path.join(process.cwd(), "public", "uploads", filename);

    await unlink(filePath);
    console.log(`🗑️  Удалён файл изображения: ${filePath}`);
  } catch (err: unknown) {
    // ENOENT — файл не найден (уже удалён или никогда не существовал).
    // Это не ошибка с точки зрения бизнес-логики — товар всё равно должен удалиться.
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`⚠️  Файл изображения не найден (пропускаем): ${imageUrl}`);
    } else {
      // Любую другую ошибку (нет прав, диск недоступен и т.д.) логируем,
      // но НЕ пробрасываем — удаление товара из БД не должно зависеть от файловой системы
      console.error(`⚠️  Не удалось удалить файл изображения "${imageUrl}":`, err);
    }
  }
}

/**
 * Тип параметров динамического сегмента [id].
 * params — Promise, потому что Next.js 15+ делает params асинхронными.
 */
type ProductRouteParams = {
  params: Promise<{ id: string }>;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/products/[id]
 *
 * Возвращает один товар по ID вместе с данными категории (include: category).
 * Используется, если нужно подгрузить свежие данные конкретного товара
 * без перезагрузки всего списка.
 *
 * Ответ 200: Product с вложенным объектом category
 * Ответ 404: если товар не найден
 */
export async function GET(
  _request: NextRequest,
  { params }: ProductRouteParams
) {
  try {
    // await обязателен для Next.js 15+ — params является Promise
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID товара не указан" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("GET /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки товара" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/products/[id]
 *
 * Частичное обновление товара: обновляет только те поля, которые переданы в теле.
 * Это позволяет клиенту отправлять только изменившиеся данные.
 *
 * Использует spread-условия (conditional spread):
 *   ...(field !== undefined && { field: value })
 * — поле добавляется в объект data только если оно присутствует в теле запроса.
 *
 * Ответ 200: обновлённый Product с вложенным объектом category
 * Ответ 400: некорректные данные
 * Ответ 404: товар не найден
 */
export async function PUT(
  request: NextRequest,
  { params }: ProductRouteParams
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID товара не указан" }, { status: 400 });
    }

    // Тело запроса не типизируем строго — применяем валидацию вручную ниже
    const body = await request.json();
    const { name, description, price, categoryId, inStock, unit, imageUrl } =
      body;

    // Валидируем только те поля, которые переданы (partial update)
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "Некорректное название" },
        { status: 400 }
      );
    }
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return NextResponse.json(
        { error: "Некорректная цена" },
        { status: 400 }
      );
    }

    // Получаем текущее изображение товара ДО обновления, чтобы потом удалить
    // старый файл, если пользователь загрузил новый или убрал изображение совсем.
    // Используем select, а не findUnique — читаем только нужное поле (экономия трафика).
    const existingForUpdate = await prisma.product.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    const product = await prisma.product.update({
      where: { id },
      data: {
        // Каждое поле включается только если оно пришло в теле запроса.
        // Без этого паттерна мы бы затирали незаполненные поля значением undefined.
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(price !== undefined && { price: Number(price) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(inStock !== undefined && { inStock: Number(inStock) }),
        ...(unit !== undefined && { unit }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
      },
      include: { category: true },
    });

    // Удаляем старый файл с диска, если выполнены оба условия:
    //   1. imageUrl был передан в запросе (пользователь явно меняет поле)
    //   2. Новый URL отличается от старого (не просто повторное сохранение того же файла)
    // Удаляем ПОСЛЕ успешного обновления БД — не хотим потерять файл, если update упал
    if (
      imageUrl !== undefined &&
      existingForUpdate?.imageUrl &&
      existingForUpdate.imageUrl !== (imageUrl || null)
    ) {
      // Удаление файла не должно задерживать ответ клиенту —
      // выполняем его "в фоне", логируя возможную ошибку.
      deleteUploadedFile(existingForUpdate.imageUrl).catch((err) => {
        console.error(
          '⚠️ Ошибка удаления старого файла изображения при обновлении товара:',
          err
        );
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("PUT /api/products/[id]:", error);

    // Prisma выбрасывает ошибку с этим текстом, если запись не найдена при update
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Ошибка обновления товара" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/products/[id]
 *
 * Удаляет товар из базы данных. Связанные OrderItem удаляются автоматически
 * благодаря onDelete: Cascade в схеме Prisma.
 *
 * Предварительно проверяем существование товара через findUnique, чтобы
 * вернуть понятную 404-ошибку вместо технической ошибки Prisma.
 *
 * Ответ 200: { success: true, message: string }
 * Ответ 404: товар не найден
 */
export async function DELETE(
  _request: NextRequest,
  { params }: ProductRouteParams
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID товара не указан" }, { status: 400 });
    }

    // Явная проверка существования перед удалением даёт более понятный ответ клиенту.
    // Без этого шага Prisma выбросила бы ошибку "Record to delete does not exist",
    // которую пришлось бы парсить в catch-блоке.
    // Запрашиваем также imageUrl, чтобы после удаления из БД удалить файл с диска.
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    // Prisma автоматически удалит связанные OrderItem (onDelete: Cascade в schema.prisma)
    await prisma.product.delete({ where: { id } });

    // Удаляем файл изображения с диска ПОСЛЕ успешного удаления из БД.
    // Делаем это без await, чтобы потенциальные проблемы с файловой системой
    // (например, на serverless-хостинге) не блокировали ответ клиенту.
    deleteUploadedFile(existing.imageUrl).catch((err) => {
      console.error(
        '⚠️ Ошибка удаления файла изображения при удалении товара:',
        err
      );
    });

    return NextResponse.json({ success: true, message: "Товар удалён" });
  } catch (error) {
    console.error("DELETE /api/products/[id]:", error);

    if (error instanceof Error) {
      if (error.message.includes("Record to delete does not exist")) {
        return NextResponse.json(
          { error: "Товар уже удалён" },
          { status: 404 }
        );
      }
      // На случай, если Cascade не сработал (например, сторонняя связь без каскада)
      if (error.message.includes("Foreign key constraint")) {
        return NextResponse.json(
          { error: "Невозможно удалить: товар есть в заказах" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Ошибка удаления товара" },
      { status: 500 }
    );
  }
}
