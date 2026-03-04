/**
 * NavLinks — клиентский компонент навигационных ссылок шапки.
 *
 * Вынесен в отдельный файл, потому что layout.tsx является серверным
 * компонентом (нет 'use client'), а usePathname() работает только
 * на клиенте. Разделение позволяет сохранить серверный рендеринг layout
 * и получить интерактивную подсветку активной страницы.
 *
 * Активная ссылка:
 *   - Цвет текста: --color-brand-600 (Indigo-600)
 *   - Фон: --color-indigo-100 (мягкий индиго, адаптируется к теме)
 *   - Атрибут aria-current="page" для доступности
 *
 * Адаптивность:
 *   - На мобильных (< md): сокращённые подписи ("Товары" вместо "Управление товарами")
 *   - На планшетах и десктопах (≥ md): полные подписи
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Конфигурация навигационных ссылок.
 * Вынесена за пределы компонента, чтобы не пересоздаваться на каждый рендер.
 *
 * - href:       путь маршрута Next.js
 * - label:      полная подпись (md и выше)
 * - labelShort: сокращённая подпись (< md, телефоны)
 */
const NAV_LINKS = [
    {
        href: '/',
        label: 'Каталог',
        labelShort: 'Каталог',
    },
    {
        href: '/admin',
        label: 'Управление товарами',
        labelShort: 'Товары',
    },
] as const;

export function NavLinks() {
    /**
     * usePathname() возвращает текущий URL-путь без параметров запроса.
     * Пример: для "http://localhost:4000/admin?page=2" вернёт "/admin".
     * Обновляется автоматически при навигации без перезагрузки страницы.
     */
    const pathname = usePathname();

    return (
        <>
            {NAV_LINKS.map(({ href, label, labelShort }) => {
                /**
                 * Точное совпадение пути определяет активную ссылку.
                 * Используем ===, а не startsWith(), чтобы "/" не активировалась
                 * при переходе на "/admin".
                 */
                const isActive = pathname === href;

                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={isActive ? 'page' : undefined}
                        className="font-medium transition-all rounded-lg px-3 py-1.5 whitespace-nowrap"
                        style={
                            isActive
                                ? {
                                    /* Активная страница: брендовый Indigo */
                                    color: 'var(--color-brand-600)',
                                    background: 'var(--color-indigo-100)',
                                }
                                : {
                                    /* Неактивная: приглушённый серый */
                                    color: 'var(--color-grey-600)',
                                }
                        }
                    >
                        {/* Сокращённая подпись: видна только на телефонах (< md) */}
                        <span className="md:hidden">{labelShort}</span>

                        {/* Полная подпись: видна на планшетах и десктопах (≥ md) */}
                        <span className="hidden md:inline">{label}</span>
                    </Link>
                );
            })}
        </>
    );
}
