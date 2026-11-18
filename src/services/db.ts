import { apiFetch } from '../api/httpClient';
import { onSocketEvent } from '../api/socketClient';
import {
  Restaurant,
  Order,
  DispatchSettings,
  PartnerLocal,
  SpecialtyCategory,
  AdminAuditLogEntry,
  BroadcastNotification,
  AccountRecoveryRequest,
} from '../types';
import { getStoredIneAccounts, saveIneAccount } from '../utils/ineScanner';
import {
  syncRestaurantsToIDB,
  getRestaurantsFromIDB,
  syncOrdersToIDB,
  upsertOrderToIDB,
  getOrdersFromIDB,
  saveBroadcastToIDB,
  getBroadcastsFromIDB,
} from './indexedDb';

const RESTAURANTS_COL = 'restaurants';
const ORDERS_COL = 'orders';
const SETTINGS_COL = 'settings';
const PARTNER_LOCALS_COL = 'partner_locals';
const ADMIN_AUDIT_LOGS_COL = 'admin_audit_logs';
const BROADCAST_NOTIFS_COL = 'broadcast_notifications';
const ACCOUNT_RECOVERY_COL = 'account_recovery_requests';
const LOCAL_STORAGE_ORDERS = 'rodo_local_orders';
const LOCAL_STORAGE_PARTNER_LOCALS = 'rodo_partner_locals';
const LOCAL_STORAGE_BROADCASTS = 'rodo_broadcast_notifications';
const LOCAL_STORAGE_RECOVERY = 'rodo_account_recovery_requests';

import {
  DEFAULT_PARTNER_LOCALS,
  INITIAL_SPECIALTIES,
  INITIAL_SETTINGS,
  DEFAULT_RESTAURANTS,
} from '../data/seeds';

export { DEFAULT_PARTNER_LOCALS, INITIAL_SPECIALTIES, INITIAL_SETTINGS, DEFAULT_RESTAURANTS };

export function generateUniqueTicketFolio(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `RD-${yy}${mm}${dd}-${rand}`;
}

// Inicialización controlada (Sincroniza catálogo semilla con PostgreSQL en el Backend)
export async function ensureDatabaseSeeded(_isAdminUser = false): Promise<void> {
  try {
    await apiFetch('/api/seed', {
      method: 'POST',
      body: {
        restaurants: DEFAULT_RESTAURANTS,
        settings: INITIAL_SETTINGS,
      },
    });
  } catch {
    // Fallback offline silencioso
  }
}

// RESTAURANTES
export const VALID_RESTAURANT_IDS = [
  'tacos-sebas',
  'little-caesars',
  'tacos-don-santos',
  'comida-china-mesones',
  'ferechiken-alamedas',
  'burger-sma',
  'sushi-sma',
  'barbacoa-don-lupe',
  'desayunos-campanario',
  'mariscos-el-puerto',
  'panaderia-aurora',
  'postres-sma',
  'cenaduria-dona-chela',
  'tortas-el-chavo-sma',
  'tiendita-la-esquina',
  'supermercado-sma',
  'farmacia-san-miguel',
  'verduleria-mercado-sma',
  'carniceria-san-antonio',
];

const LOCAL_STORAGE_RESTAURANTS = 'rodo_restaurants_cache';

export function getLocalStoredRestaurants(): Restaurant[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESTAURANTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return DEFAULT_RESTAURANTS;
}

function saveLocalStoredRestaurant(restaurant: Restaurant): void {
  try {
    const current = getLocalStoredRestaurants();
    const updated = [restaurant, ...current.filter((r) => r.id !== restaurant.id)];
    localStorage.setItem(LOCAL_STORAGE_RESTAURANTS, JSON.stringify(updated));
  } catch {}
}

