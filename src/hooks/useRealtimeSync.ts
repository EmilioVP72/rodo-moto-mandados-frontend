import React, { useEffect } from 'react';
import { Restaurant, DispatchSettings } from '../types';
import { onSocketEvent } from '../api/socketClient';
import { sanitizeRestaurantForCustomer } from '../services/db';

interface UseRealtimeSyncParams {
  setRestaurants: React.Dispatch<React.SetStateAction<Restaurant[]>>;
  setSettings: React.Dispatch<React.SetStateAction<DispatchSettings>>;
}

/**
 * Sincroniza en vivo (vía Socket.IO) cambios de catálogo, apertura/cierre de restaurantes,
 * tarifas y pausa por lluvia hacia todas las sesiones conectadas sin recargar la página.
 */
export function useRealtimeSync({ setRestaurants, setSettings }: UseRealtimeSyncParams): void {
  useEffect(() => {
    const unsubRestUpdated = onSocketEvent<Restaurant>('restaurants:updated', (updatedRest) => {
      if (!updatedRest?.id) return;
      const sanitized = sanitizeRestaurantForCustomer(updatedRest);
      setRestaurants((prev) => {
        const exists = prev.some((r) => r.id === sanitized.id);
        if (exists) {
          return prev.map((r) => (r.id === sanitized.id ? { ...r, ...sanitized } : r));
        }
        return [sanitized, ...prev];
      });
    });

    const unsubRestDeleted = onSocketEvent<{ id: string }>('restaurants:deleted', (payload) => {
      if (!payload?.id) return;
      setRestaurants((prev) => prev.filter((r) => r.id !== payload.id));
    });

    const unsubSettingsUpdated = onSocketEvent<Partial<DispatchSettings>>(
      'settings:updated',
      (updatedSettings) => {
        if (!updatedSettings || typeof updatedSettings !== 'object') return;
        setSettings((prev) => ({
          ...prev,
          ...updatedSettings,
        }));
      }
    );

    return () => {
      unsubRestUpdated();
      unsubRestDeleted();
      unsubSettingsUpdated();
    };
  }, [setRestaurants, setSettings]);
}
