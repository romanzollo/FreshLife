// Форма создания/редактирования товара, используется в админ‑панели.
"use client";

import { useState, useEffect } from "react";
import type { Product, Category } from "@/types";

interface ProductFormProps {
  // Если product передан — форма работает в режиме редактирования.
  // Если нет — создаётся новый товар.
  product?: Product | null;
  categories: Category[];
  onSave: (data: ProductFormData) => void;
  onCancel: () => void;
}

// Нормализованный объект, который уходит в API.
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  inStock: number;
  unit: string;
  imageUrl: string;
}

export function ProductForm({ product, categories, onSave, onCancel }: ProductFormProps) {
  // Управляемые поля формы. Внутри храним строки, а перед сохранением превращаем в числа.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [inStock, setInStock] = useState("100");
  const [unit, setUnit] = useState("шт");
  const [imageUrl, setImageUrl] = useState("");

  // При открытии формы заполняем значения либо из товара, либо дефолтами.
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(String(product.price));
      setCategoryId(product.categoryId);
      setInStock(String(product.inStock));
      setUnit(product.unit);
      setImageUrl(product.imageUrl || "");
    } else if (categories.length) {
      // Для удобства сразу выбираем первую доступную категорию.
      setCategoryId(categories[0].id);
    }
  }, [product, categories]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const numPrice = parseFloat(price);
    const numStock = parseInt(inStock, 10);

    // Минимальная валидация на клиенте — блокируем отправку при некорректных полях.
    if (!name.trim() || isNaN(numPrice) || !categoryId) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      price: numPrice,
      categoryId,
      inStock: isNaN(numStock) ? 100 : numStock,
      unit,
      imageUrl: imageUrl.trim(),
    });
  };

  const inputStyles =
    "w-full px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-600/50 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Название товара */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Название *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputStyles}
        />
      </div>

      {/* Описание товара (необязательное поле) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`${inputStyles} resize-none`}
        />
      </div>

      {/* Цена и категория */}
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
            className={inputStyles}
          >
            <option value="">Выберите категорию</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Остатки и единица измерения */}
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
            className={inputStyles}
          >
            <option value="шт">шт</option>
            <option value="кг">кг</option>
            <option value="л">л</option>
          </select>
        </div>
      </div>

      {/* Поле для ручного указания URL изображения */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          URL изображения
        </label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="/products/example.jpg"
          className={inputStyles}
        />
      </div>

      {/* Кнопки действий формы */}
      <div className="flex gap-3 pt-5">
        <button
          type="submit"
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium shadow-(--shadow-soft) transition-all"
        >
          {product ? "Сохранить" : "Добавить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
