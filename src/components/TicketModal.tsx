import { ProtectedImage } from './ProtectedImage';
import React, { useState, useEffect } from 'react';
import { Order, DispatchSettings, Restaurant } from '../types';
import {
  buildWhatsAppDispatchMessage,
  generateWhatsAppLink,
  updateOrderInDb,
  getLocalStoredRestaurants,
} from '../services/db';
import { dispatchIntegrationEvent } from '../services/integrationApi';
import {
  X,
  Share2,
  CheckCircle,
  Copy,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Bike,
  Building,
  MapPin,
  Phone,
  Bell,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Star,
  Navigation,
  Send,
  ThumbsUp,
  Utensils,
  PenTool,
  Camera,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FreeOsmMap } from './FreeOsmMap';
import { uploadOrderProofToStorage } from '../api/httpClient';
import { onSocketEvent } from '../api/socketClient';
import { vibrateSuccess } from '../utils/haptics';
import { useLanguage } from '../utils/i18n';
import { availableDispatchRiders } from '../utils/riderDirectory';
import { useRiderDirectory } from '../hooks/useRiderDirectory';
import {
  assignRiderToOrder,
  notifyCustomerArrival,
  RestaurantTrackingStatus,
  updateRestaurantStatusByRider,
} from '../services/riders';
import { useBackdropClose } from '../utils/modalBackdrop';
import { showSystemToast } from './SystemDialogHost';

const RESTAURANT_STATUS_STEPS: Array<{ key: RestaurantTrackingStatus; label: string }> = [
  { key: 'recibido', label: 'Recibido' },
  { key: 'en_cocina', label: 'En cocina' },
  { key: 'en_camino', label: 'En camino' },
  { key: 'completado', label: 'Completado' },
];

function isRestaurantTicketOrder(order: Pick<Order, 'orderType'>): boolean {
  return !order.orderType || order.orderType === 'comida' || order.orderType === 'pedido_personalizado';
}

function resolveRestaurantTrackingStep(order: Order): RestaurantTrackingStatus | null {
  if (order.restaurantTrackingStatus) return order.restaurantTrackingStatus;
  if (order.status === 'entregado') return 'completado';
  if (order.status === 'en_camino' || order.status === 'afuera_del_domicilio') return 'en_camino';
  if (order.status === 'en_preparacion') return 'en_cocina';
  if (order.status === 'asignado' || order.status === 'recolectado') return 'recibido';
  return null;
}

