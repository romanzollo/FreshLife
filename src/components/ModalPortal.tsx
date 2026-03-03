// components/ModalPortal.tsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
    children: React.ReactNode;
    onClose?: () => void;
}

export function ModalPortal({ children, onClose }: ModalPortalProps) {
    // Блокируем прокрутку фона при открытом модальном окне
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Закрытие по нажатию Escape
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Затемнение фона с закрытием по клику */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Контент модального окна (поверх затемнения) */}
            <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>,
        document.body,
    );
}
