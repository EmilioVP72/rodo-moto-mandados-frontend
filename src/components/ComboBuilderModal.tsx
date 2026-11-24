import React, { useState, useMemo } from 'react';
import { MenuItem, Restaurant, OrderItem, ComboBuilderConfig, ComboSideOption, ComboMainDishOption } from '../types';
import { useBackdropClose } from '../utils/modalBackdrop';
import { X, Check, Plus, Minus, UtensilsCrossed, Sparkles, AlertCircle, ShoppingBag, Flame } from 'lucide-react';

interface ComboBuilderModalProps {
  dish: MenuItem;
  restaurant: Restaurant;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: OrderItem) => void;
}

// Opciones predeterminadas fotográficas de alta calidad para comida china express / fonda de guisados
export const DEFAULT_CHINESE_SIDES: ComboSideOption[] = [
  {
    id: 'side-arroz',
    name: 'Arroz Frito Cantonés',
    description: 'Arroz al wok con huevo, verduras finas y salsa de soya tradicional.',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
  {
    id: 'side-espagueti',
    name: 'Espagueti Chino (Chow Mein)',
    description: 'Fideos orientales salteados al fuego vivo con vegetales crujientes.',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
  {
    id: 'side-mixto',
    name: 'Mitad y Mitad (Arroz + Espagueti)',
    description: '¡La combinación favorita! 50% Arroz frito cantonés y 50% Chow Mein.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
  {
    id: 'side-verduras',
    name: 'Verduras Salteadas al Wok',
    description: 'Brócoli, col china, zanahoria y champiñón en salsa ligera de ostión.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
];

export const DEFAULT_CHINESE_MAINS: ComboMainDishOption[] = [
  {
    id: 'main-pollo-naranja',
    name: 'Pollo Naranja Crujiente',
    description: 'Trozos dorados de pechuga glaseados con nuestra salsa agridulce de naranja natural.',
    image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
  {
    id: 'main-res-brocoli',
    name: 'Res con Brócoli Tradicional',
    description: 'Finas láminas de res tierna salteadas con brócoli fresco en salsa oscura de soya y jengibre.',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
  {
    id: 'main-pollo-kungpao',
    name: 'Pollo Kung Pao Picantito',
    description: 'Pollo marinado con cacahuates dorados, chiles secos de árbol y pimiento verde.',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
    isSpicy: true,
  },
  {
    id: 'main-costillas-bbq',
    name: 'Costillitas BBQ Cantonesas',
    description: 'Costillitas de cerdo suaves bañadas en reducción agridulce oriental caramelizada.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
  {
    id: 'main-pollo-teriyaki',
    name: 'Pollo Teriyaki con Ajonjolí',
    description: 'Pechuga a la plancha caramelizada en salsa teriyaki dulce con semillas de ajonjolí.',
    image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
  {
    id: 'main-cerdo-agridulce',
    name: 'Cerdo Agridulce Imperial',
    description: 'Cubos crujientes de lomo de cerdo con piña en almíbar, pimiento morrón y cebolla.',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
  {
    id: 'main-camarones-wok',
    name: 'Camarones al Wok Especiales',
    description: 'Camarones grandes salteados con verduras frescas de temporada en salsa oriental blanca.',
    image: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=600&auto=format&fit=crop&q=80',
    priceExtra: 20, // +$20 extra
  },
  {
    id: 'main-pollo-champinon',
    name: 'Pollo con Champiñones',
    description: 'Pechuga rebanada con champiñones frescos y calabaza en salsa de ostión aromática.',
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80',
    priceExtra: 0,
  },
];

export const ComboBuilderModal: React.FC<ComboBuilderModalProps> = ({
  dish,
  restaurant,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  // Inferir número de guisados permitidos si no viene en config (ej. "Platillo 2 Guisados" -> 2)
  const inferredMaxGuisados = useMemo(() => {
    if (dish.comboConfig?.maxGuisados) return dish.comboConfig.maxGuisados;
    const lower = dish.name.toLowerCase();
    if (lower.includes('1 guisado') || lower.includes('un guisado')) return 1;
    if (lower.includes('2 guisados') || lower.includes('dos guisados')) return 2;
    if (lower.includes('3 guisados') || lower.includes('tres guisados')) return 3;
    if (lower.includes('4 guisados') || lower.includes('cuatro guisados')) return 4;
    return 2; // Por defecto combo de 2 guisados
  }, [dish]);

  const sideOptions = dish.comboConfig?.sideOptions && dish.comboConfig.sideOptions.length > 0
    ? dish.comboConfig.sideOptions
    : DEFAULT_CHINESE_SIDES;

  const mainDishOptions = dish.comboConfig?.mainDishOptions && dish.comboConfig.mainDishOptions.length > 0
    ? dish.comboConfig.mainDishOptions
    : DEFAULT_CHINESE_MAINS;

  // Estados de selección del cliente
  const [selectedSideId, setSelectedSideId] = useState<string>(sideOptions[0]?.id || '');
  const [selectedGuisadosMap, setSelectedGuisadosMap] = useState<Record<string, number>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const backdropHandlers = useBackdropClose(isOpen, onClose);

  if (!isOpen) return null;

  // Conteo total de guisados seleccionados
  const totalGuisadosCount = Object.values(selectedGuisadosMap).reduce((sum, qty) => sum + qty, 0);
  const remainingGuisados = inferredMaxGuisados - totalGuisadosCount;
  const isComboComplete = selectedSideId && totalGuisadosCount === inferredMaxGuisados;

  // Calcular precio total incluyendo posibles recargos (ej. camarones)
  const extraFees = Object.entries(selectedGuisadosMap).reduce((sum, [mainId, qty]) => {
    const mainObj = mainDishOptions.find((m) => m.id === mainId);
    return sum + (mainObj?.priceExtra || 0) * qty;
  }, 0);

  const selectedSideObj = sideOptions.find((s) => s.id === selectedSideId);
  const sideExtra = selectedSideObj?.priceExtra || 0;
  const finalUnitPrice = dish.price + extraFees + sideExtra;

  // Manejo de incremento y decremento de guisados
  const handleAddGuisado = (mainId: string) => {
    if (totalGuisadosCount >= inferredMaxGuisados) return;
    setSelectedGuisadosMap((prev) => ({
      ...prev,
      [mainId]: (prev[mainId] || 0) + 1,
    }));
  };

  const handleRemoveGuisado = (mainId: string) => {
    setSelectedGuisadosMap((prev) => {
      const current = prev[mainId] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[mainId];
        return copy;
      }
      return { ...prev, [mainId]: current - 1 };
    });
  };

  const handleConfirmAddToCart = () => {
    if (!isComboComplete) return;

    // Resumen estructurado para ticket y cocina
    const mainDishesList = Object.entries(selectedGuisadosMap).map(([mainId, qty]) => {
      const mainObj = mainDishOptions.find((m) => m.id === mainId);
      return {
        name: mainObj?.name || 'Guisado',
        quantity: qty,
      };
    });

    const guisadosSummaryText = mainDishesList
      .map((g) => `${g.quantity}x ${g.name}`)
      .join(', ');

    const fullDescription = `Base: ${selectedSideObj?.name} | Guisados: ${guisadosSummaryText}${
      specialInstructions.trim() ? ` [Nota: ${specialInstructions.trim()}]` : ''
    }`;

    const orderItem: OrderItem = {
      id: `${dish.id}-combo-${Date.now()}`,
      name: `${dish.name} (${inferredMaxGuisados} Guisados)`,
      price: finalUnitPrice,
      quantity: 1,
      notes: fullDescription,
      customizations: [
        `Base: ${selectedSideObj?.name}`,
        ...mainDishesList.map((g) => `${g.quantity}x ${g.name}`),
      ],
      comboDetails: {
        sideName: selectedSideObj?.name || 'Guarnición',
        mainDishes: mainDishesList,
      },
    };

    onAddToCart(orderItem);
    onClose();
  };

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#0c1017] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Platillo */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ed0718] flex items-center justify-center font-black text-white shadow-md">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  {dish.name}
                </h3>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400/30">
                  {inferredMaxGuisados} {inferredMaxGuisados === 1 ? 'GUISADO' : 'GUISADOS'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {restaurant.name} · Selecciona 1 guarnición y {inferredMaxGuisados} guisados a tu gusto
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso de selección */}
        <div className={`p-3 text-xs font-bold flex items-center justify-between border-b transition-colors shrink-0 ${
          isComboComplete
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ed0718]" />
            <span>
              {isComboComplete ? (
                '¡Platillo listo para ordenar!'
              ) : (
                `Elige tu guarnición y ${remainingGuisados} guisado${remainingGuisados === 1 ? '' : 's'} más`
              )}
            </span>
          </div>
          <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-white dark:bg-black/40 border">
            {totalGuisadosCount} de {inferredMaxGuisados} guisados
          </span>
        </div>

        {/* Contenido scrollable de selección */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-6 text-xs flex-1">
          
          {/* ================= PASO 1: SELECCIONA TU GUARNICIÓN ================= */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#101b29] text-white flex items-center justify-center text-[10px]">1</span>
                  Paso 1: Selecciona tu Guarnición (Base)
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Elige 1 opción como cama para tus guisados
                </p>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                1 Requerida
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sideOptions.map((side) => {
                const isSelected = selectedSideId === side.id;
                return (
                  <div
                    key={side.id}
                    onClick={() => setSelectedSideId(side.id)}
                    className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition p-2.5 flex gap-3 items-center ${
                      isSelected
                        ? 'border-[#ed0718] bg-red-50/50 dark:bg-red-950/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <img
                      src={side.image}
                      alt={side.name}
                      className="w-18 h-18 rounded-xl object-cover shrink-0 shadow-xs"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-xs font-black text-gray-900 dark:text-white truncate">
                          {side.name}
                        </strong>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-[#ed0718] border-[#ed0718] text-white' : 'border-gray-300 bg-white dark:bg-gray-800'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {side.description}
                      </p>
                      {side.priceExtra ? (
                        <span className="text-[10px] font-bold text-red-600 block mt-1">
                          +${side.priceExtra.toFixed(2)} MXN
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                          Incluido
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= PASO 2: SELECCIONA TUS GUISADOS ================= */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#101b29] text-white flex items-center justify-center text-[10px]">2</span>
                  Paso 2: Selecciona tus Guisados ({totalGuisadosCount}/{inferredMaxGuisados})
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Puedes elegir guisados diferentes o repetir el mismo si deseas
                </p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                totalGuisadosCount === inferredMaxGuisados
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {totalGuisadosCount === inferredMaxGuisados ? 'Completo ✓' : `Faltan ${remainingGuisados}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mainDishOptions.map((main) => {
                const count = selectedGuisadosMap[main.id] || 0;
                const canAddMore = totalGuisadosCount < inferredMaxGuisados;

                return (
                  <div
                    key={main.id}
                    className={`rounded-2xl border-2 transition p-3 flex gap-3 items-center ${
                      count > 0
                        ? 'border-[#ed0718] bg-red-50/40 dark:bg-red-950/20 shadow-xs'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={main.image}
                        alt={main.name}
                        className="w-18 h-18 rounded-xl object-cover shadow-xs"
                        loading="lazy"
                      />
                      {count > 0 && (
                        <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-[#ed0718] text-white font-black text-xs flex items-center justify-center shadow-md">
                          {count}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <strong className="text-xs font-black text-gray-900 dark:text-white truncate">
                          {main.name}
                        </strong>
                        {main.isSpicy && (
                          <span title="Picantito" className="text-xs shrink-0">🌶️</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {main.description}
                      </p>
                      {main.priceExtra ? (
                        <span className="text-[10px] font-bold text-red-600 block mt-0.5">
                          +${main.priceExtra.toFixed(2)} MXN
                        </span>
                      ) : null}

                      {/* Contador de Guisado */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-500 font-semibold">
                          {count > 0 ? `${count} porción${count > 1 ? 'es' : ''}` : 'Sin seleccionar'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {count > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGuisado(main.id)}
                              className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white flex items-center justify-center transition cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={!canAddMore}
                            onClick={() => handleAddGuisado(main.id)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer ${
                              canAddMore
                                ? 'bg-[#ed0718] hover:bg-red-700 text-white shadow-xs'
                                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notas especiales para la cocina */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
              Instrucciones especiales para tu platillo (Opcional):
            </label>
            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Ej. Salsa agridulce y soya extra, sin cebollín..."
              className="w-full p-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
            />
          </div>
        </div>

        {/* Pie con Resumen y Botón de Agregar */}
        <div className="p-4 bg-gray-50 dark:bg-[#080b10] border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block uppercase font-bold">
              Total del Platillo:
            </span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-lg sm:text-xl font-black font-mono text-[#ed0718]">
                ${finalUnitPrice.toFixed(2)} MXN
              </strong>
              {extraFees > 0 && (
                <span className="text-[10px] text-gray-500 font-medium">
                  (Incluye +${extraFees} en especialidades)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={!isComboComplete}
              onClick={handleConfirmAddToCart}
              className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer ${
                isComboComplete
                  ? 'bg-[#ed0718] hover:bg-red-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {isComboComplete
                  ? `Agregar al Carrito ($${finalUnitPrice.toFixed(2)})`
                  : `Faltan guisados (${totalGuisadosCount}/${inferredMaxGuisados})`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
