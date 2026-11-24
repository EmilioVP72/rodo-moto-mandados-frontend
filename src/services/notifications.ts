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
  arrivalNotifiedAt?: string;
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
    arrivalNotifiedAt?: string;
  };
  prevStatus?: string;
  lastNotifiedQuote?: string;
  lastNotifiedArrivalAt?: string;
  isNewOrder?: boolean;
}): OrderNotificationPayload | null {
  const { viewerRole, viewerUserId, order, prevStatus, isNewOrder } = params;

  if (viewerRole === 'guest') {
    return null;
  }

  // Regla exclusiva para ADMINISTRADOR: únicamente pedidos nuevos solicitados y pedidos entregados
  if (viewerRole === 'admin') {
    if (isNewOrder) {
      return {
        title: `Nuevo Pedido #${order.folio}`,
        message: `${order.customerName || 'Cliente'} solicitó en ${order.restaurantName || 'RODO'} ($${Number(order.total || 0).toFixed(2)} MXN).`,
        type: 'urgent',
        audience: 'admin',
        orderId: order.id,
        folio: order.folio,
      };
    }

    if (prevStatus && prevStatus !== 'entregado' && order.status === 'entregado') {
      return {
        title: `Pedido entregado #${order.folio}`,
        message: `${order.restaurantName || 'Establecimiento'} (${order.customerName || 'Cliente'}) fue entregado.`,
        type: 'success',
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

  // Re-aviso de llegada afuera del domicilio aunque ya estuviera en el mismo estado
  if (
    order.status === 'afuera_del_domicilio' &&
    order.arrivalNotifiedAt &&
    params.lastNotifiedArrivalAt &&
    order.arrivalNotifiedAt > params.lastNotifiedArrivalAt
  ) {
    return {
      title: '¡Tu repartidor está afuera!',
      message: `El repartidor te espera afuera con tu pedido #${order.folio}. Tienes 10 minutos de tolerancia para salir.`,
      type: 'urgent',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
      arrivalNotifiedAt: order.arrivalNotifiedAt,
    };
  }

  // Para clientes solo notificamos cambios relevantes de su propio pedido
  if (!prevStatus || prevStatus === order.status) {
    return null;
  }

  if (order.status === 'en_preparacion') {
    return {
      title: 'Tu pedido está en preparación',
      message: `${order.restaurantName || 'El establecimiento'} ya está preparando tu orden #${order.folio}.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'recolectado' || order.status === 'asignado') {
    return {
      title: 'Repartidor asignado a tu pedido',
      message: `Tu pedido en ${order.restaurantName || 'el local'} ya tiene repartidor asignado. Folio #${order.folio}.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'en_camino') {
    return {
      title: 'Tu repartidor va en camino',
      message: `Tu pedido #${order.folio} va en ruta hacia tu domicilio en San Miguel de Allende.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'afuera_del_domicilio') {
    return {
      title: '¡Tu repartidor está afuera!',
      message: `El repartidor te espera afuera con tu pedido #${order.folio}. Tienes 10 minutos de tolerancia para salir.`,
      type: 'urgent',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
      arrivalNotifiedAt: order.arrivalNotifiedAt,
    };
  }

  if (order.status === 'entregado') {
    return {
      title: 'Pedido entregado',
      message: `Tu pedido #${order.folio} fue entregado. ¡Buen provecho!`,
      type: 'success',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'cancelado' || order.status === 'cancelado_con_deuda') {
    return {
      title: 'Actualización de tu pedido',
      message: `Tu pedido #${order.folio} fue cancelado. Si tienes dudas contacta a soporte RODO.`,
      type: 'warning',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  return null;
}

// AudioContext compartido para evitar bloqueos de autoplay en Chrome/Safari móvil
let sharedAudioCtx: AudioContext | null = null;
let audioUnlockAttached = false;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

export function initNotificationAudioUnlock(): void {
  if (typeof window === 'undefined' || audioUnlockAttached) return;
  audioUnlockAttached = true;

  const unlock = () => {
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Pulso silencioso para desbloquear el canal de audio en iOS/Android
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // ignore
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

// Sintetizador de sonido de notificación con Web Audio API (desbloqueado en móvil)
export const playNotificationChime = (type: 'normal' | 'urgent' = 'normal') => {
  if (typeof window === 'undefined') return;
  const settings = getNotificationSettings();
  if (!settings.soundEnabled) return;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(type === 'urgent' ? [300, 120, 300, 120, 420] : [140, 80, 140]);
    }
  } catch {
    // ignore
  }

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const scheduleNotes = () => {
      const now = ctx.currentTime + 0.02;

      if (type === 'urgent') {
        // Timbre fuerte de 2 ciclos (6 tonos ascendentes) para llegada del repartidor o pedido nuevo
        const offsets = [0, 0.16, 0.32, 0.62, 0.78, 0.94];
        const freqs = [784, 988, 1175, 784, 988, 1319];
        offsets.forEach((offset, idx) => {
          const startTime = now + offset;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freqs[idx], startTime);
          gain.gain.setValueAtTime(0.45, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.15);
        });
      } else {
        // Tono agradable de confirmación (2 notas suaves: E5 -> A5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(659.25, now); // E5
        gain1.gain.setValueAtTime(0.28, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now + 0.12); // A5
        gain2.gain.setValueAtTime(0.32, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(scheduleNotes).catch(() => {});
    } else {
      scheduleNotes();
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

async function showSystemBrowserNotification(
  title: string,
  message: string,
  options: { folio?: string; type: 'info' | 'success' | 'warning' | 'urgent'; tag?: string }
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const tag = options.tag || (options.folio ? `rodo-${options.folio}-${options.type}` : 'rodo-update');
  const icon = '/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg';
  const targetUrl = options.folio ? `/?ticket=${encodeURIComponent(options.folio)}` : '/';

  // En Android Chrome / PWA, `new Notification()` lanza TypeError; se requiere ServiceWorkerRegistration.showNotification()
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const activeReg = reg || (await navigator.serviceWorker.ready);
      if (activeReg && typeof activeReg.showNotification === 'function') {
        await activeReg.showNotification(title, {
          body: message,
          icon,
          badge: icon,
          tag,
          requireInteraction: options.type === 'urgent',
          renotify: true,
          vibrate:
            options.type === 'urgent'
              ? [300, 120, 300, 120, 420]
              : options.type === 'success'
              ? [200, 100, 200]
              : [140, 80, 140],
          data: { url: targetUrl, folio: options.folio },
        } as NotificationOptions);
        return;
      }
    } catch {
      // Fallback a window.Notification abajo
    }
  }

  try {
    new Notification(title, {
      body: message,
      icon,
      badge: icon,
      tag,
    });
  } catch {
    // Ignorar en navegadores sin soporte directo
  }
}

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
    tag?: string;
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

  // Reproducir sonido y vibración si está habilitado
  if (options?.playSound !== false && settings.soundEnabled) {
    playNotificationChime(type === 'urgent' ? 'urgent' : 'normal');
  }

  // Enviar notificación nativa (Service Worker en móvil + Notification API en escritorio)
  if (settings.browserNotificationsEnabled) {
    void showSystemBrowserNotification(title, message, {
      folio: options?.folio,
      tag: options?.tag,
      type,
    });
  }

  return notif;
};
