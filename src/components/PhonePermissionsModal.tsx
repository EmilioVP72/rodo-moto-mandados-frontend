import React, { useState, useEffect } from 'react';
import { useBackdropClose } from '../utils/modalBackdrop';
import {
  X,
  MapPin,
  Bell,
  Camera,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  PhonePermissionsState,
  getSavedPhonePermissions,
  savePhonePermissions,
  requestLocationPermission,
  requestStoragePermission,
  requestNotificationsPermission,
  requestCameraPermission,
  requestAllPhonePermissions,
} from '../utils/phonePermissions';

interface PhonePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllGranted?: () => void;
}

export const PhonePermissionsModal: React.FC<PhonePermissionsModalProps> = ({
  isOpen,
  onClose,
  onAllGranted,
}) => {
  const [permissions, setPermissions] = useState<PhonePermissionsState>(getSavedPhonePermissions());
  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [activeItemLoading, setActiveItemLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermissions(getSavedPhonePermissions());
    }
  }, [isOpen]);

  const backdropHandlers = useBackdropClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleRequestSingle = async (type: 'location' | 'storage' | 'notifications' | 'camera') => {
    setActiveItemLoading(type);
    try {
      let result: any = 'denied';
      if (type === 'location') result = await requestLocationPermission();
      if (type === 'storage') result = await requestStoragePermission();
      if (type === 'notifications') result = await requestNotificationsPermission();
      if (type === 'camera') result = await requestCameraPermission();

      const updated = {
        ...permissions,
        [type]: result,
      };
      updated.allGranted =
        updated.location === 'granted' &&
        updated.storage === 'granted' &&
        (updated.notifications === 'granted' || updated.notifications === 'unsupported') &&
        updated.camera === 'granted';

      setPermissions(updated);
      savePhonePermissions(updated);

      if (updated.allGranted && onAllGranted) {
        onAllGranted();
      }
    } finally {
      setActiveItemLoading(null);
    }
  };

  const handleRequestAll = async () => {
    setIsRequestingAll(true);
    try {
      const res = await requestAllPhonePermissions();
      setPermissions(res);
      if (res.allGranted && onAllGranted) {
        onAllGranted();
      }
    } finally {
      setIsRequestingAll(false);
    }
  };

  const renderBadge = (status: string) => {
    if (status === 'granted') {
      return (
        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Autorizado
        </span>
      );
    }
    if (status === 'denied') {
      return (
        <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-red-600" /> Bloqueado
        </span>
      );
    }
    return (
      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
        Pendiente
      </span>
    );
  };

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200 border border-gray-100 max-h-[94vh] flex flex-col">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-[#ed0718] p-2.5 rounded-2xl text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg leading-tight">
                  Permisos del Teléfono
                </h3>
                <span className="bg-white/10 text-gray-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                  RODO SMA
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Autoriza los 4 permisos para entregas y validación en tu celular
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen Superior */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 p-3.5 px-4 text-xs text-amber-950 flex items-center gap-2.5 shrink-0">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Para que los repartidores encuentren tu casa en San Miguel y recibas la alerta de 10 minutos, autoriza estos permisos en tu navegador.
          </span>
        </div>

        {/* Lista de los 4 permisos */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {/* 1. Ubicación */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-gray-300 transition">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-600 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">1. Ubicación (GPS)</span>
                  {renderBadge(permissions.location)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Localiza tu domicilio exacto en San Miguel de Allende para el repartidor.
                </p>
              </div>
            </div>
            {permissions.location !== 'granted' && (
              <button
                type="button"
                onClick={() => handleRequestSingle('location')}
                disabled={activeItemLoading === 'location'}
                className="bg-[#101b29] hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 disabled:opacity-50"
              >
                {activeItemLoading === 'location' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Permitir'}
              </button>
            )}
          </div>

          {/* 2. Almacenamiento */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-gray-300 transition">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">2. Almacenamiento Seguro</span>
                  {renderBadge(permissions.storage)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Evita que se borre tu carrito, tus tickets o tu sesión al salir de la página.
                </p>
              </div>
            </div>
            {permissions.storage !== 'granted' && (
              <button
                type="button"
                onClick={() => handleRequestSingle('storage')}
                disabled={activeItemLoading === 'storage'}
                className="bg-[#101b29] hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 disabled:opacity-50"
              >
                {activeItemLoading === 'storage' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Permitir'}
              </button>
            )}
          </div>

          {/* 3. Notificaciones */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-gray-300 transition">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">3. Notificaciones en Vivo</span>
                  {renderBadge(permissions.notifications)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Aviso instantáneo cuando el motociclista esté afuera (tiempo de 10 min).
                </p>
              </div>
            </div>
            {permissions.notifications !== 'granted' && (
              <button
                type="button"
                onClick={() => handleRequestSingle('notifications')}
                disabled={activeItemLoading === 'notifications'}
                className="bg-[#101b29] hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 disabled:opacity-50"
              >
                {activeItemLoading === 'notifications' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Permitir'}
              </button>
            )}
          </div>

          {/* 4. Cámara */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-gray-300 transition">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">4. Cámara del Celular</span>
                  {renderBadge(permissions.camera)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Para fotografiar y leer los 10 dígitos del reverso del INE en el registro.
                </p>
              </div>
            </div>
            {permissions.camera !== 'granted' && (
              <button
                type="button"
                onClick={() => handleRequestSingle('camera')}
                disabled={activeItemLoading === 'camera'}
                className="bg-[#101b29] hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 disabled:opacity-50"
              >
                {activeItemLoading === 'camera' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Permitir'}
              </button>
            )}
          </div>
        </div>

        {/* Footer con Botón Maestro */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2 shrink-0">
          <button
            type="button"
            onClick={handleRequestAll}
            disabled={isRequestingAll}
            className="w-full bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isRequestingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Solicitando permisos en tu teléfono...</span>
              </>
            ) : permissions.allGranted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>✓ Todos los Permisos Autorizados</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Autorizar los 4 Permisos de RODO en este Teléfono</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 text-center">
            Tus datos de ubicación y cámara se procesan con estricta privacidad según la ley mexicana.
          </p>
        </div>
      </div>
    </div>
  );
};
