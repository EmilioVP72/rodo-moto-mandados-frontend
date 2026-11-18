import React, { useState, useMemo } from 'react';
import { Order, Restaurant } from '../types';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  Bike,
  Heart,
  CreditCard,
  Banknote,
  Award,
  Calendar,
  Zap,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface OrderStatisticsViewProps {
  orders: Order[];
  restaurants?: Restaurant[];
  isCustomerView?: boolean;
  customerId?: string;
}

export const OrderStatisticsView: React.FC<OrderStatisticsViewProps> = ({
  orders,
  restaurants = [],
  isCustomerView = false,
  customerId,
}) => {
  const [timeRange, setTimeRange] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('todo');

  // Filtrar pedidos según el rango temporal y opcionalmente por cliente
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (isCustomerView && customerId) {
      list = list.filter((o) => o.customerId === customerId);
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return list.filter((o) => {
      if (!o.createdAt) return true;
      const orderDate = new Date(o.createdAt);
      const orderDateStr = o.createdAt.slice(0, 10);

      if (timeRange === 'hoy') {
        return orderDateStr === todayStr;
      }
      if (timeRange === 'semana') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      }
      if (timeRange === 'mes') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      }
      return true; // 'todo'
    });
  }, [orders, timeRange, isCustomerView, customerId]);

  // Cálculos estadísticos generales
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(
      (o) => o.status === 'entregado' || o.status === 'afuera_del_domicilio' || o.status === 'en_camino'
    );

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalSubtotal = filteredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const totalDeliveryFees = filteredOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    const totalCommission = filteredOrders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);

    // Separación estricta de propinas (Efectivo vs Transferencia)
    const cashTips = filteredOrders.reduce((sum, o) => {
      if (o.paymentMethod === 'efectivo') {
        return sum + (o.tipAmount || 0);
      }
      return sum;
    }, 0);

    const transferTips = filteredOrders.reduce((sum, o) => {
      if (o.paymentMethod === 'transferencia') {
        return sum + (o.tipAmount || 0);
      }
      return sum;
    }, 0);

    const totalTips = cashTips + transferTips;
    const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Métodos de pago
    const cashCount = filteredOrders.filter((o) => o.paymentMethod === 'efectivo').length;
    const transferCount = filteredOrders.filter((o) => o.paymentMethod === 'transferencia').length;

    // Modalidades de entrega
    const normalCount = filteredOrders.filter((o) => !o.deliveryType || o.deliveryType === 'normal').length;
    const expressCount = filteredOrders.filter((o) => o.deliveryType === 'express').length;
    const scheduledCount = filteredOrders.filter((o) => o.deliveryType === 'programada').length;

    // Descuentos en sobreprecio aprovechados
    const totalPromoSavings = filteredOrders.reduce((sum, o) => sum + (o.promoDiscountApplied || 0), 0);

    // Horas pico en San Miguel de Allende (0 a 23 hrs)
    const hourlyDistribution: Record<number, number> = {};
    for (let h = 8; h <= 23; h++) {
      hourlyDistribution[h] = 0;
    }
    filteredOrders.forEach((o) => {
      if (o.createdAt) {
        const h = new Date(o.createdAt).getHours();
        if (h >= 8 && h <= 23) {
          hourlyDistribution[h] = (hourlyDistribution[h] || 0) + 1;
        }
      }
    });

    // Top Locales / Restaurantes
    const restaurantCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    filteredOrders.forEach((o) => {
      const name = o.restaurantName || 'Local San Miguel';
      if (!restaurantCounts[name]) {
        restaurantCounts[name] = { name, count: 0, revenue: 0 };
      }
      restaurantCounts[name].count += 1;
      restaurantCounts[name].revenue += o.total || 0;
    });
    const topRestaurants = Object.values(restaurantCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top Platillos / Productos
    const itemCounts: Record<string, { name: string; count: number }> = {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const cleanName = it.name.split('(')[0].trim();
        if (!itemCounts[cleanName]) {
          itemCounts[cleanName] = { name: cleanName, count: 0 };
        }
        itemCounts[cleanName].count += it.quantity || 1;
      });
    });
    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      totalOrders,
      completedOrdersCount: completedOrders.length,
      totalRevenue,
      totalSubtotal,
      totalDeliveryFees,
      totalCommission,
      cashTips,
      transferTips,
      totalTips,
      avgTicket,
      cashCount,
      transferCount,
      normalCount,
      expressCount,
      scheduledCount,
      totalPromoSavings,
      hourlyDistribution,
      topRestaurants,
      topItems,
    };
  }, [filteredOrders]);

  // Encontrar la hora con mayor cantidad de pedidos para escalar la gráfica
  const maxOrdersInAnHour = Math.max(1, ...Object.values(stats.hourlyDistribution));

  return (
    <div className="space-y-6 font-sans">
      {/* Selector de Rango de Fechas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#ed0718] text-white rounded-xl shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
              {isCustomerView ? 'Tus Métricas de Consumo RODO' : 'Estadísticas & Analítica de Pedidos'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filteredOrders.length} pedidos registrados · San Miguel de Allende
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          {[
            { id: 'hoy' as const, label: 'Hoy' },
            { id: 'semana' as const, label: '7 días' },
            { id: 'mes' as const, label: 'Este mes' },
            { id: 'todo' as const, label: 'Histórico' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeRange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                timeRange === tab.id
                  ? 'bg-white dark:bg-slate-900 text-[#ed0718] shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Volumen Total Facturado */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {isCustomerView ? 'Total Invertido' : 'Facturación Total'}
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-white">
            ${stats.totalRevenue.toLocaleString('es-MX')} <span className="text-xs font-sans">MXN</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
            Ticket promedio: <b>${stats.avgTicket} MXN</b>
          </span>
        </div>

        {/* KPI 2: Pedidos Totales */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pedidos Realizados
            </span>
            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#ed0718]">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-white">
            {stats.totalOrders} <span className="text-xs font-sans">órdenes</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
            {stats.completedOrdersCount} entregadas con éxito
          </span>
        </div>

        {/* KPI 3: Propinas a Repartidores */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Propinas Totales
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Heart className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            ${stats.totalTips.toLocaleString('es-MX')} <span className="text-xs font-sans">MXN</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
            Efectivo: <b>${stats.cashTips}</b> · SPEI: <b>${stats.transferTips}</b>
          </span>
        </div>

        {/* KPI 4: Ahorro Promocional o Comisión */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {isCustomerView ? 'Ahorro en Descuentos' : 'Comisión RODO'}
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            ${(isCustomerView ? stats.totalPromoSavings : stats.totalCommission).toLocaleString('es-MX')}{' '}
            <span className="text-xs font-sans">MXN</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
            {isCustomerView ? 'En sobreprecio de platillos' : 'Calculada sobre producto base'}
          </span>
        </div>
      </div>

      {/* Gráfica de Horas Pico en San Miguel de Allende */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#ed0718]" />
              Distribución de Horas Pico en San Miguel de Allende
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Frecuencia de pedidos por hora del día (8:00 AM a 11:00 PM)
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-red-50 dark:bg-red-950/40 text-[#ed0718] px-2.5 py-1 rounded-lg">
            Máx: {maxOrdersInAnHour} pedidos/hr
          </span>
        </div>

        {/* Barras verticales interactivas */}
        <div className="pt-4 pb-2">
          <div className="h-40 flex items-end gap-1.5 sm:gap-2.5 border-b border-gray-200 dark:border-slate-800 pb-1">
            {Object.entries(stats.hourlyDistribution).map(([hourStr, count]) => {
              const hour = parseInt(hourStr, 10);
              const heightPercent = maxOrdersInAnHour > 0 ? (count / maxOrdersInAnHour) * 100 : 0;
              const isPeakHour = count === maxOrdersInAnHour && count > 0;

              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip flotante al pasar cursor */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none whitespace-nowrap z-10">
                    {hour}:00 hrs: {count} {count === 1 ? 'pedido' : 'pedidos'}
                  </div>

                  <div className="w-full flex items-end justify-center h-32">
                    <div
                      style={{ height: `${Math.max(6, heightPercent)}%` }}
                      className={`w-full max-w-[24px] rounded-t-lg transition-all duration-300 ${
                        isPeakHour
                          ? 'bg-[#ed0718] shadow-md'
                          : count > 0
                          ? 'bg-rose-400 dark:bg-rose-600 hover:bg-[#ed0718]'
                          : 'bg-gray-100 dark:bg-slate-800'
                      }`}
                    />
                  </div>

                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 select-none">
                    {hour}h
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-400 pt-2 font-medium">
            <span>🌅 Mañana (Desayunos)</span>
            <span>☀️ Mediodía / Comida (Horas Fuertes)</span>
            <span>🌙 Noche (Cenas)</span>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Secundarias: Formas de Pago, Modalidades de Entrega y Top Locales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Desglose de Formas de Pago */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600" />
            Métodos de Pago
          </h4>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Efectivo
                </span>
                <span className="font-mono">{stats.cashCount} ({stats.totalOrders > 0 ? Math.round((stats.cashCount / stats.totalOrders) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${stats.totalOrders > 0 ? (stats.cashCount / stats.totalOrders) * 100 : 0}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Transferencia SPEI
                </span>
                <span className="font-mono">{stats.transferCount} ({stats.totalOrders > 0 ? Math.round((stats.transferCount / stats.totalOrders) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${stats.totalOrders > 0 ? (stats.transferCount / stats.totalOrders) * 100 : 0}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 leading-snug">
              * Recordatorio: En pedidos en efectivo, la propina no se descuenta del corte diario ya que queda en mano del repartidor.
            </p>
          </div>
        </div>

        {/* Modalidades de Entrega */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Modalidades de Entrega
          </h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <span>🛵</span> Normal (25-35 min)
              </span>
              <span className="font-mono font-black">{stats.normalCount}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-red-50/60 dark:bg-red-950/20 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-[#ed0718]">
                <span>⚡</span> Exprés Inmediata (+ $25)
              </span>
              <span className="font-mono font-black text-[#ed0718]">{stats.expressCount}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-blue-600">
                <span>🕒</span> Programada en horario
              </span>
              <span className="font-mono font-black text-blue-600">{stats.scheduledCount}</span>
            </div>
          </div>
        </div>

        {/* Top Platillos Más Solicitados */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Platillos Más Pedidos
          </h4>

          {stats.topItems.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sin productos registrados aún</p>
          ) : (
            <div className="space-y-1.5">
              {stats.topItems.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition"
                >
                  <span className="font-medium truncate pr-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-black font-mono text-gray-400 w-4">#{idx + 1}</span>
                    {item.name}
                  </span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white shrink-0">
                    {item.count} uds
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Top Locales y Rendimiento */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
        <h4 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2">
          <Bike className="w-4 h-4 text-[#ed0718]" />
          Ranking de Establecimientos Asociados por Despacho
        </h4>

        {stats.topRestaurants.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No hay órdenes en este periodo</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] uppercase font-black text-gray-400 border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="py-2">Posición & Local</th>
                  <th className="py-2 text-center">Pedidos</th>
                  <th className="py-2 text-right">Volumen Generado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {stats.topRestaurants.map((r, idx) => (
                  <tr key={r.name} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-gray-900 dark:text-white truncate">{r.name}</span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold text-gray-700 dark:text-gray-300">
                      {r.count}
                    </td>
                    <td className="py-2.5 text-right font-mono font-black text-gray-900 dark:text-white">
                      ${r.revenue.toLocaleString('es-MX')} MXN
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
