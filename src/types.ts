export interface ProductCustomization {
  id: string;
  name: string; // ej: "Sin cebolla", "Sin queso", "Extra queso", "Extra chile"
  price: number; // 0 para remover ingrediente, > 0 para extra con costo adicional
  type: 'removal' | 'extra'; // removal = Sin..., extra = Extra...
}

export interface MenuItemOptionGroup {
  id: string;
  name: string;
  maxSelect: number;
  options: string[];
}

export interface ComboSideOption {
  id: string;
  name: string;
  description?: string;
  image: string;
  priceExtra?: number;
}

export interface ComboMainDishOption {
  id: string;
  name: string;
  description?: string;
  image: string;
  priceExtra?: number;
  isSpicy?: boolean;
}

export interface ComboBuilderConfig {
  maxGuisados: number; // 1, 2, 3 o 4 guisados
  allowDuplicateGuisados?: boolean;
  sideOptions: ComboSideOption[];
  mainDishOptions: ComboMainDishOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // Precio final al cliente (precio base + sobreprecio)
  originalPrice?: number; // Precio base del restaurante/local
  surcharge?: number; // Sobreprecio aplicado por RODO (comisión por platillo)
  image?: string;
  category?: string;
  isAvailable?: boolean; // true = disponible, false = agotado
  stockLevel?: number; // Nivel de inventario: 0 = Agotado, 1 a 3 = Últimas unidades, >3 = En existencia
  optionGroups?: MenuItemOptionGroup[];
  customizations?: ProductCustomization[]; // Opciones de extras o quitar ingredientes
  isComboBuilder?: boolean; // Platillo tipo combo por pasos (ej. Comida china 1, 2, 3 o 4 guisados)
  comboConfig?: ComboBuilderConfig;
}

export type EstablishmentType = 'restaurante' | 'motomandado';

export interface Restaurant {
  id: string;
  name: string;
  establishmentType: EstablishmentType; // 'restaurante' (factura, efectivo + transferencia) | 'motomandado' (no factura, solo efectivo)
  category: string;
  rating: string;
  reviews: string;
  time: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$'; // Rango de precio para filtros avanzados
  schedule?: string; // Horario de atención (ej: "12:00 PM – 10:30 PM")
  deliveryFee: number; // Tarifa individual de envío configurada por admin
  commissionRate: number; // Porcentaje (%) o cuota fija de comisión para RODO
  acceptsTransfer: boolean; // Si admin autorizó transferencia (solo para restaurantes que facturan)
  acceptsCash: boolean; // Si admin autorizó efectivo
  bankDetails?: string; // CLABE / Banco / Beneficiario si acepta transferencia
  image: string;
  tags: string[];
  badge?: string;
  description: string;
  isActive: boolean; // Activo en plataforma
  isOpen?: boolean; // true = abierto para recibir pedidos; false = cerrado temporalmente
  closureReason?: string; // Razón de cierre
  isPopular?: boolean; // Fijado manualmente como más popular en inicio
  popularityRank?: number; // Orden de prioridad (1, 2, 3...)
  orderCount?: number; // Contador de pedidos históricos
  suggestedExtras?: MenuItem[]; // Bebidas, postres o complementos sugeridos al pagar
  
  // Promociones aplicadas ÚNICAMENTE al sobreprecio (margen RODO):
  promoActive?: boolean;
  promoLabel?: string; // ej: "15% OFF en Sobreprecio"
  promoDiscountPercent?: number; // 10, 15 o 20%
  
  // Locales conocidos de San Miguel sin menú fijo (Pide lo que se te antoje):
  hasFixedMenu?: boolean; // true = tiene platillos; false = cliente anota lo que quiere y RODO cotiza
  customOrderHint?: string;

  // Tiempo de preparación configurable:
  prepTimeMinutes?: number; // ej: 15, 30, 45 min

