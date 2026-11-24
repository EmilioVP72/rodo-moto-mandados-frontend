// Sistema integral de Notificaciones para RODO Moto Mandados:
// 1. Web Notification API del navegador (Push en tiempo real para escritorio y móvil).
// 2. Chime de audio sintetizado con Web Audio API (sin dependencias externas, funciona offline).
// 3. Historial persistente AISLADO estrictamente por rol (Admin vs Cliente) y por usuario.

export type NotificationAudience = 'admin' | 'customer' | 'broadcast';

export interface RodoNotification {
  id: string;
  title: string;
  message: string;
  orderId?: string;
  folio?: string;
  quoteOfferedAt?: string;
  audience?: NotificationAudience;
  type: 'info' | 'success' | 'warning' | 'urgent';
  timestamp: string;
  read: boolean;
}

export interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  soundEnabled: boolean;
  urgentAlertsEnabled: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SETTINGS_KEY = 'rodo_notification_settings';
const LEGACY_SHARED_HISTORY_KEY = 'rodo_notifications_history';
const HISTORY_KEY_PREFIX = 'rodo_notifications_history_v2_';

function getDefaultStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

/**
 * Resuelve la clave aislada del historial de notificaciones según la sesión activa.
 * Admin, cada Cliente y Visitante mantienen buzones completamente separados.
 */
export function resolveNotificationScopeKey(params: {
  isAdmin?: boolean;
  userId?: string | null;
}): string {
  if (params.isAdmin) {
    return `${HISTORY_KEY_PREFIX}admin`;
  }
  const uid = (params.userId || '').trim();
  if (uid && !uid.startsWith('guest')) {
    return `${HISTORY_KEY_PREFIX}user_${uid}`;
  }
  return `${HISTORY_KEY_PREFIX}guest`;
}

export function clearLegacySharedNotificationHistory(storage?: StorageLike): void {
  const store = getDefaultStorage(storage);
  if (!store) return;
  try {
    store.removeItem(LEGACY_SHARED_HISTORY_KEY);
  } catch {
    // ignore
  }
}

