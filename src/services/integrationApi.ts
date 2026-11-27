/**
 * RODO Moto Mandados · API & Integration Bus
 * Arquitectura Abierta para Interconexión con Portales Externos:
 * 1. Portal de Repartidores (App de Repartidores)
 * 2. Portal de Locales Asociados (Dashboard Restaurantero)
 * 3. Webhooks & Cross-Origin Window Messaging
 */

import { Order, PartnerLocal } from '../types';
import { updateOrderInDb } from './db';

export interface WebhookConfig {
  id: string;
  name: string;
  targetUrl: string;
  events: ('order.created' | 'order.status_changed' | 'order.arrived_outside' | 'local.rider_requested')[];
  secretToken: string;
  isActive: boolean;
}

const LOCAL_STORAGE_WEBHOOKS = 'rodo_api_webhooks';

// Recuperar webhooks configurados
export function getRegisteredWebhooks(): WebhookConfig[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_WEBHOOKS) || '[]');
  } catch {
    return [];
  }
}

// Guardar webhook
export function saveRegisteredWebhook(webhook: WebhookConfig): void {
  const current = getRegisteredWebhooks();
  const updated = [webhook, ...current.filter((w) => w.id !== webhook.id)];
  localStorage.setItem(LOCAL_STORAGE_WEBHOOKS, JSON.stringify(updated));
}

function isAllowedWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:') return true;
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Despachar evento a webhooks y ventanas conectadas del mismo origen
export async function dispatchIntegrationEvent(
  event: 'order.created' | 'order.status_changed' | 'order.arrived_outside' | 'local.rider_requested',
  payload: { order: Order; extra?: any }
): Promise<void> {
  const messageData = {
    event,
    timestamp: new Date().toISOString(),
    system: 'RODO_MOTO_MANDADOS_CENTRAL',
    data: payload,
  };

  // 1. Notificación vía postMessage restringida estrictamente al mismo origen (sin fuga a window.opener ni '*')
  if (typeof window !== 'undefined' && window.location?.origin) {
    const sameOrigin = window.location.origin;
    window.postMessage(messageData, sameOrigin);

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(messageData, sameOrigin);
      }
    } catch {}

    // Despacho en StorageEvent para pestañas en el mismo dominio
    try {
      localStorage.setItem('rodo_bus_latest_event', JSON.stringify(messageData));
    } catch {}
  }

  // 2. Notificación HTTP únicamente a Webhooks HTTPS verificados
  const webhooks = getRegisteredWebhooks().filter(
    (w) => w.isActive && w.events.includes(event) && isAllowedWebhookUrl(w.targetUrl)
  );
  for (const hook of webhooks) {
    try {
      fetch(hook.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RODO-Signature': hook.secretToken,
          'X-RODO-Event': event,
        },
        body: JSON.stringify(messageData),
        mode: 'no-cors',
      }).catch(() => {});
    } catch {}
  }
}

/**
 * Endpoint de Interconexión para el Portal de Repartidores
 * Permite a la app del repartidor cambiar el estado a "afuera_del_domicilio", "entregado", etc.
 */
export async function externalUpdateOrderStatus(
  orderId: string,
  newStatus: Order['status'],
  riderPhone?: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const updates: Partial<Order> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === 'afuera_del_domicilio') {
      const now = new Date();
      const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos
      updates.arrivalNotifiedAt = now.toISOString();
      updates.arrivalExpiresAt = expires.toISOString();
      updates.customerNotifiedOutside = true;
    }

    if (notes) {
      updates.deliveryNotes = notes;
    }

    await updateOrderInDb(orderId, updates);
    return { success: true, message: `Orden ${orderId} actualizada a ${newStatus}` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Error al actualizar orden' };
  }
}
