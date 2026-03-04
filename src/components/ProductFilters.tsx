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
  // Общий стиль для всех элементов управления, вынесен в переменную
  // чтобы не дублировать длинную строку классов три раза
  const inputStyles =
    "px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-600/50 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all";

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-5 mb-8 shadow-(--shadow-soft)">
      {/* flex-wrap позволяет элементам переноситься на новую строку на узких экранах */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Поле поиска: flex-1 + min-w-[200px] делает его резиновым */}
        <input
          type="text"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`flex-1 min-w-[200px] ${inputStyles}`}
        />

        {/* Фильтр по категории */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={inputStyles}
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
