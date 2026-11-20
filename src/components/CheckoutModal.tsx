import React, { useState } from 'react';
import { Restaurant, OrderItem, Order, BankVerificationData, MenuItem } from '../types';
import { verifyBankTransferIncome } from '../services/bankVerification';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import {
  generateUniqueTicketFolio,
  createOrderInDb,
  getCustomerCashLimit,
  isCustomerBlocked,
  getRestaurants,
  getDispatchSettings,
} from '../services/db';
import { computeOrderRoute, calculateHaversineDistance, SMA_CENTER_COORDS } from '../services/routing';
import { submitOrderWithQueue } from '../services/orderQueue';
import { vibrateOrderComplete, vibrateLight } from '../utils/haptics';
import { useLanguage } from '../utils/i18n';
import {
  X,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Banknote,
  Loader2,
  FileText,
  Zap,
  Clock,
  Heart,
  Plus,
  Sparkles,
  ShieldAlert,
  Navigation,
  Compass,
  CloudRain,
} from 'lucide-react';

export const SMA_COLONIAS = [
  'Centro Histórico',
  'San Antonio',
  'San Luis Rey',
  'La Aurora',
  'Guadalupe',
  'San Rafael',
  'Valle del Maíz',
  'Infonavit Malanquín',
  'La Lejona',
  'Los Frailes',
  'Independencia',
  'Santa Julia',
  'Ventanas Golf',
  'Montes de Loreto',
  'Olimpo',
  'Palmita',
  'Otra / Fraccionamiento Privado',
];

interface CheckoutModalProps {
  restaurant: Restaurant;
  restaurants?: Restaurant[];
  coveragePolygon?: { lat: number; lng: number }[];
  cart: OrderItem[];
  customerId: string;
  customerDefaultName?: string;
  customerDefaultPhone?: string;
  customerDefaultEmail?: string;
  initialDeliveryAddress?: string;
  initialCoords?: { lat: number; lng: number };
  customerOrdersCount?: number;
  clabeRodoFallback?: string;
  bancoRodoFallback?: string;
  expressSurcharge?: number;
  onAddToCart?: (item: OrderItem) => void;
  onOrderSuccess: (order: Order) => void;
  onClose: () => void;
  onRequireLogin?: () => void;
  rainPauseEnabled?: boolean;
  rainPauseMessage?: string;
}

const PROMO_CODES_CATALOG: Record<
  string,
  { type: 'percent' | 'delivery_free' | 'delivery_discount'; value: number; label: string }
> = {
  RODO10: { type: 'percent', value: 10, label: '10% OFF en tu pedido (RODO10)' },
  RODO15: { type: 'percent', value: 15, label: '15% OFF en tu pedido (RODO15)' },
  RODO20: { type: 'percent', value: 20, label: '20% OFF especial (RODO20)' },
  SMA15: { type: 'percent', value: 15, label: '15% OFF San Miguel (SMA15)' },
  ENVIOGRATIS: { type: 'delivery_free', value: 100, label: 'Envío Gratis (ENVIOGRATIS)' },
  ENVIO50: { type: 'delivery_discount', value: 50, label: '50% OFF en Envío (ENVIO50)' },
};

function isPointInsidePolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;
    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  restaurant,
  restaurants,
  coveragePolygon,
  cart: initialCart,
  customerId,
  customerDefaultName = '',
  customerDefaultPhone = '',
  customerDefaultEmail = '',
  initialDeliveryAddress = '',
  initialCoords,
  customerOrdersCount = 0,
  clabeRodoFallback = '012180015678901234',
  bancoRodoFallback = 'BBVA',
  expressSurcharge = 25,
  onAddToCart,
  onOrderSuccess,
  onClose,
  onRequireLogin,
  rainPauseEnabled = false,
  rainPauseMessage,
}) => {
  const { t } = useLanguage();
  const liveRestaurant = restaurants?.find((r) => r.id === restaurant.id) || restaurant;
  const isLiveClosed = liveRestaurant.isOpen === false || liveRestaurant.isActive === false;

  const [localCart, setLocalCart] = useState<OrderItem[]>(initialCart);
  const [customerName, setCustomerName] = useState(customerDefaultName);
  const [customerPhone, setCustomerPhone] = useState(customerDefaultPhone);

  // Dirección estructurada de Entrega: Calle, Número, Colonia, Referencias y Mapa
  const [deliveryCalle, setDeliveryCalle] = useState(() => {
    if (initialDeliveryAddress.includes(',')) {
      return initialDeliveryAddress.split(',')[0].replace(/Calle\s*/i, '').trim();
    }
    return initialDeliveryAddress.trim();
  });
  const [deliveryNumero, setDeliveryNumero] = useState('#14');
  const [deliveryColonia, setDeliveryColonia] = useState('San Antonio');
  const [deliveryCustomColonia, setDeliveryCustomColonia] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryPinCoords, setDeliveryPinCoords] = useState<{ lat: number; lng: number } | null>(
    initialCoords || null
  );
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [geoMismatchWarning, setGeoMismatchWarning] = useState('');

  // Código de Promoción
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Tipo de entrega: normal, express, programada
  const [deliveryType, setDeliveryType] = useState<'normal' | 'express' | 'programada'>('normal');
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('14:30');

  // Propina para el repartidor: 0%, 10%, 15%, 20% o Personalizada
  const [tipPercentage, setTipPercentage] = useState<number>(10);
  const [tipMode, setTipMode] = useState<'percentage' | 'custom'>('percentage');
  const [customTipValue, setCustomTipValue] = useState<number>(20);

  // Método de pago: si el restaurante no acepta transferencia, por defecto es efectivo
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>(
    restaurant.acceptsCash ? 'efectivo' : 'transferencia'
  );

  // Simulación realista de transferencia bancaria SPEI y tarjeta solicitada por el usuario
  const [cardHolderName, setCardHolderName] = useState(customerDefaultName || 'Juan Pérez');
  const [senderBank, setSenderBank] = useState('BBVA Bancomer');
  const [paymentSimulationType, setPaymentSimulationType] = useState<'spei' | 'tarjeta'>('spei');
  const [accountOrCardDigits, setAccountOrCardDigits] = useState('4819');
  const [trackingKey, setTrackingKey] = useState('');
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankVerificationResult, setBankVerificationResult] = useState<BankVerificationData | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [acceptedPrivacyTerms, setAcceptedPrivacyTerms] = useState(true);

  // Validación de Geofencing SMA (10 km desde Centro + polígono si existe)
  const checkGeofence = (coords: { lat: number; lng: number } | null) => {
    if (!coords) return { valid: true, distanceFromCenter: 0 };
    const distanceFromCenter = calculateHaversineDistance(
      SMA_CENTER_COORDS.lat,
      SMA_CENTER_COORDS.lng,
      coords.lat,
      coords.lng
    );
    const insidePolygon =
      coveragePolygon && coveragePolygon.length >= 3
        ? isPointInsidePolygon(coords, coveragePolygon)
        : true;
    const valid = distanceFromCenter <= 10.5 && insidePolygon;
    return { valid, distanceFromCenter };
  };

  const geofenceStatus = checkGeofence(deliveryPinCoords);

  // Cálculos
  const subtotal = localCart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const baseDeliveryFee = restaurant.deliveryFee;
  const currentExpressFee = deliveryType === 'express' ? expressSurcharge : 0;
  const rawDeliveryFee = baseDeliveryFee + currentExpressFee;

  // Descuento Promocional del restaurante sobre sobreprecio RODO
  const promoPercent = restaurant.promoActive ? (restaurant.promoDiscountPercent || 0) : 0;
  const totalSurchargeInCart = localCart.reduce((sum, it) => {
    const itemSur = it.surcharge !== undefined && it.surcharge > 0 ? it.surcharge : Math.round(it.price * 0.15);
    return sum + (itemSur * it.quantity);
  }, 0);
  const restaurantPromoDiscount = promoPercent > 0 ? Math.round((totalSurchargeInCart * promoPercent) / 100) : 0;

  // Código promocional del cliente
  const couponRule = appliedPromoCode ? PROMO_CODES_CATALOG[appliedPromoCode] : undefined;
  let couponProductDiscount = 0;
  let couponDeliveryDiscount = 0;
  if (couponRule) {
    if (couponRule.type === 'percent') {
      couponProductDiscount = Math.round((subtotal * couponRule.value) / 100);
    } else if (couponRule.type === 'delivery_free') {
      couponDeliveryDiscount = rawDeliveryFee;
    } else if (couponRule.type === 'delivery_discount') {
      couponDeliveryDiscount = Math.round((rawDeliveryFee * couponRule.value) / 100);
    }
  }

  const totalDeliveryFee = Math.max(0, rawDeliveryFee - couponDeliveryDiscount);
  const promoDiscount = restaurantPromoDiscount + couponProductDiscount;

  // Propina calculada
  const tipAmount = tipMode === 'custom'
    ? Math.max(0, Number(customTipValue) || 0)
    : (tipPercentage > 0 ? Math.round((Math.max(0, subtotal - promoDiscount) * tipPercentage) / 100) : 0);

  const total = Math.max(0, subtotal - promoDiscount) + totalDeliveryFee + tipAmount;
  const commissionAmount = Math.max(0, (subtotal * (restaurant.commissionRate || 15)) / 100 - restaurantPromoDiscount);

  const handleApplyPromoCode = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoFeedback({ ok: false, msg: 'Ingresa un código (ej. RODO10, SMA15, ENVIOGRATIS).' });
      return;
    }
    const found = PROMO_CODES_CATALOG[code];
    if (!found) {
      setAppliedPromoCode(null);
      setPromoFeedback({
        ok: false,
        msg: 'Código no válido o expirado. Prueba RODO10, RODO15, SMA15 o ENVIOGRATIS.',
      });
      return;
    }
    setAppliedPromoCode(code);
    setPromoFeedback({ ok: true, msg: `✓ Cupón aplicado: ${found.label}` });
    vibrateLight();
  };

  const handleUpdateItemNotes = (idx: number, nextNotes: string) => {
    setLocalCart((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, notes: nextNotes } : it))
    );
  };

  // Límite antifraude para efectivo:
  // Pedido 1 (0 previos): $300 en producto
  // Pedido 2 (1 previo): $400 en producto
  // Pedido 3 (2 previos): $500 en producto
  // Pedido 4+ (3 o más previos): $1,000 en producto
  const cashLimit = getCustomerCashLimit(customerOrdersCount);
  const isCashLimitExceeded = paymentMethod === 'efectivo' && subtotal > cashLimit;

  // Extras sugeridos del restaurante
  const extrasList: MenuItem[] = restaurant.suggestedExtras || [
    {
      id: 'ext-coca-chk',
      name: 'Coca-Cola 600ml bien fría',
      description: 'Refresco frío',
      price: 30,
      isAvailable: true,
    },
    {
      id: 'ext-agua-chk',
      name: 'Agua Fresca Natural 1L',
      description: 'Horchata o Jamaica recién hecha',
      price: 35,
      isAvailable: true,
    },
    {
      id: 'ext-papas-chk',
      name: 'Papas a la Francesa Crujientes',
      description: 'Con cátsup',
      price: 45,
      isAvailable: true,
    },
  ];

  const handleAddExtraToCheckout = (extra: MenuItem) => {
    setLocalCart((prev) => {
      const idx = prev.findIndex((i) => i.id === extra.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [
        ...prev,
        {
          id: extra.id,
          name: extra.name,
          price: extra.price,
          quantity: 1,
          isExtra: true,
        },
      ];
    });
    if (onAddToCart) {
      onAddToCart({
        id: extra.id,
        name: extra.name,
        price: extra.price,
        quantity: 1,
        isExtra: true,
      });
    }
  };

  // Verificación de transferencia bancaria
  const handleVerifyTransfer = async () => {
    if (!trackingKey.trim() || trackingKey.trim().length < 6) {
      setErrorMsg('Ingresa una Clave de Rastreo SPEI o Folio bancario válido (mínimo 6 caracteres).');
      return;
    }
    setErrorMsg('');
    setIsVerifyingBank(true);
    try {
      const res = await verifyBankTransferIncome({
        trackingKey,
        expectedAmount: total,
        senderBank,
        orderFolio: 'VERIF-PREV',
      });
      setBankVerificationResult(res);
      if (!res.verified) {
        setErrorMsg(res.statusMessage);
      }
    } catch {
      setErrorMsg('Error al conectar con el servicio de verificación bancaria.');
    } finally {
      setIsVerifyingBank(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Bloqueo por lluvia (prop + verificación en tiempo real)
    if (rainPauseEnabled) {
      setErrorMsg(
        rainPauseMessage ||
          '🌧️ Envíos pausados temporalmente por lluvia en San Miguel de Allende. Reanudaremos en cuanto mejore el clima.'
      );
      return;
    }
    try {
      const liveSettings = await getDispatchSettings();
      if (liveSettings.rainPauseEnabled) {
        setErrorMsg(
          liveSettings.rainPauseMessage ||
            '🌧️ Envíos pausados temporalmente por lluvia en San Miguel de Allende. Reanudaremos en cuanto mejore el clima.'
        );
        return;
      }
    } catch {}

    // Validación obligatoria de inicio de sesión con INE
    if (!customerId || customerId === 'guest' || customerId.startsWith('guest')) {
      setErrorMsg('⚠️ Para realizar un pedido es necesario iniciar sesión y validar tu INE (10 dígitos).');
      if (onRequireLogin) onRequireLogin();
      return;
    }

    // Verificación de bloqueo antifraude por administrador
    const blockCheck = isCustomerBlocked(customerPhone, customerDefaultEmail);
    if (blockCheck.blocked) {
      setErrorMsg(
        `Cuenta suspendida por seguridad y prevención de fraudes (${blockCheck.reason || 'Reportado en plataforma'}). Contacta a soporte de RODO Moto Mandados vía WhatsApp.`
      );
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 8) {
      setErrorMsg('Por favor ingresa un número de teléfono válido para la entrega.');
      return;
    }

    const finalColonia = deliveryColonia === 'Otra / Fraccionamiento Privado'
      ? (deliveryCustomColonia.trim() || 'San Miguel')
      : deliveryColonia;

    if (!deliveryCalle.trim() || !deliveryNumero.trim() || !finalColonia.trim()) {
      setErrorMsg('Por favor completa la Calle, Número exterior/interior y Colonia en San Miguel de Allende.');
      return;
    }

    const fullDeliveryAddress = `Calle ${deliveryCalle.trim()} #${deliveryNumero.trim()}, Col. ${finalColonia}${deliveryNotes.trim() ? ' (' + deliveryNotes.trim() + ')' : ''}`;

    if (!acceptedPrivacyTerms) {
      setErrorMsg('Debes aceptar los Avisos de Privacidad y Términos de Intermediación para continuar.');
      return;
    }

    // Regla Antifraude en efectivo
    if (isCashLimitExceeded) {
      setErrorMsg(
        `Por política antifraude para tu pedido #${customerOrdersCount + 1}, el límite en efectivo es de $${cashLimit} MXN en productos. Puedes seleccionar Pago por Transferencia (sin límite) o reducir tu pedido.`
      );
      return;
    }

    if (paymentMethod === 'transferencia') {
      if (!bankVerificationResult || !bankVerificationResult.verified) {
        setErrorMsg('Debes realizar la verificación simulada de tu transferencia/tarjeta antes de generar el pedido para evitar cancelaciones.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Validación en tiempo real de apertura del restaurante antes de enviar
      if (isLiveClosed) {
        setErrorMsg(
          `🚫 ${t('closedBlockTitle')}: "${liveRestaurant.name}" cambió su estado a CERRADO (${liveRestaurant.closureReason || 'pedidos pausados temporalmente'}).`
        );
        setIsSubmitting(false);
        return;
      }
      try {
        const freshRestaurants = await getRestaurants();
        const latestLocal = freshRestaurants.find((r) => r.id === restaurant.id);
        if (latestLocal && (latestLocal.isOpen === false || latestLocal.isActive === false)) {
          setErrorMsg(
            `🚫 ${t('closedBlockTitle')}: "${latestLocal.name}" acaba de cerrar sus pedidos (${latestLocal.closureReason || 'cierre temporal'}).`
          );
          setIsSubmitting(false);
          return;
        }
      } catch {
        // continuar usando el estado en memoria si la red falla
      }

      // 2. Validación de Geofencing en San Miguel de Allende
      if (!geofenceStatus.valid) {
        setErrorMsg(
          `📍 ${t('geofenceBlockTitle')}: El punto seleccionado está a ${geofenceStatus.distanceFromCenter} km del Centro (máximo 10 km en San Miguel de Allende). Ajusta tu pin dentro de la zona.`
        );
        setIsSubmitting(false);
        return;
      }

      // Calcular ruta, distancia y tiempo estimado de entrega en moto
      const originCoords = restaurant.coordinates || { lat: 20.9144, lng: -100.7437 };
      const destCoords = deliveryPinCoords || { lat: 20.9144, lng: -100.7437 };
      const routeInfo = computeOrderRoute(
        originCoords,
        destCoords,
        restaurant.name,
        fullDeliveryAddress,
        baseDeliveryFee,
        7,
        deliveryType === 'express',
        currentExpressFee
      );

      const orderPayload: Omit<Order, 'id' | 'folio' | 'createdAt' | 'updatedAt'> = {
        orderType: 'comida',
        customerId: customerId || 'guest-' + Date.now(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerDefaultEmail,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantDeliveryFee: totalDeliveryFee,
        restaurantCommissionRate: restaurant.commissionRate,
        items: localCart,
        subtotal,
        deliveryFee: totalDeliveryFee,
        commissionAmount,
        deliveryType,
        deliveryTypeSurcharge: currentExpressFee,
        scheduledDeliveryDate: deliveryType === 'programada' ? scheduledDate : undefined,
        scheduledDeliveryTime: deliveryType === 'programada' ? scheduledTime : undefined,
        scheduledConfirmationStatus: deliveryType === 'programada' ? 'pendiente_confirmacion' : undefined,
        tipPercentage: tipMode === 'percentage' ? tipPercentage : 0,
        tipAmount,
        promoCode: appliedPromoCode || undefined,
        promoDiscountType: couponRule?.type,
        promoDiscountApplied:
          promoDiscount + couponDeliveryDiscount > 0
            ? promoDiscount + couponDeliveryDiscount
            : undefined,
        promoLabel:
          couponRule?.label ||
          (restaurantPromoDiscount > 0
            ? restaurant.promoLabel || `${promoPercent}% OFF Sobreprecio`
            : undefined),
        total,
        paymentMethod,
        paymentStatus: paymentMethod === 'transferencia' ? 'verificado' : 'en_efectivo',
        bankVerification: paymentMethod === 'transferencia' ? (bankVerificationResult || undefined) : undefined,
        deliveryAddress: fullDeliveryAddress,
        deliveryNotes: deliveryNotes.trim(),
        coordinates: deliveryPinCoords || undefined,
        distanceKm: routeInfo.distanceKm,
        routeEstimateMinutes: routeInfo.estimatedMinutes,
        routePathSummary: routeInfo.routeSummary,
        status: 'nuevo',
      };

      const completedOrder = await submitOrderWithQueue(orderPayload);
      vibrateOrderComplete();
      onOrderSuccess(completedOrder);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Hubo un error al guardar tu orden. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bankClabe = restaurant.bankDetails || `CLABE ${clabeRodoFallback} · ${bancoRodoFallback}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95dvh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden sm:my-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base">Confirmar Pedido & Despacho</h3>
            <p className="text-xs text-gray-300">
              {restaurant.name} · Envío base: ${baseDeliveryFee} MXN
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handlePlaceOrder} className="p-4 sm:p-6 min-h-0 overflow-y-auto overscroll-contain flex-1 space-y-4">
          {rainPauseEnabled && (
            <div className="bg-sky-50 border-2 border-sky-400 text-sky-950 p-3.5 rounded-xl text-xs flex items-start gap-2.5 shadow-xs">
              <CloudRain className="w-5 h-5 shrink-0 text-sky-600 mt-0.5" />
              <div>
                <strong className="block font-black uppercase text-[11px]">
                  🌧️ Envíos Pausados Temporalmente por Lluvia
                </strong>
                <span>
                  {rainPauseMessage ||
                    'Por lluvia intensa en San Miguel de Allende los envíos están en pausa temporal. Intenta de nuevo en cuanto mejore el clima.'}
                </span>
              </div>
            </div>
          )}

          {isLiveClosed && (
            <div className="bg-amber-50 border-2 border-amber-400 text-amber-950 p-3.5 rounded-xl text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="block font-black uppercase text-[11px]">{t('closedBlockTitle')}</strong>
                <span>
                  "{liveRestaurant.name}" pausó sus pedidos en tiempo real ({liveRestaurant.closureReason || 'cerrado temporalmente'}). No es posible enviar órdenes en este momento.
                </span>
              </div>
            </div>
          )}

          {!geofenceStatus.valid && (
            <div className="bg-red-50 border-2 border-red-400 text-red-900 p-3.5 rounded-xl text-xs flex items-start gap-2 shadow-xs">
              <MapPin className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <strong className="block font-black uppercase text-[11px]">{t('geofenceBlockTitle')}</strong>
                <span>
                  Tu pin se encuentra a {geofenceStatus.distanceFromCenter} km del Centro de San Miguel (límite 10 km). Ajusta tu pin dentro del área de servicio.
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Opciones de Entrega: Normal, Exprés o Programada */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" /> Tipo de Entrega
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {/* Entrega Normal */}
              <button
                type="button"
                onClick={() => setDeliveryType('normal')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  deliveryType === 'normal'
                    ? 'border-[#ed0718] bg-red-50 text-[#ed0718] font-bold shadow-2xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="text-xs font-bold">🛵 Normal</div>
                <div className="text-[10px] text-gray-500 mt-0.5">25-35 min · Sin costo extra</div>
              </button>

              {/* Entrega Exprés */}
              <button
                type="button"
                onClick={() => setDeliveryType('express')}
                className={`p-2.5 rounded-xl border text-center transition relative ${
                  deliveryType === 'express'
                    ? 'border-[#ed0718] bg-red-50 text-[#ed0718] font-bold shadow-2xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="absolute -top-1.5 -right-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  +{expressSurcharge} MXN
                </span>
                <div className="text-xs font-bold flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Exprés
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Prioridad inmediata</div>
              </button>

              {/* Entrega Programada */}
              <button
                type="button"
                onClick={() => setDeliveryType('programada')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  deliveryType === 'programada'
                    ? 'border-[#ed0718] bg-red-50 text-[#ed0718] font-bold shadow-2xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="text-xs font-bold">🕒 Programada</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Elegir hora · Sin costo</div>
              </button>
            </div>

            {deliveryType === 'programada' && (
              <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-3.5 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Programación de Entrega con Confirmación Obligatoria</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      📅 Fecha de entrega:
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white text-gray-900 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      🕒 Horario acordado:
                    </label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white text-gray-900 shadow-2xs"
                    >
                      <option value="12:30">12:30 PM (Almuerzo)</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="13:30">1:30 PM</option>
                      <option value="14:00">2:00 PM (Comida)</option>
                      <option value="14:30">2:30 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="15:30">3:30 PM</option>
                      <option value="19:00">7:00 PM (Cena)</option>
                      <option value="20:00">8:00 PM</option>
                      <option value="21:00">9:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-amber-950 text-[11px] space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Regla de Confirmación Previa para Despacho:</span>
                  </div>
                  <p className="leading-snug">
                    15 minutos antes de la hora programada recibirás un mensaje o llamada de WhatsApp de RODO. <b>Es obligatorio confirmar que aún deseas el pedido</b>. Si no se obtiene respuesta, el pedido no se despacha para proteger alimentos y costos de envío.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Propina para el Repartidor: 0%, 10%, 15%, 20% o Personalizada */}
          <div className="space-y-2 pt-1 border-t border-gray-100 bg-red-50/40 p-3 rounded-2xl border border-red-100">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Propina para el repartidor (Opcional)
              </h4>
              <span className="text-[11px] font-bold text-[#ed0718]">
                {tipAmount > 0 ? `+$${tipAmount} MXN` : 'Sin propina'}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: '0%', mode: 'percentage', val: 0 },
                { label: '10%', mode: 'percentage', val: 10 },
                { label: '15%', mode: 'percentage', val: 15 },
                { label: '20%', mode: 'percentage', val: 20 },
                { label: 'Otro $', mode: 'custom', val: customTipValue },
              ].map((opt) => {
                const isActive = opt.mode === 'custom' ? tipMode === 'custom' : (tipMode === 'percentage' && tipPercentage === opt.val);
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      if (opt.mode === 'custom') {
                        setTipMode('custom');
                      } else {
                        setTipMode('percentage');
                        setTipPercentage(opt.val);
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-black transition text-center ${
                      isActive
                        ? 'bg-[#ed0718] text-white shadow-xs ring-2 ring-red-400'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {tipMode === 'custom' && (
              <div className="flex items-center gap-2 mt-2 bg-white p-2 rounded-xl border border-red-200">
                <span className="text-xs font-bold text-gray-600">Monto personalizado: $</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={customTipValue}
                  onChange={(e) => setCustomTipValue(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs font-black text-gray-900 font-mono"
                  placeholder="25"
                />
                <span className="text-xs text-gray-500 font-medium">MXN íntegros al repartidor</span>
              </div>
            )}

            <p className="text-[10px] text-gray-500 text-center">
              Propina total: <b>${tipAmount.toFixed(2)} MXN</b> · El 100% llega íntegro a manos del repartidor en moto.
            </p>
          </div>

          {/* Sugerencias de Último Momento (Extras tipo Uber Eats) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>¿Deseas agregar algo más?</span>
            </div>
            <div className="space-y-1.5">
              {extrasList.slice(0, 3).map((extra) => {
                const countInCart = localCart.find((it) => it.id === extra.id)?.quantity || 0;
                return (
                  <div
                    key={extra.id}
                    className="bg-white border border-amber-100 rounded-lg p-2 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-gray-800 block truncate">{extra.name}</span>
                      <span className="text-gray-500 text-[10px] block font-mono font-semibold">
                        +${extra.price.toFixed(2)} MXN
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddExtraToCheckout(extra)}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      {countInCart > 0 ? `(${countInCart}) Agregar` : 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen del Pedido con Desglose Completo, Alergias/Notas por Artículo y Código de Promoción */}
          <div className="bg-gray-50 border rounded-xl p-3 text-xs space-y-2">
            <div className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-1">
              Desglose de la Orden ({localCart.length} productos)
            </div>
            {localCart.map((it, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-2 last:border-b-0 space-y-1.5">
                <div className="flex justify-between text-gray-700">
                  <span className="truncate pr-2 font-semibold">
                    {it.quantity}x {it.name} {it.isExtra && <b className="text-amber-700">(Extra)</b>}
                  </span>
                  <span className="font-mono shrink-0">${(it.price * it.quantity).toFixed(2)}</span>
                </div>
                {it.customizations && it.customizations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {it.customizations.map((c, cIdx) => (
                      <span key={cIdx} className="bg-red-50 text-[#ed0718] text-[10px] font-bold px-1.5 py-0.2 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Alergias o Indicaciones Especiales por Producto */}
                <div className="space-y-1">
                  <input
                    type="text"
                    value={it.notes || ''}
                    onChange={(e) => handleUpdateItemNotes(idx, e.target.value)}
                    placeholder={t('allergiesPlaceholder')}
                    className="w-full bg-white border border-gray-200 focus:border-[#ed0718] rounded-lg px-2 py-1 text-[11px] text-gray-800 placeholder-gray-400 outline-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {['Sin cebolla', 'Sin picante', 'Alergia nueces/lácteos'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          const current = it.notes || '';
                          if (!current.includes(chip)) {
                            handleUpdateItemNotes(idx, current ? `${current} · ${chip}` : chip);
                          }
                        }}
                        className="text-[10px] bg-white border border-gray-200 hover:border-red-300 text-gray-600 px-1.5 py-0.5 rounded-md font-semibold cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Campo de Código de Promoción */}
            <div className="pt-2 border-t border-gray-200 space-y-1.5">
              <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                🎟️ Código de Promoción / Cupón
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder={t('promoCodePlaceholder')}
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold uppercase outline-none focus:border-[#ed0718]"
                />
                <button
                  type="button"
                  onClick={handleApplyPromoCode}
                  className="bg-[#101b29] hover:bg-black text-white font-black text-xs px-3.5 py-1.5 rounded-xl transition cursor-pointer shrink-0"
                >
                  {t('applyPromo')}
                </button>
              </div>
              {promoFeedback && (
                <div
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    promoFeedback.ok
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {promoFeedback.msg}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200 space-y-1 text-gray-700 font-medium">
              <div className="flex justify-between">
                <span>Subtotal de platillos:</span>
                <span className="font-mono font-bold">${subtotal.toFixed(2)} MXN</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 text-[11px]">
                  <span className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {couponRule && couponProductDiscount > 0
                      ? couponRule.label
                      : restaurant.promoLabel || `Descuento Promoción (${promoPercent}%):`}
                  </span>
                  <span className="font-mono font-black">-${promoDiscount.toFixed(2)} MXN</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>
                  Tarifa de envío ({deliveryType === 'express' ? 'Exprés' : deliveryType === 'programada' ? 'Programada' : 'Normal'}):
                </span>
                <span className="font-mono font-bold">
                  {couponDeliveryDiscount > 0 ? (
                    <>
                      <s className="text-gray-400 mr-1">${rawDeliveryFee.toFixed(2)}</s>
                      <span className="text-emerald-700">${totalDeliveryFee.toFixed(2)} MXN</span>
                    </>
                  ) : (
                    `$${totalDeliveryFee.toFixed(2)} MXN`
                  )}
                </span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>Propina del repartidor ({tipPercentage}%):</span>
                  <span className="font-mono font-bold">+${tipAmount.toFixed(2)} MXN</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-300 flex justify-between font-black text-sm text-[#ed0718]">
              <span>TOTAL A LIQUIDAR:</span>
              <span className="font-mono text-base">${total.toFixed(2)} MXN</span>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
              Datos de Entrega
            </h4>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" /> Tu Nombre Completo
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="Ej. Juan Pérez García"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:border-[#ed0718] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> Número de teléfono para la entrega
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                placeholder="Ej. 4151234567"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold font-mono focus:border-[#ed0718] outline-none"
              />
            </div>

            {/* Dirección Estructurada: Calle, Número, Colonia, Referencias */}
            <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5 uppercase">
                  <MapPin className="w-4 h-4 text-[#ed0718]" /> Dirección en San Miguel de Allende
                </span>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="text-[11px] font-black text-white bg-slate-900 hover:bg-[#ed0718] px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <MapPin className="w-3 h-3 text-red-400" />
                  <span>📍 Seleccionar en el mapa</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Calle</label>
                  <input
                    type="text"
                    value={deliveryCalle}
                    onChange={(e) => setDeliveryCalle(e.target.value)}
                    required
                    placeholder="Ej. Calle Correo, Ancha de San Antonio..."
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs font-semibold bg-white outline-none focus:border-[#ed0718]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Núm. Ext / Int</label>
                  <input
                    type="text"
                    value={deliveryNumero}
                    onChange={(e) => setDeliveryNumero(e.target.value)}
                    required
                    placeholder="Ej. #14 Int 2"
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs font-semibold bg-white outline-none focus:border-[#ed0718]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Colonia (San Miguel de Allende)</label>
                <select
                  value={deliveryColonia}
                  onChange={(e) => {
                    const col = e.target.value;
                    setDeliveryColonia(col);
                    // Comprobar posible discordancia geográfica
                    if (deliveryPinCoords) {
                      if (col.includes('San Antonio') && deliveryPinCoords.lat > 20.919 && deliveryPinCoords.lng < -100.758) {
                        setGeoMismatchWarning('⚠️ Advertencia: Has seleccionado San Antonio, pero el punto del mapa está en la zona de San Luis Rey.');
                      } else {
                        setGeoMismatchWarning('');
                      }
                    }
                  }}
                  className="w-full border border-gray-300 rounded-xl p-2 text-xs font-bold bg-white outline-none focus:border-[#ed0718]"
                >
                  {SMA_COLONIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {deliveryColonia === 'Otra / Fraccionamiento Privado' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Escribe el nombre de tu colonia o fraccionamiento</label>
                  <input
                    type="text"
                    value={deliveryCustomColonia}
                    onChange={(e) => setDeliveryCustomColonia(e.target.value)}
                    placeholder="Ej. Balcones, Atascadero, Zirándaro..."
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-white font-semibold outline-none focus:border-[#ed0718]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Referencias e Indicaciones (Opcional)</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Ej. Portón café, frente al parque, timbre lateral"
                  className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-white outline-none focus:border-[#ed0718]"
                />
              </div>

              {/* Alerta de discordancia geográfica entre colonia escrita y punto del mapa */}
              {geoMismatchWarning && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{geoMismatchWarning}</span>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryColonia('San Luis Rey');
                          setGeoMismatchWarning('');
                        }}
                        className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-black hover:bg-amber-300"
                      >
                        Ajustar a San Luis Rey
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryPinCoords({ lat: 20.9070, lng: -100.7510 });
                          setGeoMismatchWarning('');
                        }}
                        className="text-[10px] bg-white border border-amber-400 text-amber-900 px-2 py-0.5 rounded font-black hover:bg-amber-50"
                      >
                        Mover punto a San Antonio
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {deliveryPinCoords && (
                <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center justify-between font-bold">
                  <span>📍 Punto fijado en mapa ({deliveryPinCoords.lat.toFixed(4)}, {deliveryPinCoords.lng.toFixed(4)})</span>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="text-[#ed0718] hover:underline"
                  >
                    Modificar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selección de Método de Pago con Antifraude */}
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
              Método de Pago
            </h4>

            {/* Aviso de Límite Antifraude en Efectivo */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Límites Antifraude de Crédito en Efectivo:
              </div>
              <p>
                Tu límite en efectivo para este pedido (#{customerOrdersCount + 1}) es de{' '}
                <strong className="text-amber-950 font-black">${cashLimit} MXN</strong> en productos.
                (1er pedido: $300 · 2do: $400 · 3ro: $500 · 4to+: $1,000).
              </p>
              <p className="text-emerald-800 font-semibold">
                ✓ En Pago por Transferencia / Tarjeta no hay límite de monto.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Opción Efectivo */}
              <button
                type="button"
                disabled={!restaurant.acceptsCash}
                onClick={() => setPaymentMethod('efectivo')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  paymentMethod === 'efectivo'
                    ? 'border-[#ed0718] bg-red-50/50 text-[#ed0718]'
                    : restaurant.acceptsCash
                    ? 'border-gray-200 hover:bg-gray-50 text-gray-800'
                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <Banknote className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Efectivo al Entregar</div>
                  <div className="text-[11px] text-gray-500">Límite: ${cashLimit} MXN en productos</div>
                </div>
              </button>

              {/* Opción Transferencia / Tarjeta */}
              <button
                type="button"
                disabled={!restaurant.acceptsTransfer || restaurant.establishmentType === 'motomandado'}
                onClick={() => setPaymentMethod('transferencia')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  paymentMethod === 'transferencia'
                    ? 'border-[#ed0718] bg-red-50/50 text-[#ed0718]'
                    : restaurant.acceptsTransfer && restaurant.establishmentType !== 'motomandado'
                    ? 'border-gray-200 hover:bg-gray-50 text-gray-800'
                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <CreditCard className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Transferencia / Tarjeta</div>
                  <div className="text-[11px] text-gray-500">
                    {restaurant.establishmentType === 'motomandado'
                      ? 'No disponible (Solo efectivo)'
                      : 'Sin límite · SPEI & Tarjeta'}
                  </div>
                </div>
              </button>
            </div>

            {/* Alerta si el subtotal excede el límite en efectivo */}
            {isCashLimitExceeded && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  Monto excede el límite antifraude en efectivo (${cashLimit} MXN)
                </p>
                <p className="text-[11px]">
                  Tu subtotal en productos es de <strong>${subtotal.toFixed(2)} MXN</strong>.
                  Para proceder sin demoras, por favor cambia a <strong>Transferencia Bancaria</strong> o reduce platillos de tu orden.
                </p>
              </div>
            )}

            {/* Panel de Simulación Realista de Transferencia y Tarjeta */}
            {paymentMethod === 'transferencia' && (
              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-blue-950 flex items-center gap-1.5 uppercase">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Simulación de Pago Bancario (SPEI / Tarjeta)
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded-full">
                    Auditoría en Línea
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-blue-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-[11px]">Cuenta Destino RODO:</span>
                    <span className="font-bold text-gray-800">{bancoRodoFallback}</span>
                  </div>
                  <strong className="text-gray-900 block font-mono text-xs">{bankClabe}</strong>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="text-gray-600 font-semibold">Total exacto a liquidar:</span>
                    <b className="text-[#ed0718] font-mono text-sm">${total.toFixed(2)} MXN</b>
                  </div>
                </div>

                {/* Formulario de simulación bancaria */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                        Nombre del Titular
                      </label>
                      <input
                        type="text"
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full border border-blue-300 rounded-xl p-2 text-xs bg-white font-semibold outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                        Banco Emisor
                      </label>
                      <select
                        value={senderBank}
                        onChange={(e) => setSenderBank(e.target.value)}
                        className="w-full border border-blue-300 rounded-xl p-2 text-xs bg-white font-bold text-gray-800 outline-none focus:border-blue-600"
                      >
                        <option value="BBVA Bancomer">BBVA Bancomer</option>
                        <option value="Santander">Santander</option>
                        <option value="Banorte">Banorte</option>
                        <option value="Citibanamex">Citibanamex</option>
                        <option value="Nu México">Nu México</option>
                        <option value="Banco Azteca">Banco Azteca</option>
                        <option value="Mercado Pago">Mercado Pago</option>
                        <option value="HSBC">HSBC</option>
                        <option value="Scotiabank">Scotiabank</option>
                        <option value="Spin by OXXO">Spin by OXXO</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                        Modalidad de Pago
                      </label>
                      <div className="flex rounded-xl border border-blue-200 overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => setPaymentSimulationType('spei')}
                          className={`flex-1 py-1.5 font-bold transition text-center ${paymentSimulationType === 'spei' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                        >
                          SPEI Móvil
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSimulationType('tarjeta')}
                          className={`flex-1 py-1.5 font-bold transition text-center ${paymentSimulationType === 'tarjeta' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                        >
                          Tarjeta
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                        {paymentSimulationType === 'spei' ? 'Últimos 4 dígitos cuenta' : 'Últimos 4 dígitos tarjeta'}
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={accountOrCardDigits}
                        onChange={(e) => setAccountOrCardDigits(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Ej. 4819"
                        className="w-full border border-blue-300 rounded-xl p-2 text-xs font-mono font-bold bg-white text-center outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-bold text-blue-950">
                        Clave de Rastreo SPEI / Folio Bancario
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const autoFolio = `${senderBank.slice(0, 4).toUpperCase()}${Date.now().toString().slice(-8)}`;
                          setTrackingKey(autoFolio);
                        }}
                        className="text-[10px] text-blue-700 hover:underline font-bold"
                      >
                        ⚡ Generar Clave Simulada
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingKey}
                        onChange={(e) => {
                          setTrackingKey(e.target.value);
                          setBankVerificationResult(null);
                        }}
                        placeholder="Ej. MBAN0100234567..."
                        className="w-full border border-blue-300 rounded-xl p-2 text-xs font-mono font-bold bg-white outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyTransfer}
                        disabled={isVerifyingBank}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition shadow-xs"
                      >
                        {isVerifyingBank ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>Verificar Cobro</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {bankVerificationResult && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                        bankVerificationResult.verified
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-red-100 text-red-900 border border-red-300'
                      }`}
                    >
                      {bankVerificationResult.verified ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold block">
                          {bankVerificationResult.verified ? '✓ Cobro Simulado Autorizado' : 'Error en Simulación'}
                        </span>
                        <span className="text-[11px] text-gray-700">
                          {bankVerificationResult.statusMessage}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Términos y Consentimiento */}
          <div className="pt-2 border-t border-gray-200">
            <label className="flex items-start gap-2 cursor-pointer text-xs text-gray-600">
              <input
                type="checkbox"
                checked={acceptedPrivacyTerms}
                onChange={(e) => setAcceptedPrivacyTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#ed0718] focus:ring-[#ed0718]"
              />
              <span>
                Acepto los Términos del Servicio y Avisos de Privacidad de RODO Moto Mandados.
              </span>
            </label>
          </div>

          {/* Botón de Enviar Pedido */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isCashLimitExceeded || isLiveClosed || !geofenceStatus.valid}
              className="w-full bg-[#ed0718] hover:bg-[#d60615] disabled:bg-gray-400 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLiveClosed ? (
                <span>🚫 Local Cerrado Temporalmente</span>
              ) : !geofenceStatus.valid ? (
                <span>📍 Ubicación Fuera del Perímetro Permitido</span>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando y Despachando Orden...</span>
                </>
              ) : isCashLimitExceeded ? (
                <span>Límite en Efectivo Excedido (Cambiar a Transferencia)</span>
              ) : (
                <span>Confirmar Orden (${total.toFixed(2)} MXN)</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL DE SELECCIÓN EN EL MAPA DE SAN MIGUEL DE ALLENDE */}
      {showMapPicker && (
        <div className="fixed inset-0 z-80 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl border border-gray-200 my-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#ed0718] bg-red-50 px-2 py-0.5 rounded-full">
                  San Miguel de Allende, GTO
                </span>
                <h4 className="font-extrabold text-base text-gray-900 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#ed0718]" /> Ubica tu Domicilio en el Mapa
                </h4>
                <p className="text-xs text-gray-500">
                  Arrastra o da clic sobre el mapa para fijar la ubicación exacta de entrega.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(false)}
                className="text-gray-400 hover:text-black p-1.5 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <InteractiveMapPicker
              initialLat={deliveryPinCoords?.lat || 20.9144}
              initialLng={deliveryPinCoords?.lng || -100.7437}
              localName={deliveryCalle || 'Tu Domicilio'}
              onLocationSelect={(loc) => {
                setDeliveryPinCoords({ lat: loc.lat, lng: loc.lng });

                if (loc.street && loc.street.trim()) {
                  setDeliveryCalle(loc.street.trim());
                }
                if (loc.streetNumber && loc.streetNumber.trim()) {
                  setDeliveryNumero(loc.streetNumber.trim().replace(/^#/, ''));
                }
                if (loc.neighborhood && loc.neighborhood.trim()) {
                  setDeliveryColonia(loc.neighborhood.trim());
                }

                // Detección automática de cuadrante para evitar fraudes/errores entre colonias
                if (deliveryColonia.includes('San Antonio')) {
                  if (loc.lat > 20.919 && loc.lng < -100.758) {
                    setGeoMismatchWarning('⚠️ Advertencia: Has seleccionado San Antonio, pero el punto del mapa está en la zona de San Luis Rey.');
                  } else {
                    setGeoMismatchWarning('');
                  }
                } else if (deliveryColonia.includes('San Luis Rey')) {
                  if (loc.lat < 20.912 && loc.lng > -100.755) {
                    setGeoMismatchWarning('⚠️ Advertencia: Has seleccionado San Luis Rey, pero el punto del mapa está en la zona de San Antonio.');
                  } else {
                    setGeoMismatchWarning('');
                  }
                }
              }}
            />

            <button
              type="button"
              onClick={() => setShowMapPicker(false)}
              className="w-full bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs py-3 rounded-xl shadow-md transition"
            >
              ✓ Confirmar Ubicación en el Mapa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

