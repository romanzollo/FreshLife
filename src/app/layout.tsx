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
 *     <body>
 *       <header>  ← навигация (sticky, всегда видна)
 *       <main>    ← контент страницы (сюда попадает children)
 *       <Toaster> ← всплывающие уведомления (react-hot-toast)
 *     </body>
 *   </html>
 */

import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import "@/styles/toaster.css";

// ─────────────────────────────────────────────────────────────────────────────
// Шрифты
// ─────────────────────────────────────────────────────────────────────────────

// next/font автоматически скачивает шрифт во время сборки и встраивает его
// через CSS-переменную. Это даёт нулевые сдвиги макета (CLS = 0) и исключает
// внешние запросы к Google Fonts в браузере.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ─────────────────────────────────────────────────────────────────────────────
// SEO-метаданные
// ─────────────────────────────────────────────────────────────────────────────

// Next.js автоматически вставляет эти данные в <head> страниц.
// Дочерние layout.tsx и page.tsx могут переопределять отдельные поля.
export const metadata: Metadata = {
  title: "Ozon Fresh — Доставка продуктов",
  description: "Веб-приложение доставки продуктов питания",
};

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
    // suppressHydrationWarning подавляет предупреждение о несоответствии
    // HTML с сервера и клиента (может возникать из-за браузерных расширений)
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
        suppressHydrationWarning
      >
        {/*
          Sticky-хедер: остаётся видимым при прокрутке страницы.
          z-40 — поверх большинства контента, но ниже модальных окон (z-[9999]).
          Эффект glassmorphism: bg-white/80 + backdrop-blur-xl.
        */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/50 shadow-(--shadow-soft)">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            {/* Логотип — ссылка на главную страницу */}
            <Link
              href="/"
              className="text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors tracking-tight"
            >
              🛒 Ozon Fresh
            </Link>

            {/* Основная навигация */}
            <nav className="flex gap-8">
              <Link
                href="/"
                className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors"
              >
                Каталог
              </Link>
              <Link
                href="/admin"
                className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors"
              >
                Управление товарами
              </Link>
            </nav>
          </div>
        </header>

        {/*
          Основная область контента страницы.
          container mx-auto ограничивает ширину по breakpoint-ам Tailwind
          и центрирует содержимое на широких экранах.
        */}
        <main className="container mx-auto px-4 py-10">{children}</main>

        {/*
          Toaster — контейнер для всплывающих уведомлений react-hot-toast.
          Рендерится через портал за пределами дерева компонентов.
          position здесь — дефолт для новых тостов; toaster.css переопределяет
          фактическую позицию контейнера через CSS.
        */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            success: { duration: 3000 },
            error: { duration: 5000 }, // Ошибки показываем дольше
            style: {
              background: "rgba(30, 41, 59, 0.98)", // slate-800 с прозрачностью
              color: "#fff",
              minWidth: "400px",
              maxWidth: "700px",
              whiteSpace: "nowrap",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
      </body>
    </html>
  );
}
