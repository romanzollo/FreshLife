// app/admin/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { ProductForm, type ProductFormData } from '@/components/ProductForm';
import type { Product, Category } from '@/types';
import { ModalPortal } from '@/components/ModalPortal';
import toast from 'react-hot-toast';

export default function AdminPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showForm, setShowForm] = useState(false);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки товаров:', err);
            toast.error('Не удалось загрузить список товаров', {
                className: 'toast-error',
                position: 'top-center',
            });
            setProducts([]);
        }
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки категорий:', err);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchProducts(), fetchCategories()]);
            setLoading(false);
        };
        loadData();
    }, [fetchProducts]);

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
                // 🔁 РЕДАКТИРОВАНИЕ (PUT)
                res = await fetch(`/api/products/${editingProduct.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
            } else {
                // ➕ СОЗДАНИЕ (POST)
                res = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Ошибка HTTP: ${res.status}`);
            }

            //  Успех
            toast.success(
                editingProduct ? 'Товар обновлён ✓' : 'Товар добавлен ✓',
                {
                    className: 'toast-success',
                    position: 'top-center',
                },
            );

            setShowForm(false);
            setEditingProduct(null);
            await fetchProducts();
        } catch (err) {
            console.error('Ошибка сохранения:', err);
            const message =
                err instanceof Error
                    ? err.message
                    : 'Не удалось сохранить товар';
            toast.error(message, {
                className: 'toast-error',
                position: 'top-center',
                duration: 5000,
            });
            setFormError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const product = products.find((p) => p.id === id);
        if (
            !confirm(
                `Удалить товар "${product?.name}"? Это действие нельзя отменить.`,
            )
        ) {
            return;
        }

        setDeletingId(id);

        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Ошибка HTTP: ${res.status}`);
            }

            //  Успешное удаление
            toast.success('Товар удалён ✓', {
                className: 'toast-success',
                position: 'top-center',
            });
            setProducts((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error('Ошибка удаления:', err);
            const message =
                err instanceof Error ? err.message : 'Не удалось удалить товар';
            toast.error(message, {
                className: 'toast-error',
                position: 'top-center',
                duration: 5000,
            });
            await fetchProducts();
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="animate-fade-in min-h-screen">
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

            {formError && showForm && (
                <div className="mb-4 rounded-xl border border-rose-300/80 dark:border-rose-500/70 bg-rose-50 dark:bg-rose-900/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200 shadow-(--shadow-soft)">
                    ⚠️ {formError}
                </div>
            )}

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
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-(--shadow-hover) w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-200/80 dark:border-slate-700/50">
                        <h2 className="text-xl font-bold mb-5 text-slate-800 dark:text-slate-100">
                            {editingProduct
                                ? '✏️ Редактирование товара'
                                : '➕ Новый товар'}
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
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-lg">
                    <span className="inline-block animate-pulse">
                        🔄 Загрузка товаров...
                    </span>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-(--shadow-soft)">
                    📦 Нет товаров. Нажмите «Добавить товар» для создания
                    первого.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {products.map((product) => (
                        <div key={product.id} className="relative group">
                            <ProductCard product={product} />
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
                                    disabled={
                                        deletingId === product.id || saving
                                    }
                                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-400 text-white text-xs rounded-lg shadow-md transition-all whitespace-nowrap flex items-center justify-center min-w-[80px]"
                                >
                                    {deletingId === product.id ? (
                                        <span className="animate-pulse">
                                            🗑️...
                                        </span>
                                    ) : (
                                        '🗑️ Удалить'
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
