/**
 * Servicio Centralizado de Rutas, Distancias y Geocodificación para RODO Moto Mandados
 * Especializado en la topografía, calles empedradas y zonas de San Miguel de Allende, GTO.
 */

// Coordenadas de referencia del Centro de San Miguel de Allende
export const SMA_CENTER_COORDS = {
  lat: 20.9144,
  lng: -100.7437,
};

// Factor de corrección de distancia real en moto (calles empedradas, sentidos únicos y curvas de San Miguel)
const SMA_ROAD_CURVATURE_FACTOR = 1.28;
const AVERAGE_MOTO_SPEED_KMH = 22; // Velocidad promedio en moto en zonas urbanas de SMA

export interface RouteCalculationResult {
  distanceKm: number;
  estimatedMinutes: number;
  deliveryFee: number;
  routeSummary: string;
  isInsideCoverage: boolean;
}

/**
 * Calcula la distancia en kilómetros entre dos pares de coordenadas (Fórmula de Haversine)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
  const rawDistance = R * c;

  // Multiplicar por el factor de curvas urbanas de SMA y redondear a 1 decimal
  const actualRoadDistance = rawDistance * SMA_ROAD_CURVATURE_FACTOR;
  return Math.max(0.8, Math.round(actualRoadDistance * 10) / 10);
}

/**
 * Calcula la tarifa de envío dinámica en base a la distancia y configuración de Edson
 */
export function calculateDynamicDeliveryFee(
  distanceKm: number,
  baseTariff: number = 35,
  tariffPerKm: number = 7,
  expressSurcharge: number = 0
): number {
  // Primeros 1.8 km están cubiertos por la tarifa base
  const billableExtraKm = Math.max(0, distanceKm - 1.8);
  const extraKmFee = Math.round(billableExtraKm * tariffPerKm);
  const totalFee = baseTariff + extraKmFee + expressSurcharge;

  // Redondear a múltiplos de $5 para facilitar cambio en efectivo a repartidores
  return Math.ceil(totalFee / 5) * 5;
}

/**
 * Calcula tiempo estimado de despacho en moto considerando preparación y viaje
 */
export function estimateMotoDeliveryTime(distanceKm: number, prepTimeMinutes: number = 15): number {
  const travelTimeMinutes = Math.round((distanceKm / AVERAGE_MOTO_SPEED_KMH) * 60);
  // Suma tiempo de preparación del local + viaje + 5 min de tolerancia
  return prepTimeMinutes + travelTimeMinutes + 5;
}

/**
 * Genera el cálculo completo de ruta y tarifa
 */
export function computeOrderRoute(
  originCoords: { lat: number; lng: number } = SMA_CENTER_COORDS,
  destCoords: { lat: number; lng: number },
  originName: string = 'Local',
  destAddress: string = 'Domicilio del Cliente',
  baseTariff: number = 35,
  tariffPerKm: number = 7,
  isExpress: boolean = false,
  expressSurcharge: number = 25
): RouteCalculationResult {
  const distanceKm = calculateHaversineDistance(
    originCoords.lat,
    originCoords.lng,
    destCoords.lat,
    destCoords.lng
  );

  const deliveryFee = calculateDynamicDeliveryFee(
    distanceKm,
    baseTariff,
    tariffPerKm,
    isExpress ? expressSurcharge : 0
  );

  const estimatedMinutes = estimateMotoDeliveryTime(distanceKm);
  const isInsideCoverage = distanceKm <= 16; // 16 km cubre todo el municipio de San Miguel y comunidades cercanas

  const routeSummary = `${originName} ➔ ${destAddress.slice(0, 32)}... (${distanceKm} km · ~${estimatedMinutes} min en moto)`;

  return {
    distanceKm,
    estimatedMinutes,
    deliveryFee,
    routeSummary,
    isInsideCoverage,
  };
}

export interface AddressSearchSuggestion {
  id: string;
  label: string;
  subtitle: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  lat: number;
  lng: number;
  source: 'coords' | 'osm' | 'colonia';
}

