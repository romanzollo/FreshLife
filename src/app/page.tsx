/**
 * Главная страница — витрина каталога продуктов.
 *
 * Страница является клиентским компонентом ('use client'), потому что:
 * - управляет локальным состоянием фильтров и списка товаров
 * - выполняет fetch к API при изменении фильтров (useEffect/useCallback)
 *
 * Поток данных:
 *   Пользователь меняет фильтр → обновляется state → срабатывает useEffect →
 *   вызывается fetchProducts → обновляется список товаров → ре-рендер
 *
 * Компоненты:
 *   ProductFilters — панель фильтров (категория, поиск, сортировка)
 *   ProductCard    — карточка одного товара
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import type { Product, Category } from "@/types";

export default function Home() {
  // ── Данные ────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // ── Состояния UI ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Состояния фильтров ────────────────────────────────────────────────────
  // Пустая строка = "все категории" (фильтр не применяется)
  const [categoryId, setCategoryId] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [search, setSearch] = useState("");

  /**
   * Загружает товары с учётом текущих фильтров.
   *
   * Обёрнут в useCallback, чтобы функция не пересоздавалась на каждый рендер.
   * Зависимости [categoryId, sortBy, sortOrder, search] — функция обновляется
   * только при изменении фильтров, что корректно запускает useEffect ниже.
   */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Строим строку запроса только из ненулевых параметров
      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (search) params.set("search", search);

      const res = await fetch(`/api/products?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Не удалось загрузить товары");
      }

      const data = await res.json();
      // Защита от неожиданного формата ответа: всегда работаем с массивом
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setError("Не удалось загрузить товары. Попробуйте обновить страницу.");
    } finally {
      // finally гарантирует сброс loading даже при ошибке
      setLoading(false);
    }
  }, [categoryId, sortBy, sortOrder, search]);

  /**
   * Загружает список категорий один раз при монтировании страницы.
   * Категории не меняются динамически, поэтому нет смысла перезагружать их.
   * Пустой массив зависимостей [] = эффект запускается только при монтировании.
   */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Ошибка загрузки категорий");
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        // Ошибка категорий не критична — каталог работает без фильтра
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  /**
   * Перезагружает товары при любом изменении фильтров.
   * Так как fetchProducts создан через useCallback с зависимостями,
   * этот эффект сработает при изменении categoryId / sortBy / sortOrder / search.
   */
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    // animate-fade-in — кастомная анимация из globals.css (плавное появление страницы)
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-8 tracking-tight">
        Каталог продуктов
      </h1>

      {/* Панель фильтров: получает текущее состояние и колбэки для обновления */}
      <ProductFilters
        categories={categories}
        selectedCategory={categoryId}
        sortBy={sortBy}
        sortOrder={sortOrder}
        search={search}
        onCategoryChange={setCategoryId}
        onSortChange={(s, o) => {
          setSortBy(s);
          setSortOrder(o);
        }}
        onSearchChange={setSearch}
      />

      {/* Область результатов: три взаимоисключающих состояния */}
      {loading ? (
        // Состояние загрузки
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-lg">
          <span className="inline-block animate-pulse">Загрузка...</span>
        </div>
      ) : error ? (
        // Состояние ошибки
        <div className="text-center py-16 text-rose-500 dark:text-rose-400 bg-white dark:bg-slate-800/50 rounded-2xl border border-rose-200/80 dark:border-rose-500/50 shadow-(--shadow-soft)">
          {error}
        </div>
      ) : products.length === 0 ? (
        // Пустой результат (фильтр не нашёл товаров)
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-(--shadow-soft)">
          Товары не найдены
        </div>
      ) : (
        // Адаптивная сетка: от 1 колонки на мобильных до 5 на широких экранах
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {products.map((product) => (
            // key по уникальному id — обязателен для эффективного обновления DOM
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
