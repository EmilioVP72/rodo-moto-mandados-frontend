import React, { useState } from 'react';
import { PartnerLocal, Order } from '../types';
import {
  findPartnerLocalByCode,
  generateUniqueTicketFolio,
  createOrderInDb,
} from '../services/db';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import {
  X,
  Store,
  KeyRound,
  CheckCircle2,
  Bike,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
  FileText,
  Phone,
  Flame,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

interface LocalAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

export const LocalAccessModal: React.FC<LocalAccessModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  // Código de 3 dígitos
  const [code, setCode] = useState('');
  const [verifiedLocal, setVerifiedLocal] = useState<PartnerLocal | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Selector de 1 a 4 repartidores (estrictamente "repartidores", opción rápida)
  const [ridersCount, setRidersCount] = useState<number>(1);

  // Urgencia y tiempos (por si se les olvidó avisar o tienen pedidos ya listos)
  const [urgencyOption, setUrgencyOption] = useState<string>('ya');

  // Observaciones para repartidores (opcional)
  const [notes, setNotes] = useState('');

  // Opcional: Desplegar formulario de dirección si quieren detallar una entrega específica
  const [showOptionalAddress, setShowOptionalAddress] = useState(false);
  const [deliveryCalle, setDeliveryCalle] = useState('');
  const [deliveryNumero, setDeliveryNumero] = useState('');
  const [deliveryColonia, setDeliveryColonia] = useState('');
  const [deliveryReferencias, setDeliveryReferencias] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  // Coordenadas
  const [coords, setCoords] = useState<{ lat: number; lng: number; mapsUrl: string }>({
    lat: 20.9144,
    lng: -100.7437,
    mapsUrl: 'https://maps.google.com/?q=20.9144,-100.7437',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  // Verificación rápida del código de 3 dígitos
  const handleVerifyCode = async (codeToVerify?: string) => {
    const pin = (codeToVerify ?? code).trim();
    setCodeError('');

    if (pin.length !== 3) {
      setCodeError('Ingresa el código privado de 3 dígitos asignado a tu local.');
      return;
    }

    setIsVerifying(true);
    try {
      const local = await findPartnerLocalByCode(pin);
      if (!local) {
        setCodeError('Código de 3 dígitos no válido o inactivo. Contacta a la administración de RODO.');
        setVerifiedLocal(null);
      } else {
        setVerifiedLocal(local);
        setCodeError('');
        if (local.address.lat && local.address.lng) {
          setCoords({
            lat: local.address.lat,
            lng: local.address.lng,
            mapsUrl: local.address.mapsUrl || `https://maps.google.com/?q=${local.address.lat},${local.address.lng}`,
          });
        }
      }
    } catch {
      setCodeError('Error al validar código. Intenta de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
    setCode(val);
    setCodeError('');
    if (val.length === 3) {
      handleVerifyCode(val);
    } else {
      setVerifiedLocal(null);
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!verifiedLocal) {
      setSubmitError('Primero ingresa tu código de 3 dígitos asignado por RODO.');
      return;
    }

    setIsSubmitting(true);
    try {
      const folio = generateUniqueTicketFolio();
      const now = new Date().toISOString();

      // Dirección del restaurante (punto donde la moto debe presentarse de inmediato)
      const restaurantPickup = `${verifiedLocal.address.calle} #${verifiedLocal.address.numero}, Col. ${verifiedLocal.address.colonia}${
        verifiedLocal.address.referencias ? ` (${verifiedLocal.address.referencias})` : ''
      }`;

      // Si no especificaron dirección opcional, es despacho rápido directo al mostrador del local
      const hasSpecificAddress = deliveryCalle.trim() && deliveryNumero.trim();
      const customerDestination = hasSpecificAddress
        ? `${deliveryCalle.trim()} #${deliveryNumero.trim()}, Col. ${deliveryColonia.trim() || 'Centro'}${
            deliveryReferencias.trim() ? ` (Ref: ${deliveryReferencias.trim()})` : ''
          }`
        : `Pedidos listos en mostrador de ${verifiedLocal.name} (El repartidor recoge y entrega según comanda)`;

      // Urgencia seleccionada
      let urgencyText = '🚨 ¡YA MISMO! Repartidor urgente (pedidos listos)';
      if (urgencyOption === '5_min') urgencyText = '⏱️ En 5 minutos';
      if (urgencyOption === '10_min') urgencyText = '⏱️ En 10 minutos';
      if (urgencyOption === '15_min') urgencyText = '⏱️ En 15 minutos';
      if (urgencyOption === 'escalonado')
        urgencyText = '📅 Llegada Escalonada (ej. 1 en 5 min, otro en 10 o 15 min)';

      const tariffPerRider = verifiedLocal.serviceFee || 35;
      const totalTariff = tariffPerRider * ridersCount;

      const newOrder: Order = {
        id: 'req-' + Date.now().toString(),
        folio,
        orderType: 'solicitud_local',
        localCode: verifiedLocal.code,
        ridersRequestedCount: ridersCount,
        urgencyTiming: urgencyText,
        customerId: 'local-' + verifiedLocal.id,
        customerName: `Encargado · ${verifiedLocal.name}`,
        customerPhone: recipientPhone.trim() || verifiedLocal.phone,
        restaurantId: verifiedLocal.id,
        restaurantName: verifiedLocal.name,
        restaurantDeliveryFee: tariffPerRider,
        restaurantCommissionRate: 0,
        items: [
          {
            id: 'item-riders',
            name: `Solicitud Rápida: ${ridersCount} ${ridersCount === 1 ? 'Repartidor' : 'Repartidores'} · ${verifiedLocal.name}`,
            price: tariffPerRider,
            quantity: ridersCount,
            notes: notes.trim() || 'Pedidos listos para despacho inmediato',
          },
        ],
        subtotal: totalTariff,
        deliveryFee: tariffPerRider,
        commissionAmount: totalTariff,
        total: totalTariff,
        paymentMethod: 'efectivo',
        paymentStatus: 'en_efectivo',
        pickupAddress: restaurantPickup,
        pickupPhone: verifiedLocal.phone,
        deliveryAddress: customerDestination,
        deliveryNotes: `URGENCIA: ${urgencyText} | REPARTIDORES: ${ridersCount} | OBSERVACIONES: ${
          notes.trim() || 'Pedidos ya listos para entregar'
        }`,
        mapsUrl: verifiedLocal.address.mapsUrl || coords.mapsUrl,
        coordinates: verifiedLocal.address.lat
          ? { lat: verifiedLocal.address.lat, lng: verifiedLocal.address.lng || coords.lng }
          : { lat: coords.lat, lng: coords.lng },
        status: 'nuevo',
        createdAt: now,
        updatedAt: now,
      };

      const confirmed = await createOrderInDb(newOrder);
      onClose();
      onOrderCreated(confirmed);
    } catch {
      setSubmitError('No se pudo generar la solicitud rápida. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-[#ed0718] p-2.5 rounded-2xl text-white shadow-md">
              <Zap className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Solicitud Rápida para Locales
                </h3>
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Despacho Inmediato
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Pide repartidores sin tener que llenar calles ni direcciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario Rápido */}
        <form onSubmit={handleQuickSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. SECCIÓN: INGRESO DE CÓDIGO DE 3 DÍGITOS */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50/50 p-4 rounded-2xl border border-red-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#ed0718]" />
                1. Ingresa tu código de 3 dígitos:
              </label>
              <span className="text-[11px] text-gray-500 font-medium">Asignado por RODO</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={code}
                onChange={handleCodeChange}
                placeholder="•••"
                className="w-32 bg-white border-2 border-red-300 focus:border-[#ed0718] rounded-xl px-4 py-2.5 text-center font-mono font-black text-2xl tracking-widest text-[#101b29] outline-none shadow-xs"
              />
              <button
                type="button"
                onClick={() => handleVerifyCode()}
                disabled={isVerifying || code.length !== 3}
                className="bg-[#101b29] hover:bg-black text-white text-xs font-black px-4 py-3 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>Identificar Local</span>
              </button>
            </div>

            {codeError && (
              <div className="text-xs text-red-700 bg-red-100 p-2.5 rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            {/* Códigos asignados de prueba */}
            <div className="text-[11px] text-gray-600 flex flex-wrap items-center gap-1 pt-0.5">
              <span className="font-bold">Códigos activos:</span>
              {(['101', '102', '103', '104', '201', '202'] as const).map((demoPin) => (
                <button
                  key={demoPin}
                  type="button"
                  onClick={() => {
                    setCode(demoPin);
                    handleVerifyCode(demoPin);
                  }}
                  className="bg-white border border-gray-300 hover:border-red-500 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md hover:text-[#ed0718] transition"
                >
                  #{demoPin}
                </button>
              ))}
            </div>

            {/* Confirmación del Local Identificado */}
            {verifiedLocal && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-3.5 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Local: {verifiedLocal.name} (PIN #{verifiedLocal.code})</span>
                  </div>
                  <div className="bg-emerald-600 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Tarifa: ${verifiedLocal.serviceFee || 35} MXN</span>
                  </div>
                </div>

                <p className="text-xs text-emerald-800">
                  📍 <b>Ubicación registrada:</b> {verifiedLocal.address.calle} #{verifiedLocal.address.numero}, Col. {verifiedLocal.address.colonia}
                </p>
              </div>
            )}
          </div>

          {/* 2. BOTONES RÁPIDOS: 1, 2, 3 O 4 REPARTIDORES (SIN LLENAR DIRECCIÓN) */}
          {verifiedLocal && (
            <div className="space-y-4 bg-white p-4 sm:p-5 rounded-2xl border-2 border-red-200 shadow-sm animate-in fade-in">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 leading-relaxed">
                💡 <b>Opción Rápida de Despacho:</b> Como ya identificamos tu local ({verifiedLocal.name}), no necesitas escribir calle ni colonia. Selecciona cuántos repartidores necesitas y el ticket se genera al instante.
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-800 tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-[#ed0718]" />
                    2. ¿Cuántos repartidores necesitas ya?
                  </span>
                  <span className="text-xs text-[#ed0718] font-black">
                    {ridersCount} {ridersCount === 1 ? 'Repartidor' : 'Repartidores'} · (${(verifiedLocal.serviceFee || 35) * ridersCount} MXN)
                  </span>
                </label>

                {/* BOTONES DE 1, 2, 3, 4 REPARTIDORES */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRidersCount(num)}
                      className={`py-4 px-3 rounded-2xl font-black text-center flex flex-col items-center justify-center gap-1.5 transition border-2 ${
                        ridersCount === num
                          ? 'bg-[#ed0718] text-white border-[#ed0718] shadow-md scale-102 ring-2 ring-red-300'
                          : 'bg-gray-50 text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl leading-none font-sans font-black">
                        {num}
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-wide">
                        {num === 1 ? '1 Repartidor' : `${num} Repartidores`}
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${ridersCount === num ? 'text-amber-200' : 'text-gray-500'}`}>
                        ${(verifiedLocal.serviceFee || 35) * num} MXN
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgencia / Tiempo de llegada */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  3. Tiempo de presentación:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgencyOption('ya')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left transition border ${
                      urgencyOption === 'ya'
                        ? 'bg-red-600 text-white border-red-600 shadow-xs font-black'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] uppercase">
                      <Flame className="w-3.5 h-3.5 text-amber-300" />
                      <span>¡YA MISMO!</span>
                    </div>
                    <span className="block text-[10px] opacity-90 font-medium">
                      Pedidos listos en mostrador
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgencyOption('5_min')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left transition border ${
                      urgencyOption === '5_min'
                        ? 'bg-[#101b29] text-white border-[#101b29] shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>⏱️ En 5 minutos</span>
                    <span className="block text-[10px] opacity-75 font-normal">Empacando orden</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgencyOption('10_min')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left transition border ${
                      urgencyOption === '10_min'
                        ? 'bg-[#101b29] text-white border-[#101b29] shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>⏱️ En 10 minutos</span>
                    <span className="block text-[10px] opacity-75 font-normal">En preparación</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgencyOption('15_min')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left transition border ${
                      urgencyOption === '15_min'
                        ? 'bg-[#101b29] text-white border-[#101b29] shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>⏱️ En 15 minutos</span>
                    <span className="block text-[10px] opacity-75 font-normal">Cocinando</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgencyOption('escalonado')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left transition border col-span-2 sm:col-span-2 ${
                      urgencyOption === 'escalonado'
                        ? 'bg-[#101b29] text-white border-[#101b29] shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>📅 Llegada Escalonada</span>
                    <span className="block text-[10px] opacity-75 font-normal">
                      Ej. Uno en 5 min, otro en 10 o 15 min...
                    </span>
                  </button>
                </div>
              </div>

              {/* Observaciones (por si ocupan cambio de $500 o son varios pedidos acumulados) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    Observaciones (Opcional):
                  </span>
                  <span className="text-[11px] text-gray-400">Detalles rápidos</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Son 3 pedidos acumulados. Traer cambio de $200 para efectivo."
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#ed0718] focus:bg-white transition"
                />
              </div>

              {/* Acordeón opcional si desean poner calle específica */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowOptionalAddress(!showOptionalAddress)}
                  className="text-xs font-bold text-gray-600 hover:text-black flex items-center gap-1 transition"
                >
                  {showOptionalAddress ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{showOptionalAddress ? 'Ocultar campos de dirección' : '¿Quieres indicar un destino de entrega específico? (Opcional)'}</span>
                </button>

                {showOptionalAddress && (
                  <div className="mt-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-600">Calle:</label>
                        <input
                          type="text"
                          value={deliveryCalle}
                          onChange={(e) => setDeliveryCalle(e.target.value)}
                          placeholder="Ej. Calle Recreo"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600">Número:</label>
                        <input
                          type="text"
                          value={deliveryNumero}
                          onChange={(e) => setDeliveryNumero(e.target.value)}
                          placeholder="Ej. 12"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600">Colonia:</label>
                        <input
                          type="text"
                          value={deliveryColonia}
                          onChange={(e) => setDeliveryColonia(e.target.value)}
                          placeholder="Ej. San Antonio"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600">Teléfono Destinatario:</label>
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="Ej. 4151234567"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {submitError && (
            <div className="text-xs text-red-700 bg-red-100 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Respaldo de Intermediación Logística para Locales */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-[11px] text-gray-500 leading-tight text-center">
            RODO Moto Mandados actúa como intermediario de mensajería independiente. El empaque y preparación corresponden íntegramente al local emisor.
          </div>

          {/* Botón Principal de Generar Ticket Inmediato */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !verifiedLocal}
              className="w-full bg-[#ed0718] hover:bg-[#c90012] disabled:bg-gray-300 text-white font-black text-sm sm:text-base py-4 px-6 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generando Ticket Digital...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300" />
                  <span>
                    {verifiedLocal
                      ? `Generar Ticket Inmediato · ${ridersCount} ${
                          ridersCount === 1 ? 'Repartidor' : 'Repartidores'
                        } ($${(verifiedLocal.serviceFee || 35) * ridersCount} MXN)`
                      : 'Ingresa tu Código de 3 Dígitos para Solicitar'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
