import React, { useState } from 'react';
import {
  PILOT_30_ORDERS,
  executeSimulationAnalysis,
  SimulationOrder,
} from '../utils/pilotSimulation';
import { Order } from '../types';
import { createOrderInDb, generateUniqueTicketFolio } from '../services/db';
import { showSystemAlert } from './SystemDialogHost';
import {
  X,
  Play,
  CheckCircle,
  AlertTriangle,
  Bike,
  Banknote,
  DollarSign,
  TrendingUp,
  Layers,
  Zap,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Database,
  Filter,
} from 'lucide-react';

interface PilotSimulationModalProps {
  onClose: () => void;
  onRefreshOrders?: () => void;
}

export const PilotSimulationModal: React.FC<PilotSimulationModalProps> = ({
  onClose,
  onRefreshOrders,
}) => {
  const [activePhaseFilter, setActivePhaseFilter] = useState<'todas' | 'fase1' | 'fase2' | 'fase3' | 'fase4' | 'fase5'>('todas');
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectionSuccess, setInjectionSuccess] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(1);

  const analysis = executeSimulationAnalysis();

  const filteredOrders = PILOT_30_ORDERS.filter((o) => {
    if (activePhaseFilter === 'todas') return true;
    if (activePhaseFilter === 'fase1') return o.index <= 2;
    if (activePhaseFilter === 'fase2') return o.index >= 3 && o.index <= 10;
    if (activePhaseFilter === 'fase3') return o.index >= 11 && o.index <= 15;
    if (activePhaseFilter === 'fase4') return o.index >= 16 && o.index <= 20;
    if (activePhaseFilter === 'fase5') return o.index >= 21 && o.index <= 30;
    return true;
  });

  const handleInjectOrdersToDatabase = async () => {
    setIsInjecting(true);
    setInjectionSuccess(false);

    try {
      for (const simOrder of PILOT_30_ORDERS) {
        const orderData: Order = {
          id: 'pilot-' + simOrder.index + '-' + Date.now().toString(36),
          folio: generateUniqueTicketFolio(),
          orderType: 'comida',
          customerId: `pilot-cust-${simOrder.index}`,
          customerName: simOrder.customerName,
          customerPhone: simOrder.customerPhone,
          restaurantId: 'rest-pilot',
          restaurantName: simOrder.restaurantName,
          restaurantDeliveryFee: simOrder.deliveryFee,
          restaurantCommissionRate: 15,
          items: simOrder.items.map((it, idx) => ({
            id: `item-${simOrder.index}-${idx}`,
            name: it.name,
            price: it.unitPrice,
            quantity: it.quantity,
            customizations: it.customizations,
          })),
          subtotal: simOrder.subtotal,
          deliveryFee: simOrder.deliveryFee,
          commissionAmount: simOrder.subtotal * 0.15,
          deliveryType: simOrder.deliveryType,
          tipPercentage: simOrder.tipPercentage,
          tipAmount: simOrder.tipAmount,
          total: simOrder.totalCash,
          paymentMethod: 'efectivo',
          paymentStatus: 'en_efectivo',
          deliveryAddress: `${simOrder.deliveryAddress} (${simOrder.colonia})`,
          deliveryNotes: `${simOrder.notes} [Paga con $${simOrder.changeNeededForBill || simOrder.totalCash}]`,
          status: simOrder.index % 3 === 0 ? 'entregado' : simOrder.index % 2 === 0 ? 'en_camino' : 'nuevo',
          createdAt: new Date(Date.now() - (31 - simOrder.index) * 180000).toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await createOrderInDb(orderData);
      }

      setInjectionSuccess(true);
      if (onRefreshOrders) {
        await onRefreshOrders();
      }
    } catch (err) {
      console.error(err);
      void showSystemAlert({
        title: 'Error en la simulación',
        message: 'No se pudieron inyectar las órdenes de prueba. Intenta nuevamente.',
        tone: 'error',
      });
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ed0718] flex items-center justify-center font-black text-white shadow-lg shadow-red-900/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white">
                  Prueba Piloto RODO · 30 Pedidos en Efectivo
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/30">
                  ESTRÉS & CONCURRENCIA
                </span>
              </div>
              <p className="text-xs text-gray-400">
                2 Detallados → Secuencial hasta 10 → 5 Simultáneos → 5 Simultáneos → 10 Simultáneos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen Métricas Clave */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-gray-900 text-white border-b border-gray-800 shrink-0 text-xs">
          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Volumen Efectivo</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
              ${analysis.totalVolumeCash.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-400 block">30 pagos en mano</span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Comida a Locales</span>
            <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
              ${analysis.totalSubtotalFood.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-400 block">A pagar en mostrador</span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Envíos</span>
            <span className="text-sm sm:text-base font-black text-cyan-300 font-mono">
              ${analysis.totalDeliveryFees.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-400 block">Fletes cobrados</span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Propinas Reparto</span>
            <span className="text-sm sm:text-base font-black text-rose-300 font-mono">
              ${analysis.totalTipsGiven.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-400 block">100% para motociclistas</span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[#ed0718]/20 p-2.5 rounded-lg border border-[#ed0718]/40">
            <span className="text-[10px] text-red-200 uppercase font-bold block">Margen Bruto RODO</span>
            <span className="text-sm sm:text-base font-black text-white font-mono">
              ${analysis.totalRodoCommission.toFixed(2)}
            </span>
            <span className="text-[10px] text-red-200 block">Envío + 15% comisión</span>
          </div>
        </div>

        {/* Barra de Acciones y Filtros */}
        <div className="p-3 bg-gray-100 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="font-bold text-gray-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Fases:
            </span>
            {[
              { id: 'todas', label: 'Todas (30)' },
              { id: 'fase1', label: 'Fase 1: 2 Detalladas' },
              { id: 'fase2', label: 'Fase 2: Secuenciales (3-10)' },
              { id: 'fase3', label: 'Fase 3: 5 Simultáneos (11-15)' },
              { id: 'fase4', label: 'Fase 4: 5 Simultáneos (16-20)' },
              { id: 'fase5', label: 'Fase 5: 10 en Pico (21-30)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePhaseFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-md font-bold transition whitespace-nowrap cursor-pointer ${
                  activePhaseFilter === tab.id
                    ? 'bg-[#101b29] text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInjectOrdersToDatabase}
              disabled={isInjecting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              {isInjecting ? 'Inyectando órdenes...' : 'Inyectar 30 al Panel en Vivo'}
            </button>
          </div>
        </div>

        {injectionSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-2 text-xs text-emerald-800 font-bold flex items-center justify-between px-4">
            <span>✅ Se inyectaron exitosamente las 30 órdenes piloto a la base de datos de RODO. Ya aparecen en el Despacho y Corte Diario.</span>
            <button onClick={() => setInjectionSuccess(false)} className="text-emerald-900 font-black">✕</button>
          </div>
        )}

        {/* Contenido Principal con Scroll: Diagnóstico de Fallas + Lista de Pedidos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
          
          {/* SECCIÓN 1: VULNERABILIDADES Y FALLAS DETECTADAS */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="font-black text-gray-900 text-sm sm:text-base">
                Diagnóstico de Fallas y Riesgos Detectados en la Prueba Piloto
              </h3>
            </div>
            <p className="text-xs text-gray-700 mb-3">
              Tras simular los 30 pedidos en efectivo y someter el flujo a ráfagas de 5 y 10 pedidos concurrentes, se identificaron <strong>6 fallas operativas y técnicas críticas</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {analysis.detectedVulnerabilities.map((v) => (
                <div
                  key={v.code}
                  className="bg-white p-3 rounded-lg border border-amber-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono font-black text-[10px] text-gray-500">{v.code}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          v.severity === 'CRÍTICA'
                            ? 'bg-red-600 text-white'
                            : v.severity === 'ALTA'
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {v.severity}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-gray-900 text-xs mb-1">{v.title}</h4>
                    <p className="text-gray-600 text-[11px] leading-relaxed mb-2">{v.description}</p>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-900 text-[11px]">
                    <strong className="block text-emerald-950 font-bold">Solución Recomendada:</strong>
                    {v.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECCIÓN 2: LISTADO DE LOS 30 PEDIDOS PILOTO */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ed0718]" />
                Desglose de Pedidos Simulados ({filteredOrders.length} de 30)
              </h3>
              <span className="text-xs text-gray-500">
                Todos con pago <strong>100% en Efectivo</strong>
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredOrders.map((ord) => {
                const isExpanded = expandedOrder === ord.index;
                return (
                  <div
                    key={ord.index}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-gray-300 transition"
                  >
                    <div
                      onClick={() => setExpandedOrder(isExpanded ? null : ord.index)}
                      className="p-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer bg-white hover:bg-gray-50/80"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-gray-900 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                          #{ord.index}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-gray-900 text-xs sm:text-sm">
                              {ord.customerName}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {ord.phase}
                            </span>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              {ord.colonia}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            🏪 <b>{ord.restaurantName}</b> → 📍 {ord.deliveryAddress}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-[#ed0718] block">
                            ${ord.totalCash.toFixed(2)} MXN
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Billete: ${ord.changeNeededForBill || ord.totalCash} (Efectivo)
                          </span>
                        </div>
                        <span className="text-gray-400 text-xs">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 bg-gray-50 border-t border-gray-200 text-xs space-y-3">
                        {/* Desglose de platillos */}
                        <div>
                          <span className="font-bold text-gray-700 block mb-1">
                            🛒 Platillos y Extras:
                          </span>
                          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-gray-200">
                            {ord.items.map((it, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-gray-900">{it.quantity}x {it.name}</span>
                                  {it.customizations && it.customizations.length > 0 && (
                                    <div className="text-[10px] text-[#ed0718] font-semibold pl-2">
                                      ↳ {it.customizations.join(', ')}
                                    </div>
                                  )}
                                </div>
                                <span className="font-mono text-gray-700 font-bold">
                                  ${(it.unitPrice * it.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Desglose de Cobro en Efectivo */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-lg border border-gray-200">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold block">Subtotal Comida:</span>
                            <span className="font-mono font-bold text-gray-900">${ord.subtotal.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold block">Flete Envío:</span>
                            <span className="font-mono font-bold text-gray-900">${ord.deliveryFee.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold block">Propina ({ord.tipPercentage}%):</span>
                            <span className="font-mono font-bold text-emerald-700">${ord.tipAmount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold block">Repartidor Asignado:</span>
                            <span className="font-bold text-gray-900">{ord.assignedRider}</span>
                          </div>
                        </div>

                        {/* Notas y Cambio */}
                        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-950 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <strong>Instrucciones de ruta:</strong> {ord.notes}
                          </div>
                          <div className="bg-white px-2 py-1 rounded font-bold border border-amber-300 text-amber-900">
                            💵 Cobro en efectivo con billete de: <b>${ord.changeNeededForBill} MXN</b>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between shrink-0 text-xs">
          <div className="text-gray-500">
            Prueba piloto basada en topografía y colonias reales de San Miguel de Allende.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition cursor-pointer"
          >
            Cerrar Reporte Piloto
          </button>
        </div>

      </div>
    </div>
  );
};
