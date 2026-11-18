// Sistema integral de Notificaciones para RODO Moto Mandados:
// 1. Web Notification API del navegador (Push en tiempo real para escritorio y móvil).
// 2. Chime de audio sintetizado con Web Audio API (sin dependencias externas, funciona offline).
// 3. Historial persistente en localStorage y alertas en vivo para la aplicación.

export interface RodoNotification {
  id: string;
  title: string;
  message: string;
  orderId?: string;
  folio?: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  timestamp: string;
  read: boolean;
}

export interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  soundEnabled: boolean;
  urgentAlertsEnabled: boolean;
}

const SETTINGS_KEY = 'rodo_notification_settings';
const HISTORY_KEY = 'rodo_notifications_history';

export const getNotificationSettings = (): NotificationSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
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

export const saveNotificationSettings = (settings: NotificationSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

export const getNotificationHistory = (): RodoNotification[] => {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return [];
};

export const addNotificationToHistory = (notif: Omit<RodoNotification, 'id' | 'timestamp' | 'read'>): RodoNotification => {
  const newNotif: RodoNotification = {
    ...notif,
    id: 'notif-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    read: false,
  };

  try {
    const current = getNotificationHistory();
    const updated = [newNotif, ...current].slice(0, 50); // Mantener últimas 50
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return newNotif;
};

export const markNotificationAsRead = (id: string) => {
  try {
    const current = getNotificationHistory();
    const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

export const clearNotificationHistory = () => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
};

// Sintetizador de sonido de notificación con Web Audio API
export const playNotificationChime = (type: 'normal' | 'urgent' = 'normal') => {
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
      // Tono de alerta urgente (3 bips ascendentes para 'afuera del domicilio')
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
  if (!('Notification' in window)) {
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

// Despachar una Notificación del Navegador y guardar en el historial
export const dispatchRodoNotification = (
  title: string,
  message: string,
  options?: {
    orderId?: string;
    folio?: string;
    type?: 'info' | 'success' | 'warning' | 'urgent';
    playSound?: boolean;
  }
): RodoNotification => {
  const type = options?.type || 'info';
  const notif = addNotificationToHistory({
    title,
    message,
    orderId: options?.orderId,
    folio: options?.folio,
    type,
  });

  const settings = getNotificationSettings();

  // Reproducir sonido si está habilitado
  if (options?.playSound !== false && settings.soundEnabled) {
    playNotificationChime(type === 'urgent' ? 'urgent' : 'normal');
  }

  // Enviar notificación al navegador
  if (
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
