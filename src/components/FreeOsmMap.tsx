import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface OsmMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  color?: string;
  label?: string;
  emoji?: string;
  draggable?: boolean;
  onDragEnd?: (lat: number, lng: number) => void;
}

export interface FreeOsmMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: OsmMarkerItem[];
  polygonPaths?: { lat: number; lng: number }[];
  polylinePaths?: { lat: number; lng: number }[];
  routePaths?: { lat: number; lng: number }[];
  mapType?: 'roadmap' | 'hybrid';
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  fitBoundsToMarkers?: boolean;
}

export const FreeOsmMap: React.FC<FreeOsmMapProps> = ({
  center,
  zoom = 15,
  markers = [],
  polygonPaths,
  polylinePaths,
  routePaths,
  mapType = 'roadmap',
  onMapClick,
  className = 'w-full h-full',
  fitBoundsToMarkers = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    const overlayGroup = L.layerGroup().addTo(map);
    overlayGroupRef.current = overlayGroup;
    mapRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(
          Number(e.latlng.lat.toFixed(5)),
          Number(e.latlng.lng.toFixed(5))
        );
      }
    });

    // Asegura render correcto al abrir dentro de modales animados
    const t1 = window.setTimeout(() => map.invalidateSize(), 120);
    const t2 = window.setTimeout(() => map.invalidateSize(), 400);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      overlayGroupRef.current = null;
    };
  }, []);

  // Alternar mapa gratuito de calles (OpenStreetMap) o satélite (Esri World Imagery)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapType === 'hybrid'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      mapType === 'hybrid'
        ? '© Esri / OpenStreetMap'
        : '© OpenStreetMap';

    const layer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution,
    });
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [mapType]);

  // Centrar mapa suavemente cuando cambian las coordenadas objetivo
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom]);

  // Renderizar marcadores, polígonos y rutas
  useEffect(() => {
    const map = mapRef.current;
    const group = overlayGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (polygonPaths && polygonPaths.length >= 3) {
      L.polygon(
        polygonPaths.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: '#ed0718',
          weight: 3,
          opacity: 0.95,
          fillColor: '#10b981',
          fillOpacity: 0.16,
        }
      ).addTo(group);
    }

    if (polylinePaths && polylinePaths.length >= 2 && polylinePaths.length < 3) {
      L.polyline(
        polylinePaths.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: '#ed0718',
          weight: 4,
          opacity: 0.95,
        }
      ).addTo(group);
    }

    if (routePaths && routePaths.length >= 2) {
      L.polyline(
        routePaths.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: '#ed0718',
          weight: 5,
          opacity: 0.9,
        }
      ).addTo(group);
    }

    const boundsPoints: [number, number][] = [];

    markers.forEach((m) => {
      boundsPoints.push([m.lat, m.lng]);
      const bg = m.color || '#ed0718';
      const glyph = m.emoji || '📍';
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
          <div style="background:${bg};color:#fff;border:2px solid #fff;border-radius:9999px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.35);">
            ${glyph}
          </div>
          ${
            m.label
              ? `<span style="margin-top:2px;background:rgba(16,27,41,0.9);color:#fff;font-size:10px;font-weight:800;padding:1px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${m.label}</span>`
              : ''
          }
        </div>
      `;

      const icon = L.divIcon({
        className: 'rodo-osm-pin',
        html,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([m.lat, m.lng], {
        icon,
        draggable: Boolean(m.draggable),
        title: m.title || '',
      }).addTo(group);

      if (m.title) {
        marker.bindTooltip(m.title, { direction: 'top', offset: [0, -28] });
      }

      if (m.draggable && m.onDragEnd) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          m.onDragEnd?.(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
        });
      }
    });

    if (fitBoundsToMarkers && boundsPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [36, 36], maxZoom: 16 });
    }
  }, [markers, polygonPaths, polylinePaths, routePaths, fitBoundsToMarkers]);

  return <div ref={containerRef} className={className} style={{ minHeight: '100%' }} />;
};
