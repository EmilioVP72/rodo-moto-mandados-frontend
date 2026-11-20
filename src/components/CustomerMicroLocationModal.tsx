import React, { useEffect, useState } from 'react';
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
  CheckCircle2,
  Plus,
  LogIn,
  Home,
} from 'lucide-react';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import { reverseGeocodeCoords } from '../services/routing';
import {
  CustomerSavedAddress,
  formatSavedAddressLine,
} from '../utils/customerAddresses';

interface CustomerMicroLocationModalProps {
  isOpen: boolean;
  currentAddress: string;
  initialCoords?: { lat: number; lng: number };
  savedAddresses?: CustomerSavedAddress[];
  selectedAddressId?: string | null;
  isLoggedIn?: boolean;
  onClose: () => void;
  onSelectAddress: (address: string, coords?: { lat: number; lng: number }) => void;
  onSelectSavedAddress?: (address: CustomerSavedAddress) => void;
  onManageAddresses?: () => void;
  onRequireLogin?: () => void;
}

// Zonas de San Miguel de Allende con coordenadas centrales (referencia rápida para mapa)
const SMA_ZONES = [
  { name: 'Centro Histórico', street: 'Centro, San Miguel de Allende', lat: 20.9144, lng: -100.7437 },
  { name: 'San Antonio', street: 'Col. San Antonio, San Miguel de Allende', lat: 20.9085, lng: -100.749 },
  { name: 'La Aurora', street: 'Col. Aurora, San Miguel de Allende', lat: 20.922, lng: -100.7375 },
  { name: 'San Rafael', street: 'Col. San Rafael Insurgentes, San Miguel de Allende', lat: 20.916, lng: -100.755 },
  { name: 'La Lejona / Frailes', street: 'Col. La Lejona, San Miguel de Allende', lat: 20.895, lng: -100.762 },
  { name: 'Independencia', street: 'Col. Independencia, San Miguel de Allende', lat: 20.911, lng: -100.751 },
];

const DEFAULT_SMA_COORDS = { lat: 20.9144, lng: -100.7437 };

