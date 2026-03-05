/**
 * API-маршруты для коллекции товаров.
 *
 * GET  /api/products  — список товаров с фильтрацией, поиском и сортировкой
 * POST /api/products  — создание нового товара
 *
 * Файл нарочно не разбит на несколько файлов, так как оба метода работают
 * с одним и тем же ресурсом и используют общую логику парсинга/валидации.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Допустимые поля для сортировки товаров.
 * Перечислены явно, чтобы нельзя было передать произвольное поле из БД.
 */
const ALLOWED_SORT_FIELDS = ["name", "price", "createdAt", "inStock"] as const;
type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

/**
 * Типизированный объект фильтров после парсинга query-параметров.
 * Используется только внутри этого файла.
 */
interface ProductFilters {
  categoryId?: string;
  search?: string;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
}

/**
 * Тело запроса для создания товара.
 * Все поля — unknown, потому что данные приходят от клиента и до валидации
 * мы не можем доверять их типам.
 */
interface CreateProductBody {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  categoryId?: unknown;
  inStock?: unknown;
  unit?: unknown;
  imageUrl?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Проверяет, является ли строка допустимым полем сортировки.
 *
 * Используем type-predicate вместо `as any`, чтобы TypeScript
 * сужал тип после вызова этой функции — это безопасно и явно.
 */
function isValidSortField(value: string): value is SortField {
  return (ALLOWED_SORT_FIELDS as readonly string[]).includes(value);
}

/**
 * Разбирает query-параметры запроса в типизированный объект фильтров.
 * Неизвестные или некорректные значения заменяются безопасными дефолтами.
 */
function parseFilters(request: NextRequest): ProductFilters {
  const { searchParams } = new URL(request.url);

  const sortByParam = searchParams.get("sortBy") ?? "name";
  const sortOrderParam = searchParams.get("sortOrder") ?? "asc";

  // Валидируем поле сортировки через type-guard (без as any)
  const safeSortBy: SortField = isValidSortField(sortByParam)
    ? sortByParam
    : "name";

  // Направление сортировки — только "asc" или "desc", по умолчанию "asc"
  const safeSortOrder: "asc" | "desc" =
    sortOrderParam === "desc" ? "desc" : "asc";

  return {
    // Если параметр не передан — undefined (фильтр не применяется)
    categoryId: searchParams.get("categoryId") ?? undefined,
    // trim() убирает случайные пробелы по краям строки запроса
    search: searchParams.get("search")?.trim() || undefined,
    sortBy: safeSortBy,
    sortOrder: safeSortOrder,
  };
}

/**
 * Выполняет регистронезависимую фильтрацию товаров по строке поиска.
 *
 * ПОЧЕМУ НЕ mode: "insensitive" В PRISMA?
 * ─────────────────────────────────────────
 * Prisma поддерживает `mode: "insensitive"` ТОЛЬКО для PostgreSQL и MongoDB.
 * При использовании с SQLite (наш провайдер) Prisma 5.x бросает ошибку:
 *   "The current connector does not support case insensitive queries."
 * Это и было причиной "Не удалось загрузить товары" при попытке поиска.
 *
 * ПОЧЕМУ JAVASCRIPT, А НЕ RAW SQL?
 * ─────────────────────────────────
 * Вариант с `prisma.$queryRaw` и `WHERE LOWER(name) LIKE LOWER(?)` тоже работает,
 * но теряет типобезопасность Prisma и усложняет код.
 * Для SQLite-каталога (тысячи строк, не миллионы) JS-фильтрация незначительно
 * медленнее, но значительно проще в поддержке.
 *
 * toLowerCase() корректно обрабатывает и кириллицу, и латиницу, и смешанный регистр.
 */
function applySearchFilter<T extends { name: string }>(
  products: T[],
  search: string | undefined
): T[] {
  // Если строка поиска пустая — возвращаем все товары без изменений
  if (!search) return products;

  // Приводим оба операнда к нижнему регистру для сравнения без учёта регистра
  const query = search.toLowerCase();
  return products.filter((p) => p.name.toLowerCase().includes(query));
}

// ─────────────────────────────────────────────────────────────────────────────
// Обработчики маршрутов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/products
 *
 * Возвращает список товаров. Поддерживает:
 * - ?categoryId=<id>      фильтр по категории
 * - ?search=<строка>      поиск по названию (регистронезависимый, включая кириллицу)
 * - ?sortBy=<поле>        сортировка: name | price | createdAt | inStock
 * - ?sortOrder=asc|desc   направление сортировки
 *
 * Ответ: Product[] (каждый объект содержит вложенный объект category)
 */
export async function GET(request: NextRequest) {
  try {
    const { categoryId, search, sortBy, sortOrder } = parseFilters(request);

    // Строим объект where динамически: добавляем только те условия,
    // которые действительно переданы. Пустой where {} = все товары.
    // Поиск по имени здесь НЕ применяется — он выполняется в JS ниже.
    const where: { categoryId?: string } = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Шаг 1: Запрашиваем из БД товары с фильтром по категории и нужной сортировкой.
    // include подгружает связанный объект category в каждый товар,
    // чтобы фронтенд мог отображать название категории без дополнительного запроса.
    const allProducts = await prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: { category: true },
    });

