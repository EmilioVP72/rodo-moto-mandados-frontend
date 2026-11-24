import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveNotificationScopeKey,
  buildOrderNotificationForViewer,
  addNotificationToHistory,
  getNotificationHistory,
  markAllNotificationsAsRead,
  clearNotificationHistory,
} from '../src/services/notifications.ts';
import type { StorageLike } from '../src/services/notifications.ts';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test('resolveNotificationScopeKey separa completamente admin, cada cliente e invitado', () => {
  const adminKey = resolveNotificationScopeKey({ isAdmin: true, userId: 'user-a' });
  const userAKey = resolveNotificationScopeKey({ isAdmin: false, userId: 'user-a' });
  const userBKey = resolveNotificationScopeKey({ isAdmin: false, userId: 'user-b' });
  const guestKey = resolveNotificationScopeKey({ isAdmin: false, userId: null });

  assert.notEqual(adminKey, userAKey);
  assert.notEqual(userAKey, userBKey);
  assert.notEqual(userAKey, guestKey);
  assert.equal(
    resolveNotificationScopeKey({ isAdmin: false, userId: 'guest-999' }),
    guestKey
  );
});

test('CLIENTE nunca recibe notificaciones de pedidos ajenos ni alertas administrativas', () => {
  const otherCustomerOrder = {
    id: 'ord-99',
    folio: 'RD-261120-OTHER',
    customerId: 'user-b',
    customerName: 'Cliente B',
    restaurantName: 'Tacos Sebastián',
    status: 'en_camino',
    total: 250,
  };

  // Pedido nuevo de otro cliente -> bloqueado para Cliente A
  assert.equal(
    buildOrderNotificationForViewer({
      viewerRole: 'customer',
      viewerUserId: 'user-a',
      order: otherCustomerOrder,
      isNewOrder: true,
    }),
    null
  );

  // Cambio de estado de pedido de otro cliente -> bloqueado para Cliente A
  assert.equal(
    buildOrderNotificationForViewer({
      viewerRole: 'customer',
      viewerUserId: 'user-a',
      order: otherCustomerOrder,
      prevStatus: 'asignado',
      isNewOrder: false,
    }),
    null
  );

  // Visitante tampoco recibe ninguna notificación de pedidos
  assert.equal(
    buildOrderNotificationForViewer({
      viewerRole: 'guest',
      order: otherCustomerOrder,
      prevStatus: 'asignado',
      isNewOrder: false,
    }),
    null
  );
});

test('CLIENTE solo recibe notificaciones de cambios de estado de SUS PROPIOS pedidos', () => {
  const myOrder = {
    id: 'ord-100',
    folio: 'RD-261120-MINE',
    customerId: 'user-a',
    customerName: 'Cliente A',
    restaurantName: 'Burger & Ribs San Miguel',
    status: 'en_camino',
    total: 320,
  };

  const onTheWay = buildOrderNotificationForViewer({
    viewerRole: 'customer',
    viewerUserId: 'user-a',
    order: myOrder,
    prevStatus: 'asignado',
  });
  assert.ok(onTheWay);
  assert.equal(onTheWay.audience, 'customer');
  assert.equal(onTheWay.folio, 'RD-261120-MINE');
  assert.match(onTheWay.title, /en Camino/i);

  const outside = buildOrderNotificationForViewer({
    viewerRole: 'customer',
    viewerUserId: 'user-a',
    order: { ...myOrder, status: 'afuera_del_domicilio', arrivalNotifiedAt: '2026-11-24T12:00:00.000Z' },
    prevStatus: 'en_camino',
  });
  assert.ok(outside);
  assert.equal(outside.type, 'urgent');

  const outsideResent = buildOrderNotificationForViewer({
    viewerRole: 'customer',
    viewerUserId: 'user-a',
    order: { ...myOrder, status: 'afuera_del_domicilio', arrivalNotifiedAt: '2026-11-24T12:03:00.000Z' },
    prevStatus: 'afuera_del_domicilio',
    lastNotifiedArrivalAt: '2026-11-24T12:00:00.000Z',
  });
  assert.ok(outsideResent);
  assert.equal(outsideResent.type, 'urgent');

  const delivered = buildOrderNotificationForViewer({
    viewerRole: 'customer',
    viewerUserId: 'user-a',
    order: { ...myOrder, status: 'entregado' },
    prevStatus: 'afuera_del_domicilio',
  });
  assert.ok(delivered);
  assert.equal(delivered.type, 'success');
});

