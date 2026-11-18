import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FreeOsmMap } from './FreeOsmMap';
import {
  ExternalLink,
  Crosshair,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  ALL_SAN_MIGUEL_COLONIAS,
  parseSmaAddress,
  SmaNeighborhood,
} from '../services/sanMiguelLocations';

export const DEFAULT_SAN_MIGUEL = {
  lat: 20.9144,
  lng: -100.7437,
};

export interface LocationSelectResult {
  lat: number;
  lng: number;
  mapsUrl: string;
  address?: string;
  street?: string;
  streetNumber?: string;
  neighborhood?: string;
}

export interface InteractiveMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialMapsUrl?: string;
  localName?: string;
  onLocationSelect: (location: LocationSelectResult) => void;
  heightClass?: string;
  coveragePolygon?: { lat: number; lng: number }[];
  isDrawingPolygon?: boolean;
  onPolygonPointAdd?: (point: { lat: number; lng: number }) => void;
}

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  initialLat = DEFAULT_SAN_MIGUEL.lat,
  initialLng = DEFAULT_SAN_MIGUEL.lng,
  localName = 'Tu Ubicación',
  onLocationSelect,
  heightClass = 'h-80 sm:h-96',
  coveragePolygon,
  isDrawingPolygon = false,
  onPolygonPointAdd,
}) => {
  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [targetCenter, setTargetCenter] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  const [resolvedAddress, setResolvedAddress] = useState<string>('San Miguel de Allende, Gto.');
  const [detectedStreet, setDetectedStreet] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');

  // Filtro de búsqueda rápida entre todas las colonias de San Miguel
  const [coloniaSearch, setColoniaSearch] = useState<string>('');

  // Reverse geocoding 100% gratuito usando OpenStreetMap Nominatim + catálogo local SMA
  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      setIsGeocoding(true);
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
        .then((res) => res.json())
        .then((data) => {
          setIsGeocoding(false);
          const road = data.address?.road || data.address?.pedestrian || '';
          const house = data.address?.house_number ? `#${data.address.house_number}` : '';
          const sub = data.address?.suburb || data.address?.neighbourhood || '';
          const parsed = parseSmaAddress(data.display_name || '', lat, lng);

          const finalStreet = road || parsed.street;
          const finalColonia = sub || parsed.neighborhood;

          const detectedFullAddress = finalStreet
            ? `Calle ${finalStreet}${house ? ' ' + house : ''}, Col. ${finalColonia || 'Centro'}, San Miguel de Allende`
            : '';

          setResolvedAddress(detectedFullAddress || 'Ubicación sin nombre de calle');
          setDetectedStreet(finalStreet);

          onLocationSelect({
            lat,
            lng,
            mapsUrl,
            address: detectedFullAddress,
            street: finalStreet,
            streetNumber: house,
            neighborhood: finalColonia,
          });
        })
        .catch(() => {
          setIsGeocoding(false);
          setResolvedAddress('Ubicación sin nombre de calle');
          setDetectedStreet('');

          onLocationSelect({
            lat,
            lng,
            mapsUrl,
            address: '',
            street: '',
            streetNumber: '',
            neighborhood: '',
          });
        });
    },
    [onLocationSelect]
  );

  useEffect(() => {
    if (initialLat && initialLng) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setTargetCenter({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (isDrawingPolygon && onPolygonPointAdd) {
        onPolygonPointAdd({ lat, lng });
        return;
      }

      setCurrentLat(lat);
      setCurrentLng(lng);
      setTargetCenter({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [isDrawingPolygon, onPolygonPointAdd, reverseGeocode]
  );

  const handleMarkerDragEnd = useCallback(
    (lat: number, lng: number) => {
      setCurrentLat(lat);
      setCurrentLng(lng);
      setTargetCenter({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  const mapMarkers = useMemo(
    () => [
      {
        id: 'selected-pin',
        lat: currentLat,
        lng: currentLng,
        title: localName,
        color: '#ed0718',
        emoji: '📍',
        draggable: true,
        onDragEnd: handleMarkerDragEnd,
      },
    ],
    [currentLat, currentLng, localName, handleMarkerDragEnd]
  );

  // Obtener ubicación GPS real del cliente
  const handleGetLiveLocation = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Tu dispositivo no soporta geolocalización.');
      return;
    }

    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setCurrentLat(lat);
        setCurrentLng(lng);
        setTargetCenter({ lat, lng });
        reverseGeocode(lat, lng);
        setIsGettingGps(false);
      },
      () => {
        setIsGettingGps(false);
        setGpsError('No se pudo obtener el GPS. Verifica los permisos de ubicación de tu navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Seleccionar colonia de la lista de San Miguel
  const handleSelectColonia = (colonia: SmaNeighborhood) => {
    setCurrentLat(colonia.lat);
    setCurrentLng(colonia.lng);
    setTargetCenter({ lat: colonia.lat, lng: colonia.lng });
    reverseGeocode(colonia.lat, colonia.lng);
  };

  const filteredColonias = ALL_SAN_MIGUEL_COLONIAS.filter((c) =>
    c.name.toLowerCase().includes(coloniaSearch.toLowerCase().trim())
  );

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Barra de Acciones Superiores: GPS y Vista */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 dark:bg-[#0d0f14] p-2.5 rounded-2xl border border-gray-200 dark:border-red-950/40">
        <button
          type="button"
          onClick={handleGetLiveLocation}
          disabled={isGettingGps}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-black bg-[#ed0718] hover:bg-[#c90012] active:scale-95 text-white px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          {isGettingGps ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Localizando GPS...</span>
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4" />
              <span>📍 Mi GPS en San Miguel</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          {/* Alternar mapa calles / satélite */}
          <button
            type="button"
            onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap')}
            className="flex items-center gap-1 text-[11px] font-bold bg-white dark:bg-[#151821] hover:bg-gray-100 dark:hover:bg-[#1d222e] border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 px-2.5 py-2 rounded-xl transition cursor-pointer"
            title="Cambiar entre vista de calles o satélite"
          >
            <Layers className="w-3.5 h-3.5 text-[#ed0718]" />
            <span className="hidden sm:inline">{mapTypeId === 'roadmap' ? 'Satélite' : 'Calles'}</span>
          </button>

          {/* Enlace gratuito a Google Maps Externo */}
          <a
            href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold bg-white dark:bg-[#151821] hover:bg-gray-100 dark:hover:bg-[#1d222e] border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 px-2.5 py-2 rounded-xl transition cursor-pointer"
            title="Abrir en app externa de mapas"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abrir Mapa</span>
          </a>
        </div>
      </div>

      {gpsError && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Contenedor del Mapa 100% Gratuito OpenStreetMap + Leaflet */}
      <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-red-950/60 shadow-md z-0`}>
        <FreeOsmMap
          center={targetCenter}
          zoom={15}
          markers={mapMarkers}
          polygonPaths={coveragePolygon}
          polylinePaths={coveragePolygon}
          mapType={mapTypeId}
          onMapClick={handleMapClick}
          className="w-full h-full"
        />

        {/* Instrucción flotante semitransparente */}
        <div className="absolute top-2.5 left-12 right-2.5 sm:right-auto z-[400] bg-black/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-2 pointer-events-none shadow-md border border-red-900/30">
          <span className="text-[#ed0718] animate-ping">●</span>
          <span>Toca cualquier calle o arrastra el pin: se autocompleta la dirección</span>
        </div>
      </div>

      {/* Tarjeta de Dirección Resuelta y Coordenadas */}
      <div className="bg-white dark:bg-[#0d0f14] p-3.5 rounded-2xl border border-gray-200 dark:border-red-950/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase font-black tracking-wider text-gray-500 dark:text-gray-400 block">
            Punto seleccionado en San Miguel:
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isGeocoding ? (
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ed0718]" /> Detectando calle y colonia...
              </span>
            ) : (
              <strong className="text-gray-900 dark:text-white font-extrabold truncate block text-xs sm:text-sm">
                {resolvedAddress}
              </strong>
            )}
          </div>
          {detectedStreet ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
              ✓ Calle detectada: <u>{detectedStreet}</u> (Se escribirá en automático)
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 block mt-0.5">
              Calle no especificada en el punto (podrás ingresarla manualmente).
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 block mt-0.5">
            Lat: {currentLat.toFixed(5)} · Lng: {currentLng.toFixed(5)}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 text-[#ed0718] dark:text-red-400 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 font-black text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#ed0718]" />
          <span>Fijado</span>
        </div>
      </div>

      {/* Catálogo de Todas las Colonias de San Miguel de Allende con Buscador */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#ed0718]" />
            Colonias de San Miguel de Allende ({ALL_SAN_MIGUEL_COLONIAS.length} en catálogo):
          </label>
          <span className="text-[10px] text-gray-400">Clic para centrar</span>
        </div>

        {/* Buscador de colonia */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={coloniaSearch}
            onChange={(e) => setColoniaSearch(e.target.value)}
            placeholder="Buscar colonia (ej. San Antonio, Aurora, Malanquín, Frailes, Olimpo...)"
            className="w-full bg-gray-50 dark:bg-[#12151c] border border-gray-200 dark:border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-800 dark:text-white outline-none focus:border-[#ed0718]"
          />
        </div>

        {/* Chips de colonias con scroll */}
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-gray-50 dark:bg-[#0c0e14] rounded-xl border border-gray-200 dark:border-neutral-800">
          {filteredColonias.map((col) => {
            const isNear =
              Math.abs(currentLat - col.lat) < 0.003 && Math.abs(currentLng - col.lng) < 0.003;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => handleSelectColonia(col)}
                className={`text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                  isNear
                    ? 'bg-[#ed0718] text-white border-[#ed0718] shadow-xs'
                    : 'bg-white dark:bg-[#151821] hover:bg-gray-100 dark:hover:bg-[#1f2430] text-gray-800 dark:text-gray-200 border-gray-300 dark:border-neutral-700'
                }`}
                title={`Zona: ${col.zone} · Cobertura ${col.coverage}`}
              >
                <span>📍</span>
                <span>{col.name}</span>
                {col.coverage === 'extendida' && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 rounded">
                    Periferia
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
