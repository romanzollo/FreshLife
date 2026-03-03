// Форма создания/редактирования товара для админ-панели.
// Экспортируем и компонент, и тип данных — оба нужны в AdminPage.
'use client';

import { useState, useEffect } from 'react';
import type { Product, Category } from '@/types';

// ========== ПРОПСЫ ФОРМЫ ==========
export interface ProductFormProps {
    product?: Product | null; // Если есть — режим редактирования
    categories: Category[]; // Список категорий для <select>
    onSave: (data: ProductFormData) => void; // Callback при успешной валидации
    onCancel: () => void; // Callback при отмене
    isSaving?: boolean; // Флаг загрузки (блокирует кнопку)
    error?: string | null;
}

// ========== ТИП ДАННЫХ ДЛЯ ОТПРАВКИ В API ==========
// Этот интерфейс экспортируем, чтобы AdminPage мог типизировать данные
export interface ProductFormData {
    name: string;
    description: string;
    price: number;
    categoryId: string;
    inStock: number;
    unit: string;
    imageUrl: string;
}

// ========== КОМПОНЕНТ ФОРМЫ ==========
export function ProductForm({
    product,
    categories,
    onSave,
    onCancel,
    isSaving = false,
}: ProductFormProps) {
    // Состояния полей формы (храним строки для input, конвертируем при отправке)
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [inStock, setInStock] = useState('100');
    const [unit, setUnit] = useState('шт');
    const [imageUrl, setImageUrl] = useState('');

    // Заполняем форму данными товара при редактировании
    useEffect(() => {
        if (product) {
            setName(product.name);
            setDescription(product.description || '');
            setPrice(String(product.price));
            setCategoryId(product.categoryId);
            setInStock(String(product.inStock));
            setUnit(product.unit);
            setImageUrl(product.imageUrl || '');
        } else if (categories.length > 0) {
            // Для нового товара выбираем первую категорию по умолчанию
            setCategoryId(categories[0].id);
        }
    }, [product, categories]);

    // Обработчик отправки формы
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Конвертация строк в числа
        const numPrice = parseFloat(price);
        const numStock = parseInt(inStock, 10);

        // Простая валидация: блокируем отправку при некорректных данных
        if (!name.trim() || isNaN(numPrice) || !categoryId || numPrice < 0) {
            return;
        }

        // Формируем объект данных в нужном формате
        const formData: ProductFormData = {
            name: name.trim(),
            description: description.trim(),
            price: numPrice,
            categoryId,
            inStock: isNaN(numStock) ? 0 : Math.max(0, numStock), // Не допускаем отрицательные остатки
            unit,
            imageUrl: imageUrl.trim(),
        };

        // Передаём данные наверх в AdminPage
        onSave(formData);
    };

    // Переиспользуемый стиль для всех инпутов
    const inputStyles =
        'w-full px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-600/50 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Название товара (обязательное) */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Название *
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isSaving}
                    placeholder="Например: Яблоки Голден"
                    className={inputStyles}
                />
            </div>

            {/* Описание (необязательное) */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Описание
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    disabled={isSaving}
                    placeholder="Краткое описание товара..."
                    className={`${inputStyles} resize-none`}
                />
            </div>

            {/* Цена и Категория (в одну строку) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Цена (₽) *
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        disabled={isSaving}
                        placeholder="0.00"
                        className={inputStyles}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Категория *
                    </label>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                        disabled={isSaving || categories.length === 0}
                        className={inputStyles}
                    >
                        <option value="">Выберите...</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Остатки и Единица измерения */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        В наличии
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={inStock}
                        onChange={(e) => setInStock(e.target.value)}
                        disabled={isSaving}
                        className={inputStyles}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Единица
                    </label>
                    <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        disabled={isSaving}
                        className={inputStyles}
                    >
                        <option value="шт">шт</option>
                        <option value="кг">кг</option>
                        <option value="л">л</option>
                        <option value="уп">уп</option>
                    </select>
                </div>
            </div>

            {/* URL изображения */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    URL изображения
                </label>
                <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={isSaving}
                    placeholder="/images/product.jpg"
                    className={inputStyles}
                />
                {imageUrl && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Предпросмотр:{' '}
                        <span className="underline">{imageUrl}</span>
                    </p>
                )}
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-3 pt-5 border-t border-slate-200/60 dark:border-slate-700/50">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-(--shadow-soft) transition-all flex items-center justify-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Сохранение...
                        </>
                    ) : product ? (
                        '💾 Сохранить изменения'
                    ) : (
                        '➕ Добавить товар'
                    )}
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                    Отмена
                </button>
            </div>
        </form>
    );
}
