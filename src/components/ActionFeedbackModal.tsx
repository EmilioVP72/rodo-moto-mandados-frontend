import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  ShoppingBag,
  KeyRound,
  LogOut,
  X,
} from 'lucide-react';

export interface TransactionFeedbackPayload {
  variant: 'register' | 'login' | 'password_reset' | 'order' | 'logout' | 'success';
  title: string;
  subtitle: string;
  details?: Array<{ label: string; value: string; highlight?: boolean }>;
  copyableCode?: { label: string; value: string };
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

interface ActionFeedbackModalProps {
  feedback: TransactionFeedbackPayload | null;
  onClose: () => void;
}

export const ActionFeedbackModal: React.FC<ActionFeedbackModalProps> = ({
  feedback,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [feedback]);

  if (!feedback) return null;

  const handleCopy = () => {
    if (!feedback.copyableCode) return;
    navigator.clipboard?.writeText(feedback.copyableCode.value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const iconByVariant = {
    register: <Sparkles className="w-9 h-9 text-white" />,
    login: <ShieldCheck className="w-9 h-9 text-white" />,
    password_reset: <KeyRound className="w-9 h-9 text-white" />,
    order: <ShoppingBag className="w-9 h-9 text-white" />,
    logout: <LogOut className="w-9 h-9 text-white" />,
    success: <CheckCircle2 className="w-9 h-9 text-white" />,
  }[feedback.variant];

  const gradientByVariant = {
    register: 'from-emerald-500 via-emerald-600 to-teal-700',
    login: 'from-emerald-600 via-green-600 to-emerald-800',
    password_reset: 'from-blue-600 via-indigo-600 to-slate-900',
    order: 'from-[#ed0718] via-red-600 to-[#101b29]',
    logout: 'from-slate-700 via-slate-800 to-[#101b29]',
    success: 'from-emerald-500 to-emerald-700',
  }[feedback.variant];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        {/* Cabecera Celebratoria */}
        <div className={`bg-gradient-to-br ${gradientByVariant} text-white p-6 text-center relative`}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar confirmación"
            className="absolute top-3 right-3 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center shadow-lg mb-3 animate-bounce">
            {iconByVariant}
          </div>
          <h3 className="text-xl font-black tracking-tight">{feedback.title}</h3>
          <p className="text-xs sm:text-sm text-white/90 mt-1.5 leading-relaxed">
            {feedback.subtitle}
          </p>
        </div>

        {/* Detalles de la Transacción */}
        <div className="p-5 sm:p-6 space-y-4">
          {feedback.details && feedback.details.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-2 text-xs">
              {feedback.details.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 border-b last:border-b-0 border-gray-200/70 dark:border-slate-700/70 pb-1.5 last:pb-0"
                >
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">{row.label}:</span>
                  <span
                    className={`font-black text-right ${
                      row.highlight
                        ? 'text-emerald-700 dark:text-emerald-400 font-mono text-sm'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {feedback.copyableCode && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 block">
                  {feedback.copyableCode.label}
                </span>
                <span className="font-mono font-black text-base text-gray-900 dark:text-white tracking-wider">
                  {feedback.copyableCode.value}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (feedback.onPrimaryAction) {
                feedback.onPrimaryAction();
              }
              onClose();
            }}
            className="w-full bg-[#101b29] hover:bg-black text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback.primaryActionLabel || '¡Entendido, continuar!'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface SuccessToastBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export const SuccessToastBanner: React.FC<SuccessToastBannerProps> = ({
  message,
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[95] w-[92%] max-w-md animate-in slide-in-from-top-4 fade-in duration-200">
      <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-400/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-100" />
          <span>{message}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/15 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
