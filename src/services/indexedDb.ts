import { Restaurant, Order, BroadcastNotification } from '../types';

const DB_NAME = 'rodo_offline_db';
const DB_VERSION = 1;
const STORE_RESTAURANTS = 'restaurants';
const STORE_ORDERS = 'orders';
const STORE_BROADCASTS = 'broadcasts';

let dbPromise: Promise<IDBDatabase> | null = null;

function openOfflineDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_RESTAURANTS)) {
          database.createObjectStore(STORE_RESTAURANTS, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(STORE_ORDERS)) {
          database.createObjectStore(STORE_ORDERS, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(STORE_BROADCASTS)) {
          database.createObjectStore(STORE_BROADCASTS, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });

  return dbPromise;
}

export async function syncRestaurantsToIDB(restaurants: Restaurant[]): Promise<void> {
  try {
    const database = await openOfflineDb();
    const tx = database.transaction(STORE_RESTAURANTS, 'readwrite');
    const store = tx.objectStore(STORE_RESTAURANTS);
    restaurants.forEach((r) => store.put(r));
  } catch {
    // Graceful no-op in restricted browser contexts
  }
}

export async function getRestaurantsFromIDB(): Promise<Restaurant[]> {
  try {
    const database = await openOfflineDb();
    return await new Promise((resolve) => {
      const tx = database.transaction(STORE_RESTAURANTS, 'readonly');
      const store = tx.objectStore(STORE_RESTAURANTS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Restaurant[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function syncOrdersToIDB(orders: Order[]): Promise<void> {
  try {
    const database = await openOfflineDb();
    const tx = database.transaction(STORE_ORDERS, 'readwrite');
    const store = tx.objectStore(STORE_ORDERS);
    store.clear();
    orders.forEach((o) => store.put(o));
  } catch {}
}

export async function clearOrdersFromIDB(): Promise<void> {
  try {
    const database = await openOfflineDb();
    const tx = database.transaction(STORE_ORDERS, 'readwrite');
    tx.objectStore(STORE_ORDERS).clear();
  } catch {}
}

export async function upsertOrderToIDB(order: Order): Promise<void> {
  try {
    const database = await openOfflineDb();
    const tx = database.transaction(STORE_ORDERS, 'readwrite');
    tx.objectStore(STORE_ORDERS).put(order);
  } catch {}
}

export async function getOrdersFromIDB(): Promise<Order[]> {
  try {
    const database = await openOfflineDb();
    return await new Promise((resolve) => {
      const tx = database.transaction(STORE_ORDERS, 'readonly');
      const store = tx.objectStore(STORE_ORDERS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as Order[]) || [];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveBroadcastToIDB(notif: BroadcastNotification): Promise<void> {
  try {
    const database = await openOfflineDb();
    const tx = database.transaction(STORE_BROADCASTS, 'readwrite');
    tx.objectStore(STORE_BROADCASTS).put(notif);
  } catch {}
}

export async function getBroadcastsFromIDB(): Promise<BroadcastNotification[]> {
  try {
    const database = await openOfflineDb();
    return await new Promise((resolve) => {
      const tx = database.transaction(STORE_BROADCASTS, 'readonly');
      const store = tx.objectStore(STORE_BROADCASTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as BroadcastNotification[]) || [];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
