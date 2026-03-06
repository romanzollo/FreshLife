/**
 * ProductFilters — панель фильтрации и сортировки каталога.
 *
 * "Тупой" (presentational) компонент: получает текущее состояние фильтров
 * и колбэки для их изменения. Всю логику загрузки данных выполняет родитель
 * (страница каталога).
 *
 * Особенность сортировки: поле и направление объединены в одну строку
 * формата "field-direction" (например, "price-asc"), чтобы использовать
 * один <select> вместо двух. При изменении значение разбивается по "-".
 *
 * Цвета: все цвета берутся из CSS-переменных дизайн-системы, которые
 * автоматически переключаются при смене темы (светлая / тёмная).
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category } from "@/types";
import { ModalPortal } from "@/components/ModalPortal";

interface ProductFiltersProps {
  /** Список категорий для выпадающего списка (загружается родителем) */
  categories: Category[];
  /** ID выбранной категории. Пустая строка = все категории */
  selectedCategory: string;
  /** Поле сортировки: "name" | "price" | "createdAt" | "inStock" */
  sortBy: string;
  /** Направление сортировки: "asc" | "desc" */
  sortOrder: string;
  /** Текст поискового запроса */
  search: string;
  /** Вызывается при выборе категории */
  onCategoryChange: (id: string) => void;
  /**
   * Вызывается при изменении сортировки.
   * Передаёт оба параметра одновременно, так как они всегда изменяются вместе.
   */
  onSortChange: (sortBy: string, sortOrder: string) => void;
  /** Вызывается при каждом нажатии клавиши в поле поиска */
  onSearchChange: (search: string) => void;
}

