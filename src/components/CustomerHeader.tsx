import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, Bell, Menu, Share2, Moon, Sun, Code2, Globe, X, Store, Tag, Utensils } from 'lucide-react';
import { HolidayThemeId, Restaurant } from '../types';
import { getHolidayTheme } from '../utils/themeManager';
import { useLanguage } from '../utils/i18n';

interface CustomerHeaderProps {
  activeSection: 'restaurantes' | 'motomandados' | 'envios';
  onSectionChange: (section: 'restaurantes' | 'motomandados' | 'envios') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMenu: () => void;
  userName?: string;
  onOpenLocationModal?: () => void;
  currentAddressLabel?: string;
  onShareApp?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  holidayThemeId?: HolidayThemeId;
  onOpenDeveloperModal?: () => void;
  restaurants?: Restaurant[];
  onSelectSuggestionRestaurant?: (restaurant: Restaurant) => void;
  onSelectSuggestionCategory?: (category: string, section: 'restaurantes' | 'motomandados') => void;
}

interface SearchSuggestion {
  id: string;
  type: 'restaurant' | 'dish' | 'category';
  label: string;
  sublabel: string;
  restaurant?: Restaurant;
  category?: string;
  section?: 'restaurantes' | 'motomandados';
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  activeSection,
  onSectionChange,
  searchQuery,
  onSearchChange,
  onOpenMenu,
  userName,
  onOpenLocationModal,
  currentAddressLabel,
  onShareApp,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
  holidayThemeId = 'clasico_rodo',
  onOpenDeveloperModal,
  restaurants = [],
  onSelectSuggestionRestaurant,
  onSelectSuggestionCategory,
}) => {
  const { lang, toggleLang, t } = useLanguage();
  const [searchFocused, setSearchFocused] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);

  const currentTheme = getHolidayTheme(holidayThemeId);
  const isCustomTheme = holidayThemeId && holidayThemeId !== 'clasico_rodo';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const results: SearchSuggestion[] = [];
    const seen = new Set<string>();

    restaurants.forEach((r) => {
      if (!r.isActive) return;
      const section: 'restaurantes' | 'motomandados' =
        r.establishmentType === 'motomandado' ? 'motomandados' : 'restaurantes';

      if (
        r.name.toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        (r.tags || []).some((tag) => tag.toLowerCase().includes(q))
      ) {
        if (!seen.has(`rest-${r.id}`)) {
          seen.add(`rest-${r.id}`);
          results.push({
            id: `rest-${r.id}`,
            type: 'restaurant',
            label: r.name,
            sublabel: `${r.category} · ${r.time} · $${r.deliveryFee} MXN`,
            restaurant: r,
            section,
          });
        }
      }

      if (r.category && r.category.toLowerCase().includes(q) && !seen.has(`cat-${r.category}`)) {
        seen.add(`cat-${r.category}`);
        results.push({
          id: `cat-${r.category}`,
          type: 'category',
          label: r.category,
          sublabel: section === 'motomandados' ? 'Motomandados & Esenciales' : 'Restaurantes',
          category: r.category,
          section,
        });
      }

      (r.menu || []).forEach((m) => {
        if (m.name.toLowerCase().includes(q) && results.length < 10 && !seen.has(`dish-${r.id}-${m.id}`)) {
          seen.add(`dish-${r.id}-${m.id}`);
          results.push({
            id: `dish-${r.id}-${m.id}`,
            type: 'dish',
            label: m.name,
            sublabel: `${r.name} · $${m.price} MXN`,
            restaurant: r,
            section,
          });
        }
      });
    });

    return results.slice(0, 7);
  }, [searchQuery, restaurants]);

  return (
    <header
      className={`text-white px-4 sm:px-8 pt-3 pb-6 shadow-lg transition-colors border-b ${
        isDarkMode
          ? 'bg-gradient-to-r ' + currentTheme.gradientHeader + ' dark:border-red-900/40'
          : 'bg-gradient-to-r ' + currentTheme.gradientHeader + ' border-black/10'
      }`}
    >
      {/* Banner temático festivo activo */}
      {isCustomTheme && (
        <div className="max-w-6xl mx-auto mb-2.5">
          <div className="bg-black/35 backdrop-blur-xs border border-white/25 rounded-xl px-3 py-1 flex items-center justify-between text-xs font-bold text-white shadow-xs">
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-sm">{currentTheme.iconEmoji}</span>
              <span className="text-amber-300 uppercase tracking-wider text-[10px] font-black shrink-0">
                {currentTheme.name}:
              </span>
              <span className="truncate text-white/95 text-[11px]">
                {currentTheme.bannerGreeting}
              </span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full shrink-0">
              {currentTheme.seasonLabel}
            </span>
          </div>
        </div>
      )}

      {/* Barra superior con marca y recuadro de menú superior izquierdo */}
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Abrir menú de servicios y cuenta"
          className="bg-white/15 dark:bg-white/10 hover:bg-white/25 active:scale-95 text-white px-3 py-2 rounded-2xl transition flex items-center gap-2 text-xs font-black border border-white/20 shadow-xs cursor-pointer"
        >
          <Menu className="w-5 h-5 text-white" />
          <span className="hidden xs:inline">{userName ? userName.split(' ')[0] : t('menu')}</span>
        </button>

        {/* Marca RODO con el Logotipo Oficial */}
        <div className="flex items-center gap-2 sm:gap-3 bg-[#ef0013]/90 dark:bg-red-950/80 px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-2xl shadow-[0_7px_20px_#8d000b55] select-none border border-white/20">
          <img
            src="/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg"
            alt="RODO Moto Mandados"
            className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl object-cover shadow-xs border border-white/40 shrink-0"
          />
          <div className="text-left leading-none">
            <b className="block text-xl sm:text-3xl tracking-wider font-black font-sans text-white drop-shadow-xs">
              RODO
            </b>
            <span className="font-black text-[9px] sm:text-[11px] tracking-widest text-white/95">
              MOTO MANDADOS
            </span>
          </div>
        </div>

        {/* Acciones superiores: Selector de Idioma ES/EN, Modo Obscuro, Compartir y Notificaciones */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Selector de Idioma Español / Inglés */}
          <button
            type="button"
            onClick={toggleLang}
            aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            title={lang === 'es' ? 'Switch language to English' : 'Cambiar idioma a Español'}
            className="bg-white/15 dark:bg-slate-800 hover:bg-white/25 text-white px-2.5 py-2 rounded-2xl transition border border-white/20 active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-black"
          >
            <Globe className="w-4 h-4 text-amber-300" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Botón de Modo Obscuro / Claro */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Obscuro'}
              className="bg-white/15 dark:bg-slate-800 hover:bg-white/25 text-white p-2.5 rounded-2xl transition border border-white/20 active:scale-95 cursor-pointer"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-300" />
              ) : (
                <Moon className="w-5 h-5 text-white" />
              )}
            </button>
          )}

          {onShareApp && (
            <button
              onClick={onShareApp}
              aria-label="Compartir app por WhatsApp"
              className="hidden sm:flex bg-emerald-600/90 hover:bg-emerald-600 active:scale-95 text-white px-3 py-2 rounded-2xl transition items-center gap-1.5 text-xs font-black border border-emerald-400/40 shadow-xs cursor-pointer"
              title="Compartir por WhatsApp con clientes y amigos"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span className="hidden md:inline">{t('share')}</span>
            </button>
          )}

          {onOpenDeveloperModal && (
            <button
              onClick={onOpenDeveloperModal}
              aria-label="Entregar proyecto a Programador"
              title="Entregar proyecto a Programador (Código completo, ZIPs y Hosting)"
              className="hidden md:flex bg-indigo-600/90 hover:bg-indigo-600 active:scale-95 text-white px-2.5 sm:px-3 py-2 rounded-2xl transition items-center gap-1.5 text-xs font-black border border-indigo-400/40 shadow-xs cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-white" />
              <span>{t('developer')}</span>
            </button>
          )}

          {/* Botón Centro de Notificaciones con Badge dinámico */}
          <button
            onClick={onOpenNotifications || onOpenMenu}
            aria-label="Centro de notificaciones"
            title="Centro de notificaciones y alertas en vivo"
            className="bg-white/15 dark:bg-slate-800 hover:bg-white/25 text-white p-2.5 rounded-2xl transition border border-white/15 relative active:scale-95 cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-xs animate-bounce">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Selector de Ubicación y Barra de Búsqueda con Autocompletado en Tiempo Real */}
      <div className="max-w-6xl mx-auto mt-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="flex items-center gap-2 text-xs text-white/95 bg-black/20 hover:bg-black/30 border border-white/20 px-3 py-1.5 rounded-xl transition text-left cursor-pointer group"
            title="Toca para afinar tu ubicación exacta o ajustar ±30m"
          >
            <MapPin className="w-4 h-4 text-amber-300 shrink-0 group-hover:scale-110 transition" />
            <div className="leading-tight">
              <span className="text-[10px] text-white/80 block">{t('deliverTo')}</span>
              <strong className="text-white font-extrabold text-xs line-clamp-1 underline decoration-dotted underline-offset-2">
                {currentAddressLabel || 'Centro, San Miguel de Allende (Toca para afinar ±30m)'} ⌄
              </strong>
            </div>
          </button>

          {/* Barra de búsqueda + Dropdown Autocompletar */}
          <div ref={searchWrapperRef} className="relative w-full sm:max-w-md z-30">
            <label className="flex items-center gap-2 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 rounded-2xl px-4 py-2.5 shadow-[0_5px_18px_#83000c22] w-full border border-transparent dark:border-slate-800 transition-colors">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder={
                  activeSection === 'envios'
                    ? t('searchEnvios')
                    : activeSection === 'motomandados'
                    ? t('searchMotomandados')
                    : t('searchRestaurants')
                }
                className="w-full text-xs sm:text-sm bg-transparent outline-none font-medium placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Limpiar búsqueda"
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-0.5 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>

            {searchFocused && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-800">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSearchFocused(false);
                      if (item.type === 'category' && item.category && item.section) {
                        onSectionChange(item.section);
                        onSelectSuggestionCategory?.(item.category, item.section);
                        onSearchChange('');
                      } else if (item.restaurant) {
                        if (item.section) onSectionChange(item.section);
                        onSearchChange(item.restaurant.name);
                        onSelectSuggestionRestaurant?.(item.restaurant);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left hover:bg-red-50/70 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-slate-800 text-[#ed0718] flex items-center justify-center shrink-0">
                      {item.type === 'restaurant' ? (
                        <Store className="w-4 h-4" />
                      ) : item.type === 'category' ? (
                        <Tag className="w-4 h-4" />
                      ) : (
                        <Utensils className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold truncate">{item.label}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {item.sublabel}
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-[#ed0718] shrink-0">
                      {item.type === 'category'
                        ? lang === 'en'
                          ? 'Filter'
                          : 'Filtrar'
                        : lang === 'en'
                        ? 'Open'
                        : 'Abrir'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selector de Pestañas Principales (3 tabs) */}
        <div className="grid grid-cols-3 gap-2 pt-1" role="tablist">
          <button
            onClick={() => onSectionChange('restaurantes')}
            className={`py-3 px-2 rounded-2xl text-xs sm:text-sm font-extrabold transition shadow-xs cursor-pointer ${
              activeSection === 'restaurantes'
                ? 'bg-[#ed0718] text-white border-2 border-white shadow-[0_8px_18px_#85000b40]'
                : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-white/60 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('tabRestaurants')}
          </button>

          <button
            onClick={() => onSectionChange('motomandados')}
            className={`py-3 px-2 rounded-2xl text-xs sm:text-sm font-extrabold transition shadow-xs cursor-pointer ${
              activeSection === 'motomandados'
                ? 'bg-[#ed0718] text-white border-2 border-white shadow-[0_8px_18px_#85000b40]'
                : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-white/60 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('tabMotomandados')}
          </button>

          <button
            onClick={() => onSectionChange('envios')}
            className={`py-3 px-2 rounded-2xl text-xs sm:text-sm font-extrabold transition shadow-xs cursor-pointer ${
              activeSection === 'envios'
                ? 'bg-[#ed0718] text-white border-2 border-white shadow-[0_8px_18px_#85000b40]'
                : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-white/60 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('tabEnvios')}
          </button>
        </div>
      </div>
    </header>
  );
};