  // Ubicación fija GPS y dirección del local configurada por el administrador:
  address?: LocalAddress;
  coordinates?: { lat: number; lng: number };
  mapsUrl?: string;

  // Control absoluto de sobreprecio (markup) y horarios por Edson:
  markupPercent?: number; // ej: 10 = +10% sobre el precio del local
  markupFixed?: number; // ej: 5 = +$5 pesos por platillo
  customServiceHours?: {
    open: string; // ej: "11:00"
    close: string; // ej: "23:00"
    enabled: boolean;
  };

  // Código PIN único de 3 dígitos (ej: "101", "104") asignado por Edson para despacho interno
  localCode?: string;

  menu: MenuItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  selectedOptions?: string[];
  isExtra?: boolean;
  surcharge?: number;
  stockLevel?: number; // Nivel de inventario sincronizado
  customizations?: string[]; // ej: ["Sin queso", "Extra carne (+ $25)"]
  selectedModifiers?: ProductCustomization[]; // Modificadores estructurados seleccionados
  unitExtraPrice?: number;
  comboDetails?: {
    sideName: string;
    mainDishes: Array<{ name: string; quantity: number }>;
  };
}

export interface BankVerificationData {
  trackingKey: string; // Clave de rastreo SPEI / Referencia
  senderBank?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedAmount?: number;
  statusMessage: string;
}

export interface LocalAddress {
  calle: string;
  numero: string;
  colonia: string;
  referencias?: string;
  lat?: number;
  lng?: number;
  mapsUrl?: string;
}

export interface PartnerLocal {
  id: string;
  code: string; // Código de 3 dígitos (ej: "101", "102", "205", etc.)
  name: string;
  phone: string;
  address: LocalAddress;
  serviceFee: number; // Tarifa individual fija que se cobra a este restaurante por reparto
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface FuelEmergencyDetails {
  liters: number; // 1, 2 o 3 litros
  fuelType: 'magna' | 'premium';
  fuelPricePerLiter: number;
  fuelTotal: number;
  serviceTravelFee: number;
  vehicleLocationNotes?: string;
}

export interface Order {
  pickupCoordinates?: { lat: number; lng: number };
  adminNextStatuses?: string[];
  quoteOfferedAt?: string;
  id: string;
  folio: string; // Folio único RD-AAMMDD-XXXXX
  orderType?: 'comida' | 'envio' | 'solicitud_local' | 'auxilio_gasolina' | 'pedido_personalizado' | 'local_no_encontrado';
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantDeliveryFee: number;
  restaurantCommissionRate: number;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  commissionAmount: number; // Ganancia RODO calculada
  
  // Entrega Express / Programada / Normal:
  deliveryType?: 'normal' | 'express' | 'programada';
  deliveryTypeSurcharge?: number;
  scheduledDeliveryTime?: string;
  
  // Propina repartidor (5%, 10%, 15%, 20%):
  tipPercentage?: number;
  tipAmount?: number;
  
  // Promoción sobre sobreprecio o código promocional:
  promoCode?: string;
  promoDiscountType?: 'percent' | 'delivery_free' | 'delivery_discount';
  promoDiscountApplied?: number;
  promoLabel?: string;

  // Pedidos sin menú / Cotización de mandado:
  isCustomQuote?: boolean;
  customOrderText?: string;
  quoteConfirmedByCustomer?: boolean;

  // Auxilio de Gasolina de Emergencia:
  fuelDetails?: FuelEmergencyDetails;

  total: number;
  paymentMethod: 'efectivo' | 'transferencia';
  paymentStatus: 'pendiente' | 'verificado' | 'en_efectivo';
  bankVerification?: BankVerificationData;
  pickupAddress?: string;
  pickupPhone?: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  packageType?: 'documentos' | 'flores' | 'articulos' | 'mandados' | 'gasolina';
  
