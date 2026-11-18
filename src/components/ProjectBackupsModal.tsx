import React, { useState } from 'react';
import {
  Download,
  FolderArchive,
  CheckCircle,
  FileCode,
  ShieldCheck,
  Server,
  Database,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  X,
  AlertCircle,
  HardDriveDownload,
  FileCheck,
} from 'lucide-react';

interface ProjectBackupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectBackupsModal: React.FC<ProjectBackupsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState<'zip1' | 'zip2' | null>(null);

  if (!isOpen) return null;

  const publicOrigin = 'https://ais-pre-eooztaby6uofrzjmraerfo-60690626410.us-west2.run.app';
  const urlZip1 = `${publicOrigin}/downloads/respaldo_rodo_completo_fuente.zip`;
  const urlZip2 = `${publicOrigin}/downloads/copia_rodo_independiente_proyecto.zip`;

  const copyToClipboard = (text: string, type: 'zip1' | 'zip2') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  const handleDirectDownload = (filename: string, path: string) => {
    const a = document.createElement('a');
    a.href = path;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#0a0c10] text-gray-900 dark:text-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-red-950/40">
        {/* Cabecera */}
        <div className="bg-[#101b29] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#ed0718] p-2.5 rounded-2xl text-white shadow-md">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight text-white tracking-wide">
                Respaldos del Proyecto RODO
              </h3>
              <p className="text-xs text-gray-400">
                2 archivos ZIP independientes listos para guardar en tu celular
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

        {/* Contenido principal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Banner de confirmación */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 text-emerald-950 dark:text-emerald-200 space-y-1">
            <div className="flex items-center gap-2 font-black text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ambos archivos generados e íntegros (Formato ZIP estándar)</span>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Cada archivo contiene el 100% de los archivos del proyecto: código fuente React + TypeScript, componentes, estilos, imágenes y logotipos oficiales, esquemas de base de datos y guías de restauración para tu celular o computadora.
            </p>
          </div>

          {/* Tarjeta Archivo 1 */}
          <div className="bg-gray-50 dark:bg-[#0f131a] border-2 border-red-500/30 dark:border-red-500/40 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600 text-white font-black text-xs shrink-0">
                  ZIP #1
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                    Archivo 1: Respaldo Completo del Proyecto
                  </h4>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Nombre: <code>respaldo_rodo_completo_fuente.zip</code> · Tamaño: ~2.3 MB
                  </span>
                </div>
              </div>
              <span className="bg-red-100 dark:bg-red-950/60 text-[#ed0718] text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-red-200 dark:border-red-800">
                Código Fuente & Recursos
              </span>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Incluye todo el código fuente modular, componentes de interfaz, servicios, algoritmos antifraude, mapa de San Miguel de Allende, fotografías oficiales de platillos, configuración de Vite y paquete de dependencias listo para editar.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDirectDownload('respaldo_rodo_completo_fuente.zip', '/downloads/respaldo_rodo_completo_fuente.zip')}
                className="flex-1 bg-[#ed0718] hover:bg-[#c90012] text-white font-black py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-center cursor-pointer active:scale-95"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>Descargar Archivo 1 en mi Teléfono</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(urlZip1, 'zip1')}
                className="bg-white dark:bg-slate-800 hover:bg-gray-100 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-700 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink === 'zip1' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">¡Enlace copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tarjeta Archivo 2 */}
          <div className="bg-gray-50 dark:bg-[#0f131a] border-2 border-blue-500/30 dark:border-blue-500/40 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white font-black text-xs shrink-0">
                  ZIP #2
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                    Archivo 2: Copia Completa Independiente del Proyecto
                  </h4>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Nombre: <code>copia_rodo_independiente_proyecto.zip</code> · Tamaño: ~2.3 MB
                  </span>
                </div>
              </div>
              <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-blue-200 dark:border-blue-800">
                Segunda Copia Autónoma
              </span>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Segunda copia íntegra de respaldo con todos los archivos duplicados de forma independiente para resguardar en un almacenamiento alterno (Google Drive, memoria microSD o disco externo) en caso de contingencia.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDirectDownload('copia_rodo_independiente_proyecto.zip', '/downloads/copia_rodo_independiente_proyecto.zip')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-center cursor-pointer active:scale-95"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>Descargar Archivo 2 en mi Teléfono</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(urlZip2, 'zip2')}
                className="bg-white dark:bg-slate-800 hover:bg-gray-100 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-700 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {copiedLink === 'zip2' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">¡Enlace copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Guía de Restauración y Servicios Externos */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-500" />
              <span>Instrucciones de Restauración y Servicios Externos</span>
            </h4>

            <div className="space-y-2 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              <div className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block">
                  💻 1. ¿Cómo poner a funcionar el proyecto en cualquier equipo?
                </span>
                <p>
                  1. Descomprime el archivo ZIP en tu computadora o servidor.
                  <br />
                  2. Ejecuta <code>npm install</code> en la terminal para descargar las dependencias.
                  <br />
                  3. Ejecuta <code>npm run dev</code> para iniciar la aplicación de inmediato en tu navegador local.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block">
                  🗄️ 2. Base de Datos PostgreSQL 16 + Redis 7 + Fastify API (Docker)
                </span>
                <p>
                  • El proyecto opera de manera 100% autónoma en contenedores Docker (<code>rodo-db</code>, <code>rodo-redis</code>, <code>rodo-api</code> y <code>rodo-web</code>).
                  <br />
                  • <b>Persistencia Offline de Respaldo:</b> La aplicación incluye almacenamiento local automático en IndexedDB para mantener continuidad ante cortes de señal celular.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block">
                  🗺️ 3. Mapas y Ruteo OpenStreetMap + OSRM con Caché Redis
                </span>
                <p>
                  El proyecto incluye geocodificación y trazado de rutas en moto de San Miguel de Allende aceleradas por Redis en el servidor ($0 costo de API).
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block">
                  🔒 4. Llaves y Credenciales del Administrador
                </span>
                <p>
                  • Correo de administración: <code>edsoncruz14999@gmail.com</code>
                  <br />
                  • Código PIN Maestro: <code>RODO2026</code> (o <code>2026</code>)
                  <br />
                  • Teléfono oficial de soporte: <code>415-101-9920</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-100 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 dark:bg-slate-800 hover:bg-black text-white font-bold text-xs rounded-xl transition"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