export function ProductFilters({
  categories,
  selectedCategory,
  sortBy,
  sortOrder,
  search,
  onCategoryChange,
  onSortChange,
  onSearchChange,
}: ProductFiltersProps) {
  /**
   * Вместо нативных <select> используем собственный “лист выбора” (modal + список).
   *
   * Почему так:
   * - На iOS/Android выпадающий список <select> открывается системным контролом,
   *   который практически не стилизуется (шрифты, рамки, отступы, скругления и т.д.).
   * - Даже на desktop нативные меню браузеров отличаются между платформами.
   *
   * Поэтому делаем единый UI-контрол, который:
   * - выглядит одинаково везде
   * - полностью контролируется стилями дизайн-токенов (CSS variables)
   * - лучше поддерживает touch/keyboard (focus-visible)
   */
  const [openMenu, setOpenMenu] = useState<"category" | "sort" | null>(null);

  /**
   * Определяем “desktop vs mobile” не по user-agent, а по media query.
   *
   * Зачем:
   * - Tailwind скрывает элементы через CSS, но если компонент СМОНТИРОВАН
   *   (например, Portal), он всё равно может перекрывать страницу и ломать UX.
   * - Нам важно на desktop НЕ монтировать мобильную модалку вообще
   *   (без затемнения/блокировки скролла), а показывать dropdown под кнопкой.
   *
   * Порог берём тот же, что и в Tailwind `sm` (min-width: 640px).
   */
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // SSR-safe: в Next на сервере window нет.
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();

    // addEventListener поддерживается в современных браузерах; fallback для старых.
    try {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } catch {
      mq.addListener(update);
      return () => mq.removeListener(update);
    }
  }, []);

  /**
   * Для desktop-UX нам нужен “dropdown под инпутом”:
   * - без затемнения/blur всей страницы
   * - закрывается по клику вне меню и по Escape
   *
   * Поэтому держим ref на общий контейнер (кнопки + меню),
   * и слушаем pointerdown на документе.
   *
   * Почему pointerdown:
   * - работает и для мыши, и для touch, и для пера
   * - срабатывает раньше click → меньше “мигания” при быстром взаимодействии
   */
  const desktopMenusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Слушатели нужны только когда открыт dropdown И только на desktop.
    if (!openMenu || !isDesktop) return;

    const handlePointerDown = (e: PointerEvent) => {
      const root = desktopMenusRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu, isDesktop]);

  /*
    Общий стиль для всех элементов управления — вынесен в переменную,
    чтобы не дублировать длинную строку классов три раза.
    
    Цвета задаются через CSS-переменные дизайн-системы:
    - --input-bg, --input-border, --input-text: меняются с темой
    - focus:ring-[var(--accent)]: акцентный Indigo для ring-эффекта
  */
  const inputStyles =
    "w-full px-4 py-2.5 rounded-xl outline-none transition-all text-[14px] sm:text-sm font-medium";

  const inputInlineStyles = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    color: "var(--input-text)",
  };

  const focusRingClasses =
    "focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] focus-visible:border-[var(--accent)]";

  /**
   * Подпись для “кнопки выбора категории”:
   * - пустой selectedCategory означает “Все категории”
   * - иначе ищем название в переданном списке
   */
  const currentCategoryLabel = useMemo(() => {
    if (!selectedCategory) return "Все категории";
    return (
      categories.find((c) => c.id === selectedCategory)?.name ?? "Категория"
    );
  }, [categories, selectedCategory]);

  /**
   * Опции сортировки держим в массиве:
   * - их легко переиспользовать и в desktop, и в mobile UI
   * - текущую подпись можно вычислять одним поиском по value
   */
  const sortOptions = useMemo(
    () => [
      { value: "name-asc", label: "По названию (А-Я)" },
      { value: "name-desc", label: "По названию (Я-А)" },
      { value: "price-asc", label: "По цене (сначала дешёвые)" },
      { value: "price-desc", label: "По цене (сначала дорогие)" },
      { value: "createdAt-desc", label: "Новинки" },
      { value: "inStock-desc", label: "По наличию" },
    ],
    []
  );

  /**
   * Подпись для “кнопки выбора сортировки” (текущее значение).
   * На уровне компонента сортировка хранится как два поля: sortBy + sortOrder,
   * а для UI мы показываем человекочитаемую label.
   */
  const currentSortLabel = useMemo(() => {
    const v = `${sortBy}-${sortOrder}`;
    return sortOptions.find((o) => o.value === v)?.label ?? "Сортировка";
  }, [sortBy, sortOrder, sortOptions]);

  return (
    <div
      className="rounded-2xl p-5 mb-8"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/*
        Верстка должна быть простой и “неубиваемой” на промежуточных ширинах (700–900px).
        Поэтому используем один layout-контейнер на базе flex-wrap:
        - на узких экранах всё становится в колонку и тянется на 100% ширины
        - на средних/широких: поиск резиновый, фильтры фиксированной ширины
        - если места не хватает (например ~780–820px), фильтры автоматически переносятся
          на следующую строку, а поиск не “сжимается в нитку”
      */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
        <input
          type="text"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          inputMode="search"
          enterKeyHint="search"
          className={`${inputStyles} ${focusRingClasses} placeholder:opacity-50 sm:basis-full sm:w-full lg:basis-auto lg:w-auto lg:flex-1 lg:min-w-[260px]`}
          style={inputInlineStyles}
        />

        <div
          ref={desktopMenusRef}
          className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-start gap-3 w-full sm:w-full lg:w-auto"
        >
          {/* ── Категория ───────────────────────────────────────────────────── */}
          <div className="relative w-full sm:flex-1 sm:basis-0 lg:w-[240px] lg:flex-none">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((prev) => (prev === "category" ? null : "category"))
              }
              className={`${inputStyles} ${focusRingClasses} text-left flex items-center justify-between w-full`}
              style={inputInlineStyles}
              aria-haspopup="dialog"
              aria-expanded={openMenu === "category"}
            >
              <span className="truncate">{currentCategoryLabel}</span>
              <span className="shrink-0 opacity-70">▾</span>
            </button>

            {/* Desktop dropdown: под кнопкой, без затемнения */}
            {isDesktop && openMenu === "category" && (
              <div
                className="hidden sm:block absolute left-0 right-0 top-full mt-2 rounded-2xl p-2 z-20"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  boxShadow: "var(--shadow-hover)",
                }}
                role="dialog"
                aria-label="Выбор категории"
              >
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      onCategoryChange("");
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl"
                    style={{
                      background:
                        selectedCategory === ""
                          ? "var(--accent-soft)"
                          : "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--input-text)",
                    }}
                    aria-pressed={selectedCategory === ""}
                  >
                    Все категории
                  </button>
                  <div className="h-2" />
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onCategoryChange(cat.id);
                        setOpenMenu(null);
                      }}
                      className="w-full text-left px-4 py-2.5 rounded-xl mb-2 last:mb-0"
                      style={{
                        background:
                          selectedCategory === cat.id
                            ? "var(--accent-soft)"
                            : "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--input-text)",
                      }}
                      aria-pressed={selectedCategory === cat.id}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Сортировка ──────────────────────────────────────────────────── */}
          <div className="relative w-full sm:flex-1 sm:basis-0 lg:w-[260px] lg:flex-none">
            <button
              type="button"
              onClick={() => setOpenMenu((prev) => (prev === "sort" ? null : "sort"))}
              className={`${inputStyles} ${focusRingClasses} text-left flex items-center justify-between w-full`}
              style={inputInlineStyles}
              aria-haspopup="dialog"
              aria-expanded={openMenu === "sort"}
            >
              <span className="truncate">{currentSortLabel}</span>
              <span className="shrink-0 opacity-70">▾</span>
            </button>

            {isDesktop && openMenu === "sort" && (
              <div
                className="hidden sm:block absolute left-0 right-0 top-full mt-2 rounded-2xl p-2 z-20"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  boxShadow: "var(--shadow-hover)",
                }}
                role="dialog"
                aria-label="Выбор сортировки"
              >
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  {sortOptions.map((o) => {
                    const active = `${sortBy}-${sortOrder}` === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          const [field, direction] = o.value.split("-");
                          onSortChange(field, direction);
                          setOpenMenu(null);
                        }}
                        className="w-full text-left px-4 py-2.5 rounded-xl mb-2 last:mb-0"
                        style={{
                          background: active
                            ? "var(--accent-soft)"
                            : "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                          color: "var(--input-text)",
                        }}
                        aria-pressed={active}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: “лист выбора” в модалке (удобно для маленького экрана) */}
      {/*
        ВАЖНО: модалка рендерится ТОЛЬКО на mobile.
        Нельзя просто спрятать её через `sm:hidden`, потому что Portal-обёртка
        (fixed inset-0) всё равно существует в DOM и может перекрывать страницу,
        ломая клики/фокус/скролл на desktop.
      */}
      {!isDesktop && openMenu && (
        <ModalPortal
          onClose={() => setOpenMenu(null)}
          backdropClassName="bg-slate-900/45 backdrop-blur-sm"
        >
          <div
            className="rounded-2xl w-full p-5 max-h-[85vh] overflow-hidden"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--shadow-hover)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={
              openMenu === "category" ? "Выбор категории" : "Выбор сортировки"
            }
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3
                className="text-[15px] font-semibold"
                style={{ color: "var(--color-grey-800)" }}
              >
                {openMenu === "category" ? "Категории" : "Сортировка"}
              </h3>
              <button
                type="button"
                onClick={() => setOpenMenu(null)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                Закрыть
              </button>
            </div>

            {/*
              Список опций:
              - max-height ограничиваем, чтобы на маленьких экранах список не “выпирал” за пределы
              - overflow-y-auto даёт прокрутку
              - active пункт выделяем accent-soft (это токен, он одинаково смотрится в light/dark)
            */}
            <div className="overflow-y-auto pr-1 max-h-[70vh]">
              {openMenu === "category" ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onCategoryChange("");
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl"
                    style={{
                      background:
                        selectedCategory === ""
                          ? "var(--accent-soft)"
                          : "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--input-text)",
                    }}
                    aria-pressed={selectedCategory === ""}
                  >
                    Все категории
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onCategoryChange(cat.id);
                        setOpenMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl"
                      style={{
                        background:
                          selectedCategory === cat.id
                            ? "var(--accent-soft)"
                            : "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--input-text)",
                      }}
                      aria-pressed={selectedCategory === cat.id}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sortOptions.map((o) => {
                    const active = `${sortBy}-${sortOrder}` === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          const [field, direction] = o.value.split("-");
                          onSortChange(field, direction);
                          setOpenMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl"
                        style={{
                          background: active
                            ? "var(--accent-soft)"
                            : "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                          color: "var(--input-text)",
                        }}
                        aria-pressed={active}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
