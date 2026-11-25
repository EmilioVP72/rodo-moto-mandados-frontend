import type { Order, Restaurant } from '../types';
import { DEFAULT_RESTAURANTS } from '../data/seeds.ts';

const LOCAL_STORAGE_RESTAURANTS = 'rodo_restaurants_cache';

function getStoredRestaurantsSnapshot(): Restaurant[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESTAURANTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return DEFAULT_RESTAURANTS;
}

export function paymentInstructionForRider(order: Pick<Order, 'paymentMethod' | 'paymentStatus' | 'total' | 'orderType'>): string {
  if (order.paymentMethod === 'transferencia') {
    return order.paymentStatus === 'verificado' ? 'TRANSFERENCIA VERIFICADA · NO COBRAR AL CLIENTE'
      : 'TRANSFERENCIA PENDIENTE · Espera la confirmación de despacho antes de entregar.';
  }
  return order.orderType === 'solicitud_local' ? `Cobrar al restaurante: $${order.total.toFixed(2)} MXN`
    : `COBRAR EN EFECTIVO AL ENTREGAR: $${order.total.toFixed(2)} MXN`;
}

export function buildWhatsAppDispatchMessage(
  order: Order,
  riderName: string,
  appUrl: string = window.location.origin,
  riderToken?: string
): string {
  const effectiveToken = riderToken ?? order.riderDispatchToken;
  const ticketUrl = effectiveToken
    ? `${appUrl}?ticket=${encodeURIComponent(order.folio)}&riderToken=${encodeURIComponent(effectiveToken)}`
    : `${appUrl}?ticket=${encodeURIComponent(order.folio)}`;

  if (order.orderType === 'solicitud_local') {
    const riderCount = order.ridersRequestedCount || 1;
    const urgency = order.urgencyTiming || 'Inmediato (Ya)';
    const mapsLink =
      order.mapsUrl ||
      (order.coordinates
        ? `https://maps.google.com/?q=${order.coordinates.lat},${order.coordinates.lng}`
        : '');
    const feeText =
      order.deliveryFee > 0 ? `$${order.deliveryFee.toFixed(2)} MXN` : 'Tarifa estándar';

    return `🚨 *RODO MOTO MANDADOS · SOLICITUD DE LOCAL* 🏍️💨
━━━━━━━━━━━━━━━━━━━━
📌 *FOLIO:* ${order.folio}
👤 *Repartidor Asignado:* ${riderName}
🏪 *RESTAURANTE / RECOGER EN:* ${order.restaurantName} (Código: ${order.localCode || 'N/A'})
📍 *Dirección Restaurante:* ${order.pickupAddress || 'Ver datos de local'}
📞 *Teléfono Restaurante:* ${order.pickupPhone || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
📍 *LUGAR DE ENTREGA AL CLIENTE:*
${order.deliveryAddress || 'Dirección especificada por el local'}
${mapsLink ? `🗺️ *Ubicación GPS (Entrega):* ${mapsLink}\n` : ''}📞 *Teléfono Cliente / Destino:* ${order.customerPhone || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
🏍️ *REPARTIDORES SOLICITADOS:* ${riderCount} ${riderCount === 1 ? 'Repartidor' : 'Repartidores'}
⏱️ *TIEMPO / URGENCIA:* ${urgency}
💵 *TARIFA A COBRAR AL RESTAURANTE:* ${feeText} ${riderCount > 1 ? `(Total: $${order.total.toFixed(2)} MXN)` : ''}
${order.deliveryNotes ? `\n📝 *OBSERVACIONES / PEDIDOS:*\n${order.deliveryNotes}\n` : ''}━━━━━━━━━━━━━━━━━━━━
🎫 *TICKET DIGITAL:*
${ticketUrl}

_RODO Moto Mandados · Despacho Central San Miguel_`;
  }

  if (order.orderType === 'auxilio_gasolina' && order.fuelDetails) {
    return `⛽ *RODO MOTO MANDADOS · AUXILIO GASOLINA DE EMERGENCIA* 🏍️💨
━━━━━━━━━━━━━━━━━━━━
📌 *FOLIO:* ${order.folio}
👤 *Repartidor:* ${riderName}
🚨 *SERVICIO DE COMBUSTIBLE EN RUTA*
━━━━━━━━━━━━━━━━━━━━
📍 *UBICACIÓN DONDE SE ENCUENTRA VARADO:*
${order.deliveryAddress}
${order.deliveryNotes ? `📝 *Referencias / Vehículo:* ${order.deliveryNotes}\n` : ''}📞 *Teléfono del Cliente:* ${order.customerPhone}
━━━━━━━━━━━━━━━━━━━━
⛽ *DETALLES DEL COMBUSTIBLE:*
• *Litros:* ${order.fuelDetails.liters} Litro(s) en Garrafa Homologada
• *Tipo:* Gasolina ${order.fuelDetails.fuelType.toUpperCase()}
• *Costo Gasolina:* $${order.fuelDetails.fuelTotal.toFixed(2)} MXN
🏍️ *Tarifa de Viaje Auxilio:* $${order.fuelDetails.serviceTravelFee.toFixed(2)} MXN
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL A LIQUIDAR:* $${order.total.toFixed(2)} MXN
${paymentInstructionForRider(order)}

🎫 *TICKET DIGITAL EN VIVO:*
${ticketUrl}

_RODO Moto Mandados · Auxilio Vial Rápido_`;
  }

  const itemsList = order.items
    .map(
      (it) =>
        `• ${it.quantity}x ${it.name} ($${(it.price * it.quantity).toFixed(2)})${it.isExtra ? ' *(Extra)*' : ''}`
    )
    .join('\n');

  const deliveryTypeLabel =
    order.deliveryType === 'express'
      ? `⚡ Entrega Exprés (+ $${order.deliveryTypeSurcharge || 25} MXN)`
      : order.deliveryType === 'programada'
      ? `🕒 Entrega Programada (${order.scheduledDeliveryTime || 'Programado'})`
      : `🛵 Entrega Normal`;

  const storedRestaurants = getStoredRestaurantsSnapshot();
  const matchedRestaurant = storedRestaurants.find(
    (r) =>
      r.id === order.restaurantId || r.name.toLowerCase() === order.restaurantName.toLowerCase()
  );
  const restGpsLink =
    matchedRestaurant?.mapsUrl ||
    (matchedRestaurant?.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${matchedRestaurant.coordinates.lat},${matchedRestaurant.coordinates.lng}`
      : '');
  const restAddressText = matchedRestaurant?.address
    ? `Calle ${matchedRestaurant.address.calle} #${matchedRestaurant.address.numero}, Col. ${matchedRestaurant.address.colonia}`
    : '';

  const routeSummaryText = order.routePathSummary
    ? `🗺️ *Ruta & Distancia:* ${order.routePathSummary}\n`
    : order.distanceKm
    ? `🗺️ *Distancia:* ${order.distanceKm} km (~${order.routeEstimateMinutes || 15} min en moto)\n`
    : '';

  return `🏍️ *RODO MOTO MANDADOS · DESPACHO DE ORDEN*
━━━━━━━━━━━━━━━━━━
📌 *FOLIO:* ${order.folio}
👤 *Repartidor:* ${riderName}
🏪 *RECOGER EN:* ${order.restaurantName}
${restAddressText ? `📍 *Dirección del Local:* ${restAddressText}\n` : ''}${restGpsLink ? `🗺️ *GPS del Local para el Repartidor:* ${restGpsLink}\n` : ''}📍 *ENTREGAR EN:* ${order.deliveryAddress}
${routeSummaryText}📞 *Teléfono Cliente:* ${order.customerPhone || 'No especificado'}
${order.deliveryNotes ? `📝 *Notas de entrega:* ${order.deliveryNotes}\n` : ''}
🛒 *PRODUCTOS:*
${itemsList}
━━━━━━━━━━━━━━━━━━
💰 *Artículos:* $${order.subtotal.toFixed(2)} MXN
🏍️ *Envío (${deliveryTypeLabel}):* $${order.deliveryFee.toFixed(2)} MXN
💲 *TOTAL ORDEN:* $${order.total.toFixed(2)} MXN

${paymentInstructionForRider(order)}

🎫 *TICKET DIGITAL EN VIVO:*
${ticketUrl}

_RODO Moto Mandados · Despacho Central_`;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  // Usar api.whatsapp.com/send evita el bug de redirección de wa.me que corrompe emojis UTF-8 de 4 bytes ()
  if (!cleanPhone) {
    return `https://api.whatsapp.com/send/?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedText}`;
}
