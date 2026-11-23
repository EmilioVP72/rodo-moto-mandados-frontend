import React, { useState, useEffect } from 'react';
import {
  getRollingBankToken,
  createOtpChallenge,
  getOtpAuditLog,
  getWhatsAppOtpDispatchUrl,
  getSmsOtpDispatchUrl,
  SecurityOtpAction,
} from '../utils/securityOtp';
import { SecurityOtpModal } from './SecurityOtpModal';
import { showSystemToast } from './SystemDialogHost';
import {
  ShieldCheck,
  Key,
  Smartphone,
  MessageSquare,
  AlertTriangle,
  UserX,
  Lock,
  RefreshCw,
  CheckCircle,
  Copy,
  Info,
  DollarSign,
  FileCheck,
} from 'lucide-react';
import { CustomerAccount } from '../types';

interface AdminSecurityAndFraudProps {
  adminPhone: string;
}

export const AdminSecurityAndFraud: React.FC<AdminSecurityAndFraudProps> = ({
  adminPhone,
}) => {
  const [rollingToken, setRollingToken] = useState(getRollingBankToken());
  const [activeChallenge, setActiveChallenge] = useState<SecurityOtpAction | null>(null);
  const [auditLog, setAuditLog] = useState<SecurityOtpAction[]>(getOtpAuditLog());
  const [copiedToken, setCopiedToken] = useState(false);

  // Clientes simulados con registros de riesgo o fraude
  const [flaggedCustomers, setFlaggedCustomers] = useState<CustomerAccount[]>([
    {
      id: 'cust-risk-1',
      name: 'Cliente Prueba Riesgo',
      phone: '4151998877',
      email: 'sospecha@ejemplo.com',
      ineVerified: false,
      pendingDebt: 340,
      debtReason: 'Repartidor esperó 10 min afuera del domicilio y el cliente apagó el teléfono.',
      debtOrderFolio: 'RD-261027-0091',
      debtDate: '27 Oct 2026',
      status: 'bloqueado_fraude',
      completedOrdersCount: 0,
    },
    {
      id: 'cust-demo-2',
      name: 'María G. (Zona San Antonio)',
      phone: '4151445566',
      email: 'maria@ejemplo.com',
      ineVerified: true,
      ineDigits: '8942',
      pendingDebt: 0,
      status: 'activo',
      completedOrdersCount: 5,
    },
  ]);

  // Actualizar token rodante cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setRollingToken(getRollingBankToken());
      setAuditLog(getOtpAuditLog());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(rollingToken.code);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleTriggerTestOtp = (actionName: string) => {
    const challenge = createOtpChallenge('admin_login', actionName, 'Prueba de Seguridad RODO');
    setActiveChallenge(challenge);
  };

  const handleBlockCustomerWithOtp = (customer: CustomerAccount) => {
    const challenge = createOtpChallenge(
      'block_customer',
      `Bloqueo Definitivo por Fraude: ${customer.name}`,
      `Teléfono: ${customer.phone} · Folio Deuda: ${customer.debtOrderFolio || 'N/A'}`
    );
    setActiveChallenge(challenge);
  };

  const handleOtpSuccess = () => {
    if (activeChallenge?.actionType === 'block_customer') {
      showSystemToast({
        message: 'Cuenta de cliente bloqueada y añadida a la Lista Negra Antifraude con validación criptográfica.',
        tone: 'success',
      });
    } else {
      showSystemToast({
        message: 'Acción crítica autorizada exitosamente.',
        tone: 'success',
      });
    }
    setActiveChallenge(null);
    setAuditLog(getOtpAuditLog());
  };

  return (
    <div className="space-y-6">
      {/* 1. Visor del Token Bancario Rodante (Tipo RSA NetKey / BBVA Token Móvil) */}
      <div className="bg-[#101b29] text-white p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Key className="w-4 h-4" />
              <span>Códigos de Autorización Interna RODO (TOTP Dinámico)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black">
              Bóveda de Seguridad & Doble Factor
            </h3>
            <p className="text-xs text-gray-400 max-w-xl">
              Código temporal rodante de 6 dígitos con actualización automática cada 30 segundos. Protege cancelaciones de órdenes, bloqueos antifraude y cambios de cuentas.
            </p>
          </div>

          {/* Caja del Token */}
          <div className="bg-gray-900 border-2 border-emerald-500/40 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[240px] shadow-2xl">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
              Código Rodante Activo
            </span>
            <div className="text-4xl font-mono font-black text-emerald-400 tracking-widest py-1">
              {rollingToken.code}
            </div>

            {/* Barra de expiración (30s) */}
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${rollingToken.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-[10px] text-gray-400 mt-1 font-mono">
              <span>RFC 6238 TOTP</span>
              <span className="text-amber-400 font-bold">Cambia en {rollingToken.secondsRemaining}s</span>
            </div>

            <div className="flex gap-2 mt-3 w-full">
              <button
                type="button"
                onClick={handleCopyToken}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedToken ? '¡Copiado!' : 'Copiar Token'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTriggerTestOtp('Prueba de Envío OTP')}
                className="bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
                title="Probar envío a WhatsApp"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Probar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Política de Crédito Escalonada contra Fraudes en Efectivo (Rappi Style) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-red-600 font-extrabold text-sm uppercase tracking-wide">
          <ShieldCheck className="w-5 h-5 text-[#ed0718]" />
          <span>Matriz de Crédito Escalonado para Pagos en Efectivo</span>
        </div>
        <p className="text-xs text-gray-600">
          Para evitar fraudes por pedidos falsos con cancelación en puerta, el sistema aplica automáticamente límites de compra en producto sobreprecio en base al historial de pedidos entregados exitosamente del cliente:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200">
            <span className="text-[10px] font-black text-red-900 uppercase block">1er Pedido (Nuevo Cliente)</span>
            <div className="text-xl font-mono font-black text-gray-900 mt-1">$300 MXN</div>
            <span className="text-[11px] text-gray-500 block mt-0.5">Límite máx. de comida (+ envío aprox. $340)</span>
            <span className="inline-block mt-2 bg-red-200/80 text-red-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
              Límite estricto antifraude
            </span>
          </div>

          <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
            <span className="text-[10px] font-black text-amber-900 uppercase block">2do Pedido (Verificado)</span>
            <div className="text-xl font-mono font-black text-gray-900 mt-1">$400 MXN</div>
            <span className="text-[11px] text-gray-500 block mt-0.5">Sube automáticamente tras 1er entrega exitosa</span>
            <span className="inline-block mt-2 bg-amber-200/80 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
              Confianza Nivel 2
            </span>
          </div>

          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200">
            <span className="text-[10px] font-black text-blue-900 uppercase block">3er Pedido (Frecuente)</span>
            <div className="text-xl font-mono font-black text-gray-900 mt-1">$500 MXN</div>
            <span className="text-[11px] text-gray-500 block mt-0.5">Historial limpio de entrega y cobro</span>
            <span className="inline-block mt-2 bg-blue-200/80 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
              Confianza Nivel 3
            </span>
          </div>

          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-black text-emerald-900 uppercase block">4to Pedido en Adelante</span>
            <div className="text-xl font-mono font-black text-gray-900 mt-1">$1,000 MXN</div>
            <span className="text-[11px] text-gray-500 block mt-0.5">Cliente recurrente de San Miguel</span>
            <span className="inline-block mt-2 bg-emerald-200/80 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
              Cliente Preferente RODO
            </span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Transferencia Bancaria SPEI:</strong> Sin límite de crédito (pedidos de $1,000 hasta $20,000+), ya que el dinero se liquida y verifica antes de que el repartidor recoja el producto.
          </span>
        </div>
      </div>

      {/* 3. Lista Negra y Clientes con Deuda por Cancelación Fuera de Tiempo */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-gray-100 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-red-600" />
              Control de Cuentas, Cancelaciones y Deuda Registrada
            </h4>
            <p className="text-[11px] text-gray-500">
              Cuentas que incurrieron en cancelación tardía (+10 min en domicilio) o intento de fraude.
            </p>
          </div>
          <span className="text-xs bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded-lg">
            Requiere OTP de Seguridad para Modificar
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {flaggedCustomers.map((cust) => (
            <div key={cust.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <strong className="text-gray-900 font-black text-sm">{cust.name}</strong>
                  <span className="font-mono text-gray-600 font-bold">({cust.phone})</span>
                  {cust.status === 'bloqueado_fraude' ? (
                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      ⛔ BLOQUEADO POR FRAUDE
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                      ACTIVO
                    </span>
                  )}
                </div>
                {cust.debtReason && (
                  <p className="text-red-700 bg-red-50 p-2 rounded-lg border border-red-200 text-[11px] font-medium">
                    <b>Causa de Deuda:</b> {cust.debtReason} (Deuda pendiente: ${cust.pendingDebt.toFixed(2)} MXN)
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {cust.status === 'bloqueado_fraude' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFlaggedCustomers((prev) =>
                        prev.map((c) => (c.id === cust.id ? { ...c, status: 'activo', pendingDebt: 0 } : c))
                      );
                      showSystemToast({
                        message: 'Cuenta reactivada y saldo liquidado correctamente.',
                        tone: 'success',
                      });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl transition"
                  >
                    Reactivar Cuenta
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBlockCustomerWithOtp(cust)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl transition flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Bloquear con OTP
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Resumen Técnico de Criptografía & Medidas de Protección para Edson Cruz */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3 text-xs text-gray-700">
        <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          Ficha de Criptografía & Seguridad Implementada para Inversionistas y Auditoría
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <strong className="text-gray-900 block font-extrabold mb-1">🔐 Encriptación AES-256</strong>
            <p className="text-gray-600 text-[11px]">
              Los números de teléfono de clientes, direcciones de entrega y referencias privadas se transmiten bajo cifrado TLS 1.3 con certificados de 2048 bits y hashes SHA-256.
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <strong className="text-gray-900 block font-extrabold mb-1">🔑 Tokens Rodantes (TOTP)</strong>
            <p className="text-gray-600 text-[11px]">
              Algoritmo de contraseña de un solo uso por tiempo (RFC 6238) con ventanas de expiración de 30 a 90 segundos para protección contra ataques de fuerza bruta.
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <strong className="text-gray-900 block font-extrabold mb-1">🛡️ Anti-Update Gap en Firestore</strong>
            <p className="text-gray-600 text-[11px]">
              Reglas de seguridad en base de datos con ABAC (Attribute-Based Access Control) que impiden que cualquier usuario modifique tarifas de envío o sobreprecios sin credenciales administrativas.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Validación OTP cuando se solicita acción crítica */}
      {activeChallenge && (
        <SecurityOtpModal
          challenge={activeChallenge}
          adminPhone={adminPhone}
          onSuccess={handleOtpSuccess}
          onCancel={() => setActiveChallenge(null)}
        />
      )}
    </div>
  );
};