export function sanitizeRestaurantForCustomer(r: Restaurant): Restaurant {
  const cleanBadge = r.badge
    ? r.badge.replace(/·?\s*PIN\s*#?\d+/gi, '').replace(/\s{2,}/g, ' ').trim()
    : r.badge;
  const cleanDesc = r.description
    ? r.description.replace(/\(?PIN\s*#?\d+\)?\.?/gi, '').replace(/\s{2,}/g, ' ').trim()
    : r.description;
  return {
    ...r,
    badge: cleanBadge || 'Local Asociado',
    description: cleanDesc,
  };
}

export async function getRestaurants(): Promise<Restaurant[]> {
  const localList = getLocalStoredRestaurants();
  try {
    const remoteList = await apiFetch<Restaurant[]>('/api/restaurants');
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      const existingIds = new Set(remoteList.map((r) => r.id));
      const missingDefaults = DEFAULT_RESTAURANTS.filter((r) => !existingIds.has(r.id));
      const finalResult = [...remoteList, ...missingDefaults].map(sanitizeRestaurantForCustomer);
      try {
        localStorage.setItem(LOCAL_STORAGE_RESTAURANTS, JSON.stringify(finalResult));
      } catch {}
      syncRestaurantsToIDB(finalResult);
      return finalResult;
    }
  } catch {}

  const idbRestaurants = await getRestaurantsFromIDB();
  const fallbackList =
    localList.length > 0 ? localList : idbRestaurants.length > 0 ? idbRestaurants : DEFAULT_RESTAURANTS;
  const sanitized = fallbackList.map(sanitizeRestaurantForCustomer);
  syncRestaurantsToIDB(sanitized);
  return sanitized;
}

export async function saveRestaurant(restaurant: Restaurant): Promise<void> {
  saveLocalStoredRestaurant(restaurant);
  syncRestaurantsToIDB(getLocalStoredRestaurants());

  try {
    await apiFetch(`/api/restaurants/${encodeURIComponent(restaurant.id)}`, {
      method: 'PUT',
      body: restaurant,
    });
  } catch (err) {
    console.warn('[API] Fallback local al guardar restaurante:', err);
  }
}

export async function deleteRestaurant(id: string): Promise<void> {
  try {
    const current = getLocalStoredRestaurants().filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_RESTAURANTS, JSON.stringify(current));
  } catch {}

  try {
    await apiFetch(`/api/restaurants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[API] Fallback local al eliminar restaurante:', err);
  }
}

// CONFIGURACIÓN DE DESPACHO
export async function getDispatchSettings(): Promise<DispatchSettings> {
  try {
    const data = await apiFetch<Partial<DispatchSettings>>('/api/settings');
    if (data && Object.keys(data).length > 0) {
      const mergedRiders =
        data.ridersList && Array.isArray(data.ridersList) && data.ridersList.length >= 10
          ? data.ridersList
          : INITIAL_SETTINGS.ridersList;
      return {
        ...INITIAL_SETTINGS,
        ...data,
        ridersList: mergedRiders,
      } as DispatchSettings;
    }
  } catch {}
  return INITIAL_SETTINGS;
}

export async function saveDispatchSettings(settings: DispatchSettings): Promise<void> {
  try {
    await apiFetch('/api/settings', {
      method: 'PUT',
      body: settings,
    });
  } catch (err) {
    console.warn('[API] Fallback local al guardar configuración:', err);
  }
}

function deduplicatePartnerLocals(locals: PartnerLocal[]): PartnerLocal[] {
  const mapById = new Map<string, PartnerLocal>();
  const seenCodes = new Set<string>();

  for (const l of locals) {
    if (!l || !l.id || mapById.has(l.id)) continue;
    if (l.code && seenCodes.has(l.code)) continue;
    if (l.code) seenCodes.add(l.code);
    mapById.set(l.id, l);
  }
  return Array.from(mapById.values());
}

// LOCALES ASOCIADOS (CÓDIGOS DE 3 DÍGITOS TIPO API)
function getLocalStoredPartnerLocals(): PartnerLocal[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PARTNER_LOCALS);
    if (raw) {
      const stored: PartnerLocal[] = JSON.parse(raw);
      const cleaned = deduplicatePartnerLocals(stored);
      const existingIds = new Set(cleaned.map((l) => l.id));
      const existingCodes = new Set(cleaned.filter((l) => !!l.code).map((l) => l.code));
      const missing = DEFAULT_PARTNER_LOCALS.filter(
        (l) => !existingIds.has(l.id) && (!l.code || !existingCodes.has(l.code))
      );
      const finalResult = [...cleaned, ...missing];
      localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(finalResult));
      return finalResult;
    }
    localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(DEFAULT_PARTNER_LOCALS));
    return DEFAULT_PARTNER_LOCALS;
  } catch {
    return DEFAULT_PARTNER_LOCALS;
  }
}

export async function getPartnerLocals(): Promise<PartnerLocal[]> {
  const localList = getLocalStoredPartnerLocals();
  try {
    const remoteList = await apiFetch<PartnerLocal[]>('/api/partner-locals');
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      const cleaned = deduplicatePartnerLocals(remoteList);
      localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(cleaned));
      return cleaned;
    }
  } catch {}
  return localList;
}

export async function savePartnerLocal(local: PartnerLocal): Promise<void> {
  try {
    const current = getLocalStoredPartnerLocals();
    const sanitizedOthers = current
      .filter((l) => l.id !== local.id)
      .map((l) => (l.code === local.code && local.code ? { ...l, code: '' } : l));

    const updated = [local, ...sanitizedOthers];
    localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(updated));
  } catch {}

  try {
    await apiFetch(`/api/partner-locals/${encodeURIComponent(local.id)}`, {
      method: 'PUT',
      body: local,
    });
  } catch {}
}

export async function deletePartnerLocal(id: string): Promise<void> {
  try {
    const current = getLocalStoredPartnerLocals();
    const updated = current.filter((l) => l.id !== id);
    localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(updated));
  } catch {}

  try {
    await apiFetch(`/api/partner-locals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch {}
}

export async function findPartnerLocalByCode(code: string): Promise<PartnerLocal | null> {
  const cleanCode = code.trim();
  try {
    const remote = await apiFetch<PartnerLocal>(`/api/partner-locals/code/${encodeURIComponent(cleanCode)}`);
    if (remote && remote.isActive) return remote;
  } catch {}
  const locals = await getPartnerLocals();
  return locals.find((l) => l.code === cleanCode && l.isActive) || null;
}

// PEDIDOS Y TICKETS (CON SINCRONIZACIÓN EN TIEMPO REAL VÍA SOCKET.IO + POSTGRESQL)
function getLocalStoredOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDERS) || '[]');
  } catch {
    return [];
  }
}

