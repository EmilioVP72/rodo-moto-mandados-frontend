import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'es' | 'en';

const STORAGE_KEY = 'rodo_language';

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  es: {
    deliverTo: 'Entregar en:',
    menu: 'Menú',
    share: 'Compartir',
    developer: 'Programador',
    tabRestaurants: 'Restaurantes',
    tabMotomandados: 'Mandados',
    tabEnvios: 'Envíos',
    searchRestaurants: 'Buscar restaurantes o platillos...',
    searchMotomandados: 'Buscar farmacia, súper, tiendas...',
    searchEnvios: 'Buscar paquetes o mandados...',
    heroTag: 'RODO · SAN MIGUEL',
    heroTitleRestaurants: 'Tu comida favorita a un clic',
    heroTitleMoto: 'Todo lo que necesitas en tu puerta',
    heroTitleEnvios: 'Envíos rápidos en moto',
    heroSubFood: 'Los mejores locales de la zona directo a tu domicilio.',
    heroSubEnvios: 'Paquetes, compras y documentos con tarifa clara.',
    orderNow: 'Pedir ahora →',
    whatDoYouCrave: '¿Qué se te antoja hoy?',
    motoAndStalls: 'Mandados y comercios',
    viewAll: 'Ver todo ›',
    viewAllCatalog: 'Ver todos ›',
    sortLabel: 'Ordenar:',
    sortFeatured: 'Destacados',
    sortFastest: 'Más rápido',
    sortRating: 'Mejor valorado',
    sortCheapest: 'Menor envío',
    sortDistance: 'Más cercanos',
    openNow: 'Abiertos',
    favoritesOnly: 'Favoritos',
    priceLabel: 'Precio:',
    priceAll: 'Todo',
    placesCount: 'locales',
    noEstablishments: 'No hay establecimientos en esta categoría.',
    viewMenuOrder: 'Ver menú',
    viewMenuPaused: 'Ver menú (pausado)',
    customOrderBtn: 'Pedido personalizado',
    helpOrder: 'Ayuda',
    helpSub: 'Soporte RODO',
    myOrders: 'Mis pedidos',
    myOrdersSub: 'Ver tickets',
    sendPackage: 'Enviar paquete',
    sendPackageSub: 'Paquetes y mandados',
    coverageRodo: 'Cobertura',
    coverageSub: 'Ver mapa y ubicación',
    addedToCart: 'Agregado al carrito',
    viewCart: 'Ver carrito',
    orderHistoryTitle: 'Mis pedidos',
    filterAll: 'Todos',
    filterOnWay: 'En camino',
    filterDelivered: 'Entregado',
    filterCancelled: 'Cancelado',
    viewTicket: 'Ver ticket',
    liveTrack: 'Rastrear',
    reorder: 'Volver a pedir',
    confirmReceived: 'Confirmar recibido',
    confirmSignature: 'Firma o foto',
    deliveryProofSaved: 'Evidencia guardada',
    liveTrackingTitle: 'Ubicación del repartidor',
    rateOrderTitle: 'Califica tu pedido',
    promoCodePlaceholder: 'Ej. RODO10 o ENVIOGRATIS',
    applyPromo: 'Aplicar',
    allergiesPlaceholder: 'Alergias o notas (ej. Sin cebolla)',
    closedBlockTitle: 'Local cerrado temporalmente',
    geofenceBlockTitle: 'Fuera de zona de cobertura',
  },
  en: {
    deliverTo: 'Deliver to:',
    menu: 'Menu',
    share: 'Share',
    developer: 'Developer',
    tabRestaurants: 'Restaurants',
    tabMotomandados: 'Errands',
    tabEnvios: 'Delivery',
    searchRestaurants: 'Search restaurants or dishes...',
    searchMotomandados: 'Search pharmacy, groceries, shops...',
    searchEnvios: 'Search packages or documents...',
    heroTag: 'RODO · SAN MIGUEL',
    heroTitleRestaurants: 'Your favorite food one click away',
    heroTitleMoto: 'Everything you need at your door',
    heroTitleEnvios: 'Fast local moto delivery',
    heroSubFood: 'Top local spots delivered straight to your door.',
    heroSubEnvios: 'Packages, shopping & documents with clear rates.',
    orderNow: 'Order now →',
    whatDoYouCrave: 'What are you craving?',
    motoAndStalls: 'Errands & local shops',
    viewAll: 'See all ›',
    viewAllCatalog: 'View all ›',
    sortLabel: 'Sort:',
    sortFeatured: 'Featured',
    sortFastest: 'Fastest',
    sortRating: 'Top rated',
    sortCheapest: 'Lowest fee',
    sortDistance: 'Nearest',
    openNow: 'Open now',
    favoritesOnly: 'Favorites',
    priceLabel: 'Price:',
    priceAll: 'All',
    placesCount: 'places',
    noEstablishments: 'No places found in this category.',
    viewMenuOrder: 'View menu',
    viewMenuPaused: 'View menu (paused)',
    customOrderBtn: 'Custom request',
    helpOrder: 'Support',
    helpSub: 'RODO Helpdesk',
    myOrders: 'My orders',
    myOrdersSub: 'View tickets',
    sendPackage: 'Send package',
    sendPackageSub: 'Packages & errands',
    coverageRodo: 'Coverage',
    coverageSub: 'View map & pin',
    addedToCart: 'Added to cart',
    viewCart: 'View cart',
    orderHistoryTitle: 'My orders',
    filterAll: 'All',
    filterOnWay: 'On the way',
    filterDelivered: 'Delivered',
    filterCancelled: 'Cancelled',
    viewTicket: 'View ticket',
    liveTrack: 'Track live',
    reorder: 'Order again',
    confirmReceived: 'Confirm received',
    confirmSignature: 'Signature / Photo',
    deliveryProofSaved: 'Delivery proof saved',
    liveTrackingTitle: 'Live rider tracking',
    rateOrderTitle: 'Rate your order',
    promoCodePlaceholder: 'e.g. RODO10 or ENVIOGRATIS',
    applyPromo: 'Apply',
    allergiesPlaceholder: 'Allergies or notes (e.g. No onion)',
    closedBlockTitle: 'Temporarily closed',
    geofenceBlockTitle: 'Outside coverage area',
  },
};

export function getSavedLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {}
  return 'es';
}

export function saveLanguage(lang: LanguageCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

export function translate(lang: LanguageCode, key: string): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.es[key] || key;
}

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'es',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => translate('es', key),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LanguageCode>(getSavedLanguage);

  useEffect(() => {
    saveLanguage(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: LanguageCode) => setLangState(next);
  const toggleLang = () => setLangState((prev) => (prev === 'es' ? 'en' : 'es'));
  const t = (key: string) => translate(lang, key);

  return React.createElement(
    LanguageContext.Provider,
    { value: { lang, setLang, toggleLang, t } },
    children
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
