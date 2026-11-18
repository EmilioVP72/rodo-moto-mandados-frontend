import React, { useState, useEffect } from 'react';
import { AdminAuditLogEntry } from '../types';
import { getAdminAuditLogs, logAdminAction } from '../services/orderQueue';
import { subscribeToAdminAuditLogs, getAdminAuditLogsFromFirestore } from '../services/db';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Database,
  CheckCircle2,
} from 'lucide-react';

export const AdminAuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [filterType, setFilterType] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);

  const loadLogs = async () => {
    try {
      const dbLogs = await getAdminAuditLogsFromFirestore(150);
      const localLogs = getAdminAuditLogs();
      const map = new Map<string, AdminAuditLogEntry>();
      // Agregar primero de Firestore
      dbLogs.forEach((l) => map.set(l.id, l));
      // Completar con locales
      localLogs.forEach((l) => {
        if (!map.has(l.id)) map.set(l.id, l);
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLogs(merged);
    } catch {
      setLogs(getAdminAuditLogs());
    }
  };

  useEffect(() => {
    loadLogs();
    const unsubscribe = subscribeToAdminAuditLogs((dbLogs) => {
      setIsFirestoreConnected(true);
      const localLogs = getAdminAuditLogs();
      const map = new Map<string, AdminAuditLogEntry>();
      dbLogs.forEach((l) => map.set(l.id, l));
      localLogs.forEach((l) => {
        if (!map.has(l.id)) map.set(l.id, l);
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLogs(merged);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'todos' && log.actionType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchFolio = log.affectedFolio?.toLowerCase().includes(q);
      const matchRest = log.affectedRestaurant?.toLowerCase().includes(q);
      return matchDetails || matchFolio || matchRest;
    }
    return true;
  });

  const getActionBadge = (type: AdminAuditLogEntry['actionType']) => {
    switch (type) {
      case 'cambio_estatus':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-300">Cambio Estatus</span>;
      case 'ajuste_tarifa':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">Ajuste Tarifa</span>;
      case 'ajuste_sobreprecio':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">Sobreprecio</span>;
      case 'edicion_menu':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-300">Edición Menú</span>;
      case 'cancelacion':
        return <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-300">Cancelación</span>;
      case 'despacho_repartidor':
        return <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-cyan-300">Despacho</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-[10px] font-black px-2 py-0.5 rounded-full">Sistema</span>;
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Cabecera de Bitácora */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-900 text-white shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-sm sm:text-base">
              Bitácora de Auditoría Administrativa (Solo Edson)
            </h3>
            <p className="text-gray-500 text-[11px]">
              Registro inmutable de movimientos, tarifas, sobreprecios y cambios de estatus en tiempo real.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por folio, cliente, local o detalle..."
            className="w-full sm:w-72 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#ed0718]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-gray-500 shrink-0">Filtrar:</span>
          {['todos', 'cambio_estatus', 'ajuste_tarifa', 'ajuste_sobreprecio', 'edicion_menu', 'cancelacion'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition shrink-0 ${
                filterType === t
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs divide-y divide-gray-100">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-gray-300" />
            <p className="font-bold">No hay eventos que coincidan con la búsqueda.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const dateStr = new Date(log.timestamp).toLocaleString('es-MX', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div key={log.id} className="p-3.5 sm:p-4 hover:bg-gray-50/80 transition flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.actionType)}
                    {log.affectedFolio && (
                      <span className="font-mono font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {log.affectedFolio}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {dateStr}
                    </span>
                  </div>
                  <p className="text-gray-800 text-xs font-medium leading-relaxed">
                    {log.details}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-gray-500 font-bold block">
                    {log.adminEmail}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-mono font-bold">
                    Autenticado ✓
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
