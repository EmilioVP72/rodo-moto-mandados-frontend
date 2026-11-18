import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderItem } from '../types';
import { vibrateLight } from '../utils/haptics';

const CART_STORAGE_KEY = 'rodo_customer_cart';

export function useCart() {
  const [cart, setCart] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartToastState, setCartToastState] = useState<{
    visible: boolean;
    itemName: string;
  }>({ visible: false, itemName: '' });

  const cartToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const handleAddToCart = useCallback((item: OrderItem) => {
    vibrateLight();
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        return prev.map((it, i) =>
          i === idx ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [...prev, { ...item, quantity: item.quantity ? Math.max(1, item.quantity) : 1 }];
    });
    setCartToastState({ visible: true, itemName: item.name });
    if (cartToastTimerRef.current) {
      window.clearTimeout(cartToastTimerRef.current);
    }
    cartToastTimerRef.current = window.setTimeout(() => {
      setCartToastState((prev) => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  const handleRemoveFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      let idx = prev.findIndex((i) => i.id === itemId);
      if (idx < 0) {
        idx = prev.findIndex((i) => i.id.startsWith(`${itemId}-`));
      }
      if (idx >= 0) {
        if (prev[idx].quantity > 1) {
          return prev.map((it, i) =>
            i === idx ? { ...it, quantity: it.quantity - 1 } : it
          );
        }
        return prev.filter((_, i) => i !== idx);
      }
      return prev;
    });
  }, []);

  return {
    cart,
    setCart,
    cartToastState,
    setCartToastState,
    handleAddToCart,
    handleRemoveFromCart,
  };
}
