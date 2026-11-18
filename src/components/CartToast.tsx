import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface CartToastProps {
  visible: boolean;
  itemName: string;
  itemCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onDismiss: () => void;
}

export const CartToast: React.FC<CartToastProps> = ({
  visible,
  itemName,
  itemCount,
  cartTotal,
  onOpenCart,
  onDismiss,
}) => {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cart-toast"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-auto"
        >
          <div className="bg-[#101b29] text-white border border-red-500/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#ed0718] flex items-center justify-center shrink-0 shadow-xs">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
                  ✓ {t('addedToCart')} ({itemCount})
                </span>
                <span className="text-xs font-bold text-white truncate block">
                  {itemName} · ${cartTotal.toFixed(0)} MXN
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenCart}
                className="bg-[#ed0718] hover:bg-[#c90012] text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
              >
                <span>{t('viewCart')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Cerrar notificación"
                className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
