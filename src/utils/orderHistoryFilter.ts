import type { Order } from '../types';

export const ORDER_LIVE_WINDOW_HOURS = 24;
export const ORDER_LIVE_WINDOW_MS = ORDER_LIVE_WINDOW_HOURS * 60 * 60 * 1000;

export interface AdminOrderHistoryFilters {
  search: string;
  status: string;
  paymentMethod: 'todos' | 'efectivo' | 'transferencia';
  orderType: 'todos' | 'comida' | 'envio' | 'solicitud_local' | 'auxilio_gasolina';
  rider: string;
  dateFrom: string;
  dateTo: string;
  scope: 'todos' | 'archivados_24h' | 'ultimas_24h';
}

export const DEFAULT_ADMIN_HISTORY_FILTERS: AdminOrderHistoryFilters = {
  search: '',
  status: 'todos',
  paymentMethod: 'todos',
  orderType: 'todos',
  rider: 'todos',
  dateFrom: '',
  dateTo: '',
  scope: 'todos',
};

export interface OrderHistorySummary {
  totalCount: number;
  deliveredCount: number;
  cancelledCount: number;
  activeCount: number;
  archivedCount: number;
  totalRevenue: number;
  totalDeliveryFees: number;
  totalCommissions: number;
  cashTotal: number;
  transferTotal: number;
}

export function isOrderWithinLast24Hours(createdAt: string, nowMs = Date.now()): boolean {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return true;
  return nowMs - createdMs <= ORDER_LIVE_WINDOW_MS;
}

export function splitLiveAndArchivedOrders(orders: Order[], nowMs = Date.now()): {
  liveOrders: Order[];
  archivedOrders: Order[];
} {
  const liveOrders: Order[] = [];
  const archivedOrders: Order[] = [];

  for (const order of orders) {
    if (isOrderWithinLast24Hours(order.createdAt, nowMs)) {
      liveOrders.push(order);
    } else {
      archivedOrders.push(order);
    }
  }

  return { liveOrders, archivedOrders };
}

function normalizeText(value?: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterAdminHistoricalOrders(
  orders: Order[],
  filters: AdminOrderHistoryFilters,
  nowMs = Date.now()
): Order[] {
  const q = normalizeText(filters.search);
  const fromMs = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const toMs = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;

  return orders.filter((order) => {
    const isLive = isOrderWithinLast24Hours(order.createdAt, nowMs);
    if (filters.scope === 'archivados_24h' && isLive) return false;
    if (filters.scope === 'ultimas_24h' && !isLive) return false;

    if (filters.status !== 'todos') {
      if (filters.status === 'activos') {
        if (['entregado', 'cancelado', 'cancelado_con_deuda'].includes(order.status)) return false;
      } else if (filters.status === 'cancelados_todos') {
        if (order.status !== 'cancelado' && order.status !== 'cancelado_con_deuda') return false;
      } else if (order.status !== filters.status) {
        return false;
      }
    }

    if (filters.paymentMethod !== 'todos' && order.paymentMethod !== filters.paymentMethod) {
      return false;
    }

    if (filters.orderType !== 'todos' && (order.orderType || 'comida') !== filters.orderType) {
      return false;
    }

    if (filters.rider !== 'todos') {
      const assigned = (order.assignedRiderName || '').trim();
      if (filters.rider === 'sin_asignar') {
        if (assigned) return false;
      } else if (assigned !== filters.rider) {
        return false;
      }
    }

    if (fromMs !== null || toMs !== null) {
      const createdMs = new Date(order.createdAt).getTime();
      if (Number.isFinite(createdMs)) {
        if (fromMs !== null && createdMs < fromMs) return false;
        if (toMs !== null && createdMs > toMs) return false;
      }
    }

    if (q) {
      const itemsText = (order.items || []).map((it) => it.name).join(' ');
      const haystack = normalizeText(
        `${order.folio} ${order.customerName} ${order.customerPhone} ${order.customerEmail || ''} ${order.restaurantName} ${order.deliveryAddress} ${order.assignedRiderName || ''} ${order.bankVerification?.trackingKey || ''} ${itemsText}`
      );
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export function computeOrderHistorySummary(
  orders: Order[],
  nowMs = Date.now()
): OrderHistorySummary {
  let deliveredCount = 0;
  let cancelledCount = 0;
  let activeCount = 0;
  let archivedCount = 0;
  let totalRevenue = 0;
  let totalDeliveryFees = 0;
  let totalCommissions = 0;
  let cashTotal = 0;
  let transferTotal = 0;

  for (const order of orders) {
    if (!isOrderWithinLast24Hours(order.createdAt, nowMs)) {
      archivedCount += 1;
    }

    const isCancelled = order.status === 'cancelado' || order.status === 'cancelado_con_deuda';
    if (order.status === 'entregado') {
      deliveredCount += 1;
    } else if (isCancelled) {
      cancelledCount += 1;
    } else {
      activeCount += 1;
    }

    if (!isCancelled) {
      const total = Number(order.total || 0);
      const deliveryFee = Number(order.deliveryFee || 0);
      const commission = Number(order.commissionAmount || 0);
      totalRevenue += total;
      totalDeliveryFees += deliveryFee;
      totalCommissions += commission;
      if (order.paymentMethod === 'transferencia') {
        transferTotal += total;
      } else {
        cashTotal += total;
      }
    }
  }

  return {
    totalCount: orders.length,
    deliveredCount,
    cancelledCount,
    activeCount,
    archivedCount,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalDeliveryFees: Number(totalDeliveryFees.toFixed(2)),
    totalCommissions: Number(totalCommissions.toFixed(2)),
    cashTotal: Number(cashTotal.toFixed(2)),
    transferTotal: Number(transferTotal.toFixed(2)),
  };
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

export function buildOrdersCsvContent(orders: Order[]): string {
  const headers = [
    'Folio',
    'Fecha Creación',
    'Estatus Final',
    'Tipo',
    'Establecimiento',
    'Cliente',
    'Teléfono',
    'Dirección',
    'Repartidor',
    'Método Pago',
    'Estado Pago',
    'Subtotal',
    'Envío',
    'Comisión RODO',
    'Total',
    'Calificación',
    'Artículos',
  ];

  const rows = orders.map((o) => [
    o.folio,
    new Date(o.createdAt).toLocaleString('es-MX'),
    o.status,
    o.orderType || 'comida',
    o.restaurantName,
    o.customerName,
    o.customerPhone,
    o.deliveryAddress,
    o.assignedRiderName || 'Sin asignar',
    o.paymentMethod,
    o.paymentStatus,
    Number(o.subtotal || 0).toFixed(2),
    Number(o.deliveryFee || 0).toFixed(2),
    Number(o.commissionAmount || 0).toFixed(2),
    Number(o.total || 0).toFixed(2),
    o.rating ? `${o.rating}/5` : '',
    (o.items || []).map((it) => `${it.quantity}x ${it.name}`).join(' | '),
  ]);

  return (
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
  );
}
