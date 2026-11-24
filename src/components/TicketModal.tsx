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
import { assignRiderToOrder } from '../services/riders';

interface TicketModalProps {
  order: Order | null;
  settings: DispatchSettings;
  onClose: () => void;
  isAdmin?: boolean;
  onShowToast?: (msg: string) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  order,
  settings,
  onClose,
  isAdmin = false,
  onShowToast,
}) => {
  const { t } = useLanguage();
  const directory = useRiderDirectory(isAdmin && !!order);
  const [copied, setCopied] = useState(false);
  const [selectedRider, setSelectedRider] = useState(order?.assignedRiderName || settings.defaultRider1Name);
  const [selectedRiderUserId, setSelectedRiderUserId] = useState(order?.assignedRiderUserId || '');

  useEffect(() => {
    setSelectedRiderUserId(order?.assignedRiderUserId || '');
    setSelectedRider(order?.assignedRiderName || settings.defaultRider1Name);
  }, [order?.id, order?.assignedRiderUserId, order?.assignedRiderName, settings.defaultRider1Name]);

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
  const [isConfirmingReceived, setIsConfirmingReceived] = useState(false);

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



  const handleConfirmReceivedByCustomer = async () => {
    if (!order) return;
    setIsConfirmingReceived(true);
    try {
      const now = new Date().toISOString();
      await updateOrderInDb(order.id, {
        status: 'entregado',
        receptionConfirmed: true,
        receptionConfirmedAt: now,
      });
      setReceptionConfirmed(true);
      vibrateSuccess();
      onShowToast?.('¡Recepción confirmada con éxito! Gracias por usar RODO.');
      dispatchIntegrationEvent('order.status_changed', {
        order: { ...order, status: 'entregado', receptionConfirmed: true },
      });
    } catch (err) {
      console.error('Error confirmando recepción del pedido:', err);
    } finally {
      setIsConfirmingReceived(false);
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
        status: 'entregado',
        receptionConfirmed: true,
        receptionConfirmedAt: order.receptionConfirmedAt || now,
      });
      setProofSavedBanner(true);
      setReceptionConfirmed(true);
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

  const dispatchRiders = availableDispatchRiders(directory.riders);
  const primaryRider = dispatchRiders[0] || { name: settings.defaultRider1Name, phone: settings.defaultRider1Phone };
  const messageRider1 = buildWhatsAppDispatchMessage(order, primaryRider.name);

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

  const handleQuickStatusChange = async (newStatus: Order['status']) => {
    const updates: Partial<Order> = {
      status: newStatus,
      assignedRiderName: selectedRider,
      assignedRiderUserId: selectedRiderUserId || undefined,
    };

    if (newStatus === 'afuera_del_domicilio') {
      const now = new Date();
      const expires = new Date(now.getTime() + 10 * 60 * 1000);
      updates.arrivalNotifiedAt = now.toISOString();
      updates.arrivalExpiresAt = expires.toISOString();
      updates.customerNotifiedOutside = true;
      setTimeLeft(600);
    }

    await updateOrderInDb(order.id, updates);
    dispatchIntegrationEvent('order.status_changed', { order: { ...order, ...updates } });
  };

  const handleRiderAssignment = async (riderUserId: string) => {
    const rider = dispatchRiders.find((candidate) => candidate.userId === riderUserId);
    try {
      await assignRiderToOrder(order.id, riderUserId || null);
      setSelectedRiderUserId(riderUserId);
      if (rider) setSelectedRider(rider.name);
      onShowToast?.(rider ? `Pedido asignado a ${rider.name}.` : 'Se retiró la asignación del pedido.');
    } catch (error: any) {
      onShowToast?.(error?.message || 'No se pudo asignar el repartidor.');
    }
  };

  // Notificar al cliente que está afuera
  const handleNotifyOutside = async () => {
    await handleQuickStatusChange('afuera_del_domicilio');
    // Abrir WhatsApp al cliente
    window.open(linkCustomerArrival, '_blank');
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
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[95dvh] overflow-y-auto shadow-2xl sm:my-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 border border-gray-200">
        {/* Encabezado modal */}
        <div className="bg-[#101b29] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-[#ed0718] p-1.5 rounded-xl text-white">
              <Bike className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
                TICKET DE DESPACHO DIGITAL
              </h3>
              <p className="text-xs text-gray-300 font-mono">Folio: {order.folio}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ESTATUS DEL PEDIDO EN VIVO (Stepper con animaciones framer-motion) */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase text-gray-300 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Estatus del Pedido en Tiempo Real
            </span>

            <AnimatePresence mode="wait">
              <motion.span
                key={order.status}
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                  order.status === 'entregado'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : order.status === 'afuera_del_domicilio'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                    : order.status === 'en_camino'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {order.status === 'nuevo' && '● 1. Recibido por RODO'}
                {order.status === 'en_preparacion' && '● 2. En Cocina / Preparando'}
                {order.status === 'asignado' && '● Repartidor asignado'}
                {order.status === 'recolectado' && '● Pedido recolectado'}
                {order.status === 'en_camino' && '● 4. Pedido en Camino'}
                {order.status === 'afuera_del_domicilio' && '🚨 4. ¡Repartidor Afuera!'}
                {order.status === 'entregado' && '✓ 5. Pedido Entregado'}
                {order.status === 'cancelado' && '✕ Cancelado'}
                {order.status === 'pendiente_cotizacion' && '💬 Cotizando'}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Stepper visual animado con Framer Motion (5 pasos: Recibido, En cocina, Recolectado, En camino, Entregado) */}
          {order.status !== 'cancelado' && order.status !== 'pendiente_cotizacion' && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-5 gap-1 text-center">
                {[
                  {
                    key: 'recibido',
                    stepNum: 1,
                    label: 'Recibido',
                    active: true,
                    done: order.status !== 'nuevo',
                  },
                  {
                    key: 'cocina',
                    stepNum: 2,
                    label: 'En Cocina',
                    active: order.status !== 'nuevo',
                    done: ['asignado', 'recolectado', 'en_camino', 'afuera_del_domicilio', 'entregado'].includes(order.status),
                  },
                  {
                    key: 'recolectado',
                    stepNum: 3,
                    label: 'Recolectado',
                    active: ['recolectado', 'en_camino', 'afuera_del_domicilio', 'entregado'].includes(order.status),
                    done: ['en_camino', 'afuera_del_domicilio', 'entregado'].includes(order.status),
                  },
                  {
                    key: 'en_camino',
                    stepNum: 4,
                    label: 'En Camino',
                    active: ['en_camino', 'afuera_del_domicilio', 'entregado'].includes(order.status),
                    done: order.status === 'entregado',
                  },
                  {
                    key: 'entregado',
                    stepNum: 5,
                    label: 'Entregado',
                    active: order.status === 'entregado',
                    done: order.status === 'entregado',
                  },
                ].map((s) => (
                  <motion.div
                    key={s.key}
                    layout
                    className={`p-1.5 sm:p-2 rounded-xl text-[9px] sm:text-[10px] font-bold border transition-colors flex flex-col items-center justify-between min-h-[50px] ${
                      s.done
                        ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                        : s.active
                        ? order.status === 'afuera_del_domicilio' && s.key === 'en_camino'
                          ? 'bg-red-600 border-red-400 text-white animate-pulse'
                          : 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <motion.div
                      animate={s.active && !s.done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                      transition={s.active && !s.done ? { type: 'tween', repeat: Infinity, duration: 1.8, ease: 'easeInOut' } : { duration: 0.2 }}
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black mb-1 ${
                        s.done
                          ? 'bg-emerald-500 text-black'
                          : s.active
                          ? 'bg-amber-400 text-black'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {s.done ? '✓' : s.stepNum}
                    </motion.div>
                    <span className="leading-tight truncate w-full">{s.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ALERTA Y CUENTA REGRESIVA DE 10 MINUTOS SI ESTÁ AFUERA */}
        {order.status === 'afuera_del_domicilio' && (
          <div className="bg-red-600 text-white p-4 text-center shadow-inner space-y-2 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 font-black text-sm uppercase tracking-wide">
              <Bell className="w-5 h-5 animate-bounce" />
              <span>¡EL REPARTIDOR ESTÁ AFUERA DE TU DOMICILIO!</span>
            </div>
            <p className="text-xs text-red-100">
              Por favor sal a recibir tu pedido al timbre o zaguán. Tienes 10 minutos de tolerancia:
            </p>
            <div className="inline-block bg-black/30 border border-white/30 px-5 py-2 rounded-2xl">
              <span className="font-mono text-3xl font-black tracking-wider text-yellow-300">
                {formatTimer(timeLeft)}
              </span>
            </div>
            {timeLeft === 0 && (
              <p className="text-xs font-bold bg-white text-red-700 py-1 px-3 rounded-lg mt-1 inline-block">
                ⚠️ Tiempo de tolerancia expirado.
              </p>
            )}
          </div>
        )}

        {/* CANAL OFICIAL DE ATENCIÓN CON EL PEDIDO */}
        <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-600 text-white p-1.5 rounded-lg text-xs">💬</span>
            <div>
              <span className="text-[11px] font-black text-emerald-950 uppercase block">¿Dudas o cambios con tu pedido?</span>
              <span className="text-xs text-emerald-800 font-semibold">Atención y seguimiento por WhatsApp</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={`https://wa.me/524151019920?text=${encodeURIComponent(`Hola RODO Moto Mandados, necesito ayuda con mi pedido Folio: ${order.folio}`)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-3.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>📲</span>
              <span>WhatsApp Oficial</span>
            </a>
          </div>
        </div>

        {/* Acciones de WhatsApp directas para Administrador */}
        {isAdmin && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Despacho Central WhatsApp
              </span>
              <button
                onClick={handleCopy}
                className="text-xs bg-white text-gray-700 px-2.5 py-1 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-1 font-semibold"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar texto'}
              </button>
            </div>

            <div className="text-[11px] text-amber-950 font-bold">
              Enviar ticket a repartidor por WhatsApp ({dispatchRiders.length} disponibles):
            </div>
            {directory.error && <p role="alert">{directory.error} <button type="button" onClick={directory.reload}>Reintentar</button></p>}
            <label className="block text-[11px] font-bold text-amber-950">
              Repartidor asignado
              <select
                value={selectedRiderUserId}
                onChange={(event) => void handleRiderAssignment(event.target.value)}
                className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Sin asignar</option>
                {dispatchRiders.map((rider) => rider.userId && (
                  <option key={rider.userId} value={rider.userId}>{rider.name} · {rider.phone}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {dispatchRiders.map((rider, idx) => {
                const msg = buildWhatsAppDispatchMessage(order, rider.name);
                const link = generateWhatsAppLink(rider.phone, msg);
                return (
                  <a
                    key={rider.id || idx}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-start gap-2 shadow-xs transition"
                    title={`Enviar ticket a ${rider.name} (${rider.phone})`}
                  >
                    <span className="shrink-0">📲</span>
                    <span className="truncate">{rider.name}</span>
                  </a>
                );
              })}
            </div>

            {/* Botón para notificar al cliente que el repartidor está afuera */}
            <button
              disabled={!order.adminNextStatuses?.includes('afuera_del_domicilio')}
              onClick={() => handleNotifyOutside().catch(err => onShowToast?.(err.message))}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Bell className="w-4 h-4" />
              <span>🔔 Avisar al Cliente: ¡Estoy afuera! (Activar 10 min de tolerancia)</span>
            </button>
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
                      TRANSFERENCIA BANCARIA VERIFICADA
                    </div>
                    <div className="text-xs text-emerald-700 mt-1 font-semibold">
                      ⚠️ NO COBRAR EN LA ENTREGA (Pago recibido y auditado)
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      TRANSFERENCIA PENDIENTE DE REVISIÓN
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-blue-50 border border-blue-300 text-blue-950 rounded-xl p-3 text-center">
                  <div className="text-xs uppercase font-extrabold tracking-wider text-blue-700">
                    Cobro en destino
                  </div>
                  <div className="text-lg font-black text-blue-900 mt-0.5">
                    COBRAR EN EFECTIVO: ${order.total.toFixed(2)} MXN
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
                      📍 Punto de Recolección (Dónde se recoge):
                    </span>
                    <div className="text-gray-900 font-extrabold text-xs sm:text-sm mt-0.5">
                      {order.pickupAddress}
                    </div>
                    {order.pickupPhone && (
                      <div className="text-gray-600 text-xs mt-1">
                        📞 Tel. Contacto Recolección: <b>{order.pickupPhone}</b>
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
                          <span className="font-bold text-gray-900 block text-xs">Restaurante / Recolectar:</span>
                          <div className="font-extrabold text-gray-900 text-sm">
                            {order.restaurantName} {isAdmin && order.localCode ? `(PIN Local #${order.localCode})` : ''}
                          </div>
                          {formattedAddress && (
                            <div className="text-gray-600 text-xs mt-1">
                              📍 <b>Ubicación fija:</b> {formattedAddress}
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
                          <span>🗺️ Ruta GPS al Local (Google Maps)</span>
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
                    🏁 Punto de Entrega (Destino final):
                  </span>
                  <div className="font-extrabold text-gray-900 text-xs sm:text-sm mt-0.5">
                    {order.deliveryAddress}
                  </div>
                  <div className="text-gray-700 text-xs mt-0.5">
                    Destinatario: <b>{order.customerName}</b>
                  </div>
                  {order.customerPhone && (
                    <div className="text-gray-600 text-xs mt-0.5">
                      📞 Tel. Contacto Entrega: <b>{order.customerPhone}</b>
                    </div>
                  )}
                  {order.deliveryNotes && (
                    <div className="text-gray-600 text-xs mt-1 bg-white p-2 rounded-lg border border-gray-200">
                      <b className="text-gray-800">Notas / Referencias:</b> {order.deliveryNotes}
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

            {/* Botones de Confirmación de Recepción (Cliente) y Confirmar Firma / Foto de Entrega (Repartidor) */}
            {(['asignado', 'recolectado', 'en_camino', 'afuera_del_domicilio', 'entregado'] as string[]).includes(order.status) && (
              <div className="my-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5 text-left">
                <div className="flex flex-wrap gap-2">
                  {order.status === 'afuera_del_domicilio' && (
                    <button
                      type="button"
                      onClick={handleConfirmReceivedByCustomer}
                      disabled={isConfirmingReceived}
                      className="flex-1 min-w-[160px] bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isConfirmingReceived ? 'Confirmando...' : t('confirmReceived')}</span>
                    </button>
                  )}

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

            {/* Confirmar Recepción y Calificación del Cliente (Repartidor y Calidad de Comida) */}
            {order.status === 'entregado' && (
              <div className="my-3 bg-gradient-to-b from-amber-50/90 to-amber-100/50 border-2 border-amber-300 rounded-2xl p-4 space-y-3 text-center shadow-xs">
                {/* Botón de Confirmar Recepción */}
                <div className="flex flex-col items-center justify-center gap-1.5 pb-2 border-b border-amber-200">
                  {receptionConfirmed ? (
                    <div className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>¡Recepción del Pedido Confirmada por el Cliente!</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConfirmReceptionAndRate(riderRating || 5, foodRating || 5)}
                      disabled={isSubmittingRating}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>✓ Confirmar Recepción de mi Pedido</span>
                    </button>
                  )}
                  <p className="text-[11px] text-amber-900 font-medium">
                    {receptionConfirmed
                      ? 'Tu confirmación ayuda a auditar los tiempos del repartidor y el cierre de entrega.'
                      : 'Pulsa para confirmar que recibiste tus alimentos o artículos completos.'}
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
                <span>Subtotal de artículos:</span>
                <span className="font-mono font-bold">${order.subtotal.toFixed(2)} MXN</span>
              </div>
              {order.promoDiscountApplied && order.promoDiscountApplied > 0 && (
                <div className="flex justify-between text-amber-800 text-xs">
                  <span>🎟️ {order.promoLabel || `Cupón ${order.promoCode || 'RODO'}`}:</span>
                  <span className="font-mono font-black">-${order.promoDiscountApplied.toFixed(2)} MXN</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>
                  Tarifa de envío ({order.deliveryType === 'express' ? '⚡ Exprés' : order.deliveryType === 'programada' ? `🕒 Programada (${order.scheduledDeliveryTime || ''})` : '🛵 Normal'}):
                </span>
                <span className="font-mono font-bold">${order.deliveryFee.toFixed(2)} MXN</span>
              </div>

              {order.tipAmount && order.tipAmount > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>Propina del repartidor ({order.tipPercentage || 0}%):</span>
                  <span className="font-mono font-bold">+${order.tipAmount.toFixed(2)} MXN</span>
                </div>
              )}

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
          <div className="bg-gray-100 p-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700">Estado:</span>
              <select
                value={order.status}
                onChange={(e) => handleQuickStatusChange(e.target.value as Order['status']).catch(err => onShowToast?.(err.message))}
                className="bg-white border border-gray-300 text-xs rounded-xl px-2.5 py-1.5 font-bold"
              >
                {[order.status, ...(order.adminNextStatuses || [])].map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
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
