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
