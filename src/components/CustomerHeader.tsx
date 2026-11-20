import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, Bell, Menu, Moon, Sun, Globe, X, Store, Tag, Utensils, User, ShieldCheck } from 'lucide-react';
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
  isAdminLoggedIn?: boolean;
  onOpenAccount?: () => void;
  onOpenLocationModal?: () => void;
  currentAddressLabel?: string;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  holidayThemeId?: HolidayThemeId;
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
  isAdminLoggedIn = false,
  onOpenAccount,
  onOpenLocationModal,
  currentAddressLabel,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
  holidayThemeId = 'clasico_rodo',
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
      className={`text-white px-3 sm:px-8 pt-safe pb-4 sm:pb-6 shadow-lg transition-colors border-b ${
        isDarkMode
          ? 'bg-gradient-to-r ' + currentTheme.gradientHeader + ' dark:border-red-900/40'
          : 'bg-gradient-to-r ' + currentTheme.gradientHeader + ' border-black/10'
      }`}
    >
      {/* Banner temático festivo activo */}
      {isCustomTheme && (
        <div className="max-w-6xl mx-auto mb-2">
          <div className="bg-black/35 backdrop-blur-xs border border-white/25 rounded-xl px-2.5 sm:px-3 py-1 flex items-center justify-between text-xs font-bold text-white shadow-xs">
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-sm shrink-0">{currentTheme.iconEmoji}</span>
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

      {/* Barra superior responsiva Mobile-First */}
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Abrir menú de servicios y cuenta"
          className="bg-white/15 dark:bg-white/10 hover:bg-white/25 active:scale-95 text-white p-2 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl transition flex items-center justify-center gap-2 text-xs font-black border border-white/20 shadow-xs cursor-pointer shrink-0 min-h-[40px] min-w-[40px]"
        >
          <Menu className="w-5 h-5 text-white shrink-0" />
          <span className="hidden sm:inline">{t('menu')}</span>
        </button>

        {/* Marca RODO con el Logotipo Oficial */}
        <div className="flex items-center gap-2 sm:gap-3 bg-[#ef0013]/90 dark:bg-red-950/80 px-2.5 py-1.5 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl shadow-[0_7px_20px_#8d000b55] select-none border border-white/20 min-w-0 shrink">
          <img
            src="/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg"
            alt="RODO Moto Mandados"
            className="h-8 w-8 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl object-cover shadow-xs border border-white/40 shrink-0"
          />
          <div className="text-left leading-none min-w-0">
            <b className="block text-lg sm:text-3xl tracking-wider font-black font-sans text-white drop-shadow-xs">
              RODO
            </b>
            <span className="font-black text-[8px] sm:text-[11px] tracking-widest text-white/95 block truncate">
              MOTO MANDADOS
            </span>
          </div>
        </div>

        {/* Acciones superiores limpias para producción (sin botones de Compartir / Programador) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Pill de Estado de Sesión / Cuenta */}
          {onOpenAccount && (
            <button
              type="button"
              onClick={onOpenAccount}
              aria-label={
                isAdminLoggedIn
                  ? 'Abrir Panel de Administrador'
                  : userName
                  ? `Abrir perfil de ${userName}`
                  : 'Iniciar sesión o registrarse'
              }
              title={
                isAdminLoggedIn
                  ? 'Sesión de Administrador Activa'
                  : userName
                  ? `Sesión iniciada como ${userName} · Toca para ver tu perfil`
                  : 'Iniciar sesión o crear tu cuenta'
              }
              className={`px-2.5 sm:px-3 py-2 rounded-xl sm:rounded-2xl transition border active:scale-95 cursor-pointer flex items-center gap-1.5 text-[11px] sm:text-xs font-black shadow-xs min-h-[40px] ${
                isAdminLoggedIn
                  ? 'bg-amber-400 hover:bg-amber-300 text-black border-amber-200'
                  : userName
                  ? 'bg-emerald-600/95 hover:bg-emerald-500 text-white border-emerald-300/60'
                  : 'bg-white text-[#101b29] hover:bg-gray-100 border-white/80'
              }`}
            >
              {isAdminLoggedIn ? (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="max-w-[64px] sm:max-w-[80px] truncate">Admin</span>
                </>
              ) : userName ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse shrink-0" />
                  <span className="max-w-[68px] sm:max-w-[96px] truncate">{userName.split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 shrink-0 text-[#ed0718]" />
                  <span>{lang === 'en' ? 'Sign In' : 'Entrar'}</span>
                </>
              )}
            </button>
          )}

          {/* Selector de Idioma Español / Inglés (visible en sm+, en móvil disponible dentro de Menú) */}
          <button
            type="button"
            onClick={toggleLang}
            aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            title={lang === 'es' ? 'Switch language to English' : 'Cambiar idioma a Español'}
            className="hidden sm:flex bg-white/15 dark:bg-slate-800 hover:bg-white/25 text-white px-2.5 py-2 rounded-2xl transition border border-white/20 active:scale-95 cursor-pointer items-center gap-1 text-[11px] font-black min-h-[40px]"
          >
            <Globe className="w-4 h-4 text-amber-300" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Botón de Modo Obscuro / Claro */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Obscuro'}
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Obscuro'}
              className="hidden sm:flex bg-white/15 dark:bg-slate-800 hover:bg-white/25 text-white p-2.5 rounded-2xl transition border border-white/20 active:scale-95 cursor-pointer items-center justify-center min-h-[40px] min-w-[40px]"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-300" />
              ) : (
                <Moon className="w-5 h-5 text-white" />
              )}
            </button>
          )}

          {/* Botón Centro de Notificaciones con Badge dinámico */}
          <button
            onClick={onOpenNotifications || onOpenMenu}
            aria-label="Centro de notificaciones"
            title="Centro de notificaciones y alertas en vivo"
            className="bg-white/15 dark:bg-slate-800 hover:bg-white/25 text-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition border border-white/15 relative active:scale-95 cursor-pointer flex items-center justify-center min-h-[40px] min-w-[40px]"
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
      <div className="max-w-6xl mx-auto mt-3 sm:mt-4 space-y-2.5 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="w-full sm:w-auto flex items-center gap-2 text-xs text-white/95 bg-black/20 hover:bg-black/30 border border-white/20 px-3 py-2 rounded-xl transition text-left cursor-pointer group min-h-[42px]"
            title="Toca para afinar tu ubicación exacta o ajustar ±30m"
          >
            <MapPin className="w-4 h-4 text-amber-300 shrink-0 group-hover:scale-110 transition" />
            <div className="leading-tight min-w-0 flex-1">
              <span className="text-[10px] text-white/80 block">{t('deliverTo')}</span>
              <strong className="text-white font-extrabold text-xs line-clamp-1 underline decoration-dotted underline-offset-2">
                {currentAddressLabel ||
                  (userName
                    ? 'Agregar o seleccionar dirección de entrega'
                    : 'Elige tu dirección en San Miguel de Allende')}{' '}
                ⌄
              </strong>
            </div>
          </button>

          {/* Barra de búsqueda + Dropdown Autocompletar */}
          <div ref={searchWrapperRef} className="relative w-full sm:max-w-md z-30">
            <label className="flex items-center gap-2 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-[0_5px_18px_#83000c22] w-full border border-transparent dark:border-slate-800 transition-colors min-h-[42px]">
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
                className="w-full text-sm bg-transparent outline-none font-medium placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Limpiar búsqueda"
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>

            {searchFocused && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
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

        {/* Selector de Pestañas Principales (3 tabs táctiles y compactas en móvil) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5" role="tablist">
          <button
            onClick={() => onSectionChange('restaurantes')}
            className={`py-2.5 sm:py-3 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-extrabold transition shadow-xs cursor-pointer leading-tight truncate ${
              activeSection === 'restaurantes'
                ? 'bg-[#ed0718] text-white border-2 border-white shadow-[0_8px_18px_#85000b40]'
                : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-white/60 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('tabRestaurants')}
          </button>

          <button
            onClick={() => onSectionChange('motomandados')}
            className={`py-2.5 sm:py-3 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-extrabold transition shadow-xs cursor-pointer leading-tight truncate ${
              activeSection === 'motomandados'
                ? 'bg-[#ed0718] text-white border-2 border-white shadow-[0_8px_18px_#85000b40]'
                : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-white/60 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('tabMotomandados')}
          </button>

          <button
            onClick={() => onSectionChange('envios')}
            className={`py-2.5 sm:py-3 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-extrabold transition shadow-xs cursor-pointer leading-tight truncate ${
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
