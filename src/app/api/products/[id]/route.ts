import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Унифицируем форму params, как рекомендует новый App Router:
// params — обычный объект, а не промис.
type ProductRouteParams = { params: { id: string } };

// GET /api/products/[id] — получение одного товара по идентификатору.
export async function GET(_request: NextRequest, { params }: ProductRouteParams) {
  try {
    const { id } = params;

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

// PUT /api/products/[id] — частичное обновление товара.
export async function PUT(request: NextRequest, { params }: ProductRouteParams) {
  try {
    const { id } = params;
    const body = (await request.json()) as Partial<{
      name: string;
      description: string | null;
      price: number;
      categoryId: string;
      inStock: number;
      unit: string;
      imageUrl: string | null;
    }>;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.inStock !== undefined && { inStock: Number(body.inStock) }),
        ...(body.unit !== undefined && { unit: body.unit }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      },
      include: { category: true },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("PUT /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Ошибка обновления товара" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] — удаление товара.
export async function DELETE(_request: NextRequest, { params }: ProductRouteParams) {
  try {
    const { id } = params;

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Ошибка удаления товара" },
      { status: 500 }
    );
  }
}
