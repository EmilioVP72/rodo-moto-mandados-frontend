import React from 'react';
import { ArrowLeft, Home, ShoppingBag, Send, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomMobileNavProps {
  cartItemCount: number;
  cartTotal: number;
  onBack: () => void;
  onHome: () => void;
  onOpenCart: () => void;
  onOpenExpress: () => void;
  onOpenAccount: () => void;
  canGoBack?: boolean;
  userName?: string;
  isAdminLoggedIn?: boolean;
}

export const BottomMobileNav: React.FC<BottomMobileNavProps> = ({
  cartItemCount,
  cartTotal,
  onBack,
  onHome,
  onOpenCart,
  onOpenExpress,
  onOpenAccount,
  canGoBack = true,
  userName,
  isAdminLoggedIn = false,
}) => {
  return (
    <nav
      aria-label="Navegación inferior móvil"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 pt-1.5 pb-safe transition-colors"
    >
      {/* Barra de Resumen en Tiempo Real de Artículos y Total con Framer Motion */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div
            key="cart-summary-bar"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={onOpenCart}
            className="max-w-md mx-auto mb-1 px-3 py-1.5 bg-[#ed0718] hover:bg-[#c90012] text-white rounded-xl shadow-md flex items-center justify-between cursor-pointer text-xs font-black transition active:scale-98"
          >
            <div className="flex items-center gap-2">
              <motion.span
                key={cartItemCount}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-mono"
              >
                🛒 {cartItemCount} {cartItemCount === 1 ? 'artículo' : 'artículos'}
              </motion.span>
              <span className="text-[11px] font-bold">Ver pedido</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              <motion.span
                key={cartTotal}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="font-black text-sm"
              >
                ${cartTotal.toFixed(2)} MXN
              </motion.span>
              <span className="text-white/90">→</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto flex items-center justify-around gap-1">
        {/* Botón Retroceder (Evita que el usuario salga del sitio web en el teléfono) */}
        <button
          type="button"
          onClick={onBack}
          title="Regresar a la pantalla anterior"
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-800 dark:text-gray-200 shadow-2xs">
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black mt-0.5 tracking-tight text-gray-800 dark:text-gray-200">
            Atrás
          </span>
        </button>

        {/* Botón Inicio / Home */}
        <button
          type="button"
          onClick={onHome}
          title="Ir a la página inicial de RODO"
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-800 dark:text-gray-200 shadow-2xs">
            <Home className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black mt-0.5 tracking-tight text-gray-800 dark:text-gray-200">
            Inicio
          </span>
        </button>

        {/* Botón Envíos Express */}
        <button
          type="button"
          onClick={onOpenExpress}
          title="Cotizar envío en moto o motomandado"
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shadow-2xs border border-blue-200 dark:border-blue-800">
            <Send className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold mt-0.5 tracking-tight text-blue-900 dark:text-blue-300">
            Envíos
          </span>
        </button>

        {/* Botón Carrito con badge dinámico animado con Framer Motion */}
        <button
          type="button"
          onClick={onOpenCart}
          title="Ver carrito de compras"
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition relative cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[#ed0718] text-white flex items-center justify-center shadow-xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <AnimatePresence>
            {cartItemCount > 0 && (
              <motion.span
                key={cartItemCount}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="absolute top-0.5 right-3 bg-black text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs"
              >
                {cartItemCount}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-[10px] font-black mt-0.5 tracking-tight text-[#ed0718]">
            {cartItemCount > 0 ? `$${cartTotal.toFixed(0)}` : 'Carrito'}
          </span>
        </button>

        {/* Botón Mi Cuenta / Perfil / Sesión Activa */}
        <button
          type="button"
          onClick={onOpenAccount}
          title={
            isAdminLoggedIn
              ? 'Abrir Panel de Administrador'
              : userName
              ? `Mi Perfil (${userName})`
              : 'Iniciar sesión o crear cuenta'
          }
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition relative cursor-pointer"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-2xs border relative ${
              isAdminLoggedIn
                ? 'bg-amber-400 text-black border-amber-500'
                : userName
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            <User className="w-4 h-4" />
            {(userName || isAdminLoggedIn) && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            )}
          </div>
          <span
            className={`text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-[68px] ${
              userName && !isAdminLoggedIn
                ? 'text-emerald-700 dark:text-emerald-400 font-black'
                : 'text-amber-900 dark:text-amber-300'
            }`}
          >
            {isAdminLoggedIn ? 'Admin' : userName ? userName.split(' ')[0] : 'Mi Cuenta'}
          </span>
        </button>
      </div>
    </nav>
  );
};
