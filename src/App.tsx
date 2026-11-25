import { refreshOpenTicket } from './services/orderPersistence';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Restaurant, Order, DispatchSettings, OrderItem } from './types';
import {
  ensureDatabaseSeeded,
  getRestaurants,
  getDispatchSettings,
  getOrders,
  clearLocalOrdersCache,
  subscribeToOrders,
  subscribeToBroadcastNotifications,
  INITIAL_SETTINGS,
  INITIAL_SPECIALTIES,
  DEFAULT_RESTAURANTS,
  getLocalStoredRestaurants,
} from './services/db';
import { getRestaurantsFromIDB } from './services/indexedDb';
import { calculateHaversineDistance, SMA_CENTER_COORDS } from './services/routing';
import { vibrateLight } from './utils/haptics';
import { useLanguage } from './utils/i18n';
import { CustomerHeader } from './components/CustomerHeader';
import { BottomMobileNav } from './components/BottomMobileNav';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';
import { CheckoutModal } from './components/CheckoutModal';
import { CartDrawerModal } from './components/CartDrawerModal';
import { TicketModal } from './components/TicketModal';
import { AuthModal, AuthSuccessMode } from './components/AuthModal';
import { RiderPortal } from './components/RiderPortal';
import { ActionFeedbackModal, SuccessToastBanner, TransactionFeedbackPayload } from './components/ActionFeedbackModal';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { ExpressDeliveryPanel } from './components/ExpressDeliveryPanel';
import { TopLeftMenuModal } from './components/TopLeftMenuModal';
import { CustomerMicroLocationModal } from './components/CustomerMicroLocationModal';
import { CustomLocalOrderModal } from './components/CustomLocalOrderModal';
import { PhonePermissionsModal } from './components/PhonePermissionsModal';
import { TutorialModal } from './components/TutorialModal';
import { CartToast } from './components/CartToast';
import { LiveTrackingModal } from './components/LiveTrackingModal';
import { OrderRatingModal } from './components/OrderRatingModal';

