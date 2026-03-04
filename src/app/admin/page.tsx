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
 *
 * Пагинация:
 *   Выполняется на стороне клиента (slice массива products).
 *   При удалении товара, если текущая страница стала пустой,
 *   автоматически переходим на предыдущую (useEffect с корректировкой).
 *
 * Мобильный UX — адаптивная кнопка добавления:
 *   Кнопка "Добавить товар" остаётся в шапке страницы на всех размерах экрана
 *   и никогда не скрывается. На мобильных отображается только иконка "+"
 *   (текст скрыт), на sm+ — полный текст "+ Добавить товар".
 *
 *   Это даёт пользователю всегда доступный элемент в верхней части страницы,
 *   что оправдывает глобальную кнопку ScrollToTop: нажал "↑" → оказался рядом
 *   с кнопкой добавления.
 *
 * Цвета: все акценты используют брендовую палитру Indigo (--color-brand-*)
 * и CSS-переменные дизайн-системы, адаптирующиеся к текущей теме.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductForm, type ProductFormData } from "@/components/ProductForm";
import { Pagination } from "@/components/Pagination";
import type { Product, Category } from "@/types";
import { ModalPortal } from "@/components/ModalPortal";
import toast from "react-hot-toast";

/**
 * Количество карточек товаров на одной странице в разделе управления.
 *
 * Значение 12 соответствует каталогу для единообразия UX.
 * Сетка здесь на 1 колонку меньше (4 вместо 5 на xl), потому что
 * карточки шире из-за оверлея с кнопками редактирования:
 *   lg (4 кол.) → 3 полных ряда — идеально
 *   md (3 кол.) → 4 ряда
 *   sm (2 кол.) → 6 рядов
 */
const ITEMS_PER_PAGE = 12;

