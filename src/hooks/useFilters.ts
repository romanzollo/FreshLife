/**
 * useFilters — хук управления состоянием фильтров каталога товаров.
 *
 * ОТВЕТСТВЕННОСТЬ:
 *   - хранит текущие значения фильтров: категория, сортировка, строка поиска
 *   - управляет текущей страницей пагинации
 *   - при изменении любого фильтра (кроме явной смены страницы через setCurrentPage)
 *     автоматически сбрасывает currentPage в 1, чтобы пользователь не оставался
 *     на странице, которой нет в новой (суженной) выборке
 *
 * АРХИТЕКТУРНАЯ РОЛЬ:
 *   Этот хук — "слой состояния UI". Он ничего не знает об API и не делает запросов.
 *   Его значения читает useProducts для формирования запроса к серверу.
 *
 * ИСПОЛЬЗОВАНИЕ:
 *   const filters = useFilters();
 *   // filters.categoryId, filters.search — передаём в useProducts
 *   // filters.setCategoryId — передаём в ProductFilters как onCategoryChange
 */

import { useState, useCallback } from "react";

// ── Типы ─────────────────────────────────────────────────────────────────────

/** Текущие значения всех фильтров */
export interface FiltersState {
  /** ID выбранной категории. Пустая строка = "все категории" */
  categoryId: string;
  /** Поле сортировки: "name" | "price" | "createdAt" | "inStock" */
  sortBy: string;
  /** Направление сортировки: "asc" | "desc" */
  sortOrder: string;
  /** Строка текстового поиска */
  search: string;
  /** Текущая страница пагинации (1-based) */
  currentPage: number;
}

/** Функции для изменения фильтров */
export interface FiltersActions {
  /** Выбрать категорию. Сбрасывает страницу в 1. */
  setCategoryId: (id: string) => void;
  /**
   * Изменить сортировку. Принимает поле и направление одновременно,
   * потому что в ProductFilters они объединены в один <select> ("field-direction").
   * Сбрасывает страницу в 1.
   */
  handleSortChange: (sortBy: string, sortOrder: string) => void;
  /** Изменить строку поиска. Сбрасывает страницу в 1. */
  setSearch: (value: string) => void;
  /** Явно установить номер страницы (используется в обработчике пагинации). */
  setCurrentPage: (page: number) => void;
}

/** Объединённый тип: и состояние, и действия в одном объекте для удобной деструктуризации */
export type UseFiltersReturn = FiltersState & FiltersActions;

// ── Хук ──────────────────────────────────────────────────────────────────────

export function useFilters(): UseFiltersReturn {
  // ── Состояния фильтров ──────────────────────────────────────────────────────
  const [categoryId, setCategoryIdState] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [search, setSearchState] = useState("");

  // ── Пагинация ───────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Обёртка над setCategoryIdState: при смене категории сбрасываем страницу.
   * useCallback мемоизирует функцию, чтобы она не пересоздавалась при каждом
   * рендере — иначе дочерние компоненты, принявшие её как prop, будут ре-рендериться.
   */
  const setCategoryId = useCallback((id: string) => {
    setCategoryIdState(id);
    setCurrentPage(1);
  }, []);

  /**
   * Объединённый сеттер сортировки: поле и направление меняются вместе.
   * Сбрасывает страницу, чтобы показать отсортированный список с начала.
   */
  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: string) => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      setCurrentPage(1);
    },
    []
  );

  /**
   * Обёртка над setSearchState: при изменении текста поиска сбрасываем страницу,
   * чтобы результаты поиска всегда отображались с первой страницы.
   */
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setCurrentPage(1);
  }, []);

  return {
    // Состояние
    categoryId,
    sortBy,
    sortOrder,
    search,
    currentPage,
    // Действия
    setCategoryId,
    handleSortChange,
    setSearch,
    setCurrentPage,
  };
}