// Carga perezosa (React.lazy y Suspense) para optimizar el bundle inicial en móviles
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const CustomerCoverageModal = React.lazy(() => import('./components/CustomerCoverageModal').then((m) => ({ default: m.CustomerCoverageModal })));
const NotificationCenterModal = React.lazy(() => import('./components/NotificationCenterModal').then((m) => ({ default: m.NotificationCenterModal })));
import { getThemePreference, applyTheme, toggleTheme, ThemeMode } from './services/theme';
import { useDeviceType } from './utils/useDeviceType';
import {
  dispatchRodoNotification,
  getNotificationHistory,
  requestBrowserNotificationPermission,
  resolveNotificationScopeKey,
  buildOrderNotificationForViewer,
  markAllNotificationsAsRead,
  clearLegacySharedNotificationHistory,
  initNotificationAudioUnlock,
} from './services/notifications';
import { apiFetch, getAuthToken, logoutSession } from './api/httpClient';
import { identifySocketSession, onSocketEvent } from './api/socketClient';
import { fetchRiderTicketByToken } from './services/riders';
import { showSystemToast } from './components/SystemDialogHost';
import { useCart } from './hooks/useCart';
import { resolveCartOwnerKey, resolveCartRestaurant } from './utils/cartStorage';
import {
  CustomerSavedAddress,
  formatSavedAddressHeaderLabel,
  pickActiveCustomerAddress,
  getSelectedAddressStorageKey,
} from './utils/customerAddresses';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import {
  Star,
  Clock,
  Bike,
  Heart,
  ShoppingBag,
  Receipt,
  Headphones,
  MapPin,
  CheckCircle,
  AlertCircle,
  Home,
  Search as SearchIcon,
  User,
  Shield,
  CreditCard,
  Banknote,
  Store,
  Sparkles,
  Share2,
  Building2,
  Copy,
  Check,
  BarChart3,
  X,
  CloudRain,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const FALLBACK_FOOD_IMG =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';

const CATEGORIES_DATA = {
  restaurantes: [
    ['Todos', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'],
    ['Pizzas', 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=300&q=80'],
    ['Tacos al Carbón', 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=300&q=80'],
    ['Especialidades', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=300&q=80'],
  ],
  motomandados: [
    ['Todos', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=300&q=80'],
    ['Supermercado', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=300&q=80'],
    ['Farmacia', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=300&q=80'],
    ['Tienda', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80'],
    ['Verdulería', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80'],
    ['Panadería', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80'],
    ['Carnicería', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=300&q=80'],
    ['Pollo & Rostizados', '/assets/aistudio/FB_IMG_1793113084846_75e6bbcc.jpg'],
    ['Tacos', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=300&q=80'],
    ['Comida China', 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80'],
    ['Alitas', 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=300&q=80'],
    ['Complementos', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=300&q=80'],
  ],
  envios: [
    ['Todos', 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=300&q=80'],
    ['Paquetería', 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=300&q=80'],
    ['Documentos', 'https://images.unsplash.com/photo-1455390582262-044c1371b6b5?auto=format&fit=crop&w=300&q=80'],
    ['Mandados', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=300&q=80'],
  ],
};

export default function App() {
  const { t } = useLanguage();
  const deviceInfo = useDeviceType();
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const local = getLocalStoredRestaurants();
      return local && local.length > 0 ? local : DEFAULT_RESTAURANTS;
    } catch {
      return DEFAULT_RESTAURANTS;
    }
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<DispatchSettings>(INITIAL_SETTINGS);

  // Estados de navegación y filtros con persistencia en localStorage
  const [activeSection, setActiveSection] = useState<'restaurantes' | 'motomandados' | 'envios'>(() => {
    return (localStorage.getItem('rodo_active_section') as any) || 'restaurantes';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('rodo_user_favorites');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Filtros avanzados del catálogo de restaurantes
  const [sortOption, setSortOption] = useState<'default' | 'fastest' | 'rating' | 'cheapest_delivery' | 'distance'>('default');
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState<'all' | '$' | '$$' | '$$$' | '$$$$'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [highlightedCatalog, setHighlightedCatalog] = useState<boolean>(false);
  const categoriesCarouselRef = useRef<HTMLDivElement | null>(null);
  const [carouselScrollState, setCarouselScrollState] = useState<{
    canLeft: boolean;
    canRight: boolean;
  }>({ canLeft: false, canRight: false });

  const updateCarouselScrollState = () => {
    const el = categoriesCarouselRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCarouselScrollState({
      canLeft: el.scrollLeft > 4,
      canRight: maxScroll > 4 && el.scrollLeft < maxScroll - 4,
    });
  };

  const scrollCategoriesCarousel = (direction: 'left' | 'right') => {
    const el = categoriesCarouselRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.7));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const el = categoriesCarouselRef.current;
    if (el) {
      el.scrollLeft = 0;
    }
    const rafId = window.requestAnimationFrame(updateCarouselScrollState);
    window.addEventListener('resize', updateCarouselScrollState);
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateCarouselScrollState);
      observer.observe(el);
    }
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateCarouselScrollState);
      observer?.disconnect();
    };
  }, [activeSection]);

  // Usuario autenticado con persistencia en localStorage (se declara antes del carrito para aislamiento por usuario)
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string;
    role?: 'CUSTOMER' | 'RIDER' | 'PARTNER_LOCAL' | 'ADMIN';
    ine10Digits?: string;
    referralCode?: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('rodo_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('rodo_admin_session') === 'true';
  });

  // Modales automáticos de Tracking en Vivo, Calificación y Cart Toast
  const [liveTrackingOrder, setLiveTrackingOrder] = useState<Order | null>(null);
  const [ratingModalOrder, setRatingModalOrder] = useState<Order | null>(null);
  const cartOwnerKey = resolveCartOwnerKey(currentUser?.id, isAdminLoggedIn);
  const {
    cart,
    cartRestaurantId,
    setCart,
    clearCart,
    cartToastState,
    setCartToastState,
    handleAddToCart,
    handleRemoveFromCart,
  } = useCart(cartOwnerKey);
  useRealtimeSync({ setRestaurants, setSettings });
  const dismissedRatingIdsRef = useRef<Set<string>>(new Set());
  const seenBroadcastIdsRef = useRef<Set<string>>(new Set());

  // Modal Tutorial de Primera Visita (abierto solo cuando el usuario lo solicita para evitar bloquear la pantalla)
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Sincronizar favoritos en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('rodo_user_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn('No se pudo guardar favoritos:', e);
    }
  }, [favorites]);

  const [catalogOverlay, setCatalogOverlay] = useState<Restaurant | 'cart' | null>(null);
  const selectedRestaurant = catalogOverlay === 'cart' ? null : catalogOverlay;
  const cartRestaurant = useMemo(
    () => resolveCartRestaurant(cartRestaurantId, cart, restaurants),
    [cartRestaurantId, cart, restaurants]
  );
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [showPushNotificationPrompt, setShowPushNotificationPrompt] = useState<boolean>(false);

  // Modales
  const [showCheckout, setShowCheckout] = useState(false);
  const [viewingTicketOrder, setViewingTicketOrder] = useState<Order | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [transactionFeedback, setTransactionFeedback] = useState<TransactionFeedbackPayload | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showSuccessToast = (message: string) => {
    setSuccessToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setSuccessToast(null);
    }, 3600);
  };
  const [showOrdersHistory, setShowOrdersHistory] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTopLeftMenu, setShowTopLeftMenu] = useState(false);
  const [showPhonePermissionsModal, setShowPhonePermissionsModal] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);

  // Modo Obscuro / Claro con persistencia
  const [themeMode, setThemeMode] = useState<ThemeMode>(getThemePreference);
  const isDarkMode = themeMode === 'dark';

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => toggleTheme(prev));
  };

  // Centro de Notificaciones (aislado estrictamente por rol y por usuario)
  const notificationScopeKey = useMemo(
    () => resolveNotificationScopeKey({ isAdmin: isAdminLoggedIn, userId: currentUser?.id }),
    [isAdminLoggedIn, currentUser?.id]
  );
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(() => {
    clearLegacySharedNotificationHistory();
    const initialKey = resolveNotificationScopeKey({
      isAdmin: localStorage.getItem('rodo_admin_session') === 'true',
      userId: (() => {
        try {
          const saved = localStorage.getItem('rodo_user_session');
          return saved ? JSON.parse(saved)?.id : null;
        } catch {
          return null;
        }
      })(),
    });
    const hist = getNotificationHistory(initialKey);
    return hist.filter((n) => !n.read).length;
  });

  const previousOrderStatusesRef = useRef<Record<string, string>>({});
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const [riderTicketToken, setRiderTicketToken] = useState<string | null>(null);
  const [isRiderTicketView, setIsRiderTicketView] = useState<boolean>(false);

  // Apertura directa del ticket exclusivo para repartidores mediante ?ticket=FOLIO&riderToken=TOKEN
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketParam = urlParams.get('ticket');
    const riderTokenParam = urlParams.get('riderToken');
    if (!ticketParam || !riderTokenParam) return;

    let cancelled = false;
    fetchRiderTicketByToken(ticketParam, riderTokenParam)
      .then((res) => {
        if (cancelled) return;
        setRiderTicketToken(riderTokenParam);
        setIsRiderTicketView(true);
        setViewingTicketOrder(res.order);
      })
      .catch((err: any) => {
        if (cancelled) return;
        showSystemToast({
          message: err?.message || 'Este enlace de repartidor no es válido o fue reasignado.',
          tone: 'error',
          durationMs: 6000,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    clearLegacySharedNotificationHistory();
    previousOrderStatusesRef.current = {};
    knownOrderIdsRef.current = new Set();
    const hist = getNotificationHistory(notificationScopeKey);
    setUnreadNotifsCount(hist.filter((n) => !n.read).length);
  }, [notificationScopeKey]);

  // Direcciones guardadas privadas por cliente + micro-ubicación
  const [showMicroLocationModal, setShowMicroLocationModal] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'perfil' | 'direcciones' | 'sesiones'>('perfil');
  const [customerAddresses, setCustomerAddresses] = useState<CustomerSavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [customerDeliveryAddress, setCustomerDeliveryAddress] = useState<string>('');
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [customOrderInitialLocal, setCustomOrderInitialLocal] = useState<string | undefined>(undefined);

  const selectedSavedAddress = useMemo(
    () => pickActiveCustomerAddress(customerAddresses, selectedAddressId),
    [customerAddresses, selectedAddressId]
  );

  const applyActiveAddressForUser = (
    userId: string | null | undefined,
    addresses: CustomerSavedAddress[],
    preferredId?: string | null
  ) => {
    setCustomerAddresses(addresses);
    const storageKey = getSelectedAddressStorageKey(userId);
    const storedPref = storageKey ? localStorage.getItem(storageKey) : null;
    const active = pickActiveCustomerAddress(addresses, preferredId ?? storedPref);

    if (active) {
      setSelectedAddressId(active.id);
      setCustomerDeliveryAddress(formatSavedAddressHeaderLabel(active));
      setCustomerCoords(
        active.lat && active.lng ? { lat: active.lat, lng: active.lng } : undefined
      );
      if (storageKey) {
        localStorage.setItem(storageKey, active.id);
      }
    } else {
      setSelectedAddressId(null);
      setCustomerDeliveryAddress('');
      setCustomerCoords(undefined);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  };

  const handleSelectSavedAddress = (addr: CustomerSavedAddress) => {
    const storageKey = getSelectedAddressStorageKey(currentUser?.id);
    setSelectedAddressId(addr.id);
    setCustomerDeliveryAddress(formatSavedAddressHeaderLabel(addr));
    setCustomerCoords(addr.lat && addr.lng ? { lat: addr.lat, lng: addr.lng } : undefined);
    if (storageKey) {
      localStorage.setItem(storageKey, addr.id);
    }
    showSuccessToast(`📍 Dirección activa: ${addr.label}`);
  };

  const handleAddressesChanged = (nextAddrs: CustomerSavedAddress[]) => {
    applyActiveAddressForUser(currentUser?.id, nextAddrs, selectedAddressId);
  };

  const handleOpenProfileAddresses = () => {
    setProfileInitialTab('direcciones');
    setShowProfileModal(true);
  };

  const [returnToAdminAfterTicket, setReturnToAdminAfterTicket] = useState<boolean>(false);

  useEffect(() => {
    if (isAdminLoggedIn) {
      localStorage.setItem('rodo_admin_session', 'true');
    } else {
      localStorage.removeItem('rodo_admin_session');
    }
  }, [isAdminLoggedIn]);

  // Escuchar si el usuario abre directamente con hash o query param
  useEffect(() => {
    const handleRouteTrigger = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === '#cobertura' || hash === '#mapa' || params.get('view') === 'cobertura') {
        setShowCoverageModal(true);
      } else if (hash === '#admin' || hash === '#despacho' || params.get('view') === 'admin') {
        if (isAdminLoggedIn) {
          setShowAdminPanel(true);
        } else {
          setShowAuthModal(true);
        }
      } else if (hash === '#envios' || params.get('view') === 'envios') {
        setActiveSection('envios');
      }
    };
    handleRouteTrigger();
    window.addEventListener('hashchange', handleRouteTrigger);
    return () => window.removeEventListener('hashchange', handleRouteTrigger);
  }, [isAdminLoggedIn]);

  // Desbloquear Web Audio en el primer toque/clic para que los timbres suenen en móvil
  useEffect(() => {
    initNotificationAudioUnlock();
  }, []);

  // Solicitar permiso de notificaciones push del navegador al iniciar la aplicación
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => {
          setShowPushNotificationPrompt(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleEnablePushNotifications = async () => {
    setShowPushNotificationPrompt(false);
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      showSuccessToast('Notificaciones en tiempo real activadas.');
      dispatchRodoNotification(
        'Notificaciones RODO activadas',
        isAdminLoggedIn
          ? 'Recibirás alertas cuando entren nuevos pedidos.'
          : 'Recibirás avisos cuando tu repartidor llegue a tu domicilio.',
        {
          scopeKey: notificationScopeKey,
          audience: isAdminLoggedIn ? 'admin' : 'customer',
          type: 'info',
          playSound: true,
        }
      );
    }
  };

  // Sincronizar persistencia en localStorage para evitar que la pestaña se reinicie
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('rodo_user_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('rodo_user_session');
    }
  }, [currentUser]);

  // Cargar direcciones privadas del cliente autenticado y aislar por usuario
  useEffect(() => {
    localStorage.removeItem('rodo_customer_address');
    if (!currentUser || !currentUser.id || currentUser.id.startsWith('guest')) {
      setCustomerAddresses([]);
      setSelectedAddressId(null);
      setCustomerDeliveryAddress('');
      setCustomerCoords(undefined);
      return;
    }

    let cancelled = false;
    apiFetch<CustomerSavedAddress[]>('/api/profile/addresses')
      .then((addrs) => {
        if (cancelled) return;
        applyActiveAddressForUser(currentUser.id, Array.isArray(addrs) ? addrs : []);
      })
      .catch(() => {
        if (cancelled) return;
        applyActiveAddressForUser(currentUser.id, []);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('rodo_active_section', activeSection);
  }, [activeSection]);

  // Hidratación inicial rápida del catálogo público desde IndexedDB (las órdenes nunca se hidratan sin sesión)
  useEffect(() => {
    (async () => {
      try {
        const idbRests = await getRestaurantsFromIDB();
        if (idbRests.length > 0) setRestaurants(idbRests);
      } catch {}
    })();
  }, []);

  // Carga inicial de restaurantes, órdenes y ajustes protegida contra fallos de red
  const loadData = async (isAdmin = false) => {
    try {
      await ensureDatabaseSeeded(isAdmin);
      const [fetchedRestaurants, fetchedSettings, fetchedOrders] = await Promise.all([
        getRestaurants().catch(() => DEFAULT_RESTAURANTS),
        getDispatchSettings().catch(() => INITIAL_SETTINGS),
        getOrders().catch(() => []),
      ]);
      if (Array.isArray(fetchedRestaurants)) {
        setRestaurants(fetchedRestaurants);
      }
      if (fetchedSettings) {
        setSettings(fetchedSettings);
      }
      if (fetchedOrders && fetchedOrders.length > 0) {
        setOrders(fetchedOrders);
      }
    } catch (err) {
      console.warn('Carga de datos remota usando fallbacks locales seguros:', err);
    }
  };

  useEffect(() => {
    loadData(isAdminLoggedIn);

    const token = getAuthToken();
    if (token) {
      identifySocketSession(token);
      apiFetch<{
        user?: {
          id: string;
          name: string;
          phone: string;
          email: string;
          role?: string;
          ine10Digits?: string;
          referralCode?: string;
          addresses?: CustomerSavedAddress[];
        };
      }>('/api/auth/me')
        .then((res) => {
          if (res?.user) {
            if (res.user.role === 'ADMIN') {
              setIsAdminLoggedIn(true);
            } else {
              setCurrentUser({
                id: res.user.id,
                name: res.user.name,
                phone: res.user.phone || '',
                email: res.user.email,
                role: res.user.role === 'RIDER' ? 'RIDER' : 'CUSTOMER',
                ine10Digits: res.user.ine10Digits,
                referralCode: res.user.referralCode,
              });
              if (Array.isArray(res.user.addresses)) {
                applyActiveAddressForUser(res.user.id, res.user.addresses);
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [isAdminLoggedIn]);

  // Escucha de notificaciones promocionales masivas enviadas por el administrador
  useEffect(() => {
    const unsubBroadcast = subscribeToBroadcastNotifications((items, initialLoad) => {
      if (initialLoad) {
        items.forEach((b) => seenBroadcastIdsRef.current.add(b.id));
        return;
      }
      items.forEach((b) => {
        if (!seenBroadcastIdsRef.current.has(b.id)) {
          seenBroadcastIdsRef.current.add(b.id);
          dispatchRodoNotification(
            `📣 ${b.title}`,
            `${b.message}${b.promoCode ? ` · Cupón: ${b.promoCode}` : ''}`,
            {
              scopeKey: notificationScopeKey,
              audience: 'broadcast',
              type: 'info',
              playSound: true,
            }
          );
          setUnreadNotifsCount((prev) => prev + 1);
        }
      });
    });
    return () => unsubBroadcast();
  }, [notificationScopeKey]);

  useEffect(() => {
    const isRider = currentUser?.role === 'RIDER';
    const isAuthed = (!!currentUser && !isRider) || isAdminLoggedIn;
    const viewerRole: 'admin' | 'customer' | 'guest' = isAdminLoggedIn
      ? 'admin'
      : currentUser && !isRider && !currentUser.id.startsWith('guest')
      ? 'customer'
      : 'guest';
    const scope =
      viewerRole === 'admin'
        ? ({ role: 'admin' } as const)
        : viewerRole === 'customer'
        ? ({ role: 'customer', userId: currentUser!.id } as const)
        : undefined;

    previousOrderStatusesRef.current = {};
    knownOrderIdsRef.current = new Set();
    let hasReceivedInitialSnapshot = false;
    const notifiedQuotes = new Map<string, string>();
    const notifiedArrivals = new Map<string, string>();
    const notifiedAdminNewOrderIds = new Set<string>();
    const notifiedAdminDeliveredOrderIds = new Set<string>();
    for (const notice of getNotificationHistory(notificationScopeKey)) {
      if (notice.orderId && notice.quoteOfferedAt && !notifiedQuotes.has(notice.orderId)) {
        notifiedQuotes.set(notice.orderId, notice.quoteOfferedAt);
      }
    }

    const triggerAdminNewOrderAlert = (payload: {
      id: string;
      folio: string;
      customerName?: string;
      restaurantName?: string;
      total?: number;
    }) => {
      if (viewerRole !== 'admin' || !payload?.id) return;
      if (notifiedAdminNewOrderIds.has(payload.id)) return;
      notifiedAdminNewOrderIds.add(payload.id);

      const title = `Nuevo Pedido #${payload.folio}`;
      const message = `${payload.customerName || 'Cliente'} solicitó en ${payload.restaurantName || 'RODO'} ($${Number(payload.total || 0).toFixed(2)} MXN).`;
      dispatchRodoNotification(title, message, {
        scopeKey: notificationScopeKey,
        audience: 'admin',
        orderId: payload.id,
        folio: payload.folio,
        tag: `rodo-admin-new-${payload.id}`,
        type: 'urgent',
        playSound: true,
      });
      setUnreadNotifsCount((prev) => prev + 1);
      showSystemToast({
        message: `${title} · ${payload.restaurantName || 'RODO'} ($${Number(payload.total || 0).toFixed(2)})`,
        tone: 'warning',
        durationMs: 6500,
      });
    };

    const triggerAdminDeliveredAlert = (payload: {
      id: string;
      folio: string;
      customerName?: string;
      restaurantName?: string;
      assignedRiderName?: string;
    }) => {
      if (viewerRole !== 'admin' || !payload?.id) return;
      if (notifiedAdminDeliveredOrderIds.has(payload.id)) return;
      notifiedAdminDeliveredOrderIds.add(payload.id);

      const title = `Pedido entregado #${payload.folio}`;
      const riderPart = payload.assignedRiderName ? ` por ${payload.assignedRiderName}` : '';
      const message = `${payload.restaurantName || 'RODO'} (${payload.customerName || 'Cliente'}) fue entregado${riderPart}.`;
      dispatchRodoNotification(title, message, {
        scopeKey: notificationScopeKey,
        audience: 'admin',
        orderId: payload.id,
        folio: payload.folio,
        tag: `rodo-admin-delivered-${payload.id}`,
        type: 'success',
        playSound: true,
      });
      setUnreadNotifsCount((prev) => prev + 1);
      showSystemToast({
        message: `${title} · ${payload.customerName || 'Cliente'}`,
        tone: 'success',
        durationMs: 5500,
      });
    };

    const triggerCustomerArrivalAlert = (payload: {
      id: string;
      folio: string;
      customerId: string;
      assignedRiderName?: string;
      arrivalNotifiedAt?: string;
    }) => {
      if (viewerRole !== 'customer' || !currentUser || payload.customerId !== currentUser.id) {
        return;
      }
      const marker = payload.arrivalNotifiedAt || new Date().toISOString();
      if (notifiedArrivals.get(payload.id) === marker) return;
      notifiedArrivals.set(payload.id, marker);

      dispatchRodoNotification(
        '¡Tu repartidor está afuera!',
        `${payload.assignedRiderName || 'Tu repartidor'} llegó con tu pedido #${payload.folio}. Tienes 10 minutos para salir a recibirlo.`,
        {
          scopeKey: notificationScopeKey,
          audience: 'customer',
          orderId: payload.id,
          folio: payload.folio,
          tag: `rodo-arrival-${payload.id}-${marker}`,
          type: 'urgent',
          playSound: true,
        }
      );
      setUnreadNotifsCount((prev) => prev + 1);
      showSystemToast({
        message: `¡Tu repartidor está afuera! Pedido #${payload.folio} (10 min de tolerancia).`,
        tone: 'warning',
        durationMs: 7000,
      });
    };

    const unsubAdminNewOrder = onSocketEvent<{
      id: string;
      folio: string;
      customerName?: string;
      restaurantName?: string;
      total?: number;
    }>('admin:order-requested', triggerAdminNewOrderAlert);

    const unsubAdminDelivered = onSocketEvent<{
      id: string;
      folio: string;
      customerName?: string;
      restaurantName?: string;
      assignedRiderName?: string;
    }>('admin:order-delivered', triggerAdminDeliveredAlert);

    const notifiedRestaurantStatuses = new Set<string>();
    const triggerCustomerRestaurantStatusAlert = (payload: {
      id: string;
      folio: string;
      customerId: string;
      restaurantName?: string;
      assignedRiderName?: string;
      trackingStatus: 'recibido' | 'en_cocina' | 'en_camino' | 'completado';
      statusLabel: string;
      updatedAt?: string;
    }) => {
      if (viewerRole !== 'customer' || !currentUser || payload.customerId !== currentUser.id) {
        return;
      }
      const dedupeKey = `${payload.id}:${payload.trackingStatus}:${payload.updatedAt || ''}`;
      if (notifiedRestaurantStatuses.has(dedupeKey)) return;
      notifiedRestaurantStatuses.add(dedupeKey);

      const riderLabel = payload.assignedRiderName || 'Tu repartidor';
      const restLabel = payload.restaurantName || 'el restaurante';
      const copyByStatus: Record<
        'recibido' | 'en_cocina' | 'en_camino' | 'completado',
        { title: string; message: string; type: 'info' | 'success' }
      > = {
        recibido: {
          title: `Pedido recibido · #${payload.folio}`,
          message: `${riderLabel} recibió tu pedido de ${restLabel}.`,
          type: 'info',
        },
        en_cocina: {
          title: `Tu pedido está en cocina · #${payload.folio}`,
          message: `${restLabel} está preparando tu pedido.`,
          type: 'info',
        },
        en_camino: {
          title: `Tu pedido va en camino · #${payload.folio}`,
          message: `${riderLabel} ya va en camino hacia tu domicilio.`,
          type: 'info',
        },
        completado: {
          title: `Pedido completado · #${payload.folio}`,
          message: `Tu pedido de ${restLabel} fue completado. ¡Buen provecho!`,
          type: 'success',
        },
      };

      const copy = copyByStatus[payload.trackingStatus] || {
        title: `Actualización de pedido #${payload.folio}`,
        message: `Nuevo estatus: ${payload.statusLabel}.`,
        type: 'info' as const,
      };

      dispatchRodoNotification(copy.title, copy.message, {
        scopeKey: notificationScopeKey,
        audience: 'customer',
        orderId: payload.id,
        folio: payload.folio,
        tag: `rodo-rest-status-${payload.id}-${payload.trackingStatus}`,
        type: copy.type,
        playSound: true,
      });
      setUnreadNotifsCount((prev) => prev + 1);
      showSystemToast({
        message: `${copy.title} — ${copy.message}`,
        tone: copy.type === 'success' ? 'success' : 'info',
        durationMs: 6000,
      });
    };

    const unsubArrivalAlert = onSocketEvent<{
      id: string;
      folio: string;
      customerId: string;
      assignedRiderName?: string;
      arrivalNotifiedAt?: string;
    }>('order:arrival-alert', triggerCustomerArrivalAlert);

    const unsubRestaurantStatus = onSocketEvent<{
      id: string;
      folio: string;
      customerId: string;
      restaurantName?: string;
      assignedRiderName?: string;
      trackingStatus: 'recibido' | 'en_cocina' | 'en_camino' | 'completado';
      statusLabel: string;
      updatedAt?: string;
    }>('order:restaurant-status', triggerCustomerRestaurantStatusAlert);

    const unsubscribe = subscribeToOrders((liveOrders) => {
      setOrders(liveOrders);
      setViewingTicketOrder(open => refreshOpenTicket(open, liveOrders));

      liveOrders.forEach((order) => {
        const isNewOrder = hasReceivedInitialSnapshot && !knownOrderIdsRef.current.has(order.id);
        const prevStatus = previousOrderStatusesRef.current[order.id];

        if (!hasReceivedInitialSnapshot && order.arrivalNotifiedAt) {
          notifiedArrivals.set(order.id, order.arrivalNotifiedAt);
        }

        const notifPayload = buildOrderNotificationForViewer({
          viewerRole,
          viewerUserId: currentUser?.id,
          order,
          prevStatus,
          lastNotifiedQuote: notifiedQuotes.get(order.id),
          lastNotifiedArrivalAt: notifiedArrivals.get(order.id),
          isNewOrder,
        });

        if (notifPayload) {
          if (viewerRole === 'admin') {
            if (isNewOrder) {
              if (notifiedAdminNewOrderIds.has(order.id)) {
                knownOrderIdsRef.current.add(order.id);
                previousOrderStatusesRef.current[order.id] = order.status;
                return;
              }
              notifiedAdminNewOrderIds.add(order.id);
            } else if (order.status === 'entregado') {
              if (notifiedAdminDeliveredOrderIds.has(order.id)) {
                knownOrderIdsRef.current.add(order.id);
                previousOrderStatusesRef.current[order.id] = order.status;
                return;
              }
              notifiedAdminDeliveredOrderIds.add(order.id);
            }
          }
          if (notifPayload.quoteOfferedAt) notifiedQuotes.set(order.id, notifPayload.quoteOfferedAt);
          if (notifPayload.arrivalNotifiedAt) {
            if (notifiedArrivals.get(order.id) === notifPayload.arrivalNotifiedAt) {
              knownOrderIdsRef.current.add(order.id);
              previousOrderStatusesRef.current[order.id] = order.status;
              return;
            }
            notifiedArrivals.set(order.id, notifPayload.arrivalNotifiedAt);
          }
          if (
            viewerRole === 'customer' &&
            order.restaurantTrackingStatus &&
            notifiedRestaurantStatuses.has(
              `${order.id}:${order.restaurantTrackingStatus}:${order.restaurantStatusUpdatedAt || ''}`
            )
          ) {
            knownOrderIdsRef.current.add(order.id);
            previousOrderStatusesRef.current[order.id] = order.status;
            return;
          }
          dispatchRodoNotification(notifPayload.title, notifPayload.message, {
            scopeKey: notificationScopeKey,
            audience: notifPayload.audience,
            orderId: notifPayload.orderId,
            folio: notifPayload.folio,
            quoteOfferedAt: notifPayload.quoteOfferedAt,
            tag: notifPayload.arrivalNotifiedAt
              ? `rodo-arrival-${order.id}-${notifPayload.arrivalNotifiedAt}`
              : viewerRole === 'admin'
              ? `rodo-admin-${isNewOrder ? 'new' : 'delivered'}-${order.id}`
              : undefined,
            type: notifPayload.type,
            playSound: true,
          });
          setUnreadNotifsCount((prev) => prev + 1);
        }

        // Modales automáticos exclusivos del cliente propietario de la orden
        const isMyOrder = viewerRole === 'customer' && currentUser && order.customerId === currentUser.id;
        if (isMyOrder && prevStatus && prevStatus !== order.status) {
          if (order.status === 'en_camino') {
            setLiveTrackingOrder(order);
          } else if (
            order.status === 'entregado' &&
            !order.rating &&
            !order.riderRating &&
            !dismissedRatingIdsRef.current.has(order.id)
          ) {
            setLiveTrackingOrder(null);
            setRatingModalOrder(order);
          }
        }

        knownOrderIdsRef.current.add(order.id);
        previousOrderStatusesRef.current[order.id] = order.status;
      });
      hasReceivedInitialSnapshot = true;

      const urlParams = new URLSearchParams(window.location.search);
      const ticketParam = urlParams.get('ticket');
      const riderTokenParam = urlParams.get('riderToken');
      if (ticketParam && !riderTokenParam) {
        const matchingOrder = liveOrders.find((o) => o.folio.toUpperCase() === ticketParam.toUpperCase());
        if (matchingOrder) {
          setViewingTicketOrder(matchingOrder);
        }
      }
    }, isAuthed, scope);

    return () => {
      unsubAdminNewOrder();
      unsubAdminDelivered();
      unsubArrivalAlert();
      unsubRestaurantStatus();
      unsubscribe();
    };
  }, [currentUser, isAdminLoggedIn, notificationScopeKey]);

  const openCart = () => {
    setCartToastState((prev) => ({ ...prev, visible: false }));
    setCatalogOverlay('cart');
  };

  // Abrir checkout: El cliente puede llenar el carrito libremente como visitante,
  // y antes de pagar se le solicita iniciar sesión con su INE.
  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    if (!currentUser || !currentUser.id || currentUser.id.startsWith('guest')) {
      setCatalogOverlay(null);
      setShowAuthModal(true);
      return;
    }
    if (!cartRestaurant) {
      showSuccessToast('Selecciona un establecimiento para continuar con tu pedido.');
      return;
    }
    setCatalogOverlay(null);
    setShowCheckout(true);
  };

  // Abrir cuenta según el estado de la sesión actual (Admin -> Panel Admin, Cliente -> Mi Perfil, Invitado -> Login/Registro)
  const handleOpenAccount = () => {
    if (isAdminLoggedIn) {
      setShowAdminPanel(true);
    } else if (currentUser) {
      setProfileInitialTab('perfil');
      setShowProfileModal(true);
    } else {
      setShowAuthModal(true);
    }
  };

  // Cierre de sesión completo con revocación en PostgreSQL, limpieza de privacidad y alerta de confirmación
  const handleFullLogout = async (allDevices = false) => {
    const loggedOutName = currentUser?.name || (isAdminLoggedIn ? 'Administrador' : '');
    try {
      await logoutSession(allDevices);
    } catch (e) {
      console.error(e);
    }
    identifySocketSession(null);
    clearLocalOrdersCache();
    clearLegacySharedNotificationHistory();
    previousOrderStatusesRef.current = {};
    knownOrderIdsRef.current = new Set();
    setUnreadNotifsCount(0);
    setIsAdminLoggedIn(false);
    setCurrentUser(null);
    setCustomerAddresses([]);
    setSelectedAddressId(null);
    setCustomerDeliveryAddress('');
    setCustomerCoords(undefined);
    setOrders([]);
    setShowCheckout(false);
    setCatalogOverlay(null);
    setShowAdminPanel(false);
    setShowProfileModal(false);
    setReturnToAdminAfterTicket(false);
    localStorage.removeItem('rodo_admin_session');
    localStorage.removeItem('rodo_user_session');
    localStorage.removeItem('rodo_customer_address');

    setTransactionFeedback({
      variant: 'logout',
      title: '¡Sesión Cerrada Correctamente!',
      subtitle: allDevices
        ? 'Se cerraron todas tus sesiones activas en todos los dispositivos por seguridad.'
        : 'Tu sesión se cerró de forma segura y tu historial privado quedó protegido.',
      details: loggedOutName
        ? [
            { label: 'Cuenta', value: loggedOutName },
            { label: 'Estado', value: 'Sesión revocada y privada', highlight: true },
          ]
        : undefined,
      primaryActionLabel: 'Volver al Inicio',
    });
  };

  // Pedido completado con éxito
  const handleOrderSuccess = (newOrder: Order) => {
    setShowCheckout(false);
    setShowCustomOrderModal(false);
    setCatalogOverlay(null);
    clearCart();

    dispatchRodoNotification(
      '✓ Pedido Confirmado',
      `Tu orden #${newOrder.folio} (${newOrder.restaurantName}) ha sido enviada para asignación de repartidor.`,
      {
        scopeKey: notificationScopeKey,
        audience: isAdminLoggedIn ? 'admin' : 'customer',
        orderId: newOrder.id,
        folio: newOrder.folio,
        type: 'info',
        playSound: true,
      }
    );
    setUnreadNotifsCount((prev) => prev + 1);

    setTransactionFeedback({
      variant: 'order',
      title: '¡Pedido Confirmado!',
      subtitle: 'Tu pedido fue registrado exitosamente en el sistema y ya fue enviado a despacho en tiempo real.',
      details: [
        { label: 'Folio del Pedido', value: newOrder.folio, highlight: true },
        { label: 'Establecimiento', value: newOrder.restaurantName || 'Servicio RODO' },
        { label: 'Total', value: `$${Number(newOrder.total || 0).toFixed(2)} MXN` },
        {
          label: 'Método de Pago',
          value: newOrder.paymentMethod === 'transferencia' ? 'Transferencia SPEI' : 'Efectivo al recibir',
        },
      ],
      primaryActionLabel: 'Ver Mi Ticket Digital',
      onPrimaryAction: () => {
        setViewingTicketOrder(newOrder);
      },
    });
  };

  // Toggle favoritos
  const toggleFavorite = (restId: string) => {
    setFavorites((prev) => ({ ...prev, [restId]: !prev[restId] }));
  };

  // Filtrado y ordenamiento avanzado de restaurantes y motomandados
  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = restaurants.filter((r) => {
      if (!r.isActive) return false;

      // Separación estricta: Restaurantes (facturan) vs Motomandados (no facturan)
      if (activeSection === 'restaurantes') {
        if (r.establishmentType && r.establishmentType !== 'restaurante') return false;
      } else if (activeSection === 'motomandados') {
        if (r.establishmentType !== 'motomandado') return false;
      }

      // Filtro de Solo Abiertos Ahora
      if (onlyOpenNow && r.isOpen === false) return false;

      // Filtro de Solo Favoritos
      if (showFavoritesOnly && !favorites[r.id]) return false;

      // Filtro de Rango de Precio
      if (selectedPriceRange !== 'all') {
        const rPrice = r.priceRange || (r.deliveryFee > 45 ? '$$$' : r.deliveryFee > 35 ? '$$' : '$');
        if (rPrice !== selectedPriceRange) return false;
      }

      // Filtro de categoría (flexible para especialidades estilo Uber Eats)
      const catLower = (selectedCategory || 'Todos').toLowerCase();
      const rCat = (r.category || '').toLowerCase();
      const rName = (r.name || '').toLowerCase();
      const rTags = (r.tags || []).map((t) => (t || '').toLowerCase());

      const matchesCategory = [
        selectedCategory === 'Todos',
        rCat === catLower,
        rTags.includes(catLower),
        catLower === 'pizza' && (rCat.includes('pizza') || rTags.some((t) => t.includes('pizza'))),
        catLower === 'pollo' && (rCat.includes('pollo') || rName.includes('chicken') || rName.includes('pollo') || rTags.some((t) => t.includes('pollo'))),
        catLower === 'mariscos' && (rCat.includes('marisco') || rCat.includes('pescado') || rTags.some((t) => t.includes('marisco'))),
        catLower === 'tacos' && (rCat.includes('taco') || rTags.some((t) => t.includes('taco'))),
        catLower === 'hamburguesa' && (rCat.includes('burger') || rCat.includes('hamburguesa') || rTags.some((t) => t.includes('burger'))),
        catLower === 'desayuno' && (rCat.includes('desayuno') || rCat.includes('café') || rTags.some((t) => t.includes('desayuno'))),
        (catLower === 'super' || catLower === 'súper' || catLower === 'supermercado') &&
          (rCat.includes('super') || rCat.includes('abarrote') || rTags.some((t) => t.includes('super'))),
        (catLower === 'panadería' || catLower === 'panaderia' || catLower === 'pan') &&
          (rCat.includes('pan') || rTags.some((t) => t.includes('pan'))),
        catLower === 'tienda' &&
          (rCat.includes('tienda') || rCat.includes('abarrote') || rTags.some((t) => t.includes('tienda'))),
        catLower === 'farmacia' &&
          (rCat.includes('farmacia') || rTags.some((t) => t.includes('farmacia'))),
        (catLower === 'verdulería' || catLower === 'verduleria') &&
          (rCat.includes('verdul') || rCat.includes('fruta') || rTags.some((t) => t.includes('verdul') || t.includes('fruta'))),
        (catLower === 'carnicería' || catLower === 'carniceria') &&
          (rCat.includes('carnic') || rCat.includes('corte') || rTags.some((t) => t.includes('carnic'))),
        catLower === 'flores' && (rCat.includes('flor') || rTags.some((t) => t.includes('flor'))),
        rCat.includes(catLower),
      ].some(Boolean);

      if (!matchesCategory) return false;

      // Filtro de búsqueda
      if (!q) return true;
      const menuHaystack = (r.menu || []).map((m) => m.name).join(' ');
      const haystack = `${rName} ${rCat} ${(r.tags || []).join(' ')} ${r.description || ''} ${menuHaystack}`.toLowerCase();
      return haystack.includes(q);
    });

    const userOrigin = customerCoords || SMA_CENTER_COORDS;
    const getDist = (r: Restaurant) => {
      const c = r.coordinates || SMA_CENTER_COORDS;
      return calculateHaversineDistance(userOrigin.lat, userOrigin.lng, c.lat, c.lng);
    };

    // Ordenamiento reactivo por tiempo de entrega, calificación, costo de envío o distancia
    if (sortOption === 'fastest') {
      return [...filtered].sort((a, b) => {
        const timeA = parseInt(a.time) || 30;
        const timeB = parseInt(b.time) || 30;
        return timeA - timeB;
      });
    } else if (sortOption === 'rating') {
      return [...filtered].sort((a, b) => {
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        return ratingB - ratingA;
      });
    } else if (sortOption === 'cheapest_delivery') {
      return [...filtered].sort((a, b) => (a.deliveryFee || 0) - (b.deliveryFee || 0));
    } else if (sortOption === 'distance') {
      return [...filtered].sort((a, b) => getDist(a) - getDist(b));
    }

    return filtered;
  }, [
    restaurants,
    activeSection,
    selectedCategory,
    searchQuery,
    onlyOpenNow,
    showFavoritesOnly,
    selectedPriceRange,
    sortOption,
    favorites,
    customerCoords,
  ]);

  // Pedidos del cliente actual (aislamiento estricto por usuario)
  const myOrders = useMemo(() => {
    if (!currentUser) return isAdminLoggedIn ? orders : [];
    return orders.filter((o) => o.customerId === currentUser.id);
  }, [orders, currentUser, isAdminLoggedIn]);

  const handleSelectCategoryWithHighlight = (catName: string) => {
    setSelectedCategory(catName);
    setHighlightedCatalog(true);
    window.setTimeout(() => setHighlightedCatalog(false), 1200);
    const el = document.getElementById('catalogo-restaurantes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Manejador del Teclado Inferior Móvil: Retroceder (Evita salirse del sitio en el teléfono)
  const handleNavBack = () => {
    if (catalogOverlay === 'cart') { setCatalogOverlay(null); return; }
    if (showCheckout) { setShowCheckout(false); return; }
    if (viewingTicketOrder) { setViewingTicketOrder(null); return; }
    if (showAdminPanel) { setShowAdminPanel(false); return; }
    if (showProfileModal) { setShowProfileModal(false); return; }
    if (showAuthModal) { setShowAuthModal(false); return; }
    if (showCoverageModal) { setShowCoverageModal(false); return; }
    if (showOrdersHistory) { setShowOrdersHistory(false); return; }
    if (showHelpModal) { setShowHelpModal(false); return; }
    if (showTopLeftMenu) { setShowTopLeftMenu(false); return; }
    if (showPhonePermissionsModal) { setShowPhonePermissionsModal(false); return; }
    if (showMicroLocationModal) { setShowMicroLocationModal(false); return; }
    if (showCustomOrderModal) { setShowCustomOrderModal(false); return; }
    if (selectedRestaurant) { setCatalogOverlay(null); return; }
    if (activeSection === 'envios') { setActiveSection('restaurantes'); return; }
    if (selectedCategory !== 'Todos') { setSelectedCategory('Todos'); return; }
    if (searchQuery) { setSearchQuery(''); return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Manejador del Teclado Inferior Móvil: Ir a Inicio
  const handleNavHome = () => {
    setShowCheckout(false);
    setViewingTicketOrder(null);
    setShowAdminPanel(false);
    setShowProfileModal(false);
    setShowAuthModal(false);
    setShowCoverageModal(false);
    setShowOrdersHistory(false);
    setShowHelpModal(false);
    setShowTopLeftMenu(false);
    setShowPhonePermissionsModal(false);
    setShowMicroLocationModal(false);
    setShowCustomOrderModal(false);
    setCatalogOverlay(null);
    setActiveSection('restaurantes');
    setSelectedCategory('Todos');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (currentUser?.role === 'RIDER') {
    return <RiderPortal riderName={currentUser.name} onLogout={() => handleFullLogout(false)} />;
  }

  return (
    <div
      className={`w-full max-w-full overflow-x-clip min-h-dvh bg-[#f5f6f8] dark:bg-slate-950 text-[#101b29] dark:text-slate-100 font-sans pb-32 sm:pb-28 transition-colors relative ${
        deviceInfo.isMobile ? 'device-mobile' : deviceInfo.isTablet ? 'device-tablet' : 'device-desktop'
      }`}
    >
      {/* Alerta Global de Pausa de Envíos por Lluvia */}
      {settings.rainPauseEnabled && (
        <div className="bg-gradient-to-r from-sky-700 via-blue-800 to-sky-700 text-white px-4 py-2.5 text-xs font-bold text-center flex flex-wrap items-center justify-center gap-2 shadow-md border-b border-sky-900">
          <CloudRain className="w-4 h-4 text-sky-200 shrink-0" />
          <span className="font-black uppercase tracking-wide">Pausa por lluvia:</span>
          <span>
            {settings.rainPauseMessage ||
              'Envíos pausados temporalmente por lluvia. Reanudamos pronto.'}
          </span>
        </div>
      )}

      {/* Alerta de Modo Día Festivo / Desfiles en San Miguel */}
      {settings.festiveModeEnabled && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white px-4 py-2 text-xs font-bold text-center flex flex-wrap items-center justify-center gap-2 shadow-sm border-b border-amber-800">
          <Sparkles className="w-4 h-4 text-amber-200 shrink-0" />
          <span>{settings.festiveModeMessage || 'Días festivos: posibles demoras en tránsito.'}</span>
          <span className="bg-black/30 px-2 py-0.5 rounded font-mono font-black text-[11px] text-amber-200">
            {settings.festiveEstimatedDelay || '+15 a 25 min'}
          </span>
        </div>
      )}

      {/* Alerta de Activación de Notificaciones Push del Navegador */}
      {showPushNotificationPrompt && (
        <div className="bg-[#101b29] text-white px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2.5 shadow-md border-b-2 border-[#ed0718] animate-in fade-in slide-in-from-top-2">
          <div className="min-w-0 flex-1">
            <span className="font-extrabold block">Activa las notificaciones</span>
            <span className="text-[11px] text-gray-300">
              Te avisamos con timbre cuando llegue tu repartidor.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEnablePushNotifications}
              className="bg-[#ed0718] hover:bg-[#c90012] text-white px-3 py-1.5 rounded-xl font-black text-xs shadow-xs transition cursor-pointer"
            >
              Activar
            </button>
            <button
              onClick={() => setShowPushNotificationPrompt(false)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
            >
              Luego
            </button>
          </div>
        </div>
      )}

      {/* Alerta de Urgencia: Repartidor Afuera del Domicilio (solo para el cliente dueño de esa orden) */}
      {!isAdminLoggedIn && currentUser && myOrders.some((o) => o.status === 'afuera_del_domicilio') && (
        <div className="bg-[#ed0718] text-white px-4 py-3 text-xs font-black flex flex-wrap items-center justify-between gap-2.5 shadow-lg border-b-2 border-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <span className="text-sm uppercase tracking-wide block">¡Tu repartidor está afuera!</span>
              <span className="text-[11px] text-white/90 font-normal">
                Sal a recibir tu pedido (10 min de tolerancia).
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              const activeOrder = myOrders.find((o) => o.status === 'afuera_del_domicilio');
              if (activeOrder) setViewingTicketOrder(activeOrder);
            }}
            className="bg-white text-[#ed0718] hover:bg-gray-100 px-3.5 py-1.5 rounded-xl font-black text-xs shadow-md transition cursor-pointer"
          >
            Ver ticket
          </button>
        </div>
      )}

      {/* 1. Cabecera Principal RODO (Limpia para Clientes, con Modo Obscuro, Idioma ES/EN y Autocompletar) */}
      <CustomerHeader
        activeSection={activeSection}
        onSectionChange={(s) => {
          setActiveSection(s);
          setSelectedCategory('Todos');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMenu={() => setShowTopLeftMenu(true)}
        userName={currentUser?.name}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAccount={handleOpenAccount}
        onOpenLocationModal={() => setShowMicroLocationModal(true)}
        currentAddressLabel={customerDeliveryAddress}
        onOpenNotifications={() => {
          setShowNotificationCenter(true);
          markAllNotificationsAsRead(notificationScopeKey);
          setUnreadNotifsCount(0);
        }}
        unreadNotificationsCount={unreadNotifsCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleTheme}
        holidayThemeId={settings.activeHolidayTheme}
        restaurants={restaurants}
        onSelectSuggestionRestaurant={(rest) => {
          if (rest.hasFixedMenu === false) {
            setCustomOrderInitialLocal(rest.name);
            setShowCustomOrderModal(true);
          } else {
            setCatalogOverlay(rest);
          }
        }}
        onSelectSuggestionCategory={(category, section) => {
          setActiveSection(section);
          handleSelectCategoryWithHighlight(category);
        }}
      />


      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-3.5 sm:pt-5 space-y-5 sm:space-y-6">
        {/* Banner Hero RODO */}
        <section className="relative min-h-[188px] sm:h-64 rounded-2xl sm:rounded-3xl overflow-hidden shadow-md flex items-center p-4 sm:p-10 text-white bg-linear-to-r from-black/90 via-black/75 to-black/25">
          <img
            src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1500&q=85"
            alt="RODO Banner"
            loading="eager"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_FOOD_IMG;
            }}
            className="absolute inset-0 w-full h-full object-cover -z-10"
          />
          <div className="max-w-md space-y-2">
            <span className="inline-block bg-[#ed0718] text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
              {t('heroTag')}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black leading-tight drop-shadow-md">
              {activeSection === 'restaurantes'
                ? t('heroTitleRestaurants')
                : activeSection === 'motomandados'
                ? t('heroTitleMoto')
                : t('heroTitleEnvios')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-200">
              {activeSection === 'envios' ? t('heroSubEnvios') : t('heroSubFood')}
            </p>
            <button
              onClick={() => {
                const el = document.getElementById('catalogo-restaurantes');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs sm:text-sm py-2.5 px-6 rounded-xl shadow-lg transition mt-2 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {t('orderNow')}
            </button>
          </div>
        </section>

        {/* Área de Envíos Express vs Catálogo de Comida */}
        {activeSection === 'envios' ? (
          <ExpressDeliveryPanel
            bankAccount={`${settings.bancoRodo} · CLABE ${settings.clabeRodo}`}
            customerId={currentUser?.id || 'guest-envio'}
            customerDefaultName={currentUser?.name}
            customerDefaultPhone={currentUser?.phone}
            savedAddresses={customerAddresses}
            rainPauseEnabled={settings.rainPauseEnabled}
            rainPauseMessage={settings.rainPauseMessage}
            onOrderSuccess={handleOrderSuccess}
            onRequireLogin={() => setShowAuthModal(true)}
          />
        ) : (
          <>
            {/* Carrusel de Categorías (con flechas de navegación para PC + scroll táctil en móvil) */}
            <section>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">
                  {activeSection === 'restaurantes' ? t('whatDoYouCrave') : t('motoAndStalls')}
                </h2>
                <div className="flex items-center gap-2 shrink-0">
                  {(carouselScrollState.canLeft || carouselScrollState.canRight) && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => scrollCategoriesCarousel('left')}
                        disabled={!carouselScrollState.canLeft}
                        aria-label="Desplazar categorías a la izquierda"
                        title="Anterior"
                        className="w-8 h-8 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white hover:bg-[#ed0718] hover:text-white hover:border-[#ed0718] disabled:opacity-35 disabled:hover:bg-white disabled:dark:hover:bg-slate-800 disabled:hover:text-gray-800 disabled:hover:border-gray-300 disabled:cursor-not-allowed flex items-center justify-center shadow-xs transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollCategoriesCarousel('right')}
                        disabled={!carouselScrollState.canRight}
                        aria-label="Desplazar categorías a la derecha"
                        title="Siguiente"
                        className="w-8 h-8 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white hover:bg-[#ed0718] hover:text-white hover:border-[#ed0718] disabled:opacity-35 disabled:hover:bg-white disabled:dark:hover:bg-slate-800 disabled:hover:text-gray-800 disabled:hover:border-gray-300 disabled:cursor-not-allowed flex items-center justify-center shadow-xs transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleSelectCategoryWithHighlight('Todos')}
                    className="text-xs font-extrabold text-[#c90012] hover:underline cursor-pointer"
                  >
                    {t('viewAll')}
                  </button>
                </div>
              </div>

              <div className="relative group/carousel">
                {/* Botón flotante izquierdo para PC */}
                {carouselScrollState.canLeft && (
                  <button
                    type="button"
                    onClick={() => scrollCategoriesCarousel('left')}
                    aria-label="Ver categorías anteriores"
                    className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:bg-[#ed0718] hover:text-white hover:border-[#ed0718] shadow-lg items-center justify-center transition cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                <div
                  ref={categoriesCarouselRef}
                  onScroll={updateCarouselScrollState}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-none scroll-smooth px-0.5 sm:px-2"
                >
                  {(CATEGORIES_DATA[activeSection] || CATEGORIES_DATA.restaurantes).map(([catName, catImg]) => (
                    <button
                      key={catName}
                      onClick={(e) => {
                        handleSelectCategoryWithHighlight(catName);
                        e.currentTarget.scrollIntoView({
                          behavior: 'smooth',
                          inline: 'center',
                          block: 'nearest',
                        });
                      }}
                      className={`flex flex-col items-center min-w-[85px] sm:min-w-[95px] p-1.5 rounded-2xl transition cursor-pointer shrink-0 ${
                        selectedCategory === catName
                          ? 'text-[#c90012] font-black'
                          : 'text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white font-bold'
                      }`}
                    >
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden mb-1.5 shadow-sm transition bg-gray-200 dark:bg-slate-800 ${
                          selectedCategory === catName ? 'ring-3 ring-[#ed0718] ring-offset-2' : ''
                        }`}
                      >
                        <img
                          src={catImg}
                          alt={catName}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_FOOD_IMG;
                          }}
                          className="w-full h-full object-cover transition-opacity duration-300"
                        />
                      </div>
                      <span className="text-xs tracking-tight text-center">{catName}</span>
                    </button>
                  ))}
                </div>

                {/* Botón flotante derecho para PC */}
                {carouselScrollState.canRight && (
                  <button
                    type="button"
                    onClick={() => scrollCategoriesCarousel('right')}
                    aria-label="Ver más categorías"
                    className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:bg-[#ed0718] hover:text-white hover:border-[#ed0718] shadow-lg items-center justify-center transition cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </section>

            {/* Panel de Locales Destacados */}
            <section
              id="catalogo-restaurantes"
              className={`bg-[#101b29] text-white rounded-3xl p-4 sm:p-7 shadow-lg transition-all duration-300 ${
                highlightedCatalog ? 'ring-4 ring-[#ed0718] ring-offset-2' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-extrabold text-lg sm:text-xl">
                    {activeSection === 'restaurantes'
                      ? 'Restaurantes'
                      : 'Mandados y comercios'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeSection === 'restaurantes'
                      ? 'Efectivo y Transferencia SPEI'
                      : 'Tiendas, farmacias y locales · Efectivo'}
                  </p>
                </div>
                <button
                  onClick={() => handleSelectCategoryWithHighlight('Todos')}
                  className="text-xs text-[#ed0718] hover:text-red-400 font-extrabold cursor-pointer shrink-0"
                >
                  {t('viewAllCatalog')}
                </button>
              </div>

              {/* Barra de Filtros Rápidos y Ordenamiento Avanzado (Scroll táctil horizontal en móvil) */}
              <div className="mb-5 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Selector de Orden */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> {t('sortLabel')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSortOption('default')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        sortOption === 'default'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      {t('sortFeatured')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortOption('fastest')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        sortOption === 'fastest'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      {t('sortFastest')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortOption('distance')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        sortOption === 'distance'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      {t('sortDistance')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortOption('rating')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        sortOption === 'rating'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      {t('sortRating')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortOption('cheapest_delivery')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        sortOption === 'cheapest_delivery'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      {t('sortCheapest')}
                    </button>
                  </div>

                  {/* Conteo de Resultados */}
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-gray-300 sm:ml-auto shrink-0">
                    {filteredRestaurants.length} {t('placesCount')}
                  </span>
                </div>

                {/* Filtros Toggle y Rango de Precio */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {/* Toggle Abiertos Ahora */}
                    <button
                      type="button"
                      onClick={() => setOnlyOpenNow((prev) => !prev)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
                        onlyOpenNow
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <span className={onlyOpenNow ? 'animate-pulse text-emerald-400' : 'text-gray-500'}>●</span>
                      <span>{t('openNow')}</span>
                    </button>

                    {/* Toggle Solo Favoritos */}
                    <button
                      type="button"
                      onClick={() => setShowFavoritesOnly((prev) => !prev)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
                        showFavoritesOnly
                          ? 'bg-red-500/20 text-red-400 border-red-500/50'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{t('favoritesOnly')}</span>
                    </button>
                  </div>

                  {/* Rango de Precios ($ a $$$$) */}
                  <div className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-none">
                    <span className="text-[10px] text-gray-400 uppercase font-black mr-1 shrink-0">{t('priceLabel')}</span>
                    {(['all', '$', '$$', '$$$', '$$$$'] as const).map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => setSelectedPriceRange(pr)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer shrink-0 ${
                          selectedPriceRange === pr
                            ? 'bg-white text-black font-black'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {pr === 'all' ? t('priceAll') : pr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredRestaurants.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                  <ShoppingBag className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm font-semibold">
                    {t('noEstablishments')}
                  </p>
                </div>
              ) : (
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 rounded-2xl transition-all duration-300 ${
                    highlightedCatalog ? 'bg-red-500/10 p-2' : ''
                  }`}
                >
                  {filteredRestaurants.map((restaurant) => {
                    const isFav = favorites[restaurant.id];
                    const isRestaurante = restaurant.establishmentType === 'restaurante';
                    const restCoords = restaurant.coordinates || SMA_CENTER_COORDS;
                    const originCoords = customerCoords || SMA_CENTER_COORDS;
                    const distKm = calculateHaversineDistance(
                      originCoords.lat,
                      originCoords.lng,
                      restCoords.lat,
                      restCoords.lng
                    );

                    return (
                      <article
                        key={restaurant.id}
                        onClick={() => {
                          if (restaurant.hasFixedMenu === false) {
                            setCustomOrderInitialLocal(restaurant.name);
                            setShowCustomOrderModal(true);
                          } else {
                            setCatalogOverlay(restaurant);
                          }
                        }}
                        className={`bg-white text-[#101b29] rounded-2xl overflow-hidden shadow-md flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] hover:-translate-y-1 border cursor-pointer select-none ${
                          restaurant.isOpen === false ? 'border-amber-300 opacity-95' : 'border-gray-200'
                        }`}
                      >
                        <div>
                          {/* Imagen con lazy loading, placeholder y fallback */}
                          <div className="relative h-44 w-full overflow-hidden bg-gray-200">
                            <img
                              src={restaurant.image || FALLBACK_FOOD_IMG}
                              alt={restaurant.name}
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_FOOD_IMG;
                              }}
                              className={`w-full h-full object-cover transition duration-300 hover:scale-105 ${
                                restaurant.isOpen === false ? 'grayscale-30 brightness-90' : ''
                              }`}
                            />
                            {restaurant.isOpen === false ? (
                              <span className="absolute top-3 left-3 bg-amber-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider">
                                Cerrado
                              </span>
                            ) : restaurant.badge ? (
                              <span className="absolute top-3 left-3 bg-[#ed0718] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                                {restaurant.badge.replace(/·?\s*PIN\s*#?\d+/gi, '').replace(/PIN\s*#?\d+/gi, '').trim() || 'Cocina Aliada'}
                              </span>
                            ) : null}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(restaurant.id);
                              }}
                              className="absolute top-3 right-3 bg-white/90 hover:bg-white text-[#ed0718] p-1.5 rounded-full shadow-md transition cursor-pointer"
                            >
                              <Heart className={`w-4 h-4 ${isFav ? 'fill-[#ed0718]' : ''}`} />
                            </button>
                          </div>

                          {/* Info del Comercio */}
                          <div className="p-3.5 sm:p-4 space-y-2">
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="font-extrabold text-base leading-snug line-clamp-1">
                                {restaurant.name}
                              </h3>
                              <span className="text-[10px] font-mono font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                                {distKm} km
                              </span>
                            </div>

                            {/* Aviso de cierre temporal */}
                            {restaurant.isOpen === false && (
                              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1.5 rounded-lg text-[11px] font-bold">
                                {restaurant.closureReason || 'Cerrado temporalmente'}
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                              <span className="flex items-center gap-0.5 text-black font-bold">
                                <Star className="w-3.5 h-3.5 fill-[#ed0718] text-[#ed0718]" />
                                {restaurant.rating}
                              </span>
                              <span>({restaurant.reviews})</span>
                              <span>·</span>
                              <span className="text-gray-500 font-medium truncate">
                                {restaurant.schedule || '12:00 PM – 10:00 PM'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 pt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {restaurant.time}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1 font-bold text-red-700">
                                <Bike className="w-3.5 h-3.5" />
                                Envío ${restaurant.deliveryFee} MXN
                              </span>
                            </div>

                            {/* Badges de métodos de pago permitidos */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {isRestaurante ? (
                                <>
                                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Banknote className="w-3 h-3" /> Efectivo
                                  </span>
                                  <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> Factura / SPEI
                                  </span>
                                </>
                              ) : (
                                <span className="bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Banknote className="w-3 h-3 text-amber-700" /> Solo Efectivo (No Factura)
                                </span>
                              )}
                            </div>

                            {/* Promo en Sobreprecio si está activa */}
                            {restaurant.promoActive && (
                              <div className="pt-1">
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-2xs">
                                  🏷️ {restaurant.promoLabel || `${restaurant.promoDiscountPercent || 15}% OFF en Sobreprecio`}
                                </span>
                              </div>
                            )}

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {(restaurant.tags || []).slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="bg-[#ffe2e5] text-[#8d101c] text-[10px] font-bold px-2 py-0.5 rounded-md"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Botón de Acción */}
                        <div className="p-3.5 sm:p-4 pt-0">
                          {restaurant.hasFixedMenu === false ? (
                            <button
                              onClick={() => {
                                setCustomOrderInitialLocal(restaurant.name);
                                setShowCustomOrderModal(true);
                              }}
                              className="w-full font-black text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 bg-[#101b29] hover:bg-black text-white cursor-pointer"
                            >
                              <span>{t('customOrderBtn')}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setCatalogOverlay(restaurant);
                              }}
                              className={`w-full font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 ${
                                restaurant.isOpen === false
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-[#ed0718] hover:bg-[#c90012] text-white'
                              }`}
                            >
                              <span>{restaurant.isOpen === false ? t('viewMenuPaused') : t('viewMenuOrder')}</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Botón / Sección: No encontré mi local aquí */}
              <div className="mt-5 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">
                      ¿Buscas otro local?
                    </h3>
                    <p className="text-xs text-gray-300">
                      Dinos dónde y qué necesitas; te cotizamos el envío.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCustomOrderInitialLocal(undefined);
                    setShowCustomOrderModal(true);
                  }}
                  className="w-full sm:w-auto bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition whitespace-nowrap cursor-pointer shrink-0"
                >
                  Pedir en otro local
                </button>
              </div>
            </section>
          </>
        )}

        {/* Accesos Rápidos de Ayuda, Cobertura y Portal de Locales */}
        <section className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-4 font-bold text-xs sm:text-sm text-left shadow-xs hover:border-red-300 transition"
            >
              <Headphones className="w-6 h-6 text-[#ed0718] shrink-0" />
              <div>
                <span>Ayuda con el Pedido</span>
                <span className="block text-[11px] text-gray-500 font-normal">Soporte RODO</span>
              </div>
            </button>

            <button
              onClick={() => setShowOrdersHistory(true)}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-4 font-bold text-xs sm:text-sm text-left shadow-xs hover:border-red-300 transition"
            >
              <Receipt className="w-6 h-6 text-[#ed0718] shrink-0" />
              <div>
                <span>Mis Pedidos</span>
                <span className="block text-[11px] text-gray-500 font-normal">Consultar tickets</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection('envios');
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-4 font-bold text-xs sm:text-sm text-left shadow-xs hover:border-red-300 transition"
            >
              <Bike className="w-6 h-6 text-[#ed0718] shrink-0" />
              <div>
                <span>Enviar Paquete</span>
                <span className="block text-[11px] text-gray-500 font-normal">Flores, sobres, mandados</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowCoverageModal(true)}
              className="flex items-center gap-3 bg-white hover:bg-red-50/50 border border-gray-200 hover:border-red-300 rounded-2xl p-4 font-bold text-xs sm:text-sm text-left shadow-xs active:scale-95 transition cursor-pointer group"
            >
              <div className="p-1 rounded-xl text-[#ed0718] group-hover:scale-110 transition shrink-0">
                <MapPin className="w-6 h-6 text-[#ed0718]" />
              </div>
              <div className="min-w-0">
                <span className="text-gray-900 group-hover:text-[#ed0718] font-black block truncate">
                  Cobertura RODO
                </span>
                <span className="block text-[11px] text-gray-500 font-normal">
                  Ver mapa real y fijar mi punto ›
                </span>
              </div>
            </button>
          </div>

        </section>

        {/* Nota al pie limpia de producción */}
        <footer className="text-center text-xs text-gray-500 pt-4 pb-2 space-y-1">
          <p className="font-semibold text-gray-600 dark:text-gray-400">
            RODO Moto Mandados · San Miguel de Allende, Gto.
          </p>
        </footer>
      </main>

      {/* 2.5 Modal Canasta / Carrito Lateral */}
      <CartDrawerModal
        isOpen={catalogOverlay === 'cart'}
        onClose={() => setCatalogOverlay(null)}
        cart={cart}
        restaurant={cartRestaurant}
        onAddToCart={(item) => handleAddToCart(item, cartRestaurant?.id || null)}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={() => {
          clearCart();
        }}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* 3. Modal de Menú y Detalle del Restaurante */}
      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        cart={
          selectedRestaurant && (!cartRestaurantId || cartRestaurantId === selectedRestaurant.id)
            ? cart
            : []
        }
        onAddToCart={(item) => handleAddToCart(item, selectedRestaurant?.id || null)}
        onRemoveFromCart={handleRemoveFromCart}
        onProceedToCheckout={handleProceedToCheckout}
        onClose={() => {
          setCatalogOverlay(null);
        }}
      />

      {/* 4. Modal de Checkout con Folio Único, Cupón, Alergias, Geofencing y Validación de Cierre en Vivo */}
      {showCheckout && cartRestaurant && (
        <CheckoutModal
          restaurant={cartRestaurant}
          restaurants={restaurants}
          coveragePolygon={settings.coveragePolygon}
          cart={cart}
          customerId={currentUser?.id || 'guest-' + Date.now()}
          customerDefaultName={currentUser?.name}
          customerDefaultPhone={currentUser?.phone}
          customerDefaultEmail={currentUser?.email}
          initialDeliveryAddress={customerDeliveryAddress}
          initialCoords={customerCoords}
          savedAddresses={customerAddresses}
          selectedSavedAddress={selectedSavedAddress}
          onSelectSavedAddress={handleSelectSavedAddress}
          onOpenManageAddresses={() => {
            setShowCheckout(false);
            handleOpenProfileAddresses();
          }}
          clabeRodoFallback={settings.clabeRodo}
          expressSurcharge={settings.expressDeliverySurcharge}
          bancoRodoFallback={settings.bancoRodo}
          rainPauseEnabled={settings.rainPauseEnabled}
          rainPauseMessage={settings.rainPauseMessage}
          onAddToCart={(item) => handleAddToCart(item, cartRestaurant.id)}
          onOrderSuccess={handleOrderSuccess}
          onRequireLogin={() => setShowAuthModal(true)}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {/* 5. Modal de Ticket Digital (Formato Térmico con Enlaces WhatsApp Repartidores) */}
      <TicketModal
        key={viewingTicketOrder?.id}
        order={viewingTicketOrder}
        settings={settings}
        onClose={() => {
          setViewingTicketOrder(null);
          setRiderTicketToken(null);
          setIsRiderTicketView(false);
          if (window.location.search.includes('ticket=')) {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('ticket');
            cleanUrl.searchParams.delete('riderToken');
            window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
          }
          if (returnToAdminAfterTicket || isAdminLoggedIn) {
            setShowAdminPanel(true);
            setReturnToAdminAfterTicket(false);
          }
        }}
        isAdmin={isAdminLoggedIn && !isRiderTicketView}
        riderToken={riderTicketToken}
        isRiderMode={
          isRiderTicketView ||
          Boolean(
            String(currentUser?.role || '') === 'RIDER' &&
              viewingTicketOrder?.assignedRiderUserId === currentUser?.id
          )
        }
        onOrderUpdated={(updated) => {
          setViewingTicketOrder(updated);
          setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }}
        onShowToast={showSuccessToast}
      />

      {/* 6. Panel de Administración y Despacho del Propietario (Requiere Sesión Activa de Administrador) */}
      {showAdminPanel && isAdminLoggedIn && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white p-4 rounded-2xl flex items-center gap-3 font-bold text-xs shadow-2xl">
                <div className="w-5 h-5 border-2 border-[#ed0718] border-t-transparent rounded-full animate-spin" />
                <span>Cargando Panel de Despacho RODO...</span>
              </div>
            </div>
          }
        >
          <AdminPanel
            restaurants={restaurants}
            orders={orders}
            settings={settings}
            onClose={() => {
              setShowAdminPanel(false);
              setReturnToAdminAfterTicket(false);
            }}
            onRefreshData={loadData}
            onOpenTicket={(o) => {
              setReturnToAdminAfterTicket(true);
              setViewingTicketOrder(o);
            }}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleTheme}
            onLogoutAdmin={async () => {
              await handleFullLogout(false);
            }}
          />
        </React.Suspense>
      )}

      {/* 7. Modal de Autenticación Segura y Acceso Admin */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        adminPasscode={settings.adminPasscode}
        onCustomerLogin={(cust, mode: AuthSuccessMode = 'login') => {
          clearLocalOrdersCache();
          setIsAdminLoggedIn(false);
          setOrders([]);
          setCurrentUser(cust);
          if (cust.role === 'RIDER') {
            setTransactionFeedback(null);
            return;
          }
          const hasPendingCart = cart.length > 0;
          const firstName = (cust.name || 'Cliente').split(' ')[0];

          if (mode === 'register') {
            setTransactionFeedback({
              variant: 'register',
              title: '¡Registro Completado!',
              subtitle: `¡Bienvenido a RODO Moto Mandados, ${firstName}! Tu cuenta ya está lista para pedir comida, mandados y envíos.`,
              details: [
                { label: 'Titular', value: cust.name },
                { label: 'Correo', value: cust.email },
                {
                  label: 'Identidad INE',
                  value: 'Capturada · pendiente de revisión',
                  highlight: true,
                },
                { label: 'Privacidad', value: 'Historial y perfil 100% privados' },
              ],
              copyableCode: cust.referralCode
                ? {
                    label: '🎁 Tu Código de Referido ($35 MXN de descuento)',
                    value: cust.referralCode,
                  }
                : undefined,
              primaryActionLabel: hasPendingCart ? 'Continuar con mi Pedido' : '¡Empezar a Explorar!',
              onPrimaryAction: hasPendingCart ? () => setShowCheckout(true) : undefined,
            });
          } else if (mode === 'password_reset') {
            setTransactionFeedback({
              variant: 'password_reset',
              title: '¡Contraseña Restablecida!',
              subtitle: `Tu contraseña ha sido actualizada correctamente, ${firstName}. Iniciamos tu nueva sesión de forma segura.`,
              details: [
                { label: 'Cuenta', value: cust.email },
                { label: 'Seguridad', value: 'Sesiones anteriores cerradas', highlight: true },
              ],
              primaryActionLabel: hasPendingCart ? 'Continuar con mi Pedido' : 'Ir a Explorar RODO',
              onPrimaryAction: hasPendingCart ? () => setShowCheckout(true) : undefined,
            });
          } else {
            setTransactionFeedback({
              variant: 'login',
              title: `¡Bienvenido de vuelta, ${firstName}!`,
              subtitle: 'Has iniciado sesión correctamente. Ahora puedes ver tu perfil, direcciones y pedidos privados.',
              details: [
                { label: 'Usuario', value: cust.name },
                { label: 'Correo', value: cust.email },
                { label: 'Sesión', value: 'Activa', highlight: true },
              ],
              primaryActionLabel: hasPendingCart ? 'Continuar con mi Pedido' : 'Continuar en RODO',
              onPrimaryAction: hasPendingCart ? () => setShowCheckout(true) : undefined,
            });
          }
        }}
        onAdminLoginSuccess={() => {
          clearLocalOrdersCache();
          setCurrentUser(null);
          setOrders([]);
          setIsAdminLoggedIn(true);
          setShowAdminPanel(true);
          showSuccessToast('🛡️ ¡Acceso Administrativo concedido! Bienvenido al Panel RODO.');
        }}
      />

      {/* 7.5 Modal de Perfil Privado del Cliente (Datos, Direcciones, Referidos y Sesiones) */}
      <CustomerProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onUserUpdated={(updated) => setCurrentUser(updated)}
        onOpenMyOrders={() => setShowOrdersHistory(true)}
        onLogout={handleFullLogout}
        onShowToast={showSuccessToast}
        initialTab={profileInitialTab}
        selectedAddressId={selectedAddressId}
        onSelectDeliveryAddress={(addr) => {
          handleSelectSavedAddress(addr);
          setShowProfileModal(false);
        }}
        onAddressesChanged={handleAddressesChanged}
      />

      {/* 8. Modal de Historial de Pedidos */}
      {showOrdersHistory && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowOrdersHistory(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-[#101b29] text-white p-4 flex justify-between items-center">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#ed0718]" />
                {t('orderHistoryTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setShowOrdersHistory(false)}
                aria-label="Cerrar historial"
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reorderError && (
              <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3 mx-4 mt-3 rounded-xl text-xs flex items-center justify-between shadow-2xs">
                <span>{reorderError}</span>
                <button onClick={() => setReorderError(null)} className="text-gray-500 hover:text-black font-bold ml-2">✕</button>
              </div>
            )}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
              {myOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  Aún no tienes pedidos registrados.
                </div>
              ) : (
                myOrders.map((o) => (
                  <div
                    key={o.id}
                    className="p-3.5 border border-gray-200 rounded-xl bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-black text-gray-900">{o.folio}</span>
                      <div className="font-bold text-gray-800 mt-0.5">{o.restaurantName}</div>
                      <div className="text-gray-500 text-[11px]">
                        {new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                      <div className="text-[#ed0718] font-bold mt-0.5">${o.total.toFixed(2)} MXN</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setShowOrdersHistory(false);
                          setViewingTicketOrder(o);
                        }}
                        className="bg-[#101b29] hover:bg-black text-white px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        {t('viewTicket')}
                      </button>
                      <button
                        onClick={() => {
                          setReorderError(null);
                          const rest = restaurants.find(
                            (r) => r.id === o.restaurantId || r.name.toLowerCase() === o.restaurantName.toLowerCase()
                          );
                          if (!rest) {
                            setReorderError(`"${o.restaurantName}" no está disponible en este momento.`);
                            return;
                          }
                          if (rest.isOpen === false) {
                            setReorderError(`"${rest.name}" está cerrado temporalmente.`);
                            return;
                          }
                          setCart(o.items, rest.id);
                          setCatalogOverlay(null);
                          setShowOrdersHistory(false);
                          setShowCheckout(true);
                        }}
                        className="bg-[#ed0718] hover:bg-[#c90012] text-white px-3 py-1.5 rounded-lg font-black text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{t('reorder')}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal de Ayuda */}
      {showHelpModal && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowHelpModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-[#ed0718]" />
                Soporte RODO
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                aria-label="Cerrar ayuda"
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              ¿Tienes dudas con tu recolección, entrega o pago? Escríbenos por WhatsApp con tu folio.
            </p>
            <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1.5 text-gray-700">
              <div><b>Cobertura:</b> San Miguel de Allende y alrededores.</div>
              <div><b>Tiempo promedio:</b> 20 a 35 min.</div>
              <div><b>Pagos:</b> Efectivo y Transferencia SPEI.</div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-[#101b29] text-white py-2.5 rounded-xl font-black text-xs cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 11. Recuadro Superior Izquierdo: Ayuda, Privacidad, Cuentas, Promociones y Lo Básico */}
      <TopLeftMenuModal
        isOpen={showTopLeftMenu}
        onClose={() => setShowTopLeftMenu(false)}
        currentUser={currentUser}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenProfile={() => {
          setProfileInitialTab('perfil');
          setShowProfileModal(true);
        }}
        onOpenAdmin={() => {
          if (isAdminLoggedIn) {
            setShowAdminPanel(true);
          } else {
            setShowAuthModal(true);
          }
        }}
        onOpenInvestorDossier={() => {}}
        onOpenPermissions={() => setShowPhonePermissionsModal(true)}
        onOpenNotifications={() => {
          setShowNotificationCenter(true);
          markAllNotificationsAsRead(notificationScopeKey);
          setUnreadNotifsCount(0);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleTheme}
        onOpenTutorial={() => setShowTutorial(true)}
        onLogout={async () => {
          await handleFullLogout(false);
        }}
      />

      {/* 12. Modal de Permisos del Teléfono (Ubicación, Almacenamiento, Notificaciones, Cámara) */}
      <PhonePermissionsModal
        isOpen={showPhonePermissionsModal}
        onClose={() => setShowPhonePermissionsModal(false)}
      />

      {/* 14. Modal de Micro-Ubicación y Selector de Direcciones Guardadas del Cliente */}
      <CustomerMicroLocationModal
        isOpen={showMicroLocationModal}
        currentAddress={customerDeliveryAddress}
        initialCoords={customerCoords}
        savedAddresses={customerAddresses}
        selectedAddressId={selectedAddressId}
        isLoggedIn={Boolean(currentUser && !currentUser.id.startsWith('guest'))}
        onClose={() => setShowMicroLocationModal(false)}
        onSelectSavedAddress={(addr) => {
          handleSelectSavedAddress(addr);
          setShowMicroLocationModal(false);
        }}
        onManageAddresses={() => {
          setShowMicroLocationModal(false);
          handleOpenProfileAddresses();
        }}
        onRequireLogin={() => {
          setShowMicroLocationModal(false);
          setShowAuthModal(true);
        }}
        onSelectAddress={(addr, coords) => {
          setSelectedAddressId(null);
          setCustomerDeliveryAddress(addr);
          setCustomerCoords(coords);
          setShowMicroLocationModal(false);
          showSuccessToast('📍 ¡Ubicación de entrega actualizada correctamente!');
        }}
      />

      {/* 15. Modal para Locales sin Menú Fijo y 'No encontré mi local aquí' */}
      <CustomLocalOrderModal
        isOpen={showCustomOrderModal}
        onClose={() => {
          setShowCustomOrderModal(false);
          setCustomOrderInitialLocal(undefined);
        }}
        targetRestaurant={
          customOrderInitialLocal
            ? restaurants.find((r) => r.name === customOrderInitialLocal) || null
            : null
        }
        customerId={currentUser?.id || ''}
        customerDefaultName={currentUser?.name}
        customerDefaultPhone={currentUser?.phone}
        deliveryAddress={customerDeliveryAddress}
        onRequireLogin={() => setShowAuthModal(true)}
        rainPauseEnabled={!!settings.rainPauseEnabled}
        rainPauseMessage={settings.rainPauseMessage}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Modales cargados perezosamente con React.Suspense */}
      <React.Suspense fallback={null}>
        {/* 16. Modal de Cobertura RODO en San Miguel de Allende (Mapa Real Google Maps) */}
        {showCoverageModal && (
          <CustomerCoverageModal
            isOpen={showCoverageModal}
            onClose={() => setShowCoverageModal(false)}
            currentAddress={customerDeliveryAddress}
            initialCoords={customerCoords}
            settings={settings}
            restaurants={restaurants}
            onSelectRestaurant={(rest) => {
              setShowCoverageModal(false);
              setCatalogOverlay(rest);
            }}
            onConfirmLocation={(address, coords) => {
              setCustomerDeliveryAddress(address);
              setCustomerCoords(coords);
              setShowCoverageModal(false);
            }}
          />
        )}

        {/* 17. Modal Tutorial Interactivo para Primeros Usuarios */}
        <TutorialModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
        />

        {/* 18. Centro de Notificaciones y Timbre en Vivo (aislado por rol y usuario) */}
        {showNotificationCenter && (
          <NotificationCenterModal
            isOpen={showNotificationCenter}
            onClose={() => setShowNotificationCenter(false)}
            scopeKey={notificationScopeKey}
            unreadCount={unreadNotifsCount}
            isAdmin={isAdminLoggedIn}
            onSelectOrderFolio={(folio) => {
              const ord = myOrders.find((o) => o.folio.toUpperCase() === folio.toUpperCase());
              if (ord) setViewingTicketOrder(ord);
            }}
          />
        )}
      </React.Suspense>

      {/* Toast animado de confirmación al agregar al carrito */}
      <CartToast
        visible={cartToastState.visible}
        itemName={cartToastState.itemName}
        itemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        cartTotal={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
        onOpenCart={openCart}
        onDismiss={() => setCartToastState((prev) => ({ ...prev, visible: false }))}
      />

      {/* Modal de Rastreo en Vivo (se dispara cuando pedido pasa a 'en_camino') */}
      <LiveTrackingModal
        order={liveTrackingOrder}
        restaurants={restaurants}
        onClose={() => setLiveTrackingOrder(null)}
        onOpenTicket={(ord) => setViewingTicketOrder(ord)}
      />

      {/* Modal de Calificación Post-Entrega (se dispara cuando pedido llega a 'entregado') */}
      <OrderRatingModal
        order={ratingModalOrder}
        onClose={() => {
          if (ratingModalOrder) {
            dismissedRatingIdsRef.current.add(ratingModalOrder.id);
          }
          setRatingModalOrder(null);
        }}
        onSubmitted={(orderId) => {
          dismissedRatingIdsRef.current.add(orderId);
          showSuccessToast('⭐ ¡Gracias! Tu calificación fue registrada exitosamente.');
        }}
      />

      {/* Modal Celebratorio de Confirmación de Transacciones (Registro, Login, Contraseña, Pedido, Logout) */}
      <ActionFeedbackModal
        feedback={transactionFeedback}
        onClose={() => setTransactionFeedback(null)}
      />

      {/* Toast Superior Animado de Confirmaciones Exitosas */}
      <SuccessToastBanner
        message={successToast}
        onDismiss={() => setSuccessToast(null)}
      />

      {/* 20. Barra de Navegación Inferior Móvil (Tecladito Inferior: Atrás, Inicio, Envíos, Carrito, Mi Cuenta) */}
      <BottomMobileNav
        cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        cartTotal={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
        onBack={handleNavBack}
        onHome={handleNavHome}
        onOpenCart={openCart}
        onOpenExpress={() => {
          setActiveSection('envios');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAccount={handleOpenAccount}
        userName={currentUser?.name}
        isAdminLoggedIn={isAdminLoggedIn}
      />
    </div>
  );
}
