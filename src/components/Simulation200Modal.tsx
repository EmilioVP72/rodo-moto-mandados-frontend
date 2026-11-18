import React, { useState, useMemo } from 'react';
import {
  GENERATED_200_ORDERS,
  computeSimulation200Metrics,
  inject200SimulationOrders,
  Simulation200OrderData,
} from '../utils/simulation200';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Bike,
  Banknote,
  DollarSign,
  TrendingUp,
  Layers,
  Zap,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Database,
  Calendar,
  Sparkles,
  RefreshCw,
  Eye,
  UserCheck,
} from 'lucide-react';

interface Simulation200ModalProps {
  onClose: () => void;
  onRefreshOrders?: () => void;
}

export const Simulation200Modal: React.FC<Simulation200ModalProps> = ({
  onClose,
  onRefreshOrders,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedRider, setSelectedRider] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(1);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [injectionSuccess, setInjectionSuccess] = useState<boolean>(false);

  const metrics = useMemo(() => computeSimulation200Metrics(GENERATED_200_ORDERS), []);

  const filteredOrders = useMemo(() => {
    return GENERATED_200_ORDERS.filter((o) => {
      if (selectedCategory !== 'todos' && o.category !== selectedCategory) return false;
      if (selectedStatus !== 'todos' && o.status !== selectedStatus) return false;
      if (selectedRider !== 'todos' && o.assignedRiderName !== selectedRider) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = o.customerName.toLowerCase().includes(q);
        const matchCol = o.colonia.toLowerCase().includes(q);
        const matchRest = o.restaurantName.toLowerCase().includes(q);
        const matchItems = o.itemsSummary.toLowerCase().includes(q);
        const matchIne = o.customerIne.includes(q);
        const matchNotes = o.notes.toLowerCase().includes(q);
        if (!matchName && !matchCol && !matchRest && !matchItems && !matchIne && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, selectedStatus, selectedRider, searchTerm]);

  const handleInjectAll = async () => {
    setIsInjecting(true);
    setInjectionSuccess(false);
    try {
      await inject200SimulationOrders();
      setInjectionSuccess(true);
      if (onRefreshOrders) {
        await onRefreshOrders();
      }
    } catch (err) {
      console.error('Error al inyectar simulación de 200 órdenes:', err);
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#ed0718] flex items-center justify-center font-black text-white shadow-lg shadow-red-900/40">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-xl text-white tracking-wide">
                  Simulación de Prueba Real: 200 Pedidos
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  ESTRÉS MÁXIMO & DIAGNÓSTICO
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Comida · Envíos Exprés · Programados · Cotizaciones Personalizadas · Locales con PIN · 10 Repartidores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Panel de Métricas Globales del Estudio de 200 Pedidos */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-gray-950 text-white border-b border-gray-800 shrink-0 text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-black block">Total Órdenes</span>
            <span className="text-base font-black text-white font-mono">200 Pedidos</span>
            <span className="text-[10px] text-emerald-400 block font-bold">100% Cobertura SMA</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-black block">Volumen Bruto</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              ${metrics.totalVolume.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-300 block">Efectivo + SPEI</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-black block">Efectivo en Mano</span>
            <span className="text-base font-black text-amber-400 font-mono">
              ${metrics.totalCash.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-400 block">Requiere cambio</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-black block">Ingreso Envíos RODO</span>
            <span className="text-base font-black text-[#ed0718] font-mono">
              ${metrics.totalRodoDeliveryIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-400 block">Tarifas + Exprés</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-black block">Propinas Repartidores</span>
            <span className="text-base font-black text-blue-400 font-mono">
              ${metrics.totalTipsToRiders.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-400 block">10 motos activas</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-black block">Adeudos / Tolerancia</span>
            <span className="text-base font-black text-rose-400 font-mono">
              ${metrics.totalDebtsUnpaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-rose-300 block">Bloqueo INE antifraude</span>
          </div>
        </div>

        {/* Barra de Acciones y Botón de Inyección */}
        <div className="p-3 bg-amber-50/70 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-800">
              Mostrando <strong className="text-[#ed0718] font-black">{filteredOrders.length}</strong> de 200 pedidos simulados
            </span>
            {injectionSuccess && (
              <span className="bg-green-100 text-green-800 text-xs font-extrabold px-3 py-1 rounded-full border border-green-300 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                ¡Los 200 pedidos se inyectaron exitosamente al panel de administración!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInjectAll}
              disabled={isInjecting}
              className="bg-[#ed0718] hover:bg-red-700 text-white text-xs font-black py-2 px-5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isInjecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Inyectando 200 pedidos y cuentas INE...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Cargar y Activar 200 Pedidos en Panel Real
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filtros Interactivos */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs shrink-0">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, INE, colonia, artículo..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Categoría */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
            >
              <option value="todos">Todas las Categorías (200)</option>
              <option value="comida">Comida & Restaurantes ({metrics.countByCategory['comida'] || 0})</option>
              <option value="express">Mandados Exprés (+Tarifa Urgente) ({metrics.countByCategory['express'] || 0})</option>
              <option value="programado">Entregas Programadas ({metrics.countByCategory['programado'] || 0})</option>
              <option value="personalizado">Cotizaciones Personalizadas ({metrics.countByCategory['personalizado'] || 0})</option>
              <option value="local_asociado">Solicitudes Locales PIN ({metrics.countByCategory['local_asociado'] || 0})</option>
            </select>
          </div>

          {/* Estatus */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
            >
              <option value="todos">Todos los Estatus ({GENERATED_200_ORDERS.length})</option>
              <option value="nuevo">1. Nuevos / Recibidos ({metrics.countByStatus['nuevo'] || 0})</option>
              <option value="en_preparacion">2. En Preparación ({metrics.countByStatus['en_preparacion'] || 0})</option>
              <option value="asignado">3. Asignados a Repartidor ({metrics.countByStatus['asignado'] || 0})</option>
              <option value="en_camino">4. En Camino a Domicilio ({metrics.countByStatus['en_camino'] || 0})</option>
              <option value="afuera_del_domicilio">5. ¡Repartidor Afuera! (10 min) ({metrics.countByStatus['afuera_del_domicilio'] || 0})</option>
              <option value="entregado">6. Entregados Exitosos ({metrics.countByStatus['entregado'] || 0})</option>
              <option value="cancelado">7. Cancelados ({metrics.countByStatus['cancelado'] || 0})</option>
              <option value="cancelado_con_deuda">8. Cancelados con Deuda INE ({metrics.countByStatus['cancelado_con_deuda'] || 0})</option>
              <option value="pendiente_cotizacion">9. Pendiente Cotización ({metrics.countByStatus['pendiente_cotizacion'] || 0})</option>
            </select>
          </div>

          {/* Repartidor */}
          <div>
            <select
              value={selectedRider}
              onChange={(e) => setSelectedRider(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
            >
              <option value="todos">Todos los Repartidores (10 motos)</option>
              {Object.keys(metrics.countByRider).map((riderName) => (
                <option key={riderName} value={riderName}>
                  {riderName} ({metrics.countByRider[riderName]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Órdenes */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-gray-100 space-y-2">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-bold text-sm">No se encontraron órdenes con los filtros seleccionados.</p>
            </div>
          ) : (
            filteredOrders.map((o) => {
              const isExpanded = expandedIndex === o.index;
              return (
                <div
                  key={o.index}
                  className="bg-white rounded-2xl border border-gray-200 p-3 hover:border-gray-300 transition shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="w-8 h-8 rounded-xl bg-gray-100 text-gray-900 font-mono font-black text-xs flex items-center justify-center">
                        #{o.index}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs sm:text-sm font-extrabold text-gray-900">
                            {o.customerName}
                          </strong>
                          <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            INE: {o.customerIne}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {o.restaurantName} → <span className="font-semibold text-gray-700">{o.colonia}</span> ({o.distanceKm} km)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        o.status === 'entregado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'afuera_del_domicilio'
                          ? 'bg-red-500 text-white animate-pulse'
                          : o.status === 'cancelado_con_deuda'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : o.status === 'pendiente_cotizacion'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status}
                      </span>

                      <span className="font-mono font-black text-xs text-gray-900">
                        ${o.total.toFixed(2)} MXN
                      </span>

                      <button
                        onClick={() => setExpandedIndex(isExpanded ? null : o.index)}
                        className="text-xs text-gray-500 hover:text-black font-bold px-2 py-1 bg-gray-100 rounded-lg cursor-pointer"
                      >
                        {isExpanded ? 'Ocultar' : 'Ver Detalle'}
                      </button>
                    </div>
                  </div>

                  {/* Resumen en 1 línea */}
                  <p className="text-xs text-gray-600 mt-1.5 line-clamp-1">
                    📦 <span className="font-medium">{o.itemsSummary}</span>
                  </p>

                  {/* Detalle Desplegado */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50/70 p-3 rounded-xl">
                      <div className="space-y-1.5">
                        <div>
                          <strong className="text-gray-700 block text-[10px] uppercase font-black">Dirección de Entrega:</strong>
                          <span className="text-gray-900 font-medium">{o.deliveryAddress}</span>
                        </div>
                        <div>
                          <strong className="text-gray-700 block text-[10px] uppercase font-black">Repartidor Asignado:</strong>
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            <Bike className="w-3.5 h-3.5 text-emerald-600" />
                            {o.assignedRiderName}
                          </span>
                        </div>
                        <div>
                          <strong className="text-gray-700 block text-[10px] uppercase font-black">Notas / Instrucciones:</strong>
                          <span className="text-gray-800 italic">{o.notes}</span>
                        </div>
                        {o.scheduledTime && (
                          <div className="text-amber-800 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Programado para: {o.scheduledTime}
                          </div>
                        )}
                        {o.status === 'afuera_del_domicilio' && (
                          <div className="p-2 bg-red-100 border border-red-300 text-red-900 rounded-lg text-xs font-black">
                            ⏱️ Cronómetro activo de 10 min. Tolerancia vence en 8 minutos.
                          </div>
                        )}
                        {o.status === 'cancelado_con_deuda' && (
                          <div className="p-2 bg-rose-100 border border-rose-300 text-rose-900 rounded-lg text-xs font-bold">
                            ⚠️ Deuda acumulada de ${o.cancellationDebtAmount?.toFixed(2)} MXN registrada al INE {o.customerIne}.
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-gray-200">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal Productos:</span>
                          <span className="font-mono font-bold">${o.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Tarifa de Envío RODO:</span>
                          <span className="font-mono font-bold">${o.deliveryFee.toFixed(2)}</span>
                        </div>
                        {o.expressSurcharge ? (
                          <div className="flex justify-between text-red-600 font-bold">
                            <span>Recargo Exprés Urgente:</span>
                            <span className="font-mono">+${o.expressSurcharge.toFixed(2)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between text-blue-600">
                          <span>Propina al Repartidor ({o.tipPercentage}%):</span>
                          <span className="font-mono font-bold">+${o.tipAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-1 font-black text-gray-900 text-xs">
                          <span>TOTAL:</span>
                          <span className="font-mono text-[#ed0718]">${o.total.toFixed(2)} MXN</span>
                        </div>
                        <div className="text-[10px] text-gray-500 pt-1">
                          Método de Pago: <strong className="capitalize">{o.paymentMethod}</strong> ({o.paymentStatus})
                          {o.changeNeededForBill && ` · Billete: $${o.changeNeededForBill}`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pie de modal */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600 shrink-0">
          <span>
            Verificación técnica: 200 órdenes · 10 repartidores · Matriz antifraude de 10 dígitos INE.
          </span>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-black text-white font-bold py-1.5 px-4 rounded-xl transition cursor-pointer"
          >
            Cerrar Simulación
          </button>
        </div>
      </div>
    </div>
  );
};
