'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Icons } from './icons';

type Toast = { id: number; message: string; tone: 'success' | 'error' };
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  }, []);
  const value = useMemo(() => show, [show]);
  return <ToastContext.Provider value={value}>{children}<div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm shadow-2xl ${toast.tone === 'success' ? 'border-emerald-800 bg-emerald-950 text-emerald-100' : 'border-rose-800 bg-rose-950 text-rose-100'}`}>{toast.tone === 'success' ? <Icons.Check className="h-4 w-4" /> : <Icons.Warning className="h-4 w-4" />}<span className="flex-1">{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}><Icons.Close className="h-4 w-4" /></button></div>)}</div></ToastContext.Provider>;
}

export function useToast() { return useContext(ToastContext); }
