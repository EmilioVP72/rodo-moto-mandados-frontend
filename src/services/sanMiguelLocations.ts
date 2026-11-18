/**
 * Catálogo exhaustivo de Colonias, Barrios y Fraccionamientos de San Miguel de Allende, GTO
 * y funciones de Geocodificación Inversa para autollenar calles y colonias automáticamente.
 */

export interface SmaNeighborhood {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone: 'Centro' | 'Norte' | 'Sur' | 'Oriente' | 'Poniente' | 'Periferia';
  coverage: 'estandar' | 'extendida';
}

export const ALL_SAN_MIGUEL_COLONIAS: SmaNeighborhood[] = [
  // Zona Centro y Tradicional
  { id: 'sma-centro', name: 'Centro Histórico', lat: 20.9144, lng: -100.7437, zone: 'Centro', coverage: 'estandar' },
  { id: 'sma-chorro', name: 'El Chorro', lat: 20.9110, lng: -100.7405, zone: 'Centro', coverage: 'estandar' },
  { id: 'sma-ojo-agua', name: 'Ojo de Agua', lat: 20.9085, lng: -100.7420, zone: 'Centro', coverage: 'estandar' },
  { id: 'sma-san-antonio', name: 'San Antonio', lat: 20.9070, lng: -100.7510, zone: 'Centro', coverage: 'estandar' },
  { id: 'sma-guadalupe', name: 'Colonia Guadalupe', lat: 20.9175, lng: -100.7455, zone: 'Centro', coverage: 'estandar' },
  { id: 'sma-parroquia', name: 'La Parroquia / Jardín', lat: 20.9140, lng: -100.7435, zone: 'Centro', coverage: 'estandar' },
  { id: 'sma-atascadero', name: 'Atascadero', lat: 20.9125, lng: -100.7320, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-obraje', name: 'El Obraje', lat: 20.9190, lng: -100.7410, zone: 'Centro', coverage: 'estandar' },
  { id: 'sma-balcones', name: 'Balcones', lat: 20.9220, lng: -100.7350, zone: 'Oriente', coverage: 'estandar' },

  // Zona Norte / La Aurora / San Rafael
  { id: 'sma-aurora', name: 'La Aurora', lat: 20.9205, lng: -100.7380, zone: 'Norte', coverage: 'estandar' },
  { id: 'sma-calzada-aurora', name: 'Calzada de la Aurora', lat: 20.9185, lng: -100.7395, zone: 'Norte', coverage: 'estandar' },
  { id: 'sma-san-rafael', name: 'San Rafael', lat: 20.9180, lng: -100.7550, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-ignacio-ramirez', name: 'Ignacio Ramírez', lat: 20.9165, lng: -100.7520, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-san-luis-rey', name: 'San Luis Rey', lat: 20.9230, lng: -100.7620, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-independencia', name: 'Independencia', lat: 20.9210, lng: -100.7500, zone: 'Norte', coverage: 'estandar' },
  { id: 'sma-santa-julia', name: 'Santa Julia', lat: 20.9240, lng: -100.7480, zone: 'Norte', coverage: 'estandar' },
  { id: 'sma-la-estacion', name: 'La Estación (Ferrocarril)', lat: 20.9150, lng: -100.7590, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-cuevita', name: 'La Cuevita', lat: 20.9255, lng: -100.7410, zone: 'Norte', coverage: 'estandar' },
  { id: 'sma-mexiquito', name: 'Mexiquito', lat: 20.9245, lng: -100.7360, zone: 'Norte', coverage: 'estandar' },

  // Zona Poniente y Fraccionamientos
  { id: 'sma-alamedas', name: 'Las Alamedas', lat: 20.9023, lng: -100.7634, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-santa-cruz-paz', name: 'Santa Cruz de la Paz', lat: 20.9035, lng: -100.7645, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-providencia', name: 'Providencia', lat: 20.9080, lng: -100.7600, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-allende', name: 'Colonia Allende', lat: 20.9050, lng: -100.7580, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-ejido-tirado', name: 'Ejido de Tirado', lat: 20.9110, lng: -100.7680, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-san-felipe-neri', name: 'San Felipe Neri', lat: 20.9140, lng: -100.7490, zone: 'Poniente', coverage: 'estandar' },
  { id: 'sma-insurgentes', name: 'Insurgentes', lat: 20.9260, lng: -100.7580, zone: 'Poniente', coverage: 'estandar' },

  // Zona Sur / Salida a Celaya
  { id: 'sma-malanquin', name: 'Infonavit Malanquín', lat: 20.8990, lng: -100.7560, zone: 'Sur', coverage: 'estandar' },
  { id: 'sma-club-malanquin', name: 'Club de Golf Malanquín', lat: 20.8920, lng: -100.7550, zone: 'Sur', coverage: 'estandar' },
  { id: 'sma-lejona-1', name: 'La Lejona (1a Sección)', lat: 20.8930, lng: -100.7600, zone: 'Sur', coverage: 'estandar' },
  { id: 'sma-lejona-2', name: 'La Lejona (2a Sección)', lat: 20.8900, lng: -100.7620, zone: 'Sur', coverage: 'estandar' },
  { id: 'sma-los-frailes', name: 'Los Frailes', lat: 20.8845, lng: -100.7680, zone: 'Sur', coverage: 'estandar' },
  { id: 'sma-la-aldea', name: 'Fraccionamiento La Aldea', lat: 20.9095, lng: -100.7470, zone: 'Sur', coverage: 'estandar' },
  { id: 'sma-salida-celaya', name: 'Salida a Celaya (Corredor)', lat: 20.8980, lng: -100.7580, zone: 'Sur', coverage: 'estandar' },
  { id: 'sma-rancho-la-luz', name: 'Rancho La Luz', lat: 20.8870, lng: -100.7640, zone: 'Sur', coverage: 'estandar' },
  { id: 'sma-presa-allende', name: 'Ribera Presa Allende', lat: 20.8790, lng: -100.7720, zone: 'Sur', coverage: 'extendida' },

  // Zona Oriente / Salida a Querétaro
  { id: 'sma-valle-maiz', name: 'Valle del Maíz', lat: 20.9090, lng: -100.7350, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-el-caracol', name: 'El Caracol', lat: 20.9060, lng: -100.7320, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-salida-qro', name: 'Salida a Querétaro / Mirador', lat: 20.9080, lng: -100.7310, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-palmita-baja', name: 'La Palmita (Baja)', lat: 20.9160, lng: -100.7310, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-palmita-alta', name: 'La Palmita (Alta)', lat: 20.9180, lng: -100.7280, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-montes-loreto', name: 'Montes de Loreto', lat: 20.9230, lng: -100.7260, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-olimpo', name: 'Colonia El Olimpo', lat: 20.9210, lng: -100.7300, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-arcos', name: 'Arcos de San Miguel', lat: 20.9250, lng: -100.7290, zone: 'Oriente', coverage: 'estandar' },
  { id: 'sma-las-brisas', name: 'Las Brisas', lat: 20.9270, lng: -100.7320, zone: 'Oriente', coverage: 'estandar' },

  // Zona Periférica / Conurbada
  { id: 'sma-ventanas', name: 'Ventanas Golf & Resort', lat: 20.9350, lng: -100.7550, zone: 'Periferia', coverage: 'extendida' },
  { id: 'sma-salida-dolores', name: 'Salida a Dolores Hidalgo', lat: 20.9380, lng: -100.7520, zone: 'Periferia', coverage: 'extendida' },
  { id: 'sma-zirandaro', name: 'Fraccionamiento Zirándaro', lat: 20.8950, lng: -100.7220, zone: 'Periferia', coverage: 'extendida' },
  { id: 'sma-alcocer', name: 'Alcocer (Entrada Periférica)', lat: 20.9010, lng: -100.7180, zone: 'Periferia', coverage: 'extendida' },
  { id: 'sma-cuesta-san-jose', name: 'Cuesta de San José', lat: 20.9290, lng: -100.7450, zone: 'Periferia', coverage: 'estandar' },
  { id: 'sma-san-jeronimo', name: 'San Jerónimo', lat: 20.9280, lng: -100.7490, zone: 'Periferia', coverage: 'estandar' },
  { id: 'sma-labradores', name: 'Rancho Los Labradores', lat: 20.9450, lng: -100.7600, zone: 'Periferia', coverage: 'extendida' },
  { id: 'sma-nuevo-pantoja', name: 'Nuevo Pantoja', lat: 20.8880, lng: -100.7500, zone: 'Periferia', coverage: 'extendida' },
  { id: 'sma-san-gabriel', name: 'San Gabriel', lat: 20.9320, lng: -100.7380, zone: 'Periferia', coverage: 'extendida' },
];

/**
 * Encuentra la colonia más cercana dentro de San Miguel de Allende dada una coordenada
 */
export function findNearestSmaNeighborhood(lat: number, lng: number): SmaNeighborhood {
  let nearest = ALL_SAN_MIGUEL_COLONIAS[0];
  let minDistance = Number.MAX_VALUE;

  for (const col of ALL_SAN_MIGUEL_COLONIAS) {
    const dLat = col.lat - lat;
    const dLng = col.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      nearest = col;
    }
  }

  return nearest;
}

/**
 * Parsea un resultado de dirección de Google Maps o Nominatim para extraer
 * de manera limpia la calle, el número y la colonia de San Miguel de Allende.
 */
export function parseSmaAddress(
  rawAddress: string,
  lat?: number,
  lng?: number,
  addressComponents?: any[]
): {
  street: string;
  streetNumber: string;
  neighborhood: string;
  formattedAddress: string;
} {
  let street = '';
  let streetNumber = '';
  let neighborhood = '';

  // 1. Si tenemos componentes estructurados de Google Maps Geocoder
  if (addressComponents && Array.isArray(addressComponents)) {
    for (const comp of addressComponents) {
      const types = comp.types || [];
      if (types.includes('route')) {
        street = comp.long_name || comp.short_name || '';
      } else if (types.includes('street_number')) {
        streetNumber = comp.long_name || comp.short_name || '';
      } else if (
        types.includes('sublocality') ||
        types.includes('sublocality_level_1') ||
        types.includes('neighborhood')
      ) {
        if (!neighborhood) {
          neighborhood = comp.long_name || comp.short_name || '';
        }
      }
    }
  }

  // 2. Si no obtuvimos datos estructurados, parsear el texto
  if (!street && rawAddress) {
    const parts = rawAddress.split(',').map((p) => p.trim());
    if (parts.length > 0) {
      const firstPart = parts[0];
      // Detectar número tipo "#14", "14", "No. 14"
      const numMatch = firstPart.match(/(?:#|no\.?\s*)?(\d+[-\w]*)$/i);
      if (numMatch) {
        streetNumber = numMatch[1];
        street = firstPart.replace(/(?:#|no\.?\s*)?(\d+[-\w]*)$/i, '').trim();
      } else {
        street = firstPart;
      }
    }

    if (parts.length > 1 && !neighborhood) {
      const secondPart = parts[1];
      if (
        !secondPart.toLowerCase().includes('san miguel') &&
        !secondPart.toLowerCase().includes('gto') &&
        !secondPart.toLowerCase().includes('méxico')
      ) {
        neighborhood = secondPart.replace(/Colonia|Col\./i, '').trim();
      }
    }
  }

  // 3. Si la colonia sigue vacía pero tenemos coordenadas, usar el catálogo de San Miguel
  if (!neighborhood && lat !== undefined && lng !== undefined) {
    const nearest = findNearestSmaNeighborhood(lat, lng);
    neighborhood = nearest.name;
  }

  // Limpiar prefijos redundantes
  street = street.replace(/^Calle\s+/i, '').replace(/^Av(?:enida)?\s+/i, 'Av. ').trim();
  if (streetNumber && !streetNumber.startsWith('#')) {
    streetNumber = `#${streetNumber}`;
  }

  const formattedAddress = [
    street ? `Calle ${street}` : '',
    streetNumber,
    neighborhood ? `Col. ${neighborhood}` : '',
    'San Miguel de Allende, GTO',
  ]
    .filter(Boolean)
    .join(', ');

  return {
    street,
    streetNumber,
    neighborhood: neighborhood || 'Centro Histórico',
    formattedAddress: formattedAddress || rawAddress,
  };
}
