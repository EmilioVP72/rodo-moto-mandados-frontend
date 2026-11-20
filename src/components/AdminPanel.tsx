import React, { useState, useEffect } from 'react';
import {
  Restaurant,
  Order,
  DispatchSettings,
  MenuItem,
  PartnerLocal,
  SpecialtyCategory,
  DispatchRider,
  BroadcastNotification,
  AccountRecoveryRequest,
} from '../types';
import {
  saveRestaurant,
  deleteRestaurant,
  saveDispatchSettings,
  updateOrderInDb,
  buildWhatsAppDispatchMessage,
  generateWhatsAppLink,
  getPartnerLocals,
  savePartnerLocal,
  deletePartnerLocal,
  INITIAL_SPECIALTIES,
  sendBroadcastNotification,
  getBroadcastNotifications,
  getAccountRecoveryRequests,
  resolveAccountRecoveryRequest,
  saveAdminAuditLogToFirestore,
} from '../services/db';
import { dispatchRodoNotification } from '../services/notifications';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import {
  X,
  Bike,
  Plus,
  Trash2,
  Edit,
  DollarSign,
  Share2,
  CheckCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Receipt,
  Eye,
  RefreshCw,
  Sliders,
  Store,
  Wallet,
  LogOut,
  KeyRound,
  MapPin,
  Navigation,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  FileText,
  Download,
  Percent,
  Users,
  Map,
  Activity,
  Zap,
  BarChart3,
  Moon,
  Sun,
  ArrowLeft,
  Home,
  FolderArchive,
  Code2,
  History,
  Globe2,
  TrendingUp,
  Bell,
  Send,
  CloudRain,
  LifeBuoy,
  MessageCircle,
  Archive,
  Menu,
} from 'lucide-react';
import { AdminOrderHistoryView } from './AdminOrderHistoryView';
import {
  AdminSidebarNav,
  AdminTabId,
  buildAdminNavGroups,
  getAdminTabMeta,
} from './AdminSidebarNav';
import { splitLiveAndArchivedOrders } from '../utils/orderHistoryFilter';
import { AdminCoverageMap } from './AdminCoverageMap';
import { AdminSecurityAndFraud } from './AdminSecurityAndFraud';
import { RodoOtpDiagnostics } from './RodoOtpDiagnostics';
import { SecurityOtpModal } from './SecurityOtpModal';
import { SecurityOtpAction, createOtpChallenge } from '../utils/securityOtp';
import { OrderStatisticsView } from './OrderStatisticsView';
import { AdminAuditLogView } from './AdminAuditLogView';
import { AdminExternalIntegrationView } from './AdminExternalIntegrationView';
import { AdminGoogleMapsDirectionsModal } from './AdminGoogleMapsDirectionsModal';
import { AdminPerformanceMetricsView } from './AdminPerformanceMetricsView';
import { logAdminAction } from '../services/orderQueue';
import { HOLIDAY_THEMES_ARRAY, getHolidayTheme } from '../utils/themeManager';
import { HolidayThemeId } from '../types';

interface AdminPanelProps {
  restaurants: Restaurant[];
  orders: Order[];
  settings: DispatchSettings;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
  onOpenTicket: (order: Order) => void;
  onLogoutAdmin?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  restaurants,
  orders,
  settings,
  onClose,
  onRefreshData,
  onOpenTicket,
  onLogoutAdmin,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>('despacho');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [liveClockMs, setLiveClockMs] = useState<number>(() => Date.now());

  // Ticker cada 60 segundos para limpiar automáticamente pedidos mayores a 24 h en Despacho en Vivo
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveClockMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [selectedRouteOrder, setSelectedRouteOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [activeChallenge, setActiveChallenge] = useState<SecurityOtpAction | null>(null);
  const [pendingCancelOrder, setPendingCancelOrder] = useState<Order | null>(null);
  const [themeSavedFeedback, setThemeSavedFeedback] = useState(false);

  // Estados para Programar Notificación de Marketing ("Enviar a todos")
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPromoCode, setBroadcastPromoCode] = useState('');
  const [broadcastScheduleAt, setBroadcastScheduleAt] = useState('');
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastNotification[]>([]);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Estados para Recuperación de Cuentas & Pausa por Lluvia
  const [recoveryRequests, setRecoveryRequests] = useState<AccountRecoveryRequest[]>([]);
  const [recoveryNotesMap, setRecoveryNotesMap] = useState<Record<string, string>>({});
  const [isTogglingRain, setIsTogglingRain] = useState(false);

  // Estados para Cambio de Contraseña de Administrador (Requiere Código 1999)
  const [authMasterCodeInput, setAuthMasterCodeInput] = useState('');
  const [newAdminPassInput, setNewAdminPassInput] = useState('');
  const [confirmAdminPassInput, setConfirmAdminPassInput] = useState('');
  const [adminPassError, setAdminPassError] = useState('');
  const [adminPassSuccess, setAdminPassSuccess] = useState('');
  const [showNewPassText, setShowNewPassText] = useState(false);

