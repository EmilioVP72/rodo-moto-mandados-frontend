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
      title: 'Tu pedido está en cocina',
      message: `${order.restaurantName || 'El restaurante'} ya está preparando tu orden #${order.folio}.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'recolectado' || order.status === 'asignado') {
    return {
      title: 'Pedido recibido por el repartidor',
      message: `Tu pedido en ${order.restaurantName || 'el local'} ya fue recibido por el repartidor. Folio #${order.folio}.`,
      type: 'info',
      audience: 'customer',
      orderId: order.id,
      folio: order.folio,
    };
  }

  if (order.status === 'en_camino') {
    return {
      title: 'Tu pedido va en camino',
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
      title: 'Pedido completado',
      message: `Tu pedido #${order.folio} fue completado. ¡Buen provecho!`,
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

export type NotificationBrowserCapability =
  | 'supported'
  | 'ios_requires_pwa'
  | 'insecure_context'
  | 'unsupported';

export function getBrowserNotificationCapability(): NotificationBrowserCapability {
  if (typeof window === 'undefined') return 'unsupported';
  if (window.isSecureContext === false && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'insecure_context';
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    Boolean((window.navigator as any)?.standalone) ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);

  if (!('Notification' in window)) {
    return isIOS && !isStandalone ? 'ios_requires_pwa' : 'unsupported';
  }
  return 'supported';
}

// AudioContext compartido + respaldo HTML5 Audio WAV para máxima compatibilidad (Chrome, Safari, Firefox, Edge, Samsung Internet)
let sharedAudioCtx: AudioContext | null = null;
let audioUnlockAttached = false;
let fallbackNormalAudio: HTMLAudioElement | null = null;
let fallbackUrgentAudio: HTMLAudioElement | null = null;
let titleFlashTimer: number | null = null;
let originalDocTitle: string | null = null;

function buildSineWavDataUri(tones: Array<{ freq: number; durationMs: number; pauseMs?: number }>): string {
  const sampleRate = 16000;
  const totalSamples = tones.reduce(
    (acc, tone) => acc + Math.floor((sampleRate * (tone.durationMs + (tone.pauseMs || 0))) / 1000),
    0
  );
  const dataBytes = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  let sampleOffset = 0;
  for (const tone of tones) {
    const toneSamples = Math.floor((sampleRate * tone.durationMs) / 1000);
    const pauseSamples = Math.floor((sampleRate * (tone.pauseMs || 0)) / 1000);
    for (let i = 0; i < toneSamples; i++) {
      const env = Math.min(1, i / 160, (toneSamples - i) / 320);
      const val = Math.sin((2 * Math.PI * tone.freq * i) / sampleRate) * 0.55 * env;
      view.setInt16(44 + (sampleOffset + i) * 2, Math.max(-32767, Math.min(32767, Math.round(val * 32767))), true);
    }
    sampleOffset += toneSamples + pauseSamples;
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function ensureFallbackAudioElements(): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  try {
    if (!fallbackNormalAudio) {
      fallbackNormalAudio = new Audio(
        buildSineWavDataUri([
          { freq: 659, durationMs: 140, pauseMs: 30 },
          { freq: 880, durationMs: 220 },
        ])
      );
      fallbackNormalAudio.preload = 'auto';
    }
    if (!fallbackUrgentAudio) {
      fallbackUrgentAudio = new Audio(
        buildSineWavDataUri([
          { freq: 784, durationMs: 120, pauseMs: 40 },
          { freq: 988, durationMs: 120, pauseMs: 40 },
          { freq: 1175, durationMs: 160, pauseMs: 140 },
          { freq: 784, durationMs: 120, pauseMs: 40 },
          { freq: 1319, durationMs: 220 },
        ])
      );
      fallbackUrgentAudio.preload = 'auto';
    }
  } catch {
    // ignore
  }
}

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
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch {
      // ignore
    }

    // Precargar y desbloquear elementos HTML5 Audio para Safari / WebViews
    try {
      ensureFallbackAudioElements();
      [fallbackNormalAudio, fallbackUrgentAudio].forEach((el) => {
        if (!el) return;
        const prevVol = el.volume;
        el.volume = 0;
        const p = el.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            el.pause();
            el.currentTime = 0;
            el.volume = prevVol;
          }).catch(() => {
            el.volume = prevVol;
          });
        } else {
          el.volume = prevVol;
        }
      });
    } catch {
      // ignore
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true, once: true });
  window.addEventListener('touchstart', unlock, { passive: true, once: true });
  window.addEventListener('click', unlock, { passive: true, once: true });
  window.addEventListener('keydown', unlock, { passive: true, once: true });
}