export interface DetailedReverseGeocode {
  street: string;
  streetNumber: string;
  neighborhood: string;
  displayName: string;
}

export interface ResolvedMapsLinkResult {
  lat: number;
  lng: number;
  mapsUrl: string;
  resolvedUrl: string;
  placeName: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  address: string;
}

/**
 * Detecta si el texto ingresado es un enlace de Google Maps, Apple Maps u OpenStreetMap
 * (incluyendo enlaces cortos compartidos desde móvil como maps.app.goo.gl).
 */
export function isGoogleMapsLink(rawInput: string): boolean {
  const input = rawInput.trim();
  if (!/^https?:\/\//i.test(input)) return false;
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'maps.app.goo.gl' ||
      host === 'maps.google.com' ||
      host === 'maps.google.com.mx' ||
      host === 'maps.apple.com' ||
      host === 'openstreetmap.org' ||
      host === 'www.openstreetmap.org' ||
      host === 'osm.org'
    ) {
      return true;
    }
    if (host === 'goo.gl' && parsed.pathname.toLowerCase().startsWith('/maps')) {
      return true;
    }
    if (
      (host === 'google.com' ||
        host === 'www.google.com' ||
        host === 'google.com.mx' ||
        host === 'www.google.com.mx') &&
      parsed.pathname.toLowerCase().startsWith('/maps')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Resuelve un enlace de Google Maps (incluyendo enlaces cortos maps.app.goo.gl)
 * para obtener coordenadas exactas y rellenar calle, número y colonia automáticamente.
 */
export async function resolveGoogleMapsUrl(rawUrl: string): Promise<ResolvedMapsLinkResult | null> {
  const cleaned = rawUrl.trim();
  if (!cleaned) return null;

  try {
    const res = await fetch('/api/routing/resolve-maps-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url: cleaned }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))) {
        return {
          lat: Number(data.lat),
          lng: Number(data.lng),
          mapsUrl: String(data.mapsUrl || cleaned),
          resolvedUrl: String(data.resolvedUrl || cleaned),
          placeName: String(data.placeName || ''),
          street: String(data.street || ''),
          streetNumber: String(data.streetNumber || ''),
          neighborhood: String(data.neighborhood || ''),
          address: String(data.address || ''),
        };
      }
    }
  } catch {
    // Fallback local si el backend no responde
  }

  const localCoords = parseCoordinatesOrMapsUrl(cleaned);
  if (!localCoords) return null;

  const rev = await reverseGeocodeDetailed(localCoords.lat, localCoords.lng);
  const street = rev?.street || '';
  const streetNumber = rev?.streetNumber || '';
  const neighborhood = rev?.neighborhood || '';
  const address = [
    street ? `${street}${streetNumber ? ` ${streetNumber}` : ''}` : '',
    neighborhood ? `Col. ${neighborhood}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return {
    lat: localCoords.lat,
    lng: localCoords.lng,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${localCoords.lat},${localCoords.lng}`,
    resolvedUrl: cleaned,
    placeName: '',
    street,
    streetNumber,
    neighborhood,
    address: address || `Ubicación (${localCoords.lat.toFixed(5)}, ${localCoords.lng.toFixed(5)})`,
  };
}

/**
 * Normaliza texto para búsqueda insensible a acentos y mayúsculas.
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae coordenadas lat/lng de un texto directo ("20.9144, -100.7437")
 * o de enlaces compartidos de Google Maps, Apple Maps u OpenStreetMap.
 */
export function parseCoordinatesOrMapsUrl(rawInput: string): { lat: number; lng: number } | null {
  const input = rawInput.trim();
  if (!input) return null;

  const isValidPair = (lat: number, lng: number) =>
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0);

  const toResult = (latStr: string, lngStr: string) => {
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!isValidPair(lat, lng)) return null;
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  };

  // 1. Coordenadas exactas del pin en URLs de Google Maps (!3dLAT!4dLNG)
  const bangMatch = input.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (bangMatch) {
    return toResult(bangMatch[1], bangMatch[2]);
  }

  // 2. Parámetros query (?q=lat,lng, ?query=lat,lng, ?ll=lat,lng, destination=lat,lng)
  const queryMatch = input.match(
    /[?&](?:q|query|ll|destination|center)=(-?\d{1,2}\.\d+)(?:%2C|,)\s*(-?\d{1,3}\.\d+)/i
  );
  if (queryMatch) {
    return toResult(queryMatch[1], queryMatch[2]);
  }

  // 3. OpenStreetMap (?mlat=lat&mlon=lng o #map=zoom/lat/lng)
  const osmParamMatch = input.match(/[?&]mlat=(-?\d{1,2}\.\d+)&mlon=(-?\d{1,3}\.\d+)/i);
  if (osmParamMatch) {
    return toResult(osmParamMatch[1], osmParamMatch[2]);
  }
  const osmHashMatch = input.match(/#map=\d+\/(-?\d{1,2}\.\d+)\/(-?\d{1,3}\.\d+)/i);
  if (osmHashMatch) {
    return toResult(osmHashMatch[1], osmHashMatch[2]);
  }

  // 4. Viewport de Google Maps (@lat,lng)
  const atMatch = input.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    return toResult(atMatch[1], atMatch[2]);
  }

  // 5. Coordenadas pegadas directamente ("20.9144, -100.7437" o "20.9144 -100.7437")
  const directMatch = input.match(/^\s*(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})\s*$/);
  if (directMatch) {
    return toResult(directMatch[1], directMatch[2]);
  }

  return null;
}

