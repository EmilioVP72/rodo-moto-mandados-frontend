import { CustomerAccount, CustomerCoupon } from '../types';
import { getStoredIneAccounts, saveIneAccount } from './ineScanner';

const REFERRAL_LEDGER_KEY = 'rodo_referral_ledger';

interface ReferralLedgerEntry {
  referralCode: string;
  referrerId: string;
  referrerName: string;
  referredUserId: string;
  referredUserName: string;
  registeredAt: string;
  rewardGiven: boolean;
}

export function generateCustomerReferralCode(phone: string, id: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const suffix = cleanPhone.slice(-4) || id.slice(-4).toUpperCase() || '7890';
  return `RODO-${suffix}`;
}

export function getReferralLedger(): ReferralLedgerEntry[] {
  try {
    const raw = localStorage.getItem(REFERRAL_LEDGER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Procesa la vinculación de un código de referido al registrarse una nueva cuenta.
 * Requisito estricto: Sólo otorga cupones cuando el amigo completa su registro e inicio de sesión.
 */
export function processReferralRegistration(
  referralCodeInput: string,
  newAccount: CustomerAccount
): {
  success: boolean;
  message: string;
  couponAwarded?: CustomerCoupon;
} {
  const cleanCode = referralCodeInput.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'No se ingresó código de referido.' };
  }

  // Buscar el titular del código de referido
  const allAccounts = getStoredIneAccounts();
  const referrer = allAccounts.find((acc) => {
    const code = acc.referralCode || generateCustomerReferralCode(acc.phone, acc.id);
    return code.toUpperCase() === cleanCode;
  });

  if (!referrer) {
    return {
      success: false,
      message: 'El código de referido no existe o no pertenece a ningún cliente registrado.',
    };
  }

  // Evitar auto-referido
  if (referrer.id === newAccount.id || referrer.phone === newAccount.phone || referrer.email === newAccount.email) {
    return {
      success: false,
      message: 'No puedes usar tu propio código de referido.',
    };
  }

  // Verificar si ya fue registrado previamente para evitar duplicados
  const ledger = getReferralLedger();
  const alreadyUsed = ledger.some(
    (entry) =>
      entry.referredUserId === newAccount.id ||
      (entry.referredUserName && entry.referredUserName === newAccount.name && entry.referralCode === cleanCode)
  );

  if (alreadyUsed) {
    return {
      success: false,
      message: 'Este cliente ya ha canjeado un beneficio de referido anteriormente.',
    };
  }

  const now = new Date().toISOString();

  // Cupón de bienvenida para el nuevo cliente
  const welcomeCoupon: CustomerCoupon = {
    id: 'coup-welcome-' + Date.now().toString(36),
    code: `BIENVENIDO-${cleanCode.slice(-4)}`,
    discount: 50,
    label: '$50 MXN de Descuento en tu 1er Pedido RODO',
    used: false,
    earnedAt: now,
    reason: `Invitado por ${referrer.name}`,
  };

  // Cupón de recompensa para el anfitrión (el que refirió)
  const referrerRewardCoupon: CustomerCoupon = {
    id: 'coup-ref-' + Date.now().toString(36),
    code: `PREMIO-${newAccount.id.slice(-4)}`,
    discount: 50,
    label: '$50 MXN de Regalo por invitar a un amigo',
    used: false,
    earnedAt: now,
    reason: `Tu amigo ${newAccount.name} se registró e inició sesión con tu código`,
  };

  // Actualizar cuenta del nuevo cliente
  newAccount.referredByCode = cleanCode;
  newAccount.coupons = [...(newAccount.coupons || []), welcomeCoupon];
  saveIneAccount(newAccount);

  // Actualizar cuenta del referente
  const updatedReferrer: CustomerAccount = {
    ...referrer,
    referralRewardsCount: (referrer.referralRewardsCount || 0) + 1,
    coupons: [...(referrer.coupons || []), referrerRewardCoupon],
  };
  saveIneAccount(updatedReferrer);

  // Registrar en el libro contable de referidos
  ledger.push({
    referralCode: cleanCode,
    referrerId: referrer.id,
    referrerName: referrer.name,
    referredUserId: newAccount.id,
    referredUserName: newAccount.name,
    registeredAt: now,
    rewardGiven: true,
  });

  try {
    localStorage.setItem(REFERRAL_LEDGER_KEY, JSON.stringify(ledger));
  } catch (e) {
    console.warn('Error saving referral ledger', e);
  }

  return {
    success: true,
    message: `¡Código válido! Ganaste un cupón de $50 MXN por invitación de ${referrer.name}.`,
    couponAwarded: welcomeCoupon,
  };
}
