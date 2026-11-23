import { CustomerAccount } from '../types';
import { apiFetch } from '../api/httpClient';
import { onSocketEvent } from '../api/socketClient';

/**
 * RODO Moto Mandados - Algoritmo de Lectura y Validación de INE Reverso (10 Dígitos)
 * 
 * Extrae los 10 dígitos numéricos del reverso de la credencial de elector (CIC / OCR)
 * y comprueba que no pertenezca a una cuenta con deuda pendiente por cancelación o fraude.
 * 
 * Por privacidad estricta:
 * La imagen NUNCA se sube a servidores públicos; únicamente se procesa localmente
 * y se conservan los 10 dígitos numéricos para la matriz antifraude.
 */

// Cuentas de muestra y lista negra de deudores por cancelación tardía en San Miguel
export const INITIAL_INE_ACCOUNTS: CustomerAccount[] = [
  {
    id: 'cust-fraud-1',
    name: 'Roberto Gómez M.',
    phone: '4151998877',
    email: 'roberto.g@ejemplo.com',
    ineVerified: true,
    ineDigits: '8942105434',
    ine10Digits: '8942105434',
    inePhotoUploaded: true,
    pendingDebt: 340,
    debtReason: 'Repartidor esperó 10 min en domicilio con pedido de tacos y el cliente no salió ni contestó.',
    debtOrderFolio: 'RD-261027-0091',
    debtDate: '27 Oct 2026',
    status: 'bloqueado_fraude',
    completedOrdersCount: 0,
  },
  {
    id: 'cust-debt-2',
    name: 'Carlos Mendoza L.',
    phone: '4151332211',
    email: 'carlos.mza@ejemplo.com',
    ineVerified: true,
    ineDigits: '5512349872',
    ine10Digits: '5512349872',
    inePhotoUploaded: true,
    pendingDebt: 280,
    debtReason: 'Cancelación tardía en puerta al momento de entrega en efectivo.',
    debtOrderFolio: 'RD-261026-0045',
    debtDate: '26 Oct 2026',
    status: 'bloqueado_fraude',
    completedOrdersCount: 1,
  },
];

let hasInitializedAccountsSync = false;

function isCurrentSessionAdmin(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem('rodo_admin_session') === 'true';
  } catch {
    return false;
  }
}

function ensureIneAccountsBackendSync(): void {
  if (hasInitializedAccountsSync || typeof window === 'undefined') return;
  if (!isCurrentSessionAdmin()) return;
  hasInitializedAccountsSync = true;

  apiFetch<CustomerAccount[]>('/api/auth/accounts')
    .then((remoteList) => {
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        localStorage.setItem('rodo_registered_ine_accounts', JSON.stringify(remoteList));
      }
    })
    .catch(() => {});

  onSocketEvent<CustomerAccount>('accounts:updated', (updatedAcc) => {
    if (!updatedAcc?.id) return;
    try {
      const raw = localStorage.getItem('rodo_registered_ine_accounts');
      const list: CustomerAccount[] = raw ? JSON.parse(raw) : [...INITIAL_INE_ACCOUNTS];
      const idx = list.findIndex((a) => a.id === updatedAcc.id || a.email === updatedAcc.email);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updatedAcc };
      } else {
        list.push(updatedAcc);
      }
      localStorage.setItem('rodo_registered_ine_accounts', JSON.stringify(list));
    } catch {}
  });
}

/**
 * Obtiene el registro centralizado de cuentas y deudas verificadas con INE (PostgreSQL + caché local)
 */
export function getStoredIneAccounts(): CustomerAccount[] {
  ensureIneAccountsBackendSync();
  try {
    const raw = localStorage.getItem('rodo_registered_ine_accounts');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading INE accounts from storage', e);
  }
  return INITIAL_INE_ACCOUNTS;
}

/**
 * Guarda o actualiza una cuenta con su INE de 10 dígitos en caché local (y en PostgreSQL si es Admin)
 */
export function saveIneAccount(account: CustomerAccount): void {
  ensureIneAccountsBackendSync();
  try {
    const list = getStoredIneAccounts();
    const idx = list.findIndex(
      (a) => a.id === account.id || (account.ine10Digits && a.ine10Digits === account.ine10Digits)
    );
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...account };
    } else {
      list.push(account);
    }
    localStorage.setItem('rodo_registered_ine_accounts', JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving INE account', e);
  }

  if (isCurrentSessionAdmin()) {
    apiFetch<CustomerAccount>('/api/auth/accounts', {
      method: 'POST',
      body: account,
    }).catch(() => {});
  }
}

/**
 * Calcula el Dígito Verificador oficial del CIC del INE
 * Estándar OACI 9303 / INE con pesos cíclicos 7-3-1
 */
