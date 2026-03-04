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
 *
 * ── Загрузка изображений ──────────────────────────────────────────────────
 * Секция изображения работает в двух режимах:
 *   "file"  — drag-and-drop зона + кнопка выбора файла (режим по умолчанию).
 *             При выборе/сбросе файла сразу отправляется POST /api/upload,
 *             полученный URL записывается в state imageUrl.
 *   "url"   — ручной ввод URL (запасной вариант для опытных пользователей).
 *
 * Поле imageUrl в данных формы (ProductFormData) — всегда строка с URL,
 * независимо от того, через какой режим оно было заполнено.
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
// Константы для загрузки файлов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MIME-типы, которые проверяются на клиенте до отправки файла.
 * Дублируют серверную валидацию в /api/upload/route.ts —
 * это позволяет показать ошибку мгновенно, без сетевого запроса.
 */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

/** Максимальный размер файла на клиенте (совпадает с серверным лимитом) */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 МБ

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

  // ── Состояния секции загрузки изображений ─────────────────────────────────

  /**
   * Режим ввода изображения:
   *   "file" — показываем drag-and-drop зону (по умолчанию)
   *   "url"  — показываем текстовое поле для ручного ввода URL
   */
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");

  /** true пока POST /api/upload ещё не завершился */
  const [uploading, setUploading] = useState(false);

  /** Текст ошибки от /api/upload или клиентской предвалидации */
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** true когда пользователь удерживает файл над drop-зоной */
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Ref на скрытый <input type="file">.
   * Мы открываем диалог выбора файла программно через fileInputRef.current.click(),
   * чтобы полностью контролировать внешний вид кнопки (без стандартного input-стиля).
   */
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Сбрасываем состояние загрузки при смене товара (открытие другой формы)
    setUploadMode("file");
    setUploadError(null);
    setIsDragOver(false);
  }, [product, categories]);

  // ── Логика загрузки файла ──────────────────────────────────────────────────

  /**
   * Загружает файл на сервер через POST /api/upload.
   *
   * Поток:
   *   1. Клиентская предвалидация (тип, размер) — мгновенная обратная связь
   *   2. Отправка FormData на /api/upload
   *   3. Получение { url } из ответа и запись в state imageUrl
   *
   * Обёрнуто в useCallback, чтобы функция не пересоздавалась при каждом рендере
   * и drag-обработчики могли безопасно её использовать.
   */
  const uploadFile = useCallback(async (file: File) => {
    // ── Предвалидация на клиенте ───────────────────────────────────────────
    // Показываем ошибку сразу, не дожидаясь ответа сервера
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Недопустимый формат. Разрешены: JPEG, PNG, WebP, GIF");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      setUploadError(`Файл слишком большой (${sizeMb} МБ). Максимум — 5 МБ`);
      return;
    }

    // Сбрасываем предыдущую ошибку и показываем спиннер
    setUploading(true);
    setUploadError(null);

    try {
      // FormData используется для отправки файлов (multipart/form-data).
      // НЕ устанавливаем заголовок Content-Type вручную — браузер сам добавит
      // boundary, который сервер использует для разбора полей формы.
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // Пробуем извлечь читаемое сообщение из тела ответа
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка HTTP: ${res.status}`);
      }

      const { url } = await res.json();

      // Записываем полученный URL в основное поле imageUrl —
      // он будет отправлен вместе с остальными данными формы при сабмите
      setImageUrl(url);
      setUploadError(null);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Не удалось загрузить файл"
      );
    } finally {
      setUploading(false);
    }
  }, []);

  /**
   * Обрабатывает файлы из <input type="file"> или drag-and-drop.
   * Берём только первый файл из списка — один товар, одно изображение.
   */
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      uploadFile(files[0]);
    },
    [uploadFile]
  );

  // ── Обработчики drag-and-drop ──────────────────────────────────────────────

  /**
   * dragover: предотвращаем стандартное поведение браузера (открытие файла
   * во вкладке) и подсвечиваем зону через isDragOver.
   * e.preventDefault() ОБЯЗАТЕЛЕН — без него событие drop не сработает!
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  /**
   * dragleave: файл покинул зону — убираем подсветку.
   * stopPropagation нужен, чтобы событие не всплывало к родительским элементам
   * и не сбрасывало isDragOver раньше времени.
   */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * drop: пользователь отпустил файл над зоной.
   * e.dataTransfer.files содержит список перетащенных файлов.
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  // ── Обработчик отправки формы ──────────────────────────────────────────────

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

    // Не отправляем форму, пока файл ещё загружается
    if (uploading) return;

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

      {/* ── Изображение ──────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
          Изображение
        </label>

        {/*
          Скрытый <input type="file"> — открываем его программно через ref.
          accept ограничивает диалог выбора файлов только изображениями.
          onClick сбрасывает value, чтобы можно было заново выбрать тот же файл
          (без сброса onChange не срабатывает при повторном выборе того же файла).
        */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={isSaving || uploading}
          onChange={(e) => handleFileSelect(e.target.files)}
          onClick={(e) => {
            (e.target as HTMLInputElement).value = "";
          }}
        />

        {/* ── Режим загрузки файла (по умолчанию) ────────────────────────────── */}
        {uploadMode === "file" ? (
          <div>
            {imageUrl && !uploading ? (
              /*
                Превью загруженного изображения.
                Показываем, когда imageUrl непустой (файл уже загружен или
                пришёл из редактирования существующего товара).
                Кнопка "✕" позволяет удалить изображение и выбрать другое.
              */
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  height: "160px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                }}
              >
                <img
                  src={imageUrl}
                  alt="Превью изображения товара"
                  className="w-full h-full object-cover"
                  // Если URL сломан — скрываем сломанный img
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0";
                  }}
                  onLoad={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "1";
                  }}
                />

                {/*
                  Кнопка удаления изображения — поверх превью, в правом углу.
                  Полупрозрачный тёмный фон + blur — работает в обеих темах.
                */}
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setUploadError(null);
                  }}
                  disabled={isSaving}
                  title="Удалить изображение"
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-white text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  ✕
                </button>

                {/*
                  Кнопка "Заменить" — в левом нижнем углу поверх превью.
                  Позволяет загрузить другой файл, не нажимая сначала "✕".
                */}
                <button
                  type="button"
                  onClick={() => !isSaving && fileInputRef.current?.click()}
                  disabled={isSaving}
                  className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  📷 Заменить
                </button>
              </div>
            ) : uploading ? (
              /*
                Состояние загрузки — отображается пока POST /api/upload в процессе.
                Заменяет drop-зону, чтобы пользователь не пытался бросить ещё один файл.
              */
              <div
                className="rounded-xl flex flex-col items-center justify-center gap-2.5"
                style={{
                  height: "120px",
                  background: "var(--input-bg)",
                  border: "1px dashed var(--input-border)",
                }}
              >
                {/* Спиннер — тот же стиль, что и на кнопке "Сохранить" */}
                <span
                  className="w-6 h-6 rounded-full animate-spin"
                  style={{
                    border: "2px solid var(--input-border)",
                    borderTopColor: "var(--accent)",
                  }}
                />
                <span className="text-sm" style={{ color: "var(--color-grey-500)" }}>
                  Загрузка изображения...
                </span>
              </div>
            ) : (
              /*
                Drag-and-drop зона — показывается когда imageUrl пуст.

                Клик открывает стандартный диалог выбора файла (через скрытый input).
                Перетаскивание: dragover → подсветка → drop → загрузка.

                isDragOver меняет цвета зоны для визуальной обратной связи.
              */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isSaving && fileInputRef.current?.click()}
                role="button"
                aria-label="Зона загрузки изображения"
                className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all select-none"
                style={{
                  height: "120px",
                  // Подсвечиваем зону Indigo-100 при наведении с файлом
                  background: isDragOver
                    ? "var(--color-indigo-100)"
                    : "var(--input-bg)",
                  // Меняем рамку с серой на акцентную
                  border: `2px dashed ${isDragOver ? "var(--accent)" : "var(--input-border)"}`,
                  color: isDragOver
                    ? "var(--accent)"
                    : "var(--color-grey-500)",
                }}
              >
                <span style={{ fontSize: "28px", lineHeight: 1 }}>🖼️</span>
                <span className="text-sm font-medium">
                  {isDragOver
                    ? "Отпустите для загрузки"
                    : "Перетащите или нажмите для выбора"}
                </span>
                <span className="text-xs" style={{ color: "var(--color-grey-400)" }}>
                  JPEG, PNG, WebP, GIF · до 5 МБ
                </span>
              </div>
            )}

            {/* Ошибка загрузки файла — под зоной или под превью */}
            {uploadError && !uploading && (
              <p
                className="mt-1.5 text-xs"
                style={{ color: "var(--color-red-700)" }}
              >
                ⚠️ {uploadError}
              </p>
            )}

            {/*
              Ссылка-переключатель в режим ручного ввода URL.
              Скрыта во время загрузки, чтобы не путать пользователя.
            */}
            {!uploading && (
              <button
                type="button"
                onClick={() => {
                  setUploadMode("url");
                  setUploadError(null);
                }}
                disabled={isSaving}
                className="mt-2 text-xs underline transition-opacity disabled:opacity-50 block"
                style={{ color: "var(--color-grey-400)" }}
              >
                Ввести URL вручную
              </button>
            )}
          </div>
        ) : (
          /* ── Режим ручного ввода URL ─────────────────────────────────────────
             Запасной вариант — пользователь может ввести любой URL изображения
             (например, если картинка уже лежит на сервере или внешнем хосте).
          */
          <div>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={isSaving}
              placeholder="https://example.com/image.jpg или /uploads/photo.jpg"
              className={inputStyles}
              style={inputStyle}
              {...focusHandlers}
            />

            {/*
              Миниатюрное превью для ручного URL.
              onError скрывает сломанный тег <img>, если URL невалиден —
              это лучше, чем показывать стандартную иконку сломанного изображения.
            */}
            {imageUrl && (
              <div
                className="mt-2 rounded-xl overflow-hidden flex items-center justify-center"
                style={{
                  height: "80px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                }}
              >
                <img
                  src={imageUrl}
                  alt="Превью по URL"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    // Показываем заглушку через следующий элемент
                    const sibling = img.nextElementSibling as HTMLElement | null;
                    if (sibling) sibling.style.display = "flex";
                  }}
                />
                {/* Заглушка, если URL изображения сломан */}
                <span
                  className="text-2xl hidden items-center justify-center w-full h-full"
                  style={{ display: "none" }}
                >
                  🚫
                </span>
              </div>
            )}

            {/* Переключатель обратно в режим загрузки файла */}
            <button
              type="button"
              onClick={() => {
                setUploadMode("file");
                setUploadError(null);
              }}
              disabled={isSaving}
              className="mt-2 text-xs underline transition-opacity disabled:opacity-50 block"
              style={{ color: "var(--color-grey-400)" }}
            >
              ← Загрузить файл с компьютера
            </button>
          </div>
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
          Блокируется также во время загрузки файла (uploading), чтобы не
          отправить форму с пустым imageUrl пока файл ещё не дошёл до сервера.
        */}
        <button
          type="submit"
          disabled={isSaving || uploading}
          className="flex-1 px-5 py-2.5 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: 'var(--color-brand-600)',
            boxShadow: 'var(--shadow-soft)',
          }}
          onMouseEnter={(e) => {
            if (!isSaving && !uploading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-700)';
          }}
          onMouseLeave={(e) => {
            if (!isSaving && !uploading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-600)';
          }}
        >
          {isSaving ? (
            <>
              {/* Спиннер во время сохранения */}
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Сохранение...
            </>
          ) : uploading ? (
            <>
              {/* Спиннер во время загрузки изображения */}
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Загрузка фото...
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
