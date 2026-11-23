import React, { useEffect, useState } from 'react';
import { Order } from '../types';
import { submitOrderWithQueue } from '../services/orderQueue';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import { SmaColoniaCombobox } from './SmaColoniaCombobox';
import { SMA_COLONIAS_CATALOG, normalizeSearchText } from '../data/smaColonias';
import {
  CustomerSavedAddress,
  cleanStreetNumber,
  formatSavedAddressLine,
} from '../utils/customerAddresses';
import {
  ExpressRouteQuote,
  calculateExpressShippingTariff,
  fetchExpressRouteQuote,
} from '../services/routing';
import {
  FileText,
  Flower2,
  Package,
  ShoppingBag,
  MapPin,
  AlertCircle,
  Loader2,
  CreditCard,
  Banknote,
  Clock,
  ShieldCheck,
  Zap,
  X,
  CloudRain,
  Route,
  CheckCircle2,
} from 'lucide-react';

interface ExpressDeliveryPanelProps {
  bankAccount: string;
  customerId: string;
  customerDefaultName?: string;
  customerDefaultPhone?: string;
  savedAddresses?: CustomerSavedAddress[];
  onOrderSuccess: (order: Order) => void;
  onRequireLogin?: () => void;
  rainPauseEnabled?: boolean;
  rainPauseMessage?: string;
}

const SHIPPING_CATEGORIES = [
  {
    type: 'documentos' as const,
    title: 'Documentos & Sobres',
    desc: 'Contratos, trámites, llaves y papelería urgente con entrega en mano.',
    icon: FileText,
  },
  {
    type: 'flores' as const,
    title: 'Flores & Regalos',
    desc: 'Arreglos florales, detalles y pasteles. Cuidado especial en moto.',
    icon: Flower2,
  },
  {
    type: 'articulos' as const,
    title: 'Artículos & Paquetes',
    desc: 'Cajas medianas, ropa, electrónicos pequeños y compras locales.',
    icon: Package,
  },
  {
    type: 'mandados' as const,
    title: 'Mandado Personalizado',
    desc: 'Compra rápida en mostrador o farmacia y entrega inmediata.',
    icon: ShoppingBag,
  },
];

function resolveOfficialColonia(raw?: string | null): string {
  const cleaned = (raw || '').trim();
  if (!cleaned) return '';
  const withoutPrefix = cleaned.replace(/^Col\.?\s*/i, '').trim();
  const norm = normalizeSearchText(withoutPrefix);
  const exact = SMA_COLONIAS_CATALOG.find(
    (item) =>
      item.label === cleaned ||
      item.searchKey === norm ||
      normalizeSearchText(item.name) === norm
  );
  return exact ? exact.label : withoutPrefix;
}

function stripColoniaTypeForGeocode(colonia: string): string {
  return colonia.split(' - ')[0].trim();
}

