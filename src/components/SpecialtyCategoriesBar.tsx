import React from 'react';
import { SpecialtyCategory } from '../types';

interface SpecialtyCategoriesBarProps {
  categories: SpecialtyCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryName: string | null) => void;
}

// Iconos estilizados y detallados que emulan el estilo gráfico de Uber Eats
export const SPECIALTY_VISUAL_ICONS: Record<string, { emoji: string; bgGradient: string }> = {
  super: {
    emoji: '🧺',
    bgGradient: 'from-emerald-50 to-teal-100/60',
  },
  pizza: {
    emoji: '🍕',
    bgGradient: 'from-amber-50 to-orange-100/60',
  },
  desayuno: {
    emoji: '🥞',
    bgGradient: 'from-yellow-50 to-amber-100/60',
  },
  pollo: {
    emoji: '🍗',
    bgGradient: 'from-orange-50 to-amber-100/60',
  },
  hamburguesa: {
    emoji: '🍔',
    bgGradient: 'from-amber-50 to-red-100/60',
  },
  tacos: {
    emoji: '🌮',
    bgGradient: 'from-amber-50 to-yellow-100/60',
  },
  mariscos: {
    emoji: '🦐',
    bgGradient: 'from-sky-50 to-cyan-100/60',
  },
  pan: {
    emoji: '🥖',
    bgGradient: 'from-amber-50 to-stone-100/60',
  },
  tienda: {
    emoji: '🏪',
    bgGradient: 'from-blue-50 to-indigo-100/60',
  },
  farmacia: {
    emoji: '💊',
    bgGradient: 'from-rose-50 to-red-100/60',
  },
  flores: {
    emoji: '💐',
    bgGradient: 'from-pink-50 to-purple-100/60',
  },
  personalizado: {
    emoji: '⭐',
    bgGradient: 'from-amber-50 to-yellow-100/60',
  },
};

export const SpecialtyCategoriesBar: React.FC<SpecialtyCategoriesBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const activeCategories = categories.filter((c) => c.active !== false);

  if (activeCategories.length === 0) return null;

  return (
    <div className="w-full bg-white py-3 border-b border-gray-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-gray-500">
            Especialidades & Categorías
          </span>
          {selectedCategory && (
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="text-[11px] font-bold text-[#ed0718] hover:underline cursor-pointer"
            >
              ✕ Mostrar todos
            </button>
          )}
        </div>

        {/* Carrusel horizontal con scroll suave y estilo visual de Uber Eats */}
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {activeCategories.map((cat) => {
            const isSelected = selectedCategory?.toLowerCase() === cat.name.toLowerCase();
            const visual = SPECIALTY_VISUAL_ICONS[cat.iconType] || {
              emoji: '🍽️',
              bgGradient: 'from-gray-50 to-gray-100',
            };

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onSelectCategory(null);
                  } else {
                    onSelectCategory(cat.name);
                  }
                }}
                className={`group flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer select-none focus:outline-hidden ${
                  isSelected ? 'scale-105' : 'hover:scale-105'
                }`}
                title={cat.description || cat.name}
              >
                {/* Cuadro de Icono grande con sombra suave */}
                <div
                  className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-xs transition-all border ${
                    isSelected
                      ? 'bg-amber-100 border-[#ed0718] ring-2 ring-[#ed0718]/40 shadow-md'
                      : `bg-linear-to-b ${visual.bgGradient} border-gray-200/80 group-hover:border-gray-300 group-hover:shadow-sm`
                  }`}
                >
                  <span className="transform transition-transform group-hover:scale-110">
                    {visual.emoji}
                  </span>
                </div>

                {/* Etiqueta de la Categoría */}
                <span
                  className={`text-xs text-center font-bold tracking-tight max-w-[76px] truncate transition-colors ${
                    isSelected
                      ? 'text-[#ed0718] font-black'
                      : 'text-gray-800 group-hover:text-black font-semibold'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
