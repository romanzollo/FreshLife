/**
 * Страница администрирования — управление товарами (CRUD).
 *
 * Позволяет создавать, редактировать и удалять товары через форму в модальном окне.
 * Страница является клиентским компонентом ('use client'), так как
 * активно управляет состоянием UI и взаимодействует с API.
 *
 * Поток создания/редактирования товара:
 *   Клик "Добавить" → handleAdd() → открывается ModalPortal с ProductForm →
 *   пользователь заполняет форму → ProductForm вызывает onSave(data) →
 *   handleSave() отправляет запрос к API → обновляет список товаров
 *
 * Поток удаления:
 *   Клик "Удалить" → handleDelete(id) → подтверждение window.confirm →
 *   DELETE /api/products/[id] → оптимистичное удаление из state
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductForm, type ProductFormData } from "@/components/ProductForm";
import type { Product, Category } from "@/types";
import { ModalPortal } from "@/components/ModalPortal";
import toast from "react-hot-toast";

export default function AdminPage() {
  // ── Данные ────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // ── Состояния UI ──────────────────────────────────────────────────────────
  /** true пока идёт первоначальная загрузка данных */
  const [loading, setLoading] = useState(true);
  /** true пока идёт сохранение (POST/PUT) — блокирует кнопки в форме */
  const [saving, setSaving] = useState(false);
  /** id товара, который прямо сейчас удаляется (null = никто не удаляется) */
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Ошибка от API, которую нужно показать в форме */
  const [formError, setFormError] = useState<string | null>(null);
  /** Товар, открытый для редактирования. null = режим создания нового */
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  /** Показывает/скрывает модальное окно с формой */
  const [showForm, setShowForm] = useState(false);

  // ── Загрузка данных ───────────────────────────────────────────────────────

  /**
   * Загружает список всех товаров без фильтрации.
   * Обёрнут в useCallback, чтобы useEffect не попадал в бесконечный цикл
   * (функция не пересоздаётся без необходимости).
   */
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
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

  /**
   * Загружает список категорий для выпадающего списка в форме.
   * Не обёрнута в useCallback — вызывается только из useEffect при монтировании.
   */
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки категорий:", err);
      // Ошибка категорий не критична — форма работает, просто select будет пустым
    }
  };

  /**
   * При монтировании параллельно загружаем товары и категории.
   * Promise.all ждёт завершения обоих запросов — это быстрее, чем последовательно.
   */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProducts]);

  // ── Обработчики действий ──────────────────────────────────────────────────

  /** Открывает форму в режиме создания нового товара */
  const handleAdd = () => {
    setEditingProduct(null); // null = режим создания
    setFormError(null);
    setShowForm(true);
  };

  /** Открывает форму в режиме редактирования существующего товара */
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormError(null);
    setShowForm(true);
  };

  /**
   * Сохраняет товар: PUT при редактировании, POST при создании.
   * Вызывается из ProductForm после успешной клиентской валидации.
   */
  const handleSave = async (data: ProductFormData) => {
    setSaving(true);
    setFormError(null);

    try {
      let res: Response;

      if (editingProduct) {
        // Редактирование: отправляем PUT с ID товара в URL
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        // Создание: отправляем POST на коллекцию
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

      if (!res.ok) {
        // Пробуем извлечь сообщение об ошибке из тела ответа
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Ошибка HTTP: ${res.status}`);
      }

      toast.success(editingProduct ? "Товар обновлён ✓" : "Товар добавлен ✓", {
        className: "toast-success",
        position: "top-center",
      });

      // Закрываем форму и обновляем список
      setShowForm(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      const message =
        err instanceof Error ? err.message : "Не удалось сохранить товар";
      toast.error(message, {
        className: "toast-error",
        position: "top-center",
        duration: 5000,
      });
      // Передаём ошибку в форму, чтобы пользователь видел её рядом с кнопкой
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Удаляет товар после подтверждения.
   *
   * Стратегия обновления:
   * - При успехе: оптимистично убираем карточку из state (быстро, без рефетча)
   * - При ошибке: делаем рефетч, чтобы состояние UI соответствовало БД
   */
  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id);

    // Нативный диалог подтверждения — простое и надёжное решение для MVP
    if (!confirm(`Удалить товар "${product?.name}"? Это действие нельзя отменить.`)) {
      return;
    }

    // Устанавливаем id удаляемого товара, чтобы показать спиннер на его кнопке
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

      // Оптимистичное удаление: убираем из списка без повторного запроса к API
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Ошибка удаления:", err);
      const message =
        err instanceof Error ? err.message : "Не удалось удалить товар";
      toast.error(message, {
        className: "toast-error",
        position: "top-center",
        duration: 5000,
      });
      // При ошибке синхронизируем UI с реальным состоянием БД
      await fetchProducts();
    } finally {
      setDeletingId(null);
    }
  };

  // ── Рендер ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in min-h-screen">
      {/* Шапка страницы с заголовком и кнопкой добавления */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Управление товарами
        </h1>
        <button
          onClick={handleAdd}
          disabled={loading}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-xl font-medium shadow-(--shadow-soft) transition-all"
        >
          + Добавить товар
        </button>
      </div>

      {/*
        Модальное окно с формой.
        Рендерится через портал в document.body (ModalPortal),
        чтобы избежать проблем с z-index и overflow: hidden.
      */}
      {showForm && (
        <ModalPortal
          onClose={() => {
            // Не закрываем модалку во время сохранения — данные могут потеряться
            if (!saving) {
              setShowForm(false);
              setEditingProduct(null);
              setFormError(null);
            }
          }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-(--shadow-hover) w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-200/80 dark:border-slate-700/50">
            <h2 className="text-xl font-bold mb-5 text-slate-800 dark:text-slate-100">
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

      {/* Основное содержимое: три состояния — загрузка, пусто, список */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-lg">
          <span className="inline-block animate-pulse">
            🔄 Загрузка товаров...
          </span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-(--shadow-soft)">
          📦 Нет товаров. Нажмите «Добавить товар» для создания первого.
        </div>
      ) : (
        /*
          Адаптивная сетка карточек.
          Кнопки редактирования/удаления скрыты (opacity-0) и появляются
          при наведении (group-hover:opacity-100) через класс group на обёртке.
        */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} />

              {/* Оверлей с кнопками управления, видим только при hover */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                <button
                  onClick={() => handleEdit(product)}
                  disabled={deletingId === product.id}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white text-xs rounded-lg shadow-md transition-all whitespace-nowrap"
                >
                  ✏️ Изменить
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  disabled={deletingId === product.id || saving}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-400 text-white text-xs rounded-lg shadow-md transition-all whitespace-nowrap flex items-center justify-center min-w-[80px]"
                >
                  {deletingId === product.id ? (
                    // Спиннер-анимация на кнопке удаления во время запроса
                    <span className="animate-pulse">🗑️...</span>
                  ) : (
                    "🗑️ Удалить"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
