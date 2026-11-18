import React, { useState, useEffect } from 'react';
import {
  getRodoInternalTotpToken,
  generateOtpCode,
  createOtpChallenge,
  verifyOtpCode,
  runRodoOtpDiagnostics,
  getTechnicalErrorLogs,
  clearTechnicalErrorLogs,
  logTechnicalError,
  DiagnosticTestResult,
  TechnicalErrorLog,
  SecurityOtpAction,
} from '../utils/securityOtp';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RotateCcw,
  Copy,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Sparkles,
  Info,
  Lock,
  Unlock,
} from 'lucide-react';

interface RodoOtpDiagnosticsProps {
  adminPhone?: string;
}

export const RodoOtpDiagnostics: React.FC<RodoOtpDiagnosticsProps> = ({
  adminPhone = '4151234567',
}) => {
  // Estado del token TOTP rodante de 2 minutos (120s)
  const [totpData, setTotpData] = useState(getRodoInternalTotpToken());
  const [copiedToken, setCopiedToken] = useState(false);

  // Protección con PIN maestro 999 para ver el código activo
  const [masterPinInput, setMasterPinInput] = useState('');
  const [isOtpUnlocked, setIsOtpUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  const handleUnlockOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPinInput.trim() === '999') {
      setIsOtpUnlocked(true);
      setPinError(false);
      setMasterPinInput('');
    } else {
      setPinError(true);
    }
  };

  // Generador manual de códigos de prueba de 6 dígitos
  const [manualTestCode, setManualTestCode] = useState<string>(generateOtpCode());
  const [manualTestInput, setManualTestInput] = useState<string>('');
  const [manualValidationResult, setManualValidationResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  // Suite de Pruebas Automáticas
  const [testResults, setTestResults] = useState<DiagnosticTestResult[]>([
    {
      id: 'test-1',
      name: 'Generación de código de prueba',
      category: 'generacion',
      status: 'Pendiente',
      detail: 'Verifica la creación determinista de códigos numéricos de 6 dígitos.',
    },
    {
      id: 'test-2',
      name: 'Validación de código correcto',
      category: 'validacion',
      status: 'Pendiente',
      detail: 'Comprueba la aceptación inmediata de un código activo coincidente.',
    },
    {
      id: 'test-3',
      name: 'Rechazo de código incorrecto',
      category: 'rechazo',
      status: 'Pendiente',
      detail: 'Asegura que cualquier código alterado o erróneo sea rechazado con seguridad.',
    },
    {
      id: 'test-4',
      name: 'Expiración temporal de códigos',
      category: 'expiracion',
      status: 'Pendiente',
      detail: 'Comprueba el bloqueo de códigos fuera de la ventana de tiempo válida.',
    },
    {
      id: 'test-5',
      name: 'Sincronización horaria (TOTP 120s / 2 min)',
      category: 'sincronizacion',
      status: 'Pendiente',
      detail: 'Verifica que la ventana temporal de 2 minutos (120s) y la cuenta regresiva estén calibradas.',
    },
  ]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [lastExecutionTime, setLastExecutionTime] = useState<string | null>(null);

  // Registro de Errores Técnicos (sin guardar códigos secretos ni temporales)
  const [errorLogs, setErrorLogs] = useState<TechnicalErrorLog[]>(getTechnicalErrorLogs());

  // Actualización en tiempo real del TOTP cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setTotpData(getRodoInternalTotpToken());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Función para ejecutar las pruebas automáticas
  const handleRunAllTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      try {
        const results = runRodoOtpDiagnostics();
        setTestResults(results);
        setLastExecutionTime(new Date().toLocaleTimeString('es-MX', { hour12: false }));
        setErrorLogs(getTechnicalErrorLogs());
      } catch (err) {
        logTechnicalError('Suite_Diagnostico', 'Error crítico al ejecutar suite de pruebas', String(err));
        setErrorLogs(getTechnicalErrorLogs());
      } finally {
        setIsRunningTests(false);
      }
    }, 400);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleGenerateNewManualCode = () => {
    const code = generateOtpCode();
    setManualTestCode(code);
    setManualValidationResult(null);
  };

  const handleValidateManualCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTestInput.trim()) return;

    if (manualTestInput.trim() === manualTestCode) {
      setManualValidationResult({
        tested: true,
        success: true,
        message: '✓ Código de prueba verificado exitosamente (Coincidencia exacta de 6 dígitos).',
      });
    } else {
      setManualValidationResult({
        tested: true,
        success: false,
        message: '✗ Código incorrecto. El sistema de prueba rechazó la entrada.',
      });
      logTechnicalError('Prueba_Manual', 'Fallo de coincidencia en prueba manual interactiva');
      setErrorLogs(getTechnicalErrorLogs());
    }
  };

  const handleClearLogs = () => {
    clearTechnicalErrorLogs();
    setErrorLogs([]);
  };

  // Contadores de estado
  const passedCount = testResults.filter((t) => t.status === 'Correcta').length;
  const failedCount = testResults.filter((t) => t.status === 'Fallida').length;
  const pendingCount = testResults.filter((t) => t.status === 'Pendiente').length;

  return (
    <div className="space-y-6">
      {/* Cabecera Principal del Módulo */}
      <div className="bg-[#101b29] text-white p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Diagnóstico OTP de RODO · Entorno de Pruebas Internas</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">
              Diagnóstico OTP de RODO
            </h2>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              Módulo interno exclusivo para probar y certificar el funcionamiento de nuestro propio sistema de códigos temporales de 6 dígitos, sincronización temporal de 2 minutos (120 segundos), expiración y rechazo seguro.
            </p>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[11px] text-gray-300 font-medium">
              <Info className="w-3.5 h-3.5 text-amber-300" />
              <span>Aislado de la autenticación real del administrador. Requiere PIN maestro 999 para visualización.</span>
            </div>
          </div>

          {/* Tarjeta de Código TOTP Rodante (2 min / 120s) Protegida con PIN 999 */}
          {!isOtpUnlocked ? (
            <div className="bg-gray-900 border-2 border-emerald-500/40 rounded-2xl p-5 flex flex-col items-center justify-center min-w-[280px] shadow-2xl shrink-0">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Código Rodante Activo (2 min)
              </span>
              <div className="text-3xl font-mono font-black text-gray-500 tracking-widest py-1 select-none flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400 inline" />
                <span>••••••</span>
              </div>

              <form onSubmit={handleUnlockOtp} className="w-full mt-2 space-y-2">
                <div className="text-[11px] text-gray-300 text-center font-semibold">
                  Ingresa código de autorización (999):
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    maxLength={3}
                    inputMode="numeric"
                    value={masterPinInput}
                    onChange={(e) => {
                      setMasterPinInput(e.target.value.replace(/[^0-9]/g, ''));
                      setPinError(false);
                    }}
                    placeholder="PIN 999"
                    className="w-full bg-black/70 border border-gray-700 text-center text-white font-mono font-bold text-sm rounded-xl py-2 px-2 outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0 shadow-xs"
                  >
                    Ver Código
                  </button>
                </div>
                {pinError && (
                  <div className="text-[10px] text-rose-400 text-center font-bold">
                    Código incorrecto. Ingresa 999.
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className="bg-gray-900 border-2 border-emerald-500 rounded-2xl p-5 flex flex-col items-center justify-center min-w-[280px] shadow-2xl shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Código Activo (2 min)
                </span>
                <button
                  type="button"
                  onClick={() => setIsOtpUnlocked(false)}
                  className="text-[10px] text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded-md transition"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Bloquear</span>
                </button>
              </div>

              <div className="text-4xl font-mono font-black text-emerald-400 tracking-widest py-1 select-all">
                {totpData.code}
              </div>

              {/* Barra de progreso de cuenta regresiva (120s / 2 min) */}
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${totpData.progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between w-full text-[10px] text-gray-400 mt-1.5 font-mono">
                <span>Paso: 2 min</span>
                <span className="text-amber-400 font-bold">Cambia en {totpData.secondsRemaining}s</span>
              </div>

              <button
                type="button"
                onClick={() => handleCopyCode(totpData.code)}
                className="mt-3 w-full bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>{copiedToken ? '¡Copiado!' : 'Copiar Código Rodante'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 1. Panel de Pruebas Automáticas y Resultados */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Panel de Pruebas Automáticas
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprueba de extremo a extremo la generación, validación, sincronización y expiración del algoritmo.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {lastExecutionTime && (
              <span className="text-xs text-gray-500 font-mono">
                Última ejecución: <b>{lastExecutionTime}</b>
              </span>
            )}
            <button
              type="button"
              onClick={handleRunAllTests}
              disabled={isRunningTests}
              className="bg-[#101b29] hover:bg-black text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRunningTests ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Ejecutando Pruebas...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>▶ Ejecutar Pruebas Automáticas</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Resumen de Estados */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase text-emerald-800 block">Correctas</span>
              <span className="text-2xl font-black font-mono text-emerald-900">{passedCount}</span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase text-rose-800 block">Fallidas</span>
              <span className="text-2xl font-black font-mono text-rose-900">{failedCount}</span>
            </div>
            <XCircle className="w-6 h-6 text-rose-600" />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase text-amber-800 block">Pendientes</span>
              <span className="text-2xl font-black font-mono text-amber-900">{pendingCount}</span>
            </div>
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Lista de Pruebas y Estado */}
        <div className="space-y-3">
          {testResults.map((t, idx) => {
            const isSuccess = t.status === 'Correcta';
            const isFailed = t.status === 'Fallida';
            const isPending = t.status === 'Pendiente';

            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isSuccess
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : isFailed
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-400 font-bold">#{idx + 1}</span>
                    <strong className="text-gray-900 font-black text-sm">{t.name}</strong>
                    {t.durationMs !== undefined && (
                      <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {t.durationMs} ms
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">{t.detail}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isSuccess && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      Correcta
                    </span>
                  )}
                  {isFailed && (
                    <span className="inline-flex items-center gap-1.5 bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-xs">
                      <XCircle className="w-4 h-4" />
                      Fallida
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-200 text-amber-900 font-black text-xs px-3 py-1.5 rounded-xl">
                      <Clock className="w-4 h-4" />
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Banco de Pruebas Manuales Interactivas */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Verificación Manual Interactiva de Códigos
        </h3>
        <p className="text-xs text-gray-500">
          Genera un código de prueba de 6 dígitos e introduce valores para validar la respuesta del algoritmo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Caja de Código Generado */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Código de prueba generado:</span>
              <button
                type="button"
                onClick={handleGenerateNewManualCode}
                className="text-[11px] text-[#ed0718] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Generar otro
              </button>
            </div>
            <div className="text-3xl font-mono font-black text-gray-900 tracking-widest text-center py-2 bg-white rounded-xl border border-gray-200">
              {manualTestCode}
            </div>
            <p className="text-[11px] text-gray-500 text-center">
              Escribe este código o uno intencionalmente falso para verificar el rechazo.
            </p>
          </div>

          {/* Formulario de Validación */}
          <form onSubmit={handleValidateManualCode} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Probar validación con el código:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={manualTestInput}
                  onChange={(e) => setManualTestInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="flex-1 text-center font-mono text-lg font-bold py-1.5 px-3 border border-gray-300 rounded-xl bg-white outline-none focus:border-[#ed0718]"
                />
                <button
                  type="submit"
                  className="bg-[#101b29] hover:bg-black text-white font-bold text-xs px-4 py-1.5 rounded-xl transition"
                >
                  Validar
                </button>
              </div>
            </div>

            {manualValidationResult && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold ${
                  manualValidationResult.success
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {manualValidationResult.message}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* 3. Registro de Errores Técnicos (Sin almacenar códigos secretos ni temporales) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-700" />
              Registro de Incidencias y Errores Técnicos
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Auditoría técnica con fecha y hora. Garantiza confidencialidad al no almacenar códigos secretos ni tokens.
            </p>
          </div>

          {errorLogs.length > 0 && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="text-xs text-gray-500 hover:text-red-600 font-bold underline cursor-pointer"
            >
              Limpiar registros
            </button>
          )}
        </div>

        {errorLogs.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            ✓ No se registran errores técnicos en la sesión actual.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto font-mono text-xs">
            {errorLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded font-bold">
                      {log.module}
                    </span>
                    <span className="text-gray-900 font-medium">{log.message}</span>
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-gray-500 text-left">{log.details}</p>
                  )}
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
