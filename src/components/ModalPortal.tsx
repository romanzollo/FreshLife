/**
 * ModalPortal — универсальная обёртка для модальных окон.
 *
 * Использует React Portal для рендеринга содержимого прямо в document.body,
 * минуя дерево DOM родительского компонента. Это решает проблемы с z-index
 * и overflow: hidden на родительских контейнерах.
 *
 * Функции:
 * - Блокирует скролл страницы во время открытия модалки
 * - Закрывает по нажатию клавиши Escape
 * - Закрывает по клику на затемнённый фон (backdrop)
 */

// ОБЯЗАТЕЛЬНО для компонентов, использующих хуки и DOM-API.
// Без этой директивы Next.js попытается рендерить компонент на сервере,
// где нет document.body, и получит ошибку.
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  /** Содержимое модального окна (любые React-узлы) */
  children: React.ReactNode;
  /** Функция закрытия модалки. Вызывается при нажатии Escape или клике на backdrop */
  onClose?: () => void;
  /**
   * Класс для backdrop-слоя.
   *
   * Зачем:
   * - На мобильных blur (backdrop-blur) часто выглядит уместно и подчёркивает модальность.
   * - На desktop blur может быть лишним/“тяжёлым”, поэтому даём возможность отключать его
   *   и оставить только затемнение.
   *
   * По умолчанию сохраняем прежнее поведение (с blur), чтобы не менять внешний вид
   * существующих модалок в проекте.
   */
  backdropClassName?: string;
}

export function ModalPortal({
  children,
  onClose,
  backdropClassName = "bg-slate-900/40 backdrop-blur-sm",
}: ModalPortalProps) {
  // Побочный эффект: блокируем скролл на время жизни компонента
  useEffect(() => {
    // Запоминаем текущее значение overflow, чтобы восстановить точно его,
    // а не просто написать '' — вдруг родительский код тоже управлял overflow.
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Обработчик закрытия по Escape — привязываем к window, а не к элементу,
    // чтобы событие срабатывало независимо от того, что сейчас в фокусе.
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);

    // Функция очистки: восстанавливаем скролл и снимаем слушатель
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]); // Пересоздаём эффект если сменился колбэк onClose

  // createPortal(jsx, target) — рендерит jsx в target (document.body),
  // при этом компонент остаётся частью React-дерева для пропсов и контекста.
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      {/*
        Backdrop (затемнённый фон):
        - absolute inset-0 растягивает на весь экран
        - backdrop-blur-sm создаёт лёгкое размытие контента за модалкой
        - onClick закрывает модалку при клике вне её содержимого
      */}
      <div
        className={`absolute inset-0 ${backdropClassName}`}
        onClick={onClose}
      />

      {/*
        Контейнер содержимого:
        - relative z-10 — располагается поверх backdrop
        - max-w-md ограничивает ширину модалки на больших экранах
        - w-full позволяет занять всю доступную ширину на мобильных
      */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>,
    document.body
  );
}
