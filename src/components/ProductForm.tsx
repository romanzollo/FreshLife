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
 *
 * Цвета: все цвета берутся из CSS-переменных дизайн-системы, которые
 * автоматически переключаются при смене темы. Акцентный цвет — Indigo
 * из брендовой палитры (--accent, --color-brand-*).
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

  /*
    Общий класс для полей ввода — вынесен в переменную, чтобы не дублировать.
    Цвета задаются через CSS-переменные, которые меняются с темой автоматически.
    focus:ring-[var(--accent)] использует Indigo как акцентный цвет фокуса.
  */
  const inputStyles =
    "w-full px-4 py-2.5 rounded-xl outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed";

  // Обработчики focus/blur для ring-эффекта через inline-стили (CSS vars + box-shadow)
  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (!isSaving) {
        (e.target as HTMLElement).style.boxShadow = '0 0 0 3px var(--accent-soft)';
        (e.target as HTMLElement).style.borderColor = 'var(--accent)';
      }
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      (e.target as HTMLElement).style.boxShadow = 'none';
      (e.target as HTMLElement).style.borderColor = 'var(--input-border)';
    },
  };

  // Базовые inline-стили для полей ввода (CSS-переменные темы)
  const inputStyle = {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--input-text)',
  };

  // Inline-стили для label-ов
  const labelStyle = { color: 'var(--label-color)' };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Название ────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
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
          style={inputStyle}
          {...focusHandlers}
        />
      </div>

      {/* ── Описание (необязательное) ────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
          Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          disabled={isSaving}
          placeholder="Краткое описание товара..."
          className={`${inputStyles} resize-none`}
          style={inputStyle}
          {...focusHandlers}
        />
      </div>

      {/* ── Цена и Категория (в одну строку на достаточно широких экранах) ──── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
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
            style={inputStyle}
            {...focusHandlers}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
            Категория *
          </label>
          {/* Отключаем selects если категорий нет (например, данные ещё грузятся) */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={isSaving || categories.length === 0}
            className={inputStyles}
            style={inputStyle}
            {...focusHandlers}
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
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
            В наличии
          </label>
          <input
            type="number"
            min="0"
            value={inStock}
            onChange={(e) => setInStock(e.target.value)}
            disabled={isSaving}
            className={inputStyles}
            style={inputStyle}
            {...focusHandlers}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
            Единица
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={isSaving}
            className={inputStyles}
            style={inputStyle}
            {...focusHandlers}
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
        <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
          URL изображения
        </label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={isSaving}
          placeholder="/images/product.jpg"
          className={inputStyles}
          style={inputStyle}
          {...focusHandlers}
        />
        {/* Небольшая подсказка с текущим URL, только если он введён */}
        {imageUrl && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-grey-500)' }}>
            Предпросмотр: <span className="underline">{imageUrl}</span>
          </p>
        )}
      </div>

      {/*
        Ошибка от родительского компонента (AdminPage).
        Появляется, если сервер вернул ошибку при сохранении.
        Расположена прямо над кнопками, чтобы пользователь точно её заметил.
        Использует --color-red-100/700 из дизайн-системы, которые адаптируются к теме.
      */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'var(--color-red-100)',
            border: '1px solid var(--color-red-700)',
            color: 'var(--color-red-700)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── Кнопки действий ──────────────────────────────────────────────────── */}
      <div
        className="flex gap-3 pt-5"
        style={{ borderTop: '1px solid var(--card-border)' }}
      >
        {/*
          Кнопка "Сохранить": использует --color-brand-600 (Indigo-600) как фон.
          При hover чуть темнее — --color-brand-700 (Indigo-700).
          Disabled: приглушённый серый из серой шкалы.
        */}
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 px-5 py-2.5 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: 'var(--color-brand-600)',
            boxShadow: 'var(--shadow-soft)',
          }}
          onMouseEnter={(e) => {
            if (!isSaving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-700)';
          }}
          onMouseLeave={(e) => {
            if (!isSaving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-600)';
          }}
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

        {/* Кнопка "Отмена": нейтральный серый фон, адаптируется к теме */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-grey-200)',
            color: 'var(--color-grey-700)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-grey-300)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-grey-200)';
          }}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