  // Estados con llegada afuera del domicilio y cotización
  status: 'nuevo' | 'en_preparacion' | 'asignado' | 'recolectado' | 'en_camino' | 'afuera_del_domicilio' | 'entregado' | 'cancelado' | 'cancelado_con_deuda' | 'pendiente_cotizacion';
  
  // Notificación de repartidor afuera y cuenta regresiva de 10 minutos:
  arrivalNotifiedAt?: string;
  arrivalExpiresAt?: string; // timestamp límite (+10 minutos)
  customerNotifiedOutside?: boolean;

  cancellationDebtAmount?: number;
  cancellationReason?: string;
  assignedRiderName?: string;
  assignedRiderPhone?: string;
  assignedRiderUserId?: string;
  assignedRidersList?: string[];
  localCode?: string;
  ridersRequestedCount?: number;
  urgencyTiming?: string;
  mapsUrl?: string;
  coordinates?: { lat: number; lng: number };
  
  // Optimización de mapas, rutas y cálculo de distancias:
  distanceKm?: number;
  routeEstimateMinutes?: number;
  routePathSummary?: string;

  // Calificación del servicio post-entrega (1 a 5 estrellas)
  rating?: number; // Calificación general
  riderRating?: number; // Calificación específica del servicio del repartidor
  foodRating?: number; // Calificación de la calidad del producto / comida
  ratingComment?: string;
  ratedAt?: string;

  // Confirmación de recepción por el cliente al momento de la entrega
  receptionConfirmed?: boolean;
  receptionConfirmedAt?: string;

  // Evidencia de entrega: Firma digital simple o foto de entrega
  deliverySignatureDataUrl?: string;
  deliveryProofPhotoUrl?: string;
  deliveryConfirmedBySignature?: boolean;
  deliverySignatureAt?: string;

  // Ubicación GPS en tiempo real del repartidor
  riderLiveCoordinates?: { lat: number; lng: number };
  riderLastLocationUpdate?: string;

  // Entrega Programada con Confirmación Previa Obligatoria
  scheduledDeliveryDate?: string;
  scheduledConfirmationStatus?: 'pendiente_confirmacion' | 'confirmado_por_cliente' | 'rechazado_o_sin_respuesta';
  scheduledReminderSentAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface AdminMiddlewareLogEntry {
  id?: string;
  timestamp: string;
  action: string;
  user_id: string;
  previous_value?: any;
  new_value?: any;
  details?: string;
  affected_restaurant?: string;
  affected_folio?: string;
}

export interface SpecialtyCategory {
  id: string;
  name: string;
  iconType: 'super' | 'pizza' | 'desayuno' | 'pollo' | 'hamburguesa' | 'tacos' | 'mariscos' | 'pan' | 'tienda' | 'farmacia' | 'flores' | 'personalizado';
  iconUrl?: string;
  active: boolean;
  order: number;
  description?: string;
}

export interface CustomerCoupon {
  id: string;
  code: string;
  discount: number; // e.g. 50 MXN
  label: string;
  used: boolean;
  earnedAt: string;
  reason: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  role?: 'CUSTOMER' | 'RIDER' | 'PARTNER_LOCAL' | 'ADMIN';
  ineVerified: boolean;
  ineDigits?: string;
  ine10Digits?: string; // Los 10 dígitos extraídos del reverso de la credencial INE
  inePhotoUploaded?: boolean;
  ineVerifiedAt?: string;
  pendingDebt: number;
  debtReason?: string;
  debtOrderFolio?: string;
  debtDate?: string;
  status: 'activo' | 'bloqueado_fraude';
  fraudReason?: string;
  blockedAt?: string;
  completedOrdersCount?: number;
  
  // Sistema de Códigos de Referidos Antifraude
  referralCode?: string; // e.g. RODO-4921
  referredByCode?: string; // Código de quien lo invitó
  referralRewardsCount?: number; // Cuántos amigos se registraron e iniciaron sesión
  coupons?: CustomerCoupon[]; // Cupones ganados