export const CustomerMicroLocationModal: React.FC<CustomerMicroLocationModalProps> = ({
  isOpen,
  currentAddress,
  initialCoords,
  savedAddresses = [],
  selectedAddressId = null,
  isLoggedIn = false,
  onClose,
  onSelectAddress,
  onSelectSavedAddress,
  onManageAddresses,
  onRequireLogin,
}) => {
  const [addressText, setAddressText] = useState(currentAddress || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || DEFAULT_SMA_COORDS
  );
  const [microOffsetMeters, setMicroOffsetMeters] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [showCustomMapSection, setShowCustomMapSection] = useState(savedAddresses.length === 0);

  useEffect(() => {
    if (!isOpen) return;
    setAddressText(currentAddress || '');
    setCoords(initialCoords || DEFAULT_SMA_COORDS);
    setMicroOffsetMeters({ x: 0, y: 0 });
    setShowCustomMapSection(savedAddresses.length === 0);
  }, [isOpen, currentAddress, initialCoords?.lat, initialCoords?.lng, savedAddresses.length]);

  if (!isOpen) return null;

  // Mover marcador en micro-ajuste de 10 metros y autollenar calle si existe
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

  const handleSelectZone = (zone: (typeof SMA_ZONES)[0]) => {
    setCoords({ lat: zone.lat, lng: zone.lng });
    setAddressText(zone.street);
    setMicroOffsetMeters({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const trimmed = addressText.trim();
    if (!trimmed) return;
    onSelectAddress(trimmed, coords);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden shadow-2xl flex flex-col border border-gray-200">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white px-4 py-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-[#ed0718] p-2 rounded-xl text-white shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base truncate">
                Dirección de Entrega
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-300 truncate">
                Elige una dirección guardada o fija un punto en San Miguel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Cerrar selector de dirección"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          {/* 1. Direcciones Guardadas del Cliente Autenticado */}
          {isLoggedIn ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-[#ed0718]" />
                  Tus Direcciones Guardadas
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {savedAddresses.length}
                  </span>
                </span>
                {onManageAddresses && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onManageAddresses();
                    }}
                    className="text-[11px] font-extrabold text-[#ed0718] hover:text-[#c90012] bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar / Editar
                  </button>
                )}
              </div>

              {savedAddresses.length > 0 ? (
                <div className="space-y-2">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          onSelectSavedAddress?.(addr);
                          onClose();
                        }}
                        className={`w-full text-left p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-[#ed0718]/50 hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-xs sm:text-sm text-gray-900">
                              {addr.label}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">
                                Principal
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> En uso
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-gray-700 leading-snug">
                            {formatSavedAddressLine(addr)}
                          </p>
                          {addr.referencias && (
                            <p className="text-[11px] text-gray-500 truncate">
                              Ref: {addr.referencias}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 mt-0.5 text-[11px] font-black px-2.5 py-1 rounded-xl ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isSelected ? 'Activa' : 'Elegir'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2.5">
                  <p className="text-xs font-bold text-amber-950">
                    Todavía no has configurado ninguna dirección en tu perfil.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Guarda tu casa, departamento o negocio para que tus pedidos siempre lleguen al lugar correcto.
                  </p>
                  {onManageAddresses && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onManageAddresses();
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Configurar mi dirección en Mi Perfil
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-900">
                  ¿Ya tienes direcciones guardadas?
                </p>
                <p className="text-[11px] text-slate-600">
                  Inicia sesión para seleccionar entre las direcciones de tu perfil o agregar nuevas.
                </p>
              </div>
              {onRequireLogin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequireLogin();
                  }}
                  className="bg-[#101b29] hover:bg-black text-white font-black text-xs px-3.5 py-2 rounded-xl inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión
                </button>
              )}
            </div>
          )}

          {/* 2. Divisor / Desplegable para ubicación temporal en mapa (±30m) */}
          <div className="border-t border-gray-200 pt-3 space-y-3">
            <button
              type="button"
              onClick={() => setShowCustomMapSection((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-extrabold text-gray-800 bg-gray-100 hover:bg-gray-200/80 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#ed0718]" />
                {savedAddresses.length > 0
                  ? '¿Enviar a otra ubicación temporal o ajustar en mapa?'
                  : 'Fijar ubicación manual en el mapa (±30m)'}
              </span>
              <span className="text-[11px] text-gray-500">
                {showCustomMapSection ? 'Ocultar ▲' : 'Mostrar ▼'}
              </span>
            </button>

            {showCustomMapSection && (
              <div className="space-y-4 pt-1">
                {/* Botón rápido GPS */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleUseGps}
                    disabled={isDetectingGps}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>
                      {isDetectingGps ? 'Detectando GPS...' : '📍 Detectar mi GPS en tiempo real'}
                    </span>
                  </button>
                  <span className="text-[11px] text-gray-500 font-medium">
                    San Miguel de Allende
                  </span>
                </div>

                {/* Mapa Real con calles de San Miguel de Allende */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs">
                  <InteractiveMapPicker
                    initialLat={coords.lat}
                    initialLng={coords.lng}
                    localName={addressText || 'Tu Casa / Portón'}
                    heightClass="h-56 sm:h-64"
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
                      className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold p-2 rounded-xl text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="10m al Oeste"
                    >
                      <ArrowLeft className="w-4 h-4" /> 10m
                    </button>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => movePinMeters(0, 10)}
                        className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                        title="10m al Norte"
                      >
                        <ArrowUp className="w-4 h-4" /> 10m N
                      </button>
                      <button
                        type="button"
                        onClick={() => movePinMeters(0, -10)}
                        className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                        title="10m al Sur"
                      >
                        <ArrowDown className="w-4 h-4" /> 10m S
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => movePinMeters(10, 0)}
                      className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold p-2 rounded-xl text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer"
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
                        className="p-2 text-left rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-800 transition truncate cursor-pointer"
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
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm font-semibold focus:border-[#ed0718] outline-none"
                  />
                </div>

                {/* Botón de Confirmación */}
                <button
                  type="button"
                  disabled={!addressText.trim()}
                  onClick={handleConfirm}
                  className="w-full bg-[#ed0718] hover:bg-[#d60615] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Usar Esta Ubicación Temporal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
