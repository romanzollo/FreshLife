/**
 * Root Layout — корневой макет приложения.
 *
 * В Next.js App Router layout.tsx оборачивает все дочерние страницы.
 * Этот файл рендерится на сервере (нет 'use client'), поэтому:
 * - подходит для метаданных SEO (export const metadata)
 * - подходит для загрузки шрифтов (next/font)
 * - НЕ подходит для хуков useState/useEffect
 *
 * Структура страницы:
 *   <html>
 *     <head>  ← инлайн-скрипт защиты от FOUC (flash of unstyled content)
 *     <body>
 *       <ThemeProvider>   ← клиентский провайдер темы (светлая / тёмная)
 *         <header>        ← навигация + кнопка переключения темы (sticky)
 *         <main>          ← контент страницы (сюда попадает children)
 *         <Toaster>       ← всплывающие уведомления (react-hot-toast)
 *         <ScrollToTop>   ← плавающая кнопка "↑" (появляется после 400px скролла)
 *       </ThemeProvider>
 *     </body>
 *   </html>
 */

import { Toaster } from 'react-hot-toast';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NavLinks } from '@/components/NavLinks';
import { ScrollToTop } from '@/components/ScrollToTop';
import './globals.css';
import '@/styles/toaster.css';

// ─────────────────────────────────────────────────────────────────────────────
// Шрифты
// ─────────────────────────────────────────────────────────────────────────────

// next/font автоматически скачивает шрифт во время сборки и встраивает его
// через CSS-переменную. Это даёт нулевые сдвиги макета (CLS = 0) и исключает
// внешние запросы к Google Fonts в браузере.
const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

// ─────────────────────────────────────────────────────────────────────────────
// SEO-метаданные
// ─────────────────────────────────────────────────────────────────────────────

// Next.js автоматически вставляет эти данные в <head> страниц.
// Дочерние layout.tsx и page.tsx могут переопределять отдельные поля.
export const metadata: Metadata = {
    title: 'FreshLife — Доставка продуктов',
    description: 'Веб-приложение доставки продуктов питания',
};

// ─────────────────────────────────────────────────────────────────────────────
// Инлайн-скрипт защиты от FOUC (Flash Of Unstyled Content)
// ─────────────────────────────────────────────────────────────────────────────

