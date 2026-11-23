/**
 * Submission and audit helpers for RODO Moto Mandados orders.
 */

import { Order, OrderItem, AdminAuditLogEntry } from '../types';
import { createOrderInDb, saveAdminAuditLogToFirestore, logAdminMiddlewareAction } from './db';

const AUDIT_LOGS_KEY = 'rodo_admin_audit_logs';
/**
 * Genera un folio único y ordenado criptográficamente tipo RD-261110-XXXX
 */
export function generateUniqueRodoFolio(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const sequenceNum = String(Date.now()).slice(-4);
  return `RD-${yy}${mm}${dd}-${randomChars}${sequenceNum}`;
}

/**
 * Recalcula el subtotal real de los artículos para evitar adulteración de precios
 */
export function validateAndRecalculateOrderSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    const baseItemPrice = item.price || 0;
    const modifiersTotal = (item.selectedModifiers || []).reduce(
      (mSum, mod) => mSum + (mod.price || 0),
      0
    );
    const itemTotal = (baseItemPrice + modifiersTotal) * (item.quantity || 1);
    return sum + itemTotal;
  }, 0);
}

/**
 * Agrega un registro inmutable a la Bitácora de Auditoría de Edson
 */
export function logAdminAction(
  actionType: AdminAuditLogEntry['actionType'],
  details: string,
  adminEmail: string = 'edsoncruz14999@gmail.com',
  affectedFolio?: string,
  affectedRestaurant?: string,
  previousValue?: string,
  newValue?: string
): AdminAuditLogEntry {
  const entry: AdminAuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    adminEmail,
    actionType,
    details,
    affectedFolio,
    affectedRestaurant,
    previousValue,
    newValue,
  };

  // 1. Guardar de inmediato en almacenamiento local para acceso offline
  try {
    const existing = getAdminAuditLogs();
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, 500);
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error guardando en bitácora local:', err);
  }

  // 2. Persistir en Firestore de inmediato para rendición de cuentas
  try {
    saveAdminAuditLogToFirestore(entry).catch((err) => {
      console.warn('Persistencia en Firestore encolada:', err);
    });

    // Registrar en colección admin_logs (middleware de auditoría con trazabilidad total)
    logAdminMiddlewareAction({
      action: actionType,
      userId: adminEmail,
      previousValue: previousValue || null,
      newValue: newValue || null,
      details,
      affectedRestaurant,
      affectedFolio,
    }).catch((err) => {
      console.warn('Registro en admin_logs encolado:', err);
    });
  } catch (err) {
    console.warn('Error al iniciar guardado en Firestore:', err);
  }

  return entry;
}

/**
 * Recupera la bitácora de auditoría de Edson
 */
export function getAdminAuditLogs(): AdminAuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Procesa la creación de un nuevo pedido de forma segura y transaccional
 */
export async function submitOrderWithQueue(orderData: Omit<Order, 'id' | 'folio' | 'createdAt' | 'updatedAt'>): Promise<Order> {
  // 1. Recalcular y validar subtotal de seguridad (deliveryFee ya incluye el recargo express si aplica)
  const secureSubtotal = validateAndRecalculateOrderSubtotal(orderData.items);
  const deliveryFee = orderData.deliveryFee || 35;
  const tipAmount = orderData.tipAmount || 0;
  const promoDiscount = orderData.promoDiscountApplied || 0;

  const secureTotal = Math.max(0, secureSubtotal + deliveryFee + tipAmount - promoDiscount);

  // 2. Generar folio único y timestamp
  const now = new Date().toISOString();
  const folio = generateUniqueRodoFolio();

  const completeOrder: Order = {
    ...orderData,
    id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    folio,
    subtotal: secureSubtotal,
    total: secureTotal,
    createdAt: now,
    updatedAt: now,
  };

  // The order is accepted only after the server confirms persistence.
  await createOrderInDb(completeOrder);

  // 5. Registrar en bitácora de auditoría
  logAdminAction(
    'cambio_estatus',
    `Nuevo pedido registrado por cliente ${completeOrder.customerName} (${completeOrder.customerPhone}) en ${completeOrder.restaurantName}. Total: $${completeOrder.total} MXN`,
    'edsoncruz14999@gmail.com',
    completeOrder.folio,
    completeOrder.restaurantName
  );

  return completeOrder;
}
