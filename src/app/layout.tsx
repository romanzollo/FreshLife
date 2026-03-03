import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Подключаем шрифты через next/font, чтобы получить:
// - автоматическую оптимизацию и подгрузку;
// - CSS‑переменные, которые затем используем в Tailwind и глобальных стилях.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Базовые метаданные приложения.
// При развитии проекта сюда можно добавить Open Graph и другие SEO‑поля.
export const metadata: Metadata = {
  title: "Ozon Fresh — Доставка продуктов",
  description: "Веб-приложение доставки продуктов питания",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
        suppressHydrationWarning
      >
        {/* Общий для всего приложения хедер с навигацией */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/50 shadow-(--shadow-soft)">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors tracking-tight"
            >
              🛒 Ozon Fresh
            </Link>
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

        {/* Основной контейнер под страницы (главная и админ‑панель) */}
        <main className="container mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