function saveLocalStoredOrder(order: Order): void {
  try {
    const existing = getLocalStoredOrders();
    const updated = [order, ...existing.filter((o) => o.id !== order.id)];
    localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(updated));
  } catch {}
}

const orderSubscribers = new Set<(orders: Order[]) => void>();

export function notifyOrderSubscribers(): void {
  const localOrders = getLocalStoredOrders();
  orderSubscribers.forEach((cb) => {
    try {
      cb(localOrders);
    } catch {}
  });
}

export async function createOrderInDb(order: Order): Promise<string> {
  saveLocalStoredOrder(order);
  upsertOrderToIDB(order);
  notifyOrderSubscribers();

  try {
    const saved = await apiFetch<Order>('/api/orders', {
      method: 'POST',
      body: order,
    });
    if (saved && saved.id) {
      saveLocalStoredOrder(saved);
      upsertOrderToIDB(saved);
      notifyOrderSubscribers();
      return saved.id;
    }
  } catch (err) {
    console.warn('[API] Orden guardada localmente (fallback):', err);
  }
  return order.id;
}

export async function updateOrderInDb(orderId: string, updates: Partial<Order>): Promise<void> {
  try {
    const existing = getLocalStoredOrders();
    const idx = existing.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      const nextOrder = { ...existing[idx], ...updates, updatedAt: new Date().toISOString() };
      existing[idx] = nextOrder;
      localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(existing));
      upsertOrderToIDB(nextOrder);
    }
  } catch {}
  notifyOrderSubscribers();

  try {
    const updated = await apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: updates,
    });
    if (updated && updated.id) {
      saveLocalStoredOrder(updated);
      upsertOrderToIDB(updated);
      notifyOrderSubscribers();
    }
  } catch (err) {
    console.warn('[API] Actualización de orden en modo fallback:', err);
  }
}

export async function createOrdersBatchInDb(orders: Order[]): Promise<void> {
  try {
    const existing = getLocalStoredOrders();
    const map = new Map<string, Order>();
    existing.forEach((o) => map.set(o.id, o));
    orders.forEach((o) => map.set(o.id, o));
    const merged = Array.from(map.values());
    localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(merged));
    syncOrdersToIDB(merged);
  } catch {}
  notifyOrderSubscribers();

  try {
    await apiFetch('/api/orders/batch', {
      method: 'POST',
      body: { orders },
    });
  } catch (err) {
    console.warn('[API] Batch write fallback:', err);
  }
}

