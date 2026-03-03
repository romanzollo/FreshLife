import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Вспомогательные типы для явного описания структуры фильтров и тела запроса.
interface ProductFilters {
  categoryId?: string;
  search?: string;
  sortBy: "name" | "price" | "createdAt" | "inStock";
  sortOrder: "asc" | "desc";
}

interface CreateProductBody {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  categoryId?: unknown;
  inStock?: unknown;
  unit?: unknown;
  imageUrl?: unknown;
}

// Разбор query‑параметров в типизированный объект фильтров.
function parseFiltersFromRequest(request: NextRequest): ProductFilters {
  const { searchParams } = new URL(request.url);

  const sortByParam = searchParams.get("sortBy") ?? "name";
  const sortOrderParam = searchParams.get("sortOrder") ?? "asc";

  const allowedSortFields = ["name", "price", "createdAt", "inStock"] as const;
  const safeSortBy = allowedSortFields.includes(sortByParam as any)
    ? (sortByParam as ProductFilters["sortBy"])
    : "name";

  const safeSortOrder: ProductFilters["sortOrder"] =
    sortOrderParam === "desc" ? "desc" : "asc";

  return {
    categoryId: searchParams.get("categoryId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    sortBy: safeSortBy,
    sortOrder: safeSortOrder,
  };
}

// GET /api/products — список товаров с фильтрацией и сортировкой.
export async function GET(request: NextRequest) {
  try {
    const { categoryId, search, sortBy, sortOrder } = parseFiltersFromRequest(request);

    const where: { categoryId?: string; name?: { contains: string; mode: "insensitive" } } =
      {};

    // Фильтр по категории (используется при выборе категории в интерфейсе).
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Поиск по названию, регистронезависимый.
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const orderBy = { [sortBy]: sortOrder } as const;

    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: { category: true },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки товаров" },
      { status: 500 }
    );
  }
}

// POST /api/products — создание нового товара.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateProductBody;
    const { name, description, price, categoryId, inStock, unit, imageUrl } = body;

    // Простая ручная валидация тела запроса.
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

    const numericPrice = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { error: "Поле price обязательно и должно быть неотрицательным числом" },
        { status: 400 }
      );
    }

    const numericInStock =
      typeof inStock === "number" && Number.isFinite(inStock)
        ? inStock
        : Number(inStock ?? 100);

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
        price: numericPrice,
        categoryId: categoryId.trim(),
        inStock: Number.isFinite(numericInStock) ? numericInStock : 100,
        unit: typeof unit === "string" && unit.trim() ? unit.trim() : "шт",
        imageUrl:
          typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
      },
      include: { category: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products:", error);
    return NextResponse.json(
      { error: "Ошибка создания товара" },
      { status: 500 }
    );
  }
}
