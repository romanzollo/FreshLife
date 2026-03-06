/**
 * useProducts — хук загрузки товаров с debounce-поиском.
 *
 * ОТВЕТСТВЕННОСТЬ:
 *   - принимает параметры фильтрации (категория, сортировка, строка поиска)
 *   - применяет debounce к строке поиска: ждёт паузы 300 мс после последнего
 *     нажатия клавиши, прежде чем отправить запрос к API
 *   - выполняет fetch к /api/products при изменении параметров
 *   - возвращает список товаров, флаги загрузки/ошибки и функцию ручного обновления
 *
 * ПОЧЕМУ DEBOUNCE ЗДЕСЬ, А НЕ В ProductFilters?
 *   ProductFilters — "тупой" (presentational) компонент: он только отображает UI
 *   и пробрасывает события вверх. Логика задержки запросов — ответственность
 *   слоя данных, то есть этого хука.
 *
 * ИСПОЛЬЗОВАНИЕ:
 *   const { products, loading, error, refetch } = useProducts({
 *     categoryId, sortBy, sortOrder, search
 *   });
 */
import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/types";

const SEARCH_DEBOUNCE_MS = 300;

export interface UseProductsParams {
  categoryId: string;
  sortBy: string;
  sortOrder: string;
  search: string;
}

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProducts({
  categoryId,
  sortBy,
  sortOrder,
  search,
}: UseProductsParams): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce поиска: запрос уходит только после паузы 300 мс
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: unknown = await res.json();
      setProducts(Array.isArray(data) ? (data as Product[]) : []);
    } catch (err) {
      console.error("[useProducts] Ошибка загрузки товаров:", err);
      setProducts([]);
      setError("Не удалось загрузить товары. Попробуйте обновить страницу.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, sortBy, sortOrder, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}
