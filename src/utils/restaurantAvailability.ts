import { Restaurant } from '../types';

const TIME_ZONE = 'America/Mexico_City';

function getMexicoCityParts(now: Date): { day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value || 'Sun';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  return {
    day: Math.max(0, day),
    hour: Number(parts.find((part) => part.type === 'hour')?.value || 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value || 0),
  };
}

function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function getRestaurantAvailability(restaurant: Restaurant, now = new Date()): {
  available: boolean;
  message: string;
} {
  if (restaurant.isActive === false) return { available: false, message: 'Este establecimiento no está disponible.' };
  if (restaurant.isOpen === false) {
    return { available: false, message: restaurant.closureReason || 'Cerrado temporalmente. No está disponible para recibir pedidos.' };
  }

  const current = getMexicoCityParts(now);
  const days = restaurant.workingDays;
  if (Array.isArray(days) && !days.includes(current.day)) {
    return { available: false, message: 'Hoy es día de descanso. Puedes agregar productos al carrito y pedir cuando el restaurante vuelva a abrir.' };
  }

  const hours = restaurant.customServiceHours;
  if (hours?.enabled) {
    const open = parseTime(hours.open);
    const close = parseTime(hours.close);
    if (open !== null && close !== null) {
      const currentMinutes = current.hour * 60 + current.minute;
      const withinHours = close > open
        ? currentMinutes >= open && currentMinutes < close
        : currentMinutes >= open || currentMinutes < close;
      if (!withinHours) {
        return { available: false, message: `Fuera del horario de atención (${hours.open} a ${hours.close}, hora de San Miguel de Allende). Puedes agregar productos al carrito y pedir dentro de ese horario.` };
      }
    }
  }
  return { available: true, message: '' };
}

export function getRestaurantWorkingDaysLabel(days?: number[]): string {
  if (!Array.isArray(days)) return 'Todos los días';
  if (days.length === 7) return 'Todos los días';
  const labels = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return days.slice().sort((a, b) => a - b).map((day) => labels[day]).join(', ') || 'Ningún día';
}
