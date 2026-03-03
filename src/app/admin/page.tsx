"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductForm, type ProductFormData } from "@/components/ProductForm";
import type { Product, Category } from "@/types";

// Страница управления товарами (простая админ‑панель без аутентификации).
export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Ошибка загрузки товаров");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setError("Не удалось загрузить список товаров.");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Ошибка загрузки категорий");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCategories([]);
      setError("Не удалось загрузить категории.");
    }
  };

  // При первом открытии страницы загружаем товары и категории.
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchProducts(), fetchCategories()])
      .catch(() => {
        // Ошибки уже логируются внутри fetchProducts/fetchCategories.
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  // Сохранение товара (создание или обновление).
  const handleSave = async (data: ProductFormData) => {
    try {
      setError(null);

      if (editingProduct) {
        await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

      setShowForm(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err) {
      console.error(err);
      setError("Ошибка сохранения товара. Попробуйте ещё раз.");
    }
  };

  // Удаление товара после подтверждения.
  const handleDelete = async (id: string) => {
    if (!confirm("Удалить товар?")) return;
    try {
      setError(null);
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      await fetchProducts();
    } catch (err) {
      console.error(err);
      setError("Ошибка удаления товара. Попробуйте ещё раз.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Управление товарами
        </h1>
        <button
          onClick={handleAdd}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium shadow-(--shadow-soft) hover:shadow-(--shadow-hover) transition-all"
        >
          + Добавить товар
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-300/80 dark:border-rose-500/70 bg-rose-50 dark:bg-rose-900/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200 shadow-(--shadow-soft)">
          {error}
        </div>
      )}

      {/* Модальное окно с формой товара */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-(--shadow-hover) max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-200/80 dark:border-slate-700/50">
            <h2 className="text-xl font-bold mb-5 text-slate-800 dark:text-slate-100">
              {editingProduct ? "Редактирование товара" : "Новый товар"}
            </h2>
            <ProductForm
              product={editingProduct}
              categories={categories}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-lg">
          <span className="inline-block animate-pulse">Загрузка...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-(--shadow-soft)">
          Нет товаров. Нажмите «Добавить товар» для создания.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} />
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button
                  onClick={() => handleEdit(product)}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg shadow-md transition-all"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm rounded-lg shadow-md transition-all"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
