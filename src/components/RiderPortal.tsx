import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bike, MapPin, RefreshCw, LogOut, Phone, PackageCheck } from 'lucide-react';
import { Order } from '../types';
import { getAssignedRiderOrders, updateAssignedRiderOrder } from '../services/riders';
import { getAuthToken } from '../api/httpClient';
import { identifySocketSession, emitSocketEvent } from '../api/socketClient';
import { getNextRiderStatus, RIDER_STATUS_ACTION } from '../utils/riderWorkflow';

import { paymentInstructionForRider } from '../services/whatsappDispatch';

interface RiderPortalProps {
  riderName: string;
  onLogout: () => void | Promise<void>;
}

export const RiderPortal: React.FC<RiderPortalProps> = ({ riderName, onLogout }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refreshOrders = useCallback(async () => {
    setError('');
    try {
      setOrders(await getAssignedRiderOrders());
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar tus pedidos asignados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshOrders(), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshOrders]);

  useEffect(() => {
    if (!trackingOrderId) return;
    if (!navigator.geolocation) {
      setError('Este dispositivo no tiene acceso al GPS.');
      setTrackingOrderId(null);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        identifySocketSession(getAuthToken());
        emitSocketEvent('rider:location', {
          orderId: trackingOrderId,
          lat: coords.latitude,
          lng: coords.longitude,
        });
      },
      () => {
        setTrackingOrderId(null);
        setError('No fue posible obtener tu ubicación. Revisa el permiso de GPS.');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [trackingOrderId]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !['entregado', 'cancelado', 'cancelado_con_deuda'].includes(order.status)),
    [orders]
  );

  useEffect(() => {
    if (trackingOrderId && !activeOrders.some((order) => order.id === trackingOrderId)) {
      setTrackingOrderId(null);
    }
  }, [activeOrders, trackingOrderId]);

  const handleAdvance = async (order: Order) => {
    const next = getNextRiderStatus(order.status);
    if (!next) return;
    setBusyOrderId(order.id);
    setError('');
    try {
      await updateAssignedRiderOrder(order.id, next);
      if (next === 'entregado') setTrackingOrderId((current) => current === order.id ? null : current);
      await refreshOrders();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el pedido.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <main className="min-h-dvh bg-slate-950 text-white p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between rounded-2xl bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-600 p-2"><Bike className="h-6 w-6" /></div>
            <div><p className="text-xs text-slate-400">RODO · REPARTIDOR</p><h1 className="font-bold">Hola, {riderName}</h1></div>
          </div>
          <button onClick={() => void onLogout()} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </header>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Mis pedidos asignados ({activeOrders.length})</h2>
          <button onClick={() => void refreshOrders()} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm" aria-label="Actualizar pedidos">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-3 text-sm text-red-200">{error}</p>}
        {loading && <p className="text-slate-400">Cargando pedidos...</p>}
        {!loading && activeOrders.length === 0 && <p className="rounded-2xl bg-slate-900 p-6 text-center text-slate-300">No tienes pedidos activos asignados.</p>}

        <section className="space-y-4">
          {activeOrders.map((order) => (
            <article key={order.id} className="rounded-2xl bg-white p-4 text-slate-900 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold text-red-600">FOLIO {order.folio}</p><h3 className="text-lg font-black">{order.restaurantName}</h3></div>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                <p><b>Cliente:</b> {order.customerName}</p>
                <a className="flex items-center gap-2 text-blue-700 underline" href={`tel:${order.customerPhone}`}><Phone className="h-4 w-4" /> {order.customerPhone}</a>
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span>{order.status === 'asignado' ? (order.pickupAddress || order.restaurantName) : order.deliveryAddress}</span></p>
                {order.coordinates && (
                  <a className="inline-flex items-center gap-1 font-semibold text-blue-700 underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${order.coordinates.lat},${order.coordinates.lng}`}>
                    <MapPin className="h-4 w-4" /> Abrir destino en el mapa
                  </a>
                )}
                <p className="text-slate-600">{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</p>
                <p className="font-bold">{paymentInstructionForRider(order)}</p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={() => setTrackingOrderId((current) => current === order.id ? null : order.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${trackingOrderId === order.id ? 'bg-slate-200 text-slate-800' : 'bg-blue-700 text-white'}`}
                >
                  <MapPin className="h-4 w-4" /> {trackingOrderId === order.id ? 'Detener GPS' : 'Compartir ubicación'}
                </button>
                <button
                  disabled={!getNextRiderStatus(order.status) || busyOrderId === order.id}
                  onClick={() => void handleAdvance(order)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <PackageCheck className="h-4 w-4" /> {busyOrderId === order.id ? 'Guardando...' : RIDER_STATUS_ACTION[order.status] || 'Sin acciones'}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};