/**
 * Busca direcciones y lugares en San Miguel de Allende usando el proxy con caché Redis
 * del backend, con respaldo automático a Nominatim y soporte para enlaces de Google Maps.
 */
export async function searchSmaAddresses(
  query: string,
  signal?: AbortSignal
): Promise<AddressSearchSuggestion[]> {
  const cleaned = query.trim();
  if (cleaned.length < 2) return [];

  const parsedCoords = parseCoordinatesOrMapsUrl(cleaned);
  if (parsedCoords) {
    return [
      {
        id: `coords-${parsedCoords.lat}-${parsedCoords.lng}`,
        label: `Ubicación exacta (${parsedCoords.lat.toFixed(5)}, ${parsedCoords.lng.toFixed(5)})`,
        subtitle: 'Enlace o coordenadas detectadas',
        street: '',
        streetNumber: '',
        neighborhood: '',
        lat: parsedCoords.lat,
        lng: parsedCoords.lng,
        source: 'coords',
      },
    ];
  }

  try {
    const apiRes = await fetch(
      `/api/routing/search?q=${encodeURIComponent(cleaned)}&limit=6`,
      {
        headers: { Accept: 'application/json' },
        signal,
      }
    );
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data?.results)) {
        return data.results.map((item: any, idx: number) => ({
          id: String(item.id || `api-${idx}`),
          label: String(item.label || ''),
          subtitle: String(item.subtitle || 'San Miguel de Allende'),
          street: String(item.street || ''),
          streetNumber: String(item.streetNumber || ''),
          neighborhood: String(item.neighborhood || ''),
          lat: Number(item.lat),
          lng: Number(item.lng),
          source: 'osm' as const,
        }));
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return [];
  }

  // Fallback directo a Nominatim (útil si se corre el frontend sin backend proxy)
  try {
    const qWithCity = /san\s+miguel/i.test(cleaned)
      ? cleaned
      : `${cleaned}, San Miguel de Allende, Guanajuato, Mexico`;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=mx&viewbox=-100.92,21.05,-100.55,20.76&bounded=1&q=${encodeURIComponent(
      qWithCity
    )}`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es-MX,es;q=0.9' },
      signal,
    });
    if (!res.ok) return [];
    const results = (await res.json()) as any[];
    if (!Array.isArray(results)) return [];

    return results
      .map((item, idx): AddressSearchSuggestion | null => {
        const lat = Number(item?.lat);
        const lng = Number(item?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const addr = item?.address || {};
        const street = addr.road || addr.pedestrian || addr.street || '';
        const streetNumber = addr.house_number ? `#${addr.house_number}` : '';
        const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || '';
        const label =
          street
            ? `${street}${streetNumber ? ` ${streetNumber}` : ''}`
            : item?.name || item?.display_name?.split(',')[0] || 'San Miguel de Allende';
        return {
          id: String(item?.place_id || `nom-${idx}`),
          label,
          subtitle: [neighborhood, 'San Miguel de Allende'].filter(Boolean).join(', '),
          street: street || String(item?.name || ''),
          streetNumber,
          neighborhood,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          source: 'osm',
        };
      })
      .filter((x): x is AddressSearchSuggestion => x !== null);
  } catch {
    return [];
  }
}

