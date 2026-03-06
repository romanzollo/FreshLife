/**
 * Страница администрирования — управление товарами (CRUD).
 *
 * Поток создания/редактирования:
 *   handleSave() → POST/PUT к API → при успехе fetchProducts() обновляет список.
 *
 * Поток удаления:
 *   handleDelete() → DELETE к API → при успехе оптимистично убираем из state.
 *
 * Локально: SQLite (prisma/dev.db) — быстро, без сети.
 * Vercel: Turso — cloud DB.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductForm, type ProductFormData } from "@/components/ProductForm";
import { Pagination } from "@/components/Pagination";
import type { Product, Category } from "@/types";
import { ModalPortal } from "@/components/ModalPortal";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 12;

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Загрузка товаров — useCallback чтобы не пересоздавать при каждом рендере
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки товаров:", err);
      toast.error("Не удалось загрузить список товаров", {
        className: "toast-error",
        position: "top-center",
      });
      setProducts([]);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки категорий:", err);
    }
  }, []);

  // При монтировании — параллельно загружаем товары и категории
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
      setLoading(false);
    };
    load();
  }, [fetchProducts, fetchCategories]);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedProducts = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const firstItem =
    products.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * ITEMS_PER_PAGE, products.length);

  // Корректировка страницы после удаления
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [products.length, totalPages, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async (data: ProductFormData) => {
    setSaving(true);
    setFormError(null);
    try {
      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Ошибка HTTP: ${res.status}`);
      }
      toast.success(editingProduct ? "Товар обновлён ✓" : "Товар добавлен ✓", {
        className: "toast-success",
        position: "top-center",
      });
      setShowForm(false);
      setEditingProduct(null);
      if (!editingProduct) setCurrentPage(1);
      // Обновляем список — свежие данные с сервера
      await fetchProducts();
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      const msg =
        err instanceof Error ? err.message : "Не удалось сохранить товар";
      toast.error(msg, {
        className: "toast-error",
        position: "top-center",
        duration: 5000,
      });
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!confirm(`Удалить товар "${product?.name}"? Это действие нельзя отменить.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Ошибка HTTP: ${res.status}`);
      }
      toast.success("Товар удалён ✓", {
        className: "toast-success",
        position: "top-center",
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Ошибка удаления:", err);
      const msg =
        err instanceof Error ? err.message : "Не удалось удалить товар";
      toast.error(msg, {
        className: "toast-error",
        position: "top-center",
        duration: 5000,
      });
      await fetchProducts();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-in min-h-screen">
      <div className="flex items-center justify-between mb-8 gap-3">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: "var(--color-grey-800)" }}
        >
          Управление товарами
        </h1>
        <button
          onClick={handleAdd}
          disabled={loading}
          aria-label="Добавить товар"
          className="flex items-center gap-1.5 shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 text-white rounded-xl font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "var(--color-brand-600)",
            boxShadow: "var(--shadow-soft)",
          }}
          onMouseEnter={(e) => {
            if (!loading)
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--color-brand-700)";
          }}
          onMouseLeave={(e) => {
            if (!loading)
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--color-brand-600)";
          }}
        >
          <span className="text-lg leading-none">+</span>
          <span className="hidden sm:inline">Добавить товар</span>
        </button>
      </div>

      {showForm && (
        <ModalPortal
          onClose={() => {
            if (!saving) {
              setShowForm(false);
              setEditingProduct(null);
              setFormError(null);
            }
          }}
        >
          <div
            className="rounded-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--shadow-hover)",
            }}
          >
            <h2
              className="text-xl font-bold mb-5"
              style={{ color: "var(--color-grey-800)" }}
            >
              {editingProduct ? "✏️ Редактирование товара" : "➕ Новый товар"}
            </h2>
            <ProductForm
              product={editingProduct}
              categories={categories}
              onSave={handleSave}
              onCancel={() => {
                if (!saving) {
                  setShowForm(false);
                  setEditingProduct(null);
                  setFormError(null);
                }
              }}
              isSaving={saving}
              error={formError}
            />
          </div>
        </ModalPortal>
      )}

      {loading ? (
        <div
          className="text-center py-16 text-lg"
          style={{ color: "var(--color-grey-500)" }}
        >
          <span className="inline-block animate-pulse">
            🔄 Загрузка товаров...
          </span>
        </div>
      ) : products.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{
            color: "var(--color-grey-500)",
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          📦 Нет товаров. Нажмите «Добавить товар» для создания первого.
        </div>
      ) : (
        <>
          {totalPages > 1 && (
            <div
              className="flex justify-between items-center mb-4 text-sm"
              style={{ color: "var(--color-grey-500)" }}
            >
              <span>
                Показано{" "}
                <span
                  style={{ color: "var(--color-grey-700)", fontWeight: 500 }}
                >
                  {firstItem}–{lastItem}
                </span>{" "}
                из{" "}
                <span
                  style={{ color: "var(--color-grey-700)", fontWeight: 500 }}
                >
                  {products.length}
                </span>{" "}
                товаров
              </span>
              <span className="hidden sm:block">
                Страница{" "}
                <span
                  style={{ color: "var(--color-grey-700)", fontWeight: 500 }}
                >
                  {currentPage}
                </span>{" "}
                из{" "}
                <span
                  style={{ color: "var(--color-grey-700)", fontWeight: 500 }}
                >
                  {totalPages}
                </span>
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {paginatedProducts.map((product) => (
              <div key={product.id} className="relative group">
                <ProductCard product={product} />
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  <button
                    onClick={() => handleEdit(product)}
                    disabled={deletingId === product.id}
                    className="px-3 py-1.5 text-white text-xs rounded-lg shadow-md transition-all whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "var(--color-brand-600)" }}
                    onMouseEnter={(e) => {
                      if (deletingId !== product.id)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "var(--color-brand-700)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "var(--color-brand-600)";
                    }}
                  >
                    ✏️ Изменить
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deletingId === product.id || saving}
                    className="px-3 py-1.5 text-white text-xs rounded-lg shadow-md transition-all whitespace-nowrap flex items-center justify-center min-w-[80px] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "#e11d48" }}
                    onMouseEnter={(e) => {
                      if (deletingId !== product.id && !saving)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "#be123c";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#e11d48";
                    }}
                  >
                    {deletingId === product.id ? (
                      <span className="animate-pulse">🗑️...</span>
                    ) : (
                      "🗑️ Удалить"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