    // Шаг 2: Применяем поиск по имени в JavaScript — регистронезависимо,
    // корректно для кириллицы и латиницы.
    // Если search не задан — возвращаем все товары без изменений.
    const products = applySearchFilter(allProducts, search);

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки товаров" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 *
 * Создаёт новый товар. Обязательные поля: name, categoryId, price.
 * Необязательные: description, imageUrl, inStock (по умолчанию 100), unit (по умолчанию "шт").
 *
 * Ответ 201: созданный Product с вложенным объектом category
 * Ответ 400: если валидация не прошла
 */
export async function POST(request: NextRequest) {
  try {
    // Тип тела — unknown до валидации: мы не можем доверять клиентским данным
    const body = (await request.json()) as CreateProductBody;
    const { name, description, price, categoryId, inStock, unit, imageUrl } =
      body;

    // ── Валидация обязательных полей ──────────────────────────────────────────

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Поле name обязательно и должно быть строкой" },
        { status: 400 }
      );
    }

    if (typeof categoryId !== "string" || !categoryId.trim()) {
      return NextResponse.json(
        { error: "Поле categoryId обязательно и должно быть строкой" },
        { status: 400 }
      );
    }

    // Принимаем price и как число, и как строку (на случай формы с <input type="number">)
    const numericPrice = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { error: "Поле price обязательно и должно быть неотрицательным числом" },
        { status: 400 }
      );
    }

    // ── Нормализация необязательных полей ─────────────────────────────────────

    // inStock: берём из тела, иначе дефолт 100. Используем Number.isFinite
    // для защиты от NaN и Infinity.
    const numericInStock =
      typeof inStock === "number" && Number.isFinite(inStock)
        ? inStock
        : Number(inStock ?? 100);

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        // Если описание — пустая строка или не строка, сохраняем null
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
        price: numericPrice,
        categoryId: categoryId.trim(),
        inStock: Number.isFinite(numericInStock) ? numericInStock : 100,
        unit: typeof unit === "string" && unit.trim() ? unit.trim() : "шт",
        imageUrl:
          typeof imageUrl === "string" && imageUrl.trim()
            ? imageUrl.trim()
            : null,
      },
      // Возвращаем товар с категорией, чтобы UI мог сразу отобразить её без дополнительного запроса
      include: { category: true },
    });

    // 201 Created — стандартный HTTP-код для успешного создания ресурса
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products:", error);
    return NextResponse.json(
      { error: "Ошибка создания товара" },
      { status: 500 }
    );
  }
}
