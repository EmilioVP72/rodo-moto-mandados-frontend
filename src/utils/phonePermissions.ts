import {
  dispatchRodoNotification,
  requestBrowserNotificationPermission,
} from '../services/notifications';

/**
 * Utilidades para la gestión de permisos nativos del teléfono en RODO Moto Mandados:
 * - Ubicación (GPS)
 * - Almacenamiento (Persistencia local)
 * - Notificaciones (Alertas de repartidor en camino y aviso de 10 min)
 * - Cámara (Lectura de INE 10 dígitos y tickets)
 */

export type PermissionStatusState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface PhonePermissionsState {
  location: PermissionStatusState;
  storage: PermissionStatusState;
  notifications: PermissionStatusState;
  camera: PermissionStatusState;
  allGranted: boolean;
  lastChecked?: string;
}

const STORAGE_KEY = 'rodo_phone_permissions_state';

export function getSavedPhonePermissions(): PhonePermissionsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    location: 'prompt',
    storage: 'prompt',
    notifications: 'prompt',
    camera: 'prompt',
    allGranted: false,
  };
}

export function savePhonePermissions(state: PhonePermissionsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * 1. Solicitar Permiso de Ubicación (GPS)
 */
export async function requestLocationPermission(): Promise<PermissionStatusState> {
  if (!('geolocation' in navigator)) {
    return 'unsupported';
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem('rodo_user_gps_coords', JSON.stringify(coords));
        } catch {}
        resolve('granted');
      },
      (err) => {
        console.warn('Geolocation error or denied:', err);
        resolve('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

/**
 * 2. Solicitar Permiso de Almacenamiento Persistente
 */
export async function requestStoragePermission(): Promise<PermissionStatusState> {
  try {
    let isPersisted = false;
    if (navigator.storage && navigator.storage.persist) {
      isPersisted = await navigator.storage.persist();
    }
    // Verificar que localStorage funcione sin modo incógnito estricto
    localStorage.setItem('rodo_storage_test', 'ok');
    localStorage.removeItem('rodo_storage_test');
    return isPersisted || true ? 'granted' : 'denied';
  } catch (err) {
    console.warn('Storage permission warn:', err);
    return 'denied';
  }
}

/**
 * 3. Solicitar Permiso de Notificaciones Push (multi-navegador)
 */
export async function requestNotificationsPermission(): Promise<PermissionStatusState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      dispatchRodoNotification(
        'RODO Moto Mandados',
        'Notificaciones activadas. Te avisaremos en tiempo real sobre tus pedidos.',
        { type: 'info', playSound: true }
      );
      return 'granted';
    }
    return Notification.permission === 'denied' ? 'denied' : 'prompt';
  } catch (err) {
    console.warn('Notification permission error:', err);
    return 'denied';
  }
}

/**
 * 4. Solicitar Permiso de Cámara (para escanear INE de 10 dígitos)
 */
export async function requestCameraPermission(): Promise<PermissionStatusState> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'unsupported';
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    // Detener la cámara inmediatamente para no gastar batería
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (err) {
    console.warn('Camera permission error or denied:', err);
    return 'denied';
  }
}

/**
 * Solicitar los 4 permisos de forma secuencial
 */
export async function requestAllPhonePermissions(): Promise<PhonePermissionsState> {
  const loc = await requestLocationPermission();
  const stg = await requestStoragePermission();
  const notif = await requestNotificationsPermission();
  const cam = await requestCameraPermission();

  const allGranted = loc === 'granted' && stg === 'granted' && (notif === 'granted' || notif === 'unsupported') && cam === 'granted';

  const newState: PhonePermissionsState = {
    location: loc,
    storage: stg,
    notifications: notif,
    camera: cam,
    allGranted,
    lastChecked: new Date().toISOString(),
  };

  savePhonePermissions(newState);
  return newState;
}
