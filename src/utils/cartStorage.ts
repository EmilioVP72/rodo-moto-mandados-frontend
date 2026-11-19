import type { OrderItem, Restaurant } from '../types';

export interface StoredUserCart {
  items: OrderItem[];
  restaurantId: string | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LEGACY_CART_STORAGE_KEY = 'rodo_customer_cart';
export const LEGACY_RESTAURANT_STORAGE_KEY = 'rodo_selected_restaurant';
const CART_KEY_PREFIX = 'rodo_cart_v2_';

export function resolveCartOwnerKey(userId?: string | null, isAdmin = false): string {
  if (userId && !userId.startsWith('guest')) {
    return `user_${userId}`;
  }
  if (isAdmin) {
    return 'admin';
  }
  return 'guest';
}

export function getCartStorageKey(ownerKey: string): string {
  return `${CART_KEY_PREFIX}${ownerKey}`;
}

export function clearLegacySharedCart(storage?: StorageLike): void {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) return;
  try {
    store.removeItem(LEGACY_CART_STORAGE_KEY);
    store.removeItem(LEGACY_RESTAURANT_STORAGE_KEY);
  } catch {}
}

export function loadUserCart(ownerKey: string, storage?: StorageLike): StoredUserCart {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) return { items: [], restaurantId: null };
  try {
    const raw = store.getItem(getCartStorageKey(ownerKey));
    if (!raw) return { items: [], restaurantId: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { items: parsed, restaurantId: null };
    }
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const restaurantId =
      items.length > 0 && typeof parsed?.restaurantId === 'string' && parsed.restaurantId.trim()
        ? parsed.restaurantId
        : null;
    return { items, restaurantId };
  } catch {
    return { items: [], restaurantId: null };
  }
}

export function saveUserCart(
  ownerKey: string,
  state: StoredUserCart,
  storage?: StorageLike
): void {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) return;
  try {
    const cleanState: StoredUserCart =
      state.items.length === 0
        ? { items: [], restaurantId: null }
        : { items: state.items, restaurantId: state.restaurantId };
    store.setItem(getCartStorageKey(ownerKey), JSON.stringify(cleanState));
  } catch {}
}

export function clearUserCartStorage(ownerKey: string, storage?: StorageLike): void {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) return;
  try {
    store.removeItem(getCartStorageKey(ownerKey));
  } catch {}
}

export function addItemToCartState(
  prev: StoredUserCart,
  item: OrderItem,
  restaurantId?: string | null
): StoredUserCart {
  const normalizedQty = item.quantity ? Math.max(1, item.quantity) : 1;
  const targetRestaurantId = restaurantId ?? prev.restaurantId;

  // Regla de restaurante único: si agrega platillo de un local distinto, inicia canasta nueva para ese local
  if (restaurantId && prev.restaurantId && prev.restaurantId !== restaurantId) {
    return {
      items: [{ ...item, quantity: normalizedQty }],
      restaurantId,
    };
  }

  const idx = prev.items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    return {
      items: prev.items.map((it, i) =>
        i === idx ? { ...it, quantity: it.quantity + 1 } : it
      ),
      restaurantId: targetRestaurantId,
    };
  }

  return {
    items: [...prev.items, { ...item, quantity: normalizedQty }],
    restaurantId: targetRestaurantId,
  };
}

export function removeItemFromCartState(
  prev: StoredUserCart,
  itemId: string
): StoredUserCart {
  let idx = prev.items.findIndex((i) => i.id === itemId);
  if (idx < 0) {
    idx = prev.items.findIndex((i) => i.id.startsWith(`${itemId}-`));
  }
  if (idx < 0) return prev;

  let nextItems: OrderItem[];
  if (prev.items[idx].quantity > 1) {
    nextItems = prev.items.map((it, i) =>
      i === idx ? { ...it, quantity: it.quantity - 1 } : it
    );
  } else {
    nextItems = prev.items.filter((_, i) => i !== idx);
  }

  return {
    items: nextItems,
    restaurantId: nextItems.length > 0 ? prev.restaurantId : null,
  };
}

export function resolveCartRestaurant(
  cartRestaurantId: string | null,
  items: OrderItem[],
  restaurants: Restaurant[]
): Restaurant | null {
  if (cartRestaurantId) {
    const exact = restaurants.find((r) => r.id === cartRestaurantId);
    if (exact) return exact;
  }

  if (items.length === 0) return null;

  // Fallback seguro por coincidencia de platillo en el menú si falta restaurantId
  for (const item of items) {
    const baseItemId = item.id.split('-')[0];
    const matched = restaurants.find((r) =>
      (r.menu || []).some(
        (m) =>
          m.id === item.id ||
          item.id.startsWith(`${m.id}-`) ||
          m.id === baseItemId ||
          m.name.toLowerCase() === item.name.toLowerCase()
      )
    );
    if (matched) return matched;
  }

  return null;
}
