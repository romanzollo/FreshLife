/**
 * ProductFilters — панель фильтрации и сортировки каталога.
 *
 * "Тупой" (presentational) компонент: получает текущее состояние фильтров
 * и колбэки для их изменения. Всю логику загрузки данных выполняет родитель
 * (страница каталога).
 *
 * Особенность сортировки: поле и направление объединены в одну строку
 * формата "field-direction" (например, "price-asc"), чтобы использовать
 * один <select> вместо двух. При изменении значение разбивается по "-".
 *
 * Цвета: все цвета берутся из CSS-переменных дизайн-системы, которые
 * автоматически переключаются при смене темы (светлая / тёмная).
 */
"use client";

import type { Category } from "@/types";

interface ProductFiltersProps {
  /** Список категорий для выпадающего списка (загружается родителем) */
  categories: Category[];
  /** ID выбранной категории. Пустая строка = все категории */
  selectedCategory: string;
  /** Поле сортировки: "name" | "price" | "createdAt" | "inStock" */
  sortBy: string;
  /** Направление сортировки: "asc" | "desc" */
  sortOrder: string;
  /** Текст поискового запроса */
  search: string;
  /** Вызывается при выборе категории */
  onCategoryChange: (id: string) => void;
  /**
   * Вызывается при изменении сортировки.
   * Передаёт оба параметра одновременно, так как они всегда изменяются вместе.
   */
  onSortChange: (sortBy: string, sortOrder: string) => void;
  /** Вызывается при каждом нажатии клавиши в поле поиска */
  onSearchChange: (search: string) => void;
}

export function ProductFilters({
  categories,
  selectedCategory,
  sortBy,
  sortOrder,
  search,
  onCategoryChange,
  onSortChange,
  onSearchChange,
}: ProductFiltersProps) {
  /*
    Общий стиль для всех элементов управления — вынесен в переменную,
    чтобы не дублировать длинную строку классов три раза.
    
    Цвета задаются через CSS-переменные дизайн-системы:
    - --input-bg, --input-border, --input-text: меняются с темой
    - focus:ring-[var(--accent)]: акцентный Indigo для ring-эффекта
  */
  const inputStyles =
    "px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-medium";

  const inputInlineStyles = {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--input-text)',
  };

  return (
    <div
      className="rounded-2xl p-5 mb-8"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      {/* flex-wrap позволяет элементам переноситься на новую строку на узких экранах */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Поле поиска: flex-1 + min-w-[200px] делает его резиновым */}
        <input
          type="text"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`flex-1 min-w-[200px] ${inputStyles} placeholder:opacity-50`}
          style={{
            ...inputInlineStyles,
            // Переопределяем outline через focus-visible напрямую в CSS
          }}
          onFocus={(e) => {
            // Добавляем ring-эффект при фокусе через box-shadow
            (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px var(--accent-soft)';
            (e.target as HTMLInputElement).style.borderColor = 'var(--accent)';
          }}
          onBlur={(e) => {
            (e.target as HTMLInputElement).style.boxShadow = 'none';
            (e.target as HTMLInputElement).style.borderColor = 'var(--input-border)';
          }}
        />

        {/* Фильтр по категории */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={inputStyles}
          style={inputInlineStyles}
          onFocus={(e) => {
            (e.target as HTMLSelectElement).style.boxShadow = '0 0 0 3px var(--accent-soft)';
            (e.target as HTMLSelectElement).style.borderColor = 'var(--accent)';
          }}
          onBlur={(e) => {
            (e.target as HTMLSelectElement).style.boxShadow = 'none';
            (e.target as HTMLSelectElement).style.borderColor = 'var(--input-border)';
          }}
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/*
          Сортировка: значение в формате "field-direction".
          При изменении разбиваем по "-" и передаём оба значения в onSortChange.
          Это позволяет обойтись одним select вместо двух.
        */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split("-");
            onSortChange(field, direction);
          }}
          className={inputStyles}
          style={inputInlineStyles}
          onFocus={(e) => {
            (e.target as HTMLSelectElement).style.boxShadow = '0 0 0 3px var(--accent-soft)';
            (e.target as HTMLSelectElement).style.borderColor = 'var(--accent)';
          }}
          onBlur={(e) => {
            (e.target as HTMLSelectElement).style.boxShadow = 'none';
            (e.target as HTMLSelectElement).style.borderColor = 'var(--input-border)';
          }}
        >
          <option value="name-asc">По названию (А-Я)</option>
          <option value="name-desc">По названию (Я-А)</option>
          <option value="price-asc">По цене (сначала дешевые)</option>
          <option value="price-desc">По цене (сначала дорогие)</option>
          <option value="createdAt-desc">Новинки</option>
          <option value="inStock-desc">По наличию</option>
        </select>
      </div>
    </div>
  );
}
