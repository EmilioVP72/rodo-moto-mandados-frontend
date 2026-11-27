import React from 'react';
import { Restaurant, OrderItem, MenuItem } from '../types';
import { useBackdropClose } from '../utils/modalBackdrop';
import { getRestaurantAvailability } from '../utils/restaurantAvailability';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Clock,
  Zap,
  Info,
} from 'lucide-react';

interface CartDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: OrderItem[];
  restaurant: Restaurant | null;
  onAddToCart: (item: OrderItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onRequestAvailabilityAlert: () => void;
  availabilityAlertRequested: boolean;
}

export const CartDrawerModal: React.FC<CartDrawerModalProps> = ({
  isOpen,
  onClose,
  cart,
  restaurant,
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  onProceedToCheckout,
  onRequestAvailabilityAlert,
  availabilityAlertRequested,
}) => {
  const backdropHandlers = useBackdropClose(isOpen, onClose);

  if (!isOpen) return null;

  const totalItemsCount = cart.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const deliveryFee = restaurant?.deliveryFee || 35;
  const total = subtotal + deliveryFee;
  const availability = restaurant ? getRestaurantAvailability(restaurant) : { available: false, message: 'Establecimiento no disponible.' };

  // Extras sugeridos del restaurante o genéricos
  const extrasList: MenuItem[] = restaurant?.suggestedExtras || [
    {
      id: 'ext-coca-def',
      name: 'Coca-Cola 600ml bien fría',
      description: 'Refresco original frío',
      price: 30,
      isAvailable: true,
    },
    {
      id: 'ext-agua-def',
      name: 'Agua Fresca del Día 1L',
      description: 'Jamaica o Horchata con hielo',
      price: 35,
      isAvailable: true,
    },
    {
      id: 'ext-papas-def',
      name: 'Papas a la Francesa Crujientes',
      description: 'Con cátsup y aderezo',
      price: 45,
      isAvailable: true,
    },
  ];

  const handleAddExtra = (extra: MenuItem) => {
    onAddToCart({
      id: extra.id,
      name: extra.name,
      price: extra.price,
      quantity: 1,
      isExtra: true,
    });
  };

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-md h-[100dvh] bg-white shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Encabezado del Carrito */}
        <div className="bg-[#101b29] text-white p-3.5 sm:p-4 pt-safe flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#ed0718] p-2 rounded-xl text-white shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wide flex items-center gap-1.5">
                Mi Canasta de Pedido
                <span className="bg-red-500/30 text-red-200 text-xs px-2 py-0.5 rounded-full font-bold">
                  {totalItemsCount} {totalItemsCount === 1 ? 'ítem' : 'ítems'}
                </span>
              </h2>
              {restaurant && (
                <p className="text-xs text-gray-300 truncate max-w-[220px]">
                  Restaurante: <strong className="text-white">{restaurant.name}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar carrito"
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="font-extrabold text-gray-800 text-lg">Tu canasta está vacía</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Explora los restaurantes y agrega deliciosos platillos, tacos, pizzas o alitas.
              </p>
              <button
                onClick={onClose}
                className="mt-6 bg-[#ed0718] hover:bg-[#d60615] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-md"
              >
                Explorar Menús
              </button>
            </div>
          ) : (
            <>
              {/* Regla de Restaurante Único */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pedido Exclusivo de {restaurant?.name}</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Para garantizar la frescura y rapidez de entrega, cada pedido pertenece a un solo local.
                  </p>
                </div>
              </div>

              {/* Lista de Productos en la Canasta */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-600 px-1">
                  <span>Platillos seleccionados</span>
                  <button
                    onClick={onClearCart}
                    className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Vaciar
                  </button>
                </div>

                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-gray-300 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-gray-800 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs font-extrabold text-[#ed0718] mt-0.5">
                        ${(item.price * item.quantity).toFixed(2)} MXN
                        <span className="text-gray-400 font-normal ml-1 text-[11px]">
                          (${item.price.toFixed(2)} c/u)
                        </span>
                      </p>
                      {item.isExtra && (
                        <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-sm mt-0.5">
                          Extra agregado
                        </span>
                      )}
                      {item.customizations && item.customizations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.customizations.map((c, idx) => (
                            <span key={idx} className="bg-red-50 text-[#ed0718] border border-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Controles de Cantidad */}
                    <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl p-1 shadow-2xs">
                      <button
                        onClick={() => onRemoveFromCart(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                        aria-label="Reducir cantidad"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-black text-xs text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onAddToCart(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#ed0718] hover:bg-[#d60615] text-white transition shadow-2xs"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sección de Extras sugeridos tipo Uber Eats */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>¿Deseas agregar algo más?</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Bebidas frías, complementos y postres para acompañar tu orden:
                </p>

                <div className="space-y-2 pt-1">
                  {extrasList.map((extra) => {
                    const isAlreadyInCart = cart.some((it) => it.id === extra.id);
                    return (
                      <div
                        key={extra.id}
                        className="bg-white border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:border-amber-300 transition"
                      >
                        <div className="flex-1 min-w-0 pr-1">
                          <p className="text-xs font-bold text-gray-800 truncate">{extra.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">{extra.description}</p>
                          <span className="text-xs font-black text-amber-900">
                            +${extra.price.toFixed(2)} MXN
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddExtra(extra)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0 ${
                            isAlreadyInCart
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                          }`}
                        >
                          {isAlreadyInCart ? '✓ Agregado' : '＋ Agregar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aviso Antifraude */}
              <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 text-[11px] text-gray-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Política Antifraude RODO:</span>
                </div>
                <p>
                  • Pago en efectivo con límite de crédito progresivo ($300 en tu 1er pedido).
                </p>
                <p>
                  • Pago por transferencia bancaria SPEI disponible sin límite de monto.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer del Carrito con Subtotal y Botón de Pago */}
        {cart.length > 0 && (
          <div className="bg-white border-t border-gray-200 p-4 pb-safe space-y-3 shadow-lg shrink-0">
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal de platillos ({totalItemsCount} productos):</span>
                <span className="font-bold text-gray-900">${subtotal.toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between">
                <span>Envío estimado en San Miguel:</span>
                <span className="font-bold text-gray-900">${deliveryFee.toFixed(2)} MXN</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-black text-gray-900">Total preliminar:</span>
                <span className="text-lg font-black text-[#ed0718]">${total.toFixed(2)} MXN</span>
              </div>
            </div>

            {!restaurant && (
              <p role="status" className="text-sm text-amber-900">
                El establecimiento de esta canasta no está disponible en el catálogo. Puedes volver a elegir dónde pedir.
              </p>
            )}
            {restaurant && !availability.available && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 space-y-2">
                <p className="font-bold">Restaurante no disponible para pedidos ahora</p>
                <p>{availability.message}</p>
                <button type="button" onClick={onRequestAvailabilityAlert} className="font-bold underline underline-offset-2">
                  {availabilityAlertRequested ? 'Aviso activado en este dispositivo' : 'Avísame cuando esté disponible'}
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={Boolean(restaurant && !availability.available)}
              onClick={restaurant && availability.available ? onProceedToCheckout : onClose}
              className={`w-full active:scale-[0.99] text-white font-extrabold text-sm py-3.5 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 ${restaurant && !availability.available ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#ed0718] hover:bg-[#d60615] hover:shadow-lg'}`}
            >
              <span>{restaurant ? 'Continuar al Pago y Datos' : 'Volver al catálogo'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