  // Estados para Administrador de Especialidades / Categorías Uber Eats
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newSpecialtyIcon, setNewSpecialtyIcon] = useState<SpecialtyCategory['iconType']>('super');
  const [newSpecialtyDesc, setNewSpecialtyDesc] = useState('');

  // Estados para Locales Asociados (Códigos de 3 dígitos)
  const [partnerLocals, setPartnerLocals] = useState<PartnerLocal[]>([]);
  const [editingPartnerLocal, setEditingPartnerLocal] = useState<PartnerLocal | null>(null);
  const [isCreatingPartnerLocal, setIsCreatingPartnerLocal] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingDishUrlItem, setEditingDishUrlItem] = useState<{ id: string; url: string } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackNotice({ type, text });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const loadLocals = async () => {
    const list = await getPartnerLocals();
    setPartnerLocals(list);
  };

  const loadBroadcasts = async () => {
    const list = await getBroadcastNotifications();
    setBroadcastHistory(list);
  };

  const loadRecoveryRequests = async () => {
    const list = await getAccountRecoveryRequests();
    setRecoveryRequests(list);
  };

  useEffect(() => {
    loadLocals();
    loadBroadcasts();
    loadRecoveryRequests();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showFeedback('Escribe el título y el mensaje de marketing antes de enviar.', 'error');
      return;
    }
    setIsSendingBroadcast(true);
    try {
      const notif: BroadcastNotification = {
        id: `bcast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        promoCode: broadcastPromoCode.trim().toUpperCase() || undefined,
        scheduledFor: broadcastScheduleAt.trim() || undefined,
        sendImmediately: !broadcastScheduleAt.trim(),
        sentBy: 'edsoncruz14999@gmail.com',
        createdAt: new Date().toISOString(),
      };
      await sendBroadcastNotification(notif);
      dispatchRodoNotification(
        `📣 ${notif.title}`,
        `${notif.message}${notif.promoCode ? ` · Cupón: ${notif.promoCode}` : ''}`,
        { type: 'info', playSound: true }
      );
      logAdminAction(
        'ajuste_configuracion',
        `Enviada notificación masiva "${notif.title}" a todos los clientes`,
        'edsoncruz14999@gmail.com'
      );
      setBroadcastHistory((prev) => [notif, ...prev]);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastPromoCode('');
      setBroadcastScheduleAt('');
      showFeedback('📣 Notificación enviada a todos los usuarios de RODO.');
    } catch {
      showFeedback('Error al enviar notificación masiva.', 'error');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleSavePartnerLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartnerLocal || !editingPartnerLocal.code.trim() || !editingPartnerLocal.name.trim()) {
      showFeedback('Ingresa el código de 3 dígitos y el nombre del local.', 'error');
      return;
    }
    if (editingPartnerLocal.code.trim().length !== 3) {
      showFeedback('El código debe ser exactamente de 3 dígitos (ej: 101, 102, 205).', 'error');
      return;
    }
    await savePartnerLocal(editingPartnerLocal);
    await loadLocals();
    logAdminAction(
      'ajuste_tarifa',
      `Asignado código PIN #${editingPartnerLocal.code} al local "${editingPartnerLocal.name}"`,
      'edsoncruz14999@gmail.com',
      undefined,
      editingPartnerLocal.name
    );
    setEditingPartnerLocal(null);
    setIsCreatingPartnerLocal(false);
    showFeedback(`Local "${editingPartnerLocal.name}" guardado exitosamente.`);
  };

  const handleDeletePartnerLocal = async (id: string, name: string) => {
    await deletePartnerLocal(id);
    await loadLocals();
    logAdminAction(
      'ajuste_tarifa',
      `Eliminado local "${name}" (${id}) y su código PIN del sistema`,
      'edsoncruz14999@gmail.com',
      undefined,
      name
    );
    showFeedback(`Código y acceso de ${name} eliminados.`);
  };

  // Estados para edición de restaurantes
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [isCreatingRestaurant, setIsCreatingRestaurant] = useState(false);

  // Estados para ajustes
  const [currentSettings, setCurrentSettings] = useState<DispatchSettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Estado para nuevo ítem de menú en edición
  const [newMenuItem, setNewMenuItem] = useState<MenuItem>({
    id: '',
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    surcharge: 0,
    image: '',
    category: 'General',
    isAvailable: true,
  });

  // Estado para configurar personalizaciones/extras de platillos (Admin)
  const [editingCustomizationsDish, setEditingCustomizationsDish] = useState<MenuItem | null>(null);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomPrice, setNewCustomPrice] = useState(0);
  const [newCustomType, setNewCustomType] = useState<'removal' | 'extra'>('removal');

  // Compresión y optimización automática de imágenes para almacenamiento ágil en Firestore
  const compressImageFile = (file: File, maxWidth = 800, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(img.src);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUploadRestaurantPhoto = async (file: File) => {
    if (!editingRestaurant) return;
    try {
      const base64 = await compressImageFile(file, 900, 0.75);
      setEditingRestaurant({ ...editingRestaurant, image: base64 });
      showFeedback('Foto del restaurante actualizada.');
    } catch (err) {
      console.error(err);
      showFeedback('No se pudo procesar la foto del restaurante.', 'error');
    }
  };

  const handleUploadNewDishPhoto = async (file: File) => {
    try {
      const base64 = await compressImageFile(file, 600, 0.7);
      setNewMenuItem((prev) => ({ ...prev, image: base64 }));
      showFeedback('Foto del platillo cargada.');
    } catch (err) {
      console.error(err);
      showFeedback('No se pudo procesar la foto del platillo.', 'error');
    }
  };

  const handleUploadExistingDishPhoto = async (itemId: string, file: File) => {
    if (!editingRestaurant) return;
    try {
      const base64 = await compressImageFile(file, 600, 0.7);
      setEditingRestaurant({
        ...editingRestaurant,
        menu: editingRestaurant.menu.map((m) =>
          m.id === itemId ? { ...m, image: base64 } : m
        ),
      });
      showFeedback('Foto del platillo actualizada.');
    } catch (err) {
      console.error(err);
      showFeedback('No se pudo procesar la foto del platillo.', 'error');
    }
  };

  const handlePromptDishPhotoUrl = (itemId: string, currentUrl?: string) => {
    if (!editingRestaurant) return;
    setEditingDishUrlItem({ id: itemId, url: currentUrl || '' });
  };

  // Separación operativa 24 horas: Despacho en Vivo solo muestra las últimas 24 h; el resto pasa al Histórico de Pedidos
  const { liveOrders, archivedOrders } = splitLiveAndArchivedOrders(orders, liveClockMs);

  // Filtrado de órdenes activas en Despacho en Vivo (últimas 24 horas)
  const filteredOrders = liveOrders.filter((o) => {
    if (filterStatus === 'todos') return true;
    if (filterStatus === 'cancelado') {
      return o.status === 'cancelado' || o.status === 'cancelado_con_deuda';
    }
    return o.status === filterStatus;
  });

  // Cálculos de Corte Diario
  const today = new Date().toISOString().slice(0, 10);
  const todaysOrders = orders.filter((o) => o.createdAt.startsWith(today) && o.status !== 'cancelado');

  const totalVolume = todaysOrders.reduce((sum, o) => sum + o.total, 0);
  const totalSubtotals = todaysOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalDeliveryFees = todaysOrders.reduce((sum, o) => sum + o.deliveryFee, 0);
  const totalCommissions = todaysOrders.reduce((sum, o) => sum + (o.commissionAmount || (o.subtotal * (o.restaurantCommissionRate || 15) / 100)), 0);
  const totalRodoIncome = totalDeliveryFees + totalCommissions;

  const cashOrders = todaysOrders.filter((o) => o.paymentMethod === 'efectivo');
  const transferOrders = todaysOrders.filter((o) => o.paymentMethod === 'transferencia');
  
  // Regla obligatoria: Propinas en efectivo NO entran al corte diario (100% dinero en mano del repartidor)
  // Propinas en transferencia Sí entran al corte bancario central para dispersión
  const cashTipsTotal = cashOrders.reduce((sum, o) => sum + (o.tipAmount || 0), 0);
  const transferTipsTotal = transferOrders.reduce((sum, o) => sum + (o.tipAmount || 0), 0);

  const totalCashGross = cashOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCashRodoNet = totalCashGross - cashTipsTotal; // Excluye propinas en efectivo del repartidor
  const totalTransfer = transferOrders.reduce((sum, o) => sum + o.total, 0);

  // Guardar configuración de Ajustes
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDispatchSettings(currentSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
    logAdminAction(
      'ajuste_tarifa',
      `Configuración general guardada en Firestore (Tarifa base: $${currentSettings.baseDeliveryTariff || 35}, $/km: $${currentSettings.tariffPerKm || 7}, Margen global: ${currentSettings.globalMarkupPercent || 10}%, Tema: ${currentSettings.holidayThemeId || 'normal'})`,
      'edsoncruz14999@gmail.com',
      undefined,
      'Ajustes de Despacho RODO'
    );
  };

  // Repartidores (Hasta 10 números configurables con nombre para WhatsApp)
  const riders10List: DispatchRider[] = (currentSettings.ridersList && currentSettings.ridersList.length >= 10)
    ? currentSettings.ridersList
    : [
        { id: 'rider-1', name: currentSettings.defaultRider1Name || 'Moto 1 - Juan Principal', phone: currentSettings.defaultRider1Phone || '524151019920', isActive: true },
        { id: 'rider-2', name: currentSettings.defaultRider2Name || 'Moto 2 - Carlos Respaldo', phone: currentSettings.defaultRider2Phone || '524151019920', isActive: true },
        { id: 'rider-3', name: 'Moto 3 - Repartidor Centro', phone: '524151019920', isActive: true },
        { id: 'rider-4', name: 'Moto 4 - Repartidor Aurora', phone: '524151019920', isActive: true },
        { id: 'rider-5', name: 'Moto 5 - Repartidor San Antonio', phone: '524151019920', isActive: true },
        { id: 'rider-6', name: 'Moto 6 - Repartidor Malanquín', phone: '524151019920', isActive: false },
        { id: 'rider-7', name: 'Moto 7 - Repartidor Estación', phone: '524151019920', isActive: false },
        { id: 'rider-8', name: 'Moto 8 - Repartidor Frailes', phone: '524151019920', isActive: false },
        { id: 'rider-9', name: 'Moto 9 - Guardia Nocturna', phone: '524151019920', isActive: false },
        { id: 'rider-10', name: 'Moto 10 - Apoyo Fin de Semana', phone: '524151019920', isActive: false },
      ];

  const handleUpdateRider = (idx: number, updates: Partial<DispatchRider>) => {
    const updated = [...riders10List];
    updated[idx] = { ...updated[idx], ...updates };
    const newSettings: DispatchSettings = {
      ...currentSettings,
      ridersList: updated,
      defaultRider1Name: updated[0]?.name || currentSettings.defaultRider1Name,
      defaultRider1Phone: updated[0]?.phone || currentSettings.defaultRider1Phone,
      defaultRider2Name: updated[1]?.name || currentSettings.defaultRider2Name,
      defaultRider2Phone: updated[1]?.phone || currentSettings.defaultRider2Phone,
    };
    setCurrentSettings(newSettings);
  };

  const handleChangeAdminPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError('');
    setAdminPassSuccess('');

    if (authMasterCodeInput.trim() !== '1999') {
      setAdminPassError('Código de autorización incorrecto. Se requiere estrictamente el código maestro 1999 para autorizar el cambio de contraseña de administrador.');
      return;
    }

    if (!newAdminPassInput.trim() || newAdminPassInput.trim().length < 4) {
      setAdminPassError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newAdminPassInput.trim() !== confirmAdminPassInput.trim()) {
      setAdminPassError('Las contraseñas no coinciden. Por favor verifica que sean exactamente iguales.');
      return;
    }

    const updatedSettings = {
      ...currentSettings,
      adminPasscode: newAdminPassInput.trim(),
    };
    setCurrentSettings(updatedSettings);
    await saveDispatchSettings(updatedSettings);
    logAdminAction(
      'ajuste_tarifa',
      'Contraseña maestra de Administrador actualizada exitosamente con código de autorización 1999',
      'edsoncruz14999@gmail.com',
      undefined,
      'Seguridad de Acceso RODO'
    );
    setAdminPassSuccess('¡Contraseña de Administrador actualizada con éxito! A partir de ahora ingresa con tu nueva clave.');
    setAuthMasterCodeInput('');
    setNewAdminPassInput('');
    setConfirmAdminPassInput('');
  };

  // Selector y Guardado de Temática Festiva (Navidad, Año Nuevo, 14 Feb, Día de las Madres, Día del Padre, Día del Grito, RODO)
  const handleSelectHolidayTheme = async (themeId: HolidayThemeId) => {
    const updated = { ...currentSettings, activeHolidayTheme: themeId };
    setCurrentSettings(updated);
    await saveDispatchSettings(updated);
    setThemeSavedFeedback(true);
    setTimeout(() => setThemeSavedFeedback(false), 3000);
  };

  // Gestión de Especialidades / Carrusel estilo Uber Eats
  const currentSpecialties: SpecialtyCategory[] = currentSettings.specialtiesCatalog && currentSettings.specialtiesCatalog.length > 0
    ? currentSettings.specialtiesCatalog
    : INITIAL_SPECIALTIES;

  const handleToggleSpecialty = async (id: string) => {
    const updated = currentSpecialties.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    const newSettings = { ...currentSettings, specialtiesCatalog: updated };
    setCurrentSettings(newSettings);
    await saveDispatchSettings(newSettings);
  };

  const handleAddSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecialtyName.trim()) {
      showFeedback('Ingresa el nombre de la especialidad', 'error');
      return;
    }
    const newCat: SpecialtyCategory = {
      id: 'sp-' + Date.now().toString(36),
      name: newSpecialtyName.trim(),
      iconType: newSpecialtyIcon,
      description: newSpecialtyDesc.trim() || undefined,
      active: true,
      order: currentSpecialties.length + 1,
    };
    const updated = [...currentSpecialties, newCat];
    const newSettings = { ...currentSettings, specialtiesCatalog: updated };
    setCurrentSettings(newSettings);
    await saveDispatchSettings(newSettings);
    setNewSpecialtyName('');
    setNewSpecialtyDesc('');
    showFeedback(`Especialidad "${newCat.name}" agregada exitosamente.`);
  };

  const handleDeleteSpecialty = async (id: string, name: string) => {
    const updated = currentSpecialties.filter((s) => s.id !== id);
    const newSettings = { ...currentSettings, specialtiesCatalog: updated };
    setCurrentSettings(newSettings);
    await saveDispatchSettings(newSettings);
    showFeedback(`Categoría "${name}" eliminada.`);
  };

  // Abrir formulario para nuevo restaurante
  const handleInitNewRestaurant = () => {
    setEditingRestaurant({
      id: 'rest-' + Math.random().toString(36).substring(2, 8),
      name: '',
      establishmentType: 'restaurante',
      category: 'Tacos',
      rating: '5.0',
      reviews: '0',
      time: '20–30 min',
      deliveryFee: 25,
      commissionRate: 15,
      acceptsTransfer: true,
      acceptsCash: true,
      bankDetails: currentSettings.clabeRodo ? `CLABE ${currentSettings.clabeRodo} · ${currentSettings.bancoRodo}` : '',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=85',
      tags: ['Local', 'Comida'],
      badge: 'Nuevo',
      description: '',
      isActive: true,
      isOpen: true,
      schedule: '12:00 PM – 10:00 PM',
      closureReason: '',
      menu: [],
    });
    setIsCreatingRestaurant(true);
  };

  // Guardar restaurante
  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant || !editingRestaurant.name.trim()) {
      return;
    }
    const cleanBadge = (editingRestaurant.badge || '')
      .replace(/·?\s*PIN\s*#?\d+/gi, '')
      .replace(/PIN\s*#?\d+/gi, '')
      .trim();

    const cleanRestaurant: Restaurant = {
      ...editingRestaurant,
      badge: cleanBadge,
    };

    await saveRestaurant(cleanRestaurant);

    // Sincronizar PIN asignado con la base de datos de locales internos
    if (cleanRestaurant.localCode && cleanRestaurant.localCode.trim().length === 3) {
      await savePartnerLocal({
        id: 'loc-' + cleanRestaurant.id.replace(/[^a-zA-Z0-9_-]/g, ''),
        code: cleanRestaurant.localCode.trim(),
        name: cleanRestaurant.name,
        phone: '4151019920',
        serviceFee: cleanRestaurant.deliveryFee || 35,
        address: cleanRestaurant.address || {
          calle: 'Centro',
          numero: 'S/N',
          colonia: 'Centro',
          lat: cleanRestaurant.coordinates?.lat || 20.9144,
          lng: cleanRestaurant.coordinates?.lng || -100.7437,
        },
        isActive: cleanRestaurant.isActive !== false,
      });
      await loadLocals();
    }

    await onRefreshData();
    logAdminAction(
      'edicion_menu',
      `Restaurante "${cleanRestaurant.name}" guardado (Menú con ${cleanRestaurant.menu.length} platillos, tarifa envío $${cleanRestaurant.deliveryFee}, sobreprecio +${cleanRestaurant.markupPercent || 0}% / +$${cleanRestaurant.markupFixed || 0} MXN)`,
      'edsoncruz14999@gmail.com',
      undefined,
      cleanRestaurant.name
    );
    setEditingRestaurant(null);
    setIsCreatingRestaurant(false);
    showFeedback(`Restaurante "${cleanRestaurant.name}" guardado exitosamente.`);
  };

  // Eliminar restaurante
  const handleDeleteRestaurant = async (id: string, name: string) => {
    await deleteRestaurant(id);
    await onRefreshData();
    logAdminAction(
      'edicion_menu',
      `Restaurante "${name}" (${id}) eliminado del catálogo`,
      'edsoncruz14999@gmail.com',
      undefined,
      name
    );
  };

  // Cambiar disponibilidad del restaurante de forma directa (1 clic para desfiles/eventos)
  const handleDirectToggleRestaurantOpen = async (restaurant: Restaurant) => {
    const isCurrentlyOpen = restaurant.isOpen !== false;
    await saveRestaurant({
      ...restaurant,
      isOpen: !isCurrentlyOpen,
      closureReason: isCurrentlyOpen ? (restaurant.closureReason || 'Cerrado temporalmente por desfile o evento vial en San Miguel') : '',
    });
    await onRefreshData();
    logAdminAction(
      'edicion_menu',
      `Restaurante "${restaurant.name}" ${isCurrentlyOpen ? 'marcado CERRADO por evento vial/desfile' : 'marcado ABIERTO'}`,
      'edsoncruz14999@gmail.com',
      undefined,
      restaurant.name
    );
  };

  // Cambiar disponibilidad de platillo (Disponible / Agotado) de forma directa desde la tarjeta (1 clic)
  const handleDirectToggleMenuItem = async (restaurant: Restaurant, itemId: string) => {
    const targetItem = restaurant.menu.find((m) => m.id === itemId);
    const newStatus = targetItem?.isAvailable === false ? true : false;
    const updatedMenu = restaurant.menu.map((m) =>
      m.id === itemId ? { ...m, isAvailable: newStatus } : m
    );
    await saveRestaurant({ ...restaurant, menu: updatedMenu });
    await onRefreshData();
    logAdminAction(
      'edicion_menu',
      `Platillo "${targetItem?.name || itemId}" en "${restaurant.name}" marcado como ${newStatus ? 'DISPONIBLE' : 'AGOTADO'}`,
      'edsoncruz14999@gmail.com',
      undefined,
      restaurant.name
    );
  };

  // Cambiar disponibilidad de platillo dentro del formulario de edición
  const handleToggleItemInEdit = (itemId: string) => {
    if (!editingRestaurant) return;
    setEditingRestaurant({
      ...editingRestaurant,
      menu: editingRestaurant.menu.map((m) =>
        m.id === itemId ? { ...m, isAvailable: m.isAvailable === false ? true : false } : m
      ),
    });
  };

  // Agregar platillo al menú con cálculo de sobreprecio
  const handleAddMenuItem = () => {
    const original = Number(newMenuItem.originalPrice) || 0;
    const sur = Number(newMenuItem.surcharge) || 0;
    const finalPrice = Number(newMenuItem.price) || (original + sur);

    if (!editingRestaurant || !newMenuItem.name.trim() || finalPrice <= 0) {
      return;
    }
    const item: MenuItem = {
      ...newMenuItem,
      id: 'item-' + Math.random().toString(36).substring(2, 7),
      price: finalPrice,
      originalPrice: original || finalPrice - sur,
      surcharge: sur,
      isAvailable: true,
    };
    setEditingRestaurant({
      ...editingRestaurant,
      menu: [...editingRestaurant.menu, item],
    });
    setNewMenuItem({
      id: '',
      name: '',
      description: '',
      price: 0,
      originalPrice: 0,
      surcharge: 0,
      category: 'General',
      isAvailable: true,
    });
  };

  // Eliminar platillo del menú
  const handleRemoveMenuItem = (itemId: string) => {
    if (!editingRestaurant) return;
    setEditingRestaurant({
      ...editingRestaurant,
      menu: editingRestaurant.menu.filter((m) => m.id !== itemId),
    });
  };

  // Métodos para gestionar personalizaciones / extras de platillos (Admin)
  const handleAddCustomizationToDish = (name: string, price: number, type: 'removal' | 'extra') => {
    if (!editingRestaurant || !editingCustomizationsDish || !name.trim()) return;
    const newCust = {
      id: 'cust-' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      price: type === 'removal' ? 0 : price,
      type,
    };
    const updatedDish = {
      ...editingCustomizationsDish,
      customizations: [...(editingCustomizationsDish.customizations || []), newCust],
    };
    setEditingCustomizationsDish(updatedDish);
    setEditingRestaurant({
      ...editingRestaurant,
      menu: editingRestaurant.menu.map((m) => (m.id === updatedDish.id ? updatedDish : m)),
    });
    setNewCustomName('');
    setNewCustomPrice(0);
  };

  const handleRemoveCustomizationFromDish = (custId: string) => {
    if (!editingRestaurant || !editingCustomizationsDish) return;
    const updatedDish = {
      ...editingCustomizationsDish,
      customizations: (editingCustomizationsDish.customizations || []).filter((c) => c.id !== custId),
    };
    setEditingCustomizationsDish(updatedDish);
    setEditingRestaurant({
      ...editingRestaurant,
      menu: editingRestaurant.menu.map((m) => (m.id === updatedDish.id ? updatedDish : m)),
    });
  };

  const handleApplyDishPresets = (presetType: 'burger' | 'tacos' | 'pizzas') => {
    if (!editingRestaurant || !editingCustomizationsDish) return;
    let presets: any[] = [];
    if (presetType === 'burger') {
      presets = [
        { id: 'bur-1', name: 'Sin queso', price: 0, type: 'removal' },
        { id: 'bur-2', name: 'Sin chile / jalapeño', price: 0, type: 'removal' },
        { id: 'bur-3', name: 'Sin cebolla', price: 0, type: 'removal' },
        { id: 'bur-4', name: 'Extra queso fundido', price: 15, type: 'extra' },
        { id: 'bur-5', name: 'Extra chile toreado', price: 10, type: 'extra' },
        { id: 'bur-6', name: 'Extra tocino crujiente', price: 20, type: 'extra' },
      ];
    } else if (presetType === 'tacos') {
      presets = [
        { id: 'tac-1', name: 'Sin cebolla', price: 0, type: 'removal' },
        { id: 'tac-2', name: 'Sin cilantro', price: 0, type: 'removal' },
        { id: 'tac-3', name: 'Sin salsa', price: 0, type: 'removal' },
        { id: 'tac-4', name: 'Extra queso fundido', price: 15, type: 'extra' },
        { id: 'tac-5', name: 'Extra carne', price: 25, type: 'extra' },
      ];
    } else {
      presets = [
        { id: 'piz-1', name: 'Sin orilla dorada', price: 0, type: 'removal' },
        { id: 'piz-2', name: 'Extra queso mozzarella', price: 20, type: 'extra' },
        { id: 'piz-3', name: 'Extra pepperoni', price: 20, type: 'extra' },
        { id: 'piz-4', name: 'Extra champiñones', price: 15, type: 'extra' },
      ];
    }
    const updatedDish = {
      ...editingCustomizationsDish,
      customizations: presets,
    };
    setEditingCustomizationsDish(updatedDish);
    setEditingRestaurant({
      ...editingRestaurant,
      menu: editingRestaurant.menu.map((m) => (m.id === updatedDish.id ? updatedDish : m)),
    });
  };

  // Cambiar estado de orden
  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    await updateOrderInDb(orderId, { status: newStatus });
    logAdminAction(
      'cambio_estatus',
      `Orden ${targetOrder?.folio || orderId} cambió de estado a "${newStatus}"`,
      'edsoncruz14999@gmail.com',
      targetOrder?.folio,
      targetOrder?.restaurantName,
      targetOrder?.status,
      newStatus
    );
    await onRefreshData();
  };

  // Validar transferencia bancaria manualmente
  const handleVerifyBankPayment = async (orderId: string) => {
    await updateOrderInDb(orderId, {
      paymentStatus: 'verificado',
      bankVerification: {
        trackingKey: 'MANUAL-ADMIN-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        statusMessage: 'Verificado manualmente por el administrador en cuenta bancaria.',
        verified: true,
        verifiedAt: new Date().toLocaleTimeString('es-MX'),
      },
    });
    await onRefreshData();
  };

  // Notificar al cliente que el repartidor está afuera (+10 minutos)
  const handleNotifyArrivalOutside = async (order: Order) => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await updateOrderInDb(order.id, {
      status: 'afuera_del_domicilio',
      arrivalNotifiedAt: new Date().toISOString(),
      arrivalExpiresAt: expiresAt,
      customerNotifiedOutside: true,
    });
    const text = `🏍️ *¡RODO MOTO MANDADOS LLEGÓ A TU DOMICILIO!*
━━━━━━━━━━━━━━━━━━━━
📌 *Folio:* ${order.folio}
👋 Hola *${order.customerName}*, tu repartidor ya se encuentra *afuera de tu domicilio* listo para entregarte tu pedido.
📍 *Dirección:* ${order.deliveryAddress}

⏱️ *TIEMPO LÍMITE DE RECEPCIÓN:*
Cuentas con *10 minutos de tolerancia* para salir a recibir al repartidor.
⚠️ *Por seguridad de la ruta, si el pedido no se recibe en 10 minutos se dará por cancelado con registro de cobro.*

🎫 *Ticket en vivo:* ${window.location.origin}/?ticket=${order.folio}

_RODO Moto Mandados · San Miguel de Allende_`;
    window.open(`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    await onRefreshData();
  };

  // Cancelar orden con verificación criptográfica OTP
  const handleCancelWithOtp = (order: Order) => {
    setPendingCancelOrder(order);
    const challenge = createOtpChallenge(
      'cancel_order_fraud',
      `Cancelación de Orden por Incomparecencia / Fraude: ${order.folio}`,
      `Cliente: ${order.customerName} (${order.customerPhone}) · Total: $${order.total.toFixed(2)}`
    );
    setActiveChallenge(challenge);
  };

  const handleConfirmCancelAfterOtp = async () => {
    if (!pendingCancelOrder) return;
    await updateOrderInDb(pendingCancelOrder.id, {
      status: 'cancelado_con_deuda',
      cancellationReason: 'Cliente no salió al domicilio en el lapso de 10 minutos de tolerancia.',
      cancellationDebtAmount: pendingCancelOrder.total,
    });
    setPendingCancelOrder(null);
    setActiveChallenge(null);
    await onRefreshData();
  };

  // Botones de navegación para retroceder e ir al inicio dentro del Administrador
  const handleAdminBack = () => {
    if (editingRestaurant) {
      setEditingRestaurant(null);
      setIsCreatingRestaurant(false);
      setEditingCustomizationsDish(null);
      return;
    }
    if (activeTab !== 'despacho') {
      setActiveTab('despacho');
      return;
    }
    onClose();
  };

  const handleAdminGoHome = () => {
    setEditingRestaurant(null);
    setIsCreatingRestaurant(false);
    setEditingCustomizationsDish(null);
    setActiveTab('despacho');
  };

  const handleSelectAdminTab = (tab: AdminTabId) => {
    setActiveTab(tab);
    if (tab === 'recuperacion') {
      loadRecoveryRequests();
    }
  };

  const navGroups = buildAdminNavGroups({
    newLiveOrders: liveOrders.filter((o) => o.status === 'nuevo').length,
    totalHistoryOrders: orders.length,
    partnerLocalsCount: partnerLocals.length,
    activeSpecialtiesCount: currentSpecialties.filter((s) => s.active).length,
    pendingRecoveriesCount: recoveryRequests.filter((r) => r.status === 'pendiente').length,
  });

  const activeTabMeta = getAdminTabMeta(activeTab, navGroups);

  // KPIs operativos de las últimas 24 horas para Despacho en Vivo
  const liveNewCount = liveOrders.filter((o) => o.status === 'nuevo').length;
  const liveInProgressCount = liveOrders.filter((o) =>
    ['en_preparacion', 'asignado', 'recolectado', 'en_camino', 'afuera_del_domicilio', 'pendiente_cotizacion'].includes(
      o.status
    )
  ).length;
  const liveDeliveredCount = liveOrders.filter((o) => o.status === 'entregado').length;
  const liveRevenue24h = liveOrders
    .filter((o) => o.status !== 'cancelado' && o.status !== 'cancelado_con_deuda')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 lg:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-100 dark:bg-[#070a10] text-slate-900 dark:text-slate-100 rounded-none sm:rounded-2xl w-full max-w-7xl h-[100dvh] sm:h-[94vh] flex flex-row shadow-2xl overflow-hidden border-0 sm:border border-slate-300 dark:border-slate-800">
        {/* Sidebar de Navegación Categorizada (Escritorio fijo + Drawer en Móvil) */}
        <AdminSidebarNav
          groups={navGroups}
          activeTab={activeTab}
          onSelectTab={handleSelectAdminTab}
          mobileDrawerOpen={mobileNavOpen}
          onCloseMobileDrawer={() => setMobileNavOpen(false)}
        />

        {/* Columna Principal del Workspace */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
          {/* Cabecera Limpia con Título de Sección Activa y Acciones Globales */}
          <header className="bg-white dark:bg-[#0d121d] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-3 pt-safe flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Abrir menú de secciones"
                className="lg:hidden flex items-center gap-1.5 bg-[#0b1220] hover:bg-black text-white px-2.5 h-9 rounded-xl text-xs font-black shrink-0 cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                <span>Menú</span>
              </button>

              <div className="min-w-0">
                <h2 className="font-black text-sm sm:text-lg text-slate-900 dark:text-white leading-tight truncate">
                  {activeTabMeta.label}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                  {activeTabMeta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                disabled={isTogglingRain}
                onClick={async () => {
                  setIsTogglingRain(true);
                  const nextRainState = !currentSettings.rainPauseEnabled;
                  const nextSettings = {
                    ...currentSettings,
                    rainPauseEnabled: nextRainState,
                    rainPauseMessage:
                      currentSettings.rainPauseMessage ||
                      '🌧️ Envíos pausados temporalmente por lluvia intensa en San Miguel de Allende. Reanudaremos en cuanto mejore el clima.',
                  };
                  setCurrentSettings(nextSettings);
                  try {
                    await saveDispatchSettings(nextSettings);
                    await saveAdminAuditLogToFirestore({
                      id: `audit-rain-${Date.now()}`,
                      timestamp: new Date().toISOString(),
                      adminEmail: 'edsoncruz14999@gmail.com',
                      actionType: 'ajuste_configuracion',
                      details: nextRainState
                        ? 'Activó pausa temporal de envíos por lluvia'
                        : 'Reanudó envíos tras pausa por lluvia',
                      previousValue: currentSettings.rainPauseEnabled ? 'PAUSADO' : 'ACTIVO',
                      newValue: nextRainState ? 'PAUSADO' : 'ACTIVO',
                    });
                    await onRefreshData();
                    showFeedback(
                      nextRainState
                        ? '🌧️ Envíos PAUSADOS por lluvia. Los clientes verán el aviso de suspensión temporal.'
                        : '☀️ Envíos REANUDADOS normalmente.'
                    );
                  } finally {
                    setIsTogglingRain(false);
                  }
                }}
                title="Pausar o reanudar todos los envíos por lluvia"
                className={`flex items-center gap-1.5 text-xs px-2.5 sm:px-3 h-9 rounded-xl transition font-black border cursor-pointer shrink-0 whitespace-nowrap ${
                  currentSettings.rainPauseEnabled
                    ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-500 shadow-xs animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                }`}
              >
                <CloudRain className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">
                  {currentSettings.rainPauseEnabled ? 'Lluvia: PAUSADO' : 'Pausa Lluvia'}
                </span>
              </button>

              {onToggleDarkMode && (
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  aria-label={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Obscuro'}
                  title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Obscuro'}
                  className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-300 w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer shrink-0"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}

              {onLogoutAdmin && (
                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  title="Cerrar Sesión Administrador"
                  className="flex items-center gap-1.5 text-xs bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 px-2.5 sm:px-3 h-9 rounded-xl border border-red-200 dark:border-red-800 transition font-bold cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Salir</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar panel de administración"
                className="flex items-center justify-center bg-slate-900 dark:bg-slate-800 hover:bg-black text-white w-9 h-9 rounded-xl transition shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Accesos rápidos fijos en Móvil / Tablet (< lg) */}
          <div className="lg:hidden bg-white dark:bg-[#0d121d] border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {(
              [
                { id: 'despacho' as AdminTabId, label: 'Despacho 24h', badge: liveNewCount || undefined },
                { id: 'historico' as AdminTabId, label: 'Histórico', badge: orders.length },
                { id: 'restaurantes' as AdminTabId, label: 'Restaurantes' },
                { id: 'cortes' as AdminTabId, label: 'Cortes' },
                { id: 'ajustes' as AdminTabId, label: 'Ajustes' },
              ]
            ).map((quick) => {
              const isActive = activeTab === quick.id;
              return (
                <button
                  key={quick.id}
                  type="button"
                  onClick={() => handleSelectAdminTab(quick.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shrink-0 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#ed0718] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{quick.label}</span>
                  {quick.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white text-[#ed0718]' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                      }`}
                    >
                      {quick.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Contenido principal con scroll independiente */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:p-6 bg-slate-100 dark:bg-[#070a10] transition-colors space-y-4">
          {/* Mensaje de retroalimentación no bloqueante */}
          {feedbackNotice && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs transition-all ${
                feedbackNotice.type === 'error'
                  ? 'bg-red-100 text-red-900 border border-red-300'
                  : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
              }`}
            >
              <span>{feedbackNotice.text}</span>
              <button
                type="button"
                onClick={() => setFeedbackNotice(null)}
                className="text-gray-500 hover:text-black font-black ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Modal / Popover para ingresar URL de foto de platillo */}
          {editingDishUrlItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl max-w-md w-full border border-gray-200 dark:border-slate-700 shadow-2xl space-y-3">
                <h4 className="font-black text-sm text-gray-900 dark:text-white">
                  Editar Enlace de Foto del Platillo
                </h4>
                <p className="text-xs text-gray-500">
                  Pega el enlace URL directo (https://...) de la imagen:
                </p>
                <input
                  type="text"
                  value={editingDishUrlItem.url}
                  onChange={(e) =>
                    setEditingDishUrlItem({ ...editingDishUrlItem, url: e.target.value })
                  }
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-slate-800"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingDishUrlItem(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-300 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingRestaurant) return;
                      setEditingRestaurant({
                        ...editingRestaurant,
                        menu: editingRestaurant.menu.map((m) =>
                          m.id === editingDishUrlItem.id
                            ? { ...m, image: editingDishUrlItem.url.trim() }
                            : m
                        ),
                      });
                      setEditingDishUrlItem(null);
                      showFeedback('Enlace URL de foto actualizado.');
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-black bg-[#ed0718] text-white hover:bg-[#c90012]"
                  >
                    Guardar URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= PESTAÑA: MÉTRICAS DE RENDIMIENTO (RECHARTS) ================= */}
          {activeTab === 'rendimiento' && (
            <AdminPerformanceMetricsView orders={orders} restaurants={restaurants} />
          )}

          {/* ================= PESTAÑA: ESTADÍSTICAS & ANALÍTICA DE PEDIDOS ================= */}
          {activeTab === 'estadisticas' && (
            <div className="space-y-4">
              <OrderStatisticsView orders={orders} restaurants={restaurants} />
            </div>
          )}

          {/* ================= PESTAÑA: HISTÓRICO PERMANENTE DE PEDIDOS (SOLO ADMIN) ================= */}
          {activeTab === 'historico' && (
            <AdminOrderHistoryView fallbackOrders={orders} onOpenTicket={onOpenTicket} />
          )}

          {/* ================= PESTAÑA 1: DESPACHO EN VIVO (VENTANA OPERATIVA 24 HORAS) ================= */}
          {activeTab === 'despacho' && (
            <div className="space-y-4">
              {/* Tarjetas KPI Operativas (Últimas 24 horas) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="bg-white dark:bg-[#0f141e] rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Por Atender (Nuevos)
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className={`text-2xl font-black font-mono ${liveNewCount > 0 ? 'text-[#ed0718]' : 'text-slate-900 dark:text-white'}`}>
                      {liveNewCount}
                    </span>
                    {liveNewCount > 0 && (
                      <span className="text-[10px] font-black bg-red-100 dark:bg-red-950 text-[#ed0718] px-2 py-0.5 rounded-full">
                        Urgente
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0f141e] rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    En Preparación / Ruta
                  </span>
                  <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                    {liveInProgressCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0f141e] rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Entregados (24h)
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {liveDeliveredCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0f141e] rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Volumen (24h)
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    ${liveRevenue24h.toFixed(0)} <span className="text-xs font-bold text-slate-400">MXN</span>
                  </div>
                </div>
              </div>

              {/* Aviso limpio de limpieza automática 24h */}
              <div className="bg-[#0b1220] text-slate-100 px-3.5 py-2.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <b>Limpieza automática cada 24h:</b> Mostrando <b>{liveOrders.length}</b> pedido(s) recientes.
                    {archivedOrders.length > 0 && (
                      <span className="text-slate-400">
                        {' '}· {archivedOrders.length} archivado(s) permanentemente.
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectAdminTab('historico')}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl transition text-xs cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  Ir al Histórico ({orders.length}) →
                </button>
              </div>

              {/* Barra de Filtros de Estatus con Conteo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0f141e] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
                  {(
                    [
                      { id: 'todos', label: 'Todos', count: liveOrders.length },
                      { id: 'nuevo', label: 'Nuevos', count: liveOrders.filter((o) => o.status === 'nuevo').length },
                      { id: 'en_preparacion', label: 'Preparación', count: liveOrders.filter((o) => o.status === 'en_preparacion').length },
                      { id: 'asignado', label: 'Asignados', count: liveOrders.filter((o) => o.status === 'asignado').length },
                      { id: 'en_camino', label: 'En Camino', count: liveOrders.filter((o) => o.status === 'en_camino').length },
                      { id: 'entregado', label: 'Entregados', count: liveOrders.filter((o) => o.status === 'entregado').length },
                      { id: 'cancelado', label: 'Cancelados', count: liveOrders.filter((o) => o.status === 'cancelado' || o.status === 'cancelado_con_deuda').length },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFilterStatus(st.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                        filterStatus === st.id
                          ? 'bg-[#0b1220] dark:bg-[#ed0718] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{st.label}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${filterStatus === st.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                        {st.count}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onRefreshData}
                  className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 font-bold transition cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizar</span>
                </button>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-14 bg-white dark:bg-[#0f141e] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <Bike className="w-11 h-11 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-slate-600 dark:text-slate-400 font-bold text-sm">
                    No hay pedidos en las últimas 24 horas con este filtro.
                  </p>
                  {archivedOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectAdminTab('historico')}
                      className="text-xs font-black text-[#ed0718] hover:underline cursor-pointer"
                    >
                      Consultar {archivedOrders.length} pedido(s) en Histórico →
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredOrders.map((order) => {
                    const isTransfer = order.paymentMethod === 'transferencia';
                    const isVerified = order.paymentStatus === 'verificado';
                    const msg1 = buildWhatsAppDispatchMessage(order, settings.defaultRider1Name);
                    const waLink1 = generateWhatsAppLink(settings.defaultRider1Phone, msg1);
                    const msg2 = buildWhatsAppDispatchMessage(order, settings.defaultRider2Name);
                    const waLink2 = generateWhatsAppLink(settings.defaultRider2Phone, msg2);

                    const statusBorderColor =
                      order.status === 'nuevo'
                        ? 'border-l-[#ed0718]'
                        : order.status === 'entregado'
                        ? 'border-l-emerald-500'
                        : order.status === 'afuera_del_domicilio'
                        ? 'border-l-amber-500'
                        : order.status === 'cancelado' || order.status === 'cancelado_con_deuda'
                        ? 'border-l-slate-400'
                        : 'border-l-blue-600';

                    const cleanAddress = (order.deliveryAddress || '').replace(/##+/g, '#');

                    return (
                      <div
                        key={order.id}
                        className={`bg-white dark:bg-[#0f141e] rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 ${statusBorderColor} p-4 sm:p-5 shadow-2xs transition`}
                      >
                        {/* Encabezado de Orden */}
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                {order.folio}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {new Date(order.createdAt).toLocaleTimeString('es-MX', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {order.status === 'nuevo' && (
                                <span className="bg-[#ed0718] text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                  NUEVA ORDEN
                                </span>
                              )}
                              {order.deliveryType === 'programada' && (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  🕒 PROGRAMADO: {order.scheduledDeliveryDate || 'Hoy'} {order.scheduledDeliveryTime || ''}
                                </span>
                              )}
                            </div>
                            <h3 className="font-black text-base text-slate-900 dark:text-white mt-1.5">
                              {order.restaurantName}
                            </h3>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span className="font-mono font-black text-lg text-[#ed0718] leading-none">
                              ${order.total.toFixed(2)} MXN
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              Envío ${order.deliveryFee} · Comis. ${order.commissionAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Si es solicitud de repartidores de local */}
                        {order.orderType === 'solicitud_local' && (
                          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-slate-900 dark:text-white p-3 rounded-xl my-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="bg-[#ed0718] text-white p-1.5 rounded-lg">
                                <Bike className="w-4 h-4" />
                              </span>
                              <div>
                                <strong className="block font-black">
                                  SOLICITUD DE LOCAL · CÓDIGO #{order.localCode}
                                </strong>
                                <span className="text-slate-600 dark:text-slate-300">
                                  {order.urgencyTiming || 'Inmediato'}
                                </span>
                              </div>
                            </div>
                            <span className="bg-[#0b1220] text-white text-xs font-black px-3 py-1 rounded-lg">
                              {order.ridersRequestedCount || 1} MOTO(S)
                            </span>
                          </div>
                        )}

                        {/* Cuerpo de Datos: Cliente + Dirección + Artículos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 text-xs">
                          <div className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400 block">
                                {order.orderType === 'solicitud_local' ? 'Local Solicitante' : 'Cliente'}
                              </span>
                              <strong className="text-slate-900 dark:text-white text-xs">
                                {order.customerName}
                              </strong>{' '}
                              <span className="font-mono text-slate-600 dark:text-slate-300">
                                ({order.customerPhone})
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400 block">
                                {order.orderType === 'solicitud_local' ? 'Punto de Salida' : 'Dirección de Entrega'}
                              </span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                                {cleanAddress}
                              </span>
                              {order.mapsUrl && (
                                <a
                                  href={order.mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-blue-600 dark:text-blue-400 hover:underline font-bold text-[11px] mt-0.5"
                                >
                                  📍 Abrir ubicación en Google Maps
                                </a>
                              )}
                            </div>
                            {order.deliveryNotes && (
                              <div className="text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                                <b>Notas:</b> {order.deliveryNotes}
                              </div>
                            )}
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-2.5">
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                                Artículos ({order.items.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {order.items.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-2 py-0.5 rounded-lg text-[11px] font-semibold"
                                  >
                                    <b>{it.quantity}x</b> {it.name}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Pill de Pago */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isTransfer ? (
                                  isVerified ? (
                                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px]">
                                      <ShieldCheck className="w-3.5 h-3.5" /> SPEI Verificado
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-black px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px]">
                                      <AlertTriangle className="w-3.5 h-3.5" /> SPEI Pendiente
                                    </span>
                                  )
                                ) : (
                                  <span className="bg-slate-900 dark:bg-slate-800 text-white font-black px-2.5 py-1 rounded-lg text-[11px]">
                                    💵 Efectivo: ${order.total.toFixed(2)}
                                  </span>
                                )}

                                {order.bankVerification?.trackingKey && (
                                  <span className="font-mono text-slate-500 text-[10px]">
                                    Clave: {order.bankVerification.trackingKey}
                                  </span>
                                )}
                              </div>

                              {isTransfer && !isVerified && (
                                <button
                                  onClick={() => handleVerifyBankPayment(order.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition cursor-pointer"
                                >
                                  Confirmar SPEI
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Barra de Acciones Organizada y Clara */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase text-slate-500 shrink-0">
                              Estatus:
                            </span>
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                              className="flex-1 sm:flex-none text-xs border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-[#ed0718]"
                            >
                              <option value="nuevo">🆕 Nuevo</option>
                              <option value="en_preparacion">👨‍🍳 En Preparación</option>
                              <option value="asignado">📋 Asignado a Repartidor</option>
                              <option value="recolectado">🛵 Pedido Recolectado</option>
                              <option value="en_camino">🚀 En Camino</option>
                              <option value="afuera_del_domicilio">📍 Repartidor Afuera (10m)</option>
                              <option value="entregado">✅ Entregado</option>
                              <option value="cancelado">❌ Cancelado</option>
                              <option value="cancelado_con_deuda">⛔ Cancelado con Deuda</option>
                              <option value="pendiente_cotizacion">💬 Pendiente Cotización</option>
                            </select>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {/* Acciones de Comunicación WhatsApp */}
                            <a
                              href={waLink1}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-300 dark:border-emerald-800 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition"
                              title="Despachar por WhatsApp al Repartidor 1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Rider 1</span>
                            </a>

                            <a
                              href={waLink2}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-300 dark:border-emerald-800 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition"
                              title="Despachar por WhatsApp al Repartidor 2"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Rider 2</span>
                            </a>

                            {order.status !== 'entregado' && order.status !== 'cancelado' && (
                              <button
                                type="button"
                                onClick={() => handleNotifyArrivalOutside(order)}
                                className={`text-xs py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                                  order.status === 'afuera_del_domicilio'
                                    ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                                    : 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-500 text-amber-900 dark:text-amber-300 hover:text-white border-amber-300 dark:border-amber-800'
                                }`}
                                title="Avisar por WhatsApp al cliente que el repartidor está afuera (10 min tolerancia)"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>{order.status === 'afuera_del_domicilio' ? 'Reenviar 10m' : 'Afuera (10m)'}</span>
                              </button>
                            )}

                            {/* Acciones Operativas Principales */}
                            <button
                              type="button"
                              onClick={() => setSelectedRouteOrder(order)}
                              className="bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-300 dark:border-blue-800 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                              title="Ver ruta en mapa y compartir"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Ruta</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenTicket(order)}
                              className="bg-[#0b1220] dark:bg-white hover:bg-black dark:hover:bg-slate-200 text-white dark:text-slate-900 font-black text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-[#ed0718]" />
                              <span>Ticket</span>
                            </button>

                            {order.status !== 'cancelado' && order.status !== 'cancelado_con_deuda' && (
                              <button
                                type="button"
                                onClick={() => handleCancelWithOtp(order)}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 p-2 rounded-xl border border-transparent hover:border-red-200 transition cursor-pointer"
                                title="Cancelar orden (Requiere OTP)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Aviso en curso si el repartidor ya notificó estar afuera */}
                        {order.status === 'afuera_del_domicilio' && (
                          <div className="mt-2.5 bg-amber-50 border border-amber-300 p-2.5 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-2">
                            <span className="font-bold flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-spin" />
                              <span>Repartidor afuera del domicilio · Tolerancia límite activa de 10 minutos.</span>
                            </span>
                            <span className="bg-amber-200 text-amber-900 font-mono font-black px-2 py-0.5 rounded text-[11px]">
                              Tolerancia Activa
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= PESTAÑA: CÓDIGOS DE LOCALES (3 DÍGITOS TIPO API) ================= */}
          {activeTab === 'locales_api' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-gray-900 text-base">
                      🏪 Códigos de Locales Asociados (API 3 Dígitos)
                    </h3>
                    <span className="bg-[#ed0718] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {partnerLocals.length} Locales
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tú asignas el código de 3 dígitos (ej: 101, 102, 205), el nombre del local, su dirección exacta (calle, número, colonia) y su ubicación en el mapa. Al poner su código en el sitio web, se auto-completa todo para solicitar repartidores.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingPartnerLocal({
                      id: 'loc-' + Math.random().toString(36).substring(2, 7),
                      code: '',
                      name: '',
                      phone: '',
                      address: {
                        calle: '',
                        numero: '',
                        colonia: '',
                        referencias: '',
                        lat: 20.9144,
                        lng: -100.7437,
                        mapsUrl: 'https://maps.google.com/?q=20.9144,-100.7437',
                      },
                      contactPerson: '',
                      notes: '',
                      serviceFee: 35,
                      isActive: true,
                    });
                    setIsCreatingPartnerLocal(true);
                  }}
                  className="bg-[#ed0718] hover:bg-[#c90012] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-xs transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Asignar Nuevo Código a Local
                </button>
              </div>

              {/* Formulario de Alta o Edición de Código de Local */}
              {editingPartnerLocal && (
                <form
                  onSubmit={handleSavePartnerLocal}
                  className="bg-white p-5 rounded-2xl border-2 border-[#ed0718] shadow-lg space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <div>
                      <h4 className="font-black text-gray-900 text-base">
                        {isCreatingPartnerLocal ? 'Asignar Nuevo Código de 3 Dígitos a Local' : `Editar Local ${editingPartnerLocal.name} (#${editingPartnerLocal.code})`}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Configura el código privado, tarifa fija y la ubicación para auto-identificación del local.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPartnerLocal(null);
                        setIsCreatingPartnerLocal(false);
                      }}
                      className="text-gray-400 hover:text-black p-1 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-black text-gray-800 mb-1">
                        Código de 3 Dígitos (API PIN): <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={3}
                        value={editingPartnerLocal.code}
                        onChange={(e) =>
                          setEditingPartnerLocal({
                            ...editingPartnerLocal,
                            code: e.target.value.replace(/[^0-9]/g, '').slice(0, 3),
                          })
                        }
                        placeholder="Ej. 101"
                        className="w-full bg-red-50/50 border-2 border-red-300 focus:border-[#ed0718] rounded-xl px-3 py-2 text-center font-mono font-black text-xl tracking-widest text-[#101b29] outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nombre del Local o Negocio: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingPartnerLocal.name}
                        onChange={(e) =>
                          setEditingPartnerLocal({ ...editingPartnerLocal, name: e.target.value })
                        }
                        placeholder="Ej. Tacos Sebastián / Pizzería Napoli"
                        className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#ed0718]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Teléfono / WhatsApp:
                      </label>
                      <input
                        type="tel"
                        value={editingPartnerLocal.phone}
                        onChange={(e) =>
                          setEditingPartnerLocal({ ...editingPartnerLocal, phone: e.target.value })
                        }
                        placeholder="Ej. 4151234567"
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs font-mono font-bold outline-none focus:border-[#ed0718]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Persona Encargada:
                      </label>
                      <input
                        type="text"
                        value={editingPartnerLocal.contactPerson || ''}
                        onChange={(e) =>
                          setEditingPartnerLocal({
                            ...editingPartnerLocal,
                            contactPerson: e.target.value,
                          })
                        }
                        placeholder="Ej. Don Sebastián / Gerente"
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs outline-none focus:border-[#ed0718]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Tarifa de Cobro ($ MXN): <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                        <input
                          type="number"
                          min={0}
                          step={1}
                          required
                          value={editingPartnerLocal.serviceFee ?? 35}
                          onChange={(e) =>
                            setEditingPartnerLocal({
                              ...editingPartnerLocal,
                              serviceFee: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="35"
                          className="w-full border border-gray-300 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-black outline-none focus:border-[#ed0718] text-[#ed0718]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dirección del Local (Calle, Número, Colonia) */}
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-3">
                    <span className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#ed0718]" />
                      Dirección Base del Local (Se auto-completará en el sitio web)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Calle:</label>
                        <input
                          type="text"
                          required
                          value={editingPartnerLocal.address.calle}
                          onChange={(e) =>
                            setEditingPartnerLocal({
                              ...editingPartnerLocal,
                              address: { ...editingPartnerLocal.address, calle: e.target.value },
                            })
                          }
                          placeholder="Ej. Calle Hidalgo"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Número:</label>
                        <input
                          type="text"
                          required
                          value={editingPartnerLocal.address.numero}
                          onChange={(e) =>
                            setEditingPartnerLocal({
                              ...editingPartnerLocal,
                              address: { ...editingPartnerLocal.address, numero: e.target.value },
                            })
                          }
                          placeholder="Ej. 45-B"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Colonia:</label>
                        <input
                          type="text"
                          required
                          value={editingPartnerLocal.address.colonia}
                          onChange={(e) =>
                            setEditingPartnerLocal({
                              ...editingPartnerLocal,
                              address: { ...editingPartnerLocal.address, colonia: e.target.value },
                            })
                          }
                          placeholder="Ej. Centro / San Antonio"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Referencias:</label>
                        <input
                          type="text"
                          value={editingPartnerLocal.address.referencias || ''}
                          onChange={(e) =>
                            setEditingPartnerLocal({
                              ...editingPartnerLocal,
                              address: {
                                ...editingPartnerLocal.address,
                                referencias: e.target.value,
                              },
                            })
                          }
                          placeholder="Frente a la plazuela, letrero rojo..."
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-[#ed0718]"
                        />
                      </div>
                    </div>

                    {/* Selector de Mapa para el Administrador */}
                    <div className="pt-2 border-t border-gray-200">
                      <span className="block text-xs font-bold text-gray-700 mb-2">
                        Fijar Ubicación en el Mapa de San Miguel para el repartidor:
                      </span>
                      <InteractiveMapPicker
                        initialLat={editingPartnerLocal.address.lat || 20.9144}
                        initialLng={editingPartnerLocal.address.lng || -100.7437}
                        localName={editingPartnerLocal.name || 'Local'}
                        onLocationSelect={(loc) => {
                          setEditingPartnerLocal({
                            ...editingPartnerLocal,
                            address: {
                              ...editingPartnerLocal.address,
                              lat: loc.lat,
                              lng: loc.lng,
                              mapsUrl: loc.mapsUrl,
                            },
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Notas Internas / Instrucciones para Repartidores:
                    </label>
                    <textarea
                      rows={2}
                      value={editingPartnerLocal.notes || ''}
                      onChange={(e) =>
                        setEditingPartnerLocal({ ...editingPartnerLocal, notes: e.target.value })
                      }
                      placeholder="Ej. Salida rápida por mostrador lateral. Llevar cambio de $200."
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#ed0718]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="partnerActive"
                      checked={editingPartnerLocal.isActive}
                      onChange={(e) =>
                        setEditingPartnerLocal({
                          ...editingPartnerLocal,
                          isActive: e.target.checked,
                        })
                      }
                      className="rounded text-[#ed0718] focus:ring-red-500"
                    />
                    <label htmlFor="partnerActive" className="text-xs font-bold text-gray-800">
                      Código activo para solicitudes inmediatas
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPartnerLocal(null);
                        setIsCreatingPartnerLocal(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#ed0718] hover:bg-[#c90012] text-white rounded-xl text-xs font-black shadow-xs"
                    >
                      Guardar Código y Local
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Códigos de Locales Registrados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {partnerLocals.map((loc, idx) => (
                  <div
                    key={`${loc.id}-${loc.code}-${idx}`}
                    className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col justify-between hover:border-red-300 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm bg-red-100 text-[#ed0718] px-2.5 py-1 rounded-lg border border-red-200">
                            PIN #{loc.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              loc.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {loc.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingPartnerLocal(loc);
                              setIsCreatingPartnerLocal(false);
                            }}
                            className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition"
                            title="Editar local"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePartnerLocal(loc.id, loc.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar local"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-base text-gray-900 leading-snug">
                        {loc.name}
                      </h4>

                      <div className="text-xs text-gray-600 space-y-1 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          📍 <b>Dirección:</b> {loc.address.calle} #{loc.address.numero}, Col. {loc.address.colonia}
                        </div>
                        {loc.address.referencias && (
                          <div className="text-gray-500 italic">
                            Ref: {loc.address.referencias}
                          </div>
                        )}
                        {loc.phone && (
                          <div>
                            📞 <b>Teléfono:</b> {loc.phone} {loc.contactPerson ? `(${loc.contactPerson})` : ''}
                          </div>
                        )}
                        {loc.address.mapsUrl && (
                          <div>
                            <a
                              href={loc.address.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#ed0718] hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span>🗺️ Ver GPS fijado</span>
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between bg-red-50/80 px-3 py-1.5 rounded-xl border border-red-200 text-xs">
                        <span className="text-gray-700 font-bold">Tarifa acordada de reparto:</span>
                        <span className="font-mono font-black text-[#ed0718] text-sm">
                          ${loc.serviceFee ?? 35} MXN
                        </span>
                      </div>
                    </div>

                    {loc.notes && (
                      <p className="text-[11px] text-gray-500 italic mt-2 border-t pt-2">
                        Notas: {loc.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= PESTAÑA 2: RESTAURANTES & TARIFAS ================= */}
          {activeTab === 'restaurantes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    Catálogo de Restaurantes ({restaurants.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Solo tú como administrador agregas locales y defines tarifas de envío y comisiones individuales.
                  </p>
                </div>
                <button
                  onClick={handleInitNewRestaurant}
                  className="bg-[#ed0718] hover:bg-[#c90012] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Nuevo Restaurante
                </button>
              </div>

              {/* Formulario de Alta o Edición de Restaurante */}
              {editingRestaurant && (
                <form
                  onSubmit={handleSaveRestaurant}
                  className="bg-white p-5 rounded-xl border-2 border-[#ed0718] shadow-md space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <h4 className="font-black text-gray-900 text-base">
                      {isCreatingRestaurant ? 'Nuevo Restaurante' : `Editar ${editingRestaurant.name}`}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingRestaurant(null)}
                      className="text-gray-400 hover:text-black"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={editingRestaurant.name}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })}
                        required
                        className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold"
                        placeholder="Ej. Tacos Don Chuy"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Establecimiento</label>
                      <select
                        value={editingRestaurant.establishmentType || 'restaurante'}
                        onChange={(e) => {
                          const newType = e.target.value as 'restaurante' | 'motomandado';
                          setEditingRestaurant({
                            ...editingRestaurant,
                            establishmentType: newType,
                            acceptsTransfer: newType === 'restaurante' ? editingRestaurant.acceptsTransfer : false,
                          });
                        }}
                        className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold text-[#ed0718]"
                      >
                        <option value="restaurante">🍴 Restaurante (Sí Factura: Efectivo y Transferencia)</option>
                        <option value="motomandado">🏍 Motomandado (No Factura: Solo Efectivo)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Categoría</label>
                      <select
                        value={editingRestaurant.category}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, category: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold"
                      >
                        <option value="Tacos">Tacos</option>
                        <option value="Pizzas">Pizzas</option>
                        <option value="Hamburguesas">Hamburguesas</option>
                        <option value="Mariscos">Mariscos</option>
                        <option value="Sushi">Sushi</option>
                        <option value="Panadería">Panadería</option>
                        <option value="Tiendas">Tiendas</option>
                        <option value="Farmacia">Farmacia</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Tiempo de Entrega</label>
                      <input
                        type="text"
                        value={editingRestaurant.time}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, time: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                        placeholder="Ej. 20–35 min"
                      />
                    </div>
                  </div>

                  {/* Horario de Atención y Estado de Cierre por Desfiles/Eventos */}
                  <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-700" />
                        Horario y Disponibilidad (Desfiles / Eventos)
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-amber-300">
                        <input
                          type="checkbox"
                          checked={editingRestaurant.isOpen !== false}
                          onChange={(e) =>
                            setEditingRestaurant({
                              ...editingRestaurant,
                              isOpen: e.target.checked,
                              closureReason: e.target.checked ? '' : editingRestaurant.closureReason || 'Cerrado temporalmente por desfile en Zona Centro',
                            })
                          }
                          className="w-4 h-4 text-[#ed0718] rounded"
                        />
                        <span>{editingRestaurant.isOpen !== false ? '🟢 Restaurante ABIERTO' : '🔴 Restaurante CERRADO TEMPORALMENTE'}</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Horario de Atención:
                        </label>
                        <input
                          type="text"
                          value={editingRestaurant.schedule || ''}
                          onChange={(e) =>
                            setEditingRestaurant({ ...editingRestaurant, schedule: e.target.value })
                          }
                          placeholder="Ej. 12:00 PM – 10:30 PM (Lunes a Domingo)"
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Motivo de Cierre Temporal (si no está disponible):
                        </label>
                        <input
                          type="text"
                          value={editingRestaurant.closureReason || ''}
                          onChange={(e) =>
                            setEditingRestaurant({ ...editingRestaurant, closureReason: e.target.value })
                          }
                          placeholder="Ej. Cerrado por desfile en Centro / Obras viales"
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarifas y Comisiones Individuales (Requerimiento explícito) */}
                  <div className="bg-red-50/60 p-4 rounded-xl border border-red-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-red-900 mb-1">
                        🏍️ Tarifa de Envío para este Restaurante ($ MXN)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingRestaurant.deliveryFee}
                        onChange={(e) =>
                          setEditingRestaurant({ ...editingRestaurant, deliveryFee: Number(e.target.value) })
                        }
                        required
                        className="w-full border border-red-300 bg-white rounded-lg p-2 text-sm font-black text-gray-900"
                        placeholder="Ej. 25"
                      />
                      <span className="text-[11px] text-gray-500">
                        Costo que se le cobrará al cliente por enviar desde este local.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-red-900 mb-1">
                        📈 Comisión RODO para este Restaurante (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={editingRestaurant.commissionRate}
                        onChange={(e) =>
                          setEditingRestaurant({ ...editingRestaurant, commissionRate: Number(e.target.value) })
                        }
                        required
                        className="w-full border border-red-300 bg-white rounded-lg p-2 text-sm font-black text-gray-900"
                        placeholder="Ej. 15"
                      />
                      <span className="text-[11px] text-gray-500">
                        Porcentaje de comisión que retiene RODO del subtotal de comida.
                      </span>
                    </div>
                  </div>

                  {/* Control de Sobreprecio (Markup) Administrado por Edson */}
                  <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-emerald-950 mb-1">
                        💰 Sobreprecio en Alimentos (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingRestaurant.markupPercent || 0}
                        onChange={(e) =>
                          setEditingRestaurant({ ...editingRestaurant, markupPercent: Number(e.target.value) })
                        }
                        className="w-full border border-emerald-300 bg-white rounded-lg p-2 text-sm font-black text-gray-900"
                        placeholder="Ej. 10 (Suma 10% sobre el precio de lista)"
                      />
                      <span className="text-[11px] text-gray-500">
                        Margen porcentual que tú como administrador agregas por platillo.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-emerald-950 mb-1">
                        💵 Sobreprecio Fijo por Platillo ($ MXN)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingRestaurant.markupFixed || 0}
                        onChange={(e) =>
                          setEditingRestaurant({ ...editingRestaurant, markupFixed: Number(e.target.value) })
                        }
                        className="w-full border border-emerald-300 bg-white rounded-lg p-2 text-sm font-black text-gray-900"
                        placeholder="Ej. 5 (Suma $5 pesos fijos)"
                      />
                      <span className="text-[11px] text-gray-500">
                        Monto fijo que se añade directamente al costo de cada alimento.
                      </span>
                    </div>
                  </div>

                  {/* Configuración de Promociones en Sobreprecio RODO (10%, 15%, 20%) */}
                  <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-amber-700" />
                        Promoción / Descuento en Margen RODO (Solo Sobreprecio)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-amber-300">
                        <input
                          type="checkbox"
                          checked={editingRestaurant.promoActive || false}
                          onChange={(e) =>
                            setEditingRestaurant({
                              ...editingRestaurant,
                              promoActive: e.target.checked,
                              promoDiscountPercent: e.target.checked ? (editingRestaurant.promoDiscountPercent || 15) : 0,
                              promoLabel: e.target.checked ? `${editingRestaurant.promoDiscountPercent || 15}% OFF en Servicio RODO` : '',
                            })
                          }
                          className="w-4 h-4 text-[#ed0718] rounded"
                        />
                        <span>Activar Promoción para este Local</span>
                      </label>
                    </div>

                    {editingRestaurant.promoActive && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Porcentaje de Descuento (Únicamente sobre el Sobreprecio RODO):
                          </label>
                          <select
                            value={editingRestaurant.promoDiscountPercent || 15}
                            onChange={(e) => {
                              const pct = Number(e.target.value);
                              setEditingRestaurant({
                                ...editingRestaurant,
                                promoDiscountPercent: pct,
                                promoLabel: `${pct}% OFF en Servicio RODO`,
                              });
                            }}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white font-bold text-[#ed0718]"
                          >
                            <option value={10}>10% de Descuento sobre el Sobreprecio</option>
                            <option value={15}>15% de Descuento sobre el Sobreprecio</option>
                            <option value={20}>20% de Descuento sobre el Sobreprecio</option>
                          </select>
                          <span className="text-[10px] text-amber-800 font-medium mt-1 block">
                            * Blindaje total: El costo base del restaurante y la tarifa del repartidor NUNCA se descuentan.
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Etiqueta Visible para los Clientes:
                          </label>
                          <input
                            type="text"
                            value={editingRestaurant.promoLabel || ''}
                            onChange={(e) =>
                              setEditingRestaurant({ ...editingRestaurant, promoLabel: e.target.value })
                            }
                            placeholder="Ej. 15% OFF en Servicio RODO"
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tiempo de Preparación y Modalidad de Menú Fijo vs Pide lo que quieras */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        ⏱️ Tiempo de Preparación del Local:
                      </label>
                      <select
                        value={editingRestaurant.prepTimeMinutes || 25}
                        onChange={(e) =>
                          setEditingRestaurant({
                            ...editingRestaurant,
                            prepTimeMinutes: Number(e.target.value),
                            time: `${e.target.value}–${Number(e.target.value) + 15} min`,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold bg-white"
                      >
                        <option value={10}>10 min (Rápido / Solo despacho)</option>
                        <option value={15}>15 min (Tacos / Tortas)</option>
                        <option value={20}>20 min (Comida rápida estándar)</option>
                        <option value={30}>30 min (Pizzas / Alitas)</option>
                        <option value={40}>40 min (Platillos elaborados / Restaurante formal)</option>
                        <option value={50}>50 min (Comida lenta / Eventos)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        📋 Modalidad de Catálogo:
                      </label>
                      <select
                        value={editingRestaurant.hasFixedMenu !== false ? 'fijo' : 'abierto'}
                        onChange={(e) =>
                          setEditingRestaurant({
                            ...editingRestaurant,
                            hasFixedMenu: e.target.value === 'fijo',
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold bg-white"
                      >
                        <option value="fijo">Menú con Platillos y Precios Fijos</option>
                        <option value="abierto">Sin Menú Fijo ("Pide lo que quieras" · Cotización Posterior)</option>
                      </select>
                    </div>
                  </div>

                  {/* Selección de Métodos de Pago Permitidos (Requerimiento explícito) */}
                  <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 space-y-2">
                    <label className="block text-xs font-black text-gray-800">
                      💳 Métodos de Pago Permitidos para este Restaurante
                    </label>
                    <div className="flex flex-wrap gap-6 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={editingRestaurant.acceptsCash}
                          onChange={(e) =>
                            setEditingRestaurant({ ...editingRestaurant, acceptsCash: e.target.checked })
                          }
                          className="w-4 h-4 text-[#ed0718] rounded"
                        />
                        <span>Acepta Pago en Efectivo al Entregar</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={editingRestaurant.acceptsTransfer}
                          onChange={(e) =>
                            setEditingRestaurant({ ...editingRestaurant, acceptsTransfer: e.target.checked })
                          }
                          className="w-4 h-4 text-[#ed0718] rounded"
                        />
                        <span>Acepta Transferencia Bancaria (SPEI Verificado)</span>
                      </label>
                    </div>

                    {editingRestaurant.acceptsTransfer && (
                      <div className="mt-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          Datos Bancarios para Transferencia (CLABE / Banco / Titular)
                        </label>
                        <input
                          type="text"
                          value={editingRestaurant.bankDetails || ''}
                          onChange={(e) =>
                            setEditingRestaurant({ ...editingRestaurant, bankDetails: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white"
                          placeholder="Ej. CLABE 012180012345678901 · BBVA · Nombre"
                        />
                      </div>
                    )}
                  </div>

                  {/* Ubicación Fija del Local en San Miguel de Allende (Dirección & Coordenadas GPS en Mapa) */}
                  <div className="bg-gray-50 p-3.5 sm:p-4 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#ed0718]" />
                        Ubicación Fija del Local para Repartidores (Solo Administrador)
                      </span>
                      {editingRestaurant.coordinates && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-md">
                          GPS: {editingRestaurant.coordinates.lat.toFixed(4)}, {editingRestaurant.coordinates.lng.toFixed(4)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Fija la dirección y el punto GPS exacto del restaurante para que el repartidor al recibir el ticket pueda presionar el botón de Google Maps y llegar directo sin perderse.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Calle:</label>
                        <input
                          type="text"
                          value={editingRestaurant.address?.calle || ''}
                          onChange={(e) =>
                            setEditingRestaurant({
                              ...editingRestaurant,
                              address: {
                                calle: e.target.value,
                                numero: editingRestaurant.address?.numero || '',
                                colonia: editingRestaurant.address?.colonia || '',
                                referencias: editingRestaurant.address?.referencias || '',
                                lat: editingRestaurant.coordinates?.lat,
                                lng: editingRestaurant.coordinates?.lng,
                                mapsUrl: editingRestaurant.mapsUrl,
                              },
                            })
                          }
                          placeholder="Ej. Calle Correo, Ancha de San Antonio..."
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Número Ext / Int:</label>
                        <input
                          type="text"
                          value={editingRestaurant.address?.numero || ''}
                          onChange={(e) =>
                            setEditingRestaurant({
                              ...editingRestaurant,
                              address: {
                                calle: editingRestaurant.address?.calle || '',
                                numero: e.target.value,
                                colonia: editingRestaurant.address?.colonia || '',
                                referencias: editingRestaurant.address?.referencias || '',
                                lat: editingRestaurant.coordinates?.lat,
                                lng: editingRestaurant.coordinates?.lng,
                                mapsUrl: editingRestaurant.mapsUrl,
                              },
                            })
                          }
                          placeholder="Ej. #24-A"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Colonia:</label>
                        <input
                          type="text"
                          value={editingRestaurant.address?.colonia || ''}
                          onChange={(e) =>
                            setEditingRestaurant({
                              ...editingRestaurant,
                              address: {
                                calle: editingRestaurant.address?.calle || '',
                                numero: editingRestaurant.address?.numero || '',
                                colonia: e.target.value,
                                referencias: editingRestaurant.address?.referencias || '',
                                lat: editingRestaurant.coordinates?.lat,
                                lng: editingRestaurant.coordinates?.lng,
                                mapsUrl: editingRestaurant.mapsUrl,
                              },
                            })
                          }
                          placeholder="Ej. Centro / San Antonio / La Aurora"
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Referencias de Ubicación:</label>
                        <input
                          type="text"
                          value={editingRestaurant.address?.referencias || ''}
                          onChange={(e) =>
                            setEditingRestaurant({
                              ...editingRestaurant,
                              address: {
                                calle: editingRestaurant.address?.calle || '',
                                numero: editingRestaurant.address?.numero || '',
                                colonia: editingRestaurant.address?.colonia || '',
                                referencias: e.target.value,
                                lat: editingRestaurant.coordinates?.lat,
                                lng: editingRestaurant.coordinates?.lng,
                                mapsUrl: editingRestaurant.mapsUrl,
                              },
                            })
                          }
                          placeholder="Frente al templo, puerta de madera..."
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-[#ed0718]"
                        />
                      </div>
                    </div>

                    {/* Selector de Mapa Interactivo para fijar GPS del local */}
                    <div className="pt-2 border-t border-gray-200">
                      <span className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-[#ed0718]" />
                        Fijar Punto en Mapa de San Miguel de Allende para el Repartidor:
                      </span>
                      <InteractiveMapPicker
                        initialLat={editingRestaurant.coordinates?.lat || 20.9144}
                        initialLng={editingRestaurant.coordinates?.lng || -100.7437}
                        localName={editingRestaurant.name}
                        heightClass="h-72 sm:h-80"
                        onLocationSelect={(loc) => {
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
                          setEditingRestaurant({
                            ...editingRestaurant,
                            coordinates: { lat: loc.lat, lng: loc.lng },
                            mapsUrl,
                            address: {
                              calle: loc.street || editingRestaurant.address?.calle || '',
                              numero: loc.streetNumber || editingRestaurant.address?.numero || '',
                              colonia: loc.neighborhood || editingRestaurant.address?.colonia || '',
                              referencias: editingRestaurant.address?.referencias || '',
                              lat: loc.lat,
                              lng: loc.lng,
                              mapsUrl,
                            },
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Foto del Restaurante / Portada */}
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-black text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#ed0718]" />
                        <span>Fotografía de Portada del Local / Menú</span>
                      </label>
                      <label className="cursor-pointer bg-[#101b29] hover:bg-black text-white text-xs font-bold py-1 px-3 rounded-lg flex items-center gap-1.5 shadow-xs transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Foto del Dispositivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadRestaurantPhoto(file);
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      {editingRestaurant.image ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-300 shrink-0 bg-black/5">
                          <img
                            src={editingRestaurant.image}
                            alt="Vista previa"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingRestaurant({ ...editingRestaurant, image: '' })}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                            title="Quitar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 shrink-0 flex flex-col items-center justify-center text-gray-400 bg-white">
                          <ImageIcon className="w-6 h-6 stroke-1" />
                          <span className="text-[10px] font-bold mt-1">Sin foto</span>
                        </div>
                      )}

                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={editingRestaurant.image}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, image: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white"
                          placeholder="O pega el enlace URL de la foto (https://...)"
                        />
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                          <span className="font-bold text-gray-600">Sugerencias rápidas:</span>
                          <button
                            type="button"
                            onClick={() => setEditingRestaurant({ ...editingRestaurant, image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85' })}
                            className="px-2 py-0.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 font-semibold text-gray-700"
                          >
                            🍕 Pizza
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRestaurant({ ...editingRestaurant, image: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=900&q=85' })}
                            className="px-2 py-0.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 font-semibold text-gray-700"
                          >
                            🌮 Tacos
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRestaurant({ ...editingRestaurant, image: '/assets/aistudio/FB_IMG_1793113084846_75e6bbcc.jpg' })}
                            className="px-2 py-0.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 font-semibold text-gray-700"
                          >
                            🍗 Pollo Ferechiken
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRestaurant({ ...editingRestaurant, image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=900&q=85' })}
                            className="px-2 py-0.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 font-semibold text-gray-700"
                          >
                            🥢 Comida China
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Código PIN Interno, Insignia y Descripción */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-black text-gray-800 mb-1 flex items-center justify-between">
                        <span>Código PIN (3 Dígitos)</span>
                        <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                          Solo Admin
                        </span>
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        inputMode="numeric"
                        value={editingRestaurant.localCode || ''}
                        onChange={(e) =>
                          setEditingRestaurant({
                            ...editingRestaurant,
                            localCode: e.target.value.replace(/[^0-9]/g, '').slice(0, 3),
                          })
                        }
                        className="w-full border-2 border-red-200 focus:border-[#ed0718] rounded-xl p-2 text-center font-mono font-black text-base text-[#101b29] outline-none"
                        placeholder="Ej. 104"
                      />
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Contraseña/Identificador de 3 dígitos (privado)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Insignia / Badge Comercial</label>
                      <input
                        type="text"
                        value={editingRestaurant.badge || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, badge: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs font-semibold"
                        placeholder="Ej. 30% OFF, Más Vendido, Recomendado SMA"
                      />
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Visible para el cliente (sin códigos ni contraseñas)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={editingRestaurant.description}
                        onChange={(e) =>
                          setEditingRestaurant({ ...editingRestaurant, description: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs"
                        placeholder="Breve reseña del local"
                      />
                    </div>
                  </div>

                  {/* Menú de Platillos y Disponibilidad (Agotado / Disponible) */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                        Platillos del Menú ({editingRestaurant.menu.length})
                      </h5>
                      <span className="text-[11px] text-gray-500">
                        Toca el botón para marcar platillos agotados
                      </span>
                    </div>

                    {/* Lista de platillos existentes */}
                    <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                      {editingRestaurant.menu.map((item) => {
                        const isSoldOut = item.isAvailable === false;
                        return (
                          <div
                            key={item.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl text-xs border ${
                              isSoldOut ? 'bg-red-50/60 border-red-200' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              {/* Foto del platillo con opción de cambio directo */}
                              <div className="relative group w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-300 shrink-0 flex items-center justify-center">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-gray-300" />
                                )}
                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition text-white text-[9px] font-bold" title="Cambiar foto">
                                  <Camera className="w-4 h-4" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadExistingDishPhoto(item.id, file);
                                    }}
                                  />
                                </label>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <strong className={`text-gray-900 ${isSoldOut ? 'line-through text-gray-500' : ''}`}>
                                    {item.name}
                                  </strong>
                                  <span className="bg-white px-2 py-0.5 rounded border border-gray-300 font-mono font-black text-gray-900 text-xs">
                                    ${item.price.toFixed(2)} MXN
                                  </span>
                                  {(item.surcharge !== undefined && item.surcharge > 0) && (
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                                      Base: ${(item.originalPrice || (item.price - item.surcharge)).toFixed(2)} + Sobreprecio: +${item.surcharge.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {/* Botón de Foto */}
                              <label className="cursor-pointer bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition">
                                <Camera className="w-3 h-3 text-[#ed0718]" />
                                <span>{item.image ? 'Cambiar' : '＋ Foto'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadExistingDishPhoto(item.id, file);
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => handlePromptDishPhotoUrl(item.id, item.image)}
                                className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-600 px-1.5 py-1 rounded-lg text-[11px] font-medium"
                                title="Editar enlace URL de la foto"
                              >
                                URL
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleItemInEdit(item.id)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-black transition ${
                                  isSoldOut
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                }`}
                              >
                                {isSoldOut ? '❌ Agotado' : '✅ Disp.'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCustomizationsDish(item);
                                  setNewCustomName('');
                                  setNewCustomPrice(0);
                                  setNewCustomType('removal');
                                }}
                                className="bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition"
                                title="Configurar ingredientes a quitar o extras con costo"
                              >
                                <Sliders className="w-3 h-3 text-amber-700" />
                                <span>Extras ({item.customizations?.length || 0})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveMenuItem(item.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Agregar nuevo platillo con sobreprecio configurable y FOTOGRAFÍA */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-dashed border-gray-300 space-y-2.5">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider block">
                        ＋ Agregar Platillo con Foto y Sobreprecio RODO
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-gray-600">Nombre del platillo</label>
                          <input
                            type="text"
                            value={newMenuItem.name}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                            className="w-full border bg-white rounded-lg p-2 text-xs"
                            placeholder="Ej. Torta de Pastor con Queso"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600">Precio Base ($ Local)</label>
                          <input
                            type="number"
                            min="0"
                            value={newMenuItem.originalPrice || ''}
                            onChange={(e) => {
                              const orig = Number(e.target.value);
                              const sur = Number(newMenuItem.surcharge) || 0;
                              setNewMenuItem({
                                ...newMenuItem,
                                originalPrice: orig,
                                price: orig + sur,
                              });
                            }}
                            className="w-full border bg-white rounded-lg p-2 text-xs font-mono font-bold"
                            placeholder="Ej. 65"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600">Sobreprecio RODO ($)</label>
                          <input
                            type="number"
                            min="0"
                            value={newMenuItem.surcharge || ''}
                            onChange={(e) => {
                              const sur = Number(e.target.value);
                              const orig = Number(newMenuItem.originalPrice) || 0;
                              setNewMenuItem({
                                ...newMenuItem,
                                surcharge: sur,
                                price: orig + sur,
                              });
                            }}
                            className="w-full border bg-white rounded-lg p-2 text-xs font-mono font-bold text-[#ed0718]"
                            placeholder="Ej. 10"
                          />
                        </div>
                      </div>

                      {/* Descripción del platillo */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600">Descripción o ingredientes</label>
                        <input
                          type="text"
                          value={newMenuItem.description || ''}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                          className="w-full border bg-white rounded-lg p-2 text-xs"
                          placeholder="Ej. Tortilla hecha al momento, frijoles y salsa casera"
                        />
                      </div>

                      {/* Sección de Fotografía del Platillo */}
                      <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="block text-[11px] font-black text-gray-700 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#ed0718]" />
                            <span>Fotografía del Platillo (opcional)</span>
                          </label>
                          <label className="cursor-pointer bg-red-50 hover:bg-red-100 text-[#ed0718] border border-red-200 text-xs font-bold py-1 px-2.5 rounded-lg flex items-center gap-1.5 transition">
                            <Upload className="w-3 h-3" />
                            <span>Subir Foto del Dispositivo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadNewDishPhoto(file);
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          {newMenuItem.image ? (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-300 shrink-0">
                              <img
                                src={newMenuItem.image}
                                alt="Vista previa"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setNewMenuItem({ ...newMenuItem, image: '' })}
                                className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                                title="Quitar foto"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg border border-dashed border-gray-300 shrink-0 flex items-center justify-center text-gray-400 bg-gray-50">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}

                          <input
                            type="text"
                            value={newMenuItem.image || ''}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, image: e.target.value })}
                            className="w-full border rounded-lg p-2 text-xs bg-gray-50"
                            placeholder="O pega URL de la imagen (https://...)"
                          />
                        </div>

                        {/* Presets de fotos de comida populares */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-500 pt-0.5">
                          <span className="font-bold">Fotos rápidas:</span>
                          <button
                            type="button"
                            onClick={() => setNewMenuItem({ ...newMenuItem, image: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=500&q=80' })}
                            className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700"
                          >
                            🌮 Taco
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewMenuItem({ ...newMenuItem, image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=500&q=80' })}
                            className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700"
                          >
                            🍕 Pizza
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewMenuItem({ ...newMenuItem, image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=500&q=80' })}
                            className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700"
                          >
                            🍗 Alitas / Pollo
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewMenuItem({ ...newMenuItem, image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=500&q=80' })}
                            className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700"
                          >
                            🍟 Papas
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewMenuItem({ ...newMenuItem, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80' })}
                            className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700"
                          >
                            🥤 Refresco
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="text-xs text-gray-600">
                          Precio al público final:{' '}
                          <b className="font-mono text-gray-900 text-sm">
                            ${((Number(newMenuItem.originalPrice) || 0) + (Number(newMenuItem.surcharge) || 0)).toFixed(2)} MXN
                          </b>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddMenuItem}
                          className="bg-[#101b29] hover:bg-black text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-xs"
                        >
                          ＋ Agregar Platillo
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setEditingRestaurant(null)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#ed0718] hover:bg-[#c90012] text-white rounded-xl text-xs font-black shadow-xs"
                    >
                      Guardar Restaurante
                    </button>
                  </div>
                </form>
              )}

              {/* Modal de Personalizaciones / Extras del Platillo (Admin) */}
              {editingCustomizationsDish && (
                <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs">
                  <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
                    <div className="flex items-start justify-between border-b pb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#ed0718] bg-red-50 px-2 py-0.5 rounded-full">
                          Personalizaciones de Platillo
                        </span>
                        <h4 className="text-base font-extrabold text-gray-900 mt-1">
                          {editingCustomizationsDish.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          Agrega opciones para quitar ingredientes ($0) o extras con costo adicional (ej. hamburguesa sin queso, extra queso, sin chile).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingCustomizationsDish(null)}
                        className="text-gray-400 hover:text-black p-1 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Presets rápidos */}
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-2">
                      <span className="text-xs font-black text-amber-950 uppercase tracking-wide block">
                        ⚡ Plantillas Rápidas (1 Clic):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyDishPresets('burger')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs"
                        >
                          🍔 Hamburguesa (Sin queso, Sin chile, Extra queso $15, etc.)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyDishPresets('tacos')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs"
                        >
                          🌮 Tacos (Sin cebolla, Sin salsa, Extra queso $15)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyDishPresets('pizzas')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs"
                        >
                          🍕 Pizza (Extra queso $20, Extra pepperoni $20)
                        </button>
                      </div>
                    </div>

                    {/* Lista actual de opciones configuradas */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <span className="text-xs font-bold text-gray-700 block">
                        Opciones configuradas ({(editingCustomizationsDish.customizations || []).length}):
                      </span>
                      {(editingCustomizationsDish.customizations || []).length === 0 ? (
                        <div className="p-3 bg-gray-50 border border-dashed rounded-xl text-xs text-gray-400 text-center">
                          Aún no hay extras ni opciones configuradas para este platillo.
                        </div>
                      ) : (
                        (editingCustomizationsDish.customizations || []).map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  c.type === 'removal'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {c.type === 'removal' ? 'Quitar ($0)' : 'Extra (+)'}
                              </span>
                              <span className="font-bold text-gray-900">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-700">
                                {c.price > 0 ? `+$${c.price.toFixed(2)}` : 'Sin costo'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomizationFromDish(c.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Agregar una nueva opción manual */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wide block">
                        ＋ Agregar Opción Manual
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Nombre</label>
                          <input
                            type="text"
                            value={newCustomName}
                            onChange={(e) => setNewCustomName(e.target.value)}
                            placeholder="Ej. Sin cebolla / Extra queso"
                            className="w-full border rounded-lg p-2 text-xs bg-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Tipo</label>
                          <select
                            value={newCustomType}
                            onChange={(e) => setNewCustomType(e.target.value as 'removal' | 'extra')}
                            className="w-full border rounded-lg p-2 text-xs bg-white font-semibold"
                          >
                            <option value="removal">Quitar ($0)</option>
                            <option value="extra">Extra con Costo</option>
                          </select>
                        </div>
                      </div>

                      {newCustomType === 'extra' && (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Precio del Extra ($ MXN)</label>
                          <input
                            type="number"
                            min="1"
                            value={newCustomPrice || ''}
                            onChange={(e) => setNewCustomPrice(Number(e.target.value))}
                            placeholder="Ej. 15"
                            className="w-full border rounded-lg p-2 text-xs font-mono font-bold bg-white"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAddCustomizationToDish(newCustomName, newCustomPrice, newCustomType)}
                        className="w-full bg-[#101b29] hover:bg-black text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        ＋ Agregar a {editingCustomizationsDish.name}
                      </button>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingCustomizationsDish(null)}
                        className="px-5 py-2 bg-[#ed0718] hover:bg-[#c90012] text-white text-xs font-black rounded-xl shadow-xs"
                      >
                        Listo / Guardar Opciones
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Restaurantes con Control Rápido de Apertura y Platillos Agotados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {restaurants.map((rest) => {
                  const isClosed = rest.isOpen === false;

                  return (
                    <div
                      key={rest.id}
                      className={`bg-white rounded-2xl border overflow-hidden shadow-xs flex flex-col justify-between transition ${
                        isClosed ? 'border-amber-400 bg-amber-50/20' : 'border-gray-200'
                      }`}
                    >
                      <div className="p-4 space-y-3">
                        {/* Cabecera de la tarjeta con estado de apertura */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-base text-gray-900">{rest.name}</h4>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  isClosed
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {isClosed ? '🔴 Cerrado por Evento' : '🟢 Abierto'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 block mt-0.5">
                              {rest.category} · {rest.time} · 🕒 {rest.schedule || '12:00 PM – 10:00 PM'}
                            </span>
                          </div>

                          <span className="bg-red-50 text-red-700 font-extrabold text-xs px-2.5 py-1 rounded-full shrink-0">
                            Envío: ${rest.deliveryFee}
                          </span>
                        </div>

                        {/* Aviso si está cerrado por desfile o evento */}
                        {isClosed && (
                          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
                            <span>⚠️ {rest.closureReason || 'Cerrado temporalmente por desfile o evento vial'}</span>
                            <button
                              type="button"
                              onClick={() => handleDirectToggleRestaurantOpen(rest)}
                              className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-lg shrink-0 transition"
                            >
                              Reabrir
                            </button>
                          </div>
                        )}

                        {/* Botón rápido para pausar por desfile o evento */}
                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => handleDirectToggleRestaurantOpen(rest)}
                            className="w-full text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center justify-between"
                          >
                            <span>⚠️ ¿Hay desfile u obras viales en esta zona?</span>
                            <span className="text-[11px] bg-amber-200 px-2 py-0.5 rounded-md font-black">
                              Pausar Local
                            </span>
                          </button>
                        )}

                        {/* Datos financieros */}
                        <div className="text-xs space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Comisión RODO:</span>
                            <strong className="text-gray-900">{rest.commissionRate}%</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Pagos autorizados:</span>
                            <span className="font-semibold text-gray-800">
                              {rest.acceptsTransfer ? 'Efectivo y Transferencia (Factura)' : 'Solo Efectivo'}
                            </span>
                          </div>
                        </div>

                        {/* Control Rápido de Artículos / Platillos Agotados (1 clic) */}
                        <div className="pt-1">
                          <span className="text-[11px] font-black uppercase tracking-wider text-gray-700 block mb-1.5">
                            Control Rápido de Platillos ({rest.menu.length}) - Clic para Agotar:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-gray-50 rounded-xl border border-gray-200">
                            {rest.menu.length === 0 ? (
                              <span className="text-[11px] text-gray-400 p-1">Sin platillos cargados</span>
                            ) : (
                              rest.menu.map((m) => {
                                const isSoldOut = m.isAvailable === false;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleDirectToggleMenuItem(rest, m.id)}
                                    title={isSoldOut ? 'Clic para reactivar este platillo' : 'Clic para marcar este platillo como agotado'}
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition border flex items-center gap-1 ${
                                      isSoldOut
                                        ? 'bg-red-100 text-red-800 border-red-300 line-through'
                                        : 'bg-white text-gray-800 border-gray-300 hover:border-red-400'
                                    }`}
                                  >
                                    <span>{isSoldOut ? '❌' : '✅'}</span>
                                    <span>{m.name}</span>
                                    {isSoldOut && <span className="font-black text-red-700">(Agotado)</span>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-100 p-3 flex justify-between items-center border-t border-gray-200">
                        <button
                          onClick={() => {
                            setEditingRestaurant(rest);
                            setIsCreatingRestaurant(false);
                          }}
                          className="text-xs font-bold text-gray-700 hover:text-black flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" /> Editar Tarifas y Menú
                        </button>
                        <button
                          onClick={() => handleDeleteRestaurant(rest.id, rest.name)}
                          className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= PESTAÑA: ESPECIALIDADES & CATEGORÍAS UBER EATS ================= */}
          {activeTab === 'especialidades' && (
            <div className="space-y-6">
              {/* Encabezado y Explicación */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-gray-900">
                      Gestión de Especialidades y Carrusel (Estilo Uber Eats)
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                    Administra los cuadritos de especialidades que ven los clientes en la página inicial (Pollo, Mariscos, Pizza, Tacos, Pan, Tienda, Farmacia, Flores, etc.). Activa, pausa o agrega nuevas especialidades con un clic.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                    {currentSpecialties.filter((s) => s.active).length} activas de {currentSpecialties.length}
                  </span>
                </div>
              </div>

              {/* Catálogo Rápido con 1 Clic: Características Listas para Activar/Agregar */}
              <div className="bg-linear-to-br from-amber-50/50 to-orange-50/30 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs sm:text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <span>⚡ Banco de Características y Especialidades Frecuentes</span>
                  </h4>
                  <span className="text-[11px] text-amber-800 font-semibold">Toca cualquier recuadro para agregarlo directamente</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {[
                    { name: 'Pollo', icon: 'pollo' as const, emoji: '🍗', desc: 'Rostizado, frito y alitas' },
                    { name: 'Mariscos', icon: 'mariscos' as const, emoji: '🦐', desc: 'Cocteles, ceviches y camarones' },
                    { name: 'Pizza', icon: 'pizza' as const, emoji: '🍕', desc: 'Familiares y artesanales' },
                    { name: 'Tacos', icon: 'tacos' as const, emoji: '🌮', desc: 'Pastor, bistec y tripa' },
                    { name: 'Pan', icon: 'pan' as const, emoji: '🥖', desc: 'Bolillos, conchas y repostería' },
                    { name: 'Tienda', icon: 'tienda' as const, emoji: '🏪', desc: 'Botanas, lácteos y miscelánea' },
                    { name: 'Farmacia', icon: 'farmacia' as const, emoji: '💊', desc: 'Medicamentos y cuidado personal' },
                    { name: 'Flores', icon: 'flores' as const, emoji: '💐', desc: 'Ramos y arreglos florales' },
                    { name: 'Súper', icon: 'super' as const, emoji: '🧺', desc: 'Despensa, abarrotes y hogar' },
                    { name: 'Desayuno', icon: 'desayuno' as const, emoji: '🥞', desc: 'Hotcakes, chilaquiles y jugos' },
                    { name: 'Hamburguesa', icon: 'hamburguesa' as const, emoji: '🍔', desc: 'Smash, al carbón y queso' },
                    { name: 'Café', icon: 'personalizado' as const, emoji: '☕', desc: 'Café de grano, frappés y tés' },
                    { name: 'Postres', icon: 'personalizado' as const, emoji: '🍦', desc: 'Helados, pasteles y nieves' },
                    { name: 'Carnes', icon: 'personalizado' as const, emoji: '🥩', desc: 'Cortes finos para asador' },
                  ].map((preset) => {
                    const alreadyExists = currentSpecialties.some(
                      (s) => s.name.toLowerCase() === preset.name.toLowerCase()
                    );
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={async () => {
                          if (alreadyExists) {
                            alert(`"${preset.name}" ya se encuentra en tu catálogo. Puedes activarla o editarla en la lista abajo.`);
                            return;
                          }
                          const newCat: SpecialtyCategory = {
                            id: 'sp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
                            name: preset.name,
                            iconType: preset.icon,
                            description: preset.desc,
                            active: true,
                            order: currentSpecialties.length + 1,
                          };
                          const updated = [...currentSpecialties, newCat];
                          const newSettings = { ...currentSettings, specialtiesCatalog: updated };
                          setCurrentSettings(newSettings);
                          await saveDispatchSettings(newSettings);
                          alert(`¡"${preset.name}" agregada con éxito!`);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          alreadyExists
                            ? 'bg-white/80 border-gray-300 opacity-60'
                            : 'bg-white hover:bg-amber-100/60 border-amber-300 hover:border-amber-400 shadow-2xs hover:shadow-xs cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{preset.emoji}</span>
                          {alreadyExists ? (
                            <span className="text-[9px] font-black bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">En lista</span>
                          ) : (
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">＋ Agregar</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-black text-gray-900 block truncate">{preset.name}</span>
                          <span className="text-[10px] text-gray-500 line-clamp-1">{preset.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formulario para Crear Categoría Personalizada */}
              <form onSubmit={handleAddSpecialty} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#ed0718]" />
                  Agregar Nueva Especialidad Personalizada
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nombre de la Especialidad *
                    </label>
                    <input
                      type="text"
                      value={newSpecialtyName}
                      onChange={(e) => setNewSpecialtyName(e.target.value)}
                      placeholder="Ej. Mariscos del Pacífico, Pollo Asado..."
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Ícono / Característica Visual
                    </label>
                    <select
                      value={newSpecialtyIcon}
                      onChange={(e) => setNewSpecialtyIcon(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-bold bg-white"
                    >
                      <option value="pollo">🍗 Pollo (Rostizado / Frito)</option>
                      <option value="mariscos">🦐 Mariscos (Ceviches / Cocteles)</option>
                      <option value="pizza">🍕 Pizza</option>
                      <option value="tacos">🌮 Tacos (Pastor / Bistec)</option>
                      <option value="pan">🥖 Panadería / Bolillos</option>
                      <option value="tienda">🏪 Tienda / Abarrotes</option>
                      <option value="farmacia">💊 Farmacia / Botiquín</option>
                      <option value="flores">💐 Flores / Arreglos</option>
                      <option value="super">🧺 Súper / Despensa</option>
                      <option value="desayuno">🥞 Desayuno / Hotcakes</option>
                      <option value="hamburguesa">🍔 Hamburguesa</option>
                      <option value="personalizado">⭐ Personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Descripción breve
                    </label>
                    <input
                      type="text"
                      value={newSpecialtyDesc}
                      onChange={(e) => setNewSpecialtyDesc(e.target.value)}
                      placeholder="Ej. Camarones, ceviches frescos y tostadas"
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-[#101b29] hover:bg-black text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Guardar Especialidad en el Catálogo
                  </button>
                </div>
              </form>

              {/* Lista Actual de Especialidades en el Catálogo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                    Especialidades Actuales ({currentSpecialties.length})
                  </h4>
                  <span className="text-[11px] text-gray-500">
                    Usa el interruptor para ocultar o mostrar cualquiera de los cuadritos en la pantalla principal
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentSpecialties.map((cat, idx) => {
                    const iconEmojiMap: Record<string, string> = {
                      super: '🧺',
                      pizza: '🍕',
                      desayuno: '🥞',
                      pollo: '🍗',
                      hamburguesa: '🍔',
                      tacos: '🌮',
                      mariscos: '🦐',
                      pan: '🥖',
                      tienda: '🏪',
                      farmacia: '💊',
                      flores: '💐',
                      personalizado: '⭐',
                    };
                    const emoji = iconEmojiMap[cat.iconType] || '🍽️';

                    return (
                      <div
                        key={cat.id}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          cat.active ? 'bg-white border-gray-200 shadow-xs' : 'bg-gray-100/80 border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-3xl shrink-0 p-2 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                            {emoji}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-xs sm:text-sm text-gray-900 truncate">
                                {cat.name}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400">#{idx + 1}</span>
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleSpecialty(cat.id)}
                            className={`text-[11px] font-black px-2.5 py-1.5 rounded-xl border transition ${
                              cat.active
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                            }`}
                          >
                            {cat.active ? '🟢 Visible' : '⚪ Pausado'}
                          </button>

                          {cat.id.startsWith('sp-') && !INITIAL_SPECIALTIES.some((init) => init.id === cat.id) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSpecialty(cat.id, cat.name)}
                              className="text-gray-400 hover:text-red-600 p-1 rounded-lg"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= PESTAÑA COBERTURA: MAPA SAN MIGUEL ================= */}
          {activeTab === 'cobertura' && (
            <AdminCoverageMap
              settings={currentSettings}
              onSaveSettings={async (updated) => {
                setCurrentSettings(updated);
                await saveDispatchSettings(updated);
              }}
            />
          )}

          {/* ================= PESTAÑA CLIENTES: ANTIFRAUDE & CRÉDITO ================= */}
          {activeTab === 'clientes' && (
            <AdminSecurityAndFraud
              adminPhone={currentSettings.defaultRider1Phone || '5214151234567'}
            />
          )}

          {/* ================= PESTAÑA: DIAGNÓSTICO OTP DE RODO ================= */}
          {activeTab === 'seguridad_otp' && (
            <RodoOtpDiagnostics
              adminPhone={currentSettings.defaultRider1Phone || '4151234567'}
            />
          )}

          {/* ================= PESTAÑA: CORTES DIARIOS ================= */}
          {activeTab === 'cortes' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    Corte Diario de Operación
                  </h3>
                  <p className="text-xs text-gray-500">
                    Fecha: {new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}
                  </p>
                </div>
                <div className="text-xs font-mono font-bold bg-green-50 text-green-800 px-3 py-1.5 rounded-lg border border-green-200">
                  {todaysOrders.length} pedidos no cancelados hoy
                </div>
              </div>

              {/* Métricas Principales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                  <span className="text-[11px] font-bold text-gray-500 block uppercase">
                    Volumen Total Movido
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1 font-mono">
                    ${totalVolume.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                  <small className="text-[10px] text-gray-400">Total recaudado hoy</small>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-[11px] font-bold text-emerald-800 block uppercase">
                    Ganancia RODO (Cortes)
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1 font-mono">
                    ${totalRodoIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                  <small className="text-[10px] text-emerald-700">Comisiones + Envíos</small>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-xs">
                  <span className="text-[11px] font-bold text-blue-900 block uppercase">
                    Efectivo para Caja RODO
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-blue-900 mt-1 font-mono">
                    ${totalCashRodoNet.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                  <small className="text-[10px] text-blue-700">Sin propinas del repartidor ({cashOrders.length} pedidos)</small>
                </div>

                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-xs">
                  <span className="text-[11px] font-bold text-purple-900 block uppercase">
                    En Transferencias
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-purple-900 mt-1 font-mono">
                    ${totalTransfer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                  <small className="text-[10px] text-purple-700">{transferOrders.length} por transferencia</small>
                </div>
              </div>

              {/* Auditoría Obligatoria de Propinas: Efectivo vs Transferencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 uppercase">
                      💵 Propinas en Efectivo (100% Repartidor)
                    </span>
                    <span className="text-xs font-mono font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                      ${cashTipsTotal.toFixed(2)} MXN
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 mt-1.5 leading-snug">
                    <b>No contabilizadas en el corte de caja:</b> El cliente entrega esta propina directo en mano al motociclista. No entra a los ingresos ni a la caja de la oficina.
                  </p>
                </div>

                <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-950 uppercase">
                      💳 Propinas en Transferencia (Central)
                    </span>
                    <span className="text-xs font-mono font-black text-indigo-900 bg-indigo-200 px-2 py-0.5 rounded">
                      ${transferTipsTotal.toFixed(2)} MXN
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-900/90 mt-1.5 leading-snug">
                    <b>Auditadas en cuenta bancaria:</b> Recibidas en la cuenta central de RODO. Deben liquidarse y dispersarse al repartidor en su corte diario/semanal.
                  </p>
                </div>
              </div>

              {/* Desglose de Liquidación */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
                  Detalle Contable del Corte
                </h4>
                <div className="divide-y divide-gray-100 text-xs sm:text-sm">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-gray-600">Suma total de alimentos (a pagar a restaurantes):</span>
                    <span className="font-mono font-bold text-gray-900">
                      ${(totalSubtotals - totalCommissions).toFixed(2)} MXN
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between text-emerald-700">
                    <span>Retención por Comisiones RODO pactadas:</span>
                    <span className="font-mono font-black">+${totalCommissions.toFixed(2)} MXN</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-emerald-700">
                    <span>Ingresos por Tarifas de Envíos RODO:</span>
                    <span className="font-mono font-black">+${totalDeliveryFees.toFixed(2)} MXN</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-indigo-700">
                    <span>Propinas por transferencia (a dispersar a repartidores):</span>
                    <span className="font-mono font-bold">${transferTipsTotal.toFixed(2)} MXN</span>
                  </div>
                  <div className="py-2.5 flex justify-between bg-gray-50 p-2 rounded-lg font-black text-sm">
                    <span className="text-[#101b29]">UTILIDAD BRUTA RODO HOY (Envíos + Comisiones):</span>
                    <span className="font-mono text-[#ed0718]">${totalRodoIncome.toFixed(2)} MXN</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PESTAÑA 4: REPARTIDORES & WHATSAPP ================= */}
          {activeTab === 'ajustes' && (
            <form onSubmit={handleSaveSettings} className="bg-white p-5 rounded-xl border border-gray-200 space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bike className="w-5 h-5 text-[#ed0718]" />
                    <h3 className="font-extrabold text-gray-900 text-base">
                      Flotilla de Repartidores para Envío de Tickets (Hasta 10 Repartidores)
                    </h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {riders10List.filter((r) => r.isActive).length} de 10 Activos
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Asigna el nombre/alias y el número de WhatsApp con lada para cada uno de los hasta 10 repartidores. Al generar un ticket podrás enviar el enlace directo a cualquiera de ellos.
                </p>
              </div>

              {settingsSaved && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  ¡Configuración guardada exitosamente en la base de datos!
                </div>
              )}

              {/* Grid de 10 Repartidores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {riders10List.map((rider, idx) => (
                  <div
                    key={rider.id || `rider-${idx}`}
                    className={`p-3.5 rounded-xl border transition ${
                      rider.isActive
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                          rider.isActive ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                        }`}>
                          {idx + 1}
                        </span>
                        <strong className="text-xs font-extrabold text-gray-900">
                          Repartidor #{idx + 1} {idx === 0 && '(Principal)'} {idx === 1 && '(Respaldo)'}
                        </strong>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-700">
                        <input
                          type="checkbox"
                          checked={rider.isActive}
                          onChange={(e) => handleUpdateRider(idx, { isActive: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span>{rider.isActive ? 'Activo' : 'Inactivo'}</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Nombre / Alias</label>
                        <input
                          type="text"
                          value={rider.name}
                          onChange={(e) => handleUpdateRider(idx, { name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg p-1.5 text-xs font-semibold bg-white"
                          placeholder={`Ej. Moto ${idx + 1}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                          WhatsApp (ej. 524151019920)
                        </label>
                        <input
                          type="text"
                          value={rider.phone}
                          onChange={(e) => handleUpdateRider(idx, { phone: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg p-1.5 text-xs font-mono font-bold bg-white"
                          placeholder="524151019920"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cuenta Bancaria Oficial de RODO para transferencias */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  Datos de Cuenta Bancaria RODO (Para verificación SPEI)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CLABE Interbancaria</label>
                    <input
                      type="text"
                      maxLength={18}
                      value={currentSettings.clabeRodo}
                      onChange={(e) => setCurrentSettings({ ...currentSettings, clabeRodo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono font-bold bg-white"
                      placeholder="18 dígitos"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Banco Receptor</label>
                    <input
                      type="text"
                      value={currentSettings.bancoRodo}
                      onChange={(e) => setCurrentSettings({ ...currentSettings, bancoRodo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white"
                      placeholder="BBVA / Banorte / STP"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Titular de Cuenta</label>
                    <input
                      type="text"
                      value={currentSettings.titularRodo}
                      onChange={(e) => setCurrentSettings({ ...currentSettings, titularRodo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white"
                      placeholder="RODO Moto Mandados"
                    />
                  </div>
                </div>
              </div>

              {/* Tarifas de Despacho, Distancia y Sobreprecio Administradas por Edson */}
              <div className="bg-red-50/70 p-4 rounded-xl border border-red-200 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#ed0718]" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Tarifas de Despacho & Sobreprecio Global (Control Absoluto Edson)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tarifa Base de Envío ($ MXN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={currentSettings.baseDeliveryTariff || 35}
                      onChange={(e) =>
                        setCurrentSettings({ ...currentSettings, baseDeliveryTariff: Number(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-black bg-white"
                      placeholder="35"
                    />
                    <span className="text-[10px] text-gray-500">Cubre los primeros 1.8 km</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tarifa por Km Adicional ($/km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={currentSettings.tariffPerKm || 7}
                      onChange={(e) =>
                        setCurrentSettings({ ...currentSettings, tariffPerKm: Number(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-black bg-white"
                      placeholder="7"
                    />
                    <span className="text-[10px] text-gray-500">Por cada km extra</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Sobreprecio Global Alimentos (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentSettings.globalMarkupPercent || 10}
                      onChange={(e) =>
                        setCurrentSettings({ ...currentSettings, globalMarkupPercent: Number(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-black bg-white"
                      placeholder="10"
                    />
                    <span className="text-[10px] text-gray-500">Margen de ganancia en comida</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Recargo Entrega Exprés ($ MXN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={currentSettings.expressDeliverySurcharge || 25}
                      onChange={(e) =>
                        setCurrentSettings({ ...currentSettings, expressDeliverySurcharge: Number(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-black bg-white"
                      placeholder="25"
                    />
                    <span className="text-[10px] text-gray-500">Prioridad urgente</span>
                  </div>
                </div>
              </div>

              {/* Modo Días Festivos / Eventos en San Miguel de Allende */}
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Modo Días Festivos / Desfiles / Eventos Especiales
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-amber-300">
                    <input
                      type="checkbox"
                      checked={currentSettings.festiveModeEnabled || false}
                      onChange={(e) =>
                        setCurrentSettings({ ...currentSettings, festiveModeEnabled: e.target.checked })
                      }
                      className="w-4 h-4 text-[#ed0718] rounded"
                    />
                    <span>Activar Alerta de Día Festivo en el Portal</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mensaje de Alerta al Cliente:
                    </label>
                    <input
                      type="text"
                      value={currentSettings.festiveModeMessage || ''}
                      onChange={(e) =>
                        setCurrentSettings({ ...currentSettings, festiveModeMessage: e.target.value })
                      }
                      placeholder="Ej. 🎆 Fechas Festivas: Por desfiles y fiestas en San Miguel, los repartidores pueden experimentar demoras en tránsito."
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Demora Estimada:
                    </label>
                    <input
                      type="text"
                      value={currentSettings.festiveEstimatedDelay || ''}
                      onChange={(e) =>
                        setCurrentSettings({ ...currentSettings, festiveEstimatedDelay: e.target.value })
                      }
                      placeholder="Ej. +15 a 25 min"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono font-bold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Opción de Lluvia: Pausa Temporal de Envíos por Mal Clima */}
              <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4 text-sky-600" />
                    Opción de Lluvia · Pausar Envíos Temporalmente
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-sky-300">
                    <input
                      type="checkbox"
                      checked={currentSettings.rainPauseEnabled || false}
                      onChange={(e) =>
                        setCurrentSettings({ ...currentSettings, rainPauseEnabled: e.target.checked })
                      }
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span>Pausar Todos los Envíos por Lluvia</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mensaje de Aviso por Lluvia al Cliente:
                  </label>
                  <input
                    type="text"
                    value={currentSettings.rainPauseMessage || ''}
                    onChange={(e) =>
                      setCurrentSettings({ ...currentSettings, rainPauseMessage: e.target.value })
                    }
                    placeholder="Ej. 🌧️ Envíos pausados temporalmente por lluvia intensa en San Miguel de Allende."
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white font-medium"
                  />
                </div>
              </div>

              {/* ================= GESTOR DE TEMÁTICAS FESTIVAS Y FONDOS ================= */}
              <div className="bg-gradient-to-r from-red-50/70 via-amber-50/50 to-emerald-50/70 p-4 sm:p-5 rounded-2xl border-2 border-red-300 dark:border-red-900/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎨</span>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        Temática Festiva Activa & Fondo de la Plataforma
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Cambia el fondo rojo y los colores de la app para celebrar las fechas especiales del año en San Miguel.
                      </p>
                    </div>
                  </div>
                  {themeSavedFeedback && (
                    <span className="bg-green-100 text-green-800 text-xs font-black px-3 py-1 rounded-full border border-green-300 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      ¡Temática aplicada y guardada!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {HOLIDAY_THEMES_ARRAY.map((theme) => {
                    const isSelected = (currentSettings.activeHolidayTheme || 'clasico_rodo') === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => handleSelectHolidayTheme(theme.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-black dark:border-white bg-white dark:bg-gray-900 shadow-md ring-2 ring-red-500/50'
                            : 'border-gray-200 dark:border-gray-800 bg-white/70 hover:border-gray-400 dark:hover:border-gray-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-2xl">{theme.iconEmoji}</span>
                            {isSelected ? (
                              <span className="bg-black dark:bg-white text-white dark:text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                Activa ✓
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold">
                                {theme.seasonLabel}
                              </span>
                            )}
                          </div>
                          <strong className="text-xs font-black text-gray-900 dark:text-white block">
                            {theme.name}
                          </strong>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {theme.shortDescription}
                          </p>
                        </div>

                        {/* Muestras de color */}
                        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-white shadow-xs inline-block"
                              style={{ backgroundColor: theme.primaryColor }}
                              title="Color Primario"
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-white shadow-xs inline-block"
                              style={{ backgroundColor: theme.secondaryColor }}
                              title="Color Secundario"
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-white shadow-xs inline-block"
                              style={{ backgroundColor: theme.accentColor }}
                              title="Color de Acento"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectHolidayTheme(theme.id);
                            }}
                            className={`text-[10px] font-black px-2 py-1 rounded-lg transition ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {isSelected ? 'Seleccionada' : 'Activar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Entrega Exprés & Programada */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  Modalidades de Entrega y Cobros Extra
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Cobro Extra Entrega Exprés ($ MXN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={currentSettings.expressDeliverySurcharge || 25}
                      onChange={(e) =>
                        setCurrentSettings({
                          ...currentSettings,
                          expressDeliverySurcharge: Number(e.target.value),
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono font-bold bg-white text-[#ed0718]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="expressEnabled"
                      checked={currentSettings.expressDeliveryEnabled !== false}
                      onChange={(e) =>
                        setCurrentSettings({
                          ...currentSettings,
                          expressDeliveryEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-[#ed0718] rounded"
                    />
                    <label htmlFor="expressEnabled" className="text-xs font-bold text-gray-800">
                      Habilitar Entrega Exprés urgente
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="schedEnabled"
                      checked={currentSettings.scheduledDeliveryEnabled !== false}
                      onChange={(e) =>
                        setCurrentSettings({
                          ...currentSettings,
                          scheduledDeliveryEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-[#ed0718] rounded"
                    />
                    <label htmlFor="schedEnabled" className="text-xs font-bold text-gray-800">
                      Habilitar Entrega Programada
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección de Seguridad: Cambio de Contraseña de Administrador (Código 1999) */}
              <div className="bg-red-50/60 p-4 rounded-2xl border-2 border-red-200 space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ed0718] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Cambio de Contraseña de Administrador (Requiere Código 1999)
                    </h4>
                    <p className="text-[11px] text-gray-600">
                      Para cambiar la clave de acceso al panel se requiere estrictamente ingresar el código de autorización maestro 1999.
                    </p>
                  </div>
                </div>

                {adminPassError && (
                  <div className="p-2.5 bg-red-100 border border-red-300 text-red-900 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{adminPassError}</span>
                  </div>
                )}

                {adminPassSuccess && (
                  <div className="p-2.5 bg-green-100 border border-green-300 text-green-900 text-xs font-bold rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <span>{adminPassSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Código de Autorización Maestro:
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={authMasterCodeInput}
                      onChange={(e) => setAuthMasterCodeInput(e.target.value)}
                      placeholder="Ingresa 1999"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono font-bold bg-white focus:ring-1 focus:ring-red-500"
                    />
                    <span className="text-[10px] text-gray-500 block mt-0.5">Código oficial: 1999</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Nueva Contraseña Admin:
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassText ? 'text' : 'password'}
                        value={newAdminPassInput}
                        onChange={(e) => setNewAdminPassInput(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full border border-gray-300 rounded-lg p-2 pr-8 text-xs font-mono font-bold bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassText(!showNewPassText)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-700 text-xs"
                      >
                        {showNewPassText ? '👁️' : '🔒'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Confirmar Nueva Contraseña:
                    </label>
                    <input
                      type={showNewPassText ? 'text' : 'password'}
                      value={confirmAdminPassInput}
                      onChange={(e) => setConfirmAdminPassInput(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleChangeAdminPasscode}
                    className="bg-[#ed0718] hover:bg-red-700 text-white text-xs font-black py-2 px-4 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Actualizar Contraseña con Código 1999
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-[#101b29] hover:bg-black text-white text-xs font-black py-2.5 px-6 rounded-xl shadow-xs transition"
                >
                  Guardar Cambios de Despacho
                </button>
              </div>
            </form>
          )}

          {/* PESTAÑA: BITÁCORA DE AUDITORÍA INMUTABLE (SOLO EDSON) */}
          {activeTab === 'bitacora' && <AdminAuditLogView />}

          {/* PESTAÑA: PROGRAMAR NOTIFICACIÓN DE MARKETING ("ENVIAR A TODOS") */}
          {activeTab === 'notificaciones' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#ed0718] text-white">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-gray-900">
                      Programar Notificación de Marketing
                    </h3>
                    <p className="text-xs text-gray-500">
                      Redacta mensajes promocionales, cupones o avisos de servicio y envíalos a todos los clientes conectados.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Título de la notificación *
                      </label>
                      <input
                        type="text"
                        required
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        placeholder="Ej. 🔥 ¡20% OFF hoy en San Miguel con RODO!"
                        className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#ed0718]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Código Promocional (Opcional)
                      </label>
                      <input
                        type="text"
                        value={broadcastPromoCode}
                        onChange={(e) => setBroadcastPromoCode(e.target.value.toUpperCase())}
                        placeholder="Ej. RODO15 o ENVIOGRATIS"
                        className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-mono font-bold uppercase outline-none focus:border-[#ed0718]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Mensaje para clientes *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Ej. Aprovecha envío gratis o descuento en tus restaurantes y mandados favoritos hasta las 10:00 PM."
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#ed0718]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Fecha/Hora Programada (Vacío = Envío Inmediato)
                      </label>
                      <input
                        type="datetime-local"
                        value={broadcastScheduleAt}
                        onChange={(e) => setBroadcastScheduleAt(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs font-semibold bg-white outline-none focus:border-[#ed0718]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingBroadcast}
                      className="bg-[#ed0718] hover:bg-[#c90012] disabled:bg-gray-400 text-white font-black text-xs py-3 px-5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSendingBroadcast ? 'Enviando...' : 'Enviar a todos'}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-gray-900">
                  Historial de Notificaciones Masivas ({broadcastHistory.length})
                </h4>
                {broadcastHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    Aún no has enviado notificaciones promocionales masivas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {broadcastHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-black text-gray-900">{item.title}</div>
                          <div className="text-gray-600">{item.message}</div>
                          {item.promoCode && (
                            <span className="inline-block mt-1 bg-amber-100 text-amber-900 font-mono font-black px-2 py-0.5 rounded text-[10px]">
                              🎟️ Cupón: {item.promoCode}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono shrink-0">
                          {item.scheduledFor
                            ? `Programada: ${new Date(item.scheduledFor).toLocaleString('es-MX')}`
                            : `Enviada: ${new Date(item.createdAt).toLocaleString('es-MX')}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA: RECUPERACIÓN DE CUENTAS Y SOPORTE (CONTRASEÑA OLVIDADA) */}
          {activeTab === 'recuperacion' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                      <LifeBuoy className="w-5 h-5 text-blue-600" />
                      Solicitudes de Recuperación de Cuenta y Documentación
                    </h3>
                    <p className="text-xs text-gray-500">
                      Revisa la identificación enviada por el cliente, valida sus datos y otorga el ingreso nuevamente a su nueva cuenta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadRecoveryRequests}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Actualizar</span>
                  </button>
                </div>

                {recoveryRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">
                    No hay solicitudes de recuperación de cuenta registradas todavía.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recoveryRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between"
                      >
                        <div className="space-y-1.5 text-xs flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black bg-[#101b29] text-white px-2 py-0.5 rounded text-[11px]">
                              {req.folio}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                req.status === 'aprobada'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.status === 'rechazada'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {new Date(req.createdAt).toLocaleString('es-MX')}
                            </span>
                          </div>
                          <div className="font-extrabold text-sm text-gray-900">
                            {req.customerName} · 📞 {req.phone}
                          </div>
                          <div className="text-gray-700">
                            <b>Correo anterior:</b> {req.oldEmail || 'No especificado'} ➔{' '}
                            <b className="text-emerald-700">Nuevo correo: {req.newEmail}</b>
                          </div>
                          {req.reason && (
                            <p className="text-gray-600 italic">Motivo: {req.reason}</p>
                          )}

                          {req.status === 'pendiente' && (
                            <div className="pt-2 space-y-2">
                              <input
                                type="text"
                                value={recoveryNotesMap[req.id] || ''}
                                onChange={(e) =>
                                  setRecoveryNotesMap((prev) => ({ ...prev, [req.id]: e.target.value }))
                                }
                                placeholder="Nota opcional de soporte al validar documentación..."
                                className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-white"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await resolveAccountRecoveryRequest(
                                      req.id,
                                      'aprobada',
                                      recoveryNotesMap[req.id]
                                    );
                                    await loadRecoveryRequests();
                                    showFeedback(
                                      `✅ Acceso otorgado a ${req.newEmail}. El cliente ya puede entrar con su nueva cuenta.`
                                    );
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-xl cursor-pointer transition"
                                >
                                  ✅ Otorgar Ingreso a Nueva Cuenta
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await resolveAccountRecoveryRequest(
                                      req.id,
                                      'rechazada',
                                      recoveryNotesMap[req.id] || 'Documentación ilegible o no coincide'
                                    );
                                    await loadRecoveryRequests();
                                    showFeedback('Solicitud marcada como rechazada.', 'error');
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded-xl cursor-pointer transition"
                                >
                                  Rechazar
                                </button>
                                <a
                                  href={`https://wa.me/52${req.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                    `Hola ${req.customerName}, te atendemos de Soporte RODO respecto a tu solicitud de recuperación ${req.folio}.`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-xs px-3 py-2 rounded-xl inline-flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp Cliente</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {req.status === 'aprobada' && (
                            <div className="text-[11px] text-emerald-700 font-bold">
                              ✓ Cuenta reactivada y vinculada a {req.newEmail}.
                            </div>
                          )}
                        </div>

                        {req.documentPhotoUrl && (
                          <div className="shrink-0 space-y-1 text-center">
                            <span className="text-[10px] font-bold uppercase text-gray-500 block">
                              Documentación Adjunta
                            </span>
                            <img
                              src={req.documentPhotoUrl}
                              alt={`Documento de ${req.customerName}`}
                              className="w-40 h-28 object-cover rounded-xl border border-gray-300 shadow-xs bg-white"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA: ENLACE CON OTROS SITIOS WEB DE EDSON */}
          {activeTab === 'enlaces_web' && (
            <AdminExternalIntegrationView
              restaurants={restaurants}
              settings={currentSettings}
            />
          )}
          </div>
        </div>
      </div>

      {/* Modal de Validación Criptográfica OTP para Acciones Críticas de Administración */}
      {activeChallenge && (
        <SecurityOtpModal
          challenge={activeChallenge}
          adminPhone={currentSettings.defaultRider1Phone || '5214151234567'}
          onSuccess={handleConfirmCancelAfterOtp}
          onCancel={() => {
            setActiveChallenge(null);
            setPendingCancelOrder(null);
          }}
        />
      )}

      {/* Modal de Rutas de Entrega Google Maps Directions API para Pedidos Activos */}
      {selectedRouteOrder && (
        <AdminGoogleMapsDirectionsModal
          order={selectedRouteOrder}
          restaurant={
            restaurants.find(
              (r) =>
                r.id === selectedRouteOrder.restaurantId ||
                r.name.toLowerCase() === selectedRouteOrder.restaurantName.toLowerCase()
            ) || null
          }
          onClose={() => setSelectedRouteOrder(null)}
        />
      )}
    </div>
  );
};
