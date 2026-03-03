import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🔥 В Next.js 15+ params — это Promise!
// Типизируем как Promise<{ id: string }>
type ProductRouteParams = {
    params: Promise<{ id: string }>;
};

// GET /api/products/[id] — получение одного товара
export async function GET(
    _request: NextRequest,
    { params }: ProductRouteParams,
) {
    try {
        // Обязательно awaited params!
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'ID товара не указан' },
                { status: 400 },
            );
        }

        const product = await prisma.product.findUnique({
            where: { id },
            include: { category: true },
        });

        if (!product) {
            return NextResponse.json(
                { error: 'Товар не найден' },
                { status: 404 },
            );
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('GET /api/products/[id]:', error);
        return NextResponse.json(
            { error: 'Ошибка загрузки товара' },
            { status: 500 },
        );
    }
}

// PUT /api/products/[id] — обновление товара
export async function PUT(
    request: NextRequest,
    { params }: ProductRouteParams,
) {
    try {
        // Обязательно awaited params!
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'ID товара не указан' },
                { status: 400 },
            );
        }

        const body = await request.json();
        const {
            name,
            description,
            price,
            categoryId,
            inStock,
            unit,
            imageUrl,
        } = body;

        // Валидация данных
        if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
            return NextResponse.json(
                { error: 'Некорректное название' },
                { status: 400 },
            );
        }
        if (
            price !== undefined &&
            (isNaN(Number(price)) || Number(price) < 0)
        ) {
            return NextResponse.json(
                { error: 'Некорректная цена' },
                { status: 400 },
            );
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && {
                    description: description || null,
                }),
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
        console.error('PUT /api/products/[id]:', error);

        // Обработка случая, если товар не найден
        if (
            error instanceof Error &&
            error.message.includes('Record to update not found')
        ) {
            return NextResponse.json(
                { error: 'Товар не найден' },
                { status: 404 },
            );
        }

        return NextResponse.json(
            { error: 'Ошибка обновления товара' },
            { status: 500 },
        );
    }
}

// DELETE /api/products/[id] — удаление товара
export async function DELETE(
    _request: NextRequest,
    { params }: ProductRouteParams,
) {
    try {
        // Обязательно awaited params!
        const { id } = await params;

        // Дополнительная проверка на случай, если id всё же undefined
        if (!id) {
            return NextResponse.json(
                { error: 'ID товара не указан' },
                { status: 400 },
            );
        }

        // Проверяем, существует ли товар перед удалением (опционально, но полезно для отладки)
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { error: 'Товар не найден' },
                { status: 404 },
            );
        }

        // Удаляем товар (Prisma автоматически удалит связанные OrderItem из-за onDelete: Cascade)
        await prisma.product.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Товар удалён' });
    } catch (error) {
        console.error('DELETE /api/products/[id]:', error);

        // Более понятная ошибка, если товар уже удалён или есть внешние связи
        if (error instanceof Error) {
            if (error.message.includes('Record to delete does not exist')) {
                return NextResponse.json(
                    { error: 'Товар уже удалён' },
                    { status: 404 },
                );
            }
            if (error.message.includes('Foreign key constraint')) {
                return NextResponse.json(
                    { error: 'Невозможно удалить: товар есть в заказах' },
                    { status: 400 },
                );
            }
        }

        return NextResponse.json(
            { error: 'Ошибка удаления товара' },
            { status: 500 },
        );
    }
}
