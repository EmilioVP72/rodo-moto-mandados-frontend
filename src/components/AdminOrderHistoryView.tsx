import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order } from '../types';
import { apiFetch } from '../api/httpClient';
import {
  AdminOrderHistoryFilters,
  DEFAULT_ADMIN_HISTORY_FILTERS,
  filterAdminHistoricalOrders,
  computeOrderHistorySummary,
  isOrderWithinLast24Hours,
  buildOrdersCsvContent,
} from '../utils/orderHistoryFilter';
import {
  Archive,
  Search,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  CreditCard,
  Bike,
  User,
  MapPin,
  Star,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface AdminOrderHistoryViewProps {
  fallbackOrders: Order[];
  onOpenTicket: (order: Order) => void;
}

interface OrderHistoryApiResponse {
  orders: (Order & {
    statusHistory?: Array<{
      id: string;
      previousStatus?: string | null;
      newStatus: string;
      changedBy?: string | null;
      note?: string | null;
      createdAt: string;
    }>;
  })[];
}

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  entregado: { label: 'Entregado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-200' },
  cancelado_con_deuda: { label: 'Cancelado c/ Deuda', className: 'bg-rose-200 text-rose-950 border-rose-300' },
  nuevo: { label: 'Nuevo', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  pendiente_cotizacion: { label: 'Cotizando', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  en_preparacion: { label: 'En Preparación', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  asignado: { label: 'Asignado', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  recolectado: { label: 'Recolectado', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  en_camino: { label: 'En Camino', className: 'bg-sky-100 text-sky-900 border-sky-200' },
  afuera_del_domicilio: { label: 'Afuera (10 min)', className: 'bg-red-600 text-white border-red-700' },
};

function formatDateInputLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const AdminOrderHistoryView: React.FC<AdminOrderHistoryViewProps> = ({
  fallbackOrders,
  onOpenTicket,
}) => {
  const [historicalOrders, setHistoricalOrders] = useState<OrderHistoryApiResponse['orders']>(
    fallbackOrders as OrderHistoryApiResponse['orders']
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [filters, setFilters] = useState<AdminOrderHistoryFilters>(DEFAULT_ADMIN_HISTORY_FILTERS);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  const loadHistoryFromServer = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch<OrderHistoryApiResponse>('/api/admin/orders/history?limit=1000');
      if (Array.isArray(res?.orders)) {
        setHistoricalOrders(res.orders);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Mostrando respaldo local mientras reconecta el historial.');
      setHistoricalOrders(fallbackOrders as OrderHistoryApiResponse['orders']);
    } finally {
      setLoading(false);
    }
  }, [fallbackOrders]);

  useEffect(() => {
    loadHistoryFromServer();
  }, [loadHistoryFromServer]);

  const availableRiders = useMemo(() => {
    const set = new Set<string>();
    historicalOrders.forEach((o) => {
      if (o.assignedRiderName && o.assignedRiderName.trim()) {
        set.add(o.assignedRiderName.trim());
      }
    });
    return Array.from(set).sort();
  }, [historicalOrders]);

  const filteredOrders = useMemo(
    () => filterAdminHistoricalOrders(historicalOrders, filters),
    [historicalOrders, filters]
  );

  const summary = useMemo(() => computeOrderHistorySummary(filteredOrders), [filteredOrders]);

  const applyQuickRange = (preset: 'todos' | 'archivados_24h' | 'hoy' | '7d' | '30d') => {
    const now = new Date();
    if (preset === 'todos') {
      setFilters((prev) => ({ ...prev, scope: 'todos', dateFrom: '', dateTo: '' }));
    } else if (preset === 'archivados_24h') {
      setFilters((prev) => ({ ...prev, scope: 'archivados_24h', dateFrom: '', dateTo: '' }));
    } else if (preset === 'hoy') {
      const today = formatDateInputLocal(now);
      setFilters((prev) => ({ ...prev, scope: 'todos', dateFrom: today, dateTo: today }));
    } else if (preset === '7d') {
      const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setFilters((prev) => ({
        ...prev,
        scope: 'todos',
        dateFrom: formatDateInputLocal(start),
        dateTo: formatDateInputLocal(now),
      }));
    } else if (preset === '30d') {
      const start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      setFilters((prev) => ({
        ...prev,
        scope: 'todos',
        dateFrom: formatDateInputLocal(start),
        dateTo: formatDateInputLocal(now),
      }));
    }
  };

  const handleExportCsv = () => {
    const csv = buildOrdersCsvContent(filteredOrders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rodo_historico_pedidos_${formatDateInputLocal(new Date())}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  return (
    <div className="space-y-4">
      {/* Encabezado del Registro Histórico */}
      <div className="bg-[#101b29] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#ed0718] text-white shrink-0">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base tracking-wide">
              Registro Histórico Permanente de Pedidos (Solo Administrador)
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">
              Los pedidos desaparecen de Despacho en Vivo después de 24 horas para mantener la operación limpia, pero aquí se conservan permanentemente con sus estatus finales y auditoría completa.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadHistoryFromServer}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredOrders.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPIs Resumen según filtros activos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-gray-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-500 block">Pedidos Filtrados</span>
          <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5 font-mono">
            {summary.totalCount}
          </div>
          <span className="text-[11px] text-gray-500">
            {summary.archivedCount} archivados (+24h)
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-gray-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-500 block">Estatus Finales</span>
          <div className="flex items-center gap-2.5 mt-1 text-xs font-black">
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {summary.deliveredCount}
            </span>
            <span className="text-red-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {summary.cancelledCount}
            </span>
            <span className="text-blue-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {summary.activeCount}
            </span>
          </div>
          <span className="text-[10px] text-gray-500 block mt-1">
            Entregados · Cancelados · En curso
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-gray-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-500 block">Volumen (No Cancelados)</span>
          <div className="text-lg sm:text-xl font-black text-[#ed0718] mt-0.5 font-mono">
            ${summary.totalRevenue.toFixed(2)}
          </div>
          <span className="text-[10px] text-gray-500">
            Envíos: ${summary.totalDeliveryFees.toFixed(0)} · Comis: ${summary.totalCommissions.toFixed(0)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-gray-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-500 block">Efectivo vs SPEI</span>
          <div className="text-xs font-black mt-1 space-y-0.5 font-mono">
            <div className="text-emerald-700 dark:text-emerald-400">
              💵 ${summary.cashTotal.toFixed(2)}
            </div>
            <div className="text-blue-700 dark:text-blue-400">
              💳 ${summary.transferTotal.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Filtros Avanzados */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-gray-200 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Chips de rango rápido */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[11px] font-black uppercase text-gray-500 flex items-center gap-1 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#ed0718]" /> Filtros:
            </span>
            {(
              [
                { id: 'todos', label: 'Todo el historial' },
                { id: 'archivados_24h', label: '📦 Archivados (+24h)' },
                { id: 'hoy', label: 'Hoy' },
                { id: '7d', label: 'Últimos 7 días' },
                { id: '30d', label: 'Últimos 30 días' },
              ] as const
            ).map((preset) => {
              const isActive =
                (preset.id === 'archivados_24h' && filters.scope === 'archivados_24h') ||
                (preset.id === 'todos' && filters.scope === 'todos' && !filters.dateFrom && !filters.dateTo);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyQuickRange(preset.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#101b29] text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setFilters(DEFAULT_ADMIN_HISTORY_FILTERS)}
            className="text-xs font-bold text-[#ed0718] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        </div>

        {/* Buscador y Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="sm:col-span-2 relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar folio, cliente, teléfono, local, SPEI..."
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
            />
          </div>

          <select
            aria-label="Filtrar por estatus final"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 outline-none focus:border-[#ed0718]"
          >
            <option value="todos">Estatus: Todos</option>
            <option value="entregado">✅ Entregado</option>
            <option value="cancelados_todos">❌ Todos los Cancelados</option>
            <option value="cancelado">❌ Cancelado</option>
            <option value="cancelado_con_deuda">⛔ Cancelado con Deuda</option>
            <option value="activos">🏍️ En Curso / Activos</option>
            <option value="nuevo">🆕 Nuevo</option>
            <option value="en_preparacion">👨‍🍳 En Preparación</option>
            <option value="asignado">📋 Asignado</option>
            <option value="en_camino">🚀 En Camino</option>
          </select>

          <select
            aria-label="Filtrar por método de pago"
            value={filters.paymentMethod}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, paymentMethod: e.target.value as any }))
            }
            className="border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 outline-none focus:border-[#ed0718]"
          >
            <option value="todos">Pago: Todos</option>
            <option value="efectivo">💵 Efectivo</option>
            <option value="transferencia">💳 Transferencia SPEI</option>
          </select>

          <select
            aria-label="Filtrar por tipo de pedido"
            value={filters.orderType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, orderType: e.target.value as any }))
            }
            className="border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 outline-none focus:border-[#ed0718]"
          >
            <option value="todos">Tipo: Todos</option>
            <option value="comida">🍔 Comida / Local</option>
            <option value="envio">📦 Envío Express</option>
            <option value="solicitud_local">🏪 Local Asociado</option>
            <option value="auxilio_gasolina">⛽ Auxilio Gasolina</option>
          </select>

          <select
            aria-label="Filtrar por repartidor"
            value={filters.rider}
            onChange={(e) => setFilters((prev) => ({ ...prev, rider: e.target.value }))}
            className="border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 outline-none focus:border-[#ed0718]"
          >
            <option value="todos">Repartidor: Todos</option>
            <option value="sin_asignar">Sin repartidor asignado</option>
            {availableRiders.map((rider) => (
              <option key={rider} value={rider}>
                🏍️ {rider}
              </option>
            ))}
          </select>
        </div>

        {/* Rango de fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="shrink-0">Desde:</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, scope: 'todos', dateFrom: e.target.value }))
              }
              className="flex-1 border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[#ed0718]"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="shrink-0">Hasta:</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, scope: 'todos', dateTo: e.target.value }))
              }
              className="flex-1 border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[#ed0718]"
            />
          </label>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-xl text-xs font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Lista de Pedidos Históricos */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#ed0718]" />
          <span>Cargando registro histórico completo desde PostgreSQL...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-gray-200 dark:border-slate-800 text-center space-y-2">
          <Archive className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
            No se encontraron pedidos con los filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_ADMIN_HISTORY_FILTERS)}
            className="text-xs font-black text-[#ed0718] hover:underline cursor-pointer"
          >
            Mostrar todo el histórico
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = !!expandedOrderIds[order.id];
            const isRecent = isOrderWithinLast24Hours(order.createdAt);
            const statusInfo = STATUS_BADGE_MAP[order.status] || {
              label: order.status.replace(/_/g, ' '),
              className: 'bg-gray-100 text-gray-800 border-gray-200',
            };
            const historyTrail = (order as any).statusHistory as
              | Array<{
                  id: string;
                  previousStatus?: string | null;
                  newStatus: string;
                  changedBy?: string | null;
                  note?: string | null;
                  createdAt: string;
                }>
              | undefined;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs overflow-hidden"
              >
                {/* Resumen principal */}
                <div className="p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-black text-xs bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700">
                        {order.folio}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isRecent
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {isRecent ? '⏱️ Últimas 24h' : '📦 Archivado (+24h)'}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {new Date(order.createdAt).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-black font-mono text-[#ed0718] leading-none">
                          ${Number(order.total || 0).toFixed(2)} MXN
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {order.paymentMethod === 'transferencia' ? '💳 SPEI' : '💵 Efectivo'} ·{' '}
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Datos clave */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-gray-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-gray-400 block">
                        Establecimiento / Tipo
                      </span>
                      <strong className="text-gray-900 dark:text-white truncate block">
                        {order.restaurantName}
                      </strong>
                      <span className="text-[10px] text-gray-500 capitalize">
                        {(order.orderType || 'comida').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3" /> Cliente
                      </span>
                      <strong className="text-gray-900 dark:text-white truncate block">
                        {order.customerName}
                      </strong>
                      <span className="text-[11px] text-gray-500 font-mono">
                        {order.customerPhone}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                        <Bike className="w-3 h-3" /> Repartidor & Entrega
                      </span>
                      <strong className="text-gray-900 dark:text-white truncate block">
                        {order.assignedRiderName || 'Sin asignar'}
                      </strong>
                      <span className="text-[11px] text-gray-500 truncate block">
                        {order.deliveryAddress}
                      </span>
                    </div>
                  </div>

                  {/* Barra de acciones de la tarjeta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
                      className="text-xs font-black text-[#101b29] dark:text-gray-200 hover:text-[#ed0718] flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Ocultar detalle completo</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>
                            Ver detalle completo ({(order.items || []).length} artículos
                            {historyTrail && historyTrail.length > 0
                              ? ` · ${historyTrail.length} eventos`
                              : ''}
                            )
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenTicket(order)}
                      className="bg-[#101b29] hover:bg-black text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Ver Ticket</span>
                    </button>
                  </div>
                </div>

                {/* Detalle Expandido: Artículos, Finanzas, Pago, Calificación y Línea de Tiempo */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/60 p-3.5 sm:p-4 space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Artículos */}
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 space-y-1.5">
                        <h4 className="font-black text-[11px] uppercase text-gray-500">
                          Detalle de Artículos
                        </h4>
                        {(order.items || []).length === 0 ? (
                          <p className="text-gray-400">Sin artículos detallados.</p>
                        ) : (
                          <ul className="space-y-1">
                            {(order.items || []).map((it, idx) => (
                              <li
                                key={`${it.id}-${idx}`}
                                className="flex items-start justify-between gap-2 border-b last:border-b-0 border-gray-100 dark:border-slate-800 pb-1 last:pb-0"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {it.quantity}x {it.name}
                                  </span>
                                  {it.notes && (
                                    <span className="block text-[10px] text-gray-500">
                                      Nota: {it.notes}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                  ${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Desglose Financiero y Pago */}
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 space-y-1.5">
                        <h4 className="font-black text-[11px] uppercase text-gray-500">
                          Desglose Financiero & Pago
                        </h4>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Subtotal:</span>
                          <strong className="font-mono">${Number(order.subtotal || 0).toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Envío:</span>
                          <strong className="font-mono">${Number(order.deliveryFee || 0).toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Comisión RODO:</span>
                          <strong className="font-mono">${Number(order.commissionAmount || 0).toFixed(2)}</strong>
                        </div>
                        {order.discountAmount ? (
                          <div className="flex justify-between text-emerald-700">
                            <span>Descuento ({order.promoCode || 'Promo'}):</span>
                            <strong className="font-mono">-${Number(order.discountAmount).toFixed(2)}</strong>
                          </div>
                        ) : null}
                        <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-slate-800 text-sm font-black">
                          <span>Total:</span>
                          <span className="font-mono text-[#ed0718]">
                            ${Number(order.total || 0).toFixed(2)} MXN
                          </span>
                        </div>
                        <div className="pt-1 text-[11px] text-gray-600 dark:text-gray-400 space-y-0.5">
                          <div className="flex items-center gap-1">
                            {order.paymentMethod === 'transferencia' ? (
                              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>
                              Método: <b>{order.paymentMethod}</b> ({order.paymentStatus})
                            </span>
                          </div>
                          {order.bankVerification?.trackingKey && (
                            <div className="font-mono text-[10px] text-blue-700 dark:text-blue-300">
                              Clave SPEI: {order.bankVerification.trackingKey}
                            </div>
                          )}
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#ed0718] shrink-0 mt-0.5" />
                            <span>{order.deliveryAddress}</span>
                          </div>
                          {order.deliveryNotes && (
                            <div className="text-[10px] text-gray-500">
                              Notas: {order.deliveryNotes}
                            </div>
                          )}
                          {order.cancellationReason && (
                            <div className="text-[11px] text-red-700 font-bold">
                              Motivo cancelación: {order.cancellationReason}
                            </div>
                          )}
                          {(order.rating || order.riderRating || order.foodRating) && (
                            <div className="flex items-center gap-1 text-amber-600 font-bold pt-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span>
                                Calificación: {order.rating || order.riderRating}/5
                                {order.ratingComment ? ` — "${order.ratingComment}"` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Línea de Tiempo de Estatus */}
                    {historyTrail && historyTrail.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 space-y-2">
                        <h4 className="font-black text-[11px] uppercase text-gray-500">
                          Auditoría de Cambios de Estatus
                        </h4>
                        <div className="space-y-1.5">
                          {historyTrail.map((ev) => (
                            <div
                              key={ev.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-[11px] border-l-2 border-[#ed0718] pl-2.5 py-0.5"
                            >
                              <div>
                                <span className="font-black uppercase text-gray-900 dark:text-white">
                                  {ev.previousStatus
                                    ? `${ev.previousStatus.replace(/_/g, ' ')} → ${ev.newStatus.replace(/_/g, ' ')}`
                                    : ev.newStatus.replace(/_/g, ' ')}
                                </span>
                                {ev.note && (
                                  <span className="text-gray-500 ml-1.5">· {ev.note}</span>
                                )}
                                {ev.changedBy && (
                                  <span className="text-gray-400 ml-1.5">({ev.changedBy})</span>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-gray-400">
                                {new Date(ev.createdAt).toLocaleString('es-MX', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
