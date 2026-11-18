import React, { useState } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Search,
} from 'lucide-react';
import { InteractiveMapPicker } from './InteractiveMapPicker';

import { reverseGeocodeCoords } from '../services/routing';

interface CustomerMicroLocationModalProps {
  isOpen: boolean;
  currentAddress: string;
  onClose: () => void;
  onSelectAddress: (address: string, coords?: { lat: number; lng: number }) => void;
}

// Zonas de San Miguel de Allende con coordenadas centrales
const SMA_ZONES = [
  { name: 'Centro Histórico', street: 'Calle Correo #18, Centro', lat: 20.9144, lng: -100.7437 },
  { name: 'San Antonio', street: 'Calle Ancha de San Antonio #42', lat: 20.9085, lng: -100.7490 },
  { name: 'La Aurora', street: 'Calzada de la Aurora #15', lat: 20.9220, lng: -100.7375 },
  { name: 'San Rafael', street: 'Avenida Ignacio Ramírez #88', lat: 20.9160, lng: -100.7550 },
  { name: 'La Lejona / Frailes', street: 'Boulevard de la Conspiración #120', lat: 20.8950, lng: -100.7620 },
  { name: 'Independencia', street: 'Calzada de la Estación #50', lat: 20.9110, lng: -100.7510 },
];

export const CustomerMicroLocationModal: React.FC<CustomerMicroLocationModalProps> = ({
  isOpen,
  currentAddress,
  onClose,
  onSelectAddress,
}) => {
  if (!isOpen) return null;

  const [addressText, setAddressText] = useState(currentAddress || 'Calle Ancha de San Antonio #24, Col. San Antonio');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 20.9144, lng: -100.7437 });
  const [microOffsetMeters, setMicroOffsetMeters] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Mover marcador en micro-ajuste de 5 a 10 metros y autollenar calle si existe
  const movePinMeters = async (dxMeters: number, dyMeters: number) => {
    const deltaLat = dyMeters / 111000;
    const deltaLng = dxMeters / 103000;
    const newCoords = {
      lat: Number((coords.lat + deltaLat).toFixed(6)),
      lng: Number((coords.lng + deltaLng).toFixed(6)),
    };
    setCoords(newCoords);
    setMicroOffsetMeters((prev) => ({
      x: prev.x + dxMeters,
      y: prev.y + dyMeters,
    }));

    try {
      const geo = await reverseGeocodeCoords(newCoords.lat, newCoords.lng);
      if (geo.hasStreetName && geo.addressLabel) {
        setAddressText(geo.addressLabel);
      }
    } catch {
      // Si no aparece el nombre de la calle, no se sobreescribe
    }
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        setAddressText(`Ubicación GPS Exacta (${lat}, ${lng}) - San Miguel de Allende`);
      },
      () => {
        setIsDetectingGps(false);
        alert('No pudimos acceder a tu GPS. Por favor selecciona tu zona o ingresa tu calle.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectZone = (zone: typeof SMA_ZONES[0]) => {
    setCoords({ lat: zone.lat, lng: zone.lng });
    setAddressText(zone.street);
    setMicroOffsetMeters({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    onSelectAddress(addressText.trim(), coords);
    onClose();
  };

  // Coordenadas calculadas en porcentaje del mapa SVG interactivo
  // Lat SMA: 20.89 a 20.93; Lng SMA: -100.77 a -100.72
  const mapPercentX = Math.min(90, Math.max(10, ((coords.lng - (-100.77)) / 0.05) * 100));
  const mapPercentY = Math.min(90, Math.max(10, (1 - (coords.lat - 20.89) / 0.04) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto border border-gray-200">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#ed0718] p-2 rounded-xl text-white">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                Micro-Ubicación de Entrega
              </h3>
              <p className="text-xs text-gray-400">
                Ajuste fino de precisión (±30m) para tu portón o casa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Botón rápido GPS */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleUseGps}
              disabled={isDetectingGps}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Navigation className="w-4 h-4" />
              <span>{isDetectingGps ? 'Detectando GPS...' : '📍 Detectar mi GPS en tiempo real'}</span>
            </button>
            <span className="text-[11px] text-gray-500 font-medium">San Miguel de Allende</span>
          </div>

          {/* Mapa Real de Google Maps con todas las calles de San Miguel de Allende */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs">
            <InteractiveMapPicker
              initialLat={coords.lat}
              initialLng={coords.lng}
              localName={addressText || 'Tu Casa / Portón'}
              heightClass="h-64 sm:h-72"
              onLocationSelect={(loc) => {
                setCoords({ lat: loc.lat, lng: loc.lng });
                if (loc.address) {
                  setAddressText(loc.address);
                }
              }}
            />
          </div>

          {/* Control de Micro-Ajuste (±30 Metros) */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-amber-950">
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-600" />
                Ajuste Fino de Casa (Mover ±30 metros)
              </span>
              <span className="text-[11px] font-mono text-amber-800">
                Offset: {microOffsetMeters.x > 0 ? `+${microOffsetMeters.x}m E` : `${microOffsetMeters.x}m O`},{' '}
                {microOffsetMeters.y > 0 ? `+${microOffsetMeters.y}m N` : `${microOffsetMeters.y}m S`}
              </span>
            </div>
            <p className="text-[11px] text-amber-800">
              Usa las flechas para mover el pin exactamente hasta tu zaguán o puerta:
            </p>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => movePinMeters(-10, 0)}
                className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold p-2 rounded-xl text-xs flex items-center gap-1 transition shadow-2xs"
                title="10m al Oeste"
              >
                <ArrowLeft className="w-4 h-4" /> 10m
              </button>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => movePinMeters(0, 10)}
                  className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 transition shadow-2xs"
                  title="10m al Norte"
                >
                  <ArrowUp className="w-4 h-4" /> 10m N
                </button>
                <button
                  type="button"
                  onClick={() => movePinMeters(0, -10)}
                  className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 transition shadow-2xs"
                  title="10m al Sur"
                >
                  <ArrowDown className="w-4 h-4" /> 10m S
                </button>
              </div>
              <button
                type="button"
                onClick={() => movePinMeters(10, 0)}
                className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold p-2 rounded-xl text-xs flex items-center gap-1 transition shadow-2xs"
                title="10m al Este"
              >
                10m <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Accesos rápidos por zona de San Miguel */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Zonas populares de San Miguel:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {SMA_ZONES.map((z) => (
                <button
                  key={z.name}
                  type="button"
                  onClick={() => handleSelectZone(z)}
                  className="p-2 text-left rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-800 transition truncate"
                >
                  📍 {z.name}
                </button>
              ))}
            </div>
          </div>

          {/* Entrada de texto de la dirección */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Dirección escrita (Calle, número exterior/interior y colonia):
            </label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="Ej. Calle Ancha de San Antonio #24, Col. San Antonio"
              className="w-full border border-gray-300 rounded-xl p-3 text-xs sm:text-sm font-semibold focus:border-[#ed0718] outline-none"
            />
          </div>

          {/* Botón de Confirmación */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full bg-[#ed0718] hover:bg-[#d60615] text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Fijar Esta Ubicación para Mis Pedidos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