interface TicketModalProps {
  order: Order | null;
  settings: DispatchSettings;
  onClose: () => void;
  isAdmin?: boolean;
  riderToken?: string | null;
  isRiderMode?: boolean;
  onOrderUpdated?: (updated: Order) => void;
  onShowToast?: (msg: string) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  order: initialOrder,
  settings,
  onClose,
  isAdmin = false,
  riderToken = null,
  isRiderMode = false,
  onOrderUpdated,
  onShowToast,
}) => {
  const { t } = useLanguage();
  const [order, setLocalOrder] = useState<Order | null>(initialOrder);
  useEffect(() => {
    setLocalOrder((prev) => {
      if (!initialOrder) return null;
      if (
        prev &&
        prev.id === initialOrder.id &&
        !initialOrder.riderDispatchToken &&
        prev.riderDispatchToken &&
        prev.assignedRiderId === initialOrder.assignedRiderId &&
        prev.assignedRiderName === initialOrder.assignedRiderName
      ) {
        return { ...initialOrder, riderDispatchToken: prev.riderDispatchToken };
      }
      return initialOrder;
    });
  }, [initialOrder]);

  const directory = useRiderDirectory(isAdmin && !!order);
  const backdropHandlers = useBackdropClose(!!order, onClose);
  const [copied, setCopied] = useState(false);
  const [selectedRiderKey, setSelectedRiderKey] = useState(
    order?.assignedRiderId || order?.assignedRiderUserId || ''
  );
  const [assigningRider, setAssigningRider] = useState(false);
  const [notifyingOutside, setNotifyingOutside] = useState(false);
  const [updatingRiderStatus, setUpdatingRiderStatus] = useState<RestaurantTrackingStatus | null>(null);

  useEffect(() => {
    const matched = directory.riders.find(
      (r) =>
        (order?.assignedRiderId && r.id === order.assignedRiderId) ||
        (order?.assignedRiderUserId && r.userId === order.assignedRiderUserId) ||
        (order?.assignedRiderName && r.name === order.assignedRiderName)
    );
    setSelectedRiderKey(matched?.id || order?.assignedRiderId || order?.assignedRiderUserId || '');
  }, [order?.id, order?.assignedRiderId, order?.assignedRiderUserId, order?.assignedRiderName, directory.riders]);

  // Cuenta regresiva de 10 minutos si el repartidor notificó que está afuera
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (order?.arrivalExpiresAt) {
      const diff = Math.floor((new Date(order.arrivalExpiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return 600; // 10 min
  });

  // Campos para cotización de pedidos personalizados
  const [quoteFoodPrice, setQuoteFoodPrice] = useState(String(order?.subtotal ?? 0));
  const [quoteDeliveryFee, setQuoteDeliveryFee] = useState(String(order?.quoteOfferedAt ? order.deliveryFee : order?.deliveryFee || 35));
  const [sendingQuote, setSendingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Calificaciones detalladas post-entrega (Repartidor y Comida)
  const [riderRating, setRiderRating] = useState<number>(order?.riderRating || order?.rating || 0);
  const [riderHover, setRiderHover] = useState<number>(0);
  const [foodRating, setFoodRating] = useState<number>(order?.foodRating || order?.rating || 0);
  const [foodHover, setFoodHover] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>(order?.ratingComment || '');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(!!(order?.rating || order?.riderRating));
  const [receptionConfirmed, setReceptionConfirmed] = useState(!!order?.receptionConfirmed);

  // Firma digital simple o foto de evidencia de entrega
  const [showSignaturePanel, setShowSignaturePanel] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'firma' | 'foto'>('firma');
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [proofPhotoPreview, setProofPhotoPreview] = useState<string>(order?.deliveryProofPhotoUrl || '');
  const [savingProof, setSavingProof] = useState(false);
  const [proofSavedBanner, setProofSavedBanner] = useState(!!order?.deliveryConfirmedBySignature);
  const signatureCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = React.useRef(false);

  // Rastreo GPS en vivo del repartidor (Socket.IO + navigator.geolocation.watchPosition)
  const [liveRiderCoords, setLiveRiderCoords] = useState<{ lat: number; lng: number } | undefined>(
    order?.riderLiveCoordinates
  );
  useEffect(() => {
    setLiveRiderCoords(order?.riderLiveCoordinates);
  }, [order?.id, order?.riderLiveCoordinates]);

  useEffect(() => {
    if (!order?.id) return;
    const unsub = onSocketEvent<{
      orderId: string;
      coordinates: { lat: number; lng: number };
    }>('order:rider-location', (payload) => {
      if (payload?.orderId === order.id && payload.coordinates) {
        setLiveRiderCoords(payload.coordinates);
      }
    });
    return () => unsub();
  }, [order?.id]);



  const handleRiderRestaurantStatusUpdate = async (nextStatus: RestaurantTrackingStatus) => {
    if (!order || updatingRiderStatus) return;
    setUpdatingRiderStatus(nextStatus);
    try {
      const res = await updateRestaurantStatusByRider(order.id, nextStatus, riderToken || undefined);
      setLocalOrder(res.order);
      onOrderUpdated?.(res.order);
      vibrateSuccess();
      const msg = `Estatus actualizado a "${res.statusLabel}". Cliente notificado.`;
      onShowToast?.(msg);
      showSystemToast({ message: msg, tone: 'success' });
    } catch (error: any) {
      const msg = error?.message || 'No se pudo actualizar el estatus del pedido.';
      onShowToast?.(msg);
      showSystemToast({ message: msg, tone: 'error' });
    } finally {
      setUpdatingRiderStatus(null);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) * canvas.width) / rect.width;
    const y = ((clientY - rect.top) * canvas.height) / rect.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#101b29';
    isDrawingRef.current = true;
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) * canvas.width) / rect.width;
    const y = ((clientY - rect.top) * canvas.height) / rect.height;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleProofPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setProofPhotoPreview(canvas.toDataURL('image/jpeg', 0.65));
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDeliveryProof = async () => {
    if (!order) return;
    let sigUrl = order.deliverySignatureDataUrl;
    if (signatureMode === 'firma' && signatureCanvasRef.current && hasDrawnSignature) {
      sigUrl = signatureCanvasRef.current.toDataURL('image/png');
    }
    let photoUrl = signatureMode === 'foto' ? proofPhotoPreview : order.deliveryProofPhotoUrl;
    if (!sigUrl && !photoUrl) return;

    setSavingProof(true);
    try {
      if (sigUrl && sigUrl.startsWith('data:image/')) {
        sigUrl = await uploadOrderProofToStorage(order.id, 'signature', sigUrl);
      }
      if (photoUrl && photoUrl.startsWith('data:image/')) {
        photoUrl = await uploadOrderProofToStorage(order.id, 'photo', photoUrl);
      }

      const now = new Date().toISOString();
      await updateOrderInDb(order.id, {
        deliverySignatureDataUrl: sigUrl || undefined,
        deliveryProofPhotoUrl: photoUrl || undefined,
        deliveryConfirmedBySignature: true,
        deliverySignatureAt: now,
      });
      setProofSavedBanner(true);
      setShowSignaturePanel(false);
      vibrateSuccess();
      onShowToast?.('¡Comprobante de entrega guardado exitosamente!');
    } catch (err) {
      onShowToast?.(err instanceof Error ? err.message : 'No se pudo guardar la evidencia.');
    } finally {
      setSavingProof(false);
    }
  };

  const handleConfirmReceptionAndRate = async (customRiderStars?: number, customFoodStars?: number) => {
    if (!order) return;
    const finalRider = customRiderStars ?? riderRating;
    const finalFood = customFoodStars ?? foodRating;
    const overall = Math.round(((finalRider || 5) + (finalFood || 5)) / 2);

    setIsSubmittingRating(true);
    try {
      const now = new Date().toISOString();
      await updateOrderInDb(order.id, {
        receptionConfirmed: true,
        receptionConfirmedAt: now,
        riderRating: finalRider || 5,
        foodRating: finalFood || 5,
        rating: overall,
        ratingComment: ratingComment.trim(),
        ratedAt: now,
      });
      setReceptionConfirmed(true);
      setRatingSaved(true);
      vibrateSuccess();
      onShowToast?.('⭐ ¡Gracias! Tu calificación fue registrada con éxito.');
      if (finalRider) setRiderRating(finalRider);
      if (finalFood) setFoodRating(finalFood);
    } catch (err) {
      console.error('Error guardando calificación en Firebase:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    if (!order?.arrivalExpiresAt || order.status !== 'afuera_del_domicilio') return;

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(order.arrivalExpiresAt!).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.arrivalExpiresAt, order?.status]);

  if (!order) return null;

  const isTransfer = order.paymentMethod === 'transferencia';
  const isVerified = order.paymentStatus === 'verificado';

  const allDirectoryRiders = [...directory.riders].sort((a, b) => {
    const aAvail = a.available && a.status === 'activo' ? 0 : 1;
    const bAvail = b.available && b.status === 'activo' ? 0 : 1;
    if (aAvail !== bAvail) return aAvail - bAvail;
    return a.name.localeCompare(b.name, 'es');
  });
  const dispatchRiders = availableDispatchRiders(directory.riders);
  const selectedDirectoryRider =
    allDirectoryRiders.find(
      (r) =>
        (selectedRiderKey && (r.id === selectedRiderKey || r.userId === selectedRiderKey)) ||
        (order.assignedRiderId && r.id === order.assignedRiderId) ||
        (order.assignedRiderUserId && r.userId === order.assignedRiderUserId) ||
        (order.assignedRiderName && r.name === order.assignedRiderName)
    ) || null;
  const primaryRider = selectedDirectoryRider ||
    dispatchRiders[0] || { name: settings.defaultRider1Name, phone: settings.defaultRider1Phone };
  const messageRider1 = buildWhatsAppDispatchMessage(order, primaryRider.name);
  const isRestaurantTicket = isRestaurantTicketOrder(order);
  const currentTrackingStep = resolveRestaurantTrackingStep(order);
  const currentTrackingIdx = currentTrackingStep
    ? RESTAURANT_STATUS_STEPS.findIndex((s) => s.key === currentTrackingStep)
    : -1;
  const canRiderUpdateRestaurantStatus = Boolean(isRiderMode && !isAdmin && isRestaurantTicket);

  // Mensaje directo al cliente avisando que el repartidor está afuera
  const customerArrivalMsg = `🚨 *RODO MOTO MANDADOS · ¡TU REPARTIDOR ESTÁ AFUERA!* 🏍️💨
━━━━━━━━━━━━━━━━━━━━
Hola *${order.customerName}*, tu repartidor (${order.assignedRiderName || 'RODO Moto'}) ya llegó afuera de tu domicilio con tu orden (*Folio ${order.folio}*).
📍 Dirección: ${order.deliveryAddress}

⏱️ *Cuentas con 10 minutos de tolerancia para salir a recibir tu pedido.*
Por favor sal de inmediato al timbre o zaguán. Si el tiempo expira, la orden se cancelará por política de seguridad y conservación de alimentos.

_RODO Moto Mandados · Despacho San Miguel_`;

  const linkCustomerArrival = generateWhatsAppLink(order.customerPhone, customerArrivalMsg);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageRider1);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRiderAssignment = async (riderId: string): Promise<Order | null> => {
    const rider = allDirectoryRiders.find(
      (candidate) => candidate.id === riderId || candidate.userId === riderId
    );
    setAssigningRider(true);
    try {
      const updated = await assignRiderToOrder(order.id, { riderId: rider ? rider.id : null });
      setLocalOrder(updated);
      onOrderUpdated?.(updated);
      setSelectedRiderKey(rider ? rider.id : '');
      const msg = rider ? `Pedido asignado a ${rider.name}.` : 'Se retiró la asignación del pedido.';
      onShowToast?.(msg);
      showSystemToast({ message: msg, tone: 'success' });
      return updated;
    } catch (error: any) {
      const msg = error?.message || 'No se pudo asignar el repartidor.';
      onShowToast?.(msg);
      showSystemToast({ message: msg, tone: 'error' });
      return null;
    } finally {
      setAssigningRider(false);
    }
  };

  const handleShareToSelectedRiderWhatsApp = async () => {
    if (!selectedDirectoryRider) {
      showSystemToast({ message: 'Primero selecciona un repartidor de la lista.', tone: 'warning' });
      return;
    }
    let activeOrder = order;
    const alreadyAssigned =
      (order.assignedRiderId && order.assignedRiderId === selectedDirectoryRider.id) ||
      (order.assignedRiderUserId && order.assignedRiderUserId === selectedDirectoryRider.userId) ||
      (order.assignedRiderName && order.assignedRiderName === selectedDirectoryRider.name);

    if (!alreadyAssigned || !order.riderDispatchToken) {
      const updated = await handleRiderAssignment(selectedDirectoryRider.id);
      if (updated) activeOrder = updated;
    }
    const msg = buildWhatsAppDispatchMessage(
      activeOrder,
      selectedDirectoryRider.name,
      window.location.origin,
      activeOrder.riderDispatchToken
    );
    const link = generateWhatsAppLink(selectedDirectoryRider.phone, msg);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Notificar al cliente en tiempo real que el repartidor está afuera (requiere repartidor asignado)
  const hasAssignedRider = Boolean(
    order.assignedRiderId || order.assignedRiderUserId || order.assignedRiderName
  );
  const canNotifyOutside =
    hasAssignedRider &&
    !['entregado', 'cancelado', 'cancelado_con_deuda'].includes(order.status);
  const handleNotifyOutside = async () => {
    if (notifyingOutside || !canNotifyOutside) return;
    setNotifyingOutside(true);
    try {
      await notifyCustomerArrival(order.id);
      setTimeLeft(600);
      vibrateSuccess();
      const msg = 'Aviso enviado al cliente. 10 min de tolerancia activados.';
      onShowToast?.(msg);
      showSystemToast({ message: msg, tone: 'success' });
      dispatchIntegrationEvent('order.status_changed', {
        order: { ...order, status: 'afuera_del_domicilio', customerNotifiedOutside: true },
      });
    } catch (err: any) {
      const msg = err?.message || 'No se pudo enviar el aviso al cliente.';
      onShowToast?.(msg);
      showSystemToast({ message: msg, tone: 'error' });
    } finally {
      setNotifyingOutside(false);
    }
  };

  // Administrador envía cotización al cliente para su aprobación
  const quoteUnchanged = Boolean(order.quoteOfferedAt) &&
    Number(quoteFoodPrice) === order.subtotal && Number(quoteDeliveryFee) === order.deliveryFee;
  const handleConfirmQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sendingQuote || quoteUnchanged) return;
    setQuoteError('');
    setSendingQuote(true);
    const totalQuote = Number(quoteFoodPrice) + Number(quoteDeliveryFee);
    const updates: Partial<Order> = {
      subtotal: Number(quoteFoodPrice),
      deliveryFee: Number(quoteDeliveryFee),
      total: totalQuote,
      status: 'pendiente_cotizacion', // Sigue pendiente hasta que el cliente autorice o rechace
      quoteConfirmedByCustomer: false,
      items: [
        {
          id: 'it-quoted',
          name: `Alimentos/Artículos cotizados: ${order.customOrderText || order.items[0]?.name || 'Pedido'}`,
          price: Number(quoteFoodPrice),
          quantity: 1,
        },
      ],
    };
    try {
      await updateOrderInDb(order.id, updates);
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : 'No se pudo enviar la cotización. Intenta de nuevo.');
    } finally {
      setSendingQuote(false);
    }
  };

  // El cliente acepta la cotización propuesta
  const handleCustomerAcceptQuote = async () => {
    const updates: Partial<Order> = {
      status: 'nuevo',
      quoteConfirmedByCustomer: true,
      deliveryNotes: `${order.deliveryNotes || ''} [Cotización aceptada por el cliente: $${order.total?.toFixed(2)} MXN]`.trim(),
    };
    await updateOrderInDb(order.id, { ...updates, expectedQuoteTotal: order.total, expectedQuoteOfferedAt: order.quoteOfferedAt });
  };

  // El cliente declina la cotización ("no lo quiero / cancelar")
  const handleCustomerRejectQuote = async () => {
    const updates: Partial<Order> = {
      status: 'cancelado',
      quoteConfirmedByCustomer: false,
      cancellationReason: 'Cotización declinada por el cliente: no lo quiso',
      deliveryNotes: `${order.deliveryNotes || ''} [Cotización declinada por el cliente: no lo quiso]`.trim(),
    };
    await updateOrderInDb(order.id, updates);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[95dvh] overflow-y-auto shadow-2xl sm:my-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 border border-gray-200">
        {/* Encabezado modal */}
        <div className="bg-[#101b29] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#ed0718] p-1.5 rounded-xl text-white">
              <Bike className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
                TICKET DIGITAL
              </h3>
              <p className="text-xs text-gray-300 font-mono">Folio: {order.folio}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ticket"
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALERTA Y CUENTA REGRESIVA DE 10 MINUTOS SI ESTÁ AFUERA */}
        {order.status === 'afuera_del_domicilio' && (
          <div className="bg-red-600 text-white p-4 text-center shadow-inner space-y-2 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 font-black text-sm uppercase tracking-wide">
              <Bell className="w-5 h-5 animate-bounce" />
              <span>¡Tu repartidor está afuera!</span>
            </div>
            <p className="text-xs text-red-100">
              Sal a recibir tu pedido. Tienes 10 minutos de tolerancia:
            </p>
            <div className="inline-block bg-black/30 border border-white/30 px-5 py-2 rounded-2xl">
              <span className="font-mono text-3xl font-black tracking-wider text-yellow-300">
                {formatTimer(timeLeft)}
              </span>
            </div>
            {timeLeft === 0 && (
              <p className="text-xs font-bold bg-white text-red-700 py-1 px-3 rounded-lg mt-1 inline-block">
                Tiempo de tolerancia expirado.
              </p>
            )}
          </div>
        )}

        {/* CANAL OFICIAL DE ATENCIÓN CON EL PEDIDO (solo cliente/admin) */}
        {!isRiderMode && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-black text-emerald-950 block">¿Dudas con tu pedido?</span>
              <span className="text-[11px] text-emerald-800 font-medium">Soporte por WhatsApp</span>
            </div>
            <a
              href={`https://api.whatsapp.com/send/?phone=524151019920&text=${encodeURIComponent(`Hola RODO Moto Mandados, necesito ayuda con mi pedido Folio: ${order.folio}`)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-3.5 rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        )}

        {/* ESTATUS DEL PEDIDO DE RESTAURANTE (Actualización exclusiva del repartidor; solo lectura para cliente y admin) */}
        {isRestaurantTicket && !['cancelado', 'cancelado_con_deuda'].includes(order.status) && (
          <div
            className={`border-b p-3.5 sm:p-4 space-y-2.5 ${
              canRiderUpdateRestaurantStatus
                ? 'bg-[#101b29] text-white border-slate-800'
                : 'bg-slate-50 text-gray-900 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  canRiderUpdateRestaurantStatus ? 'text-amber-300' : 'text-gray-700'
                }`}
              >
                <Bike className="w-3.5 h-3.5 text-[#ed0718]" />
                {canRiderUpdateRestaurantStatus
                  ? 'Panel del Repartidor · Actualizar Estatus'
                  : 'Seguimiento del Pedido'}
              </span>
              {currentTrackingStep && (
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    currentTrackingStep === 'completado'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                      : canRiderUpdateRestaurantStatus
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-red-50 text-[#ed0718] border border-red-200'
                  }`}
                >
                  {RESTAURANT_STATUS_STEPS.find((s) => s.key === currentTrackingStep)?.label}
                </span>
              )}
            </div>

            {canRiderUpdateRestaurantStatus ? (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-300">
                  Cada cambio envía notificación automática al cliente.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {RESTAURANT_STATUS_STEPS.map((step, idx) => {
                    const isCompleted = currentTrackingIdx >= idx;
                    const isCurrent = currentTrackingIdx === idx;
                    const isDisabled =
                      updatingRiderStatus !== null ||
                      isCompleted ||
                      order.status === 'entregado';
                    const isLoadingThis = updatingRiderStatus === step.key;

                    return (
                      <button
                        key={step.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => void handleRiderRestaurantStatusUpdate(step.key)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isCompleted
                            ? isCurrent
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                              : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/60'
                            : 'bg-white text-[#101b29] hover:bg-amber-300 active:scale-98 shadow-sm disabled:opacity-50'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-[#ed0718] text-white text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                        )}
                        <span>{isLoadingThis ? 'Enviando...' : step.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {RESTAURANT_STATUS_STEPS.map((step, idx) => {
                  const isDone = currentTrackingIdx >= idx;
                  const isActive = currentTrackingIdx === idx;
                  return (
                    <div
                      key={step.key}
                      className={`rounded-xl px-1.5 py-2 text-center border transition ${
                        isActive
                          ? 'bg-[#ed0718] text-white border-[#ed0718] shadow-xs'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-white text-gray-400 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-0.5">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-[10px] font-black">{idx + 1}</span>
                        )}
                      </div>
                      <span className="block text-[10px] font-extrabold leading-tight">
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Acciones de WhatsApp directas para Administrador */}
        {isAdmin && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 sm:p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> Despacho WhatsApp
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    order.assignedRiderName
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-200/80 text-amber-950 border border-amber-300'
                  }`}
                >
                  {order.assignedRiderName ? `Asignado · ${order.assignedRiderName}` : 'Sin asignar'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs bg-white text-gray-700 px-2.5 py-1 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-1 font-semibold cursor-pointer"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            {directory.error && (
              <p role="alert" className="text-xs text-red-700 font-semibold">
                {directory.error}{' '}
                <button type="button" onClick={directory.reload} className="underline">
                  Reintentar
                </button>
              </p>
            )}
            <label className="block text-[11px] font-bold text-amber-950">
              Seleccionar / cambiar repartidor ({allDirectoryRiders.length} registrados)
              <select
                value={selectedRiderKey}
                disabled={assigningRider}
                onChange={(event) => void handleRiderAssignment(event.target.value)}
                className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
              >
                <option value="">Sin asignar</option>
                {allDirectoryRiders.map((rider) => {
                  const unavailable = !rider.available || rider.status !== 'activo';
                  const isCurrent = selectedRiderKey === rider.id;
                  return (
                    <option key={rider.id} value={rider.id} disabled={unavailable && !isCurrent}>
                      {rider.name}
                      {rider.phone ? ` · ${rider.phone}` : ''}
                      {unavailable ? ' (No disponible)' : ''}
                    </option>
                  );
                })}
              </select>
            </label>

            <button
              type="button"
              disabled={!selectedDirectoryRider || assigningRider}
              onClick={() => void handleShareToSelectedRiderWhatsApp()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-600 text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>
                {assigningRider
                  ? 'Actualizando repartidor...'
                  : selectedDirectoryRider
                  ? `Enviar ticket por WhatsApp a ${selectedDirectoryRider.name}`
                  : 'Selecciona un repartidor para enviar por WhatsApp'}
              </span>
            </button>

            {/* Botón para notificar al cliente que el repartidor está afuera */}
            <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
              <button
                type="button"
                disabled={!canNotifyOutside || notifyingOutside}
                onClick={() => void handleNotifyOutside()}
                title={
                  hasAssignedRider
                    ? 'Avisar al cliente que el repartidor está afuera (10 min)'
                    : 'Asigna un repartidor primero para poder avisar al cliente'
                }
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span>
                  {!hasAssignedRider
                    ? 'Asigna un repartidor para avisar que está afuera'
                    : notifyingOutside
                    ? 'Enviando aviso...'
                    : order.status === 'afuera_del_domicilio'
                    ? 'Reenviar aviso: ¡Estoy afuera! (10 min)'
                    : 'Avisar al cliente: ¡Estoy afuera! (10 min)'}
                </span>
              </button>
              {order.customerPhone && canNotifyOutside && (
                <a
                  href={linkCustomerArrival}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shrink-0"
                  title="También enviar aviso por WhatsApp al cliente"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Panel de Cotización para pedidos personalizados */}
        {order.status === 'pendiente_cotizacion' && isAdmin && (
          <form onSubmit={handleConfirmQuote} className="bg-blue-50 border-b border-blue-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Cotizar Pedido Personalizado</span>
            </div>
            <p className="text-xs text-blue-800">
              El cliente solicitó: <strong>{order.customOrderText || order.items[0]?.name}</strong>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">{order.orderType === 'auxilio_gasolina' ? 'Combustible' : 'Artículos'} ($ MXN)</label>
                <input
                  type="number"
                  min="0" step="0.01" required
                  disabled={sendingQuote || order.orderType === 'auxilio_gasolina'}
                  value={quoteFoodPrice}
                  onChange={(e) => setQuoteFoodPrice(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg p-2 text-xs font-bold bg-white"
                  placeholder="Ej. 180"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Envío RODO ($ MXN)</label>
                <input
                  type="number"
                  value={quoteDeliveryFee}
                  min="0" step="0.01" required disabled={sendingQuote}
                  onChange={(e) => setQuoteDeliveryFee(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg p-2 text-xs font-bold bg-white"
                  placeholder="Ej. 35"
                />
              </div>
            </div>
            {order.quoteOfferedAt && (
              <p role="status" className="text-sm font-bold text-emerald-800">
                Cotización enviada por ${order.total.toFixed(2)} MXN. Pendiente de respuesta del cliente.
              </p>
            )}
            {quoteError && <p role="alert" className="text-sm font-bold text-red-700">{quoteError}</p>}
            <button
              type="submit" disabled={sendingQuote || quoteUnchanged}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs transition"
            >
              {sendingQuote ? 'Enviando cotización…' : quoteUnchanged ? 'Cotización enviada' :
                `${order.quoteOfferedAt ? 'Actualizar cotización' : 'Enviar Cotización al Cliente'} ($${(Number(quoteFoodPrice) + Number(quoteDeliveryFee)).toFixed(2)} MXN)`}
            </button>
          </form>
        )}

        {/* Cuerpo del Ticket térmico */}
        <div className="p-4 sm:p-6 bg-gray-50/50 max-h-[60vh] overflow-y-auto">
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-5 shadow-xs font-sans text-gray-800">
            {/* Header del ticket */}
            <div className="text-center pb-4 border-b border-dashed border-gray-300">
              <img
                src="/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg"
                alt="Logo RODO"
                className="w-12 h-12 rounded-xl mx-auto object-cover shadow-xs border border-red-200 mb-1"
              />
              <div className="text-sm font-black text-[#101b29] tracking-wider uppercase">
                RODO MOTO MANDADOS
              </div>
              <div className="text-[10px] tracking-widest font-extrabold text-gray-500 uppercase">
                DESPACHO CENTRAL & LOGÍSTICA
              </div>
              <div className="mt-2 font-mono text-sm font-black bg-gray-100 py-1 px-3 rounded-md inline-block">
                FOLIO: {order.folio}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(order.createdAt).toLocaleString('es-MX', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            </div>

            {/* Estado de cotización o pago visual */}
            <div className="my-4">
              {order.status === 'pendiente_cotizacion' ? (
                (order.quoteOfferedAt || (order.orderType !== 'auxilio_gasolina' && order.subtotal > 0)) && !order.quoteConfirmedByCustomer ? (
                  <div className="bg-amber-50 border-2 border-amber-400 text-amber-950 rounded-2xl p-4 text-center space-y-3">
                    <div className="flex items-center justify-center gap-1.5 font-black text-sm uppercase text-amber-900">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <span>Cotización Lista para Aprobación</span>
                    </div>
                    <p className="text-xs text-gray-700">
                      Tu pedido solicitado: <strong>{order.customOrderText || order.items[0]?.name}</strong>
                    </p>
                    <div className="bg-white rounded-xl p-3 border border-amber-200 text-xs space-y-1.5 font-bold">
                      <div className="flex justify-between text-gray-600">
                        <span>Costo de Alimentos / Artículos:</span>
                        <span className="text-gray-900">${(order.subtotal || 0).toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Tarifa de Envío RODO:</span>
                        <span className="text-gray-900">${(order.deliveryFee || 0).toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between text-sm font-black border-t border-amber-200 pt-1 text-[#101b29]">
                        <span>Total a Pagar:</span>
                        <span className="text-[#ed0718]">${(order.total || 0).toFixed(2)} MXN</span>
                      </div>
                    </div>
                    {!isAdmin && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCustomerAcceptQuote().catch(err => onShowToast?.(err.message))}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Acepto Cotización (${(order.total || 0).toFixed(2)} MXN)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCustomerRejectQuote().catch(err => onShowToast?.(err.message))}
                        className="w-full bg-white hover:bg-red-50 text-red-600 border-2 border-red-300 hover:border-red-500 font-black text-xs py-3 px-3 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>No lo quiero / Cancelar</span>
                      </button>
                    </div>}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 rounded-xl p-3 text-center">
                    <div className="font-extrabold text-xs uppercase">Cotización en Proceso</div>
                    <div className="text-[11px] text-yellow-800 mt-0.5">
                      Central RODO está cotizando los platillos solicitados. En cuanto se asigne el costo, aquí te aparecerán los 2 botones para Aceptar o Cancelar.
                    </div>
                  </div>
                )
              ) : isTransfer ? (
                isVerified ? (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      TRANSFERENCIA VERIFICADA
                    </div>
                    <div className="text-xs text-emerald-700 mt-1 font-semibold">
                      No cobrar en la entrega (pago confirmado)
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      TRANSFERENCIA PENDIENTE
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-blue-50 border border-blue-300 text-blue-950 rounded-xl p-3 text-center">
                  <div className="text-xs uppercase font-extrabold tracking-wider text-blue-700">
                    Cobro en efectivo
                  </div>
                  <div className="text-lg font-black text-blue-900 mt-0.5">
                    ${order.total.toFixed(2)} MXN
                  </div>
                </div>
              )}
            </div>

            {/* Ubicaciones (Ambas direcciones: Recolección y Entrega) */}
            <div className="space-y-3 py-3 border-y border-dashed border-gray-300 text-xs sm:text-sm text-left">
              {order.pickupAddress ? (
                <div className="flex items-start gap-2 bg-blue-50/80 p-3 rounded-2xl border border-blue-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    A
                  </span>
                  <div className="flex-1">
                    <span className="font-black text-blue-950 uppercase text-[11px] block tracking-wider">
                      Recolección
                    </span>
                    <div className="text-gray-900 font-extrabold text-xs sm:text-sm mt-0.5">
                      {order.pickupAddress}
                    </div>
                    {order.pickupPhone && (
                      <div className="text-gray-600 text-xs mt-1">
                        Tel: <b>{order.pickupPhone}</b>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                (() => {
                  const stored = getLocalStoredRestaurants();
                  const matched = stored.find(
                    (r: Restaurant) => r.id === order.restaurantId || r.name.toLowerCase() === order.restaurantName.toLowerCase()
                  );
                  const gpsUrl = matched?.mapsUrl || (matched?.coordinates ? `https://www.google.com/maps/search/?api=1&query=${matched.coordinates.lat},${matched.coordinates.lng}` : '');
                  const formattedAddress = matched?.address ? `Calle ${matched.address.calle} #${matched.address.numero}, Col. ${matched.address.colonia}${matched.address.referencias ? ` (${matched.address.referencias})` : ''}` : '';

                  return (
                    <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <div className="flex items-start gap-2">
                        <Building className="w-4 h-4 text-[#ed0718] shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-bold text-gray-500 block text-[11px] uppercase">Local</span>
                          <div className="font-extrabold text-gray-900 text-sm">
                            {order.restaurantName} {isAdmin && order.localCode ? `(PIN #${order.localCode})` : ''}
                          </div>
                          {formattedAddress && (
                            <div className="text-gray-600 text-xs mt-1">
                              {formattedAddress}
                            </div>
                          )}
                        </div>
                      </div>

                      {gpsUrl && (
                        <a
                          href={gpsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="self-start inline-flex items-center gap-1.5 bg-[#ed0718] hover:bg-[#c90012] text-white text-xs font-black py-1.5 px-3 rounded-xl shadow-xs transition"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Abrir ruta en Maps</span>
                        </a>
                      )}
                    </div>
                  );
                })()
              )}

              <div className="flex items-start gap-2 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  B
                </span>
                <div className="flex-1">
                  <span className="font-black text-emerald-950 uppercase text-[11px] block tracking-wider">
                    Entrega
                  </span>
                  <div className="font-extrabold text-gray-900 text-xs sm:text-sm mt-0.5">
                    {order.deliveryAddress}
                  </div>
                  <div className="text-gray-700 text-xs mt-0.5">
                    Cliente: <b>{order.customerName}</b>
                  </div>
                  {order.customerPhone && (
                    <div className="text-gray-600 text-xs mt-0.5">
                      Tel: <b>{order.customerPhone}</b>
                    </div>
                  )}
                  {order.deliveryNotes && (
                    <div className="text-gray-600 text-xs mt-1 bg-white p-2 rounded-lg border border-gray-200">
                      <b className="text-gray-800">Notas:</b> {order.deliveryNotes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Aviso de Entrega Programada */}
            {order.deliveryType === 'programada' && (
              <div className="my-2 p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-1 text-left">
                <div className="font-black text-amber-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>PEDIDO PROGRAMADO PARA DESPACHO</span>
                </div>
                <div className="text-gray-800 font-bold">
                  Fecha: {order.scheduledDeliveryDate || 'Hoy'} · Horario: {order.scheduledDeliveryTime || 'Por confirmar'}
                </div>
                <p className="text-[11px] text-amber-950">
                  ⚠️ <b>Recordatorio de confirmación:</b> Se te enviará un recordatorio 15 min antes. Si no confirmas tu respuesta, la orden se pausará para proteger los alimentos.
                </p>
              </div>
            )}

            {/* Seguimiento en Tiempo Real 100% Gratuito con OpenStreetMap (Activo cuando va en camino o afuera) */}
            {(order.status === 'en_camino' || order.status === 'afuera_del_domicilio') && (
              <div className="my-2 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl border border-red-500/40 shadow-lg space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bike className="w-5 h-5 text-[#ed0718] animate-bounce" />
                    <span className="font-black text-xs uppercase tracking-wider text-red-400">
                      {order.status === 'afuera_del_domicilio' ? '🚨 Repartidor Afuera del Domicilio' : '🏍️ Ubicación del Repartidor en Vivo'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-red-600/30 border border-red-500/40 text-red-200 px-2 py-0.5 rounded-full">
                    GPS SMA
                  </span>
                </div>

                <div className="h-44 sm:h-52 w-full rounded-xl overflow-hidden border border-slate-700 relative z-0">
                  <FreeOsmMap
                    center={liveRiderCoords || order.riderLiveCoordinates || order.coordinates || { lat: 20.9144, lng: -100.7437 }}
                    zoom={14}
                    markers={[
                      {
                        id: 'rider',
                        lat:
                          (liveRiderCoords || order.riderLiveCoordinates)?.lat ??
                          (order.coordinates?.lat || 20.9144) - 0.003,
                        lng:
                          (liveRiderCoords || order.riderLiveCoordinates)?.lng ??
                          (order.coordinates?.lng || -100.7437) + 0.002,
                        title: `Repartidor: ${order.assignedRiderName || 'RODO Moto'}`,
                        color: '#ed0718',
                        emoji: '🏍️',
                      },
                      ...(order.coordinates
                        ? [
                            {
                              id: 'customer',
                              lat: order.coordinates.lat,
                              lng: order.coordinates.lng,
                              title: 'Tu Domicilio',
                              color: '#10b981',
                              emoji: '🏠',
                            },
                          ]
                        : []),
                    ]}
                    className="w-full h-full"
                  />
                  <div className="absolute bottom-2 left-2 right-2 z-[400] bg-black/85 backdrop-blur-xs p-2 rounded-lg text-[11px] flex items-center justify-between pointer-events-none">
                    <span>Moto: <b>{order.assignedRiderName || 'RODO Moto'}</b></span>
                    <span className="text-emerald-400 font-bold">~{order.routeEstimateMinutes || 15} min</span>
                  </div>
                </div>


              </div>
            )}

            {/* Evidencia de Firma / Foto de Entrega */}
            {!isRiderMode && (['asignado', 'recolectado', 'en_camino', 'afuera_del_domicilio', 'entregado'] as string[]).includes(order.status) && (
              <div className="my-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5 text-left">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSignaturePanel((prev) => !prev)}
                    className="flex-1 min-w-[160px] bg-[#101b29] hover:bg-black active:scale-98 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PenTool className="w-4 h-4 text-amber-300" />
                    <span>{t('confirmSignature')}</span>
                  </button>
                </div>

                {proofSavedBanner && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-2.5 text-xs space-y-2">
                    <div className="font-black flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>{t('deliveryProofSaved')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.deliverySignatureDataUrl && (
                        <ProtectedImage
                          src={order.deliverySignatureDataUrl}
                          alt="Firma de entrega"
                          className="h-16 bg-white rounded-lg border border-emerald-200 p-1 object-contain"
                        />
                      )}
                      {(order.deliveryProofPhotoUrl || proofPhotoPreview) && (
                        <ProtectedImage
                          src={order.deliveryProofPhotoUrl || proofPhotoPreview}
                          alt="Foto de evidencia"
                          className="h-16 w-24 rounded-lg border border-emerald-200 object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}

                {showSignaturePanel && (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-800">
                        Evidencia de Entrega (Repartidor / Cliente)
                      </span>
                      <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setSignatureMode('firma')}
                          className={`px-2 py-1 rounded-md cursor-pointer ${
                            signatureMode === 'firma' ? 'bg-white text-black shadow-2xs' : 'text-gray-500'
                          }`}
                        >
                          ✍️ Firma
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignatureMode('foto')}
                          className={`px-2 py-1 rounded-md cursor-pointer ${
                            signatureMode === 'foto' ? 'bg-white text-black shadow-2xs' : 'text-gray-500'
                          }`}
                        >
                          📷 Foto
                        </button>
                      </div>
                    </div>

                    {signatureMode === 'firma' ? (
                      <div className="space-y-2">
                        <canvas
                          ref={signatureCanvasRef}
                          width={340}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={drawMove}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={drawMove}
                          onTouchEnd={stopDrawing}
                          className="w-full h-28 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl touch-none cursor-crosshair"
                        />
                        <div className="flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={clearSignatureCanvas}
                            className="text-gray-600 hover:text-black font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Limpiar firma
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDeliveryProof}
                            disabled={savingProof || !hasDrawnSignature}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-black px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            {savingProof ? 'Guardando...' : 'Guardar Firma'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 rounded-xl p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs font-bold text-gray-700">
                          <Camera className="w-5 h-5 text-[#ed0718]" />
                          <span>Tomar o subir foto de entrega</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleProofPhotoUpload}
                            className="hidden"
                          />
                        </label>
                        {proofPhotoPreview && (
                          <div className="flex items-center justify-between gap-2">
                            <ProtectedImage
                              src={proofPhotoPreview}
                              alt="Vista previa evidencia"
                              className="h-16 w-24 rounded-lg object-cover border"
                            />
                            <button
                              type="button"
                              onClick={handleSaveDeliveryProof}
                              disabled={savingProof}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-2 rounded-lg cursor-pointer"
                            >
                              {savingProof ? 'Guardando...' : 'Guardar Foto'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Calificación del Cliente tras entrega completada por el repartidor */}
            {order.status === 'entregado' && !isRiderMode && !isAdmin && (
              <div className="my-3 bg-gradient-to-b from-amber-50/90 to-amber-100/50 border-2 border-amber-300 rounded-2xl p-4 space-y-3 text-center shadow-xs">
                <div className="flex flex-col items-center justify-center gap-1 pb-2 border-b border-amber-200">
                  <div className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pedido Completado</span>
                  </div>
                  <p className="text-[11px] text-amber-900 font-medium">
                    Cuéntanos qué tal estuvo tu entrega.
                  </p>
                </div>

                {/* Calificación Interactiva de 2 Factores: Repartidor y Calidad de la Comida */}
                {ratingSaved ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs space-y-2">
                    <div className="font-extrabold text-emerald-800 text-sm flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>¡Gracias por calificar tu experiencia!</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-left pt-1">
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-gray-500 font-bold block">Repartidor ({order.assignedRiderName || 'RODO'}):</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${s <= riderRating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-gray-500 font-bold block">Calidad de comida:</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${s <= foodRating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {ratingComment && (
                      <div className="text-[11px] text-gray-700 italic bg-white/70 p-2 rounded-lg">
                        "{ratingComment}"
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <span className="text-xs font-black text-amber-950 uppercase tracking-wide block">
                      ¿Cómo estuvo el servicio y la calidad?
                    </span>

                    {/* Factor 1: Servicio del Repartidor */}
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 text-left space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                          <Bike className="w-3.5 h-3.5 text-[#ed0718]" />
                          Servicio del Repartidor ({order.assignedRiderName || 'RODO Moto'}):
                        </span>
                        <span className="font-mono font-bold text-amber-600 text-[11px]">
                          {riderHover || riderRating ? `${riderHover || riderRating} de 5 estrellas` : 'Sin calificar'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setRiderHover(star)}
                            onMouseLeave={() => setRiderHover(0)}
                            onClick={() => setRiderRating(star)}
                            className="p-1 hover:scale-125 transition transform cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= (riderHover || riderRating)
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Factor 2: Calidad de la Comida / Producto */}
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 text-left space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-blue-600" />
                          Calidad de los Alimentos / Empaque:
                        </span>
                        <span className="font-mono font-bold text-amber-600 text-[11px]">
                          {foodHover || foodRating ? `${foodHover || foodRating} de 5 estrellas` : 'Sin calificar'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setFoodHover(star)}
                            onMouseLeave={() => setFoodHover(0)}
                            onClick={() => setFoodRating(star)}
                            className="p-1 hover:scale-125 transition transform cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= (foodHover || foodRating)
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comentario opcional y botón Enviar */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Comentario breve (ej: entrega rapidísima y comida caliente)..."
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmReceptionAndRate(riderRating || 5, foodRating || 5)}
                        disabled={isSubmittingRating}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingRating ? (
                          <span>Guardando...</span>
                        ) : (
                          <>
                            <Star className="w-4 h-4 fill-white" />
                            <span>Enviar Calificación del Pedido</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Artículos */}
            <div className="my-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Artículos del Pedido
              </div>
              <div className="space-y-2">
                {order.items.map((it, idx) => (
                  <div key={idx} className="border-b border-gray-100 pb-1.5 last:border-b-0">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="font-medium text-gray-800">
                        <b className="text-black">{it.quantity}x</b> {it.name}
                      </span>
                      <span className="font-mono font-semibold">
                        ${(it.price * it.quantity).toFixed(2)}
                      </span>
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
                    {it.notes && (
                      <div className="mt-1 text-[11px] bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-semibold">
                        ⚠️ Alergias / Nota: {it.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sumatoria Desglosada */}
            <div className="pt-3 border-t border-dashed border-gray-300 space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">${order.subtotal.toFixed(2)} MXN</span>
              </div>
              {(order.promoDiscountApplied ?? 0) > 0 && (
                <div className="flex justify-between text-amber-800 text-xs">
                  <span>{order.promoLabel || `Cupón ${order.promoCode || 'RODO'}`}:</span>
                  <span className="font-mono font-black">-${(order.promoDiscountApplied ?? 0).toFixed(2)} MXN</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>
                  Envío ({order.deliveryType === 'express' ? 'Exprés' : order.deliveryType === 'programada' ? `Programada (${order.scheduledDeliveryTime || ''})` : 'Normal'}):
                </span>
                <span className="font-mono font-bold">${order.deliveryFee.toFixed(2)} MXN</span>
              </div>

              {order.fuelDetails && (
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-0.5">
                  <div className="font-bold">⛽ Auxilio Gasolina:</div>
                  <div className="flex justify-between">
                    <span>{order.fuelDetails.liters}L Gasolina {order.fuelDetails.fuelType.toUpperCase()}:</span>
                    <span className="font-mono">${order.fuelDetails.fuelTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarifa de viaje auxilio:</span>
                    <span className="font-mono">${order.fuelDetails.serviceTravelFee.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-300">
                <span>TOTAL AL FINAL:</span>
                <span className="font-mono text-[#ed0718] text-lg">${order.total.toFixed(2)} MXN</span>
              </div>
            </div>

            {/* Código de barras */}
            <div className="mt-3 pt-2 border-t border-dashed border-gray-300 text-center">
              <div className="font-mono tracking-[0.3em] text-[10px] text-gray-400">
                |||||| | |||||||| |||| | ||||| |||||||
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                {order.folio} · RODO DESPACHO
              </div>
            </div>
          </div>
        </div>

        {/* Footer con controles de Administrador */}
        {isAdmin && (
          <div className="bg-gray-100 p-3.5 border-t border-gray-200 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-600">
              {order.assignedRiderName ? `Repartidor: ${order.assignedRiderName}` : 'Sin repartidor asignado'}
            </span>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
