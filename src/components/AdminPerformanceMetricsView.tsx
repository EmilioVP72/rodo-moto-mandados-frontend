import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Order, Restaurant } from '../types';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Bike,
  Award,
  Calendar,
  Percent,
  Download,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';

interface AdminPerformanceMetricsViewProps {
  orders: Order[];
  restaurants: Restaurant[];
}

const CATEGORY_COLORS = [
  '#ed0718', // Rojo RODO
  '#3b82f6', // Azul
  '#10b981', // Esmeralda
  '#f59e0b', // Ámbar
  '#8b5cf6', // Púrpura
  '#ec4899', // Rosa
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export const AdminPerformanceMetricsView: React.FC<AdminPerformanceMetricsViewProps> = ({
  orders,
  restaurants,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | 'all'>('7d');

  // Filtrar órdenes por ventana de tiempo
  const filteredOrders = useMemo(() => {
    if (timeRange === 'all') return orders;

    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return orders.filter((o) => new Date(o.createdAt) >= cutoff);
  }, [orders, timeRange]);

  // Cálculos de KPIs Clave
  const kpis = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.status === 'entregado');
    const cancelledOrders = filteredOrders.filter(
      (o) => o.status === 'cancelado' || o.status === 'cancelado_con_deuda'
    );

    const totalFoodRevenue = filteredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const totalDeliveryFees = filteredOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    const totalCommissions = filteredOrders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
    const totalGrossRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const avgTicket = totalOrders > 0 ? Math.round(totalGrossRevenue / totalOrders) : 0;
    const successRate = totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 100;

    // Cálculo del Tiempo Promedio de Entrega de los Repartidores (en minutos)
    const validDeliveryTimes = completedOrders.map((o) => {
      if (o.routeEstimateMinutes && o.routeEstimateMinutes > 0) return o.routeEstimateMinutes;
      const start = new Date(o.createdAt).getTime();
      const end = new Date(o.updatedAt || o.arrivalNotifiedAt || Date.now()).getTime();
      const diffMins = Math.round((end - start) / (1000 * 60));
      return diffMins >= 5 && diffMins <= 90 ? diffMins : 22; // Benchmark promedio en San Miguel
    });
    const avgDeliveryTimeMinutes =
      validDeliveryTimes.length > 0
        ? Math.round(validDeliveryTimes.reduce((acc, val) => acc + val, 0) / validDeliveryTimes.length)
        : 22;

    return {
      totalOrders,
      completedOrdersCount: completedOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      totalFoodRevenue,
      totalDeliveryFees,
      totalCommissions,
      totalGrossRevenue,
      avgTicket,
      successRate,
      avgDeliveryTimeMinutes,
    };
  }, [filteredOrders]);

  // 1. Tendencias Diarias del Volumen de Pedidos (Recharts AreaChart)
  const dailyTrendsData = useMemo(() => {
    const dateMap: Record<
      string,
      { date: string; displayDate: string; total: number; entregados: number; cancelados: number }
    > = {};

    // Inicializar días en orden
    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 14;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
      dateMap[key] = { date: key, displayDate, total: 0, entregados: 0, cancelados: 0 };
    }

    filteredOrders.forEach((o) => {
      const key = o.createdAt.split('T')[0];
      if (dateMap[key]) {
        dateMap[key].total += 1;
        if (o.status === 'entregado') dateMap[key].entregados += 1;
        if (o.status === 'cancelado' || o.status === 'cancelado_con_deuda') {
          dateMap[key].cancelados += 1;
        }
      }
    });

    return Object.values(dateMap);
  }, [filteredOrders, timeRange]);

  // 2. Ingresos Totales por Día (Recharts BarChart)
  const dailyRevenueData = useMemo(() => {
    const map: Record<
      string,
      { displayDate: string; alimentos: number; envios: number; comisiones: number }
    > = {};

    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 14;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
      map[key] = { displayDate, alimentos: 0, envios: 0, comisiones: 0 };
    }

    filteredOrders.forEach((o) => {
      const key = o.createdAt.split('T')[0];
      if (map[key]) {
        map[key].alimentos += o.subtotal || 0;
        map[key].envios += o.deliveryFee || 0;
        map[key].comisiones += o.commissionAmount || 0;
      }
    });

    return Object.values(map);
  }, [filteredOrders, timeRange]);

  // 3. Categorías de Restaurantes Más Populares (Recharts PieChart)
  const categoryPopularityData = useMemo(() => {
    const restMap = new Map<string, string>();
    restaurants.forEach((r) => restMap.set(r.name.toLowerCase(), r.category));

    const counts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const cat = restMap.get(o.restaurantName.toLowerCase()) || 'Antojitos & Varios';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const list = Object.entries(counts).map(([name, value]) => ({ name, value }));
    list.sort((a, b) => b.value - a.value);
    return list.slice(0, 7);
  }, [filteredOrders, restaurants]);

  // 4. Top 5 Restaurantes con Mayor Facturación
  const topRestaurants = useMemo(() => {
    const map: Record<string, { name: string; totalRevenue: number; orderCount: number }> = {};
    filteredOrders.forEach((o) => {
      if (!map[o.restaurantName]) {
        map[o.restaurantName] = { name: o.restaurantName, totalRevenue: 0, orderCount: 0 };
      }
      map[o.restaurantName].totalRevenue += o.total;
      map[o.restaurantName].orderCount += 1;
    });

    return Object.values(map)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredOrders]);

  // 5. Volumen de Pedidos por Hora (para identificar Horas Pico de operación)
  const { hourlyVolumeData, peakHourSummary } = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      pedidos: 0,
      ventas: 0,
    }));

    filteredOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        hours[h].pedidos += 1;
        hours[h].ventas += o.total || 0;
      }
    });

    // Mostrar franja operativa principal (07:00 a 23:00) o todas si hay pedidos de madrugada
    const hasEarlyMorning = hours.slice(0, 7).some((item) => item.pedidos > 0);
    const activeHours = hasEarlyMorning ? hours : hours.slice(7);

    const peak = activeHours.reduce(
      (best, cur) => (cur.pedidos > best.pedidos ? cur : best),
      { hour: '14:00', pedidos: 0, ventas: 0 }
    );

    return {
      hourlyVolumeData: activeHours,
      peakHourSummary: peak.pedidos > 0 ? `${peak.hour} (${peak.pedidos} órdenes)` : 'Sin datos aún',
    };
  }, [filteredOrders]);

  // 6. Comparativa Semanal: Restaurantes vs Motomandados (7 días recientes)
  const weeklyComparisonData = useMemo(() => {
    const restTypeMap = new Map<string, string>();
    restaurants.forEach((r) => {
      restTypeMap.set(r.id, r.establishmentType || 'restaurante');
      restTypeMap.set(r.name.toLowerCase(), r.establishmentType || 'restaurante');
    });

    const daysMap: Record<
      string,
      { displayDate: string; restaurantes: number; motomandados: number; ventasRestaurantes: number; ventasMotomandados: number }
    > = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
      daysMap[key] = {
        displayDate,
        restaurantes: 0,
        motomandados: 0,
        ventasRestaurantes: 0,
        ventasMotomandados: 0,
      };
    }

    orders.forEach((o) => {
      const key = (o.createdAt || '').split('T')[0];
      if (!daysMap[key]) return;
      const type =
        restTypeMap.get(o.restaurantId) ||
        restTypeMap.get((o.restaurantName || '').toLowerCase()) ||
        'restaurante';
      if (type === 'motomandado') {
        daysMap[key].motomandados += 1;
        daysMap[key].ventasMotomandados += o.total || 0;
      } else {
        daysMap[key].restaurantes += 1;
        daysMap[key].ventasRestaurantes += o.total || 0;
      }
    });

    return Object.values(daysMap);
  }, [orders, restaurants]);

  // Exportar datos a CSV
  const handleExportCSV = () => {
    const headers = 'Folio,Fecha,Cliente,Restaurante,Subtotal,Envio,ComisionRODO,Total,Estatus\n';
    const rows = filteredOrders
      .map(
        (o) =>
          `"${o.folio}","${o.createdAt}","${o.customerName}","${o.restaurantName}",${o.subtotal},${o.deliveryFee},${o.commissionAmount},${o.total},"${o.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `metricas_rendimiento_rodo_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-gray-900">
      {/* Cabecera y Selector de Rango */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#ed0718] text-white shadow-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
              Métricas de Rendimiento & Despacho RODO
            </h3>
            <p className="text-xs text-gray-500">
              Analítica visual de volumen diario, facturación bruta y preferencias gastronómicas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Rango */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded-lg transition ${
                timeRange === '7d' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-black'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setTimeRange('14d')}
              className={`px-2.5 py-1 rounded-lg transition ${
                timeRange === '14d' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-black'
              }`}
            >
              14 Días
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded-lg transition ${
                timeRange === '30d' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-black'
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                timeRange === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-black'
              }`}
            >
              Histórico
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Descargar reporte en formato CSV para Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen (5 métricas clave) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-bold uppercase text-[10px]">Ingresos Brutos</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-gray-900">
            ${kpis.totalGrossRevenue.toLocaleString('es-MX')}
          </span>
          <span className="text-[10px] text-gray-400 mt-1 font-semibold">
            Alimentos: ${kpis.totalFoodRevenue.toLocaleString('es-MX')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-bold uppercase text-[10px]">Tarifas Envíos Moto</span>
            <Bike className="w-4 h-4 text-[#ed0718]" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-[#ed0718]">
            ${kpis.totalDeliveryFees.toLocaleString('es-MX')}
          </span>
          <span className="text-[10px] text-gray-400 mt-1 font-semibold">
            Comisión RODO: ${kpis.totalCommissions.toLocaleString('es-MX')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-bold uppercase text-[10px]">Tiempo Promedio Entrega</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-purple-700">
            ~{kpis.avgDeliveryTimeMinutes} min
          </span>
          <span className="text-[10px] text-emerald-600 font-bold mt-1">
            ⚡ Reparto en San Miguel
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-bold uppercase text-[10px]">Volumen de Pedidos</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-gray-900">
            {kpis.totalOrders}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold mt-1">
            ✓ {kpis.completedOrdersCount} entregados ({kpis.successRate}%)
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-bold uppercase text-[10px]">Ticket Promedio</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-gray-900">
            ${kpis.avgTicket} MXN
          </span>
          <span className="text-[10px] text-gray-400 mt-1 font-semibold">
            Por orden completada
          </span>
        </div>
      </div>

      {/* Gráfica 1: Tendencia Diaria del Volumen de Pedidos (Recharts AreaChart) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-gray-900">
              Tendencia Diaria del Volumen de Pedidos
            </h4>
            <p className="text-xs text-gray-500">
              Comportamiento diario de pedidos recibidos vs entregados
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-red-50 text-[#ed0718] px-2 py-0.5 rounded-lg border border-red-200">
            {filteredOrders.length} órdenes en el período
          </span>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ed0718" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ed0718" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorEntregados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#101b29',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Pedidos"
                stroke="#ed0718"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="entregados"
                name="Entregados con Éxito"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorEntregados)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica 2 y 3: Ingresos Totales por Día y Categorías Más Populares */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ingresos Diarios Desglosados (Recharts BarChart) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div>
            <h4 className="font-extrabold text-sm text-gray-900">
              Desglose Financiero Diario ($ MXN)
            </h4>
            <p className="text-xs text-gray-500">
              Comparativa de ventas de alimentos vs recaudación de envíos
            </p>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val || 0).toLocaleString('es-MX')} MXN`, '']}
                  contentStyle={{
                    backgroundColor: '#101b29',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="alimentos" name="Venta Alimentos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="envios" name="Envíos RODO" fill="#ed0718" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categorías Más Populares (Recharts PieChart) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div>
            <h4 className="font-extrabold text-sm text-gray-900">
              Categorías de Restaurantes Más Populares
            </h4>
            <p className="text-xs text-gray-500">
              Distribución de pedidos según tipo de comida solicitada
            </p>
          </div>

          <div className="h-60 sm:h-64 w-full flex items-center justify-center">
            {categoryPopularityData.length === 0 ? (
              <span className="text-xs text-gray-400">Sin datos en el rango seleccionado</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPopularityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={(props: any) =>
                      `${(props?.name || '').slice(0, 10)} (${((props?.percent || 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {categoryPopularityData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val || 0} pedidos`, '']}
                    contentStyle={{
                      backgroundColor: '#101b29',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Gráficas 4 y 5: Volumen de Pedidos por Hora (Horas Pico) y Comparativa Semanal Restaurantes vs Motomandados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Volumen de Pedidos por Hora */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-sm text-gray-900">
                Volumen de Pedidos por Hora (Horas Pico)
              </h4>
              <p className="text-xs text-gray-500">
                Identifica los horarios de mayor demanda operativa en San Miguel
              </p>
            </div>
            <span className="text-[11px] font-mono font-black bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg shrink-0">
              🔥 Pico: {peakHourSummary}
            </span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  formatter={(val: any, name: any) =>
                    name === 'Ventas ($ MXN)'
                      ? [`$${Number(val || 0).toLocaleString('es-MX')} MXN`, name]
                      : [`${val || 0} pedidos`, name]
                  }
                  contentStyle={{
                    backgroundColor: '#101b29',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="pedidos" name="Pedidos / Hora" fill="#ed0718" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparativa Semanal: Restaurantes vs Motomandados */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div>
            <h4 className="font-extrabold text-sm text-gray-900">
              Comparativa Semanal: Restaurantes vs Motomandados
            </h4>
            <p className="text-xs text-gray-500">
              Demanda de pedidos de los últimos 7 días por tipo de servicio
            </p>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101b29',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="restaurantes" name="Restaurantes (Pedidos)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="motomandados" name="Motomandados (Pedidos)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Locales Destacados en Facturación */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Top 5 Restaurantes con Mayor Facturación</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {topRestaurants.map((r, idx) => (
            <div
              key={r.name}
              className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-[#101b29] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  #{idx + 1}
                </span>
                <span className="font-extrabold text-xs text-gray-900 truncate" title={r.name}>
                  {r.name}
                </span>
              </div>
              <div>
                <span className="text-sm font-black font-mono text-[#ed0718] block">
                  ${r.totalRevenue.toLocaleString('es-MX')}
                </span>
                <span className="text-[10px] text-gray-500">
                  {r.orderCount} órdenes registradas
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
