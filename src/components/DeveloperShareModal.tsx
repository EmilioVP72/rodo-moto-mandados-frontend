import React, { useState } from 'react';
import {
  X,
  Code2,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Globe,
  Server,
  Zap,
  FolderArchive,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DeveloperShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperShareModal: React.FC<DeveloperShareModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  // URL pública sin restricción de login de Google
  const publicOrigin = 'https://ais-pre-eooztaby6uofrzjmraerfo-60690626410.us-west2.run.app';
  const urlZip1 = `${publicOrigin}/downloads/respaldo_rodo_completo_fuente.zip`;
  const urlZip2 = `${publicOrigin}/downloads/copia_rodo_independiente_proyecto.zip`;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleDirectDownload = (filename: string, path: string) => {
    const a = document.createElement('a');
    a.href = path;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const whatsappMessageForDev = `👋 *¡Hola! Te comparto el proyecto completo de RODO Moto Mandados listo para trabajar y desplegar en VPS.*

🚀 *Proyecto:* RODO Moto Mandados · San Miguel de Allende, GTO
📦 *Stack:* React 19 + TypeScript + Vite + Node.js Fastify + PostgreSQL 16 + Redis 7 + Socket.IO + Docker
🌐 *Enlace de Vista Previa Pública:*
${publicOrigin}

⚙️ *Comandos para levantar con Docker Compose:*
1) Clonar repositorios (frontend y backend)
2) \`docker compose up -d --build\` (Levanta PostgreSQL, Redis, Fastify API y Nginx Web)`;

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessageForDev)}`, '_blank');
  };

  const terminalCommands = `# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo en local
npm run dev

