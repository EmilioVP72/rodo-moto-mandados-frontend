import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useBackdropClose } from '../utils/modalBackdrop';

export interface FoodImagePreviewData {
  src: string;
  title: string;
  subtitle?: string;
  description?: string;
  price?: number;
}

interface FoodImagePreviewModalProps {
  preview: FoodImagePreviewData | null;
  onClose: () => void;
}

export const FoodImagePreviewModal: React.FC<FoodImagePreviewModalProps> = ({ preview, onClose }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const backdropHandlers = useBackdropClose(Boolean(preview), onClose);

  useEffect(() => {
    setIsZoomed(false);
  }, [preview?.src]);

  useEffect(() => {
    if (!preview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preview, onClose]);

  if (!preview) return null;

  return (
    <div
      {...backdropHandlers}
      className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista ampliada de ${preview.title}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col bg-[#101b29] rounded-3xl overflow-hidden shadow-2xl border border-white/15 animate-in zoom-in-95 duration-150"
      >
        {/* Barra superior de acciones */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-black/40 border-b border-white/10 text-white shrink-0">
          <div className="min-w-0">
            {preview.subtitle && (
              <span className="block text-[10px] font-black uppercase tracking-widest text-red-400 truncate">
                {preview.subtitle}
              </span>
            )}
            <h3 className="text-sm sm:text-base font-black truncate">{preview.title}</h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsZoomed((z) => !z)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title={isZoomed ? 'Ajustar a pantalla' : 'Acercar imagen'}
            >
              {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              <span className="hidden sm:inline">{isZoomed ? 'Alejar' : 'Acercar'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar imagen ampliada"
              className="p-1.5 rounded-full bg-white/15 hover:bg-[#ed0718] text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visor fotográfico principal */}
        <div
          className={`flex-1 bg-black flex items-center justify-center min-h-[260px] max-h-[72dvh] ${
            isZoomed ? 'overflow-auto cursor-zoom-out p-2' : 'overflow-hidden cursor-zoom-in p-2 sm:p-4'
          }`}
          onClick={() => setIsZoomed((z) => !z)}
        >
          <img
            src={preview.src}
            alt={preview.title}
            className={`rounded-2xl transition-transform duration-200 select-none ${
              isZoomed
                ? 'max-w-none w-[155%] sm:w-[145%] h-auto object-contain'
                : 'max-h-[66dvh] w-auto max-w-full object-contain shadow-xl'
            }`}
          />
        </div>

        {/* Pie informativo del platillo */}
        {(preview.description || preview.price !== undefined) && (
          <div className="px-4 py-3.5 bg-[#101b29] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-white shrink-0">
            {preview.description ? (
              <p className="text-xs text-gray-300 leading-relaxed flex-1 min-w-[180px]">
                {preview.description}
              </p>
            ) : (
              <span className="text-[11px] text-gray-400">Toca la foto para acercar o alejar</span>
            )}
            {preview.price !== undefined && preview.price > 0 && (
              <span className="font-mono font-black text-sm sm:text-base bg-[#ed0718] text-white px-3 py-1 rounded-xl shrink-0">
                ${preview.price.toFixed(2)} MXN
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
