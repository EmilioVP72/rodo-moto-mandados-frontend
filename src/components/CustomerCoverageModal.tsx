import React, { useState } from 'react';
import { useBackdropClose } from '../utils/modalBackdrop';
import {
  X,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  ShieldCheck,
  Bike,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';
import { InteractiveMapPicker, DEFAULT_SAN_MIGUEL } from './InteractiveMapPicker';
import { DEFAULT_SMA_PERIMETER } from './AdminCoverageMap';
import { DispatchSettings, Restaurant } from '../types';

interface CustomerCoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  initialCoords?: { lat: number; lng: number };
  settings: DispatchSettings;
  restaurants?: Restaurant[];
  onSelectRestaurant?: (restaurant: Restaurant) => void;
  onConfirmLocation: (address: string, coords: { lat: number; lng: number }) => void;
}

export const CustomerCoverageModal: React.FC<CustomerCoverageModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  initialCoords = DEFAULT_SAN_MIGUEL,
  settings,
  restaurants = [],
  onSelectRestaurant,
  onConfirmLocation,
}) => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>(initialCoords);
  const [selectedAddress, setSelectedAddress] = useState<string>(currentAddress || 'San Miguel de Allende, Gto.');
  const backdropHandlers = useBackdropClose(isOpen, onClose);

  if (!isOpen) return null;

  // Cálculo de distancia al Centro de San Miguel de Allende (Parroquia: 20.9144, -100.7437)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  const distFromCenter = calculateDistanceKm(
    selectedCoords.lat,
    selectedCoords.lng,
    DEFAULT_SAN_MIGUEL.lat,
    DEFAULT_SAN_MIGUEL.lng
  );

  // Clasificación de cobertura
  const isCoreCoverage = distFromCenter <= 5.5;
  const isExtendedCoverage = distFromCenter > 5.5 && distFromCenter <= 10.0;
  const isOutsideCoverage = distFromCenter > 10.0;

  const handleConfirm = () => {
    onConfirmLocation(selectedAddress, selectedCoords);
    onClose();
  };

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto font-sans"
    >
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
        {/* Cabecera del Modal */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ed0718] rounded-2xl text-white shadow-md">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-xl text-white">
                Mapa Real de Cobertura en San Miguel de Allende
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">
                Explora todas las calles y selecciona tu ubicación exacta para pedidos y entregas RODO
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
          {/* Tarjeta Informativa de Cobertura en Vivo */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isCoreCoverage
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : isExtendedCoverage
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black">
                    {isCoreCoverage && '🟢 ¡Estás dentro de la Cobertura Principal de RODO!'}
                    {isExtendedCoverage && '🟡 Zona de Cobertura Extendida (Periferia)'}
                    {isOutsideCoverage && '🔴 Zona Fuera de Perímetro Habitual'}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white/80 px-2 py-0.5 rounded-md border border-black/10">
                    A {distFromCenter} km del Jardín Principal
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-snug">
                  {isCoreCoverage &&
                    'Cuentas con tarifa base normal de entrega ($30 a $40 MXN según el local) y asignación inmediata de moto (~15 a 25 min).'}
                  {isExtendedCoverage &&
                    'Tu ubicación está en la periferia de San Miguel. La moto acude con normalidad con tarifa adicional por distancia (+ $10/km excedente).'}
                  {isOutsideCoverage &&
                    'Tu ubicación sobrepasa los 10 km del centro. Puedes solicitar un motomandado especial confirmando con la central vía WhatsApp oficial.'}
                </p>
              </div>

              <div className="shrink-0 p-2 rounded-xl bg-white/80 shadow-2xs">
                <Bike className="w-6 h-6 text-[#ed0718]" />
              </div>
            </div>
          </div>

          {/* El Mapa Real de Google Maps con todas las calles */}
          <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#ed0718]" />
                Límite de Cobertura (Raya perimetral de San Miguel de Allende)
              </span>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                ✓ De la orilla hacia adentro
              </span>
            </div>

            <InteractiveMapPicker
              initialLat={selectedCoords.lat}
              initialLng={selectedCoords.lng}
              localName={selectedAddress}
              heightClass="h-96 sm:h-[420px]"
              coveragePolygon={settings.coveragePolygon && settings.coveragePolygon.length > 0 ? settings.coveragePolygon : DEFAULT_SMA_PERIMETER}
              onLocationSelect={(loc) => {
                setSelectedCoords({ lat: loc.lat, lng: loc.lng });
                if (loc.address) {
                  setSelectedAddress(loc.address);
                }
              }}
            />
          </div>

          {/* Locales y Restaurantes Activos con Selección Directa al Menú */}
          {restaurants && restaurants.filter((r) => r.isActive).length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900 block">
                    🍽️ Restaurantes y Puestos Activos en tu Zona
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Toca cualquier establecimiento para abrir su menú completo y ordenar directamente
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold bg-red-50 text-[#ed0718] px-2 py-0.5 rounded-lg border border-red-200">
                  {restaurants.filter((r) => r.isActive).length} locales
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {restaurants
                  .filter((r) => r.isActive)
                  .map((rest) => (
                    <div
                      key={rest.id}
                      className="p-2.5 rounded-2xl bg-gray-50 hover:bg-red-50/50 border border-gray-200 hover:border-red-300 transition flex items-center justify-between gap-2.5 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={rest.image}
                          alt={rest.name}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-200"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-gray-900 group-hover:text-[#ed0718] transition truncate">
                            {rest.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <span>⭐ {rest.rating}</span>
                            <span>•</span>
                            <span>🛵 ${rest.deliveryFee} MXN</span>
                            <span>•</span>
                            <span>⏱️ {rest.time}</span>
                          </div>
                        </div>
                      </div>

                      {onSelectRestaurant && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectRestaurant(rest);
                            onClose();
                          }}
                          className="shrink-0 bg-[#ed0718] hover:bg-[#c90012] text-white text-[11px] font-black px-2.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                        >
                          Ver Menú →
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Zonas y Colonias Activas */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-700 block">
              Zonas Principales con Repartidores de Base en San Miguel:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { name: 'Centro Histórico & El Chorro', status: '🟢 Activo 100%' },
                { name: 'Colonia San Antonio', status: '🟢 Activo 100%' },
                { name: 'Fábrica La Aurora & Guadalupe', status: '🟢 Activo 100%' },
                { name: 'San Luis Rey & Independencia', status: '🟢 Activo 100%' },
                { name: 'San Rafael & Olimpo', status: '🟢 Activo 100%' },
                { name: 'Valle del Maíz & Querétaro', status: '🟢 Activo 100%' },
                { name: 'Club de Golf Malanquín', status: '🟢 Activo 100%' },
                { name: 'Santa Cruz de la Paz / Alamedas', status: '🟢 Activo 100%' },
                { name: 'Los Frailes & Presa Allende', status: '🟢 Activo 100%' },
              ].map((z) => (
                <div key={z.name} className="p-2 rounded-xl bg-gray-50 border border-gray-200">
                  <strong className="block text-gray-900 truncate">{z.name}</strong>
                  <span className="text-[10px] text-emerald-700 font-bold">{z.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pie del Modal con Botón de Confirmación */}
        <div className="p-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-600 truncate max-w-md text-center sm:text-left">
            <span className="font-bold text-gray-900 block truncate">
              📍 {selectedAddress}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              Coordenadas: {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar esta Ubicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