export const getNotificationSettings = (storage?: StorageLike): NotificationSettings => {
  const store = getDefaultStorage(storage);
  try {
    const saved = store?.getItem(SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return {
    browserNotificationsEnabled: true,
    soundEnabled: true,
    urgentAlertsEnabled: true,
  };
};

export const saveNotificationSettings = (
  settings: NotificationSettings,
  storage?: StorageLike
) => {
  const store = getDefaultStorage(storage);
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

export const getNotificationHistory = (
  scopeKey: string,
  storage?: StorageLike
): RodoNotification[] => {
  const store = getDefaultStorage(storage);
  if (!store || !scopeKey) return [];
  try {
    const saved = store.getItem(scopeKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // fallback
  }
  return [];
};

export const addNotificationToHistory = (
  notif: Omit<RodoNotification, 'id' | 'timestamp' | 'read'>,
  scopeKey: string,
  storage?: StorageLike
): RodoNotification => {
  const newNotif: RodoNotification = {
    ...notif,
    id: 'notif-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    read: false,
  };

  const store = getDefaultStorage(storage);
  if (store && scopeKey) {
    try {
      const current = getNotificationHistory(scopeKey, store);
      const updated = [newNotif, ...current].slice(0, 50); // Mantener últimas 50 por usuario/rol
      store.setItem(scopeKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  return newNotif;
};

export const markNotificationAsRead = (
  id: string,
  scopeKey: string,
  storage?: StorageLike
) => {
  const store = getDefaultStorage(storage);
  if (!store || !scopeKey) return;
  try {
    const current = getNotificationHistory(scopeKey, store);
    const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    store.setItem(scopeKey, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

export const markAllNotificationsAsRead = (
  scopeKey: string,
  storage?: StorageLike
) => {
  const store = getDefaultStorage(storage);
  if (!store || !scopeKey) return;
  try {
    const current = getNotificationHistory(scopeKey, store);
    if (current.some((n) => !n.read)) {
      const updated = current.map((n) => ({ ...n, read: true }));
      store.setItem(scopeKey, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
};

export const clearNotificationHistory = (scopeKey: string, storage?: StorageLike) => {
  const store = getDefaultStorage(storage);
  if (!store || !scopeKey) return;
  try {
    store.removeItem(scopeKey);
  } catch {
    // ignore
  }
};

export interface OrderNotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  audience: 'admin' | 'customer';
  orderId: string;
  folio: string;
  quoteOfferedAt?: string;
}

const STATUS_LABELS_ES: Record<string, string> = {
  pendiente_cotizacion: 'Pendiente de cotización',
  nuevo: 'Nuevo',
  en_preparacion: 'En preparación',
  asignado: 'Repartidor asignado',
  recolectado: 'Recolectado',
  en_camino: 'En camino',
  afuera_del_domicilio: 'Afuera del domicilio (10 min)',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  cancelado_con_deuda: 'Cancelado con adeudo',
};

/**
 * Determina si la sesión actual debe recibir una notificación por un pedido nuevo o
 * un cambio de estado, garantizando aislamiento total entre Admin y Clientes.
 *
 * - ADMIN: recibe avisos de nuevos pedidos entrantes y de actualizaciones operativas de cualquier orden.
 * - CLIENTE: únicamente recibe actualizaciones del estado de SUS PROPIOS pedidos (order.customerId === currentUserId).
 *            Jamás recibe notificaciones de pedidos ajenos ni alertas administrativas globales.
 * - VISITANTE: nunca recibe notificaciones de pedidos.
 */
export function buildOrderNotificationForViewer(params: {
  viewerRole: 'admin' | 'customer' | 'guest';
  viewerUserId?: string | null;
  order: {
    id: string;
    folio: string;
    customerId: string;
    customerName?: string;
    restaurantName?: string;
    status: string;
    total?: number;
    quoteOfferedAt?: string;
  };
  prevStatus?: string;
  lastNotifiedQuote?: string;
  isNewOrder?: boolean;
}): OrderNotificationPayload | null {
  const { viewerRole, viewerUserId, order, prevStatus, isNewOrder } = params;

  if (viewerRole === 'guest') {
    return null;
  }

  // Regla exclusiva para ADMINISTRADOR: recibe pedidos entrantes y actualizaciones globales de despacho
  if (viewerRole === 'admin') {
    if (isNewOrder) {
      return {
        title: `🛵 Nuevo Pedido #${order.folio}`,
        message: `${order.customerName || 'Cliente'} pidió en ${order.restaurantName || 'RODO'} ($${Number(order.total || 0).toFixed(2)} MXN).`,
        type: 'urgent',
        audience: 'admin',
        orderId: order.id,
        folio: order.folio,
      };
    }

    if (prevStatus && prevStatus !== order.status) {
      const label = STATUS_LABELS_ES[order.status] || order.status.replace(/_/g, ' ');
      return {
        title: `📦 Pedido #${order.folio} · ${label}`,
        message: `${order.restaurantName || 'Establecimiento'} (${order.customerName || 'Cliente'}) cambió a estado "${label}".`,
        type:
          order.status === 'entregado'
            ? 'success'
            : order.status === 'afuera_del_domicilio'
            ? 'urgent'
            : order.status === 'cancelado' || order.status === 'cancelado_con_deuda'
            ? 'warning'
            : 'info',
        audience: 'admin',
        orderId: order.id,
        folio: order.folio,
      };
    }

    return null;
  }

  // Regla estricta para CLIENTE: únicamente SUS PROPIOS pedidos (jamás de otros clientes)
  if (!viewerUserId || order.customerId !== viewerUserId) {
    return null;
  }

  if (order.status === 'pendiente_cotizacion' && order.quoteOfferedAt &&
      (!params.lastNotifiedQuote || order.quoteOfferedAt > params.lastNotifiedQuote)) {
    return {
      title: 'Cotización lista para revisar',
      message: `Tu pedido #${order.folio} fue cotizado en $${Number(order.total).toFixed(2)} MXN. Abre el ticket para aceptar o rechazar.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
      quoteOfferedAt: order.quoteOfferedAt,
    };
  }

  // Para clientes solo notificamos cambios de estado relevantes de su propio pedido
  if (!prevStatus || prevStatus === order.status) {
    return null;
  }

  if (order.status === 'en_preparacion') {
    return {
      title: '🍳 ¡Tu Pedido está en Preparación!',
      message: `${order.restaurantName || 'El establecimiento'} ya está preparando tu orden #${order.folio}.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'recolectado' || order.status === 'asignado') {
    return {
      title: '🛵 ¡Repartidor Asignado a tu Pedido!',
      message: `Tu pedido en ${order.restaurantName || 'el local'} ya tiene repartidor asignado. Boleto #${order.folio}.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'en_camino') {
    return {
      title: '🚀 ¡Tu Repartidor va en Camino!',
      message: `Tu pedido #${order.folio} va en ruta hacia tu domicilio en San Miguel de Allende.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'afuera_del_domicilio') {
    return {
      title: '🚨 ¡Repartidor Afuera de tu Domicilio!',
      message: `El repartidor está esperando afuera. Tienes 10 minutos de tolerancia para salir a recibir tu pedido #${order.folio}.`,
      type: 'urgent',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'entregado') {
    return {
      title: '🎉 ¡Tu Pedido fue Entregado!',
      message: `Tu pedido #${order.folio} ha sido entregado exitosamente. ¡Buen provecho!`,
      type: 'success',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'cancelado' || order.status === 'cancelado_con_deuda') {
    return {
      title: '⚠️ Actualización de tu Pedido',
      message: `Tu pedido #${order.folio} fue marcado como cancelado. Si tienes dudas contacta a soporte RODO.`,
      type: 'warning',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  return null;
}

// Sintetizador de sonido de notificación con Web Audio API
export const playNotificationChime = (type: 'normal' | 'urgent' = 'normal') => {
  if (typeof window === 'undefined') return;
  const settings = getNotificationSettings();
  if (!settings.soundEnabled) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'urgent') {
      // Tono de alerta urgente (3 bips ascendentes para 'afuera del domicilio' o nuevo pedido admin)
      [now, now + 0.15, now + 0.3].forEach((startTime, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650 + idx * 220, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.13);
      });
    } else {
      // Tono agradable de confirmación/recolección (2 notas suaves: E5 -> A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.12); // A5
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    }
  } catch (err) {
    console.warn('Audio chime no disponible:', err);
  }
};

// Solicitar permisos al usuario para Notificaciones del Navegador
export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Despachar una Notificación del Navegador y guardar en el historial aislado del usuario/rol
export const dispatchRodoNotification = (
  title: string,
  message: string,
  options?: {
    scopeKey?: string;
    audience?: NotificationAudience;
    quoteOfferedAt?: string;
    orderId?: string;
    folio?: string;
    type?: 'info' | 'success' | 'warning' | 'urgent';
    playSound?: boolean;
  }
): RodoNotification => {
  const type = options?.type || 'info';
  const scopeKey = options?.scopeKey || `${HISTORY_KEY_PREFIX}guest`;
  const notif = addNotificationToHistory(
    {
      title,
      message,
      orderId: options?.orderId,
      folio: options?.folio,
      audience: options?.audience,
      quoteOfferedAt: options?.quoteOfferedAt,
      type,
    },
    scopeKey
  );

  const settings = getNotificationSettings();

  // Reproducir sonido si está habilitado
  if (options?.playSound !== false && settings.soundEnabled) {
    playNotificationChime(type === 'urgent' ? 'urgent' : 'normal');
  }

  // Enviar notificación al navegador
  if (
    typeof window !== 'undefined' &&
    settings.browserNotificationsEnabled &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title, {
        body: message,
        icon: '/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg',
        badge: '/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg',
        tag: options?.folio || 'rodo-update',
      });
    } catch {
      // Ignorar en navegadores con restricciones en iframes
    }
  }

  return notif;
};
