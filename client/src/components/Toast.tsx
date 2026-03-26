import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
interface ToastContextValue { show: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: 'rgba(52,199,89,0.1)', border: '#34C759', icon: '✓' },
    error: { bg: 'rgba(255,59,48,0.1)', border: '#FF3B30', icon: '✕' },
    info: { bg: 'rgba(142,142,147,0.1)', border: '#8E8E93', icon: 'ℹ' },
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999 }}>
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--bg-secondary)', border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.border}`, borderRadius: '10px', boxShadow: 'var(--shadow-lg)', fontSize: '13px', fontWeight: 400, minWidth: '220px', animation: 'slideIn 0.2s ease', color: 'var(--text-primary)' }}>
              <span style={{ color: c.border, fontWeight: 500, fontSize: '15px' }}>{c.icon}</span>
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
