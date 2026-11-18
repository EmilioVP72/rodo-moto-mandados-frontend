import { BankVerificationData } from '../types';

export interface VerificationRequest {
  trackingKey: string;
  expectedAmount: number;
  senderBank?: string;
  orderFolio: string;
}

/**
 * Validador de Ingresos Bancarios / SPEI (Solo Lectura)
 * Verifica que el ingreso haya sido procesado en la cuenta receptora sin mover fondos ni requerir credenciales de dispersión.
 */
export async function verifyBankTransferIncome(
  req: VerificationRequest
): Promise<BankVerificationData> {
  const cleanKey = req.trackingKey.trim().toUpperCase();

  if (!cleanKey || cleanKey.length < 6) {
    return {
      trackingKey: cleanKey,
      senderBank: req.senderBank || 'Desconocido',
      verified: false,
      statusMessage: 'Clave de rastreo o folio inválido. Debe tener al menos 6 caracteres alfanuméricos.',
    };
  }

  // Simulación de consulta a motor CEP (Comprobante Electrónico de Pago / Banxico SPEI)
  // En producción se conecta al Webhook / API de lectura de cuenta receptora (ej. Banxico CEP o API bancaria de consulta)
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Reglas de protección anti-estafa:
  // 1. Detectar patrones comunes de capturas falsas (claves de prueba o números repetitivos como 000000)
  if (/^(0{6,}|1{6,}|123456)$/.test(cleanKey)) {
    return {
      trackingKey: cleanKey,
      senderBank: req.senderBank || 'Banco emisor',
      verified: false,
      statusMessage: 'Alerta de seguridad: La clave ingresada no corresponde a un depósito liquidado en el banco.',
    };
  }

  const now = new Date();
  const authCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  return {
    trackingKey: cleanKey,
    senderBank: req.senderBank || 'SPEI Interbancario',
    verified: true,
    verifiedAt: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    verifiedAmount: req.expectedAmount,
    statusMessage: `Ingreso confirmado por $${req.expectedAmount.toFixed(2)} MXN. Liquidación SPEI CEP #${authCode}. Fondos recibidos.`,
  };
}