# 3. Compilar para producción (subir a la red)
npm run build`;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#0b0e14] text-gray-900 dark:text-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#ed0718] flex items-center justify-center font-black text-white shadow-lg shadow-red-900/40">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-xl text-white">
                  Paquete para Programador & Subida a la Red
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40">
                  LISTO PARA DESPLIEGUE
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Todo el código, guías, comandos y enlaces para que un programador lo modifique y publique ya
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* AVISO IMPORTANTE: Explicación de por qué no le abría al programador */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 rounded-2xl p-4 space-y-2 text-amber-950 dark:text-amber-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <strong className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                ¿Por qué tu programador no podía abrir el enlace anterior?
              </strong>
            </div>
            <p className="text-[11px] leading-relaxed">
              Si le mandaste un enlace que contiene <b>ais-dev-</b>, ese es tu <i>entorno privado de desarrollo</i> protegido por Google Cloud, el cual <b>exige tener tu correo y contraseña de Google</b> para entrar. A cualquier otra persona le marca error de acceso denegado (403) o le pide iniciar sesión con tu cuenta.
            </p>
            <div className="bg-white/80 dark:bg-black/30 p-2.5 rounded-xl border border-amber-300/60 dark:border-amber-800 space-y-1.5 font-bold text-[11px]">
              <p className="text-emerald-700 dark:text-emerald-400">
                ✅ <b>Solución 1 (La más rápida y 100% garantizada):</b> Toca el botón <b>"Descargar ZIP"</b> aquí abajo. Se descargará el archivo comprimido directo a tu teléfono. Luego, en WhatsApp, abre el chat con tu programador y envíaselo como <b>Documento / Archivo adjunto</b>. ¡Él podrá descomprimirlo y abrirlo en su computadora al instante!
              </p>
              <p className="text-blue-700 dark:text-blue-400">
                🌐 <b>Solución 2:</b> Pásale el <b>Enlace de Vista Previa Pública</b> (que no pide iniciar sesión a nadie):
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="text"
                  readOnly
                  value={publicOrigin}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-1.5 rounded-lg text-[10px] font-mono text-gray-800 dark:text-gray-200"
                />
                <button
                  type="button"
                  onClick={() => copyText(publicOrigin, 'pub-url')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-2.5 py-1.5 rounded-lg shrink-0 flex items-center gap-1 text-[10px]"
                >
                  {copiedSection === 'pub-url' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Enlace</span>
                </button>
              </div>
            </div>
          </div>

          {/* Banner de acción rápida: Enviar por WhatsApp */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📲</span>
              <div>
                <strong className="text-sm font-black text-emerald-950 dark:text-emerald-200 block">
                  Compartir directamente al WhatsApp de tu Programador
                </strong>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Envía el paquete listo con enlaces públicos (sin login de Google), claves de acceso y pasos de instalación.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={shareViaWhatsApp}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => copyText(whatsappMessageForDev, 'wa-text')}
                className="bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700 font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                title="Copiar texto para WhatsApp"
              >
                {copiedSection === 'wa-text' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">Copiar Mensaje</span>
              </button>
            </div>
          </div>

          {/* Enlaces directos a los 2 Archivos ZIP */}
          <div>
            <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FolderArchive className="w-4 h-4 text-[#ed0718]" />
              Archivos ZIP Independientes del Proyecto
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* ZIP 1 */}
              <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-red-600 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded">
                    ZIP 1: Código Fuente
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">~3.4 MB</span>
                </div>
                <strong className="text-xs font-black block text-gray-900 dark:text-white">
                  respaldo_rodo_completo_fuente.zip
                </strong>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Todo el código React, componentes, tipos, configuración Vite y estilos listo para abrir en VS Code.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDirectDownload('respaldo_rodo_completo_fuente.zip', '/downloads/respaldo_rodo_completo_fuente.zip')}
                    className="flex-1 bg-[#101b29] hover:bg-black text-white font-bold py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar a mi teléfono</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(urlZip1, 'zip1')}
                    className="p-2 bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-100 text-gray-700 dark:text-gray-300 cursor-pointer"
                    title="Copiar enlace público de descarga"
                  >
                    {copiedSection === 'zip1' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ZIP 2 */}
              <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    ZIP 2: Copia Independiente
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">~3.4 MB</span>
                </div>
                <strong className="text-xs font-black block text-gray-900 dark:text-white">
                  copia_rodo_independiente_proyecto.zip
                </strong>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Copia íntegra espejo con todas las imágenes, mapas y utilidades autónomas del sistema.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDirectDownload('copia_rodo_independiente_proyecto.zip', '/downloads/copia_rodo_independiente_proyecto.zip')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar a mi teléfono</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(urlZip2, 'zip2')}
                    className="p-2 bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-100 text-gray-700 dark:text-gray-300 cursor-pointer"
                    title="Copiar enlace público de descarga"
                  >
                    {copiedSection === 'zip2' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Guía Técnica y Comandos para el Programador */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold flex items-center gap-2 text-white">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Comandos de Instalación y Despliegue:
              </span>
              <button
                type="button"
                onClick={() => copyText(terminalCommands, 'terminal')}
                className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded flex items-center gap-1"
              >
                {copiedSection === 'terminal' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar Comandos</span>
              </button>
            </div>
            <pre className="text-emerald-300 overflow-x-auto text-[11px] leading-relaxed">
              {terminalCommands}
            </pre>
          </div>

          {/* Opciones de Hosting y Dominio Propio */}
          <div>
            <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              Dónde y Cómo Subir a la Red (Opciones de Hosting Gratuitas o de Pago)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
                <strong className="text-xs font-black text-gray-900 dark:text-white block">
                  1. Vercel o Netlify
                </strong>
                <p className="text-[11px] text-gray-500">
                  Despliegue automático en 60 segundos conectando el repositorio GitHub o arrastrando la carpeta <code className="text-red-500 font-bold">dist/</code>.
                </p>
                <span className="text-[10px] text-emerald-600 font-bold block pt-1">
                  ✓ Incluye SSL gratis y dominio propio
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
                <strong className="text-xs font-black text-gray-900 dark:text-white block">
                  2. Docker Compose en VPS Hostinger
                </strong>
                <p className="text-[11px] text-gray-500">
                  Despliega PostgreSQL 16, Redis 7, Fastify API y Nginx con el comando <code className="text-red-500 font-bold">docker compose up -d --build</code>.
                </p>
                <span className="text-[10px] text-blue-600 font-bold block pt-1">
                  ✓ 100% Independiente y Escalable
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
                <strong className="text-xs font-black text-gray-900 dark:text-white block">
                  3. cPanel o VPS Propio
                </strong>
                <p className="text-[11px] text-gray-500">
                  El programador compila con <code className="text-red-500 font-bold">npm run build</code> y sube el contenido de <code className="text-red-500 font-bold">dist/</code> a <code className="text-gray-700 font-bold">public_html</code>.
                </p>
                <span className="text-[10px] text-purple-600 font-bold block pt-1">
                  ✓ Total independencia de servidores
                </span>
              </div>

            </div>
          </div>

          {/* Cómo vincular el dominio personalizado */}
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl text-[11px] text-blue-950 dark:text-blue-200 space-y-1.5">
            <strong className="font-black text-xs block flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
              <Globe className="w-4 h-4" />
              ¿Cómo poner mi propio dominio web (ej: rodomotomandados.com)?
            </strong>
            <p className="leading-relaxed">
              Tu programador solo debe comprar el dominio en cualquier registrador (ej. GoDaddy, Namecheap o Google Domains) y añadir los registros DNS <strong>CNAME</strong> o <strong>A</strong> que le dé la plataforma de hosting elegida (Vercel, Netlify o Firebase). ¡El sitio web quedará disponible bajo tu propia dirección web sin que aparezca ninguna marca externa!
            </p>
          </div>

        </div>

        {/* Pie */}
        <div className="p-3 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 shrink-0">
          <span>RODO Moto Mandados · Archivos 100% listos para desarrollo</span>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-800 hover:bg-black text-white font-bold py-1.5 px-4 rounded-xl transition cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
};
