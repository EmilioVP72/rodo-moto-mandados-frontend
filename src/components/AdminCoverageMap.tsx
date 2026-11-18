import React, { useState } from 'react';
import { CoverageZone, DispatchSettings } from '../types';
import { MapPin, Plus, Trash2, CheckCircle2, Shield, Navigation, AlertCircle, Compass } from 'lucide-react';
import { InteractiveMapPicker } from './InteractiveMapPicker';

interface AdminCoverageMapProps {
  settings: DispatchSettings;
  onSaveSettings: (updated: DispatchSettings) => Promise<void>;
}

export const DEFAULT_SMA_PERIMETER = [
  { lat: 20.9450, lng: -100.7480 }, // Salida a Dolores Hidalgo
  { lat: 20.9380, lng: -100.7300 }, // La Aurora / Alamedas
  { lat: 20.9200, lng: -100.7180 }, // Salida a Querétaro / Arcos
  { lat: 20.9080, lng: -100.7250 }, // Valle del Maíz / Mirador
  { lat: 20.8850, lng: -100.7600 }, // Los Frailes / Presa Allende
  { lat: 20.8920, lng: -100.7780 }, // La Lejona / Malanquín
  { lat: 20.9050, lng: -100.7650 }, // Salida a Celaya / Glorieta Pipila
  { lat: 20.9220, lng: -100.7600 }, // La Estación / San Rafael
  { lat: 20.9350, lng: -100.7550 }, // Libramiento Manuel Zavala
];

