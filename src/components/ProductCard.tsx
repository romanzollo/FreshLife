/**
 * ProductCard — карточка товара.
 *
 * "Тупой" (dumb/presentational) компонент: он только отображает данные,
 * ничего не знает об источнике данных и не имеет собственного состояния.
 * Это делает компонент легко переиспользуемым: он используется как на
 * странице каталога, так и в административной панели.
 *
 * Если у товара нет изображения — показываем placeholder-иконку 📦.
 */
"use client";

import type { Product } from "@/types";

interface ProductCardProps {
  /** Объект товара из API (содержит вложенный объект category) */
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    /*
      group — специальный класс Tailwind, который позволяет дочерним элементам
      реагировать на hover родителя (group-hover:...).
      Используется для анимации изображения при наведении на карточку.
    */
    <div className="group bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-5 shadow-(--shadow-soft) hover:shadow-(--shadow-hover) hover:-translate-y-0.5 transition-all duration-300">
      {/*
        Контейнер изображения с соотношением сторон 1:1 (aspect-square).
        overflow-hidden обрезает изображение по скруглённым углам.
      */}
      <div className="aspect-square bg-slate-100/80 dark:bg-slate-700/50 rounded-xl mb-4 flex items-center justify-center text-4xl overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            // group-hover:scale-105 — лёгкий zoom-эффект при наведении на карточку
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-slate-400 dark:text-slate-500">📦</span>
        )}
      </div>

      {/* line-clamp-2 ограничивает текст двумя строками с многоточием */}
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2 text-[15px] leading-snug">
        {product.name}
      </h3>

      {/* Описание показывается только если оно есть (поле опциональное) */}
      {product.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
          {product.description}
        </p>
      )}

      {/* Нижняя строка: цена слева, остаток справа */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
          {product.price} ₽
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          в наличии: {product.inStock} {product.unit}
        </span>
      </div>
    </div>
  );
}