/**
 * Geocodificación inversa estructurada usando primero el proxy Redis del backend.
 */
export async function reverseGeocodeDetailed(
  lat: number,
  lng: number
): Promise<DetailedReverseGeocode | null> {
  try {
    let data: any = null;
    try {
      const apiRes = await fetch(
        `/api/routing/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
        { headers: { Accept: 'application/json' } }
      );
      if (apiRes.ok) {
        data = await apiRes.json();
      }
    } catch {}

    if (!data) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'es-MX,es;q=0.9' },
      });
      if (!res.ok) return null;
      data = await res.json();
    }

    const addr = data?.address || {};
    const street = addr.road || addr.pedestrian || addr.street || addr.path || '';
    const streetNumber = addr.house_number ? `#${String(addr.house_number).replace(/^#/, '')}` : '';
    const neighborhood =
      addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || '';

    return {
      street,
      streetNumber,
      neighborhood,
      displayName: typeof data?.display_name === 'string' ? data.display_name : '',
    };
  } catch {
    return null;
  }
}

/**
 * Geocodificación inversa con detección precisa de calle y número
 * Si no aparece nombre en el mapa, no inventa nombres falsos.
 */
export async function reverseGeocodeCoords(
  lat: number,
  lng: number
): Promise<{ addressLabel: string; hasStreetName: boolean; colonia?: string }> {
  try {
    let data: any = null;
    try {
      const apiRes = await fetch(
        `/api/routing/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
        { headers: { Accept: 'application/json' } }
      );
      if (apiRes.ok) {
        data = await apiRes.json();
      }
    } catch {}

    if (!data) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es-MX,es;q=0.9',
        },
      });

      if (!res.ok) {
        return {
          addressLabel: `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          hasStreetName: false,
        };
      }
      data = await res.json();
    }

    const address = data.address || {};

    const road = address.road || address.pedestrian || address.street || address.path;
    const houseNumber = address.house_number ? `#${address.house_number}` : '';
    const neighbourhood = address.neighbourhood || address.suburb || address.quarter || address.residential || '';
    const town = address.city || address.town || 'San Miguel de Allende';

    if (road) {
      const parts = [
        road + (houseNumber ? ` ${houseNumber}` : ''),
        neighbourhood,
        town,
      ].filter(Boolean);
      return {
        addressLabel: parts.join(', '),
        hasStreetName: true,
        colonia: neighbourhood,
      };
    }

    return {
      addressLabel: data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      hasStreetName: false,
      colonia: neighbourhood,
    };
  } catch {
    return {
      addressLabel: `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      hasStreetName: false,
    };
  }
}

/**
 * Convierte la geometría GeoJSON [lng, lat] devuelta por OSRM en un arreglo de puntos { lat, lng } para Leaflet
 */
export function extractOsrmRoutePoints(osrmResponse: any): { lat: number; lng: number }[] {
  const coords = osrmResponse?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return [];
  }
  const points: { lat: number; lng: number }[] = [];
  for (const pair of coords) {
    if (Array.isArray(pair) && pair.length >= 2) {
      const lng = Number(pair[0]);
      const lat = Number(pair[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        points.push({ lat, lng });
      }
    }
  }
  return points;
}

/**
 * Obtiene la ruta real por calles de San Miguel de Allende usando el proxy OSRM con caché Redis del Backend
 */
export async function fetchCachedOsrmStreetRoute(
  fromCoords: { lat: number; lng: number },
  toCoords: { lat: number; lng: number }
): Promise<{ lat: number; lng: number }[]> {
  try {
    const query = `fromLat=${encodeURIComponent(fromCoords.lat)}&fromLng=${encodeURIComponent(fromCoords.lng)}&toLat=${encodeURIComponent(toCoords.lat)}&toLng=${encodeURIComponent(toCoords.lng)}`;
    const res = await fetch(`/api/routing/osrm?${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const pts = extractOsrmRoutePoints(data);
      if (pts.length >= 2) return pts;
    }
  } catch {}
  return [fromCoords, toCoords];
}

export interface ExpressRouteQuote {
  distanceKm: number;
  estimatedMinutes: number;
  baseFee: number;
  extraKm: number;
  baseCalculatedFee: number;
  expressSurcharge: number;
  totalFee: number;
  source: 'osrm' | 'haversine';
  pickupCoords: { lat: number; lng: number };
  deliveryCoords: { lat: number; lng: number };
}

/**
 * Fórmula oficial de tarifa para Envíos Express (Punto A -> Punto B):
 * Base $30 MXN (primeros 2.0 km) + $10 MXN por cada km adicional + recargo exprés opcional.
 */
export function calculateExpressShippingTariff(
  distanceKm: number,
  deliveryType: 'normal' | 'express' | 'programada' = 'normal',
  expressSurcharge: number = 25
): {
  distanceKm: number;
  baseFee: number;
  extraKm: number;
  baseCalculatedFee: number;
  expressSurcharge: number;
  totalFee: number;
  estimatedMinutes: number;
} {
  const safeKm = Math.max(0.5, Math.round(distanceKm * 10) / 10);
  const baseFee = 30;
  const baseKm = 2.0;
  const perExtraKm = 10;
  const extraKm = Math.max(0, Number((safeKm - baseKm).toFixed(1)));
  const baseCalculatedFee = Math.round(baseFee + extraKm * perExtraKm);
  const appliedExpress = deliveryType === 'express' ? expressSurcharge : 0;
  const totalFee = baseCalculatedFee + appliedExpress;
  const estimatedMinutes = Math.round(
    (deliveryType === 'express' ? 5 : 8) + safeKm * (deliveryType === 'express' ? 3 : 4)
  );

  return {
    distanceKm: safeKm,
    baseFee,
    extraKm,
    baseCalculatedFee,
    expressSurcharge: appliedExpress,
    totalFee,
    estimatedMinutes,
  };
}

/**
 * Calcula automáticamente la distancia real (OSRM) y tarifa entre Punto A y Punto B
 * usando la API del backend para impedir manipulación manual de kilómetros.
 */
export async function fetchExpressRouteQuote(params: {
  pickupCoords?: { lat: number; lng: number } | null;
  deliveryCoords?: { lat: number; lng: number } | null;
  pickupAddress?: string;
  deliveryAddress?: string;
  deliveryType?: 'normal' | 'express' | 'programada';
}): Promise<ExpressRouteQuote | null> {
  const deliveryType = params.deliveryType || 'normal';

  try {
    const res = await fetch('/api/routing/express-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        pickupCoords: params.pickupCoords || undefined,
        deliveryCoords: params.deliveryCoords || undefined,
        pickupAddress: params.pickupAddress || undefined,
        deliveryAddress: params.deliveryAddress || undefined,
        deliveryType,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.distanceKm === 'number' && typeof data.totalFee === 'number') {
        return data as ExpressRouteQuote;
      }
    }
  } catch {
    // Fallback local solo si ya existen coordenadas GPS de ambos puntos
  }

  if (params.pickupCoords && params.deliveryCoords) {
    const km = calculateHaversineDistance(
      params.pickupCoords.lat,
      params.pickupCoords.lng,
      params.deliveryCoords.lat,
      params.deliveryCoords.lng
    );
    const tariff = calculateExpressShippingTariff(km, deliveryType);
    return {
      ...tariff,
      source: 'haversine',
      pickupCoords: params.pickupCoords,
      deliveryCoords: params.deliveryCoords,
    };
  }

  return null;
}
