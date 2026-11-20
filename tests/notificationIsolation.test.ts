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
    order: { ...myOrder, status: 'afuera_del_domicilio' },
    prevStatus: 'en_camino',
  });
  assert.ok(outside);
  assert.equal(outside.type, 'urgent');

  const delivered = buildOrderNotificationForViewer({
    viewerRole: 'customer',
    viewerUserId: 'user-a',
    order: { ...myOrder, status: 'entregado' },
    prevStatus: 'afuera_del_domicilio',
  });
  assert.ok(delivered);
  assert.equal(delivered.type, 'success');
});

test('ADMIN recibe notificaciones de nuevos pedidos y actualizaciones de cualquier pedido', () => {
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

  const statusUpdateNotif = buildOrderNotificationForViewer({
    viewerRole: 'admin',
    order: { ...anyOrder, status: 'en_preparacion' },
    prevStatus: 'nuevo',
    isNewOrder: false,
  });
  assert.ok(statusUpdateNotif);
  assert.equal(statusUpdateNotif.audience, 'admin');
  assert.match(statusUpdateNotif.message, /En preparación/i);
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
