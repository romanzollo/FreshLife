// Главная страница — витрина каталога с фильтрацией и сортировкой.
"use client";

import { useEffect, useState, useCallback } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import type { Product, Category } from "@/types";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [search, setSearch] = useState("");

  // Загрузка списка товаров с учётом выбранных фильтров.
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setError("Не удалось загрузить товары. Попробуйте обновить страницу.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, sortBy, sortOrder, search]);

  // Однократная загрузка категорий при монтировании.
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Ошибка загрузки категорий");
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  // Перезагружаем список товаров при изменении фильтров.
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-8 tracking-tight">
        Каталог продуктов
      </h1>

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

      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-lg">
          <span className="inline-block animate-pulse">Загрузка...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-rose-500 dark:text-rose-400 bg-white dark:bg-slate-800/50 rounded-2xl border border-rose-200/80 dark:border-rose-500/50 shadow-(--shadow-soft)">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-(--shadow-soft)">
          Товары не найдены
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
