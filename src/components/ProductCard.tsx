/**
 * ProductCard — карточка товара.
 *
 * "Тупой" (dumb/presentational) компонент: он только отображает данные,
 * ничего не знает об источнике данных и не имеет собственного состояния.
 * Это делает компонент легко переиспользуемым: он используется как на
 * странице каталога, так и в административной панели.
 *
 * Если у товара нет изображения — показываем placeholder-иконку 📦.
 *
 * Цвета: компонент использует CSS-переменные дизайн-системы (--card-bg,
 * --card-border, --color-grey-*, --accent), которые автоматически
 * переключаются при смене темы без каких-либо дополнительных dark:-классов.
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
    <div
      className="group rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-300"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-soft)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-soft)';
      }}
    >
      {/*
        Контейнер изображения с соотношением сторон 1:1 (aspect-square).
        overflow-hidden обрезает изображение по скруглённым углам.
      */}
      <div
        className="aspect-square rounded-xl mb-4 flex items-center justify-center text-4xl overflow-hidden"
        style={{ background: 'var(--color-grey-100)' }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            // group-hover:scale-105 — лёгкий zoom-эффект при наведении на карточку
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          // Цвет placeholder-иконки из серой шкалы — адаптируется к теме
          <span style={{ color: 'var(--color-grey-400)' }}>📦</span>
        )}
      </div>

      {/* line-clamp-2 ограничивает текст двумя строками с многоточием */}
      <h3
        className="font-semibold mb-1 line-clamp-2 text-[15px] leading-snug"
        style={{ color: 'var(--color-grey-800)' }}
      >
        {product.name}
      </h3>

      {/* Описание показывается только если оно есть (поле опциональное) */}
      {product.description && (
        <p
          className="text-sm mb-3 line-clamp-2"
          style={{ color: 'var(--color-grey-500)' }}
        >
          {product.description}
        </p>
      )}

      {/* Нижняя строка: цена слева, остаток справа */}
      <div className="flex items-center justify-between pt-1">
        {/*
          Акцентный цвет цены — берётся из --accent (Indigo-500 в светлой теме,
          тот же Indigo-500 в тёмной). Это ключевой брендовый цвет дизайн-системы.
        */}
        <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
          {product.price} ₽
        </span>
        <span className="text-xs" style={{ color: 'var(--color-grey-500)' }}>
          в наличии: {product.inStock} {product.unit}
        </span>
      </div>
    </div>
  );
}
