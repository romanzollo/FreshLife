/* 
  Карточка товара, переиспользуемая и на витрине, и в админ‑панели.
  Компонент "тупой": он ничего не знает о способах загрузки данных,
  а только красиво отображает переданный объект Product.
*/
"use client";

import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-5 shadow-(--shadow-soft) hover:shadow-(--shadow-hover) hover:-translate-y-0.5 transition-all duration-300">
      {/* Область с изображением товара или placeholder, если картинки нет */}
      <div className="aspect-square bg-slate-100/80 dark:bg-slate-700/50 rounded-xl mb-4 flex items-center justify-center text-4xl overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-slate-400 dark:text-slate-500">📦</span>
        )}
      </div>

      {/* Название и короткое описание */}
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2 text-[15px] leading-snug">
        {product.name}
      </h3>

      {product.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
          {product.description}
        </p>
      )}

      {/* Цена и информация о наличии */}
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