export const AdminCoverageMap: React.FC<AdminCoverageMapProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [zones, setZones] = useState<CoverageZone[]>(
    settings.coverageZones || [
      { id: 'zn-centro', name: 'Centro Histórico & El Chorro', active: true, radiusKm: 2.5, referenceStreet: 'Jardín Principal / Correo' },
      { id: 'zn-san-antonio', name: 'Colonia San Antonio & La Estación', active: true, radiusKm: 3.5, referenceStreet: 'Calle Ancha de San Antonio' },
      { id: 'zn-la-aurora', name: 'La Aurora & Guadalupe', active: true, radiusKm: 3.8, referenceStreet: 'Calzada de la Aurora' },
      { id: 'zn-san-rafael', name: 'San Rafael & Olimpo', active: true, radiusKm: 4.2, referenceStreet: 'Avenida Ignacio Ramírez' },
      { id: 'zn-lejona', name: 'La Lejona & Fraccionamiento La Luz', active: true, radiusKm: 5.5, referenceStreet: 'Boulevard de la Conspiración' },
      { id: 'zn-frailes', name: 'Los Frailes & Presa', active: true, radiusKm: 6.8, referenceStreet: 'Avenida Los Frailes' },
    ]
  );

  // Trazado perimetral con raya / polígono (de la orilla para adentro es cobertura)
  const [polygonPoints, setPolygonPoints] = useState<{ lat: number; lng: number }[]>(
    settings.coveragePolygon && settings.coveragePolygon.length > 0
      ? settings.coveragePolygon
      : DEFAULT_SMA_PERIMETER
  );
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneStreet, setNewZoneStreet] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState(3.0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showStatus = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleToggleZone = (zoneId: string) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, active: !z.active } : z))
    );
  };

  const handleDeleteZone = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    showStatus('Zona eliminada del catálogo.');
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim() || !newZoneStreet.trim()) {
      showStatus('Ingresa el nombre de la colonia y la calle de referencia.', true);
      return;
    }

    const newZone: CoverageZone = {
      id: 'zn-' + Math.random().toString(36).substring(2, 8),
      name: newZoneName.trim(),
      referenceStreet: newZoneStreet.trim(),
      radiusKm: Number(newZoneRadius) || 3.0,
      active: true,
    };

    setZones([...zones, newZone]);
    setNewZoneName('');
    setNewZoneStreet('');
    setNewZoneRadius(3.0);
    showStatus(`Colonia "${newZone.name}" agregada con éxito.`);
  };

  const handlePointAdd = (pt: { lat: number; lng: number }) => {
    setPolygonPoints((prev) => [...prev, pt]);
    showStatus(`Punto #${polygonPoints.length + 1} marcado en el límite.`);
  };

  const handleUndoPoint = () => {
    setPolygonPoints((prev) => prev.slice(0, -1));
    showStatus('Último punto del límite retirado.');
  };

  const handleResetToDefaultPerimeter = () => {
    setPolygonPoints(DEFAULT_SMA_PERIMETER);
    showStatus('Perímetro oficial de San Miguel de Allende restaurado.');
  };

  const handleClearPerimeter = () => {
    setPolygonPoints([]);
    showStatus('Raya perimetral borrada. Puedes comenzar a marcar puntos.');
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        ...settings,
        coverageZones: zones,
        coveragePolygon: polygonPoints,
      });
      setSavedSuccess(true);
      showStatus('¡Límites perimetrales y mapa de cobertura guardados exitosamente!');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      showStatus('Error al guardar mapa de cobertura.', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#ed0718]" />
            Mapa y Perímetro de Cobertura en San Miguel de Allende
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Define qué colonias, fraccionamientos y calles cuentan con servicio activo de motomandados y repartidores RODO.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-[#ed0718] hover:bg-red-700 text-white font-black text-xs py-2.5 px-5 rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSaving ? 'Guardando...' : 'Guardar Cobertura'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ¡Zonas de cobertura de San Miguel de Allende actualizadas exitosamente!
        </div>
      )}

      {/* Representación Visual Interactiva del Mapa de San Miguel */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 p-4 text-white shadow-xl relative">
        <div className="flex items-center justify-between mb-3 text-xs border-b border-gray-800 pb-2">
          <span className="font-bold text-gray-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Visor Satelital de Cobertura (Coordenadas: 20.9144, -100.7437 · SMA, GTO)
          </span>
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-black">
            {zones.filter((z) => z.active).length} Zonas Habilitadas
          </span>
        </div>

        {/* Barra de Control de Trazado de Raya Perimetral */}
        <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl mb-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isDrawingMode
                    ? 'bg-[#ed0718] text-white ring-2 ring-red-400'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{isDrawingMode ? '✏️ Modo Trazar ACTIVO' : '✏️ Trazar Raya de Cobertura'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefaultPerimeter}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
                title="Cargar polígono perimetral con todas las salidas principales de San Miguel"
              >
                🎯 Perímetro Oficial SMA
              </button>

              {polygonPoints.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoPoint}
                  className="bg-slate-700 hover:bg-slate-600 text-amber-300 text-xs font-bold px-2.5 py-1.5 rounded-xl transition"
                  title="Eliminar último punto marcado"
                >
                  ↩️ Deshacer punto
                </button>
              )}

              {polygonPoints.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearPerimeter}
                  className="bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold px-2.5 py-1.5 rounded-xl transition"
                  title="Borrar todo el trazado"
                >
                  🗑️ Limpiar raya
                </button>
              )}
            </div>

            <div className="text-[11px] text-gray-300">
              <span className="font-mono font-bold text-emerald-400">
                {polygonPoints.length} vértices en la raya perimetral
              </span>
            </div>
          </div>

          <div className="text-[11px] text-gray-300 flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="text-[#ed0718] font-bold">●</span>
            <span>
              <b>Regla de Cobertura:</b> De la raya perimetral hacia adentro el servicio está 100% activo (área verde). Fuera de la raya no hay cobertura de entrega normal.
            </span>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-bold mb-3 flex items-center gap-2 animate-in fade-in ${
              statusMessage.isError
                ? 'bg-red-900/80 text-red-100 border border-red-700'
                : 'bg-emerald-900/80 text-emerald-100 border border-emerald-700'
            }`}
          >
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Mapa Real de Google Maps con todas las calles de San Miguel de Allende */}
        <div className="bg-white rounded-xl overflow-hidden p-2">
          <InteractiveMapPicker
            initialLat={20.9144}
            initialLng={-100.7437}
            localName="Centro de Despacho RODO"
            heightClass="h-80 sm:h-96"
            coveragePolygon={polygonPoints}
            isDrawingPolygon={isDrawingMode}
            onPolygonPointAdd={handlePointAdd}
            onLocationSelect={(loc) => {
              if (loc.address) {
                setNewZoneStreet(loc.address);
                if (!newZoneName) {
                  const parts = loc.address.split(',');
                  setNewZoneName(parts[0] || 'Nueva Zona SMA');
                }
              }
            }}
          />
        </div>

        {/* Lista interactiva de zonas registradas para pausar/activar con 1 clic */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="font-bold">Colonias y Límites de Cobertura RODO:</span>
            <span className="text-[11px] text-gray-400">Toca para activar o pausar en tiempo real</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => handleToggleZone(zone.id)}
                className={`p-2 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between gap-1.5 cursor-pointer ${
                  zone.active
                    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-100 hover:bg-emerald-900'
                    : 'bg-red-950/80 border-red-500/60 text-red-300 opacity-60 hover:opacity-100'
                }`}
                title={`Clic para ${zone.active ? 'pausar' : 'activar'} cobertura en esta zona`}
              >
                <div className="min-w-0">
                  <span className="block truncate">{zone.name}</span>
                  <span className="text-[10px] text-gray-400 font-normal truncate block">
                    {zone.referenceStreet} ({zone.radiusKm} km)
                  </span>
                </div>
                <span className="text-sm shrink-0">{zone.active ? '🟢' : '🔴'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agregar Nueva Zona */}
      <form
        onSubmit={handleAddZone}
        className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3"
      >
        <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#ed0718]" />
          Registrar Nueva Colonia o Zona de Cobertura
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la Colonia / Zona:</label>
            <input
              type="text"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              placeholder="Ej. Fracc. Los Balcones, Malanquín..."
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#ed0718]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Calle o Cruce de Referencia:</label>
            <input
              type="text"
              value={newZoneStreet}
              onChange={(e) => setNewZoneStreet(e.target.value)}
              placeholder="Ej. Salida Real a Querétaro / Libramiento"
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#ed0718]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Radio Máximo (Kilómetros):</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.5"
                min="1"
                max="25"
                value={newZoneRadius}
                onChange={(e) => setNewZoneRadius(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-[#ed0718]"
              />
              <button
                type="submit"
                className="bg-[#101b29] hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black shrink-0 transition"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Lista de Zonas Administrables */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center text-xs font-black text-gray-700">
          <span>COLONIA / POLÍGONO ({zones.length})</span>
          <span>CALLE REFERENCIA</span>
          <span>RADIO</span>
          <span>ESTADO</span>
          <span>ACCIÓN</span>
        </div>

        <div className="divide-y divide-gray-100">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2.5 flex-1">
                <span className={`w-3 h-3 rounded-full ${zone.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                  <strong className="text-gray-900 font-extrabold text-sm block">{zone.name}</strong>
                  <span className="text-gray-500 text-[11px]">{zone.referenceStreet}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 font-bold">
                  {zone.radiusKm} km
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleZone(zone.id)}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                    zone.active
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {zone.active ? '✅ En Servicio' : '⏸️ Sin Cobertura'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteZone(zone.id)}
                  className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                  title="Eliminar zona"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
