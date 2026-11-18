import { Order, CustomerAccount } from '../types';
import { generateUniqueTicketFolio, createOrdersBatchInDb } from '../services/db';
import { saveIneAccount } from './ineScanner';

export interface Simulation200OrderData {
  index: number;
  category: 'comida' | 'express' | 'programado' | 'personalizado' | 'local_asociado';
  customerName: string;
  customerPhone: string;
  customerIne: string;
  restaurantName: string;
  pickupAddress: string;
  deliveryAddress: string;
  colonia: string;
  distanceKm: number;
  itemsSummary: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    customizations?: string[];
  }>;
  subtotal: number;
  deliveryFee: number;
  expressSurcharge?: number;
  tipPercentage: number;
  tipAmount: number;
  total: number;
  paymentMethod: 'efectivo' | 'transferencia';
  paymentStatus: 'en_efectivo' | 'verificado' | 'pendiente';
  assignedRiderId?: string;
  assignedRiderName?: string;
  status: Order['status'];
  deliveryType: 'normal' | 'express';
  scheduledTime?: string;
  isCustomQuote?: boolean;
  quoteConfirmedByCustomer?: boolean;
  quotePendingReview?: boolean;
  cancellationReason?: string;
  cancellationDebtAmount?: number;
  customerNotifiedOutside?: boolean;
  arrivalExpiresAt?: string;
  localCode?: string;
  localRequestedRidersCount?: number;
  notes: string;
  changeNeededForBill?: number;
}

