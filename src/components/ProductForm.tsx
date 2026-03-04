/**
 * ProductForm — форма создания и редактирования товара.
 *
 * Используется в AdminPage внутри модального окна (ModalPortal).
 * Компонент управляет собственным локальным состоянием полей,
 * конвертирует строки в числа при отправке и передаёт готовый
 * объект ProductFormData наверх через колбэк onSave.
 *
 * Экспортируем как именованный экспорт, а не default,
 * чтобы файл мог экспортировать несколько символов (ProductFormData тоже).
 */
"use client";

import { useState, useEffect } from "react";
import type { Product, Category } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Типы публичного API компонента
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Данные, которые форма передаёт в onSave.
 * Все поля уже типизированы корректно (числа — числа, строки — строки),
 * чтобы AdminPage не делал дополнительных преобразований.
 *
 * Экспортируем отдельно, чтобы AdminPage мог использовать этот тип
 * без необходимости импортировать сам компонент.
 */
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  inStock: number;
  unit: string;
  imageUrl: string;
}

/** Все пропсы компонента ProductForm */
export interface ProductFormProps {
  /** Если передан — режим редактирования (поля заполняются из объекта) */
  product?: Product | null;
  /** Список категорий для выпадающего списка */
  categories: Category[];
  /** Вызывается при успешной валидации и отправке формы */
  onSave: (data: ProductFormData) => void;
  /** Вызывается при нажатии кнопки "Отмена" */
  onCancel: () => void;
  /** Блокирует форму во время сетевого запроса */
  isSaving?: boolean;
  /** Текст ошибки от родителя (например, ответ API). Отображается над кнопками */
  error?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Компонент
// ─────────────────────────────────────────────────────────────────────────────

export function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
  isSaving = false,
  error,
}: ProductFormProps) {
  // Все поля хранятся как строки, потому что <input> всегда возвращает строку.
  // Конвертируем в числа только в момент отправки формы (handleSubmit).
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [inStock, setInStock] = useState("100");
  const [unit, setUnit] = useState("шт");
  const [imageUrl, setImageUrl] = useState("");

  /**
   * При открытии формы заполняем поля:
   * - если передан product → режим редактирования, берём его данные
   * - если нет → режим создания, выбираем первую категорию по умолчанию
   *
   * Зависимости [product, categories] гарантируют, что эффект сработает
   * заново, если модалку закрыли и открыли с другим товаром.
   */
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(String(product.price));
      setCategoryId(product.categoryId);
      setInStock(String(product.inStock));
      setUnit(product.unit);
      setImageUrl(product.imageUrl ?? "");
    } else if (categories.length > 0) {
      // Для нового товара предвыбираем первую категорию, чтобы поле не было пустым
      setCategoryId(categories[0].id);
    }
  }, [product, categories]);

  /**
   * Обработчик отправки формы.
   * Валидирует данные на клиенте перед тем, как передать их наверх.
   * Серверная валидация — дополнительная страховка (в route.ts).
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Предотвращаем стандартную перезагрузку страницы при сабмите формы
    e.preventDefault();

    const numPrice = parseFloat(price);
    const numStock = parseInt(inStock, 10);

    // Базовая клиентская валидация — быстрая обратная связь без обращения к API
    if (!name.trim() || isNaN(numPrice) || numPrice < 0 || !categoryId) {
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      price: numPrice,
      categoryId,
      // Math.max(0, ...) страхует от отрицательных остатков, isNaN → 0
      inStock: isNaN(numStock) ? 0 : Math.max(0, numStock),
      unit,
      imageUrl: imageUrl.trim(),
    });
  };

  // Переиспользуемый класс для всех полей ввода, чтобы не дублировать длинную строку
  const inputStyles =
    "w-full px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-600/50 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Название ────────────────────────────────────────────────────────── */}
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

      {/* ── Описание (необязательное) ────────────────────────────────────────── */}
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

      {/* ── Цена и Категория (в одну строку на достаточно широких экранах) ──── */}
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
          {/* Отключаем selects если категорий нет (например, данные ещё грузятся) */}
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

      {/* ── Остатки и единица измерения ──────────────────────────────────────── */}
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

      {/* ── URL изображения ──────────────────────────────────────────────────── */}
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
        {/* Небольшая подсказка с текущим URL, только если он введён */}
        {imageUrl && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Предпросмотр: <span className="underline">{imageUrl}</span>
          </p>
        )}
      </div>

      {/*
        Ошибка от родительского компонента (AdminPage).
        Появляется, если сервер вернул ошибку при сохранении.
        Расположена прямо над кнопками, чтобы пользователь точно её заметил.
      */}
      {error && (
        <div className="rounded-xl border border-rose-300/80 dark:border-rose-500/70 bg-rose-50 dark:bg-rose-900/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          ⚠️ {error}
        </div>
      )}

      {/* ── Кнопки действий ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-5 border-t border-slate-200/60 dark:border-slate-700/50">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-(--shadow-soft) transition-all flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              {/* Спиннер во время сохранения */}
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Сохранение...
            </>
          ) : product ? (
            "💾 Сохранить изменения"
          ) : (
            "➕ Добавить товар"
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