export async function getOrders(): Promise<Order[]> {
  const localOrders = getLocalStoredOrders();
  try {
    const remoteOrders = await apiFetch<Order[]>('/api/orders');
    if (Array.isArray(remoteOrders)) {
      const map = new Map<string, Order>();
      remoteOrders.forEach((o) => map.set(o.id, o));
      localOrders.forEach((o) => {
        if (!map.has(o.id)) map.set(o.id, o);
      });
      const merged = Array.from(map.values());
      localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(merged));
      syncOrdersToIDB(merged);
      return merged;
    }
  } catch {}
  if (localOrders.length > 0) return localOrders;
  return await getOrdersFromIDB();
}

export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  _isAuthenticated: boolean
): () => void {
  orderSubscribers.add(callback);

  const localOrders = getLocalStoredOrders();
  if (localOrders.length > 0) {
    callback(localOrders);
  }

  getOrders()
    .then((merged) => callback(merged))
    .catch(() => {});

  const unsubCreated = onSocketEvent<Order>('orders:created', (newOrder) => {
    if (newOrder?.id) {
      saveLocalStoredOrder(newOrder);
      upsertOrderToIDB(newOrder);
      notifyOrderSubscribers();
    }
  });

  const unsubUpdated = onSocketEvent<Order>('orders:updated', (updatedOrder) => {
    if (updatedOrder?.id) {
      saveLocalStoredOrder(updatedOrder);
      upsertOrderToIDB(updatedOrder);
      notifyOrderSubscribers();
    }
  });

  const unsubBatch = onSocketEvent('orders:batch-updated', () => {
    getOrders()
      .then((merged) => callback(merged))
      .catch(() => {});
  });

  return () => {
    orderSubscribers.delete(callback);
    unsubCreated();
    unsubUpdated();
    unsubBatch();
  };
}

// LÍMITES ANTIFRAUDE PARA PAGO EN EFECTIVO
// 1er pedido (0 previos): $300 MXN en producto
// 2do pedido (1 previo): $400 MXN en producto
// 3er pedido (2 previos): $500 MXN en producto
// 4to pedido en adelante: $1,000 MXN en producto
// Transferencias: sin límite
export function getCustomerCashLimit(completedOrdersCount: number): number {
  if (completedOrdersCount <= 0) return 300;
  if (completedOrdersCount === 1) return 400;
  if (completedOrdersCount === 2) return 500;
  return 1000;
}

const LOCAL_STORAGE_BLOCKED_CUSTOMERS = 'rodo_blocked_customers';

export interface BlockedCustomerEntry {
  identifier: string; // teléfono o correo
  customerName?: string;
  reason: string;
  blockedAt: string;
}

export function getBlockedCustomersList(): BlockedCustomerEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS) || '[]');
  } catch {
    return [];
  }
}

export function isCustomerBlocked(phone: string, email?: string): { blocked: boolean; reason?: string } {
  const list = getBlockedCustomersList();
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanEmail = email?.trim().toLowerCase();

  const found = list.find((b) => {
    const bId = b.identifier.toLowerCase().replace(/[^0-9a-z@.]/g, '');
    return (cleanPhone && bId.includes(cleanPhone)) || (cleanEmail && bId === cleanEmail);
  });

  if (found) {
    return { blocked: true, reason: found.reason };
  }
  return { blocked: false };
}

export function blockCustomerAccount(identifier: string, name: string, reason: string): void {
  const list = getBlockedCustomersList();
  const filtered = list.filter((b) => b.identifier.toLowerCase() !== identifier.toLowerCase());
  filtered.push({
    identifier,
    customerName: name,
    reason: reason || 'Actividad sospechosa o intento de fraude detectado',
    blockedAt: new Date().toISOString(),
  });
  localStorage.setItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS, JSON.stringify(filtered));
}

export function unblockCustomerAccount(identifier: string): void {
  const list = getBlockedCustomersList();
  const filtered = list.filter((b) => b.identifier.toLowerCase() !== identifier.toLowerCase());
  localStorage.setItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS, JSON.stringify(filtered));
}