// 200 PEDIDOS REALISTAS GENERADOS PARA SAN MIGUEL DE ALLENDE
export const GENERATED_200_ORDERS: Simulation200OrderData[] = (() => {
  const colonias = [
    { name: 'Centro Histórico', street: 'Calle Correo #24', dist: 1.8 },
    { name: 'Colonia San Antonio', street: 'Calle Tinajitas #8', dist: 2.4 },
    { name: 'La Aurora', street: 'Calzada de la Aurora #12', dist: 2.1 },
    { name: 'Guadalupe', street: 'Calle Héroes #45', dist: 2.7 },
    { name: 'San Rafael', street: 'Av. Ignacio Ramírez #92', dist: 2.9 },
    { name: 'San Luis Rey', street: 'Calle Ferrocarril #104', dist: 3.8 },
    { name: 'La Leona', street: 'Calle 28 de Abril #15', dist: 2.2 },
    { name: 'Valle del Maíz', street: 'Salida a Querétaro #38', dist: 3.1 },
    { name: 'Los Frailes', street: 'Paseo de los Frailes #19', dist: 5.6 },
    { name: 'Malanquín', street: 'Club de Golf Malanquín #4', dist: 6.4 },
    { name: 'Olimpo', street: 'Calle Zeus #11', dist: 3.5 },
    { name: 'Bellavista', street: 'Calle Panorama #7', dist: 4.2 },
    { name: 'Providencia', street: 'Calle Jacarandas #33', dist: 2.6 },
  ];

  const customers = [
    { name: 'Manuel Rivera Gómez', phone: '4151234501', ine: '8942105434' },
    { name: 'Sofía Alcocer Méndez', phone: '4151234502', ine: '5512349872' },
    { name: 'Eduardo Ramírez Soto', phone: '4151234503', ine: '7412896325' },
    { name: 'Mariana Trejo Baeza', phone: '4151234504', ine: '9638527410' },
    { name: 'Fernando Zavala Cruz', phone: '4151234505', ine: '1234567890' },
    { name: 'Daniela Morales Peña', phone: '4151234506', ine: '8529637411' },
    { name: 'Gabriel Pantoja Ruiz', phone: '4151234507', ine: '4561237892' },
    { name: 'Alejandra Corralejo', phone: '4151234508', ine: '7894561233' },
    { name: 'Ricardo Téllez Valle', phone: '4151234509', ine: '3216549874' },
    { name: 'Valeria Serna Barajas', phone: '4151234510', ine: '6549873215' },
    { name: 'Héctor Balderas Nieto', phone: '4151234511', ine: '9873216546' },
    { name: 'Jimena Landeros', phone: '4151234512', ine: '1472583697' },
    { name: 'Arturo Villegas Ríos', phone: '4151234513', ine: '2583691478' },
    { name: 'Paola Cervantes Tapia', phone: '4151234514', ine: '3691472589' },
    { name: 'Javier Escamilla Nava', phone: '4151234515', ine: '7418529630' },
    { name: 'Camila Montesinos', phone: '4151234516', ine: '8527419631' },
    { name: 'Rodrigo Santillán', phone: '4151234517', ine: '9637418522' },
    { name: 'Natalia Quezada', phone: '4151234518', ine: '1593574863' },
    { name: 'Esteban Palacios', phone: '4151234519', ine: '3571594864' },
    { name: 'Lorena Villalpando', phone: '4151234520', ine: '4863571595' },
    { name: 'Mauricio Cadena', phone: '4151234521', ine: '7539514866' },
    { name: 'Adriana Peñaloza', phone: '4151234522', ine: '9517534867' },
    { name: 'Álvaro Cárdenas', phone: '4151234523', ine: '1237894568' },
    { name: 'Fernanda Godínez', phone: '4151234524', ine: '4567891239' },
    { name: 'Guillermo Arreola', phone: '4151234525', ine: '7891234560' },
    { name: 'Ximena Bustamante', phone: '4151234526', ine: '3219876541' },
    { name: 'Óscar Ledesma Soto', phone: '4151234527', ine: '6543219872' },
    { name: 'Teresa Galván Luna', phone: '4151234528', ine: '9876543213' },
    { name: 'Emilio Carvajal', phone: '4151234529', ine: '1478523694' },
    { name: 'Bárbara Del Rincón', phone: '4151234530', ine: '2587413695' },
  ];

  const riders = [
    { id: 'rider-1', name: 'Moto 1 - Juan Principal' },
    { id: 'rider-2', name: 'Moto 2 - Carlos Respaldo' },
    { id: 'rider-3', name: 'Moto 3 - Repartidor Centro' },
    { id: 'rider-4', name: 'Moto 4 - Repartidor Aurora' },
    { id: 'rider-5', name: 'Moto 5 - Repartidor San Antonio' },
    { id: 'rider-6', name: 'Moto 6 - Repartidor Malanquín' },
    { id: 'rider-7', name: 'Moto 7 - Repartidor Estación' },
    { id: 'rider-8', name: 'Moto 8 - Repartidor Frailes' },
    { id: 'rider-9', name: 'Moto 9 - Guardia Nocturna' },
    { id: 'rider-10', name: 'Moto 10 - Apoyo Fin de Semana' },
  ];

  const restaurants = [
    { name: 'Burger House SMA', pickup: 'Salida a Celaya #12, San Antonio' },
    { name: 'Tacos Sebastián', pickup: 'Calle Hidalgo #45-B, Centro' },
    { name: 'Pizzería Bella Italia', pickup: 'Mesones #88, Centro Histórico' },
    { name: 'Taquería El Sanmiguelense', pickup: 'Calzada de la Aurora #20' },
    { name: 'Mariscos El Puerto SMA', pickup: 'Av. San Luis Rey #110' },
    { name: 'Café & Churros El Convento', pickup: 'Calle Jesús #14, Centro' },
  ];

  const orders: Simulation200OrderData[] = [];

  for (let i = 1; i <= 200; i++) {
    const cust = customers[(i - 1) % customers.length];
    const col = colonias[(i - 1) % colonias.length];
    const rider = riders[(i - 1) % riders.length];
    const rest = restaurants[(i - 1) % restaurants.length];

    let category: Simulation200OrderData['category'] = 'comida';
    if (i >= 106 && i <= 145) category = 'express';
    else if (i >= 146 && i <= 165) category = 'programado';
    else if (i >= 166 && i <= 180) category = 'personalizado';
    else if (i >= 181 && i <= 200) category = 'local_asociado';

    let status: Order['status'] = 'entregado';
    if (i <= 20) status = 'nuevo';
    else if (i <= 45) status = 'en_preparacion';
    else if (i <= 75) status = 'asignado';
    else if (i <= 100) status = 'en_camino';
    else if (i <= 115) status = 'afuera_del_domicilio'; // Repartidor afuera (+10 min)
    else if (i <= 175) status = 'entregado';
    else if (i <= 185) status = 'cancelado';
    else status = 'cancelado_con_deuda'; // Con adeudo al cliente

    let subtotal = 0;
    let deliveryFee = Math.round(35 + Math.max(0, col.dist - 2) * 8);
    let expressSurcharge = 0;
    let tipPercentage = (i % 5) * 5; // 0, 5, 10, 15, 20%
    let items: Simulation200OrderData['items'] = [];
    let itemsSummary = '';
    let notes = `Entrega en ${col.name}.`;
    let isCustomQuote = false;
    let quoteConfirmedByCustomer = true;
    let quotePendingReview = false;
    let localCode: string | undefined = undefined;
    let localRequestedRidersCount: number | undefined = undefined;
    let cancellationReason: string | undefined = undefined;
    let cancellationDebtAmount: number | undefined = undefined;
    let customerNotifiedOutside: boolean | undefined = undefined;
    let arrivalExpiresAt: string | undefined = undefined;
    let scheduledTime: string | undefined = undefined;
    let changeNeededForBill: number | undefined = undefined;

    if (category === 'comida') {
      const p1 = 120 + (i % 4) * 25;
      const p2 = 45 + (i % 3) * 15;
      items = [
        {
          id: `item-${i}-1`,
          name: `${rest.name} Plato Especial #${(i % 5) + 1}`,
          price: p1,
          quantity: (i % 2) + 1,
          customizations: i % 2 === 0 ? ['Extra queso (+ $20)', 'Sin cebolla'] : ['Salsa aparte'],
        },
        {
          id: `item-${i}-2`,
          name: 'Bebida Refrescante 600ml',
          price: p2,
          quantity: 1,
        },
      ];
      subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
      itemsSummary = `${items[0].quantity}x ${items[0].name}, 1x Bebida`;
      notes = 'Tocar timbre. ' + (i % 2 === 0 ? 'Paga con $500 en efectivo.' : 'Pago exacto.');
      if (i % 2 === 0) changeNeededForBill = 500;
    } else if (category === 'express') {
      expressSurcharge = 25;
      deliveryFee += expressSurcharge;
      subtotal = 65; // Tarifa base de mandado o compra rápida
      items = [
        {
          id: `exp-${i}`,
          name: 'Servicio de Mandado / Paquetería Exprés Urgente',
          price: subtotal,
          quantity: 1,
          customizations: ['Moto asignada con prioridad máxima'],
        },
      ];
      itemsSummary = `Mandado Exprés: Recoger paquete en ${col.street}`;
      notes = `MOTO URGENTE (+ $${expressSurcharge} MXN exprés). Entregar en menos de 25 min.`;
    } else if (category === 'programado') {
      subtotal = 210;
      scheduledTime = `${12 + (i % 8)}:${i % 2 === 0 ? '00' : '30'} hrs`;
      items = [
        {
          id: `sched-${i}`,
          name: 'Comida Programada para Evento / Oficina',
          price: subtotal,
          quantity: 1,
          customizations: [`Entregar en horario acordado: ${scheduledTime}`],
        },
      ];
      itemsSummary = `Pedido Programado para ${scheduledTime}`;
      notes = `⏰ ENTREGA PROGRAMADA para las ${scheduledTime}.`;
    } else if (category === 'personalizado') {
      isCustomQuote = true;
      if (i <= 170) {
        quotePendingReview = false;
        quoteConfirmedByCustomer = true;
        subtotal = 180;
        notes = 'Cotización confirmada y aceptada por el cliente.';
      } else if (i <= 175) {
        quotePendingReview = true;
        quoteConfirmedByCustomer = false;
        subtotal = 0;
        status = 'pendiente_cotizacion';
        notes = 'El cliente solicitó cotización de farmacia y abarrotes. Pendiente aprobación del administrador.';
      } else {
        quotePendingReview = false;
        quoteConfirmedByCustomer = false;
        subtotal = 140;
        status = 'cancelado';
        cancellationReason = 'El cliente rechazó la cotización ("No lo quiero").';
        notes = 'Cotización rechazada por el cliente.';
      }
      items = [
        {
          id: `custom-${i}`,
          name: 'Pedido Personalizado: Mandado especial y compras en tienda',
          price: subtotal,
          quantity: 1,
        },
      ];
      itemsSummary = 'Compras de abarrotes y encargos de farmacia';
    } else if (category === 'local_asociado') {
      const code = String(101 + (i % 4));
      localCode = code;
      localRequestedRidersCount = (i % 3) + 1;
      subtotal = 95 * localRequestedRidersCount;
      items = [
        {
          id: `local-${i}`,
          name: `Despacho para Local Aliado PIN #${code} (${localRequestedRidersCount} motos)`,
          price: subtotal,
          quantity: 1,
        },
      ];
      itemsSummary = `Solicitud de ${localRequestedRidersCount} repartidores para Local PIN #${code}`;
      notes = `🏪 Local Asociado #${code} solicitó ${localRequestedRidersCount} unidades moto.`;
    }

    if (status === 'afuera_del_domicilio') {
      customerNotifiedOutside = true;
      arrivalExpiresAt = new Date(Date.now() + 8 * 60 * 1000).toISOString(); // Le quedan 8 minutos
      notes += ' ⏱️ REPARTIDOR AFUERA DEL DOMICILIO (Cronómetro de 10 min activo).';
    }

    if (status === 'cancelado_con_deuda') {
      cancellationReason = 'Cliente no salió en el lapso de 10 minutos de tolerancia en entrega en efectivo.';
      cancellationDebtAmount = subtotal + deliveryFee;
      notes += ` ⚠️ CANCELADO POR TOLERANCIA VENCIDA. Adeudo registrado: $${cancellationDebtAmount.toFixed(2)} MXN.`;
    }

    const tipAmount = Math.round((subtotal + deliveryFee) * (tipPercentage / 100));
    const total = subtotal + deliveryFee + tipAmount;
    const paymentMethod: 'efectivo' | 'transferencia' = i % 4 === 0 ? 'transferencia' : 'efectivo';
    const paymentStatus: Simulation200OrderData['paymentStatus'] =
      paymentMethod === 'transferencia'
        ? (status === 'entregado' ? 'verificado' : 'pendiente')
        : 'en_efectivo';

    orders.push({
      index: i,
      category,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerIne: cust.ine,
      restaurantName: category === 'comida' ? rest.name : 'RODO Despacho Central',
      pickupAddress: category === 'comida' ? rest.pickup : 'Base RODO, Calzada de la Aurora #12',
      deliveryAddress: `${col.street}, Col. ${col.name}`,
      colonia: col.name,
      distanceKm: col.dist,
      itemsSummary,
      items,
      subtotal,
      deliveryFee,
      expressSurcharge: category === 'express' ? expressSurcharge : 0,
      tipPercentage,
      tipAmount,
      total,
      paymentMethod,
      paymentStatus,
      assignedRiderId: rider.id,
      assignedRiderName: rider.name,
      status,
      deliveryType: category === 'express' ? 'express' : 'normal',
      scheduledTime,
      isCustomQuote,
      quoteConfirmedByCustomer,
      quotePendingReview,
      cancellationReason,
      cancellationDebtAmount,
      customerNotifiedOutside,
      arrivalExpiresAt,
      localCode,
      localRequestedRidersCount,
      notes,
      changeNeededForBill,
    });
  }

  return orders;
})();

