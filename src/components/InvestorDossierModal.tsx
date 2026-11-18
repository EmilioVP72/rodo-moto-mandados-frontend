import React, { useState } from 'react';
import {
  X,
  Share2,
  Printer,
  Copy,
  Check,
  TrendingUp,
  Store,
  Bike,
  ShieldCheck,
  DollarSign,
  QrCode,
  MapPin,
  ExternalLink,
  ChevronRight,
  Calculator,
  Download,
} from 'lucide-react';
import { downloadInvestorDossierFile } from '../utils/downloadPresentation';

interface InvestorDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvestorDossierModal: React.FC<InvestorDossierModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'tesis' | 'locales' | 'tech' | 'finanzas'>('tesis');
  
  // Calculadora interactiva
  const [motosCount, setMotosCount] = useState<number>(4);
  const [ordersPerMoto, setOrdersPerMoto] = useState<number>(15);
  const [avgTicket, setAvgTicket] = useState<number>(230);

  if (!isOpen) return null;

  const appBaseUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file://')
    ? window.location.origin
    : 'https://ais-pre-eooztaby6uofrzjmraerfo-60690626410.us-west2.run.app';

  const shareableUrl = `${appBaseUrl}/#dossier`;

  const totalDailyOrders = motosCount * ordersPerMoto;
  const monthlyOrders = totalDailyOrders * 30;
  // Margen estimado promedio $75 por pedido (envío $40 + comisión/sobreprecio promedio $35)
  const monthlyRevenue = monthlyOrders * 75;
  const monthlyGrossSales = monthlyOrders * avgTicket;

  const waShareMessage = `Hola, te comparto la propuesta ejecutiva y el sistema en vivo de *RODO Moto Mandados San Miguel de Allende*:\n\n` +
    `📊 *Dossier Ejecutivo de Inversión:* ${shareableUrl}\n\n` +
    `🚀 *Aplicación en Vivo:* ${appBaseUrl}\n\n` +
    `🏍️ *Aspectos Clave:*\n` +
    `• Locales y restaurantes reales con menús, precios y sobreprecios (Little Caesars, Ferechiken, Tacos Don Santos, Comida China, Tacos Sebastián).\n` +
    `• Portal de Locales con PIN de 3 dígitos y despacho de 1 a 4 repartidores por WhatsApp.\n` +
    `• Tarifas de envío justas ($35 - $40) y cálculo kilométrico.\n` +
    `• Ticket térmico digital con QR y auditoría bancaria SPEI.\n` +
    `• Modelo dual de ingresos (15% facturación / 20% sobreprecio efectivo).\n\n` +
    `Puedes abrir el enlace desde tu celular para revisar la plataforma interactiva.`;

  const waLink = `https://wa.me/?text=${encodeURIComponent(waShareMessage)}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    downloadInvestorDossierFile();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0f1722] text-slate-100 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto border border-slate-700 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* BARRA SUPERIOR FIJA */}
        <div className="bg-[#162232] border-b border-slate-700/80 p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ed0718] text-white rounded-xl shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  Dossier Ejecutivo de Inversión
                </h3>
                <span className="bg-[#ed0718]/30 text-red-300 border border-[#ed0718]/50 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  RODO 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                RODO Moto Mandados · San Miguel de Allende, Gto.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              title="Descargar archivo .html para enviar por WhatsApp"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2 px-3 sm:px-3.5 rounded-xl shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>{downloaded ? '¡Descargado!' : 'Descargar Archivo'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              title="Copiar enlace directo"
              className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl border border-slate-600 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Link'}</span>
            </button>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black py-2 px-3 sm:px-4 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            <button
              onClick={onClose}
              aria-label="Cerrar dossier"
              className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex bg-[#121c29] border-b border-slate-800 px-4 pt-2 gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('tesis')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === 'tesis'
                ? 'border-[#ed0718] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Tesis de Inversión
          </button>
          <button
            onClick={() => setActiveTab('locales')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === 'locales'
                ? 'border-[#ed0718] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏪 Tracción & Locales
          </button>
          <button
            onClick={() => setActiveTab('tech')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === 'tech'
                ? 'border-[#ed0718] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🛠️ Tecnología Propia
          </button>
          <button
            onClick={() => setActiveTab('finanzas')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === 'finanzas'
                ? 'border-[#ed0718] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            💰 Unit Economics & Proyección
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">

          {/* TAB 1: TESIS DE INVERSIÓN */}
          {activeTab === 'tesis' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Hero Banner */}
              <div className="bg-gradient-to-br from-[#1d2d42] to-[#131e2b] border border-slate-700/80 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                <div className="relative z-10 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#ed0718] text-white px-2.5 py-1 rounded-full">
                    Ventaja Hiperlocal
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-white">
                    Dominio del Reparto en San Miguel de Allende
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                    Las aplicaciones transnacionales (UberEats, Rappi) fracasan en San Miguel de Allende por cobrar entre <b>30% y 35% de comisión</b>, no aceptar negocios tradicionales de comida y colapsar durante desfiles o fiestas patrias.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="bg-slate-900/80 text-slate-300 text-xs px-3 py-1 rounded-lg border border-slate-700">
                      📍 Topografía de adoquín y callejones: Motocicletas indispensables
                    </span>
                    <span className="bg-slate-900/80 text-slate-300 text-xs px-3 py-1 rounded-lg border border-slate-700">
                      ⏱️ Tiempos de entrega promedio: &lt; 35 minutos
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Pilares */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#162232] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="text-2xl">🎯</div>
                  <h5 className="font-extrabold text-sm text-white">Modelo Dual Equilibrado</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <b>Restaurantes Formales:</b> 15% de comisión, facturación y pagos SPEI auditados.<br />
                    <b>Motomandados / Taquerías:</b> 20% sobreprecio directo y pago exclusivo en efectivo al repartidor.
                  </p>
                </div>

                <div className="bg-[#162232] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="text-2xl">🔑</div>
                  <h5 className="font-extrabold text-sm text-white">API Autoservicio con PIN de 3 Dígitos</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Los negocios no instalan hardware ni apps pesadas. Ingresan su PIN (ej. 101-105) y solicitan de 1 a 4 repartidores en 5 segundos con despacho vía WhatsApp.
                  </p>
                </div>

                <div className="bg-[#162232] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="text-2xl">🛡️</div>
                  <h5 className="font-extrabold text-sm text-white">Blindaje Legal & Anti-Fraude</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Avisos de privacidad por PROFECO y LFPDPPP: intermediación de mensajería, no retención bancaria, verificación de 10 dígitos INE contra cuentas duplicadas y tickets térmicos auditables.
                  </p>
                </div>
              </div>

              {/* Tasa de Retorno y Escalabilidad */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h5 className="text-sm font-black text-emerald-300">
                    Oportunidad de Inversión y Destino de Fondos
                  </h5>
                  <p className="text-xs text-emerald-200/80 mt-1 max-w-xl">
                    Adquisición de flotilla propia de motocicletas adicionales, combustible subsidiado para repartidores estrella, uniformes reflejantes de alta visibilidad con branding oficial y pauta publicitaria hiperlocal en San Miguel de Allende.
                  </p>
                </div>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shrink-0 transition"
                >
                  Contactar por WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: LOCALES ASOCIADOS ACTIVOS */}
          {activeTab === 'locales' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-base text-white">Portafolio de Comercios Afiliados</h4>
                  <p className="text-xs text-slate-400">Negocios reales configurados en la plataforma con menús y sobreprecios</p>
                </div>
                <span className="bg-slate-800 text-xs px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 font-mono">
                  5 Comercios Activos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Local 1 */}
                <div className="bg-[#162232] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      PIN #102 · Restaurante
                    </span>
                    <span className="text-xs font-mono font-bold text-[#ed0718]">$40 Envío</span>
                  </div>
                  <h5 className="font-black text-white text-base">Little Caesars Pizza</h5>
                  <p className="text-xs text-slate-400">Calzada de la Aurora #12. Franquicia masiva de alta rotación.</p>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Comisión RODO:</span>
                      <b className="text-emerald-400">15%</b>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Facturación:</span>
                      <span>Sí (SPEI y Tarjeta)</span>
                    </div>
                  </div>
                </div>

                {/* Local 2 */}
                <div className="bg-[#162232] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      PIN #105 · Motomandado
                    </span>
                    <span className="text-xs font-mono font-bold text-[#ed0718]">$40 Envío</span>
                  </div>
                  <h5 className="font-black text-white text-base">Ferechiken Las Alamedas</h5>
                  <p className="text-xs text-slate-400">Av. Central #96, Santa Cruz de La Paz. Pollos rostizados y empanizados.</p>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Sobreprecio RODO:</span>
                      <b className="text-amber-400">20% incluido</b>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Cobro:</span>
                      <span>Solo Efectivo</span>
                    </div>
                  </div>
                </div>

                {/* Local 3 */}
                <div className="bg-[#162232] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      PIN #103 · Motomandado
                    </span>
                    <span className="text-xs font-mono font-bold text-[#ed0718]">$40 Envío</span>
                  </div>
                  <h5 className="font-black text-white text-base">Tacos Don Santos</h5>
                  <p className="text-xs text-slate-400">Calzada de la Estación #28. Tacos nocturnos tradicionales.</p>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Tarifa Platillo:</span>
                      <b className="text-white">$30 c/u (+$5 sobreprecio)</b>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Cobro:</span>
                      <span>Solo Efectivo</span>
                    </div>
                  </div>
                </div>

                {/* Local 4 */}
                <div className="bg-[#162232] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      PIN #104 · Motomandado
                    </span>
                    <span className="text-xs font-mono font-bold text-[#ed0718]">$40 Envío</span>
                  </div>
                  <h5 className="font-black text-white text-base">Comida China Mesones</h5>
                  <p className="text-xs text-slate-400">Calle Mesones #38, Centro. Combos de comida cantonesa.</p>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Sobreprecio RODO:</span>
                      <b className="text-amber-400">20% incluido</b>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Cobro:</span>
                      <span>Solo Efectivo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECNOLOGÍA PROPIA */}
          {activeTab === 'tech' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h4 className="font-black text-base text-white">Stack Tecnológico Desarrollado</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#162232] border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="p-1.5 bg-[#ed0718] rounded-lg text-white">🏍️</span>
                    <span>Despacho Rápido de Motos por WhatsApp</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ruteo dual automático hacia el <b>Repartidor 1 (Principal)</b> y <b>Repartidor 2 (Respaldo)</b> con folios únicos, detalles del cobro y enlace directo a Google Maps con coordenadas GPS.
                  </p>
                </div>

                <div className="bg-[#162232] border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="p-1.5 bg-blue-600 rounded-lg text-white">🧾</span>
                    <span>Ticket Térmico Digital con Código de Barras</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Comprobante digital interactivo que se puede compartir por WhatsApp o imprimir, con desglose de alimentos, costo de envío, clave SPEI y estado en tiempo real.
                  </p>
                </div>

                <div className="bg-[#162232] border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="p-1.5 bg-purple-600 rounded-lg text-white">📐</span>
                    <span>Cálculo Kilométrico Dinámico</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Fórmula de distancia por Haversine calibrada para San Miguel de Allende: tarifa base de $35 o $40 MXN + $10 MXN por kilómetro extra fuera del radio céntrico.
                  </p>
                </div>

                <div className="bg-[#162232] border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="p-1.5 bg-emerald-600 rounded-lg text-white">⚙️</span>
                    <span>Panel de Control RODO con PIN RODO2026</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Administración de precios, sobreprecios, fotos del menú, cierre vial por desfiles, cortes de caja del día y alta de códigos de 3 dígitos para nuevos locales.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CALCULADORA Y FINANZAS */}
          {activeTab === 'finanzas' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-[#162232] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-white font-black text-sm">
                  <Calculator className="w-5 h-5 text-[#ed0718]" />
                  <span>Calculadora Interactiva de Proyección Mensual</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <label className="font-bold text-slate-300 block">
                      Motos Activas: <b className="text-white text-sm">{motosCount}</b>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={motosCount}
                      onChange={(e) => setMotosCount(Number(e.target.value))}
                      className="w-full accent-[#ed0718]"
                    />
                    <span className="text-[10px] text-slate-400">Flota en operación simultánea</span>
                  </div>

                  <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <label className="font-bold text-slate-300 block">
                      Pedidos / Moto al Día: <b className="text-white text-sm">{ordersPerMoto}</b>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      value={ordersPerMoto}
                      onChange={(e) => setOrdersPerMoto(Number(e.target.value))}
                      className="w-full accent-[#ed0718]"
                    />
                    <span className="text-[10px] text-slate-400">Promedio de mandados diarios</span>
                  </div>

                  <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <label className="font-bold text-slate-300 block">
                      Ticket Promedio Alimentos: <b className="text-white text-sm">${avgTicket} MXN</b>
                    </label>
                    <input
                      type="range"
                      min={100}
                      max={600}
                      step={10}
                      value={avgTicket}
                      onChange={(e) => setAvgTicket(Number(e.target.value))}
                      className="w-full accent-[#ed0718]"
                    />
                    <span className="text-[10px] text-slate-400">Gasto medio por cliente</span>
                  </div>
                </div>

                {/* Métricas Resultantes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Pedidos Diarios</div>
                    <div className="text-xl font-black font-mono text-white mt-0.5">{totalDailyOrders}</div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Pedidos / Mes</div>
                    <div className="text-xl font-black font-mono text-white mt-0.5">{monthlyOrders}</div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">GMV (Ventas Brutas)</div>
                    <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                      ${monthlyGrossSales.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-red-900/50">
                    <div className="text-[10px] text-red-300 uppercase font-bold">Ingreso Logístico RODO</div>
                    <div className="text-lg font-black font-mono text-[#ed0718] mt-0.5">
                      ${monthlyRevenue.toLocaleString()} MXN
                    </div>
                  </div>
                </div>
              </div>

              {/* Tesis financiera */}
              <div className="border border-slate-800 bg-[#162232] p-4 rounded-2xl text-xs space-y-2 text-slate-300 leading-relaxed">
                <p>
                  <b>Estructura de Costos Ligeros:</b> Al operar como plataforma basada en tecnología progresiva (PWA) y mensajería instantánea directa por WhatsApp, no existen costos exorbitantes de servidores, pasarelas de pago extranjeras del 4% en efectivo ni licencias de software recurrentes.
                </p>
                <p className="text-slate-400">
                  El capital de inversión se destina a la expansión física de la flota y a captar el 70% restante de la gastronomía urbana tradicional de San Miguel de Allende.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* PIE DE PÁGINA CON ACCIONES */}
        <div className="bg-[#162232] border-t border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            <span>Enlace para compartir: </span>
            <code className="text-[#ed0718] font-mono select-all text-[11px]">
              {shareableUrl}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>{downloaded ? '¡Archivo Descargado!' : 'Descargar Archivo (.html)'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-600 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
            </button>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs py-2.5 px-5 rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
