import React, { useState, useEffect, useMemo } from 'react';
import { Order, Restaurant } from '../types';
import { FreeOsmMap } from './FreeOsmMap';
import { X, Bike, Clock, MapPin, Phone, Navigation, Store, Radio } from 'lucide-react';
import { useLanguage } from '../utils/i18n';
import { onSocketEvent } from '../api/socketClient';
import {
  calculateHaversineDistance,
  fetchCachedOsrmStreetRoute,
} from '../services/routing';
import { useBackdropClose } from '../utils/modalBackdrop';

const SMA_CENTER = { lat: 20.9144, lng: -100.7437 };

interface LiveTrackingModalProps {
  order: Order | null;
  restaurants: Restaurant[];
  onClose: () => void;
  onOpenTicket?: (order: Order) => void;
}

export const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({
  order,
  restaurants,
  onClose,
  onOpenTicket,
}) => {
  const { t, lang } = useLanguage();
  const backdropHandlers = useBackdropClose(Boolean(order), onClose);
  const [simProgress, setSimProgress] = useState(0.35);
  const [liveRiderCoords, setLiveRiderCoords] = useState<{ lat: number; lng: number } | null>(
    order?.riderLiveCoordinates || null
  );
  const [lastGpsPingAt, setLastGpsPingAt] = useState<string | null>(
    order?.riderLastLocationUpdate || null
  );
  const [streetRoutePoints, setStreetRoutePoints] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    setLiveRiderCoords(order?.riderLiveCoordinates || null);
    setLastGpsPingAt(order?.riderLastLocationUpdate || null);
  }, [order?.id, order?.riderLiveCoordinates, order?.riderLastLocationUpdate]);

  // Escucha en tiempo real vía Socket.IO de los pings GPS enviados por el teléfono del repartidor
  useEffect(() => {
    if (!order?.id) return;
    const unsub = onSocketEvent<{
      orderId: string;
      coordinates: { lat: number; lng: number };
      timestamp: string;
    }>('order:rider-location', (payload) => {
      if (payload?.orderId === order.id && payload.coordinates) {
        setLiveRiderCoords(payload.coordinates);
        setLastGpsPingAt(payload.timestamp || new Date().toISOString());
      }
    });
    return () => unsub();
  }, [order?.id]);

  const originCoords = useMemo(() => {
    if (!order) return SMA_CENTER;
    const matched = restaurants.find(
      (r) =>
        r.id === order.restaurantId ||
        r.name.toLowerCase() === order.restaurantName.toLowerCase()
    );
    return matched?.coordinates || { lat: 20.9165, lng: -100.7412 };
  }, [order, restaurants]);

  const destCoords = useMemo(() => {
    if (!order) return SMA_CENTER;
    return order.coordinates || { lat: 20.9118, lng: -100.7485 };
  }, [order]);

  // Obtener ruta real por calles de San Miguel de Allende desde el proxy OSRM con caché Redis
  useEffect(() => {
    if (!order) return;
    let active = true;
    fetchCachedOsrmStreetRoute(originCoords, destCoords)
      .then((pts) => {
        if (active && pts.length >= 2) {
          setStreetRoutePoints(pts);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [order?.id, originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng]);

  useEffect(() => {
    if (!order || liveRiderCoords) return;
    setSimProgress(0.3);
    const timer = setInterval(() => {
      setSimProgress((prev) => (prev >= 0.88 ? 0.35 : +(prev + 0.04).toFixed(2)));
    }, 2500);
    return () => clearInterval(timer);
  }, [order?.id, liveRiderCoords]);

  if (!order) return null;

  const estimatedRiderCoords = liveRiderCoords || {
    lat: originCoords.lat + (destCoords.lat - originCoords.lat) * simProgress,
    lng: originCoords.lng + (destCoords.lng - originCoords.lng) * simProgress,
  };

  // Calcular tiempo restante real basado en la distancia actual entre la moto y el domicilio
  const remainingDistKm = calculateHaversineDistance(
    estimatedRiderCoords.lat,
    estimatedRiderCoords.lng,
    destCoords.lat,
    destCoords.lng
  );
  const etaMinutes = liveRiderCoords
    ? Math.max(2, Math.round((remainingDistKm / 22) * 60) + 2)
    : order.routeEstimateMinutes || Math.max(4, Math.round((1 - simProgress) * 18));

  const mapMarkers = [
    {
      id: 'origin',
      lat: originCoords.lat,
      lng: originCoords.lng,
      title: order.restaurantName,
      color: '#101b29',
      emoji: '🏪',
      label: 'Local',
    },
    {
      id: 'rider',
      lat: estimatedRiderCoords.lat,
      lng: estimatedRiderCoords.lng,
      title: `Repartidor: ${order.assignedRiderName || 'RODO Moto'}`,
      color: '#ed0718',
      emoji: '🏍️',
      label: 'Moto RODO',
    },
    {
      id: 'dest',
      lat: destCoords.lat,
      lng: destCoords.lng,
      title: 'Tu Domicilio',
      color: '#10b981',
      emoji: '🏠',
      label: 'Entrega',
    },
  ];

  const routePathsToRender =
    streetRoutePoints.length >= 2
      ? streetRoutePoints
      : [originCoords, estimatedRiderCoords, destCoords];

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-800 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#101b29] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ed0718] text-white animate-pulse">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">{t('liveTrackingTitle')}</h3>
              <p className="text-[11px] text-gray-300 font-mono">
                {order.folio} · {order.restaurantName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold">
            <Navigation className="w-4 h-4 text-blue-600 animate-bounce" />
            <span>
              {order.status === 'afuera_del_domicilio'
                ? lang === 'en'
                  ? 'Rider is outside your door!'
                  : '¡El repartidor ya llegó afuera!'
                : lang === 'en'
                ? 'On the way to your location in SMA'
                : 'En ruta hacia tu domicilio en San Miguel'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {liveRiderCoords && (
              <span className="bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                <Radio className="w-3 h-3 animate-ping" /> GPS Live
              </span>
            )}
            <span className="bg-blue-600 text-white font-mono font-black px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{etaMinutes} min
            </span>
          </div>
        </div>

        {/* Interactive OpenStreetMap (100% Free + Redis Cached OSRM Route) */}
        <div className="p-4 space-y-3">
          <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-inner relative z-0">
            <FreeOsmMap
              center={estimatedRiderCoords}
              zoom={15}
              markers={mapMarkers}
              routePaths={routePathsToRender}
              className="w-full h-full"
            />

            <div className="absolute top-2.5 left-12 z-[400] bg-black/80 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-2 backdrop-blur-xs pointer-events-none">
              <span className="inline-flex items-center gap-1">
                <Store className="w-3 h-3 text-gray-300" /> Local
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-red-400">
                <Bike className="w-3 h-3" /> Moto RODO
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <MapPin className="w-3 h-3" /> Entrega ({remainingDistKm} km)
              </span>
            </div>
          </div>

          {/* Rider Info & Actions */}
          <div className="bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 block">
                {lang === 'en' ? 'Assigned Rider' : 'Repartidor Asignado'}
              </span>
              <strong className="text-sm font-black text-gray-900 dark:text-white">
                {order.assignedRiderName || 'Moto RODO San Miguel'}
              </strong>
              <span className="block text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-xs">
                📍 {order.deliveryAddress}
              </span>
              {lastGpsPingAt && (
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  ● Señal GPS actualizada a las {new Date(lastGpsPingAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://wa.me/${(order.assignedRiderPhone || '524151019920').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola, sigo mi pedido RODO Folio ${order.folio}`)}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              {onOpenTicket && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTicket(order);
                  }}
                  className="bg-[#101b29] hover:bg-black text-white font-black text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('viewTicket')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