export default function AdminPage() {
  // ── Данные ────────────────────────────────────────────────────────────────
  /** Полный список всех товаров (без фильтрации) */
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

  // ── Состояние пагинации ───────────────────────────────────────────────────
  /** Текущая страница (1-based) */
  const [currentPage, setCurrentPage] = useState(1);

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

  // ── Вычисляемые значения пагинации ────────────────────────────────────────

  /**
   * Общее количество страниц на основе текущего списка товаров.
   * Пересчитывается автоматически при каждом изменении products
   * (добавление, удаление, загрузка).
   */
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  /**
   * Срез товаров для текущей страницы (клиентская пагинация).
   */
  const paginatedProducts = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /**
   * Диапазон порядковых номеров для строки "Показано X–Y из Z".
   */
  const firstItem = products.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * ITEMS_PER_PAGE, products.length);

  /**
   * Корректировка текущей страницы после удаления товаров.
   *
   * Сценарий: пользователь на странице 3 (последней), удаляет последний товар.
   * Страница 3 становится пустой. Без этого эффекта — белый экран.
   * Эффект смотрит: если currentPage > totalPages — переходим на последнюю.
   *
   * Зависимость products.length (а не totalPages): totalPages вычисляется
   * из products.length, поэтому отслеживать products.length достаточно.
   * Добавляем currentPage, чтобы избежать stale closure.
   */
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [products.length, totalPages, currentPage]);

  /**
   * Обработчик смены страницы.
   * Плавно скроллит к началу страницы — стандартное UX-поведение.
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Обработчики CRUD-действий ─────────────────────────────────────────────

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
   *
   * После успешного сохранения перезагружаем список и сбрасываем пагинацию
   * на страницу 1 (новый товар добавляется в конец, но фильтрация и сортировка
   * может изменить порядок — безопаснее вернуть пользователя на начало).
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

      // После добавления нового товара возвращаем на страницу 1,
      // чтобы пользователь видел актуальный первый экран списка
      if (!editingProduct) {
        setCurrentPage(1);
      }

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
   * - При успехе: оптимистично убираем карточку из state (быстро, без рефетча).
   *   Корректировка страницы (если стала пустой) произойдёт через useEffect выше.
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

      // Оптимистичное удаление: убираем из списка без повторного запроса к API.
      // useEffect [products.length] автоматически скорректирует страницу если нужно.
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
      <div className="flex items-center justify-between mb-8 gap-3">
        {/*
          Заголовок адаптируется по размеру:
          - Мобильные (< sm): text-2xl — уменьшен, чтобы вместе с кнопкой
            вписаться в одну строку на узких экранах
          - Планшеты и выше (≥ sm): text-3xl — стандартный размер
        */}
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--color-grey-800)' }}
        >
          Управление товарами
        </h1>

        {/*
          Кнопка "Добавить товар" — видима на всех размерах экрана.

          Адаптивное содержимое:
          - Мобильные (< sm): только иконка "+" — компактно, не переполняет строку
          - Планшеты и выше (≥ sm): полный текст "+ Добавить товар"

          Адаптивные отступы:
          - Мобильные: px-3 py-2 — под иконку (почти квадратная кнопка)
          - Планшеты+: px-5 py-2.5 — под текст

          Почему не скрываем кнопку на мобильных:
          Кнопка в верхней части страницы — основная точка доступа к добавлению.
          Скрывать её нарушает UX: пользователь не видит, как добавить товар,
          если не знает про FAB. Кнопка + ScrollToTop образуют логичную связку:
          нажал "↑" → попал к кнопке добавления.
        */}
        <button
          onClick={handleAdd}
          disabled={loading}
          aria-label="Добавить товар"
          className="flex items-center gap-1.5 shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 text-white rounded-xl font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-brand-600)',
            boxShadow: 'var(--shadow-soft)',
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-700)';
          }}
          onMouseLeave={(e) => {
            if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-600)';
          }}
        >
          {/* Иконка "+" — видна всегда */}
          <span className="text-lg leading-none">+</span>

          {/* Текст — скрыт на мобильных (< sm), виден на планшетах и выше */}
          <span className="hidden sm:inline">Добавить товар</span>
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
          {/*
            Контейнер модалки использует CSS-переменные карточки (--card-bg,
            --card-border), чтобы адаптироваться к текущей теме автоматически.
          */}
          <div
            className="rounded-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--shadow-hover)',
            }}
          >
            <h2
              className="text-xl font-bold mb-5"
              style={{ color: 'var(--color-grey-800)' }}
            >
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
        <div
          className="text-center py-16 text-lg"
          style={{ color: 'var(--color-grey-500)' }}
        >
          <span className="inline-block animate-pulse">
            🔄 Загрузка товаров...
          </span>
        </div>
      ) : products.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{
            color: 'var(--color-grey-500)',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          📦 Нет товаров. Нажмите «Добавить товар» для создания первого.
        </div>
      ) : (
        <>
          {/*
            Строка-счётчик "Показано X–Y из Z товаров".
            Отображается только при наличии нескольких страниц.
          */}
          {totalPages > 1 && (
            <div
              className="flex justify-between items-center mb-4 text-sm"
              style={{ color: 'var(--color-grey-500)' }}
            >
              {/* Диапазон товаров */}
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

              {/* Текущая страница (скрыта на мобильных — пагинация показывает X/Y) */}
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
            Адаптивная сетка карточек.

            Одна колонка меньше, чем в каталоге (нет xl:grid-cols-5),
            потому что карточки шире из-за оверлея с кнопками управления.
            Кнопки редактирования/удаления скрыты (opacity-0) и появляются
            при наведении (group-hover:opacity-100) через класс group на обёртке.

            Рендерим paginatedProducts (срез текущей страницы).
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {paginatedProducts.map((product) => (
              <div key={product.id} className="relative group">
                <ProductCard product={product} />

                {/* Оверлей с кнопками управления, видим только при hover */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  {/*
                    Кнопка "Изменить": брендовый Indigo-600 из дизайн-системы.
                    Соответствует стилю кнопки "Сохранить" в форме.
                  */}
                  <button
                    onClick={() => handleEdit(product)}
                    disabled={deletingId === product.id}
                    className="px-3 py-1.5 text-white text-xs rounded-lg shadow-md transition-all whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'var(--color-brand-600)' }}
                    onMouseEnter={(e) => {
                      if (deletingId !== product.id)
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-700)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-600)';
                    }}
                  >
                    ✏️ Изменить
                  </button>
                  {/*
                    Кнопка "Удалить": деструктивное действие — красный цвет.
                    Используем --color-red-700 из дизайн-системы (b91c1c в обеих темах).
                  */}
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deletingId === product.id || saving}
                    className="px-3 py-1.5 text-white text-xs rounded-lg shadow-md transition-all whitespace-nowrap flex items-center justify-center min-w-[80px] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: '#e11d48' }}
                    onMouseEnter={(e) => {
                      if (deletingId !== product.id && !saving)
                        (e.currentTarget as HTMLButtonElement).style.background = '#be123c';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#e11d48';
                    }}
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

          {/*
            Пагинация под сеткой товаров.

            Pagination сам не рендерится при totalPages <= 1,
            дополнительной проверки здесь не нужно.
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
