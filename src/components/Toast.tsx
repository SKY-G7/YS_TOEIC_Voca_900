import { useEffect, useState, useCallback } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, showToast };
}

export function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  const [visible, setVisible] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (toasts.length > 0) {
      setVisible(toasts);
    }
  }, [toasts]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {visible.map((t) => (
        <div
          key={t.id}
          className="bg-gray-900/90 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-sm animate-fade-in-up max-w-[90vw] text-center"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
