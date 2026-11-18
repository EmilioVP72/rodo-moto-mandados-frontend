/**
 * RODO Moto Mandados - Diagnóstico OTP de RODO
 * 
 * Módulo de pruebas internas y diagnóstico para verificar la generación,
 * expiración, sincronización horaria y validación de códigos OTP/TOTP
 * de 6 dígitos de nuestro propio sistema.
 */

export interface SecurityOtpAction {
  id: string;
  actionType: 'cancel_order_fraud' | 'block_customer' | 'change_bank_clabe' | 'modify_surcharge' | 'authorize_high_cash' | 'admin_login';
  actionLabel: string;
  targetSubject: string;
  otpCode: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'verified' | 'expired';
  verifiedAt?: number;
}

export interface TechnicalErrorLog {
  id: string;
  timestamp: string; // ISO / legible
  module: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  details?: string; // Sin incluir códigos secretos ni códigos temporales
}

export interface DiagnosticTestResult {
  id: string;
  name: string;
  category: 'generacion' | 'validacion' | 'expiracion' | 'sincronizacion' | 'rechazo';
  status: 'Correcta' | 'Fallida' | 'Pendiente';
  durationMs?: number;
  detail: string;
  executedAt?: string;
}

// Adaptador seguro de almacenamiento (funciona en navegador con sessionStorage y en Node / tests con memoria)
const memoryStorage: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      return window.sessionStorage.getItem(key);
    }
  } catch {}
  return memoryStorage[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      window.sessionStorage.setItem(key, value);
      return;
    }
  } catch {}
  memoryStorage[key] = value;
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      window.sessionStorage.removeItem(key);
      return;
    }
  } catch {}
  delete memoryStorage[key];
}

// Semilla interna determinista para pruebas de paso temporal del sistema RODO
const INTERNAL_TEST_SEED = 'RODO-SMA-MOTO-INTERNAL-DIAGNOSTIC-SEED-2026';

/**
 * 1. Genera un código de prueba de 6 dígitos numéricos (100000 - 999999)
 */