// Formateador de WhatsApp para despachar a repartidores
export function buildWhatsAppDispatchMessage(
  order: Order,
  riderName: string,
  appUrl: string = window.location.origin
): string {
  const ticketUrl = `${appUrl}?ticket=${encodeURIComponent(order.folio)}`;

  if (order.orderType === 'solicitud_local') {
    const riderCount = order.ridersRequestedCount || 1;
    const urgency = order.urgencyTiming || 'Inmediato (Ya)';
    const mapsLink = order.mapsUrl || (order.coordinates ? `https://maps.google.com/?q=${order.coordinates.lat},${order.coordinates.lng}` : '');
    const feeText = order.deliveryFee > 0 ? `$${order.deliveryFee.toFixed(2)} MXN` : 'Tarifa estándar';

    return `🚨 *RODO MOTO MANDADOS · SOLICITUD DE LOCAL* 🏍️💨
━━━━━━━━━━━━━━━━━━━━
📌 *FOLIO:* ${order.folio}
👤 *Repartidor Asignado:* ${riderName}
🏪 *RESTAURANTE / RECOGER EN:* ${order.restaurantName} (Código: ${order.localCode || 'N/A'})
📍 *Dirección Restaurante:* ${order.pickupAddress || 'Ver datos de local'}
📞 *Teléfono Restaurante:* ${order.pickupPhone || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
📍 *LUGAR DE ENTREGA AL CLIENTE:*
${order.deliveryAddress || 'Dirección especificada por el local'}
${mapsLink ? `🗺️ *Ubicación GPS (Entrega):* ${mapsLink}\n` : ''}📞 *Teléfono Cliente / Destino:* ${order.customerPhone || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
🏍️ *REPARTIDORES SOLICITADOS:* ${riderCount} ${riderCount === 1 ? 'Repartidor' : 'Repartidores'}
⏱️ *TIEMPO / URGENCIA:* ${urgency}
💵 *TARIFA A COBRAR AL RESTAURANTE:* ${feeText} ${riderCount > 1 ? `(Total: $${order.total.toFixed(2)} MXN)` : ''}
${order.deliveryNotes ? `\n📝 *OBSERVACIONES / PEDIDOS:*\n${order.deliveryNotes}\n` : ''}━━━━━━━━━━━━━━━━━━━━
🎫 *TICKET DIGITAL:*
${ticketUrl}

_RODO Moto Mandados · Despacho Central San Miguel_`;
  }

  if (order.orderType === 'auxilio_gasolina' && order.fuelDetails) {
    const isTransfer = order.paymentMethod === 'transferencia';
    const paymentInstruction = isTransfer
      ? `✅ *TRANSFERENCIA VERIFICADA (NO COBRAR)*`
      : `💵 *COBRAR EN EFECTIVO:* 👉 *$${order.total.toFixed(2)} MXN*`;

    return `⛽ *RODO MOTO MANDADOS · AUXILIO GASOLINA DE EMERGENCIA* 🏍️💨
━━━━━━━━━━━━━━━━━━━━
📌 *FOLIO:* ${order.folio}
👤 *Repartidor:* ${riderName}
🚨 *SERVICIO DE COMBUSTIBLE EN RUTA*
━━━━━━━━━━━━━━━━━━━━
📍 *UBICACIÓN DONDE SE ENCUENTRA VARADO:*
${order.deliveryAddress}
${order.deliveryNotes ? `📝 *Referencias / Vehículo:* ${order.deliveryNotes}\n` : ''}📞 *Teléfono del Cliente:* ${order.customerPhone}
━━━━━━━━━━━━━━━━━━━━
⛽ *DETALLES DEL COMBUSTIBLE:*
• *Litros:* ${order.fuelDetails.liters} Litro(s) en Garrafa Homologada
• *Tipo:* Gasolina ${order.fuelDetails.fuelType.toUpperCase()}
• *Costo Gasolina:* $${order.fuelDetails.fuelTotal.toFixed(2)} MXN
🏍️ *Tarifa de Viaje Auxilio:* $${order.fuelDetails.serviceTravelFee.toFixed(2)} MXN
${order.tipAmount ? `❤️ *Propina Repartidor:* $${order.tipAmount.toFixed(2)} MXN\n` : ''}━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL A LIQUIDAR:* $${order.total.toFixed(2)} MXN
${paymentInstruction}

🎫 *TICKET DIGITAL EN VIVO:*
${ticketUrl}

_RODO Moto Mandados · Auxilio Vial Rápido_`;
  }

  const isTransfer = order.paymentMethod === 'transferencia';
  const paymentInstruction = isTransfer
    ? `✅ *TRANSFERENCIA BANCARIA PRE-VERIFICADA*\n⚠️ *NO COBRAR AL CLIENTE* (Ya fue pagado y verificado en cuenta).`
    : `💵 *COBRAR EN EFECTIVO AL ENTREGAR:*\n👉 *$${order.total.toFixed(2)} MXN* exactos.`;

  const itemsList = order.items
    .map((it) => `• ${it.quantity}x ${it.name} ($${(it.price * it.quantity).toFixed(2)})${it.isExtra ? ' *(Extra)*' : ''}`)
    .join('\n');

  const deliveryTypeLabel =
    order.deliveryType === 'express'
      ? `⚡ Entrega Exprés (+ $${order.deliveryTypeSurcharge || 25} MXN)`
      : order.deliveryType === 'programada'
      ? `🕒 Entrega Programada (${order.scheduledDeliveryTime || 'Programado'})`
      : `🛵 Entrega Normal`;

  const tipText = order.tipAmount && order.tipAmount > 0
    ? `❤️ *Propina Repartidor (${order.tipPercentage || 0}%):* $${order.tipAmount.toFixed(2)} MXN\n`
    : '';

  // Obtener ubicación GPS fija del restaurante si fue configurada por el administrador
  const storedRestaurants = getLocalStoredRestaurants();
  const matchedRestaurant = storedRestaurants.find(
    (r) => r.id === order.restaurantId || r.name.toLowerCase() === order.restaurantName.toLowerCase()
  );
  const restGpsLink =
    matchedRestaurant?.mapsUrl ||
    (matchedRestaurant?.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${matchedRestaurant.coordinates.lat},${matchedRestaurant.coordinates.lng}`
      : '');
  const restAddressText = matchedRestaurant?.address
    ? `Calle ${matchedRestaurant.address.calle} #${matchedRestaurant.address.numero}, Col. ${matchedRestaurant.address.colonia}`
    : '';

  const routeSummaryText = order.routePathSummary
    ? `🗺️ *Ruta & Distancia:* ${order.routePathSummary}\n`
    : order.distanceKm
    ? `🗺️ *Distancia:* ${order.distanceKm} km (~${order.routeEstimateMinutes || 15} min en moto)\n`
    : '';

  return `🏍️ *RODO MOTO MANDADOS · DESPACHO DE ORDEN*
━━━━━━━━━━━━━━━━━━
📌 *FOLIO:* ${order.folio}
👤 *Repartidor:* ${riderName}
🏪 *RECOGER EN:* ${order.restaurantName}
${restAddressText ? `📍 *Dirección del Local:* ${restAddressText}\n` : ''}${restGpsLink ? `🗺️ *GPS del Local para el Repartidor:* ${restGpsLink}\n` : ''}📍 *ENTREGAR EN:* ${order.deliveryAddress}
${routeSummaryText}📞 *Teléfono Cliente:* ${order.customerPhone || 'No especificado'}
${order.deliveryNotes ? `📝 *Notas de entrega:* ${order.deliveryNotes}\n` : ''}
🛒 *PRODUCTOS:*
${itemsList}
━━━━━━━━━━━━━━━━━━
💰 *Artículos:* $${order.subtotal.toFixed(2)} MXN
🏍️ *Envío (${deliveryTypeLabel}):* $${order.deliveryFee.toFixed(2)} MXN
${tipText}💲 *TOTAL ORDEN:* $${order.total.toFixed(2)} MXN

${paymentInstruction}

🎫 *TICKET DIGITAL EN VIVO:*
${ticketUrl}

_RODO Moto Mandados · Despacho Central_`;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

// PERSISTENCIA EN POSTGRESQL DE BITÁCORA DE AUDITORÍA ADMINISTRATIVA
export async function saveAdminAuditLogToFirestore(log: AdminAuditLogEntry): Promise<void> {
  try {
    await apiFetch('/api/audit-logs', {
      method: 'POST',
      body: log,
    });
  } catch (err) {
    console.warn('[API] Audit log fallback:', err);
  }
}

export async function getAdminAuditLogsFromFirestore(maxCount = 100): Promise<AdminAuditLogEntry[]> {
  try {
    const logs = await apiFetch<AdminAuditLogEntry[]>(`/api/audit-logs?limit=${maxCount}`);
    if (Array.isArray(logs)) {
      return logs;
    }
    return [];
  } catch {
    return [];
  }
}

export function subscribeToAdminAuditLogs(callback: (logs: AdminAuditLogEntry[]) => void): () => void {
  getAdminAuditLogsFromFirestore(100)
    .then((logs) => callback(logs))
    .catch(() => {});

  const unsub = onSocketEvent<AdminAuditLogEntry>('audit:created', () => {
    getAdminAuditLogsFromFirestore(100)
      .then((logs) => callback(logs))
      .catch(() => {});
  });

  return () => {
    unsub();
  };
}

// -------------------------------------------------------------
// MIDDLEWARE DE AUDITORÍA Y TRAZABILIDAD TOTAL (PostgreSQL AuditLog)
// Registra: timestamp, action, user_id, previous_value, new_value
// -------------------------------------------------------------
export const ADMIN_LOGS_COL = 'admin_logs';

export async function logAdminMiddlewareAction(params: {
  action: string;
  userId?: string;
  previousValue?: any;
  newValue?: any;
  details?: string;
  affectedRestaurant?: string;
  affectedFolio?: string;
}): Promise<void> {
  const logId = `admin-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const logEntry = {
    id: logId,
    timestamp: new Date().toISOString(),
    action: params.action,
    user_id: params.userId || 'edsoncruz14999@gmail.com',
    previous_value: params.previousValue !== undefined ? params.previousValue : null,
    newValue: params.newValue !== undefined ? params.newValue : null,
    details: params.details || '',
    affected_restaurant: params.affectedRestaurant || '',
    affected_folio: params.affectedFolio || '',
  };

  try {
    await apiFetch('/api/audit-logs', {
      method: 'POST',
      body: logEntry,
    });
  } catch {}
}

// -------------------------------------------------------------
// NOTIFICACIONES DE MARKETING PROGRAMADAS / ENVIAR A TODOS
// -------------------------------------------------------------
export function getLocalBroadcastNotifications(): BroadcastNotification[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_BROADCASTS) || '[]');
  } catch {
    return [];
  }
}

export async function sendBroadcastNotification(notif: BroadcastNotification): Promise<void> {
  try {
    const existing = getLocalBroadcastNotifications();
    const updated = [notif, ...existing.filter((n) => n.id !== notif.id)].slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_BROADCASTS, JSON.stringify(updated));
    saveBroadcastToIDB(notif);
  } catch {}

  try {
    await apiFetch('/api/broadcasts', {
      method: 'POST',
      body: notif,
    });
  } catch (err) {
    console.warn('[API] Broadcast fallback:', err);
  }
}

export async function getBroadcastNotifications(): Promise<BroadcastNotification[]> {
  const localList = getLocalBroadcastNotifications();
  try {
    const remoteList = await apiFetch<BroadcastNotification[]>('/api/broadcasts');
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_BROADCASTS, JSON.stringify(remoteList));
      return remoteList;
    }
  } catch {}
  if (localList.length > 0) return localList;
  return await getBroadcastsFromIDB();
}

export function subscribeToBroadcastNotifications(
  callback: (items: BroadcastNotification[]) => void
): () => void {
  getBroadcastNotifications()
    .then((list) => callback(list))
    .catch(() => {});

  const unsub = onSocketEvent<BroadcastNotification>('broadcasts:created', (newNotif) => {
    const current = getLocalBroadcastNotifications();
    const updated = [newNotif, ...current.filter((n) => n.id !== newNotif.id)].slice(0, 50);
    try {
      localStorage.setItem(LOCAL_STORAGE_BROADCASTS, JSON.stringify(updated));
    } catch {}
    callback(updated);
  });

  return () => {
    unsub();
  };
}

// -------------------------------------------------------------
// RECUPERACIÓN DE CUENTA Y REACTIVACIÓN POR SOPORTE (POSTGRESQL)
// -------------------------------------------------------------
export function generateRecoveryFolio(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${yy}${mm}${dd}-${rand}`;
}

export function getLocalRecoveryRequests(): AccountRecoveryRequest[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_RECOVERY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalRecoveryRequests(list: AccountRecoveryRequest[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_RECOVERY, JSON.stringify(list));
  } catch {}
}

export async function submitAccountRecoveryRequest(
  req: AccountRecoveryRequest
): Promise<AccountRecoveryRequest> {
  const local = getLocalRecoveryRequests();
  const updated = [req, ...local.filter((r) => r.id !== req.id)];
  saveLocalRecoveryRequests(updated);

  try {
    const saved = await apiFetch<AccountRecoveryRequest>('/api/auth/recovery', {
      method: 'POST',
      body: req,
    });
    if (saved) return saved;
  } catch (err) {
    console.warn('[API] Recovery request saved locally:', err);
  }
  return req;
}

export async function getAccountRecoveryRequests(): Promise<AccountRecoveryRequest[]> {
  const local = getLocalRecoveryRequests();
  try {
    const remote = await apiFetch<AccountRecoveryRequest[]>('/api/auth/recovery');
    if (Array.isArray(remote) && remote.length > 0) {
      const map = new Map<string, AccountRecoveryRequest>();
      remote.forEach((r) => map.set(r.id, r));
      local.forEach((r) => {
        if (!map.has(r.id)) map.set(r.id, r);
      });
      const merged = Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      saveLocalRecoveryRequests(merged);
      return merged;
    }
  } catch {}
  return local;
}

export async function resolveAccountRecoveryRequest(
  requestId: string,
  decision: 'aprobada' | 'rechazada',
  adminNotes?: string
): Promise<AccountRecoveryRequest | null> {
  const list = await getAccountRecoveryRequests();
  const target = list.find((r) => r.id === requestId);
  if (!target) return null;

  const now = new Date().toISOString();
  const updatedReq: AccountRecoveryRequest = {
    ...target,
    status: decision,
    adminNotes: adminNotes || '',
    reviewedBy: 'edsoncruz14999@gmail.com',
    reviewedAt: now,
  };

  const nextList = list.map((r) => (r.id === requestId ? updatedReq : r));
  saveLocalRecoveryRequests(nextList);

  if (decision === 'aprobada') {
    const accounts = getStoredIneAccounts();
    const cleanOld = target.oldEmail.trim().toLowerCase();
    const cleanNew = target.newEmail.trim().toLowerCase();
    const cleanPhone = target.phone.replace(/[^0-9]/g, '');

    const matchedOld = accounts.find(
      (a) =>
        a.email.toLowerCase() === cleanOld ||
        (cleanPhone && a.phone.replace(/[^0-9]/g, '') === cleanPhone)
    );

    const newDigits =
      (target.ine10Digits && target.ine10Digits.replace(/[^0-9]/g, '').length === 10
        ? target.ine10Digits.replace(/[^0-9]/g, '')
        : matchedOld?.ine10Digits) || '0000000000';

    saveIneAccount({
      id: matchedOld?.id || `cust-${cleanPhone || Date.now()}`,
      name: target.customerName || matchedOld?.name || 'Cliente RODO',
      phone: target.phone || matchedOld?.phone || '',
      email: cleanNew,
      ineVerified: true,
      ineDigits: newDigits,
      ine10Digits: newDigits,
      inePhotoUploaded: true,
      ineVerifiedAt: now,
      pendingDebt: matchedOld?.pendingDebt || 0,
      status: 'activo',
      completedOrdersCount: matchedOld?.completedOrdersCount || 0,
      referralCode: matchedOld?.referralCode,
      referralRewardsCount: matchedOld?.referralRewardsCount || 0,
      coupons: matchedOld?.coupons || [],
      createdAt: matchedOld?.createdAt || now,
    });
  }

  try {
    await apiFetch(`/api/auth/recovery/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: {
        status: decision,
        adminNotes: adminNotes || '',
        reviewedBy: 'edsoncruz14999@gmail.com',
      },
    });
  } catch (err) {
    console.warn('[API] Fallback local en resolución de recuperación:', err);
  }

  return updatedReq;
}

export function findApprovedRecoveryForEmail(email: string): AccountRecoveryRequest | null {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const local = getLocalRecoveryRequests();
  return (
    local.find(
      (r) => r.status === 'aprobada' && r.newEmail.trim().toLowerCase() === clean
    ) || null
  );
}

export async function findApprovedRecoveryForEmailAsync(
  email: string
): Promise<AccountRecoveryRequest | null> {
  const localMatch = findApprovedRecoveryForEmail(email);
  if (localMatch) return localMatch;

  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  try {
    const list = await apiFetch<AccountRecoveryRequest[]>(
      `/api/auth/recovery?newEmail=${encodeURIComponent(clean)}&status=aprobada`
    );
    if (Array.isArray(list) && list.length > 0) {
      return list[0];
    }
  } catch {}
  return null;
}