export interface Simulation200Metrics {
  totalOrders: number;
  totalVolume: number;
  totalCash: number;
  totalTransfer: number;
  totalRodoDeliveryIncome: number;
  totalRestaurantSubtotal: number;
  totalRestaurantCommission: number;
  totalTipsToRiders: number;
  totalDebtsUnpaid: number;
  countByStatus: Record<string, number>;
  countByCategory: Record<string, number>;
  countByRider: Record<string, number>;
}

export function computeSimulation200Metrics(orders: Simulation200OrderData[] = GENERATED_200_ORDERS): Simulation200Metrics {
  let totalVolume = 0;
  let totalCash = 0;
  let totalTransfer = 0;
  let totalRodoDeliveryIncome = 0;
  let totalRestaurantSubtotal = 0;
  let totalTipsToRiders = 0;
  let totalDebtsUnpaid = 0;

  const countByStatus: Record<string, number> = {};
  const countByCategory: Record<string, number> = {};
  const countByRider: Record<string, number> = {};

  orders.forEach((o) => {
    totalVolume += o.total;
    if (o.paymentMethod === 'efectivo') totalCash += o.total;
    else totalTransfer += o.total;

    totalRodoDeliveryIncome += o.deliveryFee;
    totalRestaurantSubtotal += o.subtotal;
    totalTipsToRiders += o.tipAmount;

    if (o.cancellationDebtAmount) {
      totalDebtsUnpaid += o.cancellationDebtAmount;
    }

    countByStatus[o.status] = (countByStatus[o.status] || 0) + 1;
    countByCategory[o.category] = (countByCategory[o.category] || 0) + 1;
    if (o.assignedRiderName) {
      countByRider[o.assignedRiderName] = (countByRider[o.assignedRiderName] || 0) + 1;
    }
  });

  return {
    totalOrders: orders.length,
    totalVolume,
    totalCash,
    totalTransfer,
    totalRodoDeliveryIncome,
    totalRestaurantSubtotal,
    totalRestaurantCommission: totalRestaurantSubtotal * 0.15,
    totalTipsToRiders,
    totalDebtsUnpaid,
    countByStatus,
    countByCategory,
    countByRider,
  };
}