export function calculateIneCicCheckDigit(first9: string): number {
  const weights = [7, 3, 1, 7, 3, 1, 7, 3, 1];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(first9[i] || '0', 10) * weights[i];
  }
  return sum % 10;
}

/**
 * Valida la autenticidad matemática de los 10 dígitos del CIC del INE
 * Bloquea números inventados aleatoriamente o secuencias repetitivas.
 */
export function verifyIneCicChecksum(digits10: string): { valid: boolean; reason?: string } {
  const clean = digits10.replace(/[^0-9]/g, '');
  if (clean.length !== 10) {
    return { valid: false, reason: 'El código CIC del reverso del INE debe contener exactamente 10 dígitos.' };
  }

  // 1. Rechazo de secuencias triviales o inventadas
  if (/^(\d)\1{9}$/.test(clean)) {
    return { valid: false, reason: 'Número inválido: No se permiten dígitos idénticos consecutivos.' };
  }
  if (clean === '1234567890' || clean === '0123456789' || clean === '9876543210') {
    return { valid: false, reason: 'Número inválido: No se permiten secuencias numéricas continuas.' };
  }

  // 2. Validación de Dígito Verificador Módulo 10 (Estándar INE / OACI)
  const expectedCheckDigit = calculateIneCicCheckDigit(clean.slice(0, 9));
  const actualCheckDigit = parseInt(clean[9], 10);

  // Fallback con algoritmo de Luhn
  let luhnSum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(clean[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    luhnSum += digit;
  }
  const expectedLuhn = (10 - (luhnSum % 10)) % 10;

  if (actualCheckDigit !== expectedCheckDigit && actualCheckDigit !== expectedLuhn) {
    return {
      valid: false,
      reason: `El dígito verificador final (${actualCheckDigit}) no coincide con el algoritmo de control matemático del INE (esperado ${expectedCheckDigit}). Verifica los 10 dígitos al reverso de tu credencial física.`,
    };
  }

  return { valid: true };
}

/**
 * Valida un INE de 10 dígitos contra deudas pendientes y cuentas duplicadas
 */
export function validateIneAgainstDebtsAndDuplicates(
  digits10: string,
  currentUserEmail?: string,
  currentUserId?: string
): {
  allowed: boolean;
  status: 'valido' | 'deuda_pendiente' | 'cuenta_existente' | 'formato_invalido';
  account?: CustomerAccount;
  message: string;
} {
  const cleanDigits = digits10.replace(/[^0-9]/g, '');

  if (cleanDigits.length !== 10) {
    return {
      allowed: false,
      status: 'formato_invalido',
      message: 'El número de INE reverso debe contener exactamente 10 dígitos numéricos.',
    };
  }

  // Comprobar autenticidad matemática del CIC (Dígito Verificador Módulo 10)
  const checksumCheck = verifyIneCicChecksum(cleanDigits);
  if (!checksumCheck.valid) {
    return {
      allowed: false,
      status: 'formato_invalido',
      message: checksumCheck.reason || 'Dígito verificador inválido: la credencial no cumple con el algoritmo oficial del INE.',
    };
  }

  const registeredAccounts = getStoredIneAccounts();

  // Buscar coincidencia por los 10 dígitos
  const match = registeredAccounts.find(
    (acc) =>
      acc.ine10Digits === cleanDigits ||
      acc.ineDigits === cleanDigits ||
      (acc.ineDigits && cleanDigits.endsWith(acc.ineDigits))
  );

  if (match) {
    // Caso 1: Tiene deuda pendiente por cancelación tardía o fraude
    if (match.pendingDebt > 0 || match.status === 'bloqueado_fraude') {
      return {
        allowed: false,
        status: 'deuda_pendiente',
        account: match,
        message: `⛔ ACCESO DENEGADO: La credencial INE con terminación ${cleanDigits.slice(-4)} tiene un adeudo pendiente de $${match.pendingDebt.toFixed(2)} MXN por cancelación tardía (Folio ${match.debtOrderFolio || 'S/N'}). Debes liquidar tu saldo antes de realizar nuevos pedidos.`,
      };
    }

    // Caso 2: Ya existe la cuenta pero con otro correo/usuario (intento de duplicación)
    const isSameUser =
      (currentUserEmail && match.email.toLowerCase() === currentUserEmail.toLowerCase()) ||
      (currentUserId && match.id === currentUserId);

    if (!isSameUser) {
      return {
        allowed: false,
        status: 'cuenta_existente',
        account: match,
        message: `⚠️ Este INE ya se encuentra registrado a nombre de "${match.name}". Por favor inicia sesión con tu cuenta registrada original (${match.email}).`,
      };
    }
  }

  return {
    allowed: true,
    status: 'valido',
    message: 'Credencial INE validada correctamente sin adeudos ni duplicidades.',
  };
}
