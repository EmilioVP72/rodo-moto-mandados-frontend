import React, { useState, useEffect } from 'react';
import { useBackdropClose } from '../utils/modalBackdrop';
import { Order, Restaurant } from '../types';
import { FreeOsmMap } from './FreeOsmMap';
import {
  X,
  Navigation,
  ExternalLink,
  Store,
  Home,
  Loader2,
  Route,
} from 'lucide-react';
import { computeOrderRoute } from '../services/routing';

interface AdminGoogleMapsDirectionsModalProps {
  order: Order;
  restaurant?: Restaurant | null;
  onClose: () => void;
}

export const AdminGoogleMapsDirectionsModal: React.FC<AdminGoogleMapsDirectionsModalProps> = ({
  order,
  restaurant,
  onClose,
}) => {
  const restLat = restaurant?.coordinates?.lat || 20.9144;
  const restLng = restaurant?.coordinates?.lng || -100.7437;
  const originCoord = { lat: restLat, lng: restLng };
  const destCoords = order.coordinates || { lat: 20.9185, lng: -100.748 };

  const destAddress = order.deliveryAddress?.trim()
    ? `${order.deliveryAddress}, San Miguel de Allende, GTO`
    : 'Centro, San Miguel de Allende, GTO';

  const [routeInfo, setRouteInfo] = useState<{
    distanceText: string;
    distanceKm: number;
    durationText: string;
    durationMinutes: number;
    summary: string;
    steps: string[];
    originAddress: string;
    destinationAddress: string;
    polyline: { lat: number; lng: number }[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Calcular ruta real en calles 100% GRATIS con OSRM (OpenStreetMap Routing Machine) + fallback local
  useEffect(() => {
    let active = true;
    const fallbackRoute = computeOrderRoute(
      originCoord,
      destCoords,
      order.restaurantName,
      destAddress
    );

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${restLng},${restLat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson&steps=true`;

    fetch(osrmUrl)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const route = data?.routes?.[0];
        if (route) {
          const coords: { lat: number; lng: number }[] = (route.geometry?.coordinates || []).map(
            (c: [number, number]) => ({ lat: c[1], lng: c[0] })
          );
          const distKm = Number(((route.distance || 3000) / 1000).toFixed(1));
          const durMin = Math.max(3, Math.round((route.duration || 600) / 60));
          const leg = route.legs?.[0];
          const rawSteps: string[] = (leg?.steps || [])
            .map((s: any) => {
              const streetName = s.name ? ` por ${s.name}` : '';
              const distMeters = s.distance ? ` (${Math.round(s.distance)} m)` : '';
              const type = s.maneuver?.type || 'Avanza';
              if (type === 'depart') return `Salir desde ${order.restaurantName}${streetName}${distMeters}`;
              if (type === 'arrive') return `Llegar a destino en ${order.deliveryAddress}`;
              return `Continuar${streetName}${distMeters}`;
            })
            .filter(Boolean);

          setRouteInfo({
            distanceText: `${distKm} km`,
            distanceKm: distKm,
            durationText: `${durMin} min`,
            durationMinutes: durMin,
            summary: leg?.summary || fallbackRoute.routeSummary,
            steps: rawSteps.length > 0 ? rawSteps : [
              `Salida desde ${order.restaurantName}`,
              `Ruta óptima por vialidades de San Miguel hacia ${order.deliveryAddress}`,
              `Llegada y entrega en puerta`,
            ],
            originAddress: `${order.restaurantName} (San Miguel de Allende)`,
            destinationAddress: order.deliveryAddress,
            polyline: coords.length >= 2 ? coords : [originCoord, destCoords],
          });
        } else {
          setRouteInfo({
            distanceText: `${fallbackRoute.distanceKm} km`,
            distanceKm: fallbackRoute.distanceKm,
            durationText: `${fallbackRoute.estimatedMinutes} min`,
            durationMinutes: fallbackRoute.estimatedMinutes,
            summary: fallbackRoute.routeSummary,
            steps: [
              `Salida desde ${order.restaurantName}`,
              `Incorporación por vía principal hacia ${order.deliveryAddress}`,
              `Llegada y entrega en puerta de cliente`,
            ],
            originAddress: `${order.restaurantName} (San Miguel de Allende)`,
            destinationAddress: order.deliveryAddress,
            polyline: [originCoord, destCoords],
          });
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setRouteInfo({
          distanceText: `${fallbackRoute.distanceKm} km`,
          distanceKm: fallbackRoute.distanceKm,
          durationText: `${fallbackRoute.estimatedMinutes} min`,
          durationMinutes: fallbackRoute.estimatedMinutes,
          summary: fallbackRoute.routeSummary,
          steps: [
            `Salida desde ${order.restaurantName}`,
            `Incorporación por vía principal hacia ${order.deliveryAddress}`,
            `Llegada y entrega en puerta de cliente`,
          ],
          originAddress: `${order.restaurantName} (San Miguel de Allende)`,
          destinationAddress: order.deliveryAddress,
          polyline: [originCoord, destCoords],
        });
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [order.id, restLat, restLng, destCoords.lat, destCoords.lng, order.restaurantName, destAddress, order.deliveryAddress]);

  // Enlace externo gratuito para abrir la navegación en el teléfono del repartidor (sin API key ni cobro)
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    `${restLat},${restLng}`
  )}&destination=${encodeURIComponent(`${destCoords.lat},${destCoords.lng}`)}&travelmode=driving`;

  const handleShareRouteViaWhatsApp = () => {
    const text = `🏍️ *RODO MOTO MANDADOS · RUTA EFICIENTE GPS*
━━━━━━━━━━━━━━━━━━
📌 *FOLIO:* ${order.folio}
👤 *Cliente:* ${order.customerName} (${order.customerPhone || 'S/N'})

🏪 *RECOGER EN:* ${order.restaurantName}
📍 *ENTREGAR EN:* ${order.deliveryAddress}

🗺️ *DISTANCIA:* ${routeInfo?.distanceText || `${order.distanceKm || 3} km`}
⏱️ *TIEMPO MOTO:* ~${routeInfo?.durationText || '12 min'}
🚗 *VÍA SUGERIDA:* ${routeInfo?.summary || 'Ruta óptima San Miguel'}

🌐 *ABRIR NAVEGACIÓN GPS:*
${googleMapsNavUrl}

_Despacho Central RODO Moto Mandados_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const markers = [
    {
      id: 'origin',
      lat: originCoord.lat,
      lng: originCoord.lng,
      title: order.restaurantName,
      color: '#ed0718',
      emoji: '🏪',
      label: 'Recoger',
    },
    {
      id: 'dest',
      lat: destCoords.lat,
      lng: destCoords.lng,
      title: order.customerName,
      color: '#10b981',
      emoji: '🏠',
      label: 'Entregar',
    },
  ];

  const backdropHandlers = useBackdropClose(true, onClose);

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto border border-gray-200 flex flex-col max-h-[92vh]">
        {/* Cabecera del Modal */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#ed0718] p-2.5 rounded-2xl text-white shadow-md">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded font-black border border-red-500/30">
                  {order.folio}
                </span>
                <span className="text-xs text-gray-400">
                  Ruta Eficiente Gratuita (OpenStreetMap + OSRM)
                </span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate max-w-md">
                {order.restaurantName} ➔ {order.customerName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel de Métricas de Ruta */}
        <div className="bg-slate-50 p-3 sm:p-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-gray-500 block text-[10px] font-bold uppercase">Distancia Total</span>
            <span className="text-base font-black text-gray-900 font-mono">
              {routeInfo?.distanceText || 'Calculando...'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-gray-500 block text-[10px] font-bold uppercase">Tiempo en Moto</span>
            <span className="text-base font-black text-emerald-700 font-mono">
              ~{routeInfo?.durationText || '12 min'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-gray-500 block text-[10px] font-bold uppercase">Tarifa de Envío</span>
            <span className="text-base font-black text-[#ed0718] font-mono">
              ${order.deliveryFee.toFixed(2)} MXN
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-gray-500 block text-[10px] font-bold uppercase">Ruta Sugerida</span>
            <span className="text-xs font-extrabold text-gray-800 truncate block" title={routeInfo?.summary}>
              {routeInfo?.summary || 'Vía Principal SMA'}
            </span>
          </div>
        </div>

        {/* Cuerpo del Modal: Mapa OpenStreetMap y Lista de Pasos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="w-full h-72 sm:h-96 rounded-2xl overflow-hidden border border-gray-300 shadow-sm relative z-0">
            <FreeOsmMap
              center={originCoord}
              zoom={14}
              markers={markers}
              routePaths={routeInfo?.polyline || [originCoord, destCoords]}
              fitBoundsToMarkers={true}
              className="w-full h-full"
            />

            {isLoading && (
              <div className="absolute inset-0 z-[400] bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-[#ed0718] animate-spin" />
                <span className="text-xs font-bold text-gray-800">
                  Calculando ruta más rápida en San Miguel...
                </span>
              </div>
            )}
          </div>

          {/* Puntos de Origen y Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-red-50/60 border border-red-200 p-3 rounded-2xl flex items-start gap-2.5">
              <div className="p-2 bg-[#ed0718] text-white rounded-xl shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-red-700 tracking-wider block">
                  Punto de Recolección (Restaurante)
                </span>
                <span className="font-extrabold text-gray-900 block truncate">
                  {order.restaurantName}
                </span>
                <span className="text-gray-600 text-[11px] block truncate">
                  {routeInfo?.originAddress || 'San Miguel de Allende, GTO'}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-2xl flex items-start gap-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
                <Home className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                  Punto de Entrega (Cliente)
                </span>
                <span className="font-extrabold text-gray-900 block truncate">
                  {order.customerName} ({order.customerPhone || 'S/N'})
                </span>
                <span className="text-gray-600 text-[11px] block truncate">
                  {order.deliveryAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Indicaciones Paso a Paso */}
          {routeInfo?.steps && routeInfo.steps.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl space-y-2">
              <span className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#ed0718]" />
                <span>Indicaciones de Navegación Vial ({routeInfo.steps.length} pasos)</span>
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {routeInfo.steps.map((st, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-gray-700">
                    <span className="font-mono font-black text-gray-400 shrink-0 w-4">
                      {idx + 1}.
                    </span>
                    <span className="leading-snug">{st}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barra de Acciones del Pie */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <a
            href={googleMapsNavUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-2xs transition"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span>Abrir Navegación GPS en Teléfono</span>
          </a>

          <button
            type="button"
            onClick={handleShareRouteViaWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            <span>📲</span>
            <span>Compartir Ruta GPS a Repartidor por WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
