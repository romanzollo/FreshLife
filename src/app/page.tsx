/**
 * Главная страница — витрина каталога продуктов.
 *
 * Страница является клиентским компонентом ('use client'), потому что:
 * - управляет локальным состоянием фильтров и списка товаров
 * - выполняет fetch к API при изменении фильтров (useEffect/useCallback)
 * - управляет состоянием пагинации (currentPage)
 *
 * Поток данных:
 *   Пользователь меняет фильтр → обновляется state → срабатывает useEffect →
 *   вызывается fetchProducts → обновляется список товаров → ре-рендер →
 *   пагинация нарезает products на страницы → рендерится текущая страница
 *
 * Пагинация:
 *   Выполняется на стороне клиента (slice массива) — все товары уже загружены,
 *   разбиение на страницы лишь ограничивает количество DOM-узлов на экране.
 *   При смене фильтра currentPage автоматически сбрасывается в 1.
 *
 * Компоненты:
 *   ProductFilters — панель фильтров (категория, поиск, сортировка)
 *   ProductCard    — карточка одного товара
 *   Pagination     — адаптивная пагинация
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { Pagination } from "@/components/Pagination";
import type { Product, Category } from "@/types";

/**
 * Количество товаров на одной странице.
 *
 * Выбрано значение 12 из соображений UX:
 * - Делится на 2, 3, 4 и 6 — заполняет все варианты адаптивной сетки целыми рядами:
 *     xl (5 колонок) → 3 ряда (последний неполный, что нормально)
 *     lg (4 колонки) → 3 полных ряда
 *     md (3 колонки) → 4 полных ряда
 *     sm (2 колонки) → 6 рядов (комфортно на планшете)
 *     xs (1 колонка) → 12 карточек (чуть длинно, но с пагинацией не скучно листать)
 * - Стандарт e-commerce: Amazon, Wildberries, Ozon используют кратные 12 значения
 */
const ITEMS_PER_PAGE = 12;