function flashDocumentTitle(alertTitle: string): void {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (originalDocTitle === null) {
    originalDocTitle = document.title;
  }
  if (titleFlashTimer !== null) {
    window.clearInterval(titleFlashTimer);
  }
  let toggle = false;
  titleFlashTimer = window.setInterval(() => {
    if (!document.hidden) {
      if (titleFlashTimer !== null) {
        window.clearInterval(titleFlashTimer);
        titleFlashTimer = null;
      }
      if (originalDocTitle !== null) {
        document.title = originalDocTitle;
        originalDocTitle = null;
      }
      return;
    }
    toggle = !toggle;
    document.title = toggle ? `(!) ${alertTitle}` : originalDocTitle || 'RODO Moto Mandados';
  }, 1100);
}

// Sintetizador de sonido multi-navegador (Web Audio API + respaldo HTML5 Audio WAV + vibración)
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

  const playHtmlFallback = () => {
    try {
      ensureFallbackAudioElements();
      const audioEl = type === 'urgent' ? fallbackUrgentAudio : fallbackNormalAudio;
      if (audioEl) {
        audioEl.currentTime = 0;
        audioEl.volume = 1;
        void audioEl.play().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) {
      playHtmlFallback();
      return;
    }

    const scheduleNotes = () => {
      const now = ctx.currentTime + 0.02;

      if (type === 'urgent') {
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
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.28, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now + 0.12);
        gain2.gain.setValueAtTime(0.32, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);
      }
    };

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') {
            scheduleNotes();
          } else {
            playHtmlFallback();
          }
        })
        .catch(playHtmlFallback);
    } else {
      scheduleNotes();
    }
  } catch {
    playHtmlFallback();
  }
};

// Solicitar permisos al usuario compatible con Chrome, Edge, Firefox, Safari (Promise y callback legado)
export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  initNotificationAudioUnlock();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await new Promise<NotificationPermission>((resolve) => {
      let settled = false;
      const done = (result: NotificationPermission) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      try {
        const maybePromise = Notification.requestPermission((result) => done(result));
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(done).catch(() => done('denied'));
        }
      } catch {
        done('denied');
      }
    });
    return permission === 'granted';
  } catch {
    return false;
  }
};

async function getActiveServiceWorkerWithTimeout(timeoutMs = 1200): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing && (existing.active || existing.waiting || existing.installing)) {
      return existing;
    }
    const ready = await Promise.race<ServiceWorkerRegistration | null>([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return ready;
  } catch {
    return null;
  }
}

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

  // 1. Intentar vía Service Worker (obligatorio en Chrome/Edge/Samsung Android y Safari iOS PWA)
  const activeReg = await getActiveServiceWorkerWithTimeout(1200);
  if (activeReg && typeof activeReg.showNotification === 'function') {
    try {
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
    } catch {
      // Safari / Firefox pueden rechazar opciones como vibrate o renotify: reintentar con opciones universales
      try {
        await activeReg.showNotification(title, {
          body: message,
          icon,
          tag,
          data: { url: targetUrl, folio: options.folio },
        });
        return;
      } catch {
        // Continuar al fallback directo window.Notification
      }
    }
  }

  // 2. Fallback directo para Firefox, Safari escritorio, Brave, Opera y navegación privada
  try {
    const n = new Notification(title, {
      body: message,
      icon,
      tag,
    });
    n.onclick = () => {
      try {
        window.focus();
        if (options.folio) {
          window.location.href = targetUrl;
        }
        n.close();
      } catch {
        // ignore
      }
    };
  } catch {
    try {
      new Notification(title, { body: message });
    } catch {
      // Ignorar en WebViews sin soporte de Notification API (ya cubre el toast + sonido + título)
    }
  }
}

// Despachar una Notificación multi-navegador y guardar en el historial aislado del usuario/rol
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

  // Reproducir sonido multi-navegador y vibración si está habilitado
  if (options?.playSound !== false && settings.soundEnabled) {
    playNotificationChime(type === 'urgent' ? 'urgent' : 'normal');
  }

  // Destellar título de pestaña si el usuario está en otra pestaña (funciona en todos los navegadores)
  flashDocumentTitle(title);

  // Enviar notificación del sistema (Service Worker + fallback Notification API)
  if (settings.browserNotificationsEnabled) {
    void showSystemBrowserNotification(title, message, {
      folio: options?.folio,
      tag: options?.tag,
      type,
    });
  }

  return notif;
};
