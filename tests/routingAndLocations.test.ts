import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SMA_CENTER_COORDS,
  calculateHaversineDistance,
  calculateDynamicDeliveryFee,
  estimateMotoDeliveryTime,
  computeOrderRoute,
  extractOsrmRoutePoints,
} from '../src/services/routing.ts';
import {
  ALL_SAN_MIGUEL_COLONIAS,
  findNearestSmaNeighborhood,
  parseSmaAddress,
} from '../src/services/sanMiguelLocations.ts';

describe('Frontend Routing, Tariffs & San Miguel de Allende Geolocation Unit Tests', () => {
  describe('1. calculateHaversineDistance (Distancia Urbana en Moto con Factor SMA 1.28x)', () => {
    it('garantiza distancia mínima de 0.8 km para trayectos dentro de la misma cuadra', () => {
      const dist = calculateHaversineDistance(
        SMA_CENTER_COORDS.lat,
        SMA_CENTER_COORDS.lng,
        SMA_CENTER_COORDS.lat,
        SMA_CENTER_COORDS.lng
      );
      assert.equal(dist, 0.8);
    });

    it('calcula distancia realista entre Centro Histórico y La Aurora (~1.1 - 1.3 km)', () => {
      const dist = calculateHaversineDistance(
        SMA_CENTER_COORDS.lat,
        SMA_CENTER_COORDS.lng,
        20.9205,
        -100.7380
      );
      assert.ok(dist >= 1.0 && dist <= 1.5, `Distancia calculada fuera de rango: ${dist} km`);
    });

    it('calcula distancia realista entre Centro Histórico y Los Frailes (~5.0 - 5.6 km)', () => {
      const dist = calculateHaversineDistance(
        SMA_CENTER_COORDS.lat,
        SMA_CENTER_COORDS.lng,
        20.8845,
        -100.7680
      );
      assert.ok(dist >= 4.8 && dist <= 6.0, `Distancia calculada fuera de rango: ${dist} km`);
    });
  });

  describe('2. calculateDynamicDeliveryFee (Tarifas Dinámicas y Redondeo para Cambio en Efectivo)', () => {
    it('cobra la tarifa base ($35 MXN) para distancias menores o iguales a 1.8 km', () => {
      assert.equal(calculateDynamicDeliveryFee(0.8, 35, 7, 0), 35);
      assert.equal(calculateDynamicDeliveryFee(1.8, 35, 7, 0), 35);
    });

    it('suma kilómetros adicionales y redondea siempre a múltiplos de $5 MXN', () => {
      // 3.8 km -> 2.0 km extra * $7 = $14 -> $35 + $14 = $49 -> redondeado a múltiplo de 5 = $50 MXN
      const fee = calculateDynamicDeliveryFee(3.8, 35, 7, 0);
      assert.equal(fee, 50);
      assert.equal(fee % 5, 0);
    });

    it('agrega correctamente el recargo por Envío Exprés (+$25 MXN)', () => {
      const normalFee = calculateDynamicDeliveryFee(1.2, 35, 7, 0);
      const expressFee = calculateDynamicDeliveryFee(1.2, 35, 7, 25);
      assert.equal(normalFee, 35);
      assert.equal(expressFee, 60);
    });
  });

  describe('3. estimateMotoDeliveryTime & computeOrderRoute (Tiempos y Geocerca de Cobertura)', () => {
    it('estima tiempo total sumando preparación + traslado en moto (22 km/h) + 5 min buffer', () => {
      const minutes = estimateMotoDeliveryTime(2.2, 15);
      // 2.2 km a 22 km/h = 6 min viaje + 15 min prep + 5 min tolerancia = 26 min
      assert.equal(minutes, 26);
    });

    it('marca isInsideCoverage = true dentro de San Miguel de Allende (<= 16 km)', () => {
      const route = computeOrderRoute(
        SMA_CENTER_COORDS,
        { lat: 20.9070, lng: -100.7510 }, // Colonia San Antonio
        'Tacos Sebastián',
        'Calle Ancha de San Antonio #24'
      );
      assert.equal(route.isInsideCoverage, true);
      assert.ok(route.deliveryFee >= 35);
      assert.ok(route.routeSummary.includes('Tacos Sebastián'));
    });

    it('marca isInsideCoverage = false para coordenadas fuera del municipio (> 16 km)', () => {
      const routeOutside = computeOrderRoute(
        SMA_CENTER_COORDS,
        { lat: 20.5888, lng: -100.3899 }, // Querétaro
        'Tacos Sebastián',
        'Querétaro Centro'
      );
      assert.equal(routeOutside.isInsideCoverage, false);
    });
  });

  describe('4. sanMiguelLocations (Detección de Colonias y Parseo de Direcciones)', () => {
    it('contiene catálogo completo de colonias georreferenciadas de San Miguel de Allende', () => {
      assert.ok(ALL_SAN_MIGUEL_COLONIAS.length >= 40);
    });

    it('encuentra la colonia más cercana a partir de coordenadas GPS', () => {
      const centerCol = findNearestSmaNeighborhood(20.9144, -100.7437);
      assert.equal(centerCol.id, 'sma-centro');

      const auroraCol = findNearestSmaNeighborhood(20.9205, -100.7380);
      assert.equal(auroraCol.id, 'sma-aurora');
    });

    it('parsea calle, número exterior y colonia limpiando prefijos redundantes', () => {
      const parsed = parseSmaAddress('Calle Mesones #38, Colonia Centro, San Miguel de Allende', 20.9158, -100.7442);
      assert.equal(parsed.street, 'Mesones');
      assert.equal(parsed.streetNumber, '#38');
      assert.equal(parsed.neighborhood, 'Centro');
      assert.ok(parsed.formattedAddress.includes('Calle Mesones, #38'));
    });
  });

  describe('5. extractOsrmRoutePoints (Conversión de Geometría GeoJSON OSRM a Polilínea Leaflet)', () => {
    it('devuelve arreglo vacío si la respuesta OSRM es inválida o no tiene coordenadas', () => {
      assert.deepEqual(extractOsrmRoutePoints(null), []);
      assert.deepEqual(extractOsrmRoutePoints({ routes: [] }), []);
      assert.deepEqual(extractOsrmRoutePoints({ routes: [{ geometry: { coordinates: [[-100.74, 20.91]] } }] }), []);
    });

    it('invierte correctamente pares GeoJSON [lng, lat] al formato Leaflet { lat, lng }', () => {
      const sampleOsrmPayload = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              type: 'LineString',
              coordinates: [
                [-100.7437, 20.9144],
                [-100.7412, 20.9165],
                [-100.7380, 20.9205],
              ],
            },
          },
        ],
      };

      const points = extractOsrmRoutePoints(sampleOsrmPayload);
      assert.equal(points.length, 3);
      assert.deepEqual(points[0], { lat: 20.9144, lng: -100.7437 });
      assert.deepEqual(points[2], { lat: 20.9205, lng: -100.7380 });
    });
  });
});
