import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories — возвращает список всех категорий для фильтров и форм.
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки категорий" },
      { status: 500 }
    );
  }
}
