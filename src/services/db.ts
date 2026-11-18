import { apiFetch } from '../api/httpClient';
import { onSocketEvent } from '../api/socketClient';
import {
  Restaurant,
  Order,
  DispatchSettings,
  PartnerLocal,
  SpecialtyCategory,
  AdminAuditLogEntry,
  BroadcastNotification,
  AccountRecoveryRequest,
} from '../types';
import { getStoredIneAccounts, saveIneAccount } from '../utils/ineScanner';
import {
  syncRestaurantsToIDB,
  getRestaurantsFromIDB,
  syncOrdersToIDB,
  upsertOrderToIDB,
  getOrdersFromIDB,
  saveBroadcastToIDB,
  getBroadcastsFromIDB,
} from './indexedDb';

const RESTAURANTS_COL = 'restaurants';
const ORDERS_COL = 'orders';
const SETTINGS_COL = 'settings';
const PARTNER_LOCALS_COL = 'partner_locals';
const ADMIN_AUDIT_LOGS_COL = 'admin_audit_logs';
const BROADCAST_NOTIFS_COL = 'broadcast_notifications';
const ACCOUNT_RECOVERY_COL = 'account_recovery_requests';
const LOCAL_STORAGE_ORDERS = 'rodo_local_orders';
const LOCAL_STORAGE_PARTNER_LOCALS = 'rodo_partner_locals';
const LOCAL_STORAGE_BROADCASTS = 'rodo_broadcast_notifications';
const LOCAL_STORAGE_RECOVERY = 'rodo_account_recovery_requests';

export const DEFAULT_PARTNER_LOCALS: PartnerLocal[] = [
  {
    id: 'loc-101',
    code: '101',
    name: 'Tacos Sebastián',
    phone: '4151234567',
    serviceFee: 35, // Tarifa acordada por reparto RODO
    address: {
      calle: 'Calle Hidalgo',
      numero: '45-B',
      colonia: 'Centro',
      referencias: 'Frente a la plazuela, puerta de madera grande',
      lat: 20.9144,
      lng: -100.7437,
      mapsUrl: 'https://maps.google.com/?q=20.9144,-100.7437',
    },
    contactPerson: 'Don Sebastián Cruz',
    notes: 'Preparación de 10 a 15 min. Sacar primero órdenes de bistec.',
    isActive: true,
  },
  {
    id: 'loc-102',
    code: '102',
    name: 'Little Caesars Pizza',
    phone: '4159876543',
    serviceFee: 40, // Tarifa de envío RODO
    address: {
      calle: 'Calzada de la Aurora',
      numero: '12',
      colonia: 'La Aurora',
      referencias: 'Junto a la gasolinera',
      lat: 20.9205,
      lng: -100.7380,
      mapsUrl: 'https://maps.google.com/?q=20.9205,-100.7380',
    },
    contactPerson: 'Gerente en Turno',
    notes: 'Entregar ticket en mostrador de salida rápida.',
    isActive: true,
  },
  {
    id: 'loc-103',
    code: '103',
    name: 'Tacos Don Santos',
    phone: '4151122334',
    serviceFee: 40,
    address: {
      calle: 'Calzada de la Estación',
      numero: '28',
      colonia: 'San Antonio',
      referencias: 'Cerca del puente, puesto tradicional',
      lat: 20.9112,
      lng: -100.7511,
      mapsUrl: 'https://maps.google.com/?q=20.9112,-100.7511',
    },
    contactPerson: 'Don Santos',
    notes: 'Tacos calientes empacados en aluminio para viaje.',
    isActive: true,
  },
  {
    id: 'loc-104',
    code: '104',
    name: 'Comida China Mesones',
    phone: '4151526789',
    serviceFee: 40,
    address: {
      calle: 'Calle Mesones',
      numero: '38',
      colonia: 'Centro',
      referencias: 'Entre Relox e Hidalgo',
      lat: 20.9158,
      lng: -100.7442,
      mapsUrl: 'https://maps.google.com/?q=20.9158,-100.7442',
    },
    contactPerson: 'Encargado de Mostrador',
    notes: 'Platillos en charola sellada con guisados seleccionados.',
    isActive: true,
  },
  {
    id: 'loc-105',
    code: '105',
    name: 'Ferechiken Las Alamedas',
    phone: '4151019920',
    serviceFee: 40,
    address: {
      calle: 'Avenida Central',
      numero: '96',
      colonia: 'Santa Cruz de La Paz',
      referencias: 'Frente a Las Alamedas',
      lat: 20.9023,
      lng: -100.7634,
      mapsUrl: 'https://maps.google.com/?q=20.9023,-100.7634',
    },
    contactPerson: 'Ferechiken Encargado',
    notes: 'Llevar salsas, tortillas y complementos bien empacados.',
    isActive: true,
  },
];

export const INITIAL_SPECIALTIES: SpecialtyCategory[] = [
  { id: 'sp-super', name: 'Súper', iconType: 'super', active: true, order: 1, description: 'Despensa, abarrotes y artículos para el hogar' },
  { id: 'sp-pizza', name: 'Pizza', iconType: 'pizza', active: true, order: 2, description: 'Rebanadas, familiares y estilo artesanal' },
  { id: 'sp-desayuno', name: 'Desayuno', iconType: 'desayuno', active: true, order: 3, description: 'Hotcakes, chilaquiles, café y jugos' },
  { id: 'sp-pollo', name: 'Pollo', iconType: 'pollo', active: true, order: 4, description: 'Rostizado, frito crujiente y alitas' },
  { id: 'sp-hamburguesa', name: 'Hamburguesa', iconType: 'hamburguesa', active: true, order: 5, description: 'Al carbón, smash y con queso gratinado' },
  { id: 'sp-tacos', name: 'Tacos', iconType: 'tacos', active: true, order: 6, description: 'Pastor, bistec, suadero y tripa dorada' },
  { id: 'sp-mariscos', name: 'Mariscos', iconType: 'mariscos', active: true, order: 7, description: 'Cocteles, ceviches y camarones al gusto' },
  { id: 'sp-pan', name: 'Pan', iconType: 'pan', active: true, order: 8, description: 'Bolillos, conchas y panadería tradicional' },
  { id: 'sp-tienda', name: 'Tienda', iconType: 'tienda', active: true, order: 9, description: 'Botanas, refrescos, lácteos y miscelánea' },
  { id: 'sp-farmacia', name: 'Farmacia', iconType: 'farmacia', active: true, order: 10, description: 'Medicamentos, analgésicos y botiquín' },
  { id: 'sp-flores', name: 'Flores', iconType: 'flores', active: true, order: 11, description: 'Ramos, arreglos florales y detalles' },
];

export const INITIAL_SETTINGS: DispatchSettings = {
  defaultRider1Name: 'Central Despacho RODO',
  defaultRider1Phone: '524151019920', // Número de soporte obligatorio: 415-101-9920
  defaultRider2Name: 'Repartidor de Guardia',
  defaultRider2Phone: '524151019920',
  ridersList: [
    { id: 'rider-1', name: 'Moto 1 - Juan Principal', phone: '524151019920', isActive: true },
    { id: 'rider-2', name: 'Moto 2 - Carlos Respaldo', phone: '524151019920', isActive: true },
    { id: 'rider-3', name: 'Moto 3 - Repartidor Centro', phone: '524151019920', isActive: true },
    { id: 'rider-4', name: 'Moto 4 - Repartidor Aurora', phone: '524151019920', isActive: true },
    { id: 'rider-5', name: 'Moto 5 - Repartidor San Antonio', phone: '524151019920', isActive: true },
    { id: 'rider-6', name: 'Moto 6 - Repartidor Malanquín', phone: '524151019920', isActive: false },
    { id: 'rider-7', name: 'Moto 7 - Repartidor Estación', phone: '524151019920', isActive: false },
    { id: 'rider-8', name: 'Moto 8 - Repartidor Frailes', phone: '524151019920', isActive: false },
    { id: 'rider-9', name: 'Moto 9 - Guardia Nocturna', phone: '524151019920', isActive: false },
    { id: 'rider-10', name: 'Moto 10 - Apoyo Fin de Semana', phone: '524151019920', isActive: false },
  ],
  clabeRodo: '012180015678901234',
  bancoRodo: 'BBVA Bancomer',
  titularRodo: 'RODO Moto Mandados Oficial',
  adminPasscode: 'RODO2026',
  supportPhone: '415-101-9920',
  expressDeliverySurcharge: 25, // $25 MXN extra por entrega exprés urgente
  expressDeliveryEnabled: true,
  scheduledDeliveryEnabled: true,
  magnaPricePerLiter: 24.50, // Precio base de gasolina Magna por litro
  premiumPricePerLiter: 26.80, // Precio base de gasolina Premium por litro

  // Modo Días Festivos / Eventos en San Miguel de Allende
  festiveModeEnabled: false,
  festiveModeMessage: '🎆 Fechas Festivas / Alta Demanda: Por desfiles, fiestas tradicionales o eventos en el Centro de San Miguel, los repartidores pueden experimentar demoras en tránsito.',
  festiveEstimatedDelay: '+15 a 25 min',

  // Pausa Temporal por Lluvia en San Miguel de Allende
  rainPauseEnabled: false,
  rainPauseMessage: '🌧️ Envíos pausados temporalmente por lluvia en San Miguel de Allende. Reanudaremos el servicio en cuanto mejore el clima para cuidar la seguridad de nuestros repartidores y tus alimentos.',

  // Catálogo de Especialidades tipo Uber Eats configurables por Administrador
  specialtiesCatalog: INITIAL_SPECIALTIES,

  // Tarifas de Despacho y Sobreprecio (Markup) administradas por Edson
  baseDeliveryTariff: 35, // Tarifa base de envío RODO ($35 MXN)
  tariffPerKm: 7, // $7 MXN por kilómetro recorrido en San Miguel
  globalMarkupPercent: 10, // 10% de sobreprecio sobre costo de alimentos
  globalMarkupFixed: 0,
  autoRoutingEnabled: true,

  // Temáticas Festivas y de Temporada (Navidad, Año Nuevo, 14 Feb, Día de las Madres, Día del Padre, Día del Grito, RODO Clásico)
  activeHolidayTheme: 'clasico_rodo',

  // Zonas de Cobertura en San Miguel de Allende con georreferenciación exacta
  coverageZones: [
    { id: 'zn-centro', name: 'Centro Histórico & El Chorro', active: true, radiusKm: 2.0, referenceStreet: 'Jardín Principal / Calle Correo', centerLat: 20.9144, centerLng: -100.7437 },
    { id: 'zn-san-antonio', name: 'Colonia San Antonio & La Estación', active: true, radiusKm: 2.5, referenceStreet: 'Calle Ancha de San Antonio', centerLat: 20.9070, centerLng: -100.7510 },
    { id: 'zn-san-luis-rey', name: 'Colonia San Luis Rey & Ferrocarril', active: true, radiusKm: 2.8, referenceStreet: 'Avenida San Luis Rey / Libramiento', centerLat: 20.9230, centerLng: -100.7620 },
    { id: 'zn-la-aurora', name: 'La Aurora & Guadalupe', active: true, radiusKm: 2.5, referenceStreet: 'Calzada de la Aurora', centerLat: 20.9205, centerLng: -100.7380 },
    { id: 'zn-san-rafael', name: 'San Rafael & Olimpo', active: true, radiusKm: 2.6, referenceStreet: 'Avenida Ignacio Ramírez', centerLat: 20.9160, centerLng: -100.7550 },
    { id: 'zn-valle-maiz', name: 'Valle del Maíz & El Caracol', active: true, radiusKm: 2.4, referenceStreet: 'Calle Salida a Querétaro', centerLat: 20.9090, centerLng: -100.7330 },
    { id: 'zn-malanquin', name: 'Infonavit Malanquín & Paseo Real', active: true, radiusKm: 3.2, referenceStreet: 'Calzada Malanquín', centerLat: 20.8990, centerLng: -100.7560 },
    { id: 'zn-lejona', name: 'La Lejona & Fraccionamiento La Luz', active: true, radiusKm: 3.5, referenceStreet: 'Boulevard de la Conspiración', centerLat: 20.8930, centerLng: -100.7600 },
    { id: 'zn-frailes', name: 'Los Frailes & Presa Allende', active: true, radiusKm: 4.5, referenceStreet: 'Avenida Los Frailes', centerLat: 20.8850, centerLng: -100.7680 },
    { id: 'zn-independencia', name: 'Independencia & Santa Julia', active: true, radiusKm: 3.0, referenceStreet: 'Calzada de la Estación norte', centerLat: 20.9210, centerLng: -100.7500 },
    { id: 'zn-ventanas', name: 'Ventanas Golf & Salida a Dolores', active: true, radiusKm: 5.0, referenceStreet: 'Carretera a Dolores Hidalgo', centerLat: 20.9350, centerLng: -100.7550 },
  ],
};

