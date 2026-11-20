import React, { useState, useEffect } from 'react';
import {
  apiFetch,
  setAuthSessionTokens,
  ApiHttpError,
  uploadRecoveryDocToStorage,
} from '../api/httpClient';
import { identifySocketSession } from '../api/socketClient';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Camera,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  MessageCircle,
  KeyRound,
  FileUp,
} from 'lucide-react';
import {
  extractIne10DigitsFromImage,
  validateIneAgainstDebtsAndDuplicates,
  saveIneAccount,
  getStoredIneAccounts,
  verifyIneCicChecksum,
} from '../utils/ineScanner';
import { processReferralRegistration, generateCustomerReferralCode } from '../utils/referralSystem';
import { CustomerAccount, AccountRecoveryRequest } from '../types';
import {
  generateRecoveryFolio,
  submitAccountRecoveryRequest,
  findApprovedRecoveryForEmail,
  findApprovedRecoveryForEmailAsync,
} from '../services/db';

export type AuthSuccessMode = 'login' | 'register' | 'password_reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerLogin: (
    customer: {
      id: string;
      name: string;
      phone: string;
      email: string;
      ine10Digits?: string;
      referralCode?: string;
    },
    mode?: AuthSuccessMode
  ) => void;
  onAdminLoginSuccess: () => void;
  adminPasscode: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onCustomerLogin,
  onAdminLoginSuccess,
  adminPasscode,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Estados de escaneo de INE reverso (10 dígitos)
  const [ineFile, setIneFile] = useState<File | null>(null);
  const [inePreview, setInePreview] = useState<string | null>(null);
  const [ine10Digits, setIne10Digits] = useState('');
  const [isScanningIne, setIsScanningIne] = useState(false);
  const [ineScanSuccess, setIneScanSuccess] = useState(false);

  // Estados de Recuperación de Cuenta & Soporte
  const [recoveryMode, setRecoveryMode] = useState<'password_reset' | 'support_email_change'>('password_reset');
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetInfoMsg, setResetInfoMsg] = useState('');
  const [resetPreviewCode, setResetPreviewCode] = useState('');
  const [isResettingPass, setIsResettingPass] = useState(false);

  const [recOldEmail, setRecOldEmail] = useState('');
  const [recNewEmail, setRecNewEmail] = useState('');
  const [recReason, setRecReason] = useState('Olvidé mi contraseña / perdí acceso a mi cuenta anterior');
  const [recDocDataUrl, setRecDocDataUrl] = useState('');
  const [recDocName, setRecDocName] = useState('');
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);
  const [submittedRecovery, setSubmittedRecovery] = useState<AccountRecoveryRequest | null>(null);

  // Sistema de Códigos de Referidos
  const [referralCodeInput, setReferralCodeInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [blockedAccountInfo, setBlockedAccountInfo] = useState<CustomerAccount | null>(null);

  const resetAllFields = () => {
    setIsRegister(false);
    setIsRecovery(false);
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setIneFile(null);
    if (inePreview) {
      try {
        URL.revokeObjectURL(inePreview);
      } catch {}
    }
    setInePreview(null);
    setIne10Digits('');
    setIneScanSuccess(false);
    setReferralCodeInput('');
    setRecoveryMode('password_reset');
    setResetEmail('');
    setResetStep('request');
    setResetCode('');
    setResetNewPassword('');
    setResetInfoMsg('');
    setResetPreviewCode('');
    setRecOldEmail('');
    setRecNewEmail('');
    setRecDocDataUrl('');
    setRecDocName('');
    setSubmittedRecovery(null);
    setErrorMsg('');
    setBlockedAccountInfo(null);
  };

  // Limpiar completamente los campos al abrir o cerrar el modal para no exponer datos previos
  useEffect(() => {
    if (!isOpen) {
      resetAllFields();
    } else {
      setErrorMsg('');
      setBlockedAccountInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Manejo de carga de foto del INE reverso
  const handleIneFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setBlockedAccountInfo(null);
    setIneFile(file);
    setInePreview(URL.createObjectURL(file));
    setIsScanningIne(true);

    try {
      const scanResult = await extractIne10DigitsFromImage(file);
      if (scanResult.success && scanResult.detectedDigits) {
        setIne10Digits(scanResult.detectedDigits);
        setIneScanSuccess(true);

        // Pre-validar inmediatamente contra lista negra de deudas
        const check = validateIneAgainstDebtsAndDuplicates(scanResult.detectedDigits, email);
        if (!check.allowed) {
          setErrorMsg(check.message);
          if (check.account) {
            setBlockedAccountInfo(check.account);
          }
        }
      } else {
        setErrorMsg('No se detectaron los 10 dígitos con claridad. Por favor ingrésalos manualmente abajo.');
      }
    } catch (err) {
      setErrorMsg('Error al analizar la imagen del INE.');
    } finally {
      setIsScanningIne(false);
    }
  };

  // Manejo de carga y compresión de documentación oficial para soporte de recuperación
  const handleRecoveryDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setRecDocName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 720;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setRecDocDataUrl(canvas.toDataURL('image/jpeg', 0.72));
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !phone.trim() || phone.trim().length < 8) {
      setErrorMsg('Ingresa tu nombre completo y teléfono celular de WhatsApp (10 dígitos).');
      return;
    }
    if (!recNewEmail.trim() || !recNewEmail.includes('@')) {
      setErrorMsg('Ingresa el nuevo correo electrónico al que deseas recuperar tu acceso.');
      return;
    }
    if (!recDocDataUrl) {
      setErrorMsg('Por seguridad, adjunta una fotografía de tu INE o identificación oficial para validar tu identidad ante soporte.');
      return;
    }

    setIsSubmittingRecovery(true);
    try {
      const reqId = `rec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const folio = generateRecoveryFolio();
      const uploadedUrl = await uploadRecoveryDocToStorage(reqId, recDocDataUrl);

      const cleanRecIne = ine10Digits.replace(/[^0-9]/g, '');
      const payload: AccountRecoveryRequest = {
        id: reqId,
        folio,
        customerName: name.trim(),
        phone: phone.trim(),
        oldEmail: (recOldEmail || email || 'No recordado').trim().toLowerCase(),
        newEmail: recNewEmail.trim().toLowerCase(),
        reason: recReason.trim() || 'Recuperación de acceso / contraseña olvidada',
        documentPhotoUrl: uploadedUrl,
        ...(cleanRecIne ? { ine10Digits: cleanRecIne } : {}),
        status: 'pendiente',
        createdAt: new Date().toISOString(),
      };

      await submitAccountRecoveryRequest(payload);
      setSubmittedRecovery(payload);
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo enviar la solicitud de recuperación. Intenta nuevamente.');
    } finally {
      setIsSubmittingRecovery(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setBlockedAccountInfo(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('Por favor ingresa tu correo y contraseña.');
      return;
    }

    // 1. Flujo de Registro con Requisito Estricto de INE Reverso (10 Dígitos)
    if (isRegister) {
      if (!name.trim() || !phone.trim()) {
        setErrorMsg('Por favor completa tu nombre y número de teléfono celular.');
        return;
      }

      if (!ine10Digits.trim()) {
        setErrorMsg('⚠️ Para evitar fraudes y cancelaciones falsas, es obligatorio subir la foto del reverso de tu INE o ingresar los 10 dígitos.');
        return;
      }

      const cleanDigits = ine10Digits.replace(/[^0-9]/g, '');
      if (cleanDigits.length !== 10) {
        setErrorMsg('El número del reverso del INE debe tener exactamente 10 dígitos.');
        return;
      }

      const checksumValidation = verifyIneCicChecksum(cleanDigits);
      if (!checksumValidation.valid) {
        setErrorMsg(checksumValidation.reason || 'Los 10 dígitos no corresponden a una credencial INE válida.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await apiFetch<{
          token: string;
          refreshToken?: string;
          isAdmin: boolean;
          user: CustomerAccount;
        }>('/api/auth/register', {
          method: 'POST',
          body: {
            name: name.trim(),
            phone: phone.trim(),
            email: cleanEmail,
            password: cleanPass,
            ine10Digits: cleanDigits,
            referralCodeInput: referralCodeInput.trim() || undefined,
          },
        });

        setAuthSessionTokens(res.token, res.refreshToken || null);
        identifySocketSession(res.token);
        saveIneAccount(res.user);

        const customerPayload = {
          id: res.user.id,
          name: res.user.name,
          phone: res.user.phone,
          email: res.user.email,
          ine10Digits: res.user.ine10Digits || cleanDigits,
          referralCode: res.user.referralCode,
        };

        try {
          localStorage.setItem('rodo_user_session', JSON.stringify(customerPayload));
        } catch {}

        resetAllFields();
        onCustomerLogin(customerPayload, 'register');
        onClose();
        return;
      } catch (err: any) {
        if (err instanceof ApiHttpError) {
          setErrorMsg(err.message);
          if (err.data?.blockedAccount) {
            setBlockedAccountInfo(err.data.blockedAccount);
          }
          setIsLoading(false);
          return;
        }
        // Fallback offline si el servidor no está accesible temporalmente
        const validation = validateIneAgainstDebtsAndDuplicates(cleanDigits, cleanEmail);
        if (!validation.allowed) {
          setErrorMsg(validation.message);
          if (validation.account) {
            setBlockedAccountInfo(validation.account);
          }
          setIsLoading(false);
          return;
        }

        const accountId = 'cust-' + (phone.replace(/[^0-9]/g, '') || Date.now().toString());
        const myReferralCode = generateCustomerReferralCode(phone, accountId);

        const newAccount: CustomerAccount = {
          id: accountId,
          name: name.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          ineVerified: true,
          ineDigits: cleanDigits,
          ine10Digits: cleanDigits,
          inePhotoUploaded: true,
          ineVerifiedAt: new Date().toISOString(),
          pendingDebt: 0,
          status: 'activo',
          completedOrdersCount: 0,
          referralCode: myReferralCode,
          referralRewardsCount: 0,
          coupons: [],
          createdAt: new Date().toISOString(),
        };

        if (referralCodeInput.trim()) {
          const refRes = processReferralRegistration(referralCodeInput.trim(), newAccount);
          if (refRes.success && refRes.couponAwarded) {
            newAccount.coupons = [refRes.couponAwarded];
            newAccount.referredByCode = referralCodeInput.trim().toUpperCase();
          }
        }

        saveIneAccount(newAccount);

        const customerPayload = {
          id: newAccount.id,
          name: newAccount.name,
          phone: newAccount.phone,
          email: newAccount.email,
          ine10Digits: cleanDigits,
          referralCode: myReferralCode,
        };

        try {
          localStorage.setItem('rodo_user_session', JSON.stringify(customerPayload));
        } catch {}

        resetAllFields();
        onCustomerLogin(customerPayload, 'register');
        onClose();
        return;
      } finally {
        setIsLoading(false);
      }
    }

    // 2. Flujo de Inicio de Sesión (Autenticación Backend JWT + PostgreSQL)
    setIsLoading(true);
    try {
      const res = await apiFetch<{
        token: string;
        refreshToken?: string;
        isAdmin: boolean;
        user: CustomerAccount;
      }>('/api/auth/login', {
        method: 'POST',
        body: {
          email: cleanEmail,
          password: cleanPass,
        },
      });

      setAuthSessionTokens(res.token, res.refreshToken || null);
      identifySocketSession(res.token);

      if (res.isAdmin) {
        resetAllFields();
        onAdminLoginSuccess();
        onClose();
        return;
      }

      saveIneAccount(res.user);
      const customerPayload = {
        id: res.user.id,
        name: res.user.name,
        phone: res.user.phone,
        email: res.user.email,
        ine10Digits: res.user.ine10Digits,
        referralCode: res.user.referralCode,
      };

      try {
        localStorage.setItem('rodo_user_session', JSON.stringify(customerPayload));
      } catch {}

      resetAllFields();
      onCustomerLogin(customerPayload, 'login');
      onClose();
      return;
    } catch (err: any) {
      if (err instanceof ApiHttpError) {
        setErrorMsg(err.message);
        if (err.data?.blockedAccount) {
          setBlockedAccountInfo(err.data.blockedAccount);
        }
        setIsLoading(false);
        return;
      }
      setErrorMsg(
        'No se pudo conectar con el servidor de autenticación RODO. Verifica tu conexión e inténtalo nuevamente.'
      );
      setIsLoading(false);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-servicio: Solicitar código de recuperación de contraseña de 6 dígitos en PostgreSQL
  const handleRequestPasswordResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetInfoMsg('');
    setResetPreviewCode('');

    const targetEmail = (resetEmail || email).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('Ingresa el correo electrónico de tu cuenta.');
      return;
    }

    setIsResettingPass(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        message: string;
        resetCodePreview?: string;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: targetEmail },
      });
      setResetEmail(targetEmail);
      setResetStep('confirm');
      setResetInfoMsg(res.message);
      if (res.resetCodePreview) {
        setResetPreviewCode(res.resetCodePreview);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo generar el código de recuperación.');
    } finally {
      setIsResettingPass(false);
    }
  };

  // Auto-servicio: Confirmar código de 6 dígitos y establecer nueva contraseña encriptada
  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!resetCode.trim() || resetCode.trim().length !== 6) {
      setErrorMsg('Ingresa el código numérico de 6 dígitos.');
      return;
    }
    if (!resetNewPassword.trim() || resetNewPassword.trim().length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsResettingPass(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        token: string;
        refreshToken?: string;
        isAdmin: boolean;
        user: CustomerAccount;
      }>('/api/auth/reset-password', {
        method: 'POST',
        body: {
          email: resetEmail.trim().toLowerCase(),
          code: resetCode.trim(),
          newPassword: resetNewPassword.trim(),
        },
      });

      setAuthSessionTokens(res.token, res.refreshToken || null);
      identifySocketSession(res.token);

      if (res.isAdmin) {
        resetAllFields();
        onAdminLoginSuccess();
        onClose();
        return;
      }

      const customerPayload = {
        id: res.user.id,
        name: res.user.name,
        phone: res.user.phone,
        email: res.user.email,
        ine10Digits: res.user.ine10Digits,
        referralCode: res.user.referralCode,
      };
      try {
        localStorage.setItem('rodo_user_session', JSON.stringify(customerPayload));
      } catch {}

      resetAllFields();
      onCustomerLogin(customerPayload, 'password_reset');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Código incorrecto o expirado.');
    } finally {
      setIsResettingPass(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg overflow-hidden shadow-2xl sm:my-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 border border-gray-100 max-h-[94dvh] flex flex-col">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#ed0718] p-2 rounded-xl text-white shadow-xs">
              <User className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight">
                {isRecovery
                  ? 'Recuperación de Cuenta y Soporte'
                  : isRegister
                  ? 'Registro con Validación INE'
                  : 'Acceso a Cuenta RODO'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {isRecovery
                  ? 'Solicita acceso a tu nueva cuenta enviando tu documentación a soporte'
                  : isRegister
                  ? 'Requerido para realizar pedidos y evitar fraudes en efectivo'
                  : 'Ingresa para ordenar comida y solicitar motomandados'}
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

        {/* Pestañas: Iniciar Sesión vs Registrarse vs Recuperar Cuenta */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-[11px] sm:text-xs font-black shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setIsRecovery(false);
              setErrorMsg('');
              setBlockedAccountInfo(null);
            }}
            className={`flex-1 py-3 px-2 text-center transition cursor-pointer ${
              !isRegister && !isRecovery
                ? 'bg-white text-[#ed0718] border-b-2 border-[#ed0718]'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setIsRecovery(false);
              setErrorMsg('');
              setBlockedAccountInfo(null);
            }}
            className={`flex-1 py-3 px-2 text-center transition cursor-pointer ${
              isRegister && !isRecovery
                ? 'bg-white text-[#ed0718] border-b-2 border-[#ed0718]'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            Crear Cuenta (INE)
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRecovery(true);
              setIsRegister(false);
              setErrorMsg('');
              setBlockedAccountInfo(null);
            }}
            className={`flex-1 py-3 px-2 text-center transition cursor-pointer flex items-center justify-center gap-1 ${
              isRecovery
                ? 'bg-white text-[#ed0718] border-b-2 border-[#ed0718]'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Recuperar Cuenta</span>
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-900 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-left">{errorMsg}</div>
            </div>
          )}

          {blockedAccountInfo && (
            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl text-xs space-y-1 text-left text-amber-950">
              <strong className="block font-black text-red-700">⚠️ Registro Bloqueado por Deuda Activa:</strong>
              <p>Titular registrado: <b>{blockedAccountInfo.name}</b></p>
              <p>Monto pendiente: <b>${blockedAccountInfo.pendingDebt.toFixed(2)} MXN</b></p>
              {blockedAccountInfo.debtReason && (
                <p className="text-[11px] text-gray-700">Causa: {blockedAccountInfo.debtReason}</p>
              )}
            </div>
          )}

          {isRecovery ? (
            <div className="space-y-4 text-left">
              {/* Selector entre Auto-Servicio de Contraseña vs Cambio de Correo con Soporte */}
              <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl text-[11px] font-black">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode('password_reset');
                    setErrorMsg('');
                  }}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer ${
                    recoveryMode === 'password_reset'
                      ? 'bg-white text-[#ed0718] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔑 Restablecer Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode('support_email_change');
                    setErrorMsg('');
                  }}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer ${
                    recoveryMode === 'support_email_change'
                      ? 'bg-white text-[#ed0718] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🪪 Cambiar Correo (INE)
                </button>
              </div>

              {recoveryMode === 'password_reset' ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950 space-y-1">
                    <strong className="font-black flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-700" />
                      Recuperación Segura de Contraseña (15 min)
                    </strong>
                    <p className="text-[11px] leading-relaxed">
                      Genera un código de verificación de 6 dígitos para crear una nueva contraseña. Por seguridad, todas tus sesiones abiertas en otros dispositivos se cerrarán automáticamente.
                    </p>
                  </div>

                  {resetStep === 'request' ? (
                    <form onSubmit={handleRequestPasswordResetCode} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1">
                          Correo electrónico de tu cuenta *
                        </label>
                        <input
                          type="email"
                          required
                          value={resetEmail || email}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="tu.correo@ejemplo.com"
                          className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#ed0718]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isResettingPass}
                        className="w-full bg-[#ed0718] hover:bg-[#c90012] disabled:bg-gray-400 text-white font-black text-xs py-3 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isResettingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        <span>{isResettingPass ? 'Generando código...' : 'Generar Código de 6 Dígitos'}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleConfirmPasswordReset} className="space-y-3">
                      {resetInfoMsg && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-950 p-3 rounded-xl text-[11px] font-semibold space-y-1">
                          <p>{resetInfoMsg}</p>
                          {resetPreviewCode && (
                            <p className="font-mono text-sm font-black text-[#ed0718] bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 text-center tracking-widest">
                              Código de verificación: {resetPreviewCode}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1">
                          Código de 6 dígitos *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="000000"
                          className="w-full text-center font-mono text-base tracking-widest font-black border-2 border-gray-300 rounded-xl p-2 outline-none focus:border-[#ed0718]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1">
                          Nueva Contraseña (mínimo 6 caracteres) *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#ed0718]"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetStep('request');
                            setResetCode('');
                            setResetPreviewCode('');
                            setErrorMsg('');
                          }}
                          className="px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Volver
                        </button>
                        <button
                          type="submit"
                          disabled={isResettingPass}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-black text-xs py-2.5 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isResettingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>Guardar Nueva Contraseña y Entrar</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <>
              {/* Pasos a seguir en soporte */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-2 text-xs text-blue-950">
                <h4 className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-900">
                  <KeyRound className="w-4 h-4 text-[#ed0718]" />
                  Pasos a seguir para recuperar tu cuenta:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed font-medium text-blue-900">
                  <li>
                    <b>Solicita la recuperación:</b> Llena tu nombre, teléfono, correo olvidado y el <b>nuevo correo</b> que usarás.
                  </li>
                  <li>
                    <b>Adjunta tu documentación:</b> Sube fotografía nítida de tu INE o identificación oficial para validar tu titularidad.
                  </li>
                  <li>
                    <b>Comunícate con soporte:</b> Envía tu folio de recuperación y documentos por WhatsApp oficial (<b>415-101-9920</b>).
                  </li>
                  <li>
                    <b>Ingreso a tu nueva cuenta:</b> En cuanto el administrador apruebe tu caso, podrás entrar de inmediato con tu nuevo correo o Google.
                  </li>
                </ol>
              </div>

              {submittedRecovery ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>¡Solicitud de Recuperación Enviada!</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <div>
                      <span className="text-gray-500">Folio de Soporte:</span>{' '}
                      <strong className="font-mono text-[#ed0718]">{submittedRecovery.folio}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Nuevo Correo Solicitado:</span>{' '}
                      <strong>{submittedRecovery.newEmail}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Estado:</span>{' '}
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-black text-[10px]">
                        Pendiente de validación por Soporte
                      </span>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/524151019920?text=${encodeURIComponent(
                      `🔐 *RODO · SOLICITUD DE RECUPERACIÓN DE CUENTA*\n📌 *Folio:* ${submittedRecovery.folio}\n👤 *Nombre:* ${submittedRecovery.customerName}\n📞 *Teléfono:* ${submittedRecovery.phone}\n📧 *Correo anterior:* ${submittedRecovery.oldEmail}\n✅ *Nuevo correo para activar:* ${submittedRecovery.newEmail}\n\nHola soporte RODO, adjunto por aquí también mi documentación oficial para reactivar mi cuenta.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Comunicar con Soporte y Enviar Documentos (WhatsApp)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedRecovery(null);
                      setIsRecovery(false);
                      setEmail(submittedRecovery.newEmail);
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Volver a Iniciar Sesión con mi Nuevo Correo
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitRecovery} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Titular de la cuenta"
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1">Teléfono WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="4151234567"
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs font-mono font-bold outline-none focus:border-[#ed0718]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1">Correo de cuenta olvidada</label>
                      <input
                        type="email"
                        value={recOldEmail}
                        onChange={(e) => setRecOldEmail(e.target.value)}
                        placeholder="correo.anterior@ejemplo.com"
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1">Nuevo correo a activar *</label>
                      <input
                        type="email"
                        required
                        value={recNewEmail}
                        onChange={(e) => setRecNewEmail(e.target.value)}
                        placeholder="nuevo.correo@gmail.com"
                        className="w-full border border-emerald-300 bg-emerald-50/40 rounded-xl p-2 text-xs font-semibold outline-none focus:border-[#ed0718]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 mb-1">
                      Motivo / Detalles para Soporte
                    </label>
                    <input
                      type="text"
                      value={recReason}
                      onChange={(e) => setRecReason(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2 text-xs outline-none focus:border-[#ed0718]"
                    />
                  </div>

                  <div className="bg-slate-50 border-2 border-dashed border-gray-300 rounded-2xl p-3 space-y-2">
                    <label className="block text-[11px] font-black text-gray-800">
                      Documentación Oficial (Foto de INE o Selfie con INE) *
                    </label>
                    <label className="w-full bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition">
                      <FileUp className="w-4 h-4 text-[#ed0718]" />
                      <span>{recDocName ? `Adjunto: ${recDocName}` : 'Subir Fotografía de Documentación'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleRecoveryDocChange}
                        className="hidden"
                      />
                    </label>
                    {recDocDataUrl && (
                      <img
                        src={recDocDataUrl}
                        alt="Documento adjunto"
                        className="h-24 w-auto rounded-xl border border-gray-300 object-cover mx-auto"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRecovery}
                    className="w-full bg-[#ed0718] hover:bg-[#c90012] disabled:bg-gray-400 text-white font-black text-xs py-3 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingRecovery ? <Loader2 className="w-4 h-4 animate-spin" /> : <LifeBuoy className="w-4 h-4" />}
                    <span>{isSubmittingRecovery ? 'Enviando solicitud...' : 'Solicitar Recuperación y Generar Folio'}</span>
                  </button>
                </form>
              )}
                </>
              )}
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
            {isRegister && (
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" /> Nombre Completo:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre y apellidos"
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:border-[#ed0718] outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-400" /> Correo Electrónico:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ejemplo@correo.com"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:border-[#ed0718] outline-none"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> Teléfono Celular (WhatsApp de Entrega):
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="4151234567"
                  maxLength={10}
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-mono font-bold focus:border-[#ed0718] outline-none"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-gray-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-gray-400" /> Contraseña:
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecovery(true);
                      setRecOldEmail(email);
                      setErrorMsg('');
                    }}
                    className="text-[11px] font-bold text-[#ed0718] hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:border-[#ed0718] outline-none"
              />
            </div>

            {/* SECCIÓN OBLIGATORIA DE REGISTRO: FOTO TRASERA DEL INE + EXTRACCIÓN DE 10 DÍGITOS */}
            {isRegister && (
              <div className="bg-slate-50 border-2 border-dashed border-red-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-gray-900 flex items-center gap-1.5 uppercase">
                      <CreditCard className="w-4 h-4 text-[#ed0718]" />
                      Foto de tu INE (Parte Trasera / Reverso)
                    </span>
                    <p className="text-[11px] text-gray-500 leading-tight">
                      El algoritmo extraerá automáticamente los 10 dígitos numéricos para proteger tu cuenta y evitar fraudes.
                    </p>
                  </div>
                  <span className="bg-[#ed0718] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                    Obligatorio
                  </span>
                </div>

                {/* Botón de Selección / Cámara */}
                <div className="flex items-center gap-3">
                  <label className="flex-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-2xs transition">
                    <Camera className="w-4 h-4 text-[#ed0718]" />
                    <span>{ineFile ? 'Cambiar Foto del INE' : 'Subir Foto Trasera del INE'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleIneFileChange}
                      className="hidden"
                    />
                  </label>

                  {isScanningIne && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin text-[#ed0718]" />
                      <span>Leyendo 10 dígitos...</span>
                    </div>
                  )}
                </div>

                {/* Previsualización y Dígitos Detectados */}
                {inePreview && (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
                    <img
                      src={inePreview}
                      alt="Reverso INE"
                      className="w-16 h-11 object-cover rounded-lg border border-gray-300 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">
                        {ineScanSuccess ? '✓ Reverso analizado con éxito' : 'Procesando reverso...'}
                      </span>
                      <span className="text-xs text-emerald-700 font-extrabold truncate block">
                        Archivo: {ineFile?.name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Campo de 10 Dígitos Leídos */}
                <div>
                  <label className="block text-[11px] font-black text-gray-700 mb-1">
                    10 Dígitos del Reverso del INE (CIC / Identificador OCR):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      value={ine10Digits}
                      onChange={(e) => setIne10Digits(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Ej. 8942105438"
                      required
                      className="w-full text-center tracking-widest font-mono text-base font-black py-2 px-3 border-2 border-gray-300 rounded-xl bg-white focus:border-[#ed0718] outline-none"
                    />
                    {ine10Digits.length === 10 && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute right-3 top-2.5" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>Mínimo y máximo: 10 dígitos numéricos</span>
                    <span className="font-bold text-gray-600 font-mono">
                      {ine10Digits.length}/10
                    </span>
                  </div>
                </div>

                {/* Aviso de Privacidad y Blindaje */}
                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-[10px] text-emerald-900 space-y-0.5">
                  <div className="font-black flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Blindaje de Privacidad RODO:
                  </div>
                  <p className="leading-tight text-emerald-800">
                    Tu fotografía se procesa en el dispositivo; <b>únicamente se guardan los 10 dígitos numéricos</b> para evitar pedidos falsos y deudas sin liquidar.
                  </p>
                </div>

                {/* Código de Referido Opcional (Promociones Antifraude) */}
                <div className="pt-2 border-t border-red-100">
                  <label className="block text-[11px] font-black text-gray-700 mb-1 flex items-center justify-between">
                    <span>¿Tienes un Código de Referido de un amigo?</span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Opcional · Cupón $50 MXN
                    </span>
                  </label>
                  <input
                    type="text"
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ej. RODO-4920"
                    className="w-full uppercase font-mono font-bold text-xs p-2.5 border border-gray-300 rounded-xl bg-white focus:border-amber-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Al completar tu registro e iniciar sesión, tú y tu amigo recibirán un cupón de descuento verificado.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#ed0718] hover:bg-[#c90012] disabled:bg-gray-400 text-white font-black text-xs py-3.5 rounded-xl shadow-md transition mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isRegister ? 'Completar Registro con INE' : 'Iniciar Sesión'}</span>
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};
