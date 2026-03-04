/**
 * Pagination — универсальный адаптивный компонент пагинации.
 *
 * Используется на странице каталога (/page.tsx) и на странице управления
 * товарами (/admin/page.tsx). Оба места передают одинаковые пропсы.
 *
 * ── Поведение по размерам экрана ────────────────────────────────────────────
 *
 *   Мобильные (< sm, < 640px):
 *     Компактный вид: [←] [X / Y] [→]
 *     Экономит горизонтальное пространство — номера страниц скрыты.
 *
 *   Планшеты и десктопы (≥ sm, ≥ 640px):
 *     Полный вид:  [← Назад] [1] [2] [...] [5] [6] [7] [...] [12] [Далее →]
 *     Числовые кнопки с умным "..." для больших диапазонов.
 *
 * ── Стилистика ──────────────────────────────────────────────────────────────
 *
 *   Активная страница:
 *     background: --color-brand-600 (Indigo-600, #4f46e5)
 *     color:      #ffffff
 *     Соответствует стилю кнопки "Добавить товар" и кнопки "Сохранить" в форме.
 *
 *   Неактивные кнопки:
 *     background: --card-bg  (белый / тёмно-серый в тёмной теме)
 *     border:     --card-border
 *     Плавный hover: --color-grey-100
 *
 * ── Доступность (a11y) ──────────────────────────────────────────────────────
 *
 *   - <nav aria-label="Навигация по страницам"> — семантика области
 *   - aria-label="Страница N" — на каждой кнопке
 *   - aria-current="page"     — на активной кнопке
 *   - aria-label="Предыдущая/Следующая страница" — на стрелках
 *   - aria-hidden="true"      — на многоточии (не важно для скринридера)
 *   - disabled на кнопках стрелок при первой / последней странице
 */
'use client';

/** Пропсы компонента пагинации */
interface PaginationProps {
    /** Текущая страница (начинается с 1) */
    currentPage: number;
    /** Общее количество страниц */
    totalPages: number;
    /** Функция смены страницы, вызывается с номером целевой страницы */
    onPageChange: (page: number) => void;
}

/**
 * Вычисляет массив элементов для отображения в ряду пагинации.
 *
 * Алгоритм:
 *   1. Если страниц ≤ 7 — показываем все номера (без многоточий).
 *   2. Если больше: всегда показываем первую и последнюю страницы,
 *      плюс диапазон ±delta вокруг текущей. Разрывы закрываем "...".
 *
 * @param currentPage  — текущая активная страница (1-based)
 * @param totalPages   — всего страниц
 * @returns массив чисел (номера страниц) и строк '...' (многоточие)
 *
 * @example
 *   getPageNumbers(1,  5)  → [1, 2, 3, 4, 5]
 *   getPageNumbers(5, 12)  → [1, '...', 3, 4, 5, 6, 7, '...', 12]
 *   getPageNumbers(1, 12)  → [1, 2, 3, 4, 5, '...', 12]
 *   getPageNumbers(12,12)  → [1, '...', 8, 9, 10, 11, 12]
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
    // При малом количестве страниц показываем все номера без сокращений
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];

    /**
     * delta — количество страниц, отображаемых по обе стороны от текущей.
     * Значение 2 даёт диапазон [current-2 ... current+2] = 5 кнопок в центре.
     */
    const delta = 2;

    // Первая страница всегда отображается
    pages.push(1);

    // Вычисляем границы центрального диапазона (не выходим за пределы)
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    // Многоточие между первой страницей и началом диапазона
    if (rangeStart > 2) {
        pages.push('...');
    }

    // Центральный диапазон страниц
    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
    }

    // Многоточие между концом диапазона и последней страницей
    if (rangeEnd < totalPages - 1) {
        pages.push('...');
    }

    // Последняя страница всегда отображается
    pages.push(totalPages);

    return pages;
}

/**
 * Базовые инлайн-стили для кнопок навигации "Назад" / "Далее".
 * Вынесены за пределы компонента — константа не пересоздаётся при рендере.
 */
const navButtonStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    color: 'var(--color-grey-700)',
    border: '1px solid var(--card-border)',
    boxShadow: 'var(--shadow-soft)',
};

/**
 * Стили активной (текущей) кнопки страницы.
 * Использует брендовый Indigo — тот же цвет, что у кнопок "Добавить", "Сохранить".
 */
const activePageStyle: React.CSSProperties = {
    background: 'var(--color-brand-600)',
    color: '#ffffff',
    border: '1px solid var(--color-brand-600)',
    boxShadow: 'var(--shadow-soft)',
};

