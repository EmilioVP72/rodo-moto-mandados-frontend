import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Shield,
  User,
  Tag,
  Info,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  Lock,
  LogOut,
  Sparkles,
  CheckCircle2,
  FileText,
  AlertCircle,
  Download,
  Smartphone,
  Bell,
  Moon,
  Sun,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../utils/i18n';
import { useBackdropClose } from '../utils/modalBackdrop';

interface TopLeftMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; name: string; phone: string; email: string } | null;
  isAdminLoggedIn: boolean;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  onOpenInvestorDossier: () => void;
  onOpenPermissions?: () => void;
  onOpenNotifications?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenTutorial?: () => void;
}

type MenuSection = 'menu' | 'ayuda' | 'privacidad' | 'cuentas' | 'promociones' | 'basico';

export const TopLeftMenuModal: React.FC<TopLeftMenuModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAdminLoggedIn,
  onOpenAuth,
  onOpenProfile,
  onOpenAdmin,
  onLogout,
  onOpenInvestorDossier,
  onOpenPermissions,
  onOpenNotifications,
  isDarkMode = false,
  onToggleDarkMode,
  onOpenTutorial,
}) => {
  const { lang, toggleLang } = useLanguage();
  const [activeSection, setActiveSection] = useState<MenuSection>('menu');

  const handleClose = () => {
    setActiveSection('menu');
    onClose();
  };

  const backdropHandlers = useBackdropClose(isOpen, handleClose);

  if (!isOpen) return null;

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-start p-0 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150 border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92dvh] transition-colors">
        {/* Cabecera del Recuadro con el Logo Oficial */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg"
              alt="Logo RODO Moto Mandados"
              className="w-11 h-11 rounded-xl object-cover shadow-md border border-white/20"
            />
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight text-white tracking-wide">
                RODO MOTO MANDADOS
              </h3>
              <p className="text-[11px] text-gray-400">
                Menú de servicios, cuentas e información
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Cerrar recuadro"
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido dinámico según la sección elegida */}
        <div className="p-4 sm:p-6 min-h-0 overflow-y-auto overscroll-contain flex-1">
          {activeSection === 'menu' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Selecciona una opción:
              </p>

              {/* 1. Ayuda con el pedido */}
              <button
                type="button"
                onClick={() => setActiveSection('ayuda')}
                className="w-full flex items-center justify-between p-3.5 bg-blue-50/50 hover:bg-blue-100/50 rounded-2xl transition border border-blue-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-gray-900 block group-hover:text-blue-700">
                      Ayuda con el Pedido
                    </span>
                    <span className="text-xs text-gray-500">
                      Estado de tu entrega, demoras o dudas en vivo
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-700" />
              </button>

              {/* 2. Avisos de privacidad */}
              <button
                type="button"
                onClick={() => setActiveSection('privacidad')}
                className="w-full flex items-center justify-between p-3.5 bg-purple-50/50 hover:bg-purple-100/50 rounded-2xl transition border border-purple-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-gray-900 block group-hover:text-purple-700">
                      Avisos de Privacidad
                    </span>
                    <span className="text-xs text-gray-500">
                      Protección de datos y seguridad de tus pedidos
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-700" />
              </button>

              {/* 3. Cuentas */}
              <button
                type="button"
                onClick={() => setActiveSection('cuentas')}
                className="w-full flex items-center justify-between p-3.5 bg-emerald-50/50 hover:bg-emerald-100/50 rounded-2xl transition border border-emerald-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-gray-900 block group-hover:text-emerald-700">
                      Cuentas & Perfil
                    </span>
                    <span className="text-xs text-gray-500">
                      {currentUser
                        ? `Sesión activa: ${currentUser.name}`
                        : 'Iniciar sesión con correo o código'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700" />
              </button>

              {/* 4. Promociones */}
              <button
                type="button"
                onClick={() => setActiveSection('promociones')}
                className="w-full flex items-center justify-between p-3.5 bg-amber-50/50 hover:bg-amber-100/50 rounded-2xl transition border border-amber-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-gray-900 block group-hover:text-amber-700">
                      Promociones
                    </span>
                    <span className="text-xs text-gray-500">
                      Descuentos, tarifas especiales y cupones
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-700" />
              </button>

              {/* 5. Lo más básico de un sitio web */}
              <button
                type="button"
                onClick={() => setActiveSection('basico')}
                className="w-full flex items-center justify-between p-3.5 bg-rose-50/50 hover:bg-rose-100/50 rounded-2xl transition border border-rose-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#ed0718] text-white shadow-xs">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-gray-900 block group-hover:text-red-700">
                      Lo Más Básico de un Sitio Web
                    </span>
                    <span className="text-xs text-gray-500">
                      Horarios, cobertura, quiénes somos y preguntas frecuentes
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-700" />
              </button>

              {/* Permisos del Teléfono */}
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  if (onOpenPermissions) onOpenPermissions();
                }}
                className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition border border-gray-200 text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gray-900 text-white shadow-xs">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-gray-900 block group-hover:text-black">
                      Permisos del Teléfono
                    </span>
                    <span className="text-xs text-gray-500">
                      Ubicación GPS, almacenamiento, notificaciones y cámara
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black" />
              </button>

              {/* Guía Rápida / Tutorial Interactivo */}
              {onOpenTutorial && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenTutorial();
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-blue-50/70 hover:bg-blue-100/70 rounded-2xl transition border border-blue-200 text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-blue-950 block group-hover:text-blue-700">
                        Cómo funciona
                      </span>
                      <span className="text-xs text-blue-700">
                        Guía rápida para pedir
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-700" />
                </button>
              )}



              {/* Centro de Notificaciones */}
              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenNotifications();
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 rounded-2xl transition border border-red-200 dark:border-red-900/40 text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#ed0718] text-white shadow-xs">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white block group-hover:text-[#ed0718]">
                        Centro de Notificaciones & Timbre
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Configurar sonido de timbre y push en celular
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#ed0718]" />
                </button>
              )}

              {/* Modo Obscuro / Modo Claro */}
              {onToggleDarkMode && (
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-2xl transition border border-slate-300 dark:border-slate-700 text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 shadow-xs">
                      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white block">
                        {isDarkMode ? 'Modo Obscuro (Activado)' : 'Modo Claro (Activado)'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {isDarkMode ? 'Toca para cambiar a Modo Claro' : 'Toca para cambiar a Modo Obscuro'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-gray-800 dark:text-gray-200">
                    {isDarkMode ? 'Obscuro' : 'Claro'}
                  </span>
                </button>
              )}

              {/* Selector de Idioma ES / EN (acceso rápido en dispositivos móviles) */}
              <button
                type="button"
                onClick={toggleLang}
                className="w-full flex items-center justify-between p-3.5 bg-amber-50/70 dark:bg-slate-800 hover:bg-amber-100/70 dark:hover:bg-slate-700/80 rounded-2xl transition border border-amber-200 dark:border-slate-700 text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-gray-900 dark:text-white block">
                      {lang === 'es' ? 'Idioma: Español' : 'Language: English'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {lang === 'es' ? 'Toca para cambiar a English' : 'Tap to switch to Español'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 text-gray-800 dark:text-gray-200">
                  {lang.toUpperCase()}
                </span>
              </button>

            </div>
          )}

          {/* VISTA 1: AYUDA CON EL PEDIDO */}
          {activeSection === 'ayuda' && (
            <div className="space-y-4 animate-in fade-in">
              <button
                type="button"
                onClick={() => setActiveSection('menu')}
                className="text-xs font-bold text-[#ed0718] flex items-center gap-1 hover:underline mb-1"
              >
                ← Volver al recuadro principal
              </button>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900">Ayuda con el Pedido</h4>
                  <p className="text-xs text-gray-500">Atención inmediata para clientes y locales</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs text-blue-900 space-y-2">
                <p className="font-bold">¿Tienes alguna duda o demora con tu pedido?</p>
                <p className="text-blue-800 leading-relaxed">
                  Ten a la mano tu <b>Folio de Ticket Único</b> (ej. <code>RD-261027-ABC12</code>) para que el despachador de RODO localice a tu repartidor en tiempo real.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl text-center space-y-2 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                    Canal Oficial de Atención & Despacho
                  </span>
                  <p className="text-xs text-gray-700">
                    Comunícate directamente con la central de soporte por WhatsApp. Te atendemos de inmediato para cualquier duda sobre tu pedido o entrega.
                  </p>
                  <a
                    href="https://api.whatsapp.com/send/?phone=524151019920&text=Hola%20RODO%20Moto%20Mandados,%20necesito%20ayuda%20con%20mi%20pedido."
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer mt-2"
                  >
                    <span className="text-base">📲</span>
                    <span>Abrir Chat de WhatsApp Oficial</span>
                  </a>
                  <span className="text-[10px] text-gray-500 block pt-1">
                    San Miguel de Allende, GTO · Conexión Segura Encriptada
                  </span>
                </div>

                <div className="border border-gray-200 rounded-2xl p-4 text-xs space-y-2 bg-gray-50">
                  <b className="text-gray-900 block">¿Cómo verificar mi transferencia bancaria?</b>
                  <p className="text-gray-600">
                    Al confirmar tu pedido con transferencia SPEI, despacho confirma el depósito en la cuenta de destino para proteger tu dinero y evitar fraudes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: AVISOS DE PRIVACIDAD Y DESLINDE LEGAL */}
          {activeSection === 'privacidad' && (
            <div className="space-y-4 animate-in fade-in">
              <button
                type="button"
                onClick={() => setActiveSection('menu')}
                className="text-xs font-bold text-[#ed0718] flex items-center gap-1 hover:underline mb-1"
              >
                ← Volver al recuadro principal
              </button>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900">
                    Avisos de Privacidad & Deslinde Legal
                  </h4>
                  <p className="text-xs text-gray-500">
                    Respaldo legal conforme a la legislación mexicana y PROFECO
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* CLÁUSULA 1: PROPIEDAD DE FOTOS Y MENÚS */}
                <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-purple-950 text-sm">
                    <span>📷</span>
                    <span>1. Uso Exclusivo de Fotos, Menús y Marcas de Restaurantes</span>
                  </div>
                  <div className="text-purple-900 leading-relaxed space-y-2">
                    <p>
                      <b>Titularidad ajena:</b> RODO Moto Mandados <b>NO es propietario</b> de los logotipos, marcas comerciales registradas, nombres de locales, fotografías de alimentos, recetas ni cartas de los establecimientos exhibidos en este sitio web.
                    </p>
                    <p>
                      <b>Uso ilustrativo y de intermediación:</b> Dichas imágenes e información son utilizadas estrictamente de forma ilustrativa y referencial con el propósito exclusivo de facilitar la elección del consumidor y canalizar los encargos a cada negocio local correspondiente. La titularidad y derechos intelectuales de cada platillo y fotografía pertenecen en su totalidad a su respectivo restaurante o autor.
                    </p>
                    <p>
                      RODO Moto Mandados no lucra ni cobra por la propiedad intelectual ni las imágenes de terceros; los cobros realizados corresponden únicamente a la prestación del servicio independiente de mensajería, logística y despacho en motocicleta.
                    </p>
                  </div>
                </div>

                {/* CLÁUSULA 2: PAGOS CON TRANSFERENCIA Y DATOS INTERBANCARIOS */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-blue-950 text-sm">
                    <span>💳</span>
                    <span>2. Privacidad en Pagos por Transferencia Bancaria (SPEI)</span>
                  </div>
                  <div className="text-blue-900 leading-relaxed space-y-2">
                    <p>
                      <b>No retención de datos interbancarios:</b> RODO Moto Mandados declara expresamente que <b>NO almacena, no retiene, ni tiene acceso</b> a contraseñas bancarias, números secretos (NIP), tokens dinámicos, ni números completos de cuentas de los usuarios.
                    </p>
                    <p>
                      <b>Propósito único y no acumulativo:</b> La clave de rastreo SPEI o comprobante de pago digital proporcionado por el usuario es utilizado y auditado <b>única y exclusivamente para validar el ingreso de fondos correspondiente a ese pedido en específico</b> y prevenir fraudes o suplantaciones. Una vez confirmado el movimiento, dicha información no se conserva ni se comparte con entidades bancarias o comerciales ajenas a la transacción.
                    </p>
                  </div>
                </div>

                {/* CLÁUSULA 3: DESLINDE DE RESPONSABILIDAD EN ENTREGAS Y ALIMENTOS */}
                <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
                    <span>🛵</span>
                    <span>3. Deslinde de Responsabilidad en Entregas y Alimentos</span>
                  </div>
                  <div className="text-amber-900 leading-relaxed space-y-2">
                    <p>
                      <b>Naturaleza de intermediario logístico:</b> RODO Moto Mandados es única y exclusivamente una empresa independiente de mandadería, transporte y despacho local. <b>No cocinamos, no elaboramos, no manipulamos ingredientes ni empaquetamos alimentos.</b>
                    </p>
                    <p>
                      <b>Pedidos equivocados o calidad del restaurante:</b> En caso de que el pedido presente errores en ingredientes, faltantes dentro del paquete sellado, demoras por saturación de cocina del restaurante o inconformidades en el sazón o estado del producto, la <b>responsabilidad recae íntegra y directamente en el restaurante o establecimiento emisor</b>. RODO no asume indemnizaciones ni responsabilidades por el producto preparado por terceros.
                    </p>
                    <p>
                      <b>Ausencia o falta de recepción por parte del cliente:</b> Si al momento de llegar el repartidor al domicilio indicado el cliente no sale a recibirlo, no responde llamadas telefónicas o no contesta mensajes transcurridos <b>10 (diez) minutos de tolerancia máxima</b>, el repartidor continuará su ruta para no perjudicar a otros usuarios. En este caso, el servicio de envío y el pedido se considerarán <b>devengados en su totalidad sin derecho a reembolso o cancelación</b>.
                    </p>
                  </div>
                </div>

                {/* CLÁUSULA 4: PROTECCIÓN GENERAL DE DATOS (LFPDPPP) */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-700 leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-black text-gray-900 text-sm">
                    <span>🛡️</span>
                    <span>4. Tratamiento de Datos Personales de Contacto</span>
                  </div>
                  <p>
                    Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), sus datos de contacto (nombre, teléfono y dirección) son recabados con la exclusiva finalidad de coordinar la entrega y mantenerlo informado del estado de su repartidor.
                  </p>
                  <p className="text-gray-600">
                    Sus datos personales jamás serán vendidos, compartidos ni rentados a despachos publicitarios o terceros.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 3: CUENTAS */}
          {activeSection === 'cuentas' && (
            <div className="space-y-4 animate-in fade-in">
              <button
                type="button"
                onClick={() => setActiveSection('menu')}
                className="text-xs font-bold text-[#ed0718] flex items-center gap-1 hover:underline mb-1"
              >
                ← Volver al recuadro principal
              </button>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900">Gestión de Cuentas</h4>
                  <p className="text-xs text-gray-500">Acceso controlado y seguro</p>
                </div>
              </div>

              {currentUser ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>{currentUser.name}</span>
                    </div>
                    <div className="mt-2 text-xs text-emerald-800 space-y-1">
                      <p><b>Correo:</b> {currentUser.email || 'No registrado'}</p>
                      <p><b>Teléfono:</b> {currentUser.phone || 'No registrado'}</p>
                    </div>
                  </div>

                  {onOpenProfile && !isAdminLoggedIn && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onOpenProfile();
                      }}
                      className="w-full bg-[#101b29] hover:bg-black text-white font-black text-xs py-3 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>Abrir Mi Perfil, Direcciones y Sesiones</span>
                    </button>
                  )}

                  {isAdminLoggedIn && (
                    <div className="bg-gray-900 text-white p-4 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                          <Lock className="w-4 h-4" /> PANEL ADMINISTRADOR
                        </span>
                        <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded-full font-bold">
                          Activo
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">
                        Administra precios, tarifas de restaurantes, códigos de locales y cortes de caja.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          onOpenAdmin();
                        }}
                        className="w-full bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer"
                      >
                        Abrir Panel de Control
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      handleClose();
                    }}
                    className="w-full border border-red-300 text-red-600 hover:bg-red-50 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Acceso seguro para clientes y locales:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenAuth();
                    }}
                    className="w-full bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs py-3 rounded-xl shadow-xs transition"
                  >
                    Iniciar Sesión / Registrarse
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VISTA 4: PROMOCIONES */}
          {activeSection === 'promociones' && (
            <div className="space-y-4 animate-in fade-in">
              <button
                type="button"
                onClick={() => setActiveSection('menu')}
                className="text-xs font-bold text-[#ed0718] flex items-center gap-1 hover:underline mb-1"
              >
                ← Volver al recuadro principal
              </button>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900">Promociones Activas</h4>
                  <p className="text-xs text-gray-500">Ahorra en tus antojos y envíos</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-gradient-to-r from-red-600 to-[#ed0718] text-white p-4 rounded-2xl shadow-sm space-y-1">
                  <div className="flex items-center gap-1 text-xs font-black text-amber-300 uppercase">
                    <Sparkles className="w-4 h-4" /> Promoción Local
                  </div>
                  <h5 className="font-black text-sm sm:text-base">Envíos desde $15 y $25 MXN</h5>
                  <p className="text-xs text-white/90">
                    Tarifas reducidas en fondas, antojitos y restaurantes de la zona Centro y San Antonio.
                  </p>
                </div>

                <div className="border border-gray-200 bg-gray-50 p-4 rounded-2xl text-xs space-y-1">
                  <b className="text-gray-900 block">Afiliación de Restaurantes y Cocinas:</b>
                  <p className="text-gray-600">
                    Si eres dueño de un negocio local y deseas incorporar tu menú a la plataforma de despacho RODO, contáctanos directamente a nuestro canal de WhatsApp oficial.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 5: LO MÁS BÁSICO DE UN SITIO WEB */}
          {activeSection === 'basico' && (
            <div className="space-y-4 animate-in fade-in">
              <button
                type="button"
                onClick={() => setActiveSection('menu')}
                className="text-xs font-bold text-[#ed0718] flex items-center gap-1 hover:underline mb-1"
              >
                ← Volver al recuadro principal
              </button>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-[#ed0718]">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900">Lo Más Básico del Sitio</h4>
                  <p className="text-xs text-gray-500">Información esencial de RODO</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-700">
                <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-gray-900">
                    <Clock className="w-4 h-4 text-[#ed0718]" />
                    <span>Horarios de Servicio:</span>
                  </div>
                  <p className="text-gray-600">
                    Lunes a Domingo de <b>8:00 AM a 11:30 PM</b>.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-gray-900">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Zonas de Cobertura:</span>
                  </div>
                  <p className="text-gray-600">
                    San Miguel de Allende: Centro, San Antonio, La Aurora, La Lejona, Los Frailes, Malanquín, San Luis Rey y zonas aledañas.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-gray-900">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>Sobre RODO Moto Mandados:</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Plataforma oficial de comida, mandados express y paquetería local en moto en San Miguel de Allende. Envíos rápidos, seguros y directos a tu puerta.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center shrink-0">
          <p className="text-[11px] text-gray-400 font-mono">
            RODO Moto Mandados · San Miguel de Allende
          </p>
        </div>
      </div>
    </div>
  );
};
