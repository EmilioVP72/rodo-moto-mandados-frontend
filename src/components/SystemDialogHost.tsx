import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

export type SystemDialogTone = 'danger' | 'warning' | 'success' | 'error' | 'info';

export interface SystemConfirmOptions {
  title: string;
  message: string;
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'info';
}

export interface SystemAlertOptions {
  title: string;
  message: string;
  details?: string;
  confirmLabel?: string;
  tone?: SystemDialogTone;
}

export interface SystemToastOptions {
  message: string;
  tone?: 'success' | 'error' | 'warning' | 'info';
  durationMs?: number;
}

interface ActiveDialogState {
  kind: 'confirm' | 'alert';
  title: string;
  message: string;
  details?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: SystemDialogTone;
  resolve: (result: boolean) => void;
}

interface ActiveToastItem {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'warning' | 'info';
}

type DialogListener = (dialog: ActiveDialogState) => void;
type ToastListener = (toast: ActiveToastItem, durationMs: number) => void;

const dialogListeners = new Set<DialogListener>();
const toastListeners = new Set<ToastListener>();

/**
 * Muestra un modal de confirmación personalizado de RODO (reemplaza window.confirm).
 */
export function showSystemConfirm(options: SystemConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const payload: ActiveDialogState = {
      kind: 'confirm',
      title: options.title,
      message: options.message,
      details: options.details,
      confirmLabel: options.confirmLabel || 'Confirmar',
      cancelLabel: options.cancelLabel || 'Cancelar',
      tone: options.tone || 'danger',
      resolve,
    };
    if (dialogListeners.size === 0) {
      resolve(false);
      return;
    }
    dialogListeners.forEach((fn) => fn(payload));
  });
}

/**
 * Muestra una alerta modal personalizada de RODO (reemplaza window.alert).
 */
export function showSystemAlert(options: SystemAlertOptions): Promise<void> {
  return new Promise((resolve) => {
    const payload: ActiveDialogState = {
      kind: 'alert',
      title: options.title,
      message: options.message,
      details: options.details,
      confirmLabel: options.confirmLabel || 'Entendido',
      cancelLabel: 'Cerrar',
      tone: options.tone || 'info',
      resolve: () => resolve(),
    };
    if (dialogListeners.size === 0) {
      resolve();
      return;
    }
    dialogListeners.forEach((fn) => fn(payload));
  });
}

/**
 * Muestra una notificación flotante moderna de RODO (no bloquea la pantalla).
 */
export function showSystemToast(options: SystemToastOptions): void {
  const item: ActiveToastItem = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    message: options.message,
    tone: options.tone || 'info',
  };
  const durationMs = options.durationMs ?? 3800;
  toastListeners.forEach((fn) => fn(item, durationMs));
}

export const SystemDialogHost: React.FC = () => {
  const [queue, setQueue] = useState<ActiveDialogState[]>([]);
  const [toasts, setToasts] = useState<ActiveToastItem[]>([]);

  const currentDialog = queue[0] || null;

  useEffect(() => {
    const onDialog: DialogListener = (dialog) => {
      setQueue((prev) => [...prev, dialog]);
    };
    const onToast: ToastListener = (toast, durationMs) => {
      setToasts((prev) => [...prev.slice(-3), toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, durationMs);
    };

    dialogListeners.add(onDialog);
    toastListeners.add(onToast);
    return () => {
      dialogListeners.delete(onDialog);
      toastListeners.delete(onToast);
    };
  }, []);

  const closeCurrent = (result: boolean) => {
    if (!currentDialog) return;
    currentDialog.resolve(result);
    setQueue((prev) => prev.slice(1));
  };

  useEffect(() => {
    if (!currentDialog) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCurrent(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentDialog]);

  const toneConfig = (tone: SystemDialogTone) => {
    if (tone === 'danger' || tone === 'error') {
      return {
        badgeBg: 'bg-red-100 text-[#ed0718] ring-4 ring-red-50',
        confirmBtn: 'bg-[#ed0718] hover:bg-[#c90012] text-white shadow-red-600/20',
        headerAccent: 'border-t-4 border-[#ed0718]',
        Icon: tone === 'danger' ? Trash2 : XCircle,
      };
    }
    if (tone === 'warning') {
      return {
        badgeBg: 'bg-amber-100 text-amber-700 ring-4 ring-amber-50',
        confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
        headerAccent: 'border-t-4 border-amber-500',
        Icon: AlertTriangle,
      };
    }
    if (tone === 'success') {
      return {
        badgeBg: 'bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50',
        confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
        headerAccent: 'border-t-4 border-emerald-500',
        Icon: CheckCircle2,
      };
    }
    return {
      badgeBg: 'bg-slate-100 text-[#101b29] ring-4 ring-slate-50',
      confirmBtn: 'bg-[#101b29] hover:bg-black text-white shadow-slate-900/20',
      headerAccent: 'border-t-4 border-[#101b29]',
      Icon: Info,
    };
  };

  return (
    <>
      {/* Notificaciones Toast personalizadas del sistema RODO */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed top-4 right-3 left-3 sm:left-auto sm:right-5 z-[130] flex flex-col gap-2 max-w-sm sm:w-full pointer-events-none"
        >
          {toasts.map((toast) => {
            const style =
              toast.tone === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-50'
                : toast.tone === 'error'
                ? 'bg-red-950/95 border-red-500/70 text-red-50'
                : toast.tone === 'warning'
                ? 'bg-amber-950/95 border-amber-500/70 text-amber-50'
                : 'bg-[#101b29]/95 border-slate-600 text-white';

            const ToastIcon =
              toast.tone === 'success'
                ? CheckCircle2
                : toast.tone === 'error'
                ? XCircle
                : toast.tone === 'warning'
                ? AlertTriangle
                : Info;

            const iconColor =
              toast.tone === 'success'
                ? 'text-emerald-400'
                : toast.tone === 'error'
                ? 'text-red-400'
                : toast.tone === 'warning'
                ? 'text-amber-400'
                : 'text-sky-400';

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${style}`}
              >
                <ToastIcon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                <p className="text-xs sm:text-[13px] font-bold leading-snug flex-1">
                  {toast.message}
                </p>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-white/60 hover:text-white p-0.5 rounded-lg transition cursor-pointer shrink-0"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación / Alerta personalizado de RODO */}
      {currentDialog && (() => {
        const cfg = toneConfig(currentDialog.tone);
        const Icon = cfg.Icon;
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rodo-system-dialog-title"
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
            onClick={() => closeCurrent(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`bg-white text-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-150 ${cfg.headerAccent}`}
            >
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${cfg.badgeBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        RODO Moto Mandados
                      </span>
                      <button
                        type="button"
                        onClick={() => closeCurrent(false)}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                        aria-label="Cerrar diálogo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <h3
                      id="rodo-system-dialog-title"
                      className="text-base sm:text-lg font-black text-gray-900 mt-0.5 leading-snug"
                    >
                      {currentDialog.title}
                    </h3>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-gray-700 font-semibold leading-relaxed">
                    {currentDialog.message}
                  </p>
                  {currentDialog.details && (
                    <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 leading-relaxed">
                      {currentDialog.details}
                    </p>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
                  {currentDialog.kind === 'confirm' && (
                    <button
                      type="button"
                      onClick={() => closeCurrent(false)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold transition cursor-pointer"
                    >
                      {currentDialog.cancelLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    autoFocus
                    onClick={() => closeCurrent(true)}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-md transition cursor-pointer ${cfg.confirmBtn}`}
                  >
                    {currentDialog.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