/** Стили неактивной кнопки страницы */
const inactivePageStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    color: 'var(--color-grey-700)',
    border: '1px solid var(--card-border)',
};

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    // Не рендерим пагинацию если страниц 0 или 1 — нечего листать
    if (totalPages <= 1) return null;

    const pages = getPageNumbers(currentPage, totalPages);

    // Флаги доступности кнопок навигации
    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;

    return (
        <nav
            aria-label="Навигация по страницам"
            className="flex items-center justify-center gap-1.5 mt-10 flex-wrap select-none"
        >
            {/* ── Кнопка "Назад" ──────────────────────────────────────────────── */}
            <button
                onClick={() => canPrev && onPageChange(currentPage - 1)}
                disabled={!canPrev}
                aria-label="Предыдущая страница"
                className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium',
                    'transition-all duration-200',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'hover:scale-[1.02] active:scale-[0.98]',
                ].join(' ')}
                style={navButtonStyle}
                onMouseEnter={(e) => {
                    if (canPrev) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            'var(--color-grey-100)';
                    }
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--card-bg)';
                }}
            >
                {/* Иконка стрелки всегда видна */}
                ←
                {/* Текст "Назад" скрыт на мобильных (< sm), виден на планшетах и выше */}
                <span className="hidden sm:inline">Назад</span>
            </button>

            {/* ── Мобильная версия: "X / Y" ───────────────────────────────────── */}
            {/*
                Компактный текстовый индикатор вместо номеров страниц.
                Отображается только на маленьких экранах (< sm = < 640px).
                На sm+ скрывается и уступает место числовым кнопкам.

                Используем thinsp (&thinsp;) для лёгкого отступа вокруг слеша.
            */}
            <span
                className="flex sm:hidden items-center px-4 py-2 text-sm font-medium rounded-xl"
                style={{
                    color: 'var(--color-grey-600)',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                }}
            >
                {currentPage}&thinsp;/&thinsp;{totalPages}
            </span>

            {/* ── Числовые кнопки страниц (планшет и десктоп, ≥ sm) ───────────── */}
            {/*
                Скрыто на мобильных (hidden), появляется на sm+ (sm:flex).
                Содержит кнопки номеров страниц и элементы многоточия.
            */}
            <div className="hidden sm:flex items-center gap-1.5">
                {pages.map((page, index) =>
                    page === '...' ? (
                        /*
                            Многоточие — визуальный разделитель, не является кнопкой.
                            aria-hidden скрывает его от скринридеров (нерелевантный контент).
                            key включает индекс, т.к. многоточий может быть два.
                        */
                        <span
                            key={`ellipsis-${index}`}
                            className="w-9 h-9 flex items-center justify-center text-sm font-medium"
                            style={{ color: 'var(--color-grey-400)' }}
                            aria-hidden="true"
                        >
                            …
                        </span>
                    ) : (
                        /* Кнопка конкретной страницы */
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            aria-label={`Страница ${page}`}
                            /* aria-current="page" — стандартный атрибут доступности */
                            aria-current={currentPage === page ? 'page' : undefined}
                            className={[
                                'w-9 h-9 flex items-center justify-center',
                                'rounded-xl text-sm font-medium',
                                'transition-all duration-200',
                                'hover:scale-[1.05] active:scale-[0.95]',
                            ].join(' ')}
                            style={currentPage === page ? activePageStyle : inactivePageStyle}
                            onMouseEnter={(e) => {
                                /* Hover-эффект только для неактивных страниц */
                                if (currentPage !== page) {
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                        'var(--color-grey-100)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage !== page) {
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                        'var(--card-bg)';
                                }
                            }}
                        >
                            {page}
                        </button>
                    )
                )}
            </div>

            {/* ── Кнопка "Далее" ──────────────────────────────────────────────── */}
            <button
                onClick={() => canNext && onPageChange(currentPage + 1)}
                disabled={!canNext}
                aria-label="Следующая страница"
                className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium',
                    'transition-all duration-200',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'hover:scale-[1.02] active:scale-[0.98]',
                ].join(' ')}
                style={navButtonStyle}
                onMouseEnter={(e) => {
                    if (canNext) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            'var(--color-grey-100)';
                    }
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--card-bg)';
                }}
            >
                {/* Текст "Далее" скрыт на мобильных (< sm), виден на планшетах и выше */}
                <span className="hidden sm:inline">Далее</span>
                →
            </button>
        </nav>
    );
}
