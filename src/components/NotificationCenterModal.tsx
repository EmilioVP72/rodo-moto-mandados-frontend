import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Sparkles,
  ShieldCheck,
  Send,
  Bike,
} from 'lucide-react';
import {
  RodoNotification,
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotificationHistory,
  playNotificationChime,
  requestBrowserNotificationPermission,
} from '../services/notifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeKey: string;
  unreadCount: number;
  isAdmin?: boolean;
  onSelectOrderFolio?: (folio: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  scopeKey,
  unreadCount,
  isAdmin = false,
  onSelectOrderFolio,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [history, setHistory] = useState<RodoNotification[]>([]);
  const [browserPermission, setBrowserPermission] = useState<string>('default');
  const [testedSound, setTestedSound] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getNotificationSettings());
      markAllNotificationsAsRead(scopeKey);
      if ('Notification' in window) {
        setBrowserPermission(Notification.permission);
      }
    }
  }, [isOpen, scopeKey]);

  useEffect(() => {
    if (isOpen) setHistory(getNotificationHistory(scopeKey));
  }, [isOpen, scopeKey, unreadCount]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (updated.soundEnabled) {
      playNotificationChime('normal');
    }
  };

  const handleToggleBrowser = async () => {
    if (!settings.browserNotificationsEnabled) {
      const granted = await requestBrowserNotificationPermission();
      if ('Notification' in window) {
        setBrowserPermission(Notification.permission);
      }
      const updated = { ...settings, browserNotificationsEnabled: granted };
      setSettings(updated);
      saveNotificationSettings(updated);
    } else {
      const updated = { ...settings, browserNotificationsEnabled: false };
      setSettings(updated);
      saveNotificationSettings(updated);
    }
  };

  const handleToggleUrgent = () => {
    const updated = { ...settings, urgentAlertsEnabled: !settings.urgentAlertsEnabled };
    setSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleTestSound = (type: 'normal' | 'urgent') => {
    playNotificationChime(type);
    setTestedSound(true);
    setTimeout(() => setTestedSound(false), 2000);
  };

  const handleClearAll = () => {
    clearNotificationHistory(scopeKey);
    setHistory([]);
  };

  const handleReadNotification = (notif: RodoNotification) => {
    markNotificationAsRead(notif.id, scopeKey);
    setHistory((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    if (notif.folio && onSelectOrderFolio) {
      onSelectOrderFolio(notif.folio);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] sm:max-h-[86dvh] shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800 transition-colors">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#ed0718] p-2 rounded-xl text-white shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                {isAdmin ? 'Alertas de Despacho (Admin)' : 'Mis Notificaciones RODO'}
              </h3>
              <p className="text-xs text-gray-300">
                {isAdmin
                  ? 'Pedidos nuevos y actualizaciones de operación exclusivas de administrador'
                  : 'Estado de tus pedidos, avisos del repartidor y promociones para ti'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-4 sm:p-6 space-y-5 overflow-y-auto overscroll-contain text-gray-800 dark:text-gray-200">
          {/* Panel de Configuración de Notificaciones */}
          <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Preferencias de Alertas
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {browserPermission === 'granted' ? '🟢 Push activo' : '⚪ Permiso no concedido'}
              </span>
            </div>

            {/* Switch Notificaciones del Navegador */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-[#ed0718]" />
                <div>
                  <span className="text-xs font-extrabold block">Notificaciones en Celular / PC</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Avisar cuando cambie el estatus del pedido aunque cambies de pestaña
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleBrowser}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  settings.browserNotificationsEnabled && browserPermission === 'granted'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                {settings.browserNotificationsEnabled && browserPermission === 'granted' ? 'Activadas' : 'Activar'}
              </button>
            </div>

            {/* Switch Sonido de Chime */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
                <div>
                  <span className="text-xs font-extrabold block">Sonido de Timbre al Actualizar</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Sonido sintetizado cuando el pedido se recolecte o esté en camino
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-[#ed0718] text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                {settings.soundEnabled ? 'Sí' : 'No'}
              </button>
            </div>

            {/* Switch Alerta Urgente Repartidor Afuera */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <Bike className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-xs font-extrabold block">Alerta Afuera de tu Domicilio</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Aviso prioritario de 10 min de tolerancia para salir a recibir
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleUrgent}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  settings.urgentAlertsEnabled
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                {settings.urgentAlertsEnabled ? 'Activada' : 'Pausada'}
              </button>
            </div>

            {/* Botones de prueba de sonido */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleTestSound('normal')}
                className="flex-1 py-1.5 px-3 rounded-xl bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Probar Timbre Suave</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestSound('urgent')}
                className="flex-1 py-1.5 px-3 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-amber-300 dark:border-amber-700"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Probar Alerta Urgente</span>
              </button>
            </div>
            {testedSound && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold text-center animate-pulse">
                ✓ Sonido emitido correctamente en tu dispositivo
              </p>
            )}
          </div>

          {/* Historial de Notificaciones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Historial de Alertas Recientes ({history.length})
              </h4>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No hay notificaciones pendientes</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Los avisos de recolección y llegada del repartidor aparecerán aquí en vivo.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {history.map((n) => {
                  const isUrgent = n.type === 'urgent';
                  const isSuccess = n.type === 'success';

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleReadNotification(n)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                        isUrgent
                          ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800'
                          : isSuccess
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
                      } ${!n.read ? 'ring-2 ring-[#ed0718]/40' : 'opacity-85'}`}
                    >
                      <div
                        className={`p-2 rounded-xl text-white shrink-0 ${
                          isUrgent ? 'bg-[#ed0718]' : isSuccess ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                      >
                        {isUrgent ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Bike className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <strong className="text-xs font-extrabold truncate text-gray-900 dark:text-white">
                            {n.title}
                          </strong>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-snug">
                          {n.message}
                        </p>
                        {n.folio && (
                          <span className="text-[10px] font-mono font-bold text-[#ed0718] mt-1 inline-block">
                            Ver boleto #{n.folio} ›
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#101b29] hover:bg-black text-white font-black text-xs py-3 rounded-2xl shadow-md transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