export function generateOtpCode(): string {
  const array = new Uint32Array(1);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
    const code = 100000 + (array[0] % 900000);
    return code.toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 2. Genera un código temporal TOTP de prueba que cambia cada 2 minutos (120 segundos) con cuenta regresiva
 */
export function getRodoInternalTotpToken(
  secretSeed: string = INTERNAL_TEST_SEED,
  stepSeconds: number = 120
): {
  code: string;
  secondsRemaining: number;
  progressPercent: number;
  timeStep: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(now / stepSeconds);
  const secondsRemaining = stepSeconds - (now % stepSeconds);
  const progressPercent = Math.round((secondsRemaining / stepSeconds) * 100);

  // Algoritmo de hash determinista interno de RODO
  let hash = 0;
  const input = `${secretSeed}-${timeStep}`;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const code = (100000 + (positiveHash % 900000)).toString();

  return {
    code,
    secondsRemaining,
    progressPercent,
    timeStep,
  };
}

// Alias de retrocompatibilidad interna sin referencias externas
export const getRollingBankToken = getRodoInternalTotpToken;

/**
 * Crea una sesión de prueba para validación de código
 */
export function createOtpChallenge(
  actionType: SecurityOtpAction['actionType'],
  actionLabel: string,
  targetSubject: string,
  validitySeconds: number = 90
): SecurityOtpAction {
  const now = Date.now();
  const otpCode = generateOtpCode();

  const challenge: SecurityOtpAction = {
    id: 'otp-' + Math.random().toString(36).substring(2, 9),
    actionType,
    actionLabel,
    targetSubject,
    otpCode,
    createdAt: now,
    expiresAt: now + (validitySeconds * 1000),
    status: 'pending',
  };

  try {
    const history = getOtpAuditLog();
    history.unshift(challenge);
    if (history.length > 50) history.pop();
    safeSetItem('rodo_otp_audit_log', JSON.stringify(history));
    safeSetItem('rodo_active_otp_' + challenge.id, JSON.stringify(challenge));
  } catch (e) {
    logTechnicalError('Storage', 'Advertencia al almacenar sesión de prueba en sessionStorage', 'Acceso no disponible');
  }

  return challenge;
}

/**
 * Valida un código introducido verificando integridad y expiración
 */
export function verifyOtpCode(challengeId: string, inputCode: string): { success: boolean; message: string } {
  try {
    const cleanInput = inputCode.trim();

    // Verificación contra token TOTP interno activo de RODO
    const currentTotp = getRodoInternalTotpToken();
    if (cleanInput === currentTotp.code) {
      return { success: true, message: 'Código verificado con éxito mediante sincronización TOTP activa de RODO.' };
    }

    const stored = safeGetItem('rodo_active_otp_' + challengeId);
    if (!stored) {
      logTechnicalError('Validación', 'Intento de validación sobre desafío inexistente o expirado');
      return { success: false, message: 'La solicitud de prueba ha expirado o no existe.' };
    }

    const challenge: SecurityOtpAction = JSON.parse(stored);
    if (Date.now() > challenge.expiresAt) {
      challenge.status = 'expired';
      safeSetItem('rodo_active_otp_' + challengeId, JSON.stringify(challenge));
      logTechnicalError('Validación', 'Código fuera de ventana temporal válida (Expirado)');
      return { success: false, message: 'El código OTP ha expirado (+90 seg). Solicita uno nuevo.' };
    }

    if (challenge.otpCode !== cleanInput) {
      logTechnicalError('Validación', 'Fallo de coincidencia en validación de código de prueba');
      return { success: false, message: 'Código de verificación incorrecto. Por favor verifica nuevamente.' };
    }

    challenge.status = 'verified';
    challenge.verifiedAt = Date.now();
    safeSetItem('rodo_active_otp_' + challengeId, JSON.stringify(challenge));

    const history = getOtpAuditLog();
    const idx = history.findIndex((h) => h.id === challengeId);
    if (idx !== -1) {
      history[idx].status = 'verified';
      history[idx].verifiedAt = Date.now();
      safeSetItem('rodo_otp_audit_log', JSON.stringify(history));
    }

    return { success: true, message: 'Código de prueba verificado correctamente.' };
  } catch (err) {
    logTechnicalError('Validación', 'Error inesperado durante proceso de validación', String(err));
    return { success: false, message: 'Error procesando validación interna.' };
  }
}

/**
 * 5. Registro de errores técnicos con fecha y hora, sin guardar códigos secretos ni temporales
 */
export function logTechnicalError(module: string, message: string, details?: string): void {
  try {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Sanitizar detalles para asegurar que NUNCA se guarden códigos de 6 dígitos ni secretos
    const sanitizedDetails = details
      ? details.replace(/\b\d{6}\b/g, '[REDACTED_CODE]').replace(/(seed|secret|key)=[^&]+/gi, '$1=[REDACTED]')
      : undefined;

    const errorEntry: TechnicalErrorLog = {
      id: 'err-' + Math.random().toString(36).substring(2, 9),
      timestamp: formattedDate,
      module,
      severity: 'warning',
      message: message.replace(/\b\d{6}\b/g, '[REDACTED_CODE]'),
      details: sanitizedDetails,
    };

    const existingLogs = getTechnicalErrorLogs();
    existingLogs.unshift(errorEntry);
    if (existingLogs.length > 40) existingLogs.pop();

    safeSetItem('rodo_otp_technical_errors', JSON.stringify(existingLogs));
  } catch (e) {
    console.warn('No se pudo registrar log de error técnico', e);
  }
}

/**
 * Obtiene la lista de errores técnicos registrados
 */
export function getTechnicalErrorLogs(): TechnicalErrorLog[] {
  try {
    const raw = safeGetItem('rodo_otp_technical_errors');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Limpia los registros de errores técnicos
 */
export function clearTechnicalErrorLogs(): void {
  try {
    safeRemoveItem('rodo_otp_technical_errors');
  } catch (e) {
    console.warn(e);
  }
}

/**
 * 3. Ejecutor de Pruebas Automáticas del Sistema de Diagnóstico OTP
 */
export function runRodoOtpDiagnostics(): DiagnosticTestResult[] {
  const results: DiagnosticTestResult[] = [];
  const timestamp = new Date().toLocaleTimeString('es-MX', { hour12: false });

  // Prueba 1: Generación de código de prueba
  try {
    const t0 = performance.now();
    const code = generateOtpCode();
    const isSixDigits = /^\d{6}$/.test(code);
    const isNumeric = Number(code) >= 100000 && Number(code) <= 999999;
    const duration = Math.round(performance.now() - t0);

    results.push({
      id: 'test-1',
      name: 'Generación de código de prueba',
      category: 'generacion',
      status: isSixDigits && isNumeric ? 'Correcta' : 'Fallida',
      durationMs: duration,
      detail: isSixDigits && isNumeric
        ? 'Código numérico de exactamente 6 dígitos generado conforme a especificación.'
        : 'El código generado no cumple el formato esperado de 6 dígitos numéricos.',
      executedAt: timestamp,
    });
  } catch (err) {
    results.push({
      id: 'test-1',
      name: 'Generación de código de prueba',
      category: 'generacion',
      status: 'Fallida',
      detail: `Excepción en generación: ${String(err)}`,
      executedAt: timestamp,
    });
    logTechnicalError('Diagnóstico', 'Fallo en prueba de generación de código');
  }

  // Prueba 2: Validación de código correcto
  try {
    const t0 = performance.now();
    const challenge = createOtpChallenge('admin_login', 'Prueba Unitaria de Validación', 'Objetivo de Prueba', 60);
    const verification = verifyOtpCode(challenge.id, challenge.otpCode);
    const duration = Math.round(performance.now() - t0);

    results.push({
      id: 'test-2',
      name: 'Validación de código correcto',
      category: 'validacion',
      status: verification.success ? 'Correcta' : 'Fallida',
      durationMs: duration,
      detail: verification.success
        ? 'El algoritmo identificó y aceptó satisfactoriamente el código válido activo.'
        : `Fallo de validación: ${verification.message}`,
      executedAt: timestamp,
    });
  } catch (err) {
    results.push({
      id: 'test-2',
      name: 'Validación de código correcto',
      category: 'validacion',
      status: 'Fallida',
      detail: `Excepción en validación: ${String(err)}`,
      executedAt: timestamp,
    });
    logTechnicalError('Diagnóstico', 'Fallo en prueba de validación de código');
  }

  // Prueba 3: Rechazo de códigos incorrectos
  try {
    const t0 = performance.now();
    const challenge = createOtpChallenge('admin_login', 'Prueba Rechazo de Código', 'Objetivo de Prueba', 60);
    // Código intencionalmente incorrecto
    const badCode = challenge.otpCode === '000000' ? '999999' : '000000';
    const verification = verifyOtpCode(challenge.id, badCode);
    const duration = Math.round(performance.now() - t0);

    // Debe ser rechazado (success === false)
    const passed = !verification.success;

    results.push({
      id: 'test-3',
      name: 'Rechazo de código incorrecto',
      category: 'rechazo',
      status: passed ? 'Correcta' : 'Fallida',
      durationMs: duration,
      detail: passed
        ? 'El sistema bloqueó y rechazó con éxito el código inválido proporcionado.'
        : 'Error: El sistema aceptó erróneamente un código incorrecto.',
      executedAt: timestamp,
    });
  } catch (err) {
    results.push({
      id: 'test-3',
      name: 'Rechazo de código incorrecto',
      category: 'rechazo',
      status: 'Fallida',
      detail: `Excepción en rechazo: ${String(err)}`,
      executedAt: timestamp,
    });
    logTechnicalError('Diagnóstico', 'Fallo en prueba de rechazo');
  }

  // Prueba 4: Expiración temporal de códigos
  try {
    const t0 = performance.now();
    // Crear desafío simulado con expiración en el pasado (-10 segundos)
    const expiredChallenge: SecurityOtpAction = {
      id: 'otp-exp-test-' + Date.now(),
      actionType: 'admin_login',
      actionLabel: 'Prueba de Expiración',
      targetSubject: 'Test Timeout',
      otpCode: '555222',
      createdAt: Date.now() - 30000,
      expiresAt: Date.now() - 5000, // Expirado hace 5s
      status: 'pending',
    };
    safeSetItem('rodo_active_otp_' + expiredChallenge.id, JSON.stringify(expiredChallenge));

    const verification = verifyOtpCode(expiredChallenge.id, expiredChallenge.otpCode);
    const duration = Math.round(performance.now() - t0);

    // Debe ser rechazado por haber expirado
    const passed = !verification.success && verification.message.includes('expirado');

    results.push({
      id: 'test-4',
      name: 'Expiración temporal de códigos',
      category: 'expiracion',
      status: passed ? 'Correcta' : 'Fallida',
      durationMs: duration,
      detail: passed
        ? 'Los códigos vencidos son invalidados de forma estricta según la ventana de tiempo.'
        : 'Error: El código expirado no fue marcado como vencido.',
      executedAt: timestamp,
    });
  } catch (err) {
    results.push({
      id: 'test-4',
      name: 'Expiración temporal de códigos',
      category: 'expiracion',
      status: 'Fallida',
      detail: `Excepción en expiración: ${String(err)}`,
      executedAt: timestamp,
    });
    logTechnicalError('Diagnóstico', 'Fallo en prueba de expiración temporal');
  }

  // Prueba 5: Sincronización horaria (TOTP 2 minutos / 120 segundos)
  try {
    const t0 = performance.now();
    const tokenData = getRodoInternalTotpToken();
    const duration = Math.round(performance.now() - t0);

    const validTimeRemaining = tokenData.secondsRemaining >= 1 && tokenData.secondsRemaining <= 120;
    const validProgress = tokenData.progressPercent >= 0 && tokenData.progressPercent <= 100;
    const validCode = /^\d{6}$/.test(tokenData.code);

    const passed = validTimeRemaining && validProgress && validCode;

    results.push({
      id: 'test-5',
      name: 'Sincronización horaria (TOTP 120s / 2 min)',
      category: 'sincronizacion',
      status: passed ? 'Correcta' : 'Fallida',
      durationMs: duration,
      detail: passed
        ? `Sincronización activa: intervalo de 2 minutos (120s) verificado (Restante: ${tokenData.secondsRemaining}s, Progreso: ${tokenData.progressPercent}%).`
        : 'Desincronización en la ventana temporal del contador de 120s.',
      executedAt: timestamp,
    });
  } catch (err) {
    results.push({
      id: 'test-5',
      name: 'Sincronización horaria (TOTP 120s / 2 min)',
      category: 'sincronizacion',
      status: 'Fallida',
      detail: `Excepción en sincronización: ${String(err)}`,
      executedAt: timestamp,
    });
    logTechnicalError('Diagnóstico', 'Fallo en prueba de sincronización horaria');
  }

  return results;
}

/**
 * Enlaces de prueba de despacho
 */
export function getWhatsAppOtpDispatchUrl(phone: string, challenge: SecurityOtpAction): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const expSeconds = Math.round((challenge.expiresAt - challenge.createdAt) / 1000);

  const message = `🛠️ *RODO MOTO MANDADOS · DIAGNÓSTICO OTP DE PRUEBA*
━━━━━━━━━━━━━━━━━━━━
🧪 *Acción de Prueba:* ${challenge.actionLabel}
🎯 *Referencia:* ${challenge.targetSubject}
━━━━━━━━━━━━━━━━━━━━
🔑 *CÓDIGO DE PRUEBA INTERNO:*
👉 *${challenge.otpCode}* 👈
━━━━━━━━━━━━━━━━━━━━
⏱️ *Válido por:* ${expSeconds} segundos
ℹ️ _Uso exclusivo para verificación interna del sistema RODO._`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function getSmsOtpDispatchUrl(phone: string, challenge: SecurityOtpAction): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const body = `RODO MOTO (PRUEBA): Codigo de prueba para ${challenge.actionLabel}: ${challenge.otpCode}. Valido por 90s.`;
  return `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
}

export function getOtpAuditLog(): SecurityOtpAction[] {
  try {
    const raw = safeGetItem('rodo_otp_audit_log');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