export const ExpressDeliveryPanel: React.FC<ExpressDeliveryPanelProps> = ({
  customerId,
  bankAccount,
  customerDefaultName = '',
  customerDefaultPhone = '',
  savedAddresses = [],
  onOrderSuccess,
  onRequireLogin,
  rainPauseEnabled = false,
  rainPauseMessage,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'documentos' | 'flores' | 'articulos' | 'mandados'>('documentos');

  // Dirección estructurada de Recolección (A): Calle, Número (opcional), Colonia, Referencias
  const [pickupCalle, setPickupCalle] = useState('');
  const [pickupNumero, setPickupNumero] = useState('');
  const [pickupColonia, setPickupColonia] = useState('');
  const [pickupRef, setPickupRef] = useState('');
  const [pickupContact, setPickupContact] = useState(customerDefaultName);
  const [pickupPhone, setPickupPhone] = useState(customerDefaultPhone);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Dirección estructurada de Entrega (B): Calle, Número (opcional), Colonia, Referencias
  const [deliveryCalle, setDeliveryCalle] = useState('');
  const [deliveryNumero, setDeliveryNumero] = useState('');
  const [deliveryColonia, setDeliveryColonia] = useState('');
  const [deliveryRef, setDeliveryRef] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Modal para seleccionar en mapa (A o B)
  const [activeMapPickerTarget, setActiveMapPickerTarget] = useState<'pickup' | 'delivery' | null>(null);

  // Modalidad de Envío: Normal, Exprés, Programado
  const [deliveryType, setDeliveryType] = useState<'normal' | 'express' | 'programada'>('normal');
  const [scheduledTime, setScheduledTime] = useState('16:00');
  const expressSurcharge = 25;

  // Cotización automática calculada por la API interna (Punto A -> Punto B, sin selector manual de km)
  const [routeQuote, setRouteQuote] = useState<ExpressRouteQuote | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [quoteNotice, setQuoteNotice] = useState('');

  const [itemDescription, setItemDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  const [trackingKey, setTrackingKey] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeCategory = SHIPPING_CATEGORIES.find((c) => c.type === selectedCategory) || SHIPPING_CATEGORIES[0];

  const hasPickupInput = Boolean(pickupCoords || (pickupCalle.trim() && pickupColonia.trim()));
  const hasDeliveryInput = Boolean(deliveryCoords || (deliveryCalle.trim() && deliveryColonia.trim()));

  const buildGeocodeQuery = (calle: string, numero: string, colonia: string) => {
    const cleanNum = cleanStreetNumber(numero);
    const streetPart = `${calle.trim()}${cleanNum ? ` ${cleanNum}` : ''}`.trim();
    const colPart = stripColoniaTypeForGeocode(colonia);
    return [streetPart, colPart].filter(Boolean).join(', ');
  };

  // Cálculo automático en segundo plano vía API (OSRM + Nominatim con caché Redis)
  useEffect(() => {
    if (!hasPickupInput || !hasDeliveryInput) {
      setRouteQuote(null);
      setQuoteNotice('');
      setIsCalculatingRoute(false);
      return;
    }

    let cancelled = false;
    const delayMs = pickupCoords && deliveryCoords ? 120 : 550;

    const timer = window.setTimeout(async () => {
      setIsCalculatingRoute(true);
      setQuoteNotice('');
      try {
        const quote = await fetchExpressRouteQuote({
          pickupCoords,
          deliveryCoords,
          pickupAddress: buildGeocodeQuery(pickupCalle, pickupNumero, pickupColonia),
          deliveryAddress: buildGeocodeQuery(deliveryCalle, deliveryNumero, deliveryColonia),
          deliveryType,
        });
        if (cancelled) return;
        if (quote) {
          setRouteQuote(quote);
          setQuoteNotice('');
        } else {
          setRouteQuote(null);
          setQuoteNotice(
            'No pudimos geolocalizar alguna calle automáticamente. Usa "Ubicar en mapa (A / B)" para calcular tu tarifa exacta.'
          );
        }
      } catch {
        if (!cancelled) {
          setRouteQuote(null);
          setQuoteNotice('Ubica Punto A y Punto B en el mapa para calcular tu tarifa exacta.');
        }
      } finally {
        if (!cancelled) setIsCalculatingRoute(false);
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    pickupCoords?.lat,
    pickupCoords?.lng,
    deliveryCoords?.lat,
    deliveryCoords?.lng,
    pickupCalle,
    pickupNumero,
    pickupColonia,
    deliveryCalle,
    deliveryNumero,
    deliveryColonia,
    deliveryType,
    hasPickupInput,
    hasDeliveryInput,
  ]);

  // Recálculo instantáneo al cambiar modalidad (Normal / Exprés / Programado) manteniendo los km reales de la API
  const liveTariff = routeQuote
    ? calculateExpressShippingTariff(routeQuote.distanceKm, deliveryType, expressSurcharge)
    : null;

  const applySavedAddressToPoint = (target: 'pickup' | 'delivery', addr: CustomerSavedAddress) => {
    const cleanCalle = addr.calle.replace(/^calle\s+/i, '').trim();
    const cleanNum = cleanStreetNumber(addr.numero);
    const numCombined = cleanNum
      ? addr.numeroInterior
        ? `${cleanNum} Int. ${addr.numeroInterior}`
        : cleanNum
      : addr.numeroInterior
      ? `Int. ${addr.numeroInterior}`
      : '';
    const officialCol = resolveOfficialColonia(addr.colonia);
    const coords = addr.lat && addr.lng ? { lat: addr.lat, lng: addr.lng } : null;

    if (target === 'pickup') {
      setPickupCalle(cleanCalle);
      setPickupNumero(numCombined);
      setPickupColonia(officialCol);
      setPickupRef((addr.referencias || '').trim());
      setPickupCoords(coords);
    } else {
      setDeliveryCalle(cleanCalle);
      setDeliveryNumero(numCombined);
      setDeliveryColonia(officialCol);
      setDeliveryRef((addr.referencias || '').trim());
      setDeliveryCoords(coords);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (rainPauseEnabled) {
      setErrorMsg(
        rainPauseMessage ||
          '🌧️ Los envíos están pausados temporalmente por lluvia intensa en San Miguel de Allende.'
      );
      return;
    }

    if (!customerId || customerId === 'guest' || customerId === 'guest-envio') {
      setErrorMsg('⚠️ Para solicitar un envío express es necesario iniciar sesión o crear tu cuenta con validación de INE.');
      if (onRequireLogin) onRequireLogin();
      return;
    }

    if (!pickupCalle.trim() || !pickupColonia.trim() || !pickupPhone.trim()) {
      setErrorMsg('Por favor completa la Calle, Colonia y Teléfono del Punto A (Recolección).');
      return;
    }
    if (!deliveryCalle.trim() || !deliveryColonia.trim() || !recipientPhone.trim()) {
      setErrorMsg('Por favor completa la Calle, Colonia y Teléfono del Punto B (Entrega).');
      return;
    }
    if (!itemDescription.trim()) {
      setErrorMsg('Describe qué artículo o paquete se va a transportar.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Garantizar cotización oficial calculada por la API antes de generar la orden
      let confirmedQuote = routeQuote;
      if (!confirmedQuote) {
        confirmedQuote = await fetchExpressRouteQuote({
          pickupCoords,
          deliveryCoords,
          pickupAddress: buildGeocodeQuery(pickupCalle, pickupNumero, pickupColonia),
          deliveryAddress: buildGeocodeQuery(deliveryCalle, deliveryNumero, deliveryColonia),
          deliveryType,
        });
      }

      if (!confirmedQuote) {
        setErrorMsg(
          '📍 No pudimos verificar la distancia exacta entre el Punto A y el Punto B. Fija ambos puntos en el mapa para calcular la tarifa oficial.'
        );
        setIsSubmitting(false);
        return;
      }

      const finalTariff = calculateExpressShippingTariff(
        confirmedQuote.distanceKm,
        deliveryType,
        expressSurcharge
      );

      const fullPickupBase = formatSavedAddressLine({
        calle: pickupCalle,
        numero: pickupNumero.trim() || null,
        colonia: pickupColonia,
      });
      const fullDeliveryBase = formatSavedAddressLine({
        calle: deliveryCalle,
        numero: deliveryNumero.trim() || null,
        colonia: deliveryColonia,
      });

      const fullPickupAddress = `${fullPickupBase}${pickupRef.trim() ? ' (' + pickupRef.trim() + ')' : ''}`;
      const fullDeliveryAddress = `${fullDeliveryBase}${deliveryRef.trim() ? ' (' + deliveryRef.trim() + ')' : ''}`;

      const orderPayload: Omit<Order, 'id' | 'folio' | 'createdAt' | 'updatedAt'> = {
        orderType: 'envio',
        packageType: selectedCategory,
        customerId,
        customerName: recipientName.trim() || pickupContact.trim() || 'Cliente RODO',
        customerPhone: recipientPhone.trim() || pickupPhone.trim(),
        restaurantId: 'servicio-envios-rodo',
        restaurantName: `Envío ${deliveryType === 'express' ? 'Exprés' : deliveryType === 'programada' ? 'Programado' : 'Normal'} (${finalTariff.distanceKm.toFixed(1)} km)`,
        restaurantDeliveryFee: finalTariff.totalFee,
        restaurantCommissionRate: 100,
        deliveryType,
        deliveryTypeSurcharge: finalTariff.expressSurcharge,
        scheduledDeliveryTime: deliveryType === 'programada' ? scheduledTime : undefined,
        items: [
          {
            id: 'it-' + selectedCategory,
            name: `${activeCategory.title}: ${itemDescription.trim()} (${finalTariff.distanceKm.toFixed(1)} km · ${deliveryType.toUpperCase()})`,
            price: finalTariff.totalFee,
            quantity: 1,
            notes: instructions.trim(),
          },
        ],
        subtotal: finalTariff.totalFee,
        deliveryFee: finalTariff.totalFee,
        commissionAmount: finalTariff.totalFee,
        total: finalTariff.totalFee,
        paymentMethod,
        paymentStatus: paymentMethod === 'transferencia' ? 'pendiente' : 'en_efectivo',
        bankVerification: paymentMethod === 'transferencia' ? { trackingKey: trackingKey.trim(), verified: false, statusMessage: 'Pendiente de revisión.' } : undefined,
        pickupCoordinates: confirmedQuote.pickupCoords || pickupCoords || undefined,
        pickupAddress: fullPickupAddress,
        pickupPhone: pickupPhone.trim(),
        deliveryAddress: fullDeliveryAddress,
        deliveryNotes: `MODALIDAD: ${deliveryType.toUpperCase()}${deliveryType === 'programada' ? ' (Hora: ' + scheduledTime + ')' : ''} | DISTANCIA REAL API (${confirmedQuote.source.toUpperCase()}): ${finalTariff.distanceKm.toFixed(1)} km | TIEMPO APROX: ~${finalTariff.estimatedMinutes} min | RECOGER CON: ${pickupContact || 'Contacto'} (${pickupPhone}). NOTAS: ${instructions || 'Sin notas'}`,
        distanceKm: finalTariff.distanceKm,
        routeEstimateMinutes: finalTariff.estimatedMinutes,
        routePathSummary: `${fullPickupAddress.slice(0, 25)}... ➔ ${fullDeliveryAddress.slice(0, 25)}... (${finalTariff.distanceKm.toFixed(1)} km · ~${finalTariff.estimatedMinutes} min)`,
        status: 'nuevo',
        coordinates: confirmedQuote.deliveryCoords || deliveryCoords || pickupCoords || undefined,
      };

      const completedOrder = await submitOrderWithQueue(orderPayload);
      onOrderSuccess(completedOrder);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Hubo un error al generar la solicitud de envío.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-md border border-gray-200">
      <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
        <div>
          <span className="bg-[#ed0718] text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
            TARIFA CALCULADA AUTOMÁTICAMENTE (PUNTO A ➔ PUNTO B)
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-2">
            Envío Express de Paquetes, Documentos y Flores
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Ingresa el Punto A (recolección) y el Punto B (entrega) y el sistema calculará automáticamente la ruta real y el costo exacto en San Miguel de Allende.
          </p>
        </div>

        {rainPauseEnabled && (
          <div className="bg-sky-50 border-2 border-sky-400 text-sky-950 p-4 rounded-2xl text-xs font-bold flex items-start gap-2.5 shadow-xs">
            <CloudRain className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black uppercase text-[11px]">
                🌧️ Envíos Pausados por Lluvia en San Miguel
              </strong>
              <span className="font-medium">
                {rainPauseMessage ||
                  'Por seguridad de los repartidores y cuidado de tus paquetes, los envíos están pausados temporalmente hasta que cese la lluvia.'}
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Selector de Tipo de Envío */}
        <div>
          <label className="block text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
            1. ¿Qué vas a enviar?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHIPPING_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.type;
              return (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => setSelectedCategory(cat.type)}
                  className={`p-4 rounded-2xl border-2 text-left transition flex items-start gap-3.5 cursor-pointer ${
                    isSelected
                      ? 'border-[#ed0718] bg-red-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-[#ed0718] text-white' : 'bg-gray-100 text-gray-700'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className="font-extrabold text-sm text-gray-900 block">{cat.title}</span>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cat.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Formulario directo de Punto A y Punto B (cálculo automático interno por API) */}
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* PUNTO A: Dónde Recoger */}
          <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-gray-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">A</span>
                Punto A · Recolección (Dónde recoge la moto)
              </div>
              <button
                type="button"
                onClick={() => setActiveMapPickerTarget('pickup')}
                className="text-[11px] font-black text-white bg-slate-900 hover:bg-[#ed0718] px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-red-400" />
                <span>📍 Ubicar en mapa (A)</span>
              </button>
            </div>

            {savedAddresses.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500">Usar guardada:</span>
                {savedAddresses.map((addr) => (
                  <button
                    key={`pickup-${addr.id}`}
                    type="button"
                    onClick={() => applySavedAddressToPoint('pickup', addr)}
                    className="text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    📍 {addr.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Calle *</label>
                <input
                  type="text"
                  value={pickupCalle}
                  onChange={(e) => {
                    setPickupCoords(null);
                    setPickupCalle(e.target.value);
                  }}
                  required
                  placeholder="Ej. Ancha de San Antonio, Nemesio Diez..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-semibold outline-none focus:border-[#ed0718]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Número Ext / Int <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={pickupNumero}
                  onChange={(e) => setPickupNumero(e.target.value)}
                  placeholder="Ej. 45 o vacío S/N"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-semibold outline-none focus:border-[#ed0718]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Colonia / Fraccionamiento *</label>
                <SmaColoniaCombobox
                  value={pickupColonia}
                  onChange={(col) => {
                    setPickupCoords(null);
                    setPickupColonia(col);
                  }}
                  placeholder="Busca y selecciona la colonia (A) *"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Referencias de Recolección</label>
                <input
                  type="text"
                  value={pickupRef}
                  onChange={(e) => setPickupRef(e.target.value)}
                  placeholder="Ej. Portón verde, frente a tienda Lupita..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white outline-none focus:border-[#ed0718]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de quien entrega el paquete</label>
                <input
                  type="text"
                  value={pickupContact}
                  onChange={(e) => setPickupContact(e.target.value)}
                  placeholder="Ej. Florería San Ángel o Casa de María"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white outline-none focus:border-[#ed0718]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono de Recolección *</label>
                <input
                  type="tel"
                  value={pickupPhone}
                  onChange={(e) => setPickupPhone(e.target.value)}
                  required
                  placeholder="4151234567"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-mono font-semibold outline-none focus:border-[#ed0718]"
                />
              </div>
            </div>

            {pickupCoords && (
              <div className="text-[11px] text-blue-900 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 font-bold flex items-center justify-between">
                <span>📍 Punto A fijado en GPS ({pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)})</span>
                <button type="button" onClick={() => setActiveMapPickerTarget('pickup')} className="text-[#ed0718] hover:underline cursor-pointer">
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* PUNTO B: Dónde Entregar */}
          <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-gray-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">B</span>
                Punto B · Entrega (Destino del Cliente)
              </div>
              <button
                type="button"
                onClick={() => setActiveMapPickerTarget('delivery')}
                className="text-[11px] font-black text-white bg-slate-900 hover:bg-[#ed0718] px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>📍 Ubicar en mapa (B)</span>
              </button>
            </div>

            {savedAddresses.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500">Usar guardada:</span>
                {savedAddresses.map((addr) => (
                  <button
                    key={`delivery-${addr.id}`}
                    type="button"
                    onClick={() => applySavedAddressToPoint('delivery', addr)}
                    className="text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    📍 {addr.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Calle *</label>
                <input
                  type="text"
                  value={deliveryCalle}
                  onChange={(e) => {
                    setDeliveryCoords(null);
                    setDeliveryCalle(e.target.value);
                  }}
                  required
                  placeholder="Ej. Calzada de la Aurora, Mesones..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-semibold outline-none focus:border-[#ed0718]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Número Ext / Int <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={deliveryNumero}
                  onChange={(e) => setDeliveryNumero(e.target.value)}
                  placeholder="Ej. 12 o vacío S/N"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-semibold outline-none focus:border-[#ed0718]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Colonia / Fraccionamiento *</label>
                <SmaColoniaCombobox
                  value={deliveryColonia}
                  onChange={(col) => {
                    setDeliveryCoords(null);
                    setDeliveryColonia(col);
                  }}
                  placeholder="Busca y selecciona la colonia (B) *"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Referencias de Entrega</label>
                <input
                  type="text"
                  value={deliveryRef}
                  onChange={(e) => setDeliveryRef(e.target.value)}
                  placeholder="Ej. Fachada amarilla, junto a farmacia..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white outline-none focus:border-[#ed0718]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Destinatario</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej. Lic. Roberto Gómez"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white outline-none focus:border-[#ed0718]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono de Quien Recibe *</label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  required
                  placeholder="4159876543"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-mono font-semibold outline-none focus:border-[#ed0718]"
                />
              </div>
            </div>

            {deliveryCoords && (
              <div className="text-[11px] text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold flex items-center justify-between">
                <span>📍 Punto B fijado en GPS ({deliveryCoords.lat.toFixed(4)}, {deliveryCoords.lng.toFixed(4)})</span>
                <button type="button" onClick={() => setActiveMapPickerTarget('delivery')} className="text-[#ed0718] hover:underline cursor-pointer">
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* Descripción del Paquete */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                ¿Qué estamos transportando? (Detalles del paquete) *
              </label>
              <input
                type="text"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                required
                placeholder="Ej. Ramo de flores / Sobre con escrituras / Caja de zapatos"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#ed0718]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Instrucciones o cuidados especiales (Opcional)
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ej. Mantener vertical, tocar timbre blanco, pedir firma de recibido"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#ed0718]"
              />
            </div>
          </div>

          {/* 3. MODALIDAD DE ENVÍO: Normal, Exprés, Programado */}
          <div className="space-y-2 pt-1 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <label className="block text-xs font-black text-gray-900 uppercase tracking-wider">
              Selecciona Modalidad de Envío
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType('normal')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  deliveryType === 'normal'
                    ? 'border-[#ed0718] bg-red-50 text-[#ed0718] font-black shadow-xs ring-2 ring-red-400'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="text-xs font-black">🛵 Normal</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {liveTariff ? `Estándar · ~${liveTariff.estimatedMinutes} min` : 'Estándar'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('express')}
                className={`p-3 rounded-2xl border text-center transition relative cursor-pointer ${
                  deliveryType === 'express'
                    ? 'border-[#ed0718] bg-red-50 text-[#ed0718] font-black shadow-xs ring-2 ring-red-400'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="absolute -top-1.5 -right-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  +${expressSurcharge} MXN
                </span>
                <div className="text-xs font-black flex items-center justify-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Exprés
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Prioridad directa inmediata</div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('programada')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  deliveryType === 'programada'
                    ? 'border-[#ed0718] bg-red-50 text-[#ed0718] font-black shadow-xs ring-2 ring-red-400'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="text-xs font-black flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> Programado
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Elegir horario hoy</div>
              </button>
            </div>

            {deliveryType === 'programada' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs mt-2">
                <span className="font-bold text-blue-950">Hora programada de recolección hoy:</span>
                <select
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="border border-blue-300 rounded-lg px-3 py-1 font-bold text-xs bg-white text-gray-800"
                >
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="19:00">7:00 PM</option>
                  <option value="20:00">8:00 PM</option>
                </select>
              </div>
            )}
          </div>

          {/* Resumen Automático de Tarifa Calculada por API (solo lectura) + Método de Pago */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-[#ed0718] shrink-0" />
                <div>
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wider block">
                    Tarifa Calculada Automáticamente (A ➔ B)
                  </span>
                  {isCalculatingRoute ? (
                    <span className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Calculando ruta real en San Miguel...
                    </span>
                  ) : liveTariff ? (
                    <span className="text-[11px] text-emerald-700 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ruta verificada: {liveTariff.distanceKm.toFixed(1)} km · ~{liveTariff.estimatedMinutes} min
                      {deliveryType === 'express' ? ` · incluye +$${expressSurcharge} Exprés` : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500 font-medium">
                      Completa Punto A y Punto B (o ubícalos en el mapa) para obtener el costo exacto.
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-lg sm:text-xl font-black text-[#ed0718]">
                  {isCalculatingRoute
                    ? '...'
                    : liveTariff
                    ? `$${liveTariff.totalFee} MXN`
                    : 'Por calcular'}
                </span>
                <span className="block text-[10px] text-gray-500 font-semibold">
                  Base $30 (2 km) + $10/km extra
                </span>
              </div>
            </div>

            {quoteNotice && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl text-[11px] font-semibold">
                ⚠️ {quoteNotice}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold pt-1">
              <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${paymentMethod === 'efectivo' ? 'bg-white border-[#ed0718] text-[#ed0718]' : 'bg-gray-100 text-gray-700'}`}>
                <input
                  type="radio"
                  name="shipPayment"
                  checked={paymentMethod === 'efectivo'}
                  onChange={() => setPaymentMethod('efectivo')}
                />
                <Banknote className="w-4 h-4" />
                <span>Pagar en Efectivo (Al entregar o recoger)</span>
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${paymentMethod === 'transferencia' ? 'bg-white border-[#ed0718] text-[#ed0718]' : 'bg-gray-100 text-gray-700'}`}>
                <input
                  type="radio"
                  name="shipPayment"
                  checked={paymentMethod === 'transferencia'}
                  onChange={() => setPaymentMethod('transferencia')}
                />
                <CreditCard className="w-4 h-4" />
                <span>Pagar por Transferencia SPEI</span>
              </label>
            </div>
            {paymentMethod === 'transferencia' && <label className="block text-sm">
              Cuenta de destino: {bankAccount}. Ingresa la clave de rastreo para revisión por despacho.
              <input required minLength={6} maxLength={35} value={trackingKey} onChange={e => setTrackingKey(e.target.value)} className="block w-full rounded border p-2" />
            </label>}
          </div>

          {/* Respaldo Legal RODO para Envíos */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ed0718] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>Intermediación y Entrega:</b> RODO es una empresa independiente de mensajería. Los paquetes se transportan cerrados. En recolección y entrega se cuenta con un margen de tolerancia máximo de 10 minutos. La tarifa se calcula automáticamente por la ruta real entre el Punto A y el Punto B.
            </p>
          </div>

          {/* Botón de Confirmación */}
          <button
            type="submit"
            disabled={isSubmitting || isCalculatingRoute}
            className="w-full bg-[#ed0718] hover:bg-[#c90012] disabled:bg-gray-400 text-white font-black text-sm py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Calculando ruta y generando ticket...</span>
              </>
            ) : liveTariff ? (
              <span>
                🚀 Solicitar Repartidor RODO · ${liveTariff.totalFee} MXN ({liveTariff.distanceKm.toFixed(1)} km)
              </span>
            ) : (
              <span>🚀 Calcular Ruta y Solicitar Repartidor RODO</span>
            )}
          </button>
        </form>

        {/* MODAL DE SELECCIÓN EN MAPA (Para A o B) */}
        {activeMapPickerTarget && (
          <div className="fixed inset-0 z-80 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between border-b p-4 sm:p-5 shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#ed0718] bg-red-50 px-2 py-0.5 rounded-full">
                    {activeMapPickerTarget === 'pickup' ? 'Punto A · Recolección' : 'Punto B · Entrega'}
                  </span>
                  <h4 className="font-extrabold text-base text-gray-900 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#ed0718]" /> Ubicar en Mapa de San Miguel de Allende
                  </h4>
                  <p className="text-xs text-gray-500">
                    Da clic en el mapa para fijar el punto exacto de {activeMapPickerTarget === 'pickup' ? 'recolección' : 'entrega'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMapPickerTarget(null)}
                  className="text-gray-400 hover:text-black p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
                <InteractiveMapPicker
                  initialLat={
                    activeMapPickerTarget === 'pickup'
                      ? (pickupCoords?.lat || 20.9144)
                      : (deliveryCoords?.lat || 20.9205)
                  }
                  initialLng={
                    activeMapPickerTarget === 'pickup'
                      ? (pickupCoords?.lng || -100.7437)
                      : (deliveryCoords?.lng || -100.738)
                  }
                  onLocationSelect={(loc) => {
                    if (activeMapPickerTarget === 'pickup') {
                      setPickupCoords({ lat: loc.lat, lng: loc.lng });
                      if (loc.street && loc.street.trim()) {
                        setPickupCalle(loc.street.trim());
                      }
                      if (loc.streetNumber && loc.streetNumber.trim()) {
                        setPickupNumero(cleanStreetNumber(loc.streetNumber));
                      }
                      if (loc.neighborhood && loc.neighborhood.trim()) {
                        setPickupColonia(resolveOfficialColonia(loc.neighborhood));
                      }
                    } else {
                      setDeliveryCoords({ lat: loc.lat, lng: loc.lng });
                      if (loc.street && loc.street.trim()) {
                        setDeliveryCalle(loc.street.trim());
                      }
                      if (loc.streetNumber && loc.streetNumber.trim()) {
                        setDeliveryNumero(cleanStreetNumber(loc.streetNumber));
                      }
                      if (loc.neighborhood && loc.neighborhood.trim()) {
                        setDeliveryColonia(resolveOfficialColonia(loc.neighborhood));
                      }
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => setActiveMapPickerTarget(null)}
                  className="w-full bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs py-3 rounded-xl shadow-md transition cursor-pointer"
                >
                  ✓ Confirmar Punto en el Mapa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
