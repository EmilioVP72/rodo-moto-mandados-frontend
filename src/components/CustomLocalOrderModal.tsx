import React, { useState } from 'react';
import { Restaurant, Order } from '../types';
import { generateUniqueTicketFolio, createOrderInDb, getDispatchSettings } from '../services/db';
import {
  X,
  Store,
  MapPin,
  Phone,
  User,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
  Sparkles,
  HelpCircle,
  CloudRain,
} from 'lucide-react';

interface CustomLocalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRestaurant?: Restaurant | null; // Si viene de un local conocido sin menú fijo
  customerId: string;
  customerDefaultName?: string;
  customerDefaultPhone?: string;
  deliveryAddress: string;
  onRequireLogin?: () => void;
  rainPauseEnabled?: boolean;
  rainPauseMessage?: string;
  onOrderSuccess: (order: Order) => void;
}

export const CustomLocalOrderModal: React.FC<CustomLocalOrderModalProps> = ({
  isOpen,
  onClose,
  targetRestaurant,
  customerId,
  customerDefaultName = '',
  customerDefaultPhone = '',
  deliveryAddress: defaultDeliveryAddress,
  onRequireLogin,
  rainPauseEnabled = false,
  rainPauseMessage,
  onOrderSuccess,
}) => {
  if (!isOpen) return null;

  const isUnknownLocal = !targetRestaurant;
  const [localName, setLocalName] = useState(targetRestaurant ? targetRestaurant.name : '');
  const [localApproxLocation, setLocalApproxLocation] = useState(
    targetRestaurant?.description || ''
  );
  const [itemsRequested, setItemsRequested] = useState('');
  const [customerName, setCustomerName] = useState(customerDefaultName);
  const [customerPhone, setCustomerPhone] = useState(customerDefaultPhone);
  const [deliveryAddress, setDeliveryAddress] = useState(defaultDeliveryAddress);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validación de Pausa por Lluvia
    if (rainPauseEnabled) {
      setErrorMsg(
        `🌧️ ${rainPauseMessage || 'Envíos pausados temporalmente por lluvia intensa para proteger a nuestros repartidores. Intenta más tarde.'}`
      );
      return;
    }

    // Validación obligatoria de inicio de sesión con cuenta registrada
    if (!customerId || customerId === 'guest' || customerId.startsWith('guest')) {
      setErrorMsg('⚠️ Para solicitar un pedido o cotización es necesario tener una cuenta registrada e iniciar sesión.');
      if (onRequireLogin) onRequireLogin();
      return;
    }

    if (isUnknownLocal && !localName.trim()) {
      setErrorMsg('Por favor escribe el nombre del local o puesto que buscas.');
      return;
    }
    if (!itemsRequested.trim()) {
      setErrorMsg('Escribe detalladamente qué necesitas que compremos en ese lugar.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 8) {
      setErrorMsg('Ingresa tu teléfono de contacto para enviarte la cotización y confirmación.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMsg('Indica tu dirección de entrega en San Miguel.');
      return;
    }

    setIsSubmitting(true);
    try {
      const liveSettings = await getDispatchSettings();
      if (liveSettings.rainPauseEnabled) {
        setErrorMsg(
          `🌧️ ${liveSettings.rainPauseMessage || 'Envíos pausados temporalmente por lluvia intensa para proteger a nuestros repartidores.'}`
        );
        setIsSubmitting(false);
        return;
      }

      const folio = generateUniqueTicketFolio();
      const orderId = 'ord-custom-' + Date.now().toString(36);
      const estDeliveryFee = targetRestaurant?.deliveryFee || 35;

      const orderData: Order = {
        id: orderId,
        folio,
        orderType: isUnknownLocal ? 'local_no_encontrado' : 'pedido_personalizado',
        customerId: customerId || 'guest-' + Date.now(),
        customerName: customerName.trim() || 'Cliente RODO',
        customerPhone: customerPhone.trim(),
        restaurantId: targetRestaurant?.id || 'local-solicitado-' + Date.now(),
        restaurantName: localName.trim(),
        restaurantDeliveryFee: estDeliveryFee,
        restaurantCommissionRate: 20,
        items: [
          {
            id: 'it-custom-1',
            name: `Pedido a la medida: ${itemsRequested.trim().substring(0, 70)}...`,
            price: 0, // Pendiente de cotización
            quantity: 1,
            notes: itemsRequested.trim(),
          },
        ],
        subtotal: 0,
        deliveryFee: estDeliveryFee,
        commissionAmount: 0,
        total: estDeliveryFee, // Base hasta confirmación del precio de los alimentos
        paymentMethod: 'efectivo',
        paymentStatus: 'pendiente',
        deliveryAddress: deliveryAddress.trim(),
        deliveryNotes: `PEDIDO PERSONALIZADO: ${itemsRequested.trim()}. LOCAL: ${localName.trim()} (${localApproxLocation || 'San Miguel'}). NOTAS CLIENTE: ${deliveryNotes || 'Sin notas'}`,
        status: 'pendiente_cotizacion',
        isCustomQuote: true,
        customOrderText: itemsRequested.trim(),
        quoteConfirmedByCustomer: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const confirmed = await createOrderInDb(orderData);
      onOrderSuccess(confirmed);
      onClose();
    } catch {
      setErrorMsg('Hubo un error al registrar la solicitud. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto border border-gray-200">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#ed0718] p-2 rounded-xl text-white">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                {isUnknownLocal ? '¿No encontraste tu local? ¡Lo buscamos por ti!' : `Pide lo que se te antoje de ${localName}`}
              </h3>
              <p className="text-xs text-gray-400">
                Cotización directa · Envío rápido en San Miguel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {rainPauseEnabled && (
            <div className="bg-sky-50 border-2 border-sky-300 text-sky-900 p-3 rounded-2xl text-xs flex items-start gap-2.5 shadow-xs">
              <CloudRain className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sky-950">Envíos pausados por lluvia</p>
                <p className="text-[11px] text-sky-800 mt-0.5 leading-snug">
                  {rainPauseMessage || 'Por seguridad de nuestros repartidores ante la lluvia, los envíos están pausados temporalmente.'}
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cómo Funciona */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              ¿Cómo funciona el pedido personalizado?
            </div>
            <p className="text-[11px] text-blue-800">
              1. Escribes lo que necesitas de este lugar o puesto.
              <br />
              2. Tu orden entra a <strong>Cotización Inmediata</strong> en la central RODO.
              <br />
              3. Te confirmamos el total con el costo de la comida y el envío para que apruebes antes de salir.
            </p>
          </div>

          {/* Nombre del Local (editable si es 'no encontrado') */}
          {isUnknownLocal && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-gray-400" /> Nombre del Local, Puesto o Negocio
              </label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                required
                placeholder="Ej. Tacos de Cabeza El Güero, Farmacia El Carmen, etc."
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:border-[#ed0718] outline-none"
              />
            </div>
          )}

          {/* Ubicación aproximada del local */}
          {isUnknownLocal && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" /> Ubicación o Referencia del Local
              </label>
              <input
                type="text"
                value={localApproxLocation}
                onChange={(e) => setLocalApproxLocation(e.target.value)}
                placeholder="Ej. Frente al mercado de San Juan de Dios, o Calle Mesones"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:border-[#ed0718] outline-none"
              />
            </div>
          )}

          {/* ¿Qué necesitas que pidamos? */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> ¿Qué deseas que compremos o recojamos?
            </label>
            <textarea
              rows={3}
              value={itemsRequested}
              onChange={(e) => setItemsRequested(e.target.value)}
              required
              placeholder={
                targetRestaurant?.customOrderHint ||
                'Ej. 2 tortas de pierna con todo y queso, 1 refresco de lata y salsa extra'
              }
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-medium focus:border-[#ed0718] outline-none"
            />
          </div>

          {/* Datos del Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tu Nombre</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:border-[#ed0718] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono (WhatsApp)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                placeholder="Ej. 4151234567"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold font-mono focus:border-[#ed0718] outline-none"
              />
            </div>
          </div>

          {/* Dirección de Entrega */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ¿A dónde te lo llevamos?
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              required
              placeholder="Calle, número exterior/interior, colonia"
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:border-[#ed0718] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Indicaciones de entrega (Opcional)
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Ej. Casa verde con reja café, timbre al lado"
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:border-[#ed0718] outline-none"
            />
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#ed0718] hover:bg-[#d60615] text-white font-extrabold text-sm py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando Solicitud a Despacho...</span>
              </>
            ) : (
              <span>Solicitar Pedido y Cotización Rápida</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
