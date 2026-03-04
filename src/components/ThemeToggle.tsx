/**
 * ThemeToggle — кнопка переключения светлой / тёмной темы.
 *
 * Читает текущую тему из ThemeContext и переключает её при клике.
 *
 * Иконки:
 *   🌙 (луна)  — показывается в светлой теме (нажми → станет темно)
 *   ☀️ (солнце) — показывается в тёмной теме  (нажми → станет светло)
 *
 * Кнопка использует CSS-переменные напрямую, что позволяет ей автоматически
 * адаптироваться к обеим темам без дополнительных dark:-классов Tailwind.
 */
"use client";

import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    // Подписи для screen readers — важны для доступности (a11y)
    const label =
        theme === "light"
            ? "Переключить на тёмную тему"
            : "Переключить на светлую тему";

    return (
        <button
            onClick={toggleTheme}
            title={label}
            aria-label={label}
            /*
              Стили кнопки написаны через CSS-переменные напрямую (не через
              Tailwind dark:), потому что компонент сам управляет темой
              и должен выглядеть одинаково красиво в обоих состояниях.
              
              w-9 h-9 — компактный квадратный размер
              rounded-lg — скругление из дизайн-системы
              transition-all — плавная анимация hover-эффектов
            */
            className="
                relative w-9 h-9 flex items-center justify-center
                rounded-lg
                bg-[var(--color-grey-100)]
                hover:bg-[var(--color-grey-200)]
                border border-[var(--color-grey-200)]
                hover:border-[var(--color-grey-300)]
                text-[var(--color-grey-600)]
                hover:text-[var(--color-grey-800)]
                shadow-(--shadow-soft)
                transition-all duration-200
                focus:outline-none focus:ring-2
                focus:ring-[var(--accent)] focus:ring-offset-1
                focus:ring-offset-[var(--color-grey-0)]
                cursor-pointer
            "
        >
            {/* aria-hidden скрывает декоративный эмодзи от screen reader-ов */}
            <span className="text-base leading-none select-none" aria-hidden="true">
                {theme === "light" ? "🌙" : "☀️"}
            </span>
        </button>
    );
}
