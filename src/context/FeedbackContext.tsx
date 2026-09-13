import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface FeedbackContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/**
 * Global helper to dispatch a toast event from anywhere (even non-component files)
 */
export function notify(message: string, type: ToastType = 'info'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('farm_toast', {
        detail: { message, type },
      })
    );
  }
}

export const FeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info', durationMs: number = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after specified duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmModal(options);
  }, []);

  // Listen for custom global toast and storage error events
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: ToastType }>;
      if (customEvent.detail && customEvent.detail.message) {
        showToast(customEvent.detail.message, customEvent.detail.type || 'info');
      }
    };

    const handleStorageError = () => {
      showToast(
        'تنبيه: مساحة التخزين المحلي في المتصفح ممتلئة! يرجى تصدير نسخة احتياطية من الإعدادات لتفادي فقدان البيانات.',
        'error'
      );
    };

    window.addEventListener('farm_toast', handleCustomToast);
    window.addEventListener('farm_storage_error', handleStorageError);

    return () => {
      window.removeEventListener('farm_toast', handleCustomToast);
      window.removeEventListener('farm_storage_error', handleStorageError);
    };
  }, [showToast]);

  return (
    <FeedbackContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Floating Toast Notification Container (RTL top-center) */}
      <div
        aria-live="polite"
        className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 max-w-md w-full px-4 pointer-events-none"
      >
        {toasts.map((toast) => {
          let bgClass = 'bg-slate-900 text-white border-slate-700';
          let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-900 text-emerald-50 border-emerald-700 shadow-emerald-950/30';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />;
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-900 text-rose-50 border-rose-700 shadow-rose-950/30';
            icon = <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />;
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-900 text-amber-50 border-amber-700 shadow-amber-950/30';
            icon = <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xl text-xs font-bold w-full backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 ${bgClass}`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {icon}
                <span className="leading-relaxed truncate-2-lines">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl ${
                  confirmModal.isDanger
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {confirmModal.isDanger ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 font-medium">يرجى التأكيد للمتابعة</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  confirmModal.onCancel?.();
                  setConfirmModal(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                {confirmModal.cancelText || 'إلغاء'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                  confirmModal.isDanger
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'
                }`}
              >
                {confirmModal.confirmText || 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextValue => {
  const context = useContext(FeedbackContext);
  if (!context) {
    // Fallback if accessed outside provider
    return {
      showToast: (msg, type) => notify(msg, type),
      showConfirm: (opts) => {
        if (typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`)) {
          opts.onConfirm();
        } else {
          opts.onCancel?.();
        }
      },
    };
  }
  return context;
};
