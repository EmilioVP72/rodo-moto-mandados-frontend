import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Restaurant, Order, DispatchSettings, OrderItem } from './types';
import {
  ensureDatabaseSeeded,
  getRestaurants,
  getDispatchSettings,
  getOrders,
  subscribeToOrders,
  subscribeToBroadcastNotifications,
  INITIAL_SETTINGS,
  INITIAL_SPECIALTIES,
  DEFAULT_RESTAURANTS,
  getLocalStoredRestaurants,
} from './services/db';
import { getRestaurantsFromIDB, getOrdersFromIDB } from './services/indexedDb';
import { calculateHaversineDistance, SMA_CENTER_COORDS } from './services/routing';
import { vibrateLight } from './utils/haptics';
import { useLanguage } from './utils/i18n';
import { CustomerHeader } from './components/CustomerHeader';
import { BottomMobileNav } from './components/BottomMobileNav';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';
import { CheckoutModal } from './components/CheckoutModal';
import { CartDrawerModal } from './components/CartDrawerModal';
import { TicketModal } from './components/TicketModal';
import { AuthModal } from './components/AuthModal';
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
const ProjectBackupsModal = React.lazy(() => import('./components/ProjectBackupsModal').then((m) => ({ default: m.ProjectBackupsModal })));
const DeveloperShareModal = React.lazy(() => import('./components/DeveloperShareModal').then((m) => ({ default: m.DeveloperShareModal })));
const CustomerCoverageModal = React.lazy(() => import('./components/CustomerCoverageModal').then((m) => ({ default: m.CustomerCoverageModal })));
const NotificationCenterModal = React.lazy(() => import('./components/NotificationCenterModal').then((m) => ({ default: m.NotificationCenterModal })));
import { getThemePreference, applyTheme, toggleTheme, ThemeMode } from './services/theme';
import { useDeviceType } from './utils/useDeviceType';
import {
  dispatchRodoNotification,
  getNotificationHistory,
  requestBrowserNotificationPermission,
} from './services/notifications';
import { apiFetch, getAuthToken, logoutSession } from './api/httpClient';
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

  // Modales automáticos de Tracking en Vivo, Calificación y Cart Toast
  const [liveTrackingOrder, setLiveTrackingOrder] = useState<Order | null>(null);
  const [ratingModalOrder, setRatingModalOrder] = useState<Order | null>(null);
  const [ordersHistoryFilter, setOrdersHistoryFilter] = useState<'todos' | 'en_camino' | 'entregado' | 'cancelado'>('todos');
  const [cartToastState, setCartToastState] = useState<{ visible: boolean; itemName: string }>({
    visible: false,
    itemName: '',
  });
  const cartToastTimerRef = useRef<number | null>(null);
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

  // Carrito de compras con persistencia
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [showPushNotificationPrompt, setShowPushNotificationPrompt] = useState<boolean>(false);
  const [cart, setCart] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('rodo_customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // Modales
  const [showCheckout, setShowCheckout] = useState(false);
  const [viewingTicketOrder, setViewingTicketOrder] = useState<Order | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOrdersHistory, setShowOrdersHistory] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTopLeftMenu, setShowTopLeftMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPhonePermissionsModal, setShowPhonePermissionsModal] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [showBackupsModal, setShowBackupsModal] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [shareTab, setShareTab] = useState<'clientes' | 'inversionista'>('clientes');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modo Obscuro / Claro con persistencia
  const [themeMode, setThemeMode] = useState<ThemeMode>(getThemePreference);
  const isDarkMode = themeMode === 'dark';

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => toggleTheme(prev));
  };

  // Centro de Notificaciones
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(() => {
    const hist = getNotificationHistory();
    return hist.filter((n) => !n.read).length;
  });

  const previousOrderStatusesRef = useRef<Record<string, string>>({});

  // Micro-ubicación y pedidos abiertos con persistencia
  const [showMicroLocationModal, setShowMicroLocationModal] = useState(false);
  const [customerDeliveryAddress, setCustomerDeliveryAddress] = useState<string>(() => {
    return localStorage.getItem('rodo_customer_address') || 'Calle Correo #14, Centro, San Miguel de Allende';
  });
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | undefined>({
    lat: 20.9144,
    lng: -100.7437,
  });
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [customOrderInitialLocal, setCustomOrderInitialLocal] = useState<string | undefined>(undefined);

  // Usuario autenticado con persistencia en localStorage
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string;
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
      } else if (
        hash === '#respaldo' ||
        hash === '#respaldos' ||
        hash === '#backup' ||
        hash === '#backups' ||
        params.get('view') === 'respaldo'
      ) {
        setShowBackupsModal(true);
      }
    };
    handleRouteTrigger();
    window.addEventListener('hashchange', handleRouteTrigger);
    return () => window.removeEventListener('hashchange', handleRouteTrigger);
  }, [isAdminLoggedIn]);

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
      dispatchRodoNotification(
        '🔔 Notificaciones RODO Activadas',
        'Recibirás alertas en tiempo real cuando tu pedido esté en camino y cuando el repartidor llegue a tu domicilio.',
        { type: 'info', playSound: true }
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

  useEffect(() => {
    localStorage.setItem('rodo_customer_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (selectedRestaurant) {
      localStorage.setItem('rodo_selected_restaurant', JSON.stringify(selectedRestaurant));
    } else {
      localStorage.removeItem('rodo_selected_restaurant');
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    localStorage.setItem('rodo_customer_address', customerDeliveryAddress);
  }, [customerDeliveryAddress]);

  useEffect(() => {
    localStorage.setItem('rodo_active_section', activeSection);
  }, [activeSection]);

  // Hidratación inicial rápida desde IndexedDB + Carga de datos remota
  useEffect(() => {
    (async () => {
      try {
        const [idbRests, idbOrds] = await Promise.all([
          getRestaurantsFromIDB(),
          getOrdersFromIDB(),
        ]);
        if (idbRests.length > 0) setRestaurants(idbRests);
        if (idbOrds.length > 0) setOrders((prev) => (prev.length === 0 ? idbOrds : prev));
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
      if (fetchedRestaurants && fetchedRestaurants.length > 0) {
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
      apiFetch<{ user?: { id: string; name: string; phone: string; email: string; role?: string } }>('/api/auth/me')
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
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [isAdminLoggedIn]);

  // Escucha de notificaciones promocionales masivas enviadas por el administrador
  useEffect(() => {
    let initialLoad = true;
    const unsubBroadcast = subscribeToBroadcastNotifications((items) => {
      if (initialLoad) {
        items.forEach((b) => seenBroadcastIdsRef.current.add(b.id));
        initialLoad = false;
        return;
      }
      items.forEach((b) => {
        if (!seenBroadcastIdsRef.current.has(b.id)) {
          seenBroadcastIdsRef.current.add(b.id);
          dispatchRodoNotification(
            `📣 ${b.title}`,
            `${b.message}${b.promoCode ? ` · Cupón: ${b.promoCode}` : ''}`,
            { type: 'info', playSound: true }
          );
          setUnreadNotifsCount((prev) => prev + 1);
        }
      });
    });
    return () => unsubBroadcast();
  }, []);

  useEffect(() => {
    const isAuthed = !!currentUser || isAdminLoggedIn;
    const unsubscribe = subscribeToOrders((liveOrders) => {
      setOrders(liveOrders);

      // Detectar cambios de estatus en tiempo real para notificaciones, LiveTrackingModal y OrderRatingModal
      liveOrders.forEach((order) => {
        const prevStatus = previousOrderStatusesRef.current[order.id];
        if (prevStatus && prevStatus !== order.status) {
          const isMyOrder = currentUser && order.customerId === currentUser.id;
          if (isMyOrder || isAdminLoggedIn) {
            if (order.status === 'recolectado' || order.status === 'asignado') {
              dispatchRodoNotification(
                '🛵 ¡Pedido Recolectado!',
                `Tu pedido en ${order.restaurantName || 'el local'} fue recolectado por el repartidor. Boleto #${order.folio}.`,
                { orderId: order.id, folio: order.folio, type: 'info', playSound: true }
              );
            } else if (order.status === 'en_camino') {
              dispatchRodoNotification(
                '🚀 ¡Repartidor en Camino!',
                `Tu pedido #${order.folio} va en ruta a tu domicilio en San Miguel de Allende.`,
                { orderId: order.id, folio: order.folio, type: 'info', playSound: true }
              );
              if (isMyOrder && !isAdminLoggedIn) {
                setLiveTrackingOrder(order);
              }
            } else if (order.status === 'afuera_del_domicilio') {
              dispatchRodoNotification(
                '🚨 ¡Repartidor Afuera de tu Domicilio!',
                `El repartidor está esperando afuera. Cuentas con 10 minutos de tolerancia para salir a recibir tu pedido #${order.folio}.`,
                { orderId: order.id, folio: order.folio, type: 'urgent', playSound: true }
              );
            } else if (order.status === 'entregado') {
              dispatchRodoNotification(
                '🎉 ¡Pedido Entregado!',
                `Tu pedido #${order.folio} ha sido entregado exitosamente. ¡Buen provecho!`,
                { orderId: order.id, folio: order.folio, type: 'success', playSound: true }
              );
              if (
                isMyOrder &&
                !isAdminLoggedIn &&
                !order.rating &&
                !order.riderRating &&
                !dismissedRatingIdsRef.current.has(order.id)
              ) {
                setLiveTrackingOrder(null);
                setRatingModalOrder(order);
              }
            }
            setUnreadNotifsCount((prev) => prev + 1);
          }
        }
        previousOrderStatusesRef.current[order.id] = order.status;
      });

      const urlParams = new URLSearchParams(window.location.search);
      const ticketParam = urlParams.get('ticket');
      if (ticketParam) {
        const matchingOrder = liveOrders.find((o) => o.folio.toUpperCase() === ticketParam.toUpperCase());
        if (matchingOrder) {
          setViewingTicketOrder(matchingOrder);
        }
      }
    }, isAuthed);

    return () => unsubscribe();
  }, [currentUser, isAdminLoggedIn]);

  // Agregar al carrito con inmutabilidad estricta, vibración háptica y CartToast animado
  const handleAddToCart = (item: OrderItem) => {
    vibrateLight();
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        return prev.map((it, i) =>
          i === idx ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [...prev, { ...item, quantity: item.quantity ? Math.max(1, item.quantity) : 1 }];
    });
    setCartToastState({ visible: true, itemName: item.name });
    if (cartToastTimerRef.current) {
      window.clearTimeout(cartToastTimerRef.current);
    }
    cartToastTimerRef.current = window.setTimeout(() => {
      setCartToastState((prev) => ({ ...prev, visible: false }));
    }, 2800);
  };

  // Quitar o decrementar del carrito
  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      let idx = prev.findIndex((i) => i.id === itemId);
      if (idx < 0) {
        idx = prev.findIndex((i) => i.id.startsWith(`${itemId}-`));
      }
      if (idx >= 0) {
        if (prev[idx].quantity > 1) {
          return prev.map((it, i) =>
            i === idx ? { ...it, quantity: it.quantity - 1 } : it
          );
        }
        return prev.filter((_, i) => i !== idx);
      }
      return prev;
    });
  };

  // Abrir checkout: El cliente puede llenar el carrito libremente como visitante,
  // y antes de pagar se le solicita iniciar sesión con su INE.
  const handleProceedToCheckout = () => {
    if (!currentUser || !currentUser.id || currentUser.id.startsWith('guest')) {
      setShowAuthModal(true);
      return;
    }
    setShowCheckout(true);
  };

  // Pedido completado con éxito
  const handleOrderSuccess = (newOrder: Order) => {
    setShowCheckout(false);
    setSelectedRestaurant(null);
    setCart([]);
    setViewingTicketOrder(newOrder);

    dispatchRodoNotification(
      '✓ Pedido Confirmado',
      `Tu orden #${newOrder.folio} (${newOrder.restaurantName}) ha sido enviada para asignación de repartidor.`,
      { orderId: newOrder.id, folio: newOrder.folio, type: 'info', playSound: true }
    );
    setUnreadNotifsCount((prev) => prev + 1);
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

  // Pedidos del cliente actual y filtro de historial
  const myOrders = useMemo(() => {
    if (!currentUser) return orders.slice(0, 8);
    return orders.filter((o) => o.customerId === currentUser.id);
  }, [orders, currentUser]);

  const filteredMyOrders = useMemo(() => {
    if (ordersHistoryFilter === 'todos') return myOrders;
    if (ordersHistoryFilter === 'en_camino') {
      return myOrders.filter((o) =>
        ['nuevo', 'en_preparacion', 'asignado', 'recolectado', 'en_camino', 'afuera_del_domicilio', 'pendiente_cotizacion'].includes(o.status)
      );
    }
    if (ordersHistoryFilter === 'entregado') {
      return myOrders.filter((o) => o.status === 'entregado');
    }
    return myOrders.filter((o) => o.status === 'cancelado' || o.status === 'cancelado_con_deuda');
  }, [myOrders, ordersHistoryFilter]);

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
    if (showCartDrawer) { setShowCartDrawer(false); return; }
    if (showCheckout) { setShowCheckout(false); return; }
    if (viewingTicketOrder) { setViewingTicketOrder(null); return; }
    if (showAdminPanel) { setShowAdminPanel(false); return; }
    if (showAuthModal) { setShowAuthModal(false); return; }
    if (showCoverageModal) { setShowCoverageModal(false); return; }
    if (showOrdersHistory) { setShowOrdersHistory(false); return; }
    if (showHelpModal) { setShowHelpModal(false); return; }
    if (showTopLeftMenu) { setShowTopLeftMenu(false); return; }
    if (showShareModal) { setShowShareModal(false); return; }
    if (showBackupsModal) { setShowBackupsModal(false); return; }
    if (showPhonePermissionsModal) { setShowPhonePermissionsModal(false); return; }
    if (showMicroLocationModal) { setShowMicroLocationModal(false); return; }
    if (showCustomOrderModal) { setShowCustomOrderModal(false); return; }
    if (selectedRestaurant) { setSelectedRestaurant(null); return; }
    if (activeSection === 'envios') { setActiveSection('restaurantes'); return; }
    if (selectedCategory !== 'Todos') { setSelectedCategory('Todos'); return; }
    if (searchQuery) { setSearchQuery(''); return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Manejador del Teclado Inferior Móvil: Ir a Inicio
  const handleNavHome = () => {
    setShowCartDrawer(false);
    setShowCheckout(false);
    setViewingTicketOrder(null);
    setShowAdminPanel(false);
    setShowAuthModal(false);
    setShowCoverageModal(false);
    setShowBackupsModal(false);
    setShowOrdersHistory(false);
    setShowHelpModal(false);
    setShowTopLeftMenu(false);
    setShowShareModal(false);
    setShowPhonePermissionsModal(false);
    setShowMicroLocationModal(false);
    setShowCustomOrderModal(false);
    setSelectedRestaurant(null);
    setActiveSection('restaurantes');
    setSelectedCategory('Todos');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={`w-full max-w-full overflow-x-hidden min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-[#101b29] dark:text-slate-100 font-sans pb-28 transition-colors relative ${
        deviceInfo.isMobile ? 'device-mobile' : deviceInfo.isTablet ? 'device-tablet' : 'device-desktop'
      }`}
    >
      {/* Alerta Global de Pausa de Envíos por Lluvia */}
      {settings.rainPauseEnabled && (
        <div className="bg-gradient-to-r from-sky-700 via-blue-800 to-sky-700 text-white px-4 py-3 text-xs font-bold text-center flex flex-wrap items-center justify-center gap-2 shadow-md border-b border-sky-900">
          <CloudRain className="w-5 h-5 text-sky-200 shrink-0 animate-bounce" />
          <span className="font-black uppercase tracking-wide">
            🌧️ Pausa Temporal por Lluvia:
          </span>
          <span>
            {settings.rainPauseMessage ||
              'Envíos pausados temporalmente por lluvia en San Miguel de Allende. Reanudamos en cuanto mejore el clima.'}
          </span>
        </div>
      )}

      {/* Alerta de Modo Día Festivo / Desfiles en San Miguel */}
      {settings.festiveModeEnabled && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white px-4 py-2.5 text-xs font-bold text-center flex flex-wrap items-center justify-center gap-2 shadow-sm border-b border-amber-800">
          <Sparkles className="w-4 h-4 text-amber-200 shrink-0 animate-spin" />
          <span>{settings.festiveModeMessage || 'Fechas Festivas en San Miguel de Allende: Se prevén demoras en tránsito.'}</span>
          <span className="bg-black/30 px-2 py-0.5 rounded font-mono font-black text-[11px] text-amber-200">
            Demora estimada: {settings.festiveEstimatedDelay || '+15 a 25 min'}
          </span>
        </div>
      )}

      {/* Alerta de Activación de Notificaciones Push del Navegador */}
      {showPushNotificationPrompt && (
        <div className="bg-[#101b29] text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md border-b-2 border-[#ed0718] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">🔔</span>
            <div>
              <span className="font-extrabold block">¿Deseas activar las notificaciones de tus pedidos?</span>
              <span className="text-[11px] text-gray-300">
                Te avisaremos en tiempo real cuando tu repartidor vaya en camino y cuando esté afuera de tu domicilio.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEnablePushNotifications}
              className="bg-[#ed0718] hover:bg-[#c90012] text-white px-3 py-1.5 rounded-xl font-black text-xs shadow-xs transition cursor-pointer"
            >
              Activar Notificaciones
            </button>
            <button
              onClick={() => setShowPushNotificationPrompt(false)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      {/* Alerta de Urgencia: Repartidor Afuera del Domicilio (10 min tolerancia) */}
      {orders.some((o) => o.status === 'afuera_del_domicilio') && (
        <div className="bg-[#ed0718] text-white px-4 py-3 text-xs font-black flex flex-wrap items-center justify-between gap-3 shadow-lg border-b-2 border-red-900 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <span className="text-sm uppercase tracking-wide block">🚨 ¡Tu Repartidor ya está afuera de tu Domicilio!</span>
              <span className="text-[11px] text-white/90 font-normal">
                Tienes 10 minutos de tolerancia para salir a recibir tu pedido antes de que se cancele.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              const activeOrder = orders.find((o) => o.status === 'afuera_del_domicilio');
              if (activeOrder) setViewingTicketOrder(activeOrder);
            }}
            className="bg-white text-[#ed0718] hover:bg-gray-100 px-3.5 py-1.5 rounded-xl font-black text-xs shadow-md transition cursor-pointer"
          >
            Ver Ticket Digital
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
        onOpenLocationModal={() => setShowMicroLocationModal(true)}
        currentAddressLabel={customerDeliveryAddress}
        onShareApp={() => setShowShareModal(true)}
        onOpenNotifications={() => {
          setShowNotificationCenter(true);
          setUnreadNotifsCount(0);
        }}
        unreadNotificationsCount={unreadNotifsCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleTheme}
        holidayThemeId={settings.activeHolidayTheme}
        onOpenDeveloperModal={() => setShowDeveloperModal(true)}
        restaurants={restaurants}
        onSelectSuggestionRestaurant={(rest) => {
          if (rest.hasFixedMenu === false) {
            setCustomOrderInitialLocal(rest.name);
            setShowCustomOrderModal(true);
          } else {
            if (selectedRestaurant?.id !== rest.id) setCart([]);
            setSelectedRestaurant(rest);
          }
        }}
        onSelectSuggestionCategory={(category, section) => {
          setActiveSection(section);
          handleSelectCategoryWithHighlight(category);
        }}
      />


      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Banner Hero RODO */}
        <section className="relative h-56 sm:h-64 rounded-3xl overflow-hidden shadow-md flex items-center p-6 sm:p-10 text-white bg-linear-to-r from-black/90 via-black/70 to-transparent">
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
            customerId={currentUser?.id || 'guest-envio'}
            customerDefaultName={currentUser?.name}
            customerDefaultPhone={currentUser?.phone}
            rainPauseEnabled={settings.rainPauseEnabled}
            rainPauseMessage={settings.rainPauseMessage}
            onOrderSuccess={handleOrderSuccess}
            onRequireLogin={() => setShowAuthModal(true)}
          />
        ) : (
          <>
            {/* Carrusel de Categorías (con scroll + highlight automático al catálogo) */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">
                  {activeSection === 'restaurantes' ? t('whatDoYouCrave') : t('motoAndStalls')}
                </h2>
                <button
                  onClick={() => handleSelectCategoryWithHighlight('Todos')}
                  className="text-xs font-extrabold text-[#c90012] hover:underline cursor-pointer"
                >
                  {t('viewAll')}
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
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
                    className={`flex flex-col items-center min-w-[85px] sm:min-w-[95px] p-1.5 rounded-2xl transition cursor-pointer ${
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
            </section>

            {/* Panel de Locales Destacados */}
            <section
              id="catalogo-restaurantes"
              className={`bg-[#101b29] text-white rounded-3xl p-4 sm:p-7 shadow-lg transition-all duration-300 ${
                highlightedCatalog ? 'ring-4 ring-[#ed0718] ring-offset-2' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-extrabold text-lg sm:text-xl">
                    {activeSection === 'restaurantes'
                      ? '🍴 Restaurantes con Facturación'
                      : '🏍 Motomandados, Comercios & Esenciales'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeSection === 'restaurantes'
                      ? 'Locales formales que sí facturan · Aceptan Efectivo y Transferencia SPEI'
                      : 'Tiendas, farmacias, mercados y puestos de barrio · Pago en Efectivo'}
                  </p>
                </div>
                <button
                  onClick={() => handleSelectCategoryWithHighlight('Todos')}
                  className="text-xs text-[#ed0718] hover:text-red-400 font-extrabold cursor-pointer"
                >
                  {t('viewAllCatalog')}
                </button>
              </div>

              {/* Barra de Filtros Rápidos y Ordenamiento Avanzado */}
              <div className="mb-6 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  {/* Selector de Orden */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> {t('sortLabel')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSortOption('default')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
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
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                        sortOption === 'fastest'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      <span>⚡</span>
                      <span>{t('sortFastest')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortOption('distance')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                        sortOption === 'distance'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      <span>📍</span>
                      <span>{t('sortDistance')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortOption('rating')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                        sortOption === 'rating'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      <span>⭐</span>
                      <span>{t('sortRating')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortOption('cheapest_delivery')}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                        sortOption === 'cheapest_delivery'
                          ? 'bg-[#ed0718] text-white shadow-xs'
                          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      <span>🛵</span>
                      <span>{t('sortCheapest')}</span>
                    </button>
                  </div>

                  {/* Conteo de Resultados */}
                  <span className="text-xs font-mono font-bold text-gray-300 ml-auto">
                    {filteredRestaurants.length} {t('placesCount')}
                  </span>
                </div>

                {/* Filtros Toggle y Rango de Precio */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Toggle Abiertos Ahora */}
                    <button
                      type="button"
                      onClick={() => setOnlyOpenNow((prev) => !prev)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer border ${
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
                      className={`text-xs px-2.5 py-1 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer border ${
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
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[10px] text-gray-400 uppercase font-black mr-1">{t('priceLabel')}</span>
                    {(['all', '$', '$$', '$$$', '$$$$'] as const).map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => setSelectedPriceRange(pr)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
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
                            if (selectedRestaurant?.id !== restaurant.id) {
                              setCart([]);
                            }
                            setSelectedRestaurant(restaurant);
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
                                🚫 Cerrado por Desfile / Evento
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
                          <div className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="font-extrabold text-base leading-snug line-clamp-1">
                                {restaurant.name}
                              </h3>
                              <span className="text-[10px] font-mono font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                                📍 {distKm} km
                              </span>
                            </div>

                            {/* Aviso de cierre temporal por desfile o evento */}
                            {restaurant.isOpen === false && (
                              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1.5 rounded-lg text-[11px] font-bold">
                                ⚠️ {restaurant.closureReason || 'Cerrado por evento o desfile en San Miguel'}
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                              <span className="flex items-center gap-0.5 text-black font-bold">
                                <Star className="w-3.5 h-3.5 fill-[#ed0718] text-[#ed0718]" />
                                {restaurant.rating}
                              </span>
                              <span>({restaurant.reviews} reseñas)</span>
                              <span>·</span>
                              <span className="text-gray-500 font-medium truncate">
                                🕒 {restaurant.schedule || '12:00 PM – 10:00 PM'}
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
                        <div className="p-4 pt-0">
                          {restaurant.hasFixedMenu === false ? (
                            <button
                              onClick={() => {
                                setCustomOrderInitialLocal(restaurant.name);
                                setShowCustomOrderModal(true);
                              }}
                              className="w-full font-black text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 bg-[#101b29] hover:bg-black text-white cursor-pointer"
                            >
                              <span>✍️ Pide lo que se te antoje (Cotización RODO)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (selectedRestaurant?.id !== restaurant.id) {
                                  setCart([]);
                                }
                                setSelectedRestaurant(restaurant);
                              }}
                              className={`w-full font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 ${
                                restaurant.isOpen === false
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-[#ed0718] hover:bg-[#c90012] text-white'
                              }`}
                            >
                              <span>{restaurant.isOpen === false ? 'Ver Menú (Pedidos Pausados)' : 'Ver Menú & Pedir'}</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Botón / Sección: No encontré mi local aquí */}
              <div className="mt-6 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base">
                      ¿No encontraste el local o puesto que buscas en San Miguel?
                    </h3>
                    <p className="text-xs text-gray-300">
                      Anota qué local o changarro buscas y qué necesitas. Nosotros lo localizamos y te cotizamos el servicio.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCustomOrderInitialLocal(undefined);
                    setShowCustomOrderModal(true);
                  }}
                  className="bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition whitespace-nowrap cursor-pointer shrink-0"
                >
                  🔍 Solicitar Local No Encontrado
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

        {/* Nota al pie */}
        <footer className="text-center text-xs text-gray-500 pt-4 pb-2 space-y-2">
          <p className="font-semibold text-gray-600">RODO Moto Mandados · San Miguel de Allende, Gto.</p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-gray-400 flex-wrap">
            <button
              onClick={() => {
                setShareTab('clientes');
                setShowShareModal(true);
              }}
              className="hover:text-emerald-600 underline font-semibold transition flex items-center gap-1"
            >
              <Share2 className="w-3 h-3 text-emerald-500 inline" />
              <span>Compartir App</span>
            </button>
          </div>
        </footer>
      </main>

      {/* 2.5 Modal Canasta / Carrito Lateral */}
      <CartDrawerModal
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        cart={cart}
        restaurant={selectedRestaurant}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={() => {
          setCart([]);
          setSelectedRestaurant(null);
        }}
        onProceedToCheckout={() => {
          setShowCartDrawer(false);
          if (selectedRestaurant && cart.length > 0) {
            handleProceedToCheckout();
          }
        }}
      />

      {/* 3. Modal de Menú y Detalle del Restaurante */}
      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        cart={cart}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        onProceedToCheckout={handleProceedToCheckout}
        onClose={() => {
          setSelectedRestaurant(null);
        }}
      />

      {/* 4. Modal de Checkout con Folio Único, Cupón, Alergias, Geofencing y Validación de Cierre en Vivo */}
      {showCheckout && selectedRestaurant && (
        <CheckoutModal
          restaurant={selectedRestaurant}
          restaurants={restaurants}
          coveragePolygon={settings.coveragePolygon}
          cart={cart}
          customerId={currentUser?.id || 'guest-' + Date.now()}
          customerDefaultName={currentUser?.name}
          customerDefaultPhone={currentUser?.phone}
          customerDefaultEmail={currentUser?.email}
          initialDeliveryAddress={customerDeliveryAddress}
          initialCoords={customerCoords}
          clabeRodoFallback={settings.clabeRodo}
          bancoRodoFallback={settings.bancoRodo}
          rainPauseEnabled={settings.rainPauseEnabled}
          rainPauseMessage={settings.rainPauseMessage}
          onOrderSuccess={handleOrderSuccess}
          onRequireLogin={() => setShowAuthModal(true)}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {/* 5. Modal de Ticket Digital (Formato Térmico con Enlaces WhatsApp Repartidores) */}
      <TicketModal
        order={viewingTicketOrder}
        settings={settings}
        onClose={() => {
          setViewingTicketOrder(null);
          if (returnToAdminAfterTicket || isAdminLoggedIn) {
            setShowAdminPanel(true);
            setReturnToAdminAfterTicket(false);
          }
        }}
        isAdmin={isAdminLoggedIn}
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
              setIsAdminLoggedIn(false);
              setCurrentUser(null);
              setShowAdminPanel(false);
              setReturnToAdminAfterTicket(false);
              localStorage.removeItem('rodo_admin_session');
              try {
                await logoutSession();
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </React.Suspense>
      )}

      {/* 7. Modal de Autenticación Segura y Acceso Admin */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        adminPasscode={settings.adminPasscode}
        onCustomerLogin={(cust) => {
          setCurrentUser(cust);
          if (selectedRestaurant && cart.length > 0) {
            setShowCheckout(true);
          }
        }}
        onAdminLoginSuccess={() => {
          setIsAdminLoggedIn(true);
          setShowAdminPanel(true);
        }}
      />

      {/* 8. Modal de Historial de Pedidos con Filtros de Estado y Rastreo en Vivo */}
      {showOrdersHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-[#101b29] text-white p-4 flex justify-between items-center">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#ed0718]" />
                {t('orderHistoryTitle')}
              </h3>
              <button onClick={() => setShowOrdersHistory(false)} className="text-gray-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            {/* Pestañas de filtro por estado */}
            <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex gap-1.5 overflow-x-auto text-xs font-bold">
              {(
                [
                  { id: 'todos', label: t('filterAll') },
                  { id: 'en_camino', label: t('filterOnWay') },
                  { id: 'entregado', label: t('filterDelivered') },
                  { id: 'cancelado', label: t('filterCancelled') },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOrdersHistoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    ordersHistoryFilter === tab.id
                      ? 'bg-[#ed0718] text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {reorderError && (
              <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3 mx-4 mt-3 rounded-xl text-xs flex items-center justify-between shadow-2xs">
                <span>⚠️ {reorderError}</span>
                <button onClick={() => setReorderError(null)} className="text-gray-500 hover:text-black font-bold ml-2">✕</button>
              </div>
            )}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
              {filteredMyOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No hay pedidos en esta categoría.
                </div>
              ) : (
                filteredMyOrders.map((o) => (
                  <div
                    key={o.id}
                    className="p-3.5 border rounded-xl bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-gray-900">{o.folio}</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            o.status === 'entregado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.status === 'cancelado' || o.status === 'cancelado_con_deuda'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="font-bold text-gray-800 mt-0.5">{o.restaurantName}</div>
                      <div className="text-gray-500 text-[11px]">
                        {new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                      <div className="text-[#ed0718] font-bold mt-0.5">${o.total.toFixed(2)} MXN</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      {(o.status === 'en_camino' || o.status === 'afuera_del_domicilio') && (
                        <button
                          onClick={() => {
                            setShowOrdersHistory(false);
                            setLiveTrackingOrder(o);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer"
                        >
                          {t('liveTrack')}
                        </button>
                      )}
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
                            setReorderError(`El establecimiento "${o.restaurantName}" no está disponible en este momento.`);
                            return;
                          }
                          if (rest.isOpen === false) {
                            setReorderError(`El local "${rest.name}" está cerrado temporalmente (${rest.closureReason || 'pedidos pausados'}).`);
                            return;
                          }
                          // Cargar productos del ticket previo al carrito y redirigir al checkout
                          setCart(o.items);
                          setSelectedRestaurant(rest);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-[#ed0718]" />
              Atención y Soporte RODO
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              ¿Tienes alguna duda con la recolección, entrega o verificación de tu pago? Puedes comunicarte directamente con el despachador de guardia de RODO Moto Mandados.
            </p>
            <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
              <div>📍 <b>Zona de cobertura:</b> San Miguel y alrededores.</div>
              <div>🏍️ <b>Tiempo promedio de reparto:</b> 20 a 35 minutos.</div>
              <div>💳 <b>Pagos:</b> Efectivo en entrega y Transferencia SPEI auditada.</div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-[#101b29] text-white py-2.5 rounded-xl font-black text-xs"
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
          setUnreadNotifsCount(0);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleTheme}
        onOpenDeveloperModal={() => setShowDeveloperModal(true)}
        onOpenTutorial={() => setShowTutorial(true)}
        onLogout={async () => {
          await logoutSession();
          setIsAdminLoggedIn(false);
          setCurrentUser(null);
        }}
      />

      {/* 12. Modal de Permisos del Teléfono (Ubicación, Almacenamiento, Notificaciones, Cámara) */}
      <PhonePermissionsModal
        isOpen={showPhonePermissionsModal}
        onClose={() => setShowPhonePermissionsModal(false)}
      />

      {/* 13. Modal para Compartir por WhatsApp (Para Clientes / Amigos y Opcional para Inversionistas) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
            {/* Header del modal */}
            <div className="bg-[#101b29] text-white p-5 flex justify-between items-center border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="bg-[#25D366] p-2.5 rounded-xl text-white shadow-xs">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    Compartir RODO Moto Mandados
                  </h3>
                  <p className="text-[11px] text-gray-300">
                    San Miguel de Allende · Enlace web instantáneo sin descargas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Contenido limpio para Clientes */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-gray-700">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
                <p className="text-emerald-900 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Experiencia Limpia para Cualquier Persona
                </p>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Al abrir este enlace, la persona verá la app 100% limpia como cliente: catálogo con fotos de comida (tacos, pizza, hamburguesas, pollo rostizado, etc.), motomandados, envíos express y carrito con ticket en vivo.
                </p>
              </div>

              {/* Vista previa del mensaje de WhatsApp */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Mensaje redactado para compartir por WhatsApp:
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-[11px] text-gray-700 space-y-2 font-mono whitespace-pre-wrap leading-relaxed">
                  {`¡Hola! Te recomiendo pedir en *RODO Moto Mandados* aquí en San Miguel de Allende 🏍️🍔🌮\n\n` +
                    `Pide comida de tus locales favoritos, solicita compras, motomandados o envíos express directo a tu domicilio:\n` +
                    `👉 https://ais-pre-eooztaby6uofrzjmraerfo-60690626410.us-west2.run.app\n\n` +
                    `✨ *Servicios disponibles:* \n` +
                    `• Comida de restaurantes y antojitos locales\n` +
                    `• Motomandados y compras de tiendas\n` +
                    `• Envíos express de paquetes y documentos`}
                </div>
              </div>

              {/* Botón WhatsApp Listo para Enviar a Clientes */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `¡Hola! Te recomiendo pedir en *RODO Moto Mandados* aquí en San Miguel de Allende 🏍️🍔🌮\n\n` +
                  `Pide comida de tus locales favoritos, solicita compras, motomandados o envíos express directo a tu domicilio:\n` +
                  `👉 https://ais-pre-eooztaby6uofrzjmraerfo-60690626410.us-west2.run.app\n\n` +
                  `✨ *Servicios disponibles:* \n` +
                  `• Comida de restaurantes y antojitos locales\n` +
                  `• Motomandados y compras de tiendas\n` +
                  `• Envíos express de paquetes y documentos\n\n` +
                  `¡Entra directamente y haz tu pedido!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar Invitación por WhatsApp a Clientes / Amigos</span>
              </a>

              {/* Caja de Enlace Copiable */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  O copia el enlace directo:
                </label>
                <div className="flex items-center gap-2 bg-gray-100 p-2.5 rounded-xl border border-gray-300 font-mono text-[11px] text-gray-800 break-all select-all">
                  <span className="flex-1">https://ais-pre-eooztaby6uofrzjmraerfo-60690626410.us-west2.run.app</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://ais-pre-eooztaby6uofrzjmraerfo-60690626410.us-west2.run.app');
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 3000);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shrink-0 ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#101b29] text-white hover:bg-black'
                    }`}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-black text-white font-bold text-xs rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. Modal de Micro-Ubicación del Cliente con Ajuste Fino ±30m */}
      <CustomerMicroLocationModal
        isOpen={showMicroLocationModal}
        currentAddress={customerDeliveryAddress}
        onClose={() => setShowMicroLocationModal(false)}
        onSelectAddress={(addr, coords) => {
          setCustomerDeliveryAddress(addr);
          setCustomerCoords(coords);
          setShowMicroLocationModal(false);
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
        onOrderSuccess={(order) => {
          setShowCustomOrderModal(false);
          setViewingTicketOrder(order);
        }}
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
              setSelectedRestaurant(rest);
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

        {/* 18. Centro de Notificaciones y Timbre en Vivo */}
        {showNotificationCenter && (
          <NotificationCenterModal
            isOpen={showNotificationCenter}
            onClose={() => setShowNotificationCenter(false)}
            onSelectOrderFolio={(folio) => {
              const ord = orders.find((o) => o.folio.toUpperCase() === folio.toUpperCase());
              if (ord) setViewingTicketOrder(ord);
            }}
          />
        )}

        {/* 19.5 Modal de Descarga de Respaldos ZIP del Proyecto para el Celular */}
        {showBackupsModal && (
          <ProjectBackupsModal
            isOpen={showBackupsModal}
            onClose={() => setShowBackupsModal(false)}
          />
        )}

        {/* 19.6 Modal para Compartir Todo el Proyecto al Programador / Subir a la Red */}
        {showDeveloperModal && (
          <DeveloperShareModal
            isOpen={showDeveloperModal}
            onClose={() => setShowDeveloperModal(false)}
          />
        )}
      </React.Suspense>

      {/* Toast animado de confirmación al agregar al carrito */}
      <CartToast
        visible={cartToastState.visible}
        itemName={cartToastState.itemName}
        itemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        cartTotal={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
        onOpenCart={() => {
          setCartToastState((prev) => ({ ...prev, visible: false }));
          setShowCartDrawer(true);
        }}
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
        }}
      />

      {/* 20. Barra de Navegación Inferior Móvil (Tecladito Inferior: Atrás, Inicio, Envíos, Carrito, Mi Cuenta) */}
      <BottomMobileNav
        cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        cartTotal={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
        onBack={handleNavBack}
        onHome={handleNavHome}
        onOpenCart={() => setShowCartDrawer(true)}
        onOpenExpress={() => {
          setActiveSection('envios');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAccount={() => setShowAuthModal(true)}
      />
    </div>
  );
}
