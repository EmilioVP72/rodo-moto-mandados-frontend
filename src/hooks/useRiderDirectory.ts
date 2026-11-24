import { useCallback, useEffect, useRef, useState } from 'react';
import { onSocketEvent } from '../api/socketClient';
import { getRiderAccounts } from '../services/riders';
import type { RiderAccount } from '../types';

export function useRiderDirectory(enabled: boolean) {
  const [riders, setRiders] = useState<RiderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const reload = useCallback(async () => {
    if (!enabled) return;
    const request = ++generation.current;
    setLoading(true);
    try {
      const list = await getRiderAccounts();
      if (request === generation.current) {
        setRiders(list);
        setError('');
      }
    } catch (err) {
      if (request === generation.current) setError(err instanceof Error ? err.message : 'No se pudo cargar la flotilla.');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { setRiders([]); return; }
    void reload();
    const offChange = onSocketEvent('riders:updated', reload);
    const offConnect = onSocketEvent('connect', reload);
    return () => { generation.current++; offChange(); offConnect(); };
  }, [enabled, reload]);

  return { riders, loading, error, reload };
}
