/**
 * API-маршруты для работы с конкретным товаром по ID.
 *
 * GET    /api/products/[id]  — получение одного товара
 * PUT    /api/products/[id]  — частичное обновление товара (только переданные поля)
 * DELETE /api/products/[id]  — удаление товара
 *
 * Важно: в Next.js 15+ параметр params является Promise!
 * Его необходимо await-ить перед использованием. Это изменение связано с
 * переходом Next.js на асинхронные API для более эффективного SSR.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    // Prisma автоматически удалит связанные OrderItem (onDelete: Cascade в schema.prisma)
    await prisma.product.delete({ where: { id } });

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
