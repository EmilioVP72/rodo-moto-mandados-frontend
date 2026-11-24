import React, { useState, useEffect } from 'react';
import { useBackdropClose } from '../utils/modalBackdrop';
import {
  SecurityOtpAction,
  verifyOtpCode,
  getWhatsAppOtpDispatchUrl,
  getSmsOtpDispatchUrl,
  getRollingBankToken,
} from '../utils/securityOtp';
import { ShieldCheck, MessageSquare, Smartphone, AlertCircle, Key, RefreshCw, X, Check } from 'lucide-react';

interface SecurityOtpModalProps {
  challenge: SecurityOtpAction;
  adminPhone: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SecurityOtpModal: React.FC<SecurityOtpModalProps> = ({
  challenge,
  adminPhone,
  onSuccess,
  onCancel,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.round((challenge.expiresAt - Date.now()) / 1000))
  );
  const [rollingToken, setRollingToken] = useState(getRollingBankToken());

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((challenge.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      setRollingToken(getRollingBankToken());
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!inputCode.trim()) {
      setErrorMsg('Ingresa el código de 6 dígitos.');
      return;
    }

    const res = verifyOtpCode(challenge.id, inputCode);
    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleUseQuickToken = () => {
    // Rellenar directamente con el código temporal actual
    setInputCode(challenge.otpCode);
  };

  const waUrl = getWhatsAppOtpDispatchUrl(adminPhone || '5214151234567', challenge);
  const smsUrl = getSmsOtpDispatchUrl(adminPhone || '5214151234567', challenge);
  const backdropHandlers = useBackdropClose(true, onCancel);

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera de Seguridad */}
        <div className="bg-[#101b29] text-white p-5 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Autorización de Seguridad (OTP)</h3>
              <p className="text-xs text-gray-400">Protocolo Criptográfico de Doble Factor</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Acción crítica detectada:</p>
              <p className="font-semibold text-amber-800">{challenge.actionLabel}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Destino: {challenge.targetSubject}</p>
            </div>
          </div>

          {/* Opciones de envío de código por WhatsApp o SMS */}
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-2">
              Enviar código temporal al Administrador ({adminPhone || 'Teléfono Registrado'}):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white py-2 px-3 rounded-lg shadow-sm transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Enviar a WhatsApp
              </a>
              <a
                href={smsUrl}
                className="flex items-center justify-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg shadow-sm transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Enviar por SMS
              </a>
            </div>
          </div>

          {/* Caja tipo Token Bancario con Código Activo */}
          <div className="bg-gray-900 rounded-xl p-4 text-white text-center border border-gray-700 relative overflow-hidden">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1 flex items-center justify-center gap-1">
              <Key className="w-3 h-3 text-emerald-400" />
              Código de Seguridad RODO (Válido para esta acción)
            </div>
            <div className="text-3xl font-black tracking-widest text-emerald-400 font-mono py-1">
              {challenge.otpCode}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-[11px] text-gray-400">
                Expira en: <strong className="text-amber-400">{timeLeft}s</strong>
              </span>
              <button
                type="button"
                onClick={handleUseQuickToken}
                className="text-[10px] bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 px-2 py-0.5 rounded font-bold cursor-pointer"
              >
                Autocompletar
              </button>
            </div>
          </div>

          {/* Formulario de Confirmación */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Ingresa los 6 dígitos del código OTP:
              </label>
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-widest text-2xl font-mono font-bold py-2 px-4 border-2 border-gray-300 rounded-xl focus:border-[#ed0718] focus:ring-2 focus:ring-[#ed0718]/20 outline-none"
                autoFocus
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-bold text-center bg-red-50 p-2 rounded-lg border border-red-200">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={timeLeft <= 0}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#ed0718] hover:bg-red-700 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Confirmar Acción
              </button>
            </div>
          </form>
        </div>

        {/* Pie informativo */}
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 text-[11px] text-gray-500 text-center">
          Protección Bancaria RODO con Hash SHA-256 contra inyección y ataques de suplantación.
        </div>
      </div>
    </div>
  );
};
