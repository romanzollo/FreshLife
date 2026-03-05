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
 * АРХИТЕКТУРНАЯ РОЛЬ:
 *   Этот хук — "слой данных". Он изолирует всю работу с API от UI-компонентов.
 *   Страница не знает, как именно загружаются товары — только использует результат.
 *
 * ИСПОЛЬЗОВАНИЕ:
 *   const { products, loading, error, refetch } = useProducts({
 *     categoryId, sortBy, sortOrder, search
 *   });
 */

import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/types";

// ── Константы ─────────────────────────────────────────────────────────────────

/**
 * Задержка debounce в миллисекундах.
 * 300 мс — стандартное значение: пользователь не замечает задержки,
 * но большинство "промежуточных" нажатий клавиш успевают быть проигнорированными.
 */
const SEARCH_DEBOUNCE_MS = 300;

// ── Типы ─────────────────────────────────────────────────────────────────────

/** Параметры, которые хук принимает от родительского компонента */
export interface UseProductsParams {
  categoryId: string;
  sortBy: string;
  sortOrder: string;
  /** Строка поиска в "сыром" виде — debounce применяется внутри хука */
  search: string;
}

/** То, что хук возвращает наружу */
export interface UseProductsResult {
  /** Список товаров, соответствующих текущим фильтрам */
  products: Product[];
  /** true пока идёт сетевой запрос */
  loading: boolean;
  /** Текст ошибки или null, если ошибки нет */
  error: string | null;
  /** Принудительно повторить загрузку с теми же параметрами (например, кнопка "Обновить") */
  refetch: () => void;
}

// ── Хук ──────────────────────────────────────────────────────────────────────

export function useProducts({
  categoryId,
  sortBy,
  sortOrder,
  search,
}: UseProductsParams): UseProductsResult {
  // ── Состояния ─────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Debounced-версия строки поиска.
   *
   * Механизм работы:
   *   1. Пользователь вводит символ → search меняется → запускается useEffect
   *   2. useEffect ставит setTimeout на 300 мс
   *   3. Если search снова изменился до истечения 300 мс → cleanup-функция
   *      отменяет предыдущий таймер (clearTimeout), новый таймер запускается
   *   4. После 300 мс без изменений → debouncedSearch получает актуальное значение
   *   5. fetchProducts (зависит от debouncedSearch) пересоздаётся и запрос уходит
   */
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    // Запускаем таймер: только через 300 мс после последнего изменения search
    // debouncedSearch обновится и спровоцирует реальный API-запрос
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);

    // Cleanup: при каждом новом вызове эффекта предыдущий таймер отменяется.
    // Это и есть debounce — мы "сбрасываем часы" при каждом нажатии клавиши.
    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Функция загрузки товаров.
   *
   * Обёрнута в useCallback с зависимостями: пересоздаётся только тогда, когда
   * меняется хотя бы один из параметров запроса. Используется как зависимость
   * useEffect ниже — благодаря этому запрос идёт именно при изменении данных,
   * а не при каждом рендере.
   *
   * Ключевой момент: зависит от debouncedSearch, а не от search,
   * чтобы запрос уходил только после паузы в 300 мс.
   */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Собираем query-параметры только из заполненных значений,
      // чтобы не передавать лишние параметры в URL
      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      // Используем debouncedSearch — запрос уходит только после паузы
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/products?${params.toString()}`);

      // Если сервер вернул ошибку (4xx, 5xx) — бросаем исключение с кодом статуса
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: unknown = await res.json();
      // Защита от неожиданного формата ответа: всегда работаем с массивом,
      // даже если сервер вернёт null или объект — не упадём
      setProducts(Array.isArray(data) ? (data as Product[]) : []);
    } catch (err) {
      console.error("[useProducts] Ошибка загрузки товаров:", err);
      setProducts([]);
      setError("Не удалось загрузить товары. Попробуйте обновить страницу.");
    } finally {
      // finally гарантирует сброс loading даже если fetch бросил исключение
      setLoading(false);
    }
  }, [categoryId, sortBy, sortOrder, debouncedSearch]);

  // Запускаем загрузку при изменении любого из параметров запроса.
  // useCallback гарантирует, что fetchProducts пересоздаётся только при
  // реальных изменениях зависимостей, а не при каждом рендере.
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}
