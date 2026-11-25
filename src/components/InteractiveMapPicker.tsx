import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FreeOsmMap } from './FreeOsmMap';
import {
  ExternalLink,
  Crosshair,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  X,
} from 'lucide-react';
import {
  ALL_SAN_MIGUEL_COLONIAS,
  parseSmaAddress,
  SmaNeighborhood,
} from '../services/sanMiguelLocations';
import {
  AddressSearchSuggestion,
  normalizeSearchText,
  parseCoordinatesOrMapsUrl,
  reverseGeocodeDetailed,
  searchSmaAddresses,
} from '../services/routing';

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
  /** True cuando el pin se movió automáticamente al escribir en campos externos */
  preserveAddressFields?: boolean;
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
  /** Dirección externa (ej. Calle + Número + Colonia) para ubicar automáticamente en el mapa */
  searchQuery?: string;
  /** Si es true y existe searchQuery al montar, busca esa dirección inmediatamente */
  autoLocateOnMount?: boolean;
  /** Placeholder del buscador principal */
  searchPlaceholder?: string;
}

function matchLocalColonias(query: string, limit: number = 4): AddressSearchSuggestion[] {
  const norm = normalizeSearchText(query);
  if (norm.length < 2) return [];

  const tokens = norm.split(' ').filter((t) => t.length >= 2);
  const scored: { col: SmaNeighborhood; score: number }[] = [];

  for (const col of ALL_SAN_MIGUEL_COLONIAS) {
    const colNorm = normalizeSearchText(col.name);
    if (colNorm === norm) {
      scored.push({ col, score: 100 });
    } else if (colNorm.startsWith(norm)) {
      scored.push({ col, score: 80 });
    } else if (colNorm.includes(norm) || norm.includes(colNorm)) {
      scored.push({ col, score: 60 });
    } else if (tokens.length > 0 && tokens.some((tok) => colNorm.includes(tok))) {
      scored.push({ col, score: 35 });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ col }) => ({
      id: `col-${col.id}`,
      label: `Col. ${col.name}`,
      subtitle: `${col.zone} · San Miguel de Allende`,
      street: '',
      streetNumber: '',
      neighborhood: col.name,
      lat: col.lat,
      lng: col.lng,
      source: 'colonia',
    }));
}

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  initialLat = DEFAULT_SAN_MIGUEL.lat,
  initialLng = DEFAULT_SAN_MIGUEL.lng,
  localName = 'Ubicación',
  onLocationSelect,
  heightClass = 'h-72 sm:h-80',
  coveragePolygon,
  isDrawingPolygon = false,
  onPolygonPointAdd,
  searchQuery,
  autoLocateOnMount = false,
  searchPlaceholder = 'Buscar calle, colonia o pegar enlace de Google Maps...',
}) => {
  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [targetCenter, setTargetCenter] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [mapZoom, setMapZoom] = useState<number>(15);

  const [resolvedAddress, setResolvedAddress] = useState<string>('San Miguel de Allende, Gto.');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');

  // Buscador unificado de direcciones / lugares / colonias / links de Maps
  const [searchInput, setSearchInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AddressSearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [searchNotice, setSearchNotice] = useState<string>('');

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const suppressExternalUntilRef = useRef<number>(0);
  const lastExternalQueryRef = useRef<string>(
    autoLocateOnMount ? '' : normalizeSearchText(searchQuery || '')
  );

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Cerrar dropdown de sugerencias al hacer clic fuera
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Geocodificación inversa vía proxy backend (caché Redis) + catálogo SMA
  const reverseGeocode = useCallback((lat: number, lng: number) => {
    setIsGeocoding(true);
    setSearchNotice('');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    suppressExternalUntilRef.current = Date.now() + 1400;

    reverseGeocodeDetailed(lat, lng)
      .then((data) => {
        setIsGeocoding(false);
        const parsed = parseSmaAddress(data?.displayName || '', lat, lng);
        const finalStreet = data?.street || parsed.street;
        const finalNumber = data?.streetNumber || parsed.streetNumber || '';
        const finalColonia = data?.neighborhood || parsed.neighborhood;

        const detectedFullAddress = finalStreet
          ? `${finalStreet}${finalNumber ? ' ' + finalNumber : ''}${finalColonia ? ', Col. ' + finalColonia : ''}`
          : finalColonia
            ? `Col. ${finalColonia}, San Miguel de Allende`
            : 'Punto fijado en el mapa';

        setResolvedAddress(detectedFullAddress);

        onLocationSelectRef.current({
          lat,
          lng,
          mapsUrl,
          address: detectedFullAddress,
          street: finalStreet,
          streetNumber: finalNumber,
          neighborhood: finalColonia,
          preserveAddressFields: false,
        });
      })
      .catch(() => {
        setIsGeocoding(false);
        setResolvedAddress('Punto fijado en el mapa');
        onLocationSelectRef.current({
          lat,
          lng,
          mapsUrl,
          address: '',
          street: '',
          streetNumber: '',
          neighborhood: '',
          preserveAddressFields: false,
        });
      });
  }, []);

  useEffect(() => {
    if (initialLat && initialLng) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setTargetCenter({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng]);

  const applySuggestion = useCallback(
    (item: AddressSearchSuggestion, fromExternalSync: boolean = false) => {
      const lat = Number(item.lat.toFixed(5));
      const lng = Number(item.lng.toFixed(5));
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

      setCurrentLat(lat);
      setCurrentLng(lng);
      setTargetCenter({ lat, lng });
      setMapZoom(item.source === 'colonia' ? 15 : 16);
      setShowDropdown(false);
      setSearchNotice('');

      if (!fromExternalSync) {
        suppressExternalUntilRef.current = Date.now() + 1400;
        setSearchInput(item.label);
      }

      // Si pegó link o coordenadas directas, detectamos automáticamente calle y colonia
      if (item.source === 'coords') {
        reverseGeocode(lat, lng);
        return;
      }

      const displayAddr = item.street
        ? `${item.street}${item.streetNumber ? ' ' + item.streetNumber : ''}${
            item.neighborhood ? ', Col. ' + item.neighborhood : ''
          }`
        : item.label;

      setResolvedAddress(displayAddr);

      onLocationSelectRef.current({
        lat,
        lng,
        mapsUrl,
        address: displayAddr,
        street: item.street,
        streetNumber: item.streetNumber,
        neighborhood: item.neighborhood,
        preserveAddressFields: fromExternalSync,
      });
    },
    [reverseGeocode]
  );

  // Combina resultados de OSM/Backend con colonias locales de SMA
  const buildMergedSuggestions = useCallback(
    async (query: string, signal?: AbortSignal): Promise<AddressSearchSuggestion[]> => {
      const trimmed = query.trim();
      if (trimmed.length < 2) return [];

      const coords = parseCoordinatesOrMapsUrl(trimmed);
      if (coords) {
        return [
          {
            id: `coords-${coords.lat}-${coords.lng}`,
            label: `Ir a coordenadas (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
            subtitle: 'Enlace de mapa detectado',
            street: '',
            streetNumber: '',
            neighborhood: '',
            lat: coords.lat,
            lng: coords.lng,
            source: 'coords',
          },
        ];
      }

      const localMatches = matchLocalColonias(trimmed, 3);
      const remoteMatches = await searchSmaAddresses(trimmed, signal);

      const merged: AddressSearchSuggestion[] = [...remoteMatches];
      for (const local of localMatches) {
        const duplicate = merged.some(
          (m) =>
            normalizeSearchText(m.label) === normalizeSearchText(local.label) ||
            (Math.abs(m.lat - local.lat) < 0.0012 && Math.abs(m.lng - local.lng) < 0.0012)
        );
        if (!duplicate) {
          merged.push(local);
        }
      }
      return merged.slice(0, 6);
    },
    []
  );

  // Autocompletado en vivo mientras el usuario escribe en el buscador del mapa
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchNotice('');
      try {
        const results = await buildMergedSuggestions(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(results);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput, buildMergedSuggestions]);

  // Sincronización automática cuando el usuario escribe en campos externos (Calle / Número / Colonia)
  useEffect(() => {
    if (typeof searchQuery !== 'string') return;
    const cleaned = searchQuery.trim();
    const norm = normalizeSearchText(cleaned);

    if (!norm || norm.length < 3) {
      lastExternalQueryRef.current = norm;
      return;
    }

    if (Date.now() < suppressExternalUntilRef.current) {
      lastExternalQueryRef.current = norm;
      return;
    }

    if (norm === lastExternalQueryRef.current) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (Date.now() < suppressExternalUntilRef.current) return;
      lastExternalQueryRef.current = norm;
      setIsSearching(true);
      setSearchNotice('');

      try {
        const results = await buildMergedSuggestions(cleaned, controller.signal);
        if (controller.signal.aborted) return;

        if (results.length > 0) {
          applySuggestion(results[0], true);
        } else {
          setSearchNotice('No encontramos esa calle exacta; toca el mapa para ajustar el pin.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 750);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, buildMergedSuggestions, applySuggestion]);

  const handleManualSearch = async () => {
    const queryToUse = searchInput.trim() || (searchQuery || '').trim();
    if (queryToUse.length < 2) {
      setSearchNotice('Escribe una calle, colonia o pega un enlace de Google Maps.');
      return;
    }

    setIsSearching(true);
    setSearchNotice('');
    try {
      const results = await buildMergedSuggestions(queryToUse);
      setSuggestions(results);
      if (results.length > 0) {
        applySuggestion(results[0], !searchInput.trim() && Boolean(searchQuery?.trim()));
      } else {
        setShowDropdown(false);
        setSearchNotice('No encontramos esa dirección. Intenta con otra calle o toca el mapa.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (isDrawingPolygon && onPolygonPointAdd) {
        onPolygonPointAdd({ lat, lng });
        return;
      }

      setCurrentLat(lat);
      setCurrentLng(lng);
      setTargetCenter({ lat, lng });
      setMapZoom((z) => Math.max(z, 16));
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

  const handleGetLiveLocation = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización.');
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
        setMapZoom(16);
        reverseGeocode(lat, lng);
        setIsGettingGps(false);
      },
      () => {
        setIsGettingGps(false);
        setGpsError('No se pudo obtener tu GPS. Revisa los permisos de ubicación.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div className="w-full space-y-2.5 font-sans">
      {/* Buscador unificado de dirección + controles compactos */}
      <div ref={searchContainerRef} className="relative space-y-2">
        <div className="flex items-stretch gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowDropdown(true);
                setSearchNotice('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleManualSearch();
                } else if (e.key === 'Escape') {
                  setShowDropdown(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-white dark:bg-[#12151c] border border-gray-300 dark:border-neutral-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-[#ed0718] focus:ring-2 focus:ring-[#ed0718]/15 transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSuggestions([]);
                  setSearchNotice('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleManualSearch}
            disabled={isSearching}
            className="shrink-0 bg-[#101b29] hover:bg-black text-white text-xs font-bold px-3.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </div>

        {/* Lista desplegable de sugerencias */}
        {showDropdown && (suggestions.length > 0 || isSearching) && (
          <div className="absolute left-0 right-0 top-[42px] z-[600] bg-white dark:bg-[#151821] border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
            {isSearching && suggestions.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ed0718]" />
                <span>Buscando en San Miguel de Allende...</span>
              </div>
            ) : (
              suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(item, false)}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 border-b last:border-b-0 border-gray-100 dark:border-neutral-800 flex items-start gap-2.5 transition cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#ed0718] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-gray-900 dark:text-white truncate">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {item.subtitle}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Barra compacta de utilidades: Mi GPS, Satélite y Maps */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={handleGetLiveLocation}
            disabled={isGettingGps}
            className="flex items-center gap-1.5 text-[11px] font-bold bg-[#ed0718] hover:bg-[#c90012] active:scale-95 text-white px-3 py-1.5 rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            {isGettingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5" />
            )}
            <span>{isGettingGps ? 'Ubicando...' : 'Mi GPS'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap')}
              className="flex items-center gap-1 text-[11px] font-semibold bg-white dark:bg-[#151821] hover:bg-gray-100 dark:hover:bg-[#1d222e] border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              title="Cambiar entre vista de calles o satélite"
            >
              <Layers className="w-3.5 h-3.5 text-[#ed0718]" />
              <span>{mapTypeId === 'roadmap' ? 'Satélite' : 'Calles'}</span>
            </button>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold bg-white dark:bg-[#151821] hover:bg-gray-100 dark:hover:bg-[#1d222e] border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              title="Abrir en Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Maps</span>
            </a>
          </div>
        </div>
      </div>

      {(gpsError || searchNotice) && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{gpsError || searchNotice}</span>
        </div>
      )}

      {/* Mapa interactivo */}
      <div
        className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-gray-300 dark:border-red-950/60 shadow-xs z-0`}
      >
        <FreeOsmMap
          center={targetCenter}
          zoom={mapZoom}
          markers={mapMarkers}
          polygonPaths={coveragePolygon}
          polylinePaths={coveragePolygon}
          mapType={mapTypeId}
          onMapClick={handleMapClick}
          className="w-full h-full"
        />

        <div className="absolute bottom-2 left-2 z-[400] bg-black/75 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold pointer-events-none">
          Toca el mapa o arrastra el pin para ajustar
        </div>
      </div>

      {/* Resumen compacto del punto fijado */}
      <div className="bg-white dark:bg-[#0d0f14] px-3 py-2 rounded-xl border border-gray-200 dark:border-red-950/40 flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          {isGeocoding || isSearching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ed0718] shrink-0" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-[#ed0718] shrink-0" />
          )}
          <span className="truncate font-semibold text-gray-800 dark:text-gray-100">
            {isGeocoding
              ? 'Detectando dirección...'
              : isSearching
                ? 'Buscando en el mapa...'
                : resolvedAddress}
          </span>
        </div>

        <span className="shrink-0 inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 font-bold text-[11px]">
          <CheckCircle2 className="w-3 h-3" />
          Listo
        </span>
      </div>
    </div>
  );
};