export default function Home() {
  // ── Данные ────────────────────────────────────────────────────────────────
  /** Полный список товаров, соответствующих текущим фильтрам */
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // ── Состояния UI ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Состояния фильтров ────────────────────────────────────────────────────
  /** Пустая строка = "все категории" (фильтр не применяется) */
  const [categoryId, setCategoryId] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [search, setSearch] = useState("");

  // ── Состояние пагинации ───────────────────────────────────────────────────
  /** Текущая страница (1-based). Сбрасывается при смене фильтров. */
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Загружает товары с учётом текущих фильтров.
   *
   * Обёрнут в useCallback, чтобы функция не пересоздавалась на каждый рендер.
   * Зависимости [categoryId, sortBy, sortOrder, search] — функция обновляется
   * только при изменении фильтров, что корректно запускает useEffect ниже.
   */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Строим строку запроса только из ненулевых параметров
      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (search) params.set("search", search);

      const res = await fetch(`/api/products?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Не удалось загрузить товары");
      }

      const data = await res.json();
      // Защита от неожиданного формата ответа: всегда работаем с массивом
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setError("Не удалось загрузить товары. Попробуйте обновить страницу.");
    } finally {
      // finally гарантирует сброс loading даже при ошибке
      setLoading(false);
    }
  }, [categoryId, sortBy, sortOrder, search]);

  /**
   * Загружает список категорий один раз при монтировании страницы.
   * Категории не меняются динамически, поэтому нет смысла перезагружать их.
   * Пустой массив зависимостей [] = эффект запускается только при монтировании.
   */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Ошибка загрузки категорий");
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        // Ошибка категорий не критична — каталог работает без фильтра
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  /**
   * Перезагружает товары при любом изменении фильтров.
   * Так как fetchProducts создан через useCallback с зависимостями,
   * этот эффект сработает при изменении categoryId / sortBy / sortOrder / search.
   */
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /**
   * Сбрасывает пагинацию на первую страницу при изменении любого фильтра.
   *
   * Почему отдельный эффект, а не внутри fetchProducts:
   * - fetchProducts уже делает своё дело (загрузка данных), смешивать с UI-логикой плохо
   * - При последующих вызовах fetchProducts (например, обновление списка) сброс не нужен
   *
   * Зависимости совпадают с зависимостями fetchProducts — сброс происходит синхронно
   * с запросом новых данных, поэтому пользователь никогда не видит "пустую" страницу.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryId, sortBy, sortOrder, search]);

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
   * Диапазон порядковых номеров товаров для строки "Показано X–Y из Z".
   * Помогает пользователю понять, где он находится в общем списке.
   */
  const firstItem = products.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * ITEMS_PER_PAGE, products.length);

  /**
   * Обработчик смены страницы.
   *
   * После смены страницы плавно прокручиваем в начало страницы, чтобы
   * пользователь видел новые товары, а не оставался внизу.
   * Это стандартное UX-поведение в e-commerce (Ozon, Wildberries).
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    // animate-fade-in — кастомная анимация из globals.css (плавное появление страницы)
    <div className="animate-fade-in">
      <h1
        className="text-3xl font-bold mb-8 tracking-tight"
        style={{ color: 'var(--color-grey-800)' }}
      >
        Каталог продуктов
      </h1>

      {/* Панель фильтров: получает текущее состояние и колбэки для обновления */}
      <ProductFilters
        categories={categories}
        selectedCategory={categoryId}
        sortBy={sortBy}
        sortOrder={sortOrder}
        search={search}
        onCategoryChange={setCategoryId}
        onSortChange={(s, o) => {
          setSortBy(s);
          setSortOrder(o);
        }}
        onSearchChange={setSearch}
      />

      {/* Область результатов: три взаимоисключающих состояния */}
      {loading ? (
        // Состояние загрузки
        <div
          className="text-center py-16 text-lg"
          style={{ color: 'var(--color-grey-500)' }}
        >
          <span className="inline-block animate-pulse">Загрузка...</span>
        </div>
      ) : error ? (
        // Состояние ошибки — использует переменные красного цвета из дизайн-системы
        <div
          className="text-center py-16 rounded-2xl"
          style={{
            color: 'var(--color-red-700)',
            background: 'var(--color-red-100)',
            border: '1px solid var(--color-red-700)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          {error}
        </div>
      ) : products.length === 0 ? (
        // Пустой результат (фильтр не нашёл товаров)
        <div
          className="text-center py-16 rounded-2xl"
          style={{
            color: 'var(--color-grey-500)',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          Товары не найдены
        </div>
      ) : (
        <>
          {/*
            Строка-счётчик "Показано X–Y из Z товаров".

            Помогает пользователю понять своё положение в общем каталоге.
            Отображается только когда есть несколько страниц (totalPages > 1)
            — при малом количестве товаров счётчик избыточен.
          */}
          {totalPages > 1 && (
            <div
              className="flex justify-between items-center mb-4 text-sm"
              style={{ color: 'var(--color-grey-500)' }}
            >
              {/* Левая часть: диапазон товаров */}
              <span>
                Показано{' '}
                <span style={{ color: 'var(--color-grey-700)', fontWeight: 500 }}>
                  {firstItem}–{lastItem}
                </span>{' '}
                из{' '}
                <span style={{ color: 'var(--color-grey-700)', fontWeight: 500 }}>
                  {products.length}
                </span>{' '}
                товаров
              </span>

              {/* Правая часть: номер страницы */}
              <span className="hidden sm:block">
                Страница{' '}
                <span style={{ color: 'var(--color-grey-700)', fontWeight: 500 }}>
                  {currentPage}
                </span>{' '}
                из{' '}
                <span style={{ color: 'var(--color-grey-700)', fontWeight: 500 }}>
                  {totalPages}
                </span>
              </span>
            </div>
          )}

          {/*
            Адаптивная сетка товаров.

            Breakpoints и количество колонок:
              xs  (< 640px)  : 1 колонка  — телефоны в портретной ориентации
              sm  (≥ 640px)  : 2 колонки  — телефоны в альбомной / маленькие планшеты
              md  (≥ 768px)  : 3 колонки  — планшеты
              lg  (≥ 1024px) : 4 колонки  — ноутбуки
              xl  (≥ 1280px) : 5 колонок  — широкие экраны

            При ITEMS_PER_PAGE = 12:
              lg (4 кол.) → 3 полных ряда — идеальное заполнение
              md (3 кол.) → 4 полных ряда — хорошо
              sm (2 кол.) → 6 рядов       — комфортно

            Рендерим paginatedProducts (срез текущей страницы), а не весь массив.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {paginatedProducts.map((product) => (
              // key по уникальному id — обязателен для эффективного обновления DOM
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/*
            Компонент пагинации.

            Передаём totalPages (вычислен из products.length) и currentPage.
            handlePageChange сбрасывает страницу и скроллит к началу.

            Pagination сам не рендерится при totalPages <= 1 — проверять здесь не нужно.
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
