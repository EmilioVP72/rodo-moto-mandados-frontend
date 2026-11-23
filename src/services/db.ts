import { apiFetch, ApiHttpError, getAuthToken } from '../api/httpClient';
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
import { persistOnlyAfterConfirmation } from './orderPersistence';
import {
  syncRestaurantsToIDB,
  getRestaurantsFromIDB,
  syncOrdersToIDB,
  clearOrdersFromIDB,
  upsertOrderToIDB,
  getOrdersFromIDB,
  saveBroadcastToIDB,
  getBroadcastsFromIDB,
} from './indexedDb';

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

export async function createOrderInDb(order: Order): Promise<Order> {
  const saved = await persistOnlyAfterConfirmation(
    () => apiFetch<Order>('/api/orders', { method: 'POST', body: order }),
    (confirmedOrder) => {
      saveLocalStoredOrder(confirmedOrder);
      upsertOrderToIDB(confirmedOrder);
      notifyOrderSubscribers();
    }
  );
  return saved;
}

export async function confirmOrderTransfer(orderId: string): Promise<void> {
  await persistOnlyAfterConfirmation(
    () => apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}`, { method: 'PATCH', body: { paymentStatus: 'verificado' } }),
    order => { saveLocalStoredOrder(order); upsertOrderToIDB(order); notifyOrderSubscribers(); }
  );
}

export async function updateOrderInDb(orderId: string, updates: Partial<Order>): Promise<void> {
  await persistOnlyAfterConfirmation(
    () => apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}`, { method: 'PATCH', body: updates }),
    order => { saveLocalStoredOrder(order); upsertOrderToIDB(order); notifyOrderSubscribers(); }
  );
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
  if (!getAuthToken()) {
    return [];
  }
  const localOrders = getLocalStoredOrders();
  try {
    const remoteOrders = await apiFetch<Order[]>('/api/orders');
    if (Array.isArray(remoteOrders)) {
      localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(remoteOrders));
      syncOrdersToIDB(remoteOrders);
      return remoteOrders;
    }
  } catch (err) {
    if (err instanceof ApiHttpError && err.status === 401) {
      return [];
    }
  }
  if (localOrders.length > 0) return localOrders;
  return await getOrdersFromIDB();
}

export function clearLocalOrdersCache(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_ORDERS);
  } catch {}
  void clearOrdersFromIDB();
}

export interface OrderSubscriptionScope {
  role: 'admin' | 'customer';
  userId?: string;
}

function isOrderVisibleForScope(order: Order, scope?: OrderSubscriptionScope): boolean {
  if (!order?.id) return false;
  if (!scope || scope.role === 'admin') return true;
  if (!scope.userId) return false;
  return order.customerId === scope.userId;
}

export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  isAuthenticated: boolean,
  scope?: OrderSubscriptionScope
): () => void {
  if (!isAuthenticated || !getAuthToken()) {
    callback([]);
    return () => {};
  }

  const scopedCallback = (list: Order[]) => {
    callback(list.filter((o) => isOrderVisibleForScope(o, scope)));
  };

  orderSubscribers.add(scopedCallback);

  getOrders()
    .then((scopedOrders) => scopedCallback(scopedOrders))
    .catch(() => {});

  const unsubCreated = onSocketEvent<Order>('orders:created', (newOrder) => {
    if (isOrderVisibleForScope(newOrder, scope)) {
      saveLocalStoredOrder(newOrder);
      upsertOrderToIDB(newOrder);
      notifyOrderSubscribers();
    }
  });

  const unsubUpdated = onSocketEvent<Order>('orders:updated', (updatedOrder) => {
    if (isOrderVisibleForScope(updatedOrder, scope)) {
      saveLocalStoredOrder(updatedOrder);
      upsertOrderToIDB(updatedOrder);
      notifyOrderSubscribers();
    }
  });

  const unsubBatch = onSocketEvent('orders:batch-updated', () => {
    if (scope?.role === 'customer') return;
    getOrders()
      .then((scopedOrders) => scopedCallback(scopedOrders))
      .catch(() => {});
  });

  return () => {
    orderSubscribers.delete(scopedCallback);
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

let hasInitializedBlockedSync = false;

function ensureBlockedCustomersSync(): void {
  if (hasInitializedBlockedSync || typeof window === 'undefined') return;
  hasInitializedBlockedSync = true;
  apiFetch<BlockedCustomerEntry[]>('/api/auth/blocked-customers')
    .then((remoteList) => {
      if (Array.isArray(remoteList)) {
        localStorage.setItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS, JSON.stringify(remoteList));
      }
    })
    .catch(() => {});
}

export function getBlockedCustomersList(): BlockedCustomerEntry[] {
  ensureBlockedCustomersSync();
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
  const entry: BlockedCustomerEntry = {
    identifier,
    customerName: name,
    reason: reason || 'Actividad sospechosa o intento de fraude detectado',
    blockedAt: new Date().toISOString(),
  };
  filtered.push(entry);
  localStorage.setItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS, JSON.stringify(filtered));

  apiFetch('/api/auth/blocked-customers', {
    method: 'POST',
    body: {
      identifier,
      customerName: name,
      reason: entry.reason,
    },
  }).catch(() => {});
}

export function unblockCustomerAccount(identifier: string): void {
  const list = getBlockedCustomersList();
  const filtered = list.filter((b) => b.identifier.toLowerCase() !== identifier.toLowerCase());
  localStorage.setItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS, JSON.stringify(filtered));

  apiFetch(`/api/auth/blocked-customers/${encodeURIComponent(identifier)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

export {
  buildWhatsAppDispatchMessage,
  generateWhatsAppLink,
} from './whatsappDispatch';

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

// Elimina copias de identificaciones guardadas por versiones anteriores.
try { localStorage.removeItem(LOCAL_STORAGE_RECOVERY); } catch {}

export function submitAccountRecoveryRequest(req: AccountRecoveryRequest) {
  return apiFetch<Pick<AccountRecoveryRequest, 'id' | 'folio' | 'status'>>('/api/auth/recovery', { method: 'POST', body: req });
}

export function getAccountRecoveryRequests(): Promise<AccountRecoveryRequest[]> {
  return apiFetch<AccountRecoveryRequest[]>('/api/auth/recovery');
}

export function resolveAccountRecoveryRequest(requestId: string, decision: 'aprobada' | 'rechazada', adminNotes?: string) {
  return apiFetch<AccountRecoveryRequest>(`/api/auth/recovery/${encodeURIComponent(requestId)}`, {
    method: 'PATCH', body: { status: decision, adminNotes },
  });
}

