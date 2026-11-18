import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'es' | 'en';

const STORAGE_KEY = 'rodo_language';

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  es: {
    deliverTo: 'Entregar en (San Miguel de Allende):',
    menu: 'Menú',
    share: 'Compartir',
    developer: 'Programador',
    tabRestaurants: '🍴 Restaurantes',
    tabMotomandados: '🏍 Motomandados',
    tabEnvios: '▣ Envíos Express',
    searchRestaurants: 'Buscar restaurantes, platillos, pizzas, tacos...',
    searchMotomandados: 'Buscar antojitos, farmacia, súper, tiendas...',
    searchEnvios: 'Buscar paquetes, flores o documentos...',
    heroTag: 'RODO · A TU PUERTA',
    heroTitleRestaurants: 'Tu comida favorita a un clic',
    heroTitleMoto: 'Todo lo que necesitas, hasta tu puerta',
    heroTitleEnvios: 'Envíos rápidos con repartidores locales',
    heroSubFood: 'Pide de los mejores locales de la zona. Asignación inmediata por WhatsApp.',
    heroSubEnvios: 'Paquetes, compras y documentos con tarifas claras y ticket digital.',
    orderNow: 'PIDE AHORA →',
    whatDoYouCrave: '¿Qué se te antoja hoy? (Restaurantes)',
    motoAndStalls: 'Motomandados, Comercios & Esenciales',
    viewAll: 'Ver todo ›',
    viewAllCatalog: 'Ver todos ›',
    sortLabel: 'Ordenar:',
    sortFeatured: 'Destacados',
    sortFastest: 'Más Rápido',
    sortRating: 'Mejor Calificado',
    sortCheapest: 'Menor Envío',
    sortDistance: 'Más Cercanos',
    openNow: 'Abierto Ahora',
    favoritesOnly: 'Solo Favoritos',
    priceLabel: 'Precio:',
    priceAll: 'Todo',
    placesCount: 'locales',
    noEstablishments: 'No hay establecimientos en esta categoría.',
    viewMenuOrder: 'Ver Menú & Pedir',
    viewMenuPaused: 'Ver Menú (Pedidos Pausados)',
    customOrderBtn: '✍️ Pide lo que se te antoje (Cotización RODO)',
    helpOrder: 'Ayuda con el Pedido',
    helpSub: 'Soporte RODO',
    myOrders: 'Mis Pedidos',
    myOrdersSub: 'Consultar tickets',
    sendPackage: 'Enviar Paquete',
    sendPackageSub: 'Flores, sobres, mandados',
    coverageRodo: 'Cobertura RODO',
    coverageSub: 'Ver mapa real y fijar mi punto ›',
    addedToCart: 'Agregado al carrito',
    viewCart: 'Ver carrito',
    orderHistoryTitle: 'Mis Pedidos & Tickets',
    filterAll: 'Todos',
    filterOnWay: 'En Camino',
    filterDelivered: 'Entregado',
    filterCancelled: 'Cancelado',
    viewTicket: 'Ver Ticket',
    liveTrack: '📍 Rastrear en Vivo',
    reorder: '🔄 Volver a pedir',
    confirmReceived: '✓ Confirmar Recibido',
    confirmSignature: '✍️ Confirmar Firma / Foto',
    deliveryProofSaved: '✓ Evidencia de entrega guardada',
    liveTrackingTitle: 'Rastreo en Vivo del Repartidor',
    rateOrderTitle: 'Califica tu Pedido RODO',
    promoCodePlaceholder: 'Ej. RODO10 o ENVIOGRATIS',
    applyPromo: 'Aplicar',
    allergiesPlaceholder: 'Alergias o notas (ej. Sin cebolla, alergia a nuez)',
    closedBlockTitle: 'Local Cerrado en Tiempo Real',
    geofenceBlockTitle: 'Fuera de Zona de Cobertura (San Miguel de Allende)',
  },
  en: {
    deliverTo: 'Deliver to (San Miguel de Allende):',
    menu: 'Menu',
    share: 'Share',
    developer: 'Developer',
    tabRestaurants: '🍴 Restaurants',
    tabMotomandados: '🏍 Errands & Shops',
    tabEnvios: '▣ Express Delivery',
    searchRestaurants: 'Search restaurants, dishes, pizza, tacos...',
    searchMotomandados: 'Search pharmacy, groceries, local stores...',
    searchEnvios: 'Search packages, flowers or documents...',
    heroTag: 'RODO · TO YOUR DOOR',
    heroTitleRestaurants: 'Your favorite food one click away',
    heroTitleMoto: 'Everything you need, right to your door',
    heroTitleEnvios: 'Fast deliveries with local riders',
    heroSubFood: 'Order from the best spots in town. Instant WhatsApp dispatch.',
    heroSubEnvios: 'Packages, shopping & documents with clear rates and live ticket.',
    orderNow: 'ORDER NOW →',
    whatDoYouCrave: 'What are you craving today? (Restaurants)',
    motoAndStalls: 'Errands, Essentials & Local Shops',
    viewAll: 'See all ›',
    viewAllCatalog: 'View all ›',
    sortLabel: 'Sort:',
    sortFeatured: 'Featured',
    sortFastest: 'Fastest',
    sortRating: 'Top Rated',
    sortCheapest: 'Lowest Fee',
    sortDistance: 'Nearest',
    openNow: 'Open Now',
    favoritesOnly: 'Favorites Only',
    priceLabel: 'Price:',
    priceAll: 'All',
    placesCount: 'places',
    noEstablishments: 'No establishments found in this category.',
    viewMenuOrder: 'View Menu & Order',
    viewMenuPaused: 'View Menu (Paused)',
    customOrderBtn: '✍️ Custom Request (RODO Quote)',
    helpOrder: 'Order Support',
    helpSub: 'RODO Helpdesk',
    myOrders: 'My Orders',
    myOrdersSub: 'View tickets',
    sendPackage: 'Send Package',
    sendPackageSub: 'Flowers, envelopes, errands',
    coverageRodo: 'RODO Coverage',
    coverageSub: 'View live map & set pin ›',
    addedToCart: 'Added to cart',
    viewCart: 'View cart',
    orderHistoryTitle: 'My Orders & Tickets',
    filterAll: 'All',
    filterOnWay: 'On the Way',
    filterDelivered: 'Delivered',
    filterCancelled: 'Cancelled',
    viewTicket: 'View Ticket',
    liveTrack: '📍 Track Live',
    reorder: '🔄 Order Again',
    confirmReceived: '✓ Confirm Received',
    confirmSignature: '✍️ Confirm Signature / Photo',
    deliveryProofSaved: '✓ Delivery proof saved',
    liveTrackingTitle: 'Live Rider Tracking',
    rateOrderTitle: 'Rate Your RODO Order',
    promoCodePlaceholder: 'e.g. RODO10 or ENVIOGRATIS',
    applyPromo: 'Apply',
    allergiesPlaceholder: 'Allergies or notes (e.g. No onion, nut allergy)',
    closedBlockTitle: 'Establishment Closed in Real Time',
    geofenceBlockTitle: 'Outside Coverage Perimeter (San Miguel de Allende)',
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
