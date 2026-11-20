import React, { useState } from 'react';
import { Restaurant, OrderItem, MenuItem } from '../types';
import { X, Star, Clock, Bike, Plus, Minus, ShoppingBag, AlertTriangle, Ban, ShieldCheck, Check, SlidersHorizontal, Utensils } from 'lucide-react';
import { ComboBuilderModal } from './ComboBuilderModal';

interface RestaurantDetailModalProps {
  restaurant: Restaurant | null;
  cart: OrderItem[];
  onAddToCart: (item: OrderItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onProceedToCheckout: () => void;
  onClose: () => void;
}

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  restaurant,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onProceedToCheckout,
  onClose,
}) => {
  if (!restaurant) return null;

  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [comboDish, setComboDish] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [itemNote, setItemNote] = useState('');

  const isClosed = restaurant.isOpen === false;
  const cartSubtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const cartTotalItems = cart.reduce((sum, it) => sum + it.quantity, 0);

  const getItemQuantity = (itemId: string) => {
    const it = cart.filter((c) => c.id === itemId || c.id.startsWith(`${itemId}-`));
    return it.reduce((sum, c) => sum + c.quantity, 0);
  };

  const startCustomizing = (item: MenuItem) => {
    if (item.isComboBuilder || item.name.toLowerCase().includes('guisado')) {
      setComboDish(item);
      return;
    }
    setCustomizingItem(item);
    const initialSelections: Record<string, string[]> = {};
    if (item.optionGroups) {
      item.optionGroups.forEach((grp) => {
        // Pre-select first choice for 1-select options like guarnición
        if (grp.maxSelect === 1 && grp.options.length > 0) {
          initialSelections[grp.id] = [grp.options[0]];
        } else {
          initialSelections[grp.id] = [];
        }
      });
    }
    setSelectedOptions(initialSelections);
    setSelectedCustomizations([]);
    setItemNote('');
  };

  const toggleOption = (groupId: string, option: string, maxSelect: number) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [option] };
      }
      if (current.includes(option)) {
        return { ...prev, [groupId]: current.filter((o) => o !== option) };
      }
      if (current.length < maxSelect) {
        return { ...prev, [groupId]: [...current, option] };
      }
      return prev;
    });
  };

  const toggleCustomization = (id: string) => {
    setSelectedCustomizations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedCustomizationObjs = (customizingItem?.customizations || []).filter((c) =>
    selectedCustomizations.includes(c.id)
  );
  const extraCost = selectedCustomizationObjs.reduce(
    (sum, c) => sum + (c.type === 'extra' ? c.price : 0),
    0
  );
  const customizedTotalPrice = (customizingItem?.price || 0) + extraCost;

  const handleConfirmCustomization = () => {
    if (!customizingItem) return;

    // Build description from options
    const optionsList: string[] = [];
    if (customizingItem.optionGroups) {
      customizingItem.optionGroups.forEach((grp) => {
        const selected = selectedOptions[grp.id] || [];
        if (selected.length > 0) {
          optionsList.push(`${grp.name}: ${selected.join(', ')}`);
        }
      });
    }

    const customLabels = selectedCustomizationObjs.map((c) =>
      c.price > 0 ? `${c.name} (+ $${c.price.toFixed(2)})` : c.name
    );

    const fullNotes = [
      optionsList.join(' | '),
      customLabels.join(' · '),
      itemNote.trim() ? `Nota: ${itemNote.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    onAddToCart({
      id: `${customizingItem.id}-${Date.now()}`,
      name: customizingItem.name,
      price: customizedTotalPrice,
      quantity: 1,
      stockLevel: customizingItem.stockLevel,
      notes: fullNotes,
      selectedOptions: optionsList,
      customizations: customLabels,
      selectedModifiers: selectedCustomizationObjs,
      unitExtraPrice: extraCost,
    });

    setCustomizingItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[94dvh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden sm:my-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Banner de Cierre Temporal si está inactivo por desfile o evento */}
        {isClosed && (
          <div className="bg-amber-600 text-white p-3 sm:p-3.5 px-4 flex items-center gap-2.5 text-xs sm:text-sm font-bold shadow-md shrink-0">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-200" />
            <div className="flex-1">
              <span className="font-black uppercase tracking-wider block text-[11px] text-amber-200">
                Aviso de Disponibilidad: Cerrado Temporalmente
              </span>
              <span>
                {restaurant.closureReason || 'Cerrado temporalmente por desfile o evento vial en San Miguel. Pedidos pausados.'}
              </span>
            </div>
          </div>
        )}

        {/* Cabecera con foto del restaurante */}
        <div className="relative h-44 sm:h-56 w-full shrink-0">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className={`w-full h-full object-cover ${isClosed ? 'grayscale-40' : ''}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-xs transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isClosed ? (
                <span className="bg-amber-500 text-black text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Ban className="w-3 h-3" /> Cerrado por Desfile / Evento
                </span>
              ) : (
                <span className="bg-emerald-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Abierto ahora
                </span>
              )}

              {restaurant.badge && (
                <span className="bg-[#ed0718] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {restaurant.badge}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs font-bold bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {restaurant.rating} ({restaurant.reviews})
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black">{restaurant.name}</h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-white/90 mt-1 font-semibold">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {restaurant.time}
              </span>
              {restaurant.schedule && (
                <>
                  <span>·</span>
                  <span className="text-amber-200">
                    🕒 Horario: {restaurant.schedule}
                  </span>
                </>
              )}
              <span>·</span>
              <span className="flex items-center gap-1 text-red-300 font-bold">
                <Bike className="w-3.5 h-3.5" /> Envío: ${restaurant.deliveryFee} MXN
              </span>
              <span>·</span>
              <span>
                {restaurant.acceptsTransfer ? '💳 Transferencia permitida' : '💵 Solo efectivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Cuerpo del Menú */}
        <div className="p-4 sm:p-6 min-h-0 overflow-y-auto overscroll-contain flex-1 space-y-4">
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {restaurant.description}
          </p>

          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 uppercase tracking-wide mb-3 flex items-center justify-between">
              <span>Carta y Platillos</span>
              <span className="text-xs text-gray-500 font-normal">
                {restaurant.menu.length} artículos
              </span>
            </h3>

            {restaurant.menu.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl text-xs text-gray-500">
                El menú de este restaurante se está actualizando.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {restaurant.menu.map((item) => {
                  const qty = getItemQuantity(item.id);
                  const isSoldOut = item.isAvailable === false || item.stockLevel === 0;
                  const isLowStock = item.stockLevel !== undefined && item.stockLevel > 0 && item.stockLevel <= 3;

                  return (
                    <div
                      key={item.id}
                      className={`py-3 flex items-start justify-between gap-3 rounded-xl p-2.5 transition ${
                        isSoldOut ? 'bg-gray-50/80 opacity-75' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {item.image && (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                            <img
                              src={item.image}
                              alt={item.name}
                              className={`w-full h-full object-cover ${isSoldOut ? 'grayscale-60' : ''}`}
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className={`font-bold text-sm ${isSoldOut ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {item.name}
                            </h4>
                            {isSoldOut ? (
                              <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Agotado
                              </span>
                            ) : isLowStock ? (
                              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                                ⚠️ Últimas {item.stockLevel} unidades
                              </span>
                            ) : null}
                          </div>

                          {item.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="font-mono font-black text-sm text-[#ed0718] mt-1.5">
                            ${item.price.toFixed(2)} MXN
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSoldOut ? (
                          <span className="text-xs font-bold text-gray-400 bg-gray-200 px-3 py-1.5 rounded-xl cursor-not-allowed select-none">
                            Agotado
                          </span>
                        ) : isClosed ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1.5 rounded-xl cursor-not-allowed">
                            Pausado
                          </span>
                        ) : item.isComboBuilder || item.name.toLowerCase().includes('guisado') ? (
                          <button
                            type="button"
                            onClick={() => setComboDish(item)}
                            className="bg-[#ed0718] hover:bg-[#c90012] text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                          >
                            <Utensils className="w-3.5 h-3.5" />
                            <span>Armar Guisados</span>
                            {qty > 0 && (
                              <span className="bg-white/25 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                                {qty}
                              </span>
                            )}
                          </button>
                        ) : (item.optionGroups && item.optionGroups.length > 0) || (item.customizations && item.customizations.length > 0) ? (
                          <button
                            onClick={() => startCustomizing(item)}
                            className="bg-[#ed0718] hover:bg-[#c90012] text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Personalizar</span>
                            {qty > 0 && (
                              <span className="bg-white/25 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                                {qty}
                              </span>
                            )}
                          </button>
                        ) : qty > 0 ? (
                          <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-neutral-700">
                            <button
                              type="button"
                              onClick={() => {
                                const targetItem = cart.find((c) => c.id === item.id) || cart.find((c) => c.id.startsWith(`${item.id}-`));
                                onRemoveFromCart(targetItem ? targetItem.id : item.id);
                              }}
                              className="w-7 h-7 bg-white dark:bg-slate-700 text-gray-800 dark:text-white rounded-lg font-bold flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-xs min-w-4 text-center dark:text-white">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const targetItem = cart.find((c) => c.id === item.id) || cart.find((c) => c.id.startsWith(`${item.id}-`));
                                onAddToCart(targetItem ? targetItem : {
                                  id: item.id,
                                  name: item.name,
                                  price: item.price,
                                  quantity: 1,
                                  stockLevel: item.stockLevel,
                                });
                              }}
                              className="w-7 h-7 bg-[#ed0718] text-white rounded-lg font-bold flex items-center justify-center hover:bg-[#c90012] transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onAddToCart({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                quantity: 1,
                                stockLevel: item.stockLevel,
                              })
                            }
                            className="bg-[#ed0718] hover:bg-[#c90012] text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Aviso de Privacidad y Deslinde Legal para este restaurante */}
            <div className="mt-6 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] text-gray-600 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-black text-gray-800 text-xs">
                <ShieldCheck className="w-4 h-4 text-[#ed0718] shrink-0" />
                <span>Aviso de Propiedad Intelectual & Deslinde Legal</span>
              </div>
              <p>
                <b>Propiedad de Fotos y Menús:</b> Las fotografías, nombres comerciales, platillos y cartas exhibidos son propiedad y autoría exclusiva de <b>{restaurant.name}</b>. RODO Moto Mandados no es propietario de las imágenes ni marcas; se exhiben únicamente como referencia ilustrativa e intermediación para el encargo del cliente.
              </p>
              <p>
                <b>Intermediación Logística:</b> RODO es una empresa independiente de mensajería y reparto. La preparación, sazón, cantidad y empaque son responsabilidad única del establecimiento. En entregas, el cliente cuenta con un margen de tolerancia máximo de 10 minutos al arribo del repartidor.
              </p>
            </div>
          </div>
        </div>

        {/* Footer del Carrito */}
        {cartTotalItems > 0 && !isClosed && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <div className="text-xs text-gray-500 font-medium">
                {cartTotalItems} {cartTotalItems === 1 ? 'producto' : 'productos'} agregados
              </div>
              <div className="font-mono font-black text-base sm:text-lg text-gray-900">
                ${cartSubtotal.toFixed(2)} MXN{' '}
                <span className="text-xs text-gray-500 font-normal">
                  (+${restaurant.deliveryFee} envío)
                </span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="bg-[#ed0718] hover:bg-[#c90012] text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl flex items-center gap-2 shadow-md transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Proceder al Pedido (${(cartSubtotal + restaurant.deliveryFee).toFixed(2)})</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-modal de Personalización de Guisados y Opciones (Comida China y Combos) */}
      {customizingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
            {/* Header del Platillo */}
            <div className="p-4 bg-gray-900 text-white flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-[#ed0718] bg-white/10 px-2 py-0.5 rounded-full inline-block mb-1">
                  Arma tu Platillo
                </span>
                <h3 className="text-base sm:text-lg font-black leading-tight">
                  {customizingItem.name}
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  {customizingItem.description}
                </p>
                <div className="font-mono font-black text-sm text-[#ed0718] mt-1.5">
                  ${customizingItem.price.toFixed(2)} MXN
                </div>
              </div>

              <button
                onClick={() => setCustomizingItem(null)}
                className="text-gray-400 hover:text-white p-1 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Opciones y Guisados */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 divide-y divide-gray-100">
              {customizingItem.optionGroups?.map((group) => {
                const currentSelections = selectedOptions[group.id] || [];
                const isComplete = currentSelections.length >= group.maxSelect;

                return (
                  <div key={group.id} className="pt-4 first:pt-0 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide">
                        {group.name}
                      </h4>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          currentSelections.length === group.maxSelect
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {currentSelections.length} de {group.maxSelect} {group.maxSelect === 1 ? 'elegido' : 'elegidos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.options.map((opt) => {
                        const isSelected = currentSelections.includes(opt);
                        const canSelectMore = currentSelections.length < group.maxSelect;

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleOption(group.id, opt, group.maxSelect)}
                            className={`p-2.5 text-left rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition ${
                              isSelected
                                ? 'bg-red-50 border-[#ed0718] text-[#ed0718] shadow-xs ring-1 ring-[#ed0718]/30 font-bold'
                                : canSelectMore
                                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <span className="leading-snug">{opt}</span>
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-[#ed0718] border-[#ed0718] text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Personalizaciones: Quitar ingredientes y Extras de pago */}
              {customizingItem.customizations && customizingItem.customizations.length > 0 && (
                <div className="pt-4 space-y-4">
                  {/* Ingredientes a quitar (Sin costo) */}
                  {customizingItem.customizations.filter((c) => c.type === 'removal').length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide">
                          Quitar Ingredientes (Sin costo)
                        </h4>
                        <span className="text-[11px] text-gray-500">¿Prefieres sin algún ingrediente?</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {customizingItem.customizations
                          .filter((c) => c.type === 'removal')
                          .map((custom) => {
                            const isSelected = selectedCustomizations.includes(custom.id);
                            return (
                              <button
                                key={custom.id}
                                type="button"
                                onClick={() => toggleCustomization(custom.id)}
                                className={`p-2.5 text-left rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition ${
                                  isSelected
                                    ? 'bg-red-50 border-[#ed0718] text-[#ed0718] font-bold shadow-xs'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <span>{custom.name}</span>
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-[#ed0718] border-[#ed0718] text-white'
                                      : 'border-gray-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Extras con costo adicional */}
                  {customizingItem.customizations.filter((c) => c.type === 'extra').length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide">
                          Extras e Ingredientes Adicionales
                        </h4>
                        <span className="text-[11px] text-amber-700 font-bold">Porción extra</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {customizingItem.customizations
                          .filter((c) => c.type === 'extra')
                          .map((custom) => {
                            const isSelected = selectedCustomizations.includes(custom.id);
                            return (
                              <button
                                key={custom.id}
                                type="button"
                                onClick={() => toggleCustomization(custom.id)}
                                className={`p-2.5 text-left rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition ${
                                  isSelected
                                    ? 'bg-red-50 border-[#ed0718] text-[#ed0718] font-bold shadow-xs'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <span className="truncate">{custom.name}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono font-bold text-gray-900 text-[11px]">
                                    +${custom.price.toFixed(2)}
                                  </span>
                                  <div
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-[#ed0718] border-[#ed0718] text-white'
                                        : 'border-gray-300 bg-white'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notas opcionales */}
              <div className="pt-4 space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
                  Instrucciones o notas adicionales (opcional):
                </label>
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="Ej: salsa agridulce aparte, bien dorado, etc."
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#ed0718] outline-hidden"
                />
              </div>
            </div>

            {/* Footer de Confirmación */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmCustomization}
                disabled={
                  customizingItem.optionGroups?.some(
                    (grp) => (selectedOptions[grp.id] || []).length < grp.maxSelect
                  )
                }
                className="bg-[#ed0718] hover:bg-[#c90012] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-md transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Agregar al Pedido (${customizedTotalPrice.toFixed(2)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Platillos y Guisados Combinados por Pasos */}
      {comboDish && (
        <ComboBuilderModal
          dish={comboDish}
          restaurant={restaurant}
          isOpen={true}
          onClose={() => setComboDish(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
};