test('ADMIN recibe notificaciones únicamente de nuevos pedidos y pedidos entregados', () => {
  const anyOrder = {
    id: 'ord-200',
    folio: 'RD-261120-ADM',
    customerId: 'user-z',
    customerName: 'Sofía Morales',
    restaurantName: 'La Pizzería',
    status: 'nuevo',
    total: 410,
  };

  const newOrderNotif = buildOrderNotificationForViewer({
    viewerRole: 'admin',
    order: anyOrder,
    isNewOrder: true,
  });
  assert.ok(newOrderNotif);
  assert.equal(newOrderNotif.audience, 'admin');
  assert.equal(newOrderNotif.type, 'urgent');
  assert.match(newOrderNotif.title, /Nuevo Pedido/i);

  // Estados intermedios no deben notificar al administrador
  for (const intermediate of ['en_preparacion', 'asignado', 'recolectado', 'en_camino', 'afuera_del_domicilio', 'cancelado']) {
    assert.equal(
      buildOrderNotificationForViewer({
        viewerRole: 'admin',
        order: { ...anyOrder, status: intermediate },
        prevStatus: 'nuevo',
        isNewOrder: false,
      }),
      null
    );
  }

  // Pedido entregado sí notifica al administrador
  const deliveredNotif = buildOrderNotificationForViewer({
    viewerRole: 'admin',
    order: { ...anyOrder, status: 'entregado' },
    prevStatus: 'afuera_del_domicilio',
    isNewOrder: false,
  });
  assert.ok(deliveredNotif);
  assert.equal(deliveredNotif.audience, 'admin');
  assert.equal(deliveredNotif.type, 'success');
  assert.match(deliveredNotif.title, /Pedido entregado/i);
});

test('avisa al titular por cada versión de la cotización aunque el pedido conserve el mismo estado', () => {
  const order = { id: 'order-1', folio: 'RD-185', customerId: 'cliente', total: 185,
    status: 'pendiente_cotizacion', quoteOfferedAt: '2026-11-24T12:00:00.000Z' };
  const viewer = { viewerRole: 'customer' as const, viewerUserId: 'cliente', order, prevStatus: order.status };
  const notice = buildOrderNotificationForViewer(viewer);
  assert.equal(notice?.quoteOfferedAt, order.quoteOfferedAt);
  assert.match(notice!.message, /185\.00 MXN/);
  assert.equal(notice?.folio, order.folio);
  assert.equal(buildOrderNotificationForViewer({ ...viewer, lastNotifiedQuote: order.quoteOfferedAt }), null);
  assert.ok(buildOrderNotificationForViewer({ ...viewer, lastNotifiedQuote: '2026-11-24T11:59:00.000Z' }));
  assert.equal(buildOrderNotificationForViewer({ ...viewer, viewerUserId: 'otro' }), null);
  assert.equal(buildOrderNotificationForViewer({ ...viewer, order: { ...order, quoteOfferedAt: undefined } }), null);
});

test('El historial de notificaciones en localStorage está aislado entre Admin y cada Cliente', () => {
  const storage = createMemoryStorage();
  const adminKey = resolveNotificationScopeKey({ isAdmin: true });
  const customerAKey = resolveNotificationScopeKey({ isAdmin: false, userId: 'user-a' });
  const customerBKey = resolveNotificationScopeKey({ isAdmin: false, userId: 'user-b' });

  addNotificationToHistory(
    {
      title: 'Nuevo Pedido #RD-1',
      message: 'Alerta exclusiva de despacho admin',
      audience: 'admin',
      type: 'urgent',
    },
    adminKey,
    storage
  );
  addNotificationToHistory(
    {
      title: 'Tu pedido va en camino',
      message: 'Solo visible para Cliente A',
      audience: 'customer',
      type: 'info',
    },
    customerAKey,
    storage
  );

  assert.equal(getNotificationHistory(adminKey, storage).length, 1);
  assert.equal(getNotificationHistory(customerAKey, storage).length, 1);
  assert.equal(getNotificationHistory(customerBKey, storage).length, 0);
  assert.equal(getNotificationHistory(customerAKey, storage)[0].audience, 'customer');

  markAllNotificationsAsRead(customerAKey, storage);
  assert.equal(getNotificationHistory(customerAKey, storage)[0].read, true);
  assert.equal(getNotificationHistory(adminKey, storage)[0].read, false);

  clearNotificationHistory(adminKey, storage);
  assert.equal(getNotificationHistory(adminKey, storage).length, 0);
  assert.equal(getNotificationHistory(customerAKey, storage).length, 1);
});
