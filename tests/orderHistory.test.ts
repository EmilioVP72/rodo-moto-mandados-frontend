import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Order } from '../src/types';
import {
  ORDER_LIVE_WINDOW_MS,
  isOrderWithinLast24Hours,
  splitLiveAndArchivedOrders,
  filterAdminHistoricalOrders,
  computeOrderHistorySummary,
  buildOrdersCsvContent,
  DEFAULT_ADMIN_HISTORY_FILTERS,
} from '../src/utils/orderHistoryFilter.ts';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    folio: 'RD-261120-001',
    orderType: 'comida',
    customerId: 'cust-1',
    customerName: 'Juan Pérez',
    customerPhone: '4151002030',
    restaurantId: 'tacos-sebas',
    restaurantName: 'Tacos Sebastián',
    restaurantDeliveryFee: 35,
    restaurantCommissionRate: 15,
    items: [{ id: 'ts-1', name: 'Tacos de Bistec', price: 100, quantity: 2 }],
    subtotal: 200,
    deliveryFee: 35,
    commissionAmount: 30,
    total: 235,
    paymentMethod: 'efectivo',
    paymentStatus: 'en_efectivo',
    deliveryAddress: 'Calle Correo #14, Centro',
    assignedRiderName: 'Moto 1 - Juan',
    status: 'entregado',
    createdAt: '2026-11-20T12:00:00.000Z',
    updatedAt: '2026-11-20T12:30:00.000Z',
    ...overrides,
  };
}

describe('Admin 24-Hour Live Panel Cleanup & Historical Orders Filtering Tests', () => {
  const fixedNow = new Date('2026-11-20T18:00:00.000Z').getTime();

  it('mantiene pedidos <= 24h en Despacho en Vivo y archiva pedidos > 24h', () => {
    const recentOrder = makeOrder({
      id: 'ord-recent',
      folio: 'RD-RECENT',
      createdAt: new Date(fixedNow - ORDER_LIVE_WINDOW_MS + 60_000).toISOString(), // 23h 59m
    });
    const expiredOrder = makeOrder({
      id: 'ord-archived',
      folio: 'RD-ARCHIVED',
      createdAt: new Date(fixedNow - ORDER_LIVE_WINDOW_MS - 60_000).toISOString(), // 24h 01m
    });

    assert.equal(isOrderWithinLast24Hours(recentOrder.createdAt, fixedNow), true);
    assert.equal(isOrderWithinLast24Hours(expiredOrder.createdAt, fixedNow), false);

    const { liveOrders, archivedOrders } = splitLiveAndArchivedOrders(
      [recentOrder, expiredOrder],
      fixedNow
    );
    assert.equal(liveOrders.length, 1);
    assert.equal(liveOrders[0].id, 'ord-recent');
    assert.equal(archivedOrders.length, 1);
    assert.equal(archivedOrders[0].id, 'ord-archived');
  });

  it('filtra histórico por estatus final, método de pago, repartidor, búsqueda y rango de archivo', () => {
    const orders = [
      makeOrder({
        id: '1',
        folio: 'RD-A1',
        customerName: 'María López',
        status: 'entregado',
        paymentMethod: 'transferencia',
        assignedRiderName: 'Moto 1 - Juan',
        total: 300,
        createdAt: '2026-11-18T10:00:00.000Z', // > 24h
      }),
      makeOrder({
        id: '2',
        folio: 'RD-B2',
        customerName: 'Carlos Gómez',
        status: 'cancelado',
        paymentMethod: 'efectivo',
        assignedRiderName: 'Moto 2 - Pedro',
        total: 180,
        createdAt: '2026-11-20T15:00:00.000Z', // < 24h
      }),
      makeOrder({
        id: '3',
        folio: 'RD-C3',
        customerName: 'Ana Martínez',
        orderType: 'envio',
        status: 'entregado',
        paymentMethod: 'efectivo',
        assignedRiderName: 'Moto 2 - Pedro',
        total: 90,
        createdAt: '2026-11-17T09:00:00.000Z', // > 24h
      }),
    ];

    // Solo archivados (+24h)
    const archivedOnly = filterAdminHistoricalOrders(
      orders,
      { ...DEFAULT_ADMIN_HISTORY_FILTERS, scope: 'archivados_24h' },
      fixedNow
    );
    assert.deepEqual(
      archivedOnly.map((o) => o.id),
      ['1', '3']
    );

    // Búsqueda sin acentos + pago transferencia
    const mariaTransfer = filterAdminHistoricalOrders(
      orders,
      {
        ...DEFAULT_ADMIN_HISTORY_FILTERS,
        search: 'maria lopez',
        paymentMethod: 'transferencia',
      },
      fixedNow
    );
    assert.deepEqual(
      mariaTransfer.map((o) => o.id),
      ['1']
    );

    // Repartidor + tipo envío
    const envioPedro = filterAdminHistoricalOrders(
      orders,
      {
        ...DEFAULT_ADMIN_HISTORY_FILTERS,
        rider: 'Moto 2 - Pedro',
        orderType: 'envio',
      },
      fixedNow
    );
    assert.deepEqual(
      envioPedro.map((o) => o.id),
      ['3']
    );

    // Resumen excluye cancelados de los ingresos
    const summary = computeOrderHistorySummary(orders, fixedNow);
    assert.equal(summary.totalCount, 3);
    assert.equal(summary.deliveredCount, 2);
    assert.equal(summary.cancelledCount, 1);
    assert.equal(summary.archivedCount, 2);
    assert.equal(summary.totalRevenue, 390);
    assert.equal(summary.transferTotal, 300);
    assert.equal(summary.cashTotal, 90);

    // CSV incluye encabezados y folios
    const csv = buildOrdersCsvContent(orders);
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('RD-A1'));
    assert.ok(csv.includes('RD-C3'));
  });
});
