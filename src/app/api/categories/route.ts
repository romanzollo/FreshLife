/**
 * API-маршрут для категорий товаров.
 *
 * GET /api/categories — возвращает все категории в алфавитном порядке.
 *
 * Категории управляются только через seed-скрипт (prisma/seed.ts) и не имеют
 * эндпоинтов для создания/изменения/удаления через UI — это намеренное
 * упрощение для текущего объёма проекта.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/categories
 *
 * Используется фильтрами на странице каталога и выпадающим списком в форме
 * добавления/редактирования товара в админ-панели.
 *
 * Ответ: Category[] — массив объектов { id, name, slug }
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      // Алфавитный порядок для удобства пользователя в выпадающих списках
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
