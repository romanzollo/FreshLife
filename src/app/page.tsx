/**
 * Главная страница — витрина каталога продуктов.
 *
 * АРХИТЕКТУРА (после декомпозиции):
 *
 *   page.tsx  ←  useFilters  (управляет состоянием фильтров)
 *             ←  useProducts (загружает товары из API с debounce-поиском)
 *
 *   Компонент намеренно минимален — он только:
 *     1. Подключает хуки и передаёт им параметры
 *     2. Вычисляет данные пагинации (slice массива)
 *     3. Рендерит UI из готовых дочерних компонентов
 *
 *   Вся логика работы с состоянием вынесена в useFilters,
 *   вся логика работы с API — в useProducts.
 *
 * ПОТОК ДАННЫХ:
 *   Пользователь → useFilters (обновляет фильтры, сбрасывает страницу)
 *               → useProducts (debounce → fetch → массив товаров)
 *               → компонент нарезает массив на страницы и рендерит
 *
 * ПАГИНАЦИЯ:
 *   Клиентская: все товары уже загружены, slice() ограничивает DOM-узлы.
 *   При смене фильтра useFilters автоматически сбрасывает currentPage в 1.
 */
"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { Pagination } from "@/components/Pagination";
import { useFilters } from "@/hooks/useFilters";
import { useProducts } from "@/hooks/useProducts";
import type { Category } from "@/types";

/**
 * Количество товаров на одной странице.
 *
 * Выбрано значение 15, потому что сетка на широких экранах (xl) содержит 5 колонок.
 * 15 = 5 × 3 — три полных ряда без «хвоста» в конце страницы.
 *
 * Сравнение вариантов при xl=5 кол.:
 *   12 товаров → 2 полных ряда + 1 неполный (2 карточки) — выглядит некрасиво
 *   15 товаров → ровно 3 полных ряда — выглядит аккуратно
 *
 * При totalPages === 1 компонент <Pagination> сам возвращает null и не рендерится,
 * поэтому пагинация автоматически скрывается, когда товаров не больше ITEMS_PER_PAGE.
 *
 * Аналогичная логика: Wildberries, Ozon, Amazon — все используют кратное
 * числу колонок количество товаров на странице (20, 24, 25, 30 и т.д.).
 */
const ITEMS_PER_PAGE = 15;

export default function Home() {
  // ── Загрузка категорий ─────────────────────────────────────────────────────
  // Категории загружаются один раз — они не меняются динамически.
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Ошибка загрузки категорий");
        const data: unknown = await res.json();
        // Защита: если API вернёт не массив — не падаем, просто скрываем фильтр
        setCategories(Array.isArray(data) ? (data as Category[]) : []);
      } catch (err) {
        console.error(err);
        // Ошибка категорий не критична — каталог работает без фильтра по категории
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  // ── Состояние фильтров ─────────────────────────────────────────────────────
  // useFilters хранит все параметры фильтрации и пагинации.
  // При изменении категории / сортировки / поиска автоматически сбрасывает
  // currentPage в 1, чтобы пользователь видел результаты с начала.
  const {
    categoryId,
    setCategoryId,
    sortBy,
    sortOrder,
    handleSortChange,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
  } = useFilters();

  // ── Загрузка товаров ───────────────────────────────────────────────────────
  // useProducts принимает параметры фильтров и возвращает загруженные товары.
  // Поиск внутри хука debounce'd: запрос уходит только после паузы 300 мс,
  // а не на каждое нажатие клавиши.
  const { products, loading, error } = useProducts({
    categoryId,
    sortBy,
    sortOrder,
    search,
  });

  // ── Вычисляемые значения пагинации ────────────────────────────────────────

  /**
   * Общее количество страниц.
   * Math.ceil гарантирует, что последняя неполная страница тоже считается.
   * Пример: 25 товаров / 12 = 3 страницы (3-я содержит 1 товар).
   */
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  /**
   * Срез товаров для текущей страницы.
   * Клиентская пагинация: весь массив загружен, просто берём нужный фрагмент.
   */
  const paginatedProducts = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /**
   * Диапазон порядковых номеров для строки "Показано X–Y из Z".
   * firstItem: номер первого товара на странице (1-based)
   * lastItem:  номер последнего товара на странице
   */
  const firstItem =
    products.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * ITEMS_PER_PAGE, products.length);

  /**
   * Обработчик смены страницы.
   * После смены прокручиваем в начало — стандартное UX-поведение e-commerce.
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Рендер ────────────────────────────────────────────────────────────────

  return (
    // animate-fade-in — кастомная анимация из globals.css (плавное появление)
    <div className="animate-fade-in">
      <h1
        className="text-3xl font-bold mb-8 tracking-tight"
        style={{ color: "var(--color-grey-800)" }}
      >
        Каталог продуктов
      </h1>

      {/*
        Панель фильтров: только принимает текущее состояние и колбэки.
        Сам компонент "тупой" — никакой логики, только UI.
      */}
      <ProductFilters
        categories={categories}
        selectedCategory={categoryId}
        sortBy={sortBy}
        sortOrder={sortOrder}
        search={search}
        onCategoryChange={setCategoryId}
        onSortChange={handleSortChange}
        onSearchChange={setSearch}
      />

      {/* Область результатов: три взаимоисключающих состояния */}
      {loading ? (
        // Состояние загрузки — animate-pulse создаёт пульсирующий эффект
        <div
          className="text-center py-16 text-lg"
          style={{ color: "var(--color-grey-500)" }}
        >
          <span className="inline-block animate-pulse">Загрузка...</span>
        </div>
      ) : error ? (
        // Состояние ошибки — использует красные CSS-переменные из дизайн-системы
        <div
          className="text-center py-16 rounded-2xl"
          style={{
            color: "var(--color-red-700)",
            background: "var(--color-red-100)",
            border: "1px solid var(--color-red-700)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {error}
        </div>
      ) : products.length === 0 ? (
        // Пустой результат: фильтр применён, но товаров нет
        <div
          className="text-center py-16 rounded-2xl"
          style={{
            color: "var(--color-grey-500)",
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          Товары не найдены
        </div>
      ) : (
        <>
          {/*
            Счётчик "Показано X–Y из Z товаров".
            Отображается только при нескольких страницах — при одной странице
            счётчик избыточен и захламляет UI.
          */}
          {totalPages > 1 && (
            <div
              className="flex justify-between items-center mb-4 text-sm"
              style={{ color: "var(--color-grey-500)" }}
            >
              {/* Левая часть: диапазон товаров на текущей странице */}
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

              {/* Правая часть: текущая и общая страница (скрыта на мобильных) */}
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

          {/*
            Адаптивная сетка товаров.
            Breakpoints: xs(1 кол.) → sm(2) → md(3) → lg(4) → xl(5).
            Рендерим paginatedProducts (срез страницы), а не весь массив products,
            чтобы не создавать лишние DOM-узлы.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {paginatedProducts.map((product) => (
              // key по уникальному id — обязателен для эффективного diff алгоритма React
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/*
            Компонент пагинации.
            Pagination сам не рендерится при totalPages <= 1, проверять здесь не нужно.
          */}
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
