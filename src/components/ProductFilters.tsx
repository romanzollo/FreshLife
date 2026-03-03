"use client";

import type { Category } from "@/types";

// Управляющие элементы фильтрации/сортировки каталога.
// Компонент так же "тупой": он получает текущее состояние и колбэки,
// но не занимается загрузкой данных сам.
interface ProductFiltersProps {
  categories: Category[];
  selectedCategory: string;
  sortBy: string;
  sortOrder: string;
  search: string;
  onCategoryChange: (id: string) => void;
  onSortChange: (sortBy: string, sortOrder: string) => void;
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
  const inputStyles =
    "px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-600/50 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all";

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-5 mb-8 shadow-(--shadow-soft)">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Поле поиска по названию товара */}
        <input
          type="text"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`flex-1 min-w-[200px] ${inputStyles}`}
        />

        {/* Выпадающий список с категориями каталога */}
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

        {/* Селект сортировки объединяет поле и направление в одну строку "field-direction" */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split("-");
            onSortChange(s, o);
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
