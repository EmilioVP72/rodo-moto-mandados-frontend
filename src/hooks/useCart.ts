import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderItem } from '../types';
import { vibrateLight } from '../utils/haptics';
import {
  StoredUserCart,
  loadUserCart,
  saveUserCart,
  clearUserCartStorage,
  clearLegacySharedCart,
  addItemToCartState,
  removeItemFromCartState,
} from '../utils/cartStorage';

export function useCart(ownerKey: string) {
  const [cartState, setCartState] = useState<StoredUserCart>(() => {
    clearLegacySharedCart();
    return loadUserCart(ownerKey);
  });

  const [cartToastState, setCartToastState] = useState<{
    visible: boolean;
    itemName: string;
  }>({ visible: false, itemName: '' });

  const cartToastTimerRef = useRef<number | null>(null);
  const previousOwnerKeyRef = useRef<string>(ownerKey);

  // Cambiar de carrito de forma 100% aislada cada vez que cambia el usuario autenticado
  useEffect(() => {
    const prevOwner = previousOwnerKeyRef.current;
    if (prevOwner === ownerKey) return;
    previousOwnerKeyRef.current = ownerKey;

    const targetCart = loadUserCart(ownerKey);

    // Si un visitante ('guest') agregó platillos y acaba de iniciar sesión/registrarse,
    // transferimos su canasta temporal a su cuenta SOLO si su cuenta tenía el carrito vacío,
    // y borramos inmediatamente la canasta de invitado para evitar fugas entre usuarios.
    if (prevOwner === 'guest' && ownerKey.startsWith('user_')) {
      const guestCart = loadUserCart('guest');
      if (guestCart.items.length > 0 && targetCart.items.length === 0) {
        saveUserCart(ownerKey, guestCart);
        clearUserCartStorage('guest');
        setCartState(guestCart);
        return;
      }
      clearUserCartStorage('guest');
    }

    // Al cerrar sesión (volver a 'guest'), garantizamos canasta completamente vacía
    if (ownerKey === 'guest') {
      clearUserCartStorage('guest');
      setCartState({ items: [], restaurantId: null });
      return;
    }

    setCartState(targetCart);
  }, [ownerKey]);

  // Persistir únicamente en la clave privada del usuario actual
  useEffect(() => {
    saveUserCart(ownerKey, cartState);
  }, [ownerKey, cartState]);

  const setCart = useCallback(
    (nextItemsOrUpdater: OrderItem[] | ((prev: OrderItem[]) => OrderItem[]), restaurantId?: string | null) => {
      setCartState((prev) => {
        const nextItems =
          typeof nextItemsOrUpdater === 'function'
            ? nextItemsOrUpdater(prev.items)
            : nextItemsOrUpdater;
        const resolvedRestId =
          nextItems.length === 0
            ? null
            : restaurantId !== undefined
            ? restaurantId
            : prev.restaurantId;
        return { items: nextItems, restaurantId: resolvedRestId };
      });
    },
    []
  );

  const clearCart = useCallback(() => {
    setCartState({ items: [], restaurantId: null });
  }, []);

  const handleAddToCart = useCallback((item: OrderItem, restaurantId?: string | null) => {
    vibrateLight();
    setCartState((prev) => addItemToCartState(prev, item, restaurantId));
    setCartToastState({ visible: true, itemName: item.name });
    if (cartToastTimerRef.current) {
      window.clearTimeout(cartToastTimerRef.current);
    }
    cartToastTimerRef.current = window.setTimeout(() => {
      setCartToastState((prev) => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  const handleRemoveFromCart = useCallback((itemId: string) => {
    setCartState((prev) => removeItemFromCartState(prev, itemId));
  }, []);

  return {
    cart: cartState.items,
    cartRestaurantId: cartState.restaurantId,
    setCart,
    clearCart,
    cartToastState,
    setCartToastState,
    handleAddToCart,
    handleRemoveFromCart,
  };
}