/**
 * Inyecta los 200 pedidos simulados en la base de datos (localStorage y Firestore)
 * También registra las cuentas de clientes con sus 10 dígitos de INE y adeudos para pruebas antifraude.
 */
export async function inject200SimulationOrders(): Promise<{
  insertedCount: number;
  metrics: Simulation200Metrics;
}> {
  const convertedOrders: Order[] = GENERATED_200_ORDERS.map((sim) => {
    const orderId = `sim200-${String(sim.index).padStart(3, '0')}-${Date.now().toString(36)}`;
    const folio = `RD-SIM-${String(sim.index).padStart(3, '0')}`;

    // Si tiene adeudo, registrar en la lista negra antifraude de INE
    if (sim.cancellationDebtAmount && sim.cancellationDebtAmount > 0) {
      const debtAccount: CustomerAccount = {
        id: `cust-sim-${sim.index}`,
        name: sim.customerName,
        phone: sim.customerPhone,
        email: `cliente${sim.index}@rodo-sma.mx`,
        ineVerified: true,
        ineDigits: sim.customerIne,
        ine10Digits: sim.customerIne,
        inePhotoUploaded: true,
        pendingDebt: sim.cancellationDebtAmount,
        debtReason: sim.cancellationReason || 'Cancelación por tolerancia de 10 min vencida en entrega en efectivo.',
        debtOrderFolio: folio,
        debtDate: 'Hoy',
        status: 'bloqueado_fraude',
        completedOrdersCount: 0,
      };
      saveIneAccount(debtAccount);
    } else {
      // Cuenta limpia
      const cleanAccount: CustomerAccount = {
        id: `cust-sim-${sim.index}`,
        name: sim.customerName,
        phone: sim.customerPhone,
        email: `cliente${sim.index}@rodo-sma.mx`,
        ineVerified: true,
        ineDigits: sim.customerIne,
        ine10Digits: sim.customerIne,
        inePhotoUploaded: true,
        pendingDebt: 0,
        status: 'activo',
        completedOrdersCount: (sim.index % 5) + 1,
      };
      saveIneAccount(cleanAccount);
    }

    const orderData: Order = {
      id: orderId,
      folio: folio,
      orderType:
        sim.category === 'comida'
          ? 'comida'
          : sim.category === 'personalizado'
          ? 'pedido_personalizado'
          : sim.category === 'local_asociado'
          ? 'solicitud_local'
          : 'envio',
      customerId: `cust-sim-${sim.index}`,
      customerName: sim.customerName,
      customerPhone: sim.customerPhone,
      restaurantId: sim.category === 'comida' ? 'rest-sim' : 'rodo-central',
      restaurantName: sim.restaurantName,
      restaurantDeliveryFee: sim.deliveryFee,
      restaurantCommissionRate: 15,
      items: sim.items,
      subtotal: sim.subtotal,
      deliveryFee: sim.deliveryFee,
      commissionAmount: sim.subtotal * 0.15,
      deliveryType: sim.deliveryType,
      tipPercentage: sim.tipPercentage,
      tipAmount: sim.tipAmount,
      total: sim.total,
      paymentMethod: sim.paymentMethod,
      paymentStatus: sim.paymentStatus,
      deliveryAddress: sim.deliveryAddress,
      assignedRiderName: sim.assignedRiderName,
      assignedRiderPhone: '524151019920',
      assignedRidersList: sim.assignedRiderName ? [sim.assignedRiderName] : undefined,
      status: sim.status,
      customerNotifiedOutside: sim.customerNotifiedOutside,
      arrivalNotifiedAt: sim.customerNotifiedOutside ? new Date(Date.now() - 2 * 60 * 1000).toISOString() : undefined,
      arrivalExpiresAt: sim.arrivalExpiresAt,
      cancellationReason: sim.cancellationReason,
      cancellationDebtAmount: sim.cancellationDebtAmount,
      isCustomQuote: sim.isCustomQuote,
      customOrderText: sim.isCustomQuote ? sim.notes : undefined,
      quoteConfirmedByCustomer: sim.quoteConfirmedByCustomer,
      localCode: sim.localCode,
      ridersRequestedCount: sim.localRequestedRidersCount,
      scheduledDeliveryTime: sim.scheduledTime,
      createdAt: new Date(Date.now() - (201 - sim.index) * 120000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return orderData;
  });

  // Batch insert
  await createOrdersBatchInDb(convertedOrders);
  const metrics = computeSimulation200Metrics(GENERATED_200_ORDERS);

  return {
    insertedCount: convertedOrders.length,
    metrics,
  };
}
