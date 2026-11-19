import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCartOwnerKey,
  loadUserCart,
  saveUserCart,
  clearUserCartStorage,
  clearLegacySharedCart,
  addItemToCartState,
  removeItemFromCartState,
  resolveCartRestaurant,
  LEGACY_CART_STORAGE_KEY,
  type StorageLike,
} from '../src/utils/cartStorage.ts';
import { DEFAULT_RESTAURANTS } from '../src/data/seeds.ts';

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

describe('Per-User Cart Isolation & Checkout Restaurant Resolution Unit Tests', () => {
  it('mantiene carritos completamente independientes entre Usuario A, Usuario B y Visitante', () => {
    const store = createMemoryStorage();
    store.setItem(LEGACY_CART_STORAGE_KEY, JSON.stringify([{ id: 'old', name: 'Viejo', price: 10, quantity: 1 }]));
    clearLegacySharedCart(store);
    assert.equal(store.getItem(LEGACY_CART_STORAGE_KEY), null);

    const keyA = resolveCartOwnerKey('cust-A');
    const keyB = resolveCartOwnerKey('cust-B');
    const keyGuest = resolveCartOwnerKey(null);

    assert.equal(keyA, 'user_cust-A');
    assert.equal(keyB, 'user_cust-B');
    assert.equal(keyGuest, 'guest');

    saveUserCart(
      keyA,
      {
        restaurantId: 'tacos-sebas',
        items: [{ id: 'ts-1', name: 'Orden de 4 Tacos de Bistec', price: 100, quantity: 2 }],
      },
      store
    );

    saveUserCart(
      keyB,
      {
        restaurantId: 'little-caesars',
        items: [{ id: 'lc-1', name: 'Pizza Pepperoni', price: 139, quantity: 1 }],
      },
      store
    );

    const loadedA = loadUserCart(keyA, store);
    const loadedB = loadUserCart(keyB, store);
    const loadedGuest = loadUserCart(keyGuest, store);

    assert.equal(loadedA.restaurantId, 'tacos-sebas');
    assert.equal(loadedA.items.length, 1);
    assert.equal(loadedA.items[0].id, 'ts-1');

    assert.equal(loadedB.restaurantId, 'little-caesars');
    assert.equal(loadedB.items.length, 1);
    assert.equal(loadedB.items[0].id, 'lc-1');

    assert.equal(loadedGuest.items.length, 0);
    assert.equal(loadedGuest.restaurantId, null);

    clearUserCartStorage(keyA, store);
    assert.equal(loadUserCart(keyA, store).items.length, 0);
    assert.equal(loadUserCart(keyB, store).items.length, 1);
  });

  it('respeta la regla de restaurante único y limpia restaurantId cuando se vacía el carrito', () => {
    let state = { items: [], restaurantId: null as string | null };

    state = addItemToCartState(
      state,
      { id: 'ts-1', name: 'Tacos de Bistec', price: 100, quantity: 1 },
      'tacos-sebas'
    );
    state = addItemToCartState(
      state,
      { id: 'ts-1', name: 'Tacos de Bistec', price: 100, quantity: 1 },
      'tacos-sebas'
    );
    assert.equal(state.restaurantId, 'tacos-sebas');
    assert.equal(state.items[0].quantity, 2);

    // Agregar de otro restaurante reemplaza el carrito con el nuevo restaurante
    state = addItemToCartState(
      state,
      { id: 'lc-1', name: 'Pizza Pepperoni', price: 139, quantity: 1 },
      'little-caesars'
    );
    assert.equal(state.restaurantId, 'little-caesars');
    assert.equal(state.items.length, 1);
    assert.equal(state.items[0].id, 'lc-1');

    // Quitar último ítem limpia también el restaurantId
    state = removeItemFromCartState(state, 'lc-1');
    assert.equal(state.items.length, 0);
    assert.equal(state.restaurantId, null);
  });

  it('resuelve el restaurante dueño del carrito para permitir "Continuar al Pago y Datos" aunque el modal del restaurante esté cerrado', () => {
    const firstRest = DEFAULT_RESTAURANTS[0];
    const firstItem = firstRest.menu[0];

    const resolvedDirect = resolveCartRestaurant(
      firstRest.id,
      [{ id: firstItem.id, name: firstItem.name, price: firstItem.price, quantity: 1 }],
      DEFAULT_RESTAURANTS
    );
    assert.equal(resolvedDirect?.id, firstRest.id);

    // Fallback por platillo si restaurantId faltara
    const resolvedFallback = resolveCartRestaurant(
      null,
      [{ id: firstItem.id, name: firstItem.name, price: firstItem.price, quantity: 1 }],
      DEFAULT_RESTAURANTS
    );
    assert.equal(resolvedFallback?.id, firstRest.id);
  });
});
