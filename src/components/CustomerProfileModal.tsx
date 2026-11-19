import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  ShieldCheck,
  MapPin,
  Plus,
  Trash2,
  Receipt,
  LogOut,
  Copy,
  Check,
  Tag,
  Smartphone,
  Loader2,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { apiFetch } from '../api/httpClient';

interface SavedAddress {
  id: string;
  label: string;
  calle: string;
  numero: string;
  colonia: string;
  referencias?: string;
  isDefault: boolean;
}

interface ActiveSessionInfo {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  isCurrent: boolean;
}

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    phone: string;
    email: string;
    ine10Digits?: string;
    referralCode?: string;
  } | null;
  onUserUpdated: (updated: {
    id: string;
    name: string;
    phone: string;
    email: string;
    ine10Digits?: string;
    referralCode?: string;
  }) => void;
  onOpenMyOrders: () => void;
  onLogout: (allDevices?: boolean) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onOpenMyOrders,
  onLogout,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'direcciones' | 'sesiones'>('perfil');
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [referralCode, setReferralCode] = useState(currentUser?.referralCode || '');
  const [ine10Digits, setIne10Digits] = useState(currentUser?.ine10Digits || '');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [sessions, setSessions] = useState<ActiveSessionInfo[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [copiedRef, setCopiedRef] = useState(false);

  // Formulario de nueva dirección
  const [newLabel, setNewLabel] = useState('Casa');
  const [newCalle, setNewCalle] = useState('');
  const [newNumero, setNewNumero] = useState('');
  const [newColonia, setNewColonia] = useState('Centro Histórico');
  const [newRefs, setNewRefs] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setName(currentUser.name || '');
    setPhone(currentUser.phone || '');
    setErrorMsg('');

    setLoading(true);
    Promise.all([
      apiFetch<{ user: any; stats?: { totalOrders: number; activeSessions: number } }>('/api/auth/me'),
      apiFetch<ActiveSessionInfo[]>('/api/profile/sessions').catch(() => []),
    ])
      .then(([meRes, sessRes]) => {
        if (meRes?.user) {
          setName(meRes.user.name || currentUser.name);
          setPhone(meRes.user.phone || currentUser.phone);
          setReferralCode(meRes.user.referralCode || '');
          setIne10Digits(meRes.user.ine10Digits || '');
          setCoupons(Array.isArray(meRes.user.coupons) ? meRes.user.coupons : []);
          setAddresses(Array.isArray(meRes.user.addresses) ? meRes.user.addresses : []);
        }
        if (meRes?.stats) {
          setTotalOrders(meRes.stats.totalOrders || 0);
        }
        if (Array.isArray(sessRes)) {
          setSessions(sessRes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, currentUser?.id]);

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavingProfile(true);
    try {
      const res = await apiFetch<{ user: any }>('/api/auth/me', {
        method: 'PATCH',
        body: { name: name.trim(), phone: phone.trim() },
      });
      if (res?.user) {
        onUserUpdated({
          id: res.user.id,
          name: res.user.name,
          phone: res.user.phone,
          email: res.user.email,
          ine10Digits: res.user.ine10Digits,
          referralCode: res.user.referralCode,
        });
        onShowToast('¡Perfil actualizado correctamente en tu cuenta!');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo actualizar tu perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalle.trim() || !newNumero.trim() || !newColonia.trim()) {
      setErrorMsg('Completa calle, número y colonia.');
      return;
    }
    setErrorMsg('');
    setSavingAddr(true);
    try {
      const created = await apiFetch<SavedAddress>('/api/profile/addresses', {
        method: 'POST',
        body: {
          label: newLabel.trim() || 'Casa',
          calle: newCalle.trim(),
          numero: newNumero.trim(),
          colonia: newColonia.trim(),
          referencias: newRefs.trim() || undefined,
          isDefault: addresses.length === 0,
        },
      });
      setAddresses((prev) => [created, ...prev]);
      setNewCalle('');
      setNewNumero('');
      setNewRefs('');
      onShowToast('¡Dirección guardada exitosamente en tu perfil!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo guardar la dirección.');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await apiFetch(`/api/profile/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      onShowToast('Dirección eliminada de tu perfil.');
    } catch {}
  };

  const handleCopyReferral = () => {
    if (!referralCode) return;
    navigator.clipboard?.writeText(referralCode).catch(() => {});
    setCopiedRef(true);
    onShowToast(`Código ${referralCode} copiado al portapapeles`);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto border border-gray-200 dark:border-slate-700 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-lg shadow-md">
              {(name || currentUser.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm sm:text-base leading-tight">
                  {name || currentUser.name}
                </h3>
                <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.5 rounded-full font-black">
                  <ShieldCheck className="w-3 h-3" /> Sesión Activa
                </span>
              </div>
              <p className="text-[11px] text-gray-300">{currentUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-xs font-black shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`flex-1 py-3 px-2 transition cursor-pointer ${
              activeTab === 'perfil'
                ? 'bg-white dark:bg-slate-900 text-[#ed0718] border-b-2 border-[#ed0718]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            👤 Mi Perfil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('direcciones')}
            className={`flex-1 py-3 px-2 transition cursor-pointer ${
              activeTab === 'direcciones'
                ? 'bg-white dark:bg-slate-900 text-[#ed0718] border-b-2 border-[#ed0718]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            📍 Direcciones ({addresses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sesiones')}
            className={`flex-1 py-3 px-2 transition cursor-pointer ${
              activeTab === 'sesiones'
                ? 'bg-white dark:bg-slate-900 text-[#ed0718] border-b-2 border-[#ed0718]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            🔐 Sesiones ({sessions.length || 1})
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-left">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold p-3 rounded-xl">
              ⚠️ {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#ed0718]" />
              <span>Cargando tu perfil privado...</span>
            </div>
          ) : activeTab === 'perfil' ? (
            <>
              {/* Resumen rápido privado */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMyOrders();
                  }}
                  className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 p-3 rounded-2xl text-left transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                    <Receipt className="w-4 h-4" />
                    <span className="font-mono font-black text-base">{totalOrders}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white block mt-1">
                    Mis Pedidos ›
                  </span>
                  <span className="text-[10px] text-gray-500">Historial privado</span>
                </button>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="font-mono font-black text-xs">
                      INE ****{ine10Digits ? ine10Digits.slice(-4) : 'OK'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white block mt-1">
                    Cuenta Verificada
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    Sin adeudos activos
                  </span>
                </div>
              </div>

              {/* Código de Referidos Personal */}
              {referralCode && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 block">
                      🎁 Tu Código de Referido ($35 MXN OFF)
                    </span>
                    <span className="font-mono font-black text-sm text-gray-900 dark:text-white">
                      {referralCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyReferral}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRef ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              )}

              {/* Cupones Disponibles */}
              {coupons.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-gray-500 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#ed0718]" /> Tus Cupones ({coupons.filter((c) => !c.used).length} disponibles)
                  </span>
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        c.used
                          ? 'bg-gray-100 border-gray-200 opacity-60 line-through'
                          : 'bg-emerald-50/70 border-emerald-200'
                      }`}
                    >
                      <div>
                        <strong className="font-mono text-gray-900">{c.code}</strong>
                        <span className="block text-[10px] text-gray-600">{c.label}</span>
                      </div>
                      <span className="font-black text-emerald-700">${c.discount} MXN</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario de Edición de Perfil */}
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase text-gray-500">Datos de tu Cuenta</h4>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                    <User className="w-3 h-3 inline mr-1" /> Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-[#ed0718]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                    <Phone className="w-3 h-3 inline mr-1" /> Teléfono WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-[#ed0718]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                    <Mail className="w-3 h-3 inline mr-1" /> Correo Electrónico
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/50 text-gray-500 rounded-xl p-2.5 text-xs font-semibold cursor-not-allowed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-[#101b29] hover:bg-black text-white font-black text-xs py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Guardar Cambios de Perfil</span>
                </button>
              </form>
            </>
          ) : activeTab === 'direcciones' ? (
            <div className="space-y-4">
              {addresses.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-300 text-xs text-gray-500">
                  Aún no has guardado direcciones en tu perfil.
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#ed0718] shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-black text-gray-900 dark:text-white">
                            {addr.label} {addr.isDefault && <span className="text-[10px] text-emerald-600">(Principal)</span>}
                          </strong>
                          <p className="text-gray-600 dark:text-gray-300">
                            Calle {addr.calle} #{addr.numero}, Col. {addr.colonia}
                          </p>
                          {addr.referencias && (
                            <p className="text-[10px] text-gray-500">{addr.referencias}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Eliminar dirección"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddAddress} className="space-y-2.5 pt-3 border-t border-gray-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase text-gray-500 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-[#ed0718]" /> Agregar Nueva Dirección en SMA
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Etiqueta (Casa)"
                    className="border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded-xl p-2 text-xs font-bold outline-none focus:border-[#ed0718]"
                  />
                  <input
                    type="text"
                    required
                    value={newCalle}
                    onChange={(e) => setNewCalle(e.target.value)}
                    placeholder="Calle *"
                    className="col-span-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded-xl p-2 text-xs font-bold outline-none focus:border-[#ed0718]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={newNumero}
                    onChange={(e) => setNewNumero(e.target.value)}
                    placeholder="Núm. *"
                    className="border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded-xl p-2 text-xs font-bold outline-none focus:border-[#ed0718]"
                  />
                  <input
                    type="text"
                    required
                    value={newColonia}
                    onChange={(e) => setNewColonia(e.target.value)}
                    placeholder="Colonia *"
                    className="col-span-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded-xl p-2 text-xs font-bold outline-none focus:border-[#ed0718]"
                  />
                </div>
                <input
                  type="text"
                  value={newRefs}
                  onChange={(e) => setNewRefs(e.target.value)}
                  placeholder="Referencias (ej. zaguán café, junto a tienda)"
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded-xl p-2 text-xs outline-none focus:border-[#ed0718]"
                />
                <button
                  type="submit"
                  disabled={savingAddr}
                  className="w-full bg-[#ed0718] hover:bg-[#c90012] text-white font-black text-xs py-2.5 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savingAddr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Guardar Dirección</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Estas son tus sesiones activas registradas de forma segura en PostgreSQL. Solo tú tienes acceso a tu historial y perfil.
              </p>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span>{s.isCurrent ? 'Este dispositivo' : 'Otro dispositivo'}</span>
                        {s.isCurrent && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-black">
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">{s.userAgent || 'Navegador Web'}</p>
                      <p className="text-[10px] text-gray-400">
                        Iniciada: {new Date(s.createdAt).toLocaleString('es-MX')}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Cerrar Sesión */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={async () => {
              onClose();
              await onLogout(false);
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              onClose();
              await onLogout(true);
            }}
            className="bg-white dark:bg-slate-900 hover:bg-gray-100 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 font-bold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer"
          >
            Cerrar en todos los dispositivos
          </button>
        </div>
      </div>
    </div>
  );
};