/*
  Проблема: ThemeProvider (клиент) читает localStorage при монтировании.
  До первого рендера React страница может промелькнуть со светлой темой,
  даже если пользователь выбрал тёмную. Это называется FOUC.

  Решение: синхронный скрипт в <head>, который запускается ДО первого рендера
  и сразу ставит нужный класс (.light-mode / .dark-mode) на <html>.
  К моменту отрисовки пикселей CSS уже содержит правильные переменные.

  dangerouslySetInnerHTML используется, потому что нет другого способа вставить
  инлайн-скрипт в Next.js без defer/async (которые запустятся слишком поздно).
*/
const FOUC_PREVENTION_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Приоритет: сохранённое → системное предпочтение → светлая по умолчанию
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.add(theme + '-mode');
  } catch (e) {
    // Если localStorage недоступен (например, приватный режим Safari) —
    // ставим светлую тему по умолчанию
    document.documentElement.classList.add('light-mode');
  }
})();
`;

// ─────────────────────────────────────────────────────────────────────────────
// Компонент макета
// ─────────────────────────────────────────────────────────────────────────────

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // lang="ru" важен для доступности (screen reader произносит текст правильно)
        // suppressHydrationWarning подавляет предупреждение о несоответствии HTML:
        // инлайн-скрипт добавляет класс темы ДО гидрации, поэтому серверный HTML
        // (<html>) и клиентский (<html class="light-mode">) будут различаться.
        <html lang="ru" suppressHydrationWarning>
            <head>
                {/*
          Скрипт без defer/async — выполняется синхронно, блокируя рендер.
          Это единственный случай, когда блокирующий скрипт оправдан:
          он предотвращает мелькание темы (FOUC), занимает < 1 мс.
        */}
                <script
                    dangerouslySetInnerHTML={{ __html: FOUC_PREVENTION_SCRIPT }}
                />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
                suppressHydrationWarning
            >
                {/*
          ThemeProvider — клиентский провайдер контекста темы.
          Оборачивает всё содержимое <body>, чтобы любой компонент внутри
          мог вызвать useTheme() и получить текущую тему / переключатель.
          ThemeToggle в header использует именно этот контекст.
        */}
                <ThemeProvider>
                    {/*
            Sticky-хедер: остаётся видимым при прокрутке страницы.
            z-40 — поверх большинства контента, но ниже модальных окон (z-[9999]).
            Эффект glassmorphism: var(--header-bg) + backdrop-blur-xl.
            Цвета шапки берутся из CSS-переменных, которые автоматически
            меняются при смене темы (не нужны dark:-классы Tailwind).
          */}
                    <header
                        className="sticky top-0 z-40 backdrop-blur-xl border-b shadow-(--shadow-soft)"
                        style={{
                            background: 'var(--header-bg)',
                            borderColor: 'var(--header-border)',
                        }}
                    >
                        {/*
                            Трёхколонная раскладка шапки:
                            [Логотип] [Навигация по центру] [ThemeToggle]

                            Использует justify-between для того, чтобы логотип
                            был строго слева, а ThemeToggle — строго справа.
                            Навигация (flex-1 + justify-center) занимает всё
                            пространство между ними и центрирует ссылки.

                            Адаптивность:
                            - gap-2 sm:gap-4 — уменьшаем отступы на мобильных
                            - NavLinks сам сокращает подписи на мобильных
                        */}
                        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between gap-2 sm:gap-4">

                            {/* Логотип + название — ссылка на главную страницу */}
                            <Link
                                href="/"
                                className="shrink-0 flex items-center gap-2 transition-opacity hover:opacity-80"
                                aria-label="FreshLife — на главную"
                            >
                                <Image
                                    src="/logo.png"
                                    alt=""
                                    width={120}
                                    height={44}
                                    priority
                                    className="h-8 sm:h-10 w-auto object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-0 dark:invert"
                                />
                                <span className="text-lg sm:text-xl font-bold tracking-tight leading-none select-none">
                                    <span style={{ color: 'var(--color-grey-800)' }}>Fresh</span>
                                    <span style={{ color: 'var(--color-green-700)' }}>Life</span>
                                </span>
                            </Link>

                            {/*
                                Основная навигация.

                                flex-1 — занимает всё доступное пространство между лого и ThemeToggle.
                                justify-center — центрирует ссылки внутри этого пространства.
                                Ссылки-пилюли с активной подсветкой рендерит NavLinks (клиентский компонент),
                                который использует usePathname() для определения текущего маршрута.
                            */}
                            <nav className="flex flex-1 items-center justify-center gap-1 sm:gap-2">
                                <NavLinks />
                            </nav>

                            {/*
                                ThemeToggle — кнопка переключения светлой / тёмной темы.
                                Клиентский компонент; использует useTheme() из ThemeContext,
                                который предоставляется ThemeProvider-обёрткой выше.
                                flex-shrink-0 предотвращает сжатие кнопки на узких экранах.
                            */}
                            <div className="shrink-0">
                                <ThemeToggle />
                            </div>
                        </div>
                    </header>

                    {/*
            Основная область контента страницы.
            container mx-auto ограничивает ширину по breakpoint-ам Tailwind
            и центрирует содержимое на широких экранах.
          */}
                    <main className="container mx-auto px-4 py-10">
                        {children}
                    </main>

                    {/*
            Toaster — контейнер для всплывающих уведомлений react-hot-toast.
            Рендерится через портал за пределами дерева компонентов.
            position здесь — дефолт для новых тостов; toaster.css переопределяет
            фактическую позицию контейнера через CSS.

            Стили тостов используют CSS-переменные напрямую, поэтому они
            автоматически адаптируются к текущей теме без JavaScript.
          */}
                    <Toaster
                        position="top-center"
                        toastOptions={{
                            duration: 3000,
                            success: { duration: 3000 },
                            error: { duration: 5000 }, // Ошибки показываем дольше
                            style: {
                                // CSS-переменные работают в inline-стилях: браузер
                                // подставит актуальные значения для текущей темы.
                                background: 'var(--color-grey-100)',
                                color: 'var(--color-grey-800)',
                                border: '1px solid var(--color-grey-200)',
                                minWidth: '400px',
                                maxWidth: '700px',
                                whiteSpace: 'nowrap',
                            },
                        }}
                    />

                    {/*
                        ScrollToTop — глобальная плавающая кнопка «↑».

                        Размещена здесь (в layout), а не на отдельных страницах,
                        потому что нужна на всех маршрутах: каталог, admin и любых
                        будущих страницах.

                        Позиция: bottom-6 right-6 на всех экранах.
                        FAB на /admin удалён — кнопка "+" там теперь всегда
                        в шапке страницы, поэтому перекрытий нет.

                        Логика связки на /admin:
                          Пользователь листает список → нажимает "↑" →
                          оказывается у кнопки "+ Добавить товар" в верху страницы.
                    */}
                    <ScrollToTop />
                </ThemeProvider>
            </body>
        </html>
    );
}
