/**
 * ThemeContext — контекст управления цветовой темой приложения.
 *
 * Реализует хранение предпочтения темы в localStorage и применение
 * CSS-класса (.light-mode / .dark-mode) на корневой элемент <html>.
 * CSS-переменные в globals.css подхватывают нужный класс и меняют цвета.
 *
 * Схема работы:
 *   1. Инлайн-скрипт в <head> (layout.tsx) применяет тему до гидрации
 *      → предотвращает мелькание неверной темы (FOUC).
 *   2. ThemeProvider при монтировании синхронизирует React-стейт
 *      с классом, уже применённым скриптом.
 *   3. toggleTheme переключает класс на <html> и сохраняет выбор в localStorage.
 *
 * Экспортируемые символы:
 *   - ThemeProvider  — провайдер контекста; должен оборачивать всё приложение
 *   - useTheme       — хук для чтения текущей темы и вызова переключения
 *   - Theme          — тип "light" | "dark"
 */
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

/** Доступные темы. */
export type Theme = "light" | "dark";

interface ThemeContextValue {
    /** Текущая активная тема */
    theme: Theme;
    /** Переключает тему между светлой и тёмной */
    toggleTheme: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Контекст
// ─────────────────────────────────────────────────────────────────────────────

// undefined как начальное значение — намеренно: позволяет useTheme() обнаружить
// ошибочное использование за пределами ThemeProvider и выбросить понятное сообщение.
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Применяет CSS-класс темы к корневому элементу <html>.
 * Убирает старый класс перед добавлением нового, чтобы стили не конфликтовали.
 */
function applyThemeClass(theme: Theme): void {
    const root = document.documentElement;
    // Убираем оба класса разом — это идемпотентно и безопасно
    root.classList.remove("light-mode", "dark-mode");
    root.classList.add(`${theme}-mode`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemeProvider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ThemeProvider — провайдер контекста темы.
 *
 * Должен оборачивать всё дерево компонентов (обычно в layout.tsx).
 * Работает в паре с инлайн-скриптом в <head>, который применяет тему
 * до гидрации React, предотвращая FOUC (flash of unstyled content).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // "light" — только плейсхолдер до первого useEffect.
    // Реальное значение берётся из localStorage или системных настроек.
    const [theme, setTheme] = useState<Theme>("light");

    /**
     * При монтировании синхронизируем React-стейт с классом,
     * уже применённым инлайн-скриптом (или устанавливаем его, если скрипт не сработал).
     * Порядок приоритетов: localStorage → системное предпочтение → "light".
     */
    useEffect(() => {
        const saved = localStorage.getItem("theme") as Theme | null;
        const systemPrefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

        // Берём сохранённое значение; если нет — смотрим на систему
        const initial: Theme = saved ?? (systemPrefersDark ? "dark" : "light");

        setTheme(initial);
        // Дублируем вызов applyThemeClass на случай, если инлайн-скрипт не сработал
        applyThemeClass(initial);
    }, []);

    /**
     * Переключает тему, обновляет CSS-класс на <html> и сохраняет в localStorage.
     * Обёрнут в useCallback: стабильная ссылка предотвращает лишние ре-рендеры
     * у всех потребителей контекста.
     */
    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next: Theme = prev === "light" ? "dark" : "light";
            localStorage.setItem("theme", next);
            applyThemeClass(next);
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// useTheme хук
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useTheme — хук для доступа к контексту темы.
 *
 * @throws {Error} Если вызван за пределами ThemeProvider.
 *
 * @example
 *   const { theme, toggleTheme } = useTheme();
 */
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme должен использоваться внутри <ThemeProvider>");
    }
    return context;
}