// Opciones de guisados para Comida China Mesones
const GUISADOS_COMIDA_CHINA = [
  'Alitas estilo oriental',
  'Pollo a la plancha',
  'Camarones',
  'Pescado empanizado',
  'Res con brócoli',
  'Pollo con brócoli',
  'Pollo agridulce',
];

const GUARNICIONES_COMIDA_CHINA = [
  'Arroz Frito Especial',
  'Espagueti Chow Mein',
  'Mitad Arroz y Mitad Espagueti',
];

// Catálogo base depurado: Únicamente locales y restaurantes reales con precios base y sobreprecio RODO
export const DEFAULT_RESTAURANTS: Restaurant[] = [
  {
    id: 'tacos-sebas',
    name: 'Tacos Sebastián',
    establishmentType: 'restaurante',
    category: 'Tacos al Carbón',
    rating: '4.9',
    reviews: '280',
    time: '20–35 min',
    deliveryFee: 35,
    commissionRate: 15,
    acceptsTransfer: true,
    acceptsCash: true,
    bankDetails: 'CLABE 012180012345678901 · BBVA · Tacos Sebastián S.A.',
    image: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=900&q=85',
    tags: ['Tacos', 'Quesadillas', 'Especialidades'],
    badge: 'Local Asociado',
    description: 'Restaurante asociado oficial. Especialidades al carbón, bistec y pastor con facturación disponible.',
    isActive: true,
    isOpen: true,
    schedule: '1:00 PM – 11:30 PM',
    menu: [
      {
        id: 'ts-1',
        name: 'Orden de 4 Tacos de Bistec',
        description: 'Con cebolla, cilantro y tortilla doble hecha al momento',
        originalPrice: 85,
        surcharge: 15,
        price: 100,
        category: 'Tacos',
        isAvailable: true,
        customizations: [
          { id: 'ts-rem-cebolla', name: 'Sin cebolla', price: 0, type: 'removal' },
          { id: 'ts-rem-cilantro', name: 'Sin cilantro', price: 0, type: 'removal' },
          { id: 'ts-rem-salsa', name: 'Sin salsa ni chile', price: 0, type: 'removal' },
          { id: 'ts-ext-queso', name: 'Extra queso fundido', price: 15, type: 'extra' },
          { id: 'ts-ext-bistec', name: 'Extra porción de bistec', price: 25, type: 'extra' },
        ],
      },
      {
        id: 'ts-2',
        name: 'Gringa de Pastor con Queso',
        description: 'En tortilla de harina grande con piña asada y queso gouda',
        originalPrice: 55,
        surcharge: 15,
        price: 70,
        category: 'Especialidades',
        isAvailable: true,
      },
      {
        id: 'ts-3',
        name: 'Quesadilla con Carne al gusto',
        description: 'Tortilla de maíz o harina con queso fundido y carne a elegir',
        originalPrice: 40,
        surcharge: 10,
        price: 50,
        category: 'Antojitos',
        isAvailable: true,
      },
      {
        id: 'ts-4',
        name: 'Refresco 600ml',
        description: 'Coca-Cola, Jarrito, Sidral Mundet o Agua Mineral',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Bebidas',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'little-caesars',
    name: 'Little Caesars Pizza',
    establishmentType: 'restaurante',
    category: 'Pizzas',
    rating: '4.8',
    reviews: '1.4k',
    time: '25–35 min',
    deliveryFee: 40,
    commissionRate: 15,
    acceptsTransfer: true,
    acceptsCash: true,
    bankDetails: 'CLABE 014180099887766554 · Santander · Franquicia Pizza S.A.',
    image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85',
    tags: ['Pizza', 'Pepperoni', 'Clásicas', 'Especialidades'],
    badge: 'Local Asociado',
    description: 'Pizzas calientes recién horneadas listas para compartir. Facturación disponible. Envío garantizado.',
    isActive: true,
    isOpen: true,
    schedule: '11:00 AM – 10:00 PM',
    menu: [
      {
        id: 'lc-1',
        name: 'Pizza Clásica de Queso Grande',
        description: 'Masa crujiente horneada con salsa de tomate especial y queso 100% mozzarella',
        originalPrice: 89,
        surcharge: 13,
        price: 102,
        category: 'Pizzas Clásicas',
        isAvailable: true,
      },
      {
        id: 'lc-2',
        name: 'Pizza Clásica de Pepperoni Grande',
        description: 'La favorita clásica con abundante pepperoni crujiente de orilla a orilla',
        originalPrice: 99,
        surcharge: 15,
        price: 114,
        category: 'Pizzas Clásicas',
        isAvailable: true,
      },
      {
        id: 'lc-3',
        name: 'Pizza Mitad Pepperoni / Mitad Queso',
        description: 'Lo mejor de dos mundos en una sola pizza grande',
        originalPrice: 119,
        surcharge: 18,
        price: 137,
        category: 'Pizzas Clásicas',
        isAvailable: true,
      },
      {
        id: 'lc-4',
        name: 'Pizza Deep! Deep! Dish!',
        description: 'Pizza de molde rectangular al estilo Detroit con corteza dorada y crujiente',
        originalPrice: 169,
        surcharge: 25,
        price: 194,
        category: 'Pizzas de Especialidad',
        isAvailable: true,
      },
      {
        id: 'lc-5',
        name: 'Pizza Especialidad Veggie',
        description: 'Champiñones frescos, pimientos verdes, cebolla, aceitunas negras y queso',
        originalPrice: 169,
        surcharge: 25,
        price: 194,
        category: 'Pizzas de Especialidad',
        isAvailable: true,
      },
      {
        id: 'lc-6',
        name: 'Pizza Ultimate Supreme',
        description: 'Pepperoni, salchicha italiana, champiñones frescos, cebolla y pimientos',
        originalPrice: 189,
        surcharge: 28,
        price: 217,
        category: 'Pizzas de Especialidad',
        isAvailable: true,
      },
      {
        id: 'lc-7',
        name: 'Pizza 3 Meat Treat',
        description: 'Trío de carnes: abundante pepperoni, salchicha italiana y trozos de tocino crujiente',
        originalPrice: 189,
        surcharge: 28,
        price: 217,
        category: 'Pizzas de Especialidad',
        isAvailable: true,
      },
      {
        id: 'lc-8',
        name: 'Pizza Hula Hawaiian',
        description: 'Jamón tierno y piña dulce sobre salsa de tomate y queso derretido',
        originalPrice: 169,
        surcharge: 25,
        price: 194,
        category: 'Pizzas de Especialidad',
        isAvailable: true,
      },
      {
        id: 'lc-9',
        name: 'Crazy Bread con Crazy Sauce',
        description: '8 palitos de pan horneados cubiertos de mantequilla de ajo y parmesano con salsa de tomate',
        originalPrice: 49,
        surcharge: 7,
        price: 56,
        category: 'Acompañamientos',
        isAvailable: true,
      },
      {
        id: 'lc-10',
        name: 'Crazy Sauce Extra',
        description: 'Vaso de salsa dip de tomate sazonada con hierbas italianas',
        originalPrice: 20,
        surcharge: 3,
        price: 23,
        category: 'Acompañamientos',
        isAvailable: true,
      },
      {
        id: 'lc-11',
        name: 'Refresco 600ml bien frío',
        description: 'Coca-Cola, Sprite, Fanta o Fresca bien fría',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Bebidas',
        isAvailable: true,
      },
      {
        id: 'lc-12',
        name: 'Refresco Familiar 2 Litros',
        description: 'Coca-Cola Original o Sin Azúcar para compartir',
        originalPrice: 40,
        surcharge: 8,
        price: 48,
        category: 'Bebidas',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'tacos-don-santos',
    name: 'Tacos Don Santos',
    establishmentType: 'motomandado',
    category: 'Taquería Tradicional',
    rating: '4.9',
    reviews: '410',
    time: '15–30 min',
    deliveryFee: 40,
    commissionRate: 20,
    acceptsTransfer: false, // No factura -> Pago solo en efectivo
    acceptsCash: true,
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=85',
    tags: ['Tacos', 'Tripa', 'Bistec', 'Lengua', 'Solo Efectivo'],
    badge: 'Local Asociado',
    description: 'Taquería tradicional Don Santos. Tacos al momento con tortillas calientitas, cebolla guisada, cilantro y variedad de salsas caseras. Solo pago en efectivo.',
    isActive: true,
    isOpen: true,
    schedule: '6:00 PM – 1:00 AM',
    menu: [
      {
        id: 'tds-1',
        name: 'Taco de Bistec',
        description: 'Bistec suave a la plancha con cebolla y cilantro en tortilla con copia',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Tacos',
        isAvailable: true,
      },
      {
        id: 'tds-2',
        name: 'Taco de Tripa (Normal o Bien Dorada)',
        description: 'Tripa fresca sazonada, suave o crujiente bien dorada',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Tacos',
        isAvailable: true,
      },
      {
        id: 'tds-3',
        name: 'Taco de Lengua',
        description: 'Lengua de res tierna y jugosa cocinada al vapor',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Tacos',
        isAvailable: true,
      },
      {
        id: 'tds-4',
        name: 'Taco de Cabeza',
        description: 'Carne de cabeza de res seleccionada con gran sabor',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Tacos',
        isAvailable: true,
      },
      {
        id: 'tds-5',
        name: 'Taco de Suadero / Tripas',
        description: 'Suadero confitado suave con opción de tripitas',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Tacos',
        isAvailable: true,
      },
      {
        id: 'tds-6',
        name: 'Taco Campechano (Bistec con Longaniza)',
        description: 'Combinación clásica de bistec a la plancha con longaniza doradita',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Tacos',
        isAvailable: true,
      },
      {
        id: 'tds-7',
        name: 'Taco de Longaniza Tradicional',
        description: 'Longaniza picada bien dorada con especias de la casa',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Tacos',
        isAvailable: true,
      },
      {
        id: 'tds-8',
        name: 'Taco de Longaniza en Trozo',
        description: 'Trozos enteros de longaniza asada al comal',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Tacos',
        isAvailable: true,
      },
      {
        id: 'tds-9',
        name: 'Refresco 600ml Bien Frío',
        description: 'Coca-Cola, Jarrito de Mandarina o Toronja, Sidral',
        originalPrice: 25,
        surcharge: 5,
        price: 30,
        category: 'Bebidas',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'comida-china-mesones',
    name: 'Comida China Mesones',
    establishmentType: 'motomandado',
    category: 'Comida China',
    rating: '4.8',
    reviews: '320',
    time: '20–35 min',
    deliveryFee: 40,
    commissionRate: 20,
    acceptsTransfer: false, // No factura -> Solo Efectivo
    acceptsCash: true,
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=900&q=85',
    tags: ['Comida China', 'Guisados', 'Arroz Frito', 'Chow Mein', 'Solo Efectivo'],
    badge: 'Local Asociado',
    description: 'Comida China tradicional de calle Mesones. Combos con selección personalizada de guisados (Alitas, Pollo agridulce, Camarones, Res con brócoli) acompañados de arroz frito o espagueti.',
    isActive: true,
    isOpen: true,
    schedule: '12:00 PM – 9:00 PM',
    menu: [
      {
        id: 'ccm-1',
        name: 'Platillo 1 Guisado + Acompañamiento',
        description: 'Incluye 1 guisado a elegir y porción de arroz frito o espagueti Chow Mein (con fotos)',
        originalPrice: 89,
        surcharge: 18,
        price: 107,
        category: 'Platillos Combinados',
        image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80',
        isAvailable: true,
        isComboBuilder: true,
      },
      {
        id: 'ccm-2',
        name: 'Platillo 2 Guisados + Acompañamiento',
        description: 'Incluye 2 guisados a elegir y porción de arroz frito o espagueti Chow Mein (puedes repetir o mezclar)',
        originalPrice: 115,
        surcharge: 23,
        price: 138,
        category: 'Platillos Combinados',
        image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=600&q=80',
        isAvailable: true,
        isComboBuilder: true,
      },
      {
        id: 'ccm-3',
        name: 'Platillo 3 Guisados + Acompañamiento',
        description: 'Incluye 3 guisados a elegir y porción de arroz frito o espagueti Chow Mein',
        originalPrice: 145,
        surcharge: 29,
        price: 174,
        category: 'Platillos Combinados',
        image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
        isAvailable: true,
        isComboBuilder: true,
      },
      {
        id: 'ccm-4',
        name: 'Platillo 4 Guisados + Acompañamiento',
        description: 'Incluye 4 guisados a elegir y porción abundante de arroz frito o espagueti Chow Mein',
        originalPrice: 165,
        surcharge: 33,
        price: 198,
        category: 'Platillos Combinados',
        image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
        isAvailable: true,
        isComboBuilder: true,
      },
      {
        id: 'ccm-5',
        name: 'Rollitos Primavera (Orden de 2 pzs)',
        description: 'Rollitos crujientes rellenos de vegetales frescos acompañados de salsa agridulce',
        originalPrice: 15,
        surcharge: 3,
        price: 18,
        category: 'Entradas',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'ferechiken-alamedas',
    name: 'Ferechiken Las Alamedas',
    establishmentType: 'motomandado',
    category: 'Pollo & Antojitos',
    rating: '4.9',
    reviews: '540',
    time: '25–40 min',
    deliveryFee: 40,
    commissionRate: 20,
    acceptsTransfer: false, // No factura -> Solo Efectivo
    acceptsCash: true,
    image: '/assets/aistudio/FB_IMG_1793113084846_75e6bbcc.jpg',
    tags: ['Pollo Rostizado', 'Pollo Empanizado', 'Alitas', 'Flautas', 'Burritos', 'Solo Efectivo'],
    badge: 'Local Asociado',
    description: '¡Pollos rostizados, adobados, asados y empanizados! Flautas, burritos, papas a la francesa y alitas crujientes. Av. Central #96, Santa Cruz de La Paz. Tel: 4151019920.',
    isActive: true,
    isOpen: true,
    schedule: '11:00 AM – 8:30 PM',
    menu: [
      {
        id: 'fc-1',
        name: 'Pollo Empanizado Entero (8 pzs)',
        description: '8 piezas de pollo crujiente empanizado estilo casero con complementos',
        originalPrice: 200,
        surcharge: 40,
        price: 240,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-2',
        name: 'Medio Pollo Empanizado (4 pzs)',
        description: '4 piezas de pollo crujiente empanizado',
        originalPrice: 110,
        surcharge: 22,
        price: 132,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-3',
        name: 'Pollo al Mango Habanero Entero',
        description: 'Pollo bañado en deliciosa y picosita salsa de mango habanero',
        originalPrice: 190,
        surcharge: 38,
        price: 228,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-4',
        name: 'Medio Pollo al Mango Habanero',
        description: 'Medio pollo bañado en salsa mango habanero',
        originalPrice: 100,
        surcharge: 20,
        price: 120,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-5',
        name: 'Pollo BBQ Entero',
        description: 'Pollo entero bañado en rica salsa BBQ dulce y ahumada',
        originalPrice: 190,
        surcharge: 38,
        price: 228,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-6',
        name: 'Medio Pollo BBQ',
        description: 'Medio pollo bañado en salsa BBQ ahumada',
        originalPrice: 100,
        surcharge: 20,
        price: 120,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-7',
        name: 'Pollo Asado / Adobado / Ranchero Entero',
        description: 'Pollo entero marinado con especias rancheras asado al carbón',
        originalPrice: 190,
        surcharge: 38,
        price: 228,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-8',
        name: 'Medio Pollo Asado / Adobado / Ranchero',
        description: 'Medio pollo marinado ranchero al carbón',
        originalPrice: 100,
        surcharge: 20,
        price: 120,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-9',
        name: 'Pollo Rostizado Tradicional Entero',
        description: 'Pollo rostizado dorado y jugoso, incluye salsas y tortillas',
        originalPrice: 190,
        surcharge: 38,
        price: 228,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-10',
        name: 'Medio Pollo Rostizado Tradicional',
        description: 'Medio pollo rostizado dorado y jugoso',
        originalPrice: 100,
        surcharge: 20,
        price: 120,
        category: 'Pollo',
        isAvailable: true,
      },
      {
        id: 'fc-11',
        name: 'Orden de Flautas',
        description: 'Flautas crujientes con crema, queso, lechuga fresca y salsa',
        originalPrice: 60,
        surcharge: 12,
        price: 72,
        category: 'Complementos',
        isAvailable: true,
      },
      {
        id: 'fc-12',
        name: 'Burritos Especiales de Pollo',
        description: 'Burritos con pollo sazonado, arroz y frijolitos en tortilla de harina',
        originalPrice: 70,
        surcharge: 14,
        price: 84,
        category: 'Complementos',
        isAvailable: true,
      },
      {
        id: 'fc-13',
        name: 'Papas a la Francesa Crujientes',
        description: 'Porción generosa de papas doradas con catsup',
        originalPrice: 70,
        surcharge: 14,
        price: 84,
        category: 'Complementos',
        isAvailable: true,
      },
      {
        id: 'fc-14',
        name: 'Nuggets de Pollo con Aderezo',
        description: 'Nuggets de pechuga doraditos acompañados de aderezo',
        originalPrice: 70,
        surcharge: 14,
        price: 84,
        category: 'Complementos',
        isAvailable: true,
      },
      {
        id: 'fc-15',
        name: 'Orden de Alitas (Mango Habanero, BBQ, BBQ Picante o Búfalo)',
        description: 'Alitas jugosas bañadas en tu salsa favorita con aderezo ranch',
        originalPrice: 80,
        surcharge: 16,
        price: 96,
        category: 'Alitas',
        isAvailable: true,
      },
      {
        id: 'fc-16',
        name: 'Alitas con Papas a la Francesa',
        description: 'Orden de alitas bañadas en salsa acompañadas de papas fritas',
        originalPrice: 100,
        surcharge: 20,
        price: 120,
        category: 'Alitas',
        isAvailable: true,
      },
      {
        id: 'fc-17',
        name: 'Alitas Empanizadas Crujientes',
        description: 'Alitas empanizadas estilo crujiente con aderezo especial',
        originalPrice: 120,
        surcharge: 24,
        price: 144,
        category: 'Alitas',
        isAvailable: true,
      },
    ],
    suggestedExtras: [
      { id: 'ext-fc-1', name: 'Papas a la Francesa Chicas', description: 'Porción individual crujiente', price: 40, isAvailable: true },
      { id: 'ext-fc-2', name: 'Refresco Coca-Cola 600ml', description: 'Bien fría', price: 30, isAvailable: true },
      { id: 'ext-fc-3', name: 'Salsa Extra Especial de la Casa', description: 'Frasco de salsa macha o verde', price: 15, isAvailable: true },
    ],
  },
  {
    id: 'burger-sma',
    name: 'Burger & Ribs San Miguel',
    establishmentType: 'restaurante',
    category: 'Hamburguesa',
    rating: '4.8',
    reviews: '340',
    time: '25–40 min',
    deliveryFee: 40,
    commissionRate: 15,
    acceptsTransfer: true,
    acceptsCash: true,
    isPopular: true,
    popularityRank: 3,
    bankDetails: 'CLABE 012180012345678999 · BBVA · Burger House SMA',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
    tags: ['Hamburguesa', 'Papas', 'Malteadas', 'Snacks'],
    badge: 'Popular · San Miguel',
    description: 'Hamburguesas artesanales de res al carbón con queso cheddar fundido y tocino crujiente.',
    isActive: true,
    isOpen: true,
    schedule: '1:00 PM – 11:00 PM',
    suggestedExtras: [
      { id: 'ext-bg-1', name: 'Aros de Cebolla Crujientes', description: 'Con aderezo BBQ ranch', price: 45, isAvailable: true },
      { id: 'ext-bg-2', name: 'Malteada de Chocolate Artesanal', description: 'Con crema batida y cereza', price: 55, isAvailable: true },
    ],
    menu: [
      {
        id: 'bg-1',
        name: 'Hamburguesa Doble Queso y Tocino',
        description: '200g de carne de res, doble queso cheddar, tocino ahumado y papas',
        originalPrice: 120,
        surcharge: 20,
        price: 140,
        category: 'Hamburguesas',
        isAvailable: true,
        customizations: [
          { id: 'bg-rem-queso', name: 'Sin queso', price: 0, type: 'removal' },
          { id: 'bg-rem-chile', name: 'Sin chile / jalapeño', price: 0, type: 'removal' },
          { id: 'bg-rem-cebolla', name: 'Sin cebolla', price: 0, type: 'removal' },
          { id: 'bg-ext-queso', name: 'Extra queso cheddar', price: 15, type: 'extra' },
          { id: 'bg-ext-chile', name: 'Extra chile toreado', price: 10, type: 'extra' },
          { id: 'bg-ext-tocino', name: 'Extra tocino crujiente', price: 20, type: 'extra' },
        ],
      },
      {
        id: 'bg-2',
        name: 'Hamburguesa BBQ Crunchy Chicken',
        description: 'Pechuga empanizada crujiente bañado en BBQ, col morada y aderezo',
        originalPrice: 110,
        surcharge: 20,
        price: 130,
        category: 'Hamburguesas',
        isAvailable: true,
        customizations: [
          { id: 'bg2-rem-queso', name: 'Sin queso', price: 0, type: 'removal' },
          { id: 'bg2-rem-chile', name: 'Sin picante / chile', price: 0, type: 'removal' },
          { id: 'bg2-rem-col', name: 'Sin col morada', price: 0, type: 'removal' },
          { id: 'bg2-ext-queso', name: 'Extra queso derretido', price: 15, type: 'extra' },
          { id: 'bg2-ext-tocino', name: 'Extra tocino ahumado', price: 20, type: 'extra' },
        ],
      },
    ],
  },
  {
    id: 'sushi-sma',
    name: 'Sushi Roll & Wok SMA',
    establishmentType: 'restaurante',
    category: 'Sushi',
    rating: '4.9',
    reviews: '290',
    time: '30–45 min',
    deliveryFee: 45,
    commissionRate: 15,
    acceptsTransfer: true,
    acceptsCash: true,
    isPopular: true,
    popularityRank: 4,
    bankDetails: 'CLABE 014180098765432100 · Santander · Sushi SMA',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85',
    tags: ['Sushi', 'Rollos', 'Wok', 'Japonesa'],
    badge: 'Gourmet · San Miguel',
    description: 'Rollos de sushi frescos, tempuras y arroz yakimeshi con ingredientes de primera calidad.',
    isActive: true,
    isOpen: true,
    schedule: '1:00 PM – 10:30 PM',
    suggestedExtras: [
      { id: 'ext-sh-1', name: 'Edamames al Vapor con Sal Marina', description: 'Vainas frescas de soya', price: 50, isAvailable: true },
      { id: 'ext-sh-2', name: 'Kushiages de Queso Manchego (3 pzas)', description: 'Brochetas empanizadas con salsa teriyaki', price: 55, isAvailable: true },
    ],
    menu: [
      {
        id: 'sh-1',
        name: 'Rollo Philadelphia Especial',
        description: 'Salmón fresco, queso crema, aguacate y ajonjolí tostado (10 pzas)',
        originalPrice: 130,
        surcharge: 25,
        price: 155,
        category: 'Sushi Rolls',
        isAvailable: true,
      },
      {
        id: 'sh-2',
        name: 'Arroz Yakimeshi Mixto',
        description: 'Arroz frito oriental con pollo, res, camarón y verduras al wok',
        originalPrice: 100,
        surcharge: 20,
        price: 120,
        category: 'Wok',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'barbacoa-don-lupe',
    name: 'Barbacoa de Hoyo Don Lupe',
    establishmentType: 'motomandado',
    category: 'Barbacoa',
    rating: '5.0',
    reviews: '480',
    time: '20–35 min',
    deliveryFee: 40,
    commissionRate: 20,
    acceptsTransfer: false,
    acceptsCash: true,
    isPopular: true,
    popularityRank: 5,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85',
    tags: ['Barbacoa', 'Consomé', 'Tacos', 'Tradicional'],
    badge: 'Auténtica de Hoyo',
    description: 'Barbacoa de borrego cocida en penca de maguey bajo tierra. Incluye tortillas recién hechas y consomé caliente.',
    isActive: true,
    isOpen: true,
    schedule: '8:00 AM – 4:00 PM',
    suggestedExtras: [
      { id: 'ext-bb-1', name: 'Litro de Consomé Caliente Extra', description: 'Con garbanzo, arroz y chile piquín', price: 40, isAvailable: true },
      { id: 'ext-bb-2', name: 'Medio Kilo de Tortillas Hechas a Mano', description: 'Recién salidas del comal', price: 25, isAvailable: true },
    ],
    menu: [
      {
        id: 'bb-1',
        name: 'Medio Kilo de Barbacoa con Consomé',
        description: 'Carne maciza y espaldilla con medio litro de consomé, salsa borracha y tortillas',
        originalPrice: 280,
        surcharge: 40,
        price: 320,
        category: 'Barbacoa',
        isAvailable: true,
      },
      {
        id: 'bb-2',
        name: 'Orden de 3 Tacos Dorados de Barbacoa',
        description: 'Crujientes bañados con crema de rancho y queso fresco',
        originalPrice: 75,
        surcharge: 15,
        price: 90,
        category: 'Tacos',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'desayunos-campanario',
    name: 'Café & Desayunos El Campanario',
    establishmentType: 'restaurante',
    category: 'Desayunos',
    rating: '4.8',
    reviews: '210',
    time: '20–35 min',
    deliveryFee: 35,
    commissionRate: 15,
    acceptsTransfer: true,
    acceptsCash: true,
    bankDetails: 'CLABE 012180098711223344 · BBVA · Campanario SMA',
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=85',
    tags: ['Desayunos', 'Chilaquiles', 'Omelettes', 'Café'],
    badge: 'Desayunos SMA',
    description: 'Chilaquiles crujientes con salsa verde o roja de la casa, huevos al gusto y café de olla recién colado.',
    isActive: true,
    isOpen: true,
    schedule: '8:00 AM – 2:00 PM',
    suggestedExtras: [
      { id: 'ext-ds-1', name: 'Café de Olla Artesanal 500ml', description: 'Con canela y piloncillo tradicional', price: 30, isAvailable: true },
      { id: 'ext-ds-2', name: 'Jugo de Naranja Natural 500ml', description: 'Recién exprimido', price: 35, isAvailable: true },
    ],
    menu: [
      {
        id: 'ds-1',
        name: 'Chilaquiles con Pollo o Huevo',
        description: 'Totopos crujientes en salsa verde o pasilla con crema, queso y frijolitos',
        originalPrice: 95,
        surcharge: 15,
        price: 110,
        category: 'Desayunos',
        isAvailable: true,
      },
      {
        id: 'ds-2',
        name: 'Omelette Campesino con Champiñones',
        description: 'Huevos de granja rellenos de queso gouda y champiñones con ensalada',
        originalPrice: 90,
        surcharge: 15,
        price: 105,
        category: 'Desayunos',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'mariscos-el-puerto',
    name: 'Mariscos El Puerto SMA',
    establishmentType: 'restaurante',
    category: 'Mariscos',
    rating: '4.9',
    reviews: '310',
    time: '25–40 min',
    deliveryFee: 40,
    commissionRate: 15,
    acceptsTransfer: true,
    acceptsCash: true,
    bankDetails: 'CLABE 014180055443322110 · Santander · Mariscos Puerto SMA',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=900&q=85',
    tags: ['Mariscos', 'Ceviche', 'Camarones', 'Aguachile'],
    badge: 'Mariscos Frescos',
    description: 'Cócteles de camarón, tostadas de ceviche fresco y aguachile negro con aguacate.',
    isActive: true,
    isOpen: true,
    schedule: '11:00 AM – 8:00 PM',
    suggestedExtras: [
      { id: 'ext-mr-1', name: 'Tostada de Ceviche de Pescado', description: 'Con aguacate y limón', price: 45, isAvailable: true },
      { id: 'ext-mr-2', name: 'Agua de Horchata con Coco 1L', description: 'Especial fría para mariscos', price: 40, isAvailable: true },
    ],
    menu: [
      {
        id: 'mr-1',
        name: 'Cóctel de Camarón Especial Grande',
        description: 'Camarones pacotilla en salsa cóctel tradicional con aguacate y cilantro',
        originalPrice: 150,
        surcharge: 25,
        price: 175,
        category: 'Cócteles',
        isAvailable: true,
      },
      {
        id: 'mr-2',
        name: 'Aguachile Verde de Camarón',
        description: 'Camarones marinados en limón, serrano, pepino y cebolla morada',
        originalPrice: 165,
        surcharge: 25,
        price: 190,
        category: 'Especialidades',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'panaderia-aurora',
    name: 'Panadería Artesanal La Aurora',
    establishmentType: 'motomandado',
    category: 'Panadería',
    rating: '4.9',
    reviews: '190',
    time: '15–30 min',
    deliveryFee: 30,
    commissionRate: 20,
    acceptsTransfer: false,
    acceptsCash: true,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85',
    tags: ['Panadería', 'Bolillos', 'Conchas', 'Dulce'],
    badge: 'Horneado Diario',
    description: 'Pan dulce tradicional horneado con mantequilla, conchas, cuernos, chocolatines y bolillo caliente.',
    isActive: true,
    isOpen: true,
    schedule: '7:00 AM – 9:00 PM',
    suggestedExtras: [
      { id: 'ext-pn-1', name: 'Bolsa de 4 Bolillos Calientes', description: 'Recién salidos del horno', price: 20, isAvailable: true },
      { id: 'ext-pn-2', name: 'Chocolate Abuelita Caliente 500ml', description: 'Preparado con leche entera espumosa', price: 35, isAvailable: true },
    ],
    menu: [
      {
        id: 'pn-1',
        name: 'Surtido de 6 Piezas de Pan Dulce',
        description: 'Conchas de vainilla y chocolate, cuernitos de mantequilla y orejas crujientes',
        originalPrice: 70,
        surcharge: 15,
        price: 85,
        category: 'Pan Dulce',
        isAvailable: true,
      },
      {
        id: 'pn-2',
        name: 'Chocolatín Hojaldrado Relleno de Nutella',
        description: 'Hojaldre francés crujiente horneado con chocolate y mantequilla',
        originalPrice: 30,
        surcharge: 8,
        price: 38,
        category: 'Hojaldre',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'postres-sma',
    name: 'Churrería & Repostería Dulce SMA',
    establishmentType: 'motomandado',
    category: 'Postres',
    rating: '4.9',
    reviews: '380',
    time: '15–30 min',
    deliveryFee: 30,
    commissionRate: 20,
    acceptsTransfer: false,
    acceptsCash: true,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85',
    tags: ['Postres', 'Churros', 'Crepas', 'Pasteles'],
    badge: 'Postres & Churros',
    description: 'Churros rellenos de cajeta de Celaya, crepas de Nutella con fresas y rebanadas de pastel artesanal.',
    isActive: true,
    isOpen: true,
    schedule: '3:00 PM – 11:00 PM',
    suggestedExtras: [
      { id: 'ext-ps-1', name: 'Dip de Cajeta Tradicional de Celaya', description: 'Vaso de 4 oz para chopear', price: 20, isAvailable: true },
      { id: 'ext-ps-2', name: 'Dip de Nutella Cremosa', description: 'Vaso de 4 oz para chopear', price: 25, isAvailable: true },
    ],
    menu: [
      {
        id: 'ps-1',
        name: 'Docena de Churros Clásicos con Azúcar y Canela',
        description: 'Churros calientes recién hechos acompañados de dip a elegir',
        originalPrice: 80,
        surcharge: 15,
        price: 95,
        category: 'Churros',
        isAvailable: true,
      },
      {
        id: 'ps-2',
        name: 'Rebanada de Pastel Tres Leches Casero',
        description: 'Bizcocho bañado en tres leches con duraznos y crema chantilly',
        originalPrice: 55,
        surcharge: 12,
        price: 67,
        category: 'Pasteles',
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cenaduria-dona-chela',
    name: 'Cenaduría Doña Chela (Tradicional)',
    establishmentType: 'motomandado',
    category: 'Antojitos & Cenaduría',
    rating: '4.9',
    reviews: '520',
    time: '20–35 min',
    deliveryFee: 35,
    commissionRate: 20,
    acceptsTransfer: false,
    acceptsCash: true,
    isPopular: true,
    popularityRank: 6,
    hasFixedMenu: false, // Local sin menú fijo: el cliente escribe lo que necesita y RODO cotiza
    customOrderHint: 'Escribe tu pedido (ej: 3 enchiladas mineras con cecina, 2 pozoles chicos y un atole de guayaba caliente)',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=85',
    tags: ['Cenaduría', 'Enchiladas', 'Pozole', 'Pide a la Medida'],
    badge: 'Pide lo que quieras · Cotización RODO',
    description: 'Cenaduría típica de San Miguel. Sin menú fijo: escribe los antojitos que gustes y RODO te los compra y entrega.',
    isActive: true,
    isOpen: true,
    schedule: '6:30 PM – 11:30 PM',
    menu: [],
  },
  {
    id: 'tortas-el-chavo-sma',
    name: 'Tortas Calientes El Chavo',
    establishmentType: 'motomandado',
    category: 'Tortas & Lonches',
    rating: '4.8',
    reviews: '310',
    time: '15–30 min',
    deliveryFee: 35,
    commissionRate: 20,
    acceptsTransfer: false,
    acceptsCash: true,
    hasFixedMenu: false,
    customOrderHint: 'Escribe qué tortas necesitas (ej: 2 tortas de pierna con queso y aguacate, 1 torta cubana y 2 Boings de mango)',
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=900&q=85',
    tags: ['Tortas', 'Lonches', 'Refrescos', 'Pide a la Medida'],
    badge: 'Tradición SMA · Pide a la Medida',
    description: 'Puesto emblemático de tortas en San Miguel. Dinos tu orden y RODO la recoge en caliente.',
    isActive: true,
    isOpen: true,
    schedule: '10:00 AM – 10:00 PM',
    menu: [],
  },
  {
    id: 'tiendita-la-esquina',
    name: 'Abarrotes & Tiendita La Esquina',
    establishmentType: 'motomandado',
    category: 'Tiendita & Abarrotes',
    rating: '5.0',
    reviews: '260',
    time: '15–25 min',
    deliveryFee: 30,
    commissionRate: 20,
    acceptsTransfer: false,
    acceptsCash: true,
    hasFixedMenu: false,
    coordinates: { lat: 20.9138, lng: -100.7455 },
    customOrderHint: 'Escribe tu lista de compras (ej: Leche entera 1L, huevo 1kg, tortillas, botana y refresco familiar)',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85',
    tags: ['Tienda', 'Abarrotes', 'Botanas', 'Mandado'],
    badge: 'Mandado Rápido · Sin Complicaciones',
    description: 'Compras de mostrador y abarrotes de la colonia. Tu repartidor RODO compra tu lista completa y te la lleva.',
    isActive: true,
    isOpen: true,
    schedule: '8:00 AM – 10:00 PM',
    menu: [],
  },
  {
    id: 'supermercado-sma',
    name: 'Supermercado & Despensa El Mercado',
    establishmentType: 'motomandado',
    category: 'Supermercado',
    rating: '4.9',
    reviews: '340',
    time: '25–40 min',
    deliveryFee: 40,
    commissionRate: 18,
    acceptsTransfer: false,
    acceptsCash: true,
    hasFixedMenu: false,
    coordinates: { lat: 20.9175, lng: -100.7532 },
    customOrderHint: 'Escribe tu despensa (ej: Papel higiénico 12 rollos, arroz 1kg, aceite, detergente y garrafón)',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=900&q=85',
    tags: ['Supermercado', 'Súper', 'Despensa', 'Hogar'],
    badge: 'Despensa Completa a Domicilio',
    description: 'Surtido completo de supermercado y despensa en San Miguel. Mandas tu lista y nosotros vamos por todo.',
    isActive: true,
    isOpen: true,
    schedule: '8:00 AM – 9:30 PM',
    menu: [],
  },
  {
    id: 'farmacia-san-miguel',
    name: 'Farmacia Central & Botiquín SMA',
    establishmentType: 'motomandado',
    category: 'Farmacia',
    rating: '5.0',
    reviews: '410',
    time: '15–25 min',
    deliveryFee: 35,
    commissionRate: 18,
    acceptsTransfer: false,
    acceptsCash: true,
    hasFixedMenu: false,
    coordinates: { lat: 20.9149, lng: -100.7429 },
    customOrderHint: 'Escribe medicamentos de libre venta o artículos de higiene (ej: Paracetamol 500mg, suero oral, curitas)',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=85',
    tags: ['Farmacia', 'Salud', 'Higiene', 'Urgente'],
    badge: 'Entrega Prioritaria · Farmacia',
    description: 'Medicamentos de libre venta, sueros, pañales y artículos de farmacia directos hasta tu puerta.',
    isActive: true,
    isOpen: true,
    schedule: '24 Horas / Turno Nocturno',
    menu: [],
  },
  {
    id: 'verduleria-mercado-sma',
    name: 'Verdulería & Frutas San Juan de Dios',
    establishmentType: 'motomandado',
    category: 'Verdulería',
    rating: '4.9',
    reviews: '285',
    time: '20–35 min',
    deliveryFee: 35,
    commissionRate: 18,
    acceptsTransfer: false,
    acceptsCash: true,
    hasFixedMenu: false,
    coordinates: { lat: 20.9181, lng: -100.7495 },
    customOrderHint: 'Escribe frutas y verduras (ej: 1kg aguacate Hass maduro, 1kg jitomate, 1kg limón, cilantro y fresas)',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85',
    tags: ['Verdulería', 'Frutas', 'Verduras', 'Mercado'],
    badge: 'Fresco del Día · Mercado SMA',
    description: 'Frutas y verduras frescas seleccionadas a mano en el mercado tradicional de San Miguel de Allende.',
    isActive: true,
    isOpen: true,
    schedule: '7:30 AM – 6:00 PM',
    menu: [],
  },
  {
    id: 'carniceria-san-antonio',
    name: 'Carnicería La Selecta de San Antonio',
    establishmentType: 'motomandado',
    category: 'Carnicería',
    rating: '4.9',
    reviews: '220',
    time: '20–35 min',
    deliveryFee: 35,
    commissionRate: 18,
    acceptsTransfer: false,
    acceptsCash: true,
    hasFixedMenu: false,
    coordinates: { lat: 20.9078, lng: -100.7512 },
    customOrderHint: 'Escribe tus cortes (ej: 1kg bistec de res, 1/2kg molida especial, 1kg arrachera marinada y chorizo)',
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=85',
    tags: ['Carnicería', 'Cortes', 'Asado', 'Res y Cerdo'],
    badge: 'Cortes Frescos al Día',
    description: 'Bistec, arrachera, molida, chorizo artesanal y cortes frescos empacados al momento.',
    isActive: true,
    isOpen: true,
    schedule: '8:00 AM – 5:30 PM',
    menu: [],
  },
];

export function generateUniqueTicketFolio(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `RD-${yy}${mm}${dd}-${rand}`;
}

// Inicialización controlada (Sincroniza catálogo semilla con PostgreSQL en el Backend)
export async function ensureDatabaseSeeded(_isAdminUser = false): Promise<void> {
  try {
    await apiFetch('/api/seed', {
      method: 'POST',
      body: {
        restaurants: DEFAULT_RESTAURANTS,
        settings: INITIAL_SETTINGS,
      },
    });
  } catch {
    // Fallback offline silencioso
  }
}

// RESTAURANTES
export const VALID_RESTAURANT_IDS = [
  'tacos-sebas',
  'little-caesars',
  'tacos-don-santos',
  'comida-china-mesones',
  'ferechiken-alamedas',
  'burger-sma',
  'sushi-sma',
  'barbacoa-don-lupe',
  'desayunos-campanario',
  'mariscos-el-puerto',
  'panaderia-aurora',
  'postres-sma',
  'cenaduria-dona-chela',
  'tortas-el-chavo-sma',
  'tiendita-la-esquina',
  'supermercado-sma',
  'farmacia-san-miguel',
  'verduleria-mercado-sma',
  'carniceria-san-antonio',
];

const LOCAL_STORAGE_RESTAURANTS = 'rodo_restaurants_cache';

export function getLocalStoredRestaurants(): Restaurant[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESTAURANTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return DEFAULT_RESTAURANTS;
}

function saveLocalStoredRestaurant(restaurant: Restaurant): void {
  try {
    const current = getLocalStoredRestaurants();
    const updated = [restaurant, ...current.filter((r) => r.id !== restaurant.id)];
    localStorage.setItem(LOCAL_STORAGE_RESTAURANTS, JSON.stringify(updated));
  } catch {}
}

export function sanitizeRestaurantForCustomer(r: Restaurant): Restaurant {
  const cleanBadge = r.badge
    ? r.badge.replace(/·?\s*PIN\s*#?\d+/gi, '').replace(/\s{2,}/g, ' ').trim()
    : r.badge;
  const cleanDesc = r.description
    ? r.description.replace(/\(?PIN\s*#?\d+\)?\.?/gi, '').replace(/\s{2,}/g, ' ').trim()
    : r.description;
  return {
    ...r,
    badge: cleanBadge || 'Local Asociado',
    description: cleanDesc,
  };
}

export async function getRestaurants(): Promise<Restaurant[]> {
  const localList = getLocalStoredRestaurants();
  try {
    const remoteList = await apiFetch<Restaurant[]>('/api/restaurants');
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      const existingIds = new Set(remoteList.map((r) => r.id));
      const missingDefaults = DEFAULT_RESTAURANTS.filter((r) => !existingIds.has(r.id));
      const finalResult = [...remoteList, ...missingDefaults].map(sanitizeRestaurantForCustomer);
      try {
        localStorage.setItem(LOCAL_STORAGE_RESTAURANTS, JSON.stringify(finalResult));
      } catch {}
      syncRestaurantsToIDB(finalResult);
      return finalResult;
    }
  } catch {}

  const idbRestaurants = await getRestaurantsFromIDB();
  const fallbackList =
    localList.length > 0 ? localList : idbRestaurants.length > 0 ? idbRestaurants : DEFAULT_RESTAURANTS;
  const sanitized = fallbackList.map(sanitizeRestaurantForCustomer);
  syncRestaurantsToIDB(sanitized);
  return sanitized;
}

export async function saveRestaurant(restaurant: Restaurant): Promise<void> {
  saveLocalStoredRestaurant(restaurant);
  syncRestaurantsToIDB(getLocalStoredRestaurants());

  try {
    await apiFetch(`/api/restaurants/${encodeURIComponent(restaurant.id)}`, {
      method: 'PUT',
      body: restaurant,
    });
  } catch (err) {
    console.warn('[API] Fallback local al guardar restaurante:', err);
  }
}

export async function deleteRestaurant(id: string): Promise<void> {
  try {
    const current = getLocalStoredRestaurants().filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_RESTAURANTS, JSON.stringify(current));
  } catch {}

  try {
    await apiFetch(`/api/restaurants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[API] Fallback local al eliminar restaurante:', err);
  }
}

// CONFIGURACIÓN DE DESPACHO
export async function getDispatchSettings(): Promise<DispatchSettings> {
  try {
    const data = await apiFetch<Partial<DispatchSettings>>('/api/settings');
    if (data && Object.keys(data).length > 0) {
      const mergedRiders =
        data.ridersList && Array.isArray(data.ridersList) && data.ridersList.length >= 10
          ? data.ridersList
          : INITIAL_SETTINGS.ridersList;
      return {
        ...INITIAL_SETTINGS,
        ...data,
        ridersList: mergedRiders,
      } as DispatchSettings;
    }
  } catch {}
  return INITIAL_SETTINGS;
}

export async function saveDispatchSettings(settings: DispatchSettings): Promise<void> {
  try {
    await apiFetch('/api/settings', {
      method: 'PUT',
      body: settings,
    });
  } catch (err) {
    console.warn('[API] Fallback local al guardar configuración:', err);
  }
}

function deduplicatePartnerLocals(locals: PartnerLocal[]): PartnerLocal[] {
  const mapById = new Map<string, PartnerLocal>();
  const seenCodes = new Set<string>();

  for (const l of locals) {
    if (!l || !l.id || mapById.has(l.id)) continue;
    if (l.code && seenCodes.has(l.code)) continue;
    if (l.code) seenCodes.add(l.code);
    mapById.set(l.id, l);
  }
  return Array.from(mapById.values());
}

// LOCALES ASOCIADOS (CÓDIGOS DE 3 DÍGITOS TIPO API)
function getLocalStoredPartnerLocals(): PartnerLocal[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PARTNER_LOCALS);
    if (raw) {
      const stored: PartnerLocal[] = JSON.parse(raw);
      const cleaned = deduplicatePartnerLocals(stored);
      const existingIds = new Set(cleaned.map((l) => l.id));
      const existingCodes = new Set(cleaned.filter((l) => !!l.code).map((l) => l.code));
      const missing = DEFAULT_PARTNER_LOCALS.filter(
        (l) => !existingIds.has(l.id) && (!l.code || !existingCodes.has(l.code))
      );
      const finalResult = [...cleaned, ...missing];
      localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(finalResult));
      return finalResult;
    }
    localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(DEFAULT_PARTNER_LOCALS));
    return DEFAULT_PARTNER_LOCALS;
  } catch {
    return DEFAULT_PARTNER_LOCALS;
  }
}

export async function getPartnerLocals(): Promise<PartnerLocal[]> {
  const localList = getLocalStoredPartnerLocals();
  try {
    const remoteList = await apiFetch<PartnerLocal[]>('/api/partner-locals');
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      const cleaned = deduplicatePartnerLocals(remoteList);
      localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(cleaned));
      return cleaned;
    }
  } catch {}
  return localList;
}

export async function savePartnerLocal(local: PartnerLocal): Promise<void> {
  try {
    const current = getLocalStoredPartnerLocals();
    const sanitizedOthers = current
      .filter((l) => l.id !== local.id)
      .map((l) => (l.code === local.code && local.code ? { ...l, code: '' } : l));

    const updated = [local, ...sanitizedOthers];
    localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(updated));
  } catch {}

  try {
    await apiFetch(`/api/partner-locals/${encodeURIComponent(local.id)}`, {
      method: 'PUT',
      body: local,
    });
  } catch {}
}

export async function deletePartnerLocal(id: string): Promise<void> {
  try {
    const current = getLocalStoredPartnerLocals();
    const updated = current.filter((l) => l.id !== id);
    localStorage.setItem(LOCAL_STORAGE_PARTNER_LOCALS, JSON.stringify(updated));
  } catch {}

  try {
    await apiFetch(`/api/partner-locals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch {}
}

export async function findPartnerLocalByCode(code: string): Promise<PartnerLocal | null> {
  const cleanCode = code.trim();
  try {
    const remote = await apiFetch<PartnerLocal>(`/api/partner-locals/code/${encodeURIComponent(cleanCode)}`);
    if (remote && remote.isActive) return remote;
  } catch {}
  const locals = await getPartnerLocals();
  return locals.find((l) => l.code === cleanCode && l.isActive) || null;
}

// PEDIDOS Y TICKETS (CON SINCRONIZACIÓN EN TIEMPO REAL VÍA SOCKET.IO + POSTGRESQL)
function getLocalStoredOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDERS) || '[]');
  } catch {
    return [];
  }
}

function saveLocalStoredOrder(order: Order): void {
  try {
    const existing = getLocalStoredOrders();
    const updated = [order, ...existing.filter((o) => o.id !== order.id)];
    localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(updated));
  } catch {}
}

const orderSubscribers = new Set<(orders: Order[]) => void>();

export function notifyOrderSubscribers(): void {
  const localOrders = getLocalStoredOrders();
  orderSubscribers.forEach((cb) => {
    try {
      cb(localOrders);
    } catch {}
  });
}

export async function createOrderInDb(order: Order): Promise<string> {
  saveLocalStoredOrder(order);
  upsertOrderToIDB(order);
  notifyOrderSubscribers();

  try {
    const saved = await apiFetch<Order>('/api/orders', {
      method: 'POST',
      body: order,
    });
    if (saved && saved.id) {
      saveLocalStoredOrder(saved);
      upsertOrderToIDB(saved);
      notifyOrderSubscribers();
      return saved.id;
    }
  } catch (err) {
    console.warn('[API] Orden guardada localmente (fallback):', err);
  }
  return order.id;
}

export async function updateOrderInDb(orderId: string, updates: Partial<Order>): Promise<void> {
  try {
    const existing = getLocalStoredOrders();
    const idx = existing.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      const nextOrder = { ...existing[idx], ...updates, updatedAt: new Date().toISOString() };
      existing[idx] = nextOrder;
      localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(existing));
      upsertOrderToIDB(nextOrder);
    }
  } catch {}
  notifyOrderSubscribers();

  try {
    const updated = await apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: updates,
    });
    if (updated && updated.id) {
      saveLocalStoredOrder(updated);
      upsertOrderToIDB(updated);
      notifyOrderSubscribers();
    }
  } catch (err) {
    console.warn('[API] Actualización de orden en modo fallback:', err);
  }
}

export async function createOrdersBatchInDb(orders: Order[]): Promise<void> {
  try {
    const existing = getLocalStoredOrders();
    const map = new Map<string, Order>();
    existing.forEach((o) => map.set(o.id, o));
    orders.forEach((o) => map.set(o.id, o));
    const merged = Array.from(map.values());
    localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(merged));
    syncOrdersToIDB(merged);
  } catch {}
  notifyOrderSubscribers();

  try {
    await apiFetch('/api/orders/batch', {
      method: 'POST',
      body: { orders },
    });
  } catch (err) {
    console.warn('[API] Batch write fallback:', err);
  }
}

export async function getOrders(): Promise<Order[]> {
  const localOrders = getLocalStoredOrders();
  try {
    const remoteOrders = await apiFetch<Order[]>('/api/orders');
    if (Array.isArray(remoteOrders)) {
      const map = new Map<string, Order>();
      remoteOrders.forEach((o) => map.set(o.id, o));
      localOrders.forEach((o) => {
        if (!map.has(o.id)) map.set(o.id, o);
      });
      const merged = Array.from(map.values());
      localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(merged));
      syncOrdersToIDB(merged);
      return merged;
    }
  } catch {}
  if (localOrders.length > 0) return localOrders;
  return await getOrdersFromIDB();
}

export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  _isAuthenticated: boolean
): () => void {
  orderSubscribers.add(callback);

  const localOrders = getLocalStoredOrders();
  if (localOrders.length > 0) {
    callback(localOrders);
  }

  getOrders()
    .then((merged) => callback(merged))
    .catch(() => {});

  const unsubCreated = onSocketEvent<Order>('orders:created', (newOrder) => {
    if (newOrder?.id) {
      saveLocalStoredOrder(newOrder);
      upsertOrderToIDB(newOrder);
      notifyOrderSubscribers();
    }
  });

  const unsubUpdated = onSocketEvent<Order>('orders:updated', (updatedOrder) => {
    if (updatedOrder?.id) {
      saveLocalStoredOrder(updatedOrder);
      upsertOrderToIDB(updatedOrder);
      notifyOrderSubscribers();
    }
  });

  const unsubBatch = onSocketEvent('orders:batch-updated', () => {
    getOrders()
      .then((merged) => callback(merged))
      .catch(() => {});
  });

  return () => {
    orderSubscribers.delete(callback);
    unsubCreated();
    unsubUpdated();
    unsubBatch();
  };
}

// LÍMITES ANTIFRAUDE PARA PAGO EN EFECTIVO
// 1er pedido (0 previos): $300 MXN en producto
// 2do pedido (1 previo): $400 MXN en producto
// 3er pedido (2 previos): $500 MXN en producto
// 4to pedido en adelante: $1,000 MXN en producto
// Transferencias: sin límite
export function getCustomerCashLimit(completedOrdersCount: number): number {
  if (completedOrdersCount <= 0) return 300;
  if (completedOrdersCount === 1) return 400;
  if (completedOrdersCount === 2) return 500;
  return 1000;
}

const LOCAL_STORAGE_BLOCKED_CUSTOMERS = 'rodo_blocked_customers';

export interface BlockedCustomerEntry {
  identifier: string; // teléfono o correo
  customerName?: string;
  reason: string;
  blockedAt: string;
}

export function getBlockedCustomersList(): BlockedCustomerEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS) || '[]');
  } catch {
    return [];
  }
}

export function isCustomerBlocked(phone: string, email?: string): { blocked: boolean; reason?: string } {
  const list = getBlockedCustomersList();
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanEmail = email?.trim().toLowerCase();

  const found = list.find((b) => {
    const bId = b.identifier.toLowerCase().replace(/[^0-9a-z@.]/g, '');
    return (cleanPhone && bId.includes(cleanPhone)) || (cleanEmail && bId === cleanEmail);
  });

  if (found) {
    return { blocked: true, reason: found.reason };
  }
  return { blocked: false };
}

export function blockCustomerAccount(identifier: string, name: string, reason: string): void {
  const list = getBlockedCustomersList();
  const filtered = list.filter((b) => b.identifier.toLowerCase() !== identifier.toLowerCase());
  filtered.push({
    identifier,
    customerName: name,
    reason: reason || 'Actividad sospechosa o intento de fraude detectado',
    blockedAt: new Date().toISOString(),
  });
  localStorage.setItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS, JSON.stringify(filtered));
}

export function unblockCustomerAccount(identifier: string): void {
  const list = getBlockedCustomersList();
  const filtered = list.filter((b) => b.identifier.toLowerCase() !== identifier.toLowerCase());
  localStorage.setItem(LOCAL_STORAGE_BLOCKED_CUSTOMERS, JSON.stringify(filtered));
}

// Formateador de WhatsApp para despachar a repartidores
export function buildWhatsAppDispatchMessage(
  order: Order,
  riderName: string,
  appUrl: string = window.location.origin
): string {
  const ticketUrl = `${appUrl}?ticket=${encodeURIComponent(order.folio)}`;

  if (order.orderType === 'solicitud_local') {
    const riderCount = order.ridersRequestedCount || 1;
    const urgency = order.urgencyTiming || 'Inmediato (Ya)';
    const mapsLink = order.mapsUrl || (order.coordinates ? `https://maps.google.com/?q=${order.coordinates.lat},${order.coordinates.lng}` : '');
    const feeText = order.deliveryFee > 0 ? `$${order.deliveryFee.toFixed(2)} MXN` : 'Tarifa estándar';

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
    const isTransfer = order.paymentMethod === 'transferencia';
    const paymentInstruction = isTransfer
      ? `✅ *TRANSFERENCIA VERIFICADA (NO COBRAR)*`
      : `💵 *COBRAR EN EFECTIVO:* 👉 *$${order.total.toFixed(2)} MXN*`;

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
${order.tipAmount ? `❤️ *Propina Repartidor:* $${order.tipAmount.toFixed(2)} MXN\n` : ''}━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL A LIQUIDAR:* $${order.total.toFixed(2)} MXN
${paymentInstruction}

🎫 *TICKET DIGITAL EN VIVO:*
${ticketUrl}

_RODO Moto Mandados · Auxilio Vial Rápido_`;
  }

  const isTransfer = order.paymentMethod === 'transferencia';
  const paymentInstruction = isTransfer
    ? `✅ *TRANSFERENCIA BANCARIA PRE-VERIFICADA*\n⚠️ *NO COBRAR AL CLIENTE* (Ya fue pagado y verificado en cuenta).`
    : `💵 *COBRAR EN EFECTIVO AL ENTREGAR:*\n👉 *$${order.total.toFixed(2)} MXN* exactos.`;

  const itemsList = order.items
    .map((it) => `• ${it.quantity}x ${it.name} ($${(it.price * it.quantity).toFixed(2)})${it.isExtra ? ' *(Extra)*' : ''}`)
    .join('\n');

  const deliveryTypeLabel =
    order.deliveryType === 'express'
      ? `⚡ Entrega Exprés (+ $${order.deliveryTypeSurcharge || 25} MXN)`
      : order.deliveryType === 'programada'
      ? `🕒 Entrega Programada (${order.scheduledDeliveryTime || 'Programado'})`
      : `🛵 Entrega Normal`;

  const tipText = order.tipAmount && order.tipAmount > 0
    ? `❤️ *Propina Repartidor (${order.tipPercentage || 0}%):* $${order.tipAmount.toFixed(2)} MXN\n`
    : '';

  // Obtener ubicación GPS fija del restaurante si fue configurada por el administrador
  const storedRestaurants = getLocalStoredRestaurants();
  const matchedRestaurant = storedRestaurants.find(
    (r) => r.id === order.restaurantId || r.name.toLowerCase() === order.restaurantName.toLowerCase()
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
${tipText}💲 *TOTAL ORDEN:* $${order.total.toFixed(2)} MXN

${paymentInstruction}

🎫 *TICKET DIGITAL EN VIVO:*
${ticketUrl}

_RODO Moto Mandados · Despacho Central_`;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

// PERSISTENCIA EN POSTGRESQL DE BITÁCORA DE AUDITORÍA ADMINISTRATIVA
export async function saveAdminAuditLogToFirestore(log: AdminAuditLogEntry): Promise<void> {
  try {
    await apiFetch('/api/audit-logs', {
      method: 'POST',
      body: log,
    });
  } catch (err) {
    console.warn('[API] Audit log fallback:', err);
  }
}

export async function getAdminAuditLogsFromFirestore(maxCount = 100): Promise<AdminAuditLogEntry[]> {
  try {
    const logs = await apiFetch<AdminAuditLogEntry[]>(`/api/audit-logs?limit=${maxCount}`);
    if (Array.isArray(logs)) {
      return logs;
    }
    return [];
  } catch {
    return [];
  }
}

export function subscribeToAdminAuditLogs(callback: (logs: AdminAuditLogEntry[]) => void): () => void {
  getAdminAuditLogsFromFirestore(100)
    .then((logs) => callback(logs))
    .catch(() => {});

  const unsub = onSocketEvent<AdminAuditLogEntry>('audit:created', () => {
    getAdminAuditLogsFromFirestore(100)
      .then((logs) => callback(logs))
      .catch(() => {});
  });

  return () => {
    unsub();
  };
}

// -------------------------------------------------------------
// MIDDLEWARE DE AUDITORÍA Y TRAZABILIDAD TOTAL (PostgreSQL AuditLog)
// Registra: timestamp, action, user_id, previous_value, new_value
// -------------------------------------------------------------
export const ADMIN_LOGS_COL = 'admin_logs';

export async function logAdminMiddlewareAction(params: {
  action: string;
  userId?: string;
  previousValue?: any;
  newValue?: any;
  details?: string;
  affectedRestaurant?: string;
  affectedFolio?: string;
}): Promise<void> {
  const logId = `admin-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const logEntry = {
    id: logId,
    timestamp: new Date().toISOString(),
    action: params.action,
    user_id: params.userId || 'edsoncruz14999@gmail.com',
    previous_value: params.previousValue !== undefined ? params.previousValue : null,
    newValue: params.newValue !== undefined ? params.newValue : null,
    details: params.details || '',
    affected_restaurant: params.affectedRestaurant || '',
    affected_folio: params.affectedFolio || '',
  };

  try {
    await apiFetch('/api/audit-logs', {
      method: 'POST',
      body: logEntry,
    });
  } catch {}
}

// -------------------------------------------------------------
// NOTIFICACIONES DE MARKETING PROGRAMADAS / ENVIAR A TODOS
// -------------------------------------------------------------
export function getLocalBroadcastNotifications(): BroadcastNotification[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_BROADCASTS) || '[]');
  } catch {
    return [];
  }
}

export async function sendBroadcastNotification(notif: BroadcastNotification): Promise<void> {
  try {
    const existing = getLocalBroadcastNotifications();
    const updated = [notif, ...existing.filter((n) => n.id !== notif.id)].slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_BROADCASTS, JSON.stringify(updated));
    saveBroadcastToIDB(notif);
  } catch {}

  try {
    await apiFetch('/api/broadcasts', {
      method: 'POST',
      body: notif,
    });
  } catch (err) {
    console.warn('[API] Broadcast fallback:', err);
  }
}

export async function getBroadcastNotifications(): Promise<BroadcastNotification[]> {
  const localList = getLocalBroadcastNotifications();
  try {
    const remoteList = await apiFetch<BroadcastNotification[]>('/api/broadcasts');
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_BROADCASTS, JSON.stringify(remoteList));
      return remoteList;
    }
  } catch {}
  if (localList.length > 0) return localList;
  return await getBroadcastsFromIDB();
}

export function subscribeToBroadcastNotifications(
  callback: (items: BroadcastNotification[]) => void
): () => void {
  getBroadcastNotifications()
    .then((list) => callback(list))
    .catch(() => {});

  const unsub = onSocketEvent<BroadcastNotification>('broadcasts:created', (newNotif) => {
    const current = getLocalBroadcastNotifications();
    const updated = [newNotif, ...current.filter((n) => n.id !== newNotif.id)].slice(0, 50);
    try {
      localStorage.setItem(LOCAL_STORAGE_BROADCASTS, JSON.stringify(updated));
    } catch {}
    callback(updated);
  });

  return () => {
    unsub();
  };
}

// -------------------------------------------------------------
// RECUPERACIÓN DE CUENTA Y REACTIVACIÓN POR SOPORTE (POSTGRESQL)
// -------------------------------------------------------------
export function generateRecoveryFolio(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${yy}${mm}${dd}-${rand}`;
}

export function getLocalRecoveryRequests(): AccountRecoveryRequest[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_RECOVERY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalRecoveryRequests(list: AccountRecoveryRequest[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_RECOVERY, JSON.stringify(list));
  } catch {}
}

export async function submitAccountRecoveryRequest(
  req: AccountRecoveryRequest
): Promise<AccountRecoveryRequest> {
  const local = getLocalRecoveryRequests();
  const updated = [req, ...local.filter((r) => r.id !== req.id)];
  saveLocalRecoveryRequests(updated);

  try {
    const saved = await apiFetch<AccountRecoveryRequest>('/api/auth/recovery', {
      method: 'POST',
      body: req,
    });
    if (saved) return saved;
  } catch (err) {
    console.warn('[API] Recovery request saved locally:', err);
  }
  return req;
}

export async function getAccountRecoveryRequests(): Promise<AccountRecoveryRequest[]> {
  const local = getLocalRecoveryRequests();
  try {
    const remote = await apiFetch<AccountRecoveryRequest[]>('/api/auth/recovery');
    if (Array.isArray(remote) && remote.length > 0) {
      const map = new Map<string, AccountRecoveryRequest>();
      remote.forEach((r) => map.set(r.id, r));
      local.forEach((r) => {
        if (!map.has(r.id)) map.set(r.id, r);
      });
      const merged = Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      saveLocalRecoveryRequests(merged);
      return merged;
    }
  } catch {}
  return local;
}

export async function resolveAccountRecoveryRequest(
  requestId: string,
  decision: 'aprobada' | 'rechazada',
  adminNotes?: string
): Promise<AccountRecoveryRequest | null> {
  const list = await getAccountRecoveryRequests();
  const target = list.find((r) => r.id === requestId);
  if (!target) return null;

  const now = new Date().toISOString();
  const updatedReq: AccountRecoveryRequest = {
    ...target,
    status: decision,
    adminNotes: adminNotes || '',
    reviewedBy: 'edsoncruz14999@gmail.com',
    reviewedAt: now,
  };

  const nextList = list.map((r) => (r.id === requestId ? updatedReq : r));
  saveLocalRecoveryRequests(nextList);

  if (decision === 'aprobada') {
    const accounts = getStoredIneAccounts();
    const cleanOld = target.oldEmail.trim().toLowerCase();
    const cleanNew = target.newEmail.trim().toLowerCase();
    const cleanPhone = target.phone.replace(/[^0-9]/g, '');

    const matchedOld = accounts.find(
      (a) =>
        a.email.toLowerCase() === cleanOld ||
        (cleanPhone && a.phone.replace(/[^0-9]/g, '') === cleanPhone)
    );

    const newDigits =
      (target.ine10Digits && target.ine10Digits.replace(/[^0-9]/g, '').length === 10
        ? target.ine10Digits.replace(/[^0-9]/g, '')
        : matchedOld?.ine10Digits) || '0000000000';

    saveIneAccount({
      id: matchedOld?.id || `cust-${cleanPhone || Date.now()}`,
      name: target.customerName || matchedOld?.name || 'Cliente RODO',
      phone: target.phone || matchedOld?.phone || '',
      email: cleanNew,
      ineVerified: true,
      ineDigits: newDigits,
      ine10Digits: newDigits,
      inePhotoUploaded: true,
      ineVerifiedAt: now,
      pendingDebt: matchedOld?.pendingDebt || 0,
      status: 'activo',
      completedOrdersCount: matchedOld?.completedOrdersCount || 0,
      referralCode: matchedOld?.referralCode,
      referralRewardsCount: matchedOld?.referralRewardsCount || 0,
      coupons: matchedOld?.coupons || [],
      createdAt: matchedOld?.createdAt || now,
    });
  }

  try {
    await apiFetch(`/api/auth/recovery/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: {
        status: decision,
        adminNotes: adminNotes || '',
        reviewedBy: 'edsoncruz14999@gmail.com',
      },
    });
  } catch (err) {
    console.warn('[API] Fallback local en resolución de recuperación:', err);
  }

  return updatedReq;
}

export function findApprovedRecoveryForEmail(email: string): AccountRecoveryRequest | null {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const local = getLocalRecoveryRequests();
  return (
    local.find(
      (r) => r.status === 'aprobada' && r.newEmail.trim().toLowerCase() === clean
    ) || null
  );
}

export async function findApprovedRecoveryForEmailAsync(
  email: string
): Promise<AccountRecoveryRequest | null> {
  const localMatch = findApprovedRecoveryForEmail(email);
  if (localMatch) return localMatch;

  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  try {
    const list = await apiFetch<AccountRecoveryRequest[]>(
      `/api/auth/recovery?newEmail=${encodeURIComponent(clean)}&status=aprobada`
    );
    if (Array.isArray(list) && list.length > 0) {
      return list[0];
    }
  } catch {}
  return null;
}