  createdAt?: string;
}

export interface CoverageZone {
  id: string;
  name: string;
  active: boolean;
  radiusKm: number;
  referenceStreet: string;
  centerLat?: number;
  centerLng?: number;
}

export interface DispatchRider {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  userId?: string;
}

export interface RiderAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'activo' | 'bloqueado_fraude';
  createdAt: string;
}

export interface DispatchSettings {
  defaultRider1Name: string;
  defaultRider1Phone: string;
  defaultRider2Name: string;
  defaultRider2Phone: string;
  ridersList?: DispatchRider[];
  clabeRodo: string;
  bancoRodo: string;
  titularRodo: string;
  adminPasscode: string;
  expressDeliverySurcharge: number;
  expressDeliveryEnabled: boolean;
  scheduledDeliveryEnabled: boolean;
  magnaPricePerLiter: number;
  premiumPricePerLiter: number;
  
  // Modo Días Festivos / Fechas Especiales en San Miguel:
  festiveModeEnabled: boolean;
  festiveModeMessage: string;
  festiveEstimatedDelay: string;

  // Modo Lluvia: Pausa temporal de envíos por mal clima
  rainPauseEnabled?: boolean;
  rainPauseMessage?: string;

  // Teléfono central de ayuda y despacho
  supportPhone?: string; // 415-101-9920

  // Categorías y Especialidades configuradas por el administrador
  specialtiesCatalog?: SpecialtyCategory[];

  // Mapa de Cobertura y Trazado Perimetral:
  coverageZones: CoverageZone[];
  coveragePolygon?: { lat: number; lng: number }[]; // Límite perimetral trazado (de la orilla para adentro)

  // Tarifas base y por kilómetro configuradas por Edson:
  baseDeliveryTariff: number; // Tarifa base (ej: $35 MXN)
  tariffPerKm: number; // Tarifa por kilómetro adicional (ej: $7 MXN/km)
  globalMarkupPercent?: number; // Sobreprecio global en % (ej: 10%)
  globalMarkupFixed?: number; // Sobreprecio global fijo en pesos (ej: $5)
  autoRoutingEnabled?: boolean;

  // Temáticas Festivas y de Temporada (Navidad, Año Nuevo, 14 Feb, Día de las Madres, Día del Padre, Día del Grito, etc.):
  activeHolidayTheme?: HolidayThemeId;
  holidayThemeId?: HolidayThemeId;
}

export type HolidayThemeId =
  | 'clasico_rodo'
  | 'navidad'
  | 'ano_nuevo'
  | 'nochebuena'
  | 'san_valentin'
  | 'dia_de_las_madres'
  | 'dia_del_padre'
  | 'dia_del_grito';

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  actionType:
    | 'cambio_estatus'
    | 'ajuste_tarifa'
    | 'ajuste_sobreprecio'
    | 'edicion_menu'
    | 'cancelacion'
    | 'alta_restaurante'
    | 'despacho_repartidor'
    | 'seguridad_admin'
    | 'ajuste_configuracion'
    | 'alta_local'
    | 'baja_local'
    | 'baja_restaurante'
    | string;
  details: string;
  affectedFolio?: string;
  affectedRestaurant?: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  promoCode?: string;
  scheduledFor?: string;
  sendImmediately?: boolean;
  sentBy: string;
  createdAt: string;
}

export interface ExternalWebsiteWebhookPayload {
  sourceSite: string;
  orderId: string;
  folio: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  deliveryAddress: string;
  timestamp: string;
}

export interface AccountRecoveryRequest {
  id: string;
  folio: string;
  customerName: string;
  phone: string;
  oldEmail: string;
  newEmail: string;
  reason?: string;
  documentPhotoUrl?: string;
  ine10Digits?: string;
  status: 'pendiente' | 'en_revision' | 'aprobada' | 'rechazada';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}


