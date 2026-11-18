import React, { useState } from 'react';
import { ShoppingBag, Search, Bike, MapPin, CheckCircle, ChevronRight, ChevronLeft, Sparkles, X } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: '¡Bienvenido a RODO Moto Mandados!',
      subtitle: 'La plataforma de despacho y mandados más rápida de San Miguel de Allende',
      icon: <Bike className="w-12 h-12 text-[#ed0718]" />,
      badge: 'Paso 1 de 3',
      content: (
        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
          <p>
            Pide platillos de los mejores restaurantes y puestos tradicionales de San Miguel, o solicita envíos de paquetes, documentos y compras especiales.
          </p>
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-2xl space-y-1.5 text-left">
            <div className="font-extrabold text-[#ed0718] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Despacho Directo & Tarifas Claras</span>
            </div>
            <p className="text-[11px] text-gray-700 dark:text-gray-300">
              Coordinación inmediata por WhatsApp con repartidores locales de confianza. Puedes pagar en efectivo al recibir o por transferencia SPEI verificada.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Buscador Inteligente & Filtros Rápidos',
      subtitle: 'Encuentra al instante lo que se te antoja',
      icon: <Search className="w-12 h-12 text-blue-500" />,
      badge: 'Paso 2 de 3',
      content: (
        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
          <p>
            Utiliza la barra de búsqueda superior para encontrar platillos específicos (tacos, pizza, sushi, hamburguesas) o tu local favorito.
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700">
              <span className="font-bold text-gray-900 dark:text-white block">⚡ Más Rápido</span>
              <span className="text-[10px] text-gray-500">Ordena locales por menor tiempo de entrega.</span>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700">
              <span className="font-bold text-gray-900 dark:text-white block">💰 Menor Envío</span>
              <span className="text-[10px] text-gray-500">Encuentra los costos de reparto más accesibles.</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            Guarda tus lugares preferidos pulsando el corazón ❤️ para verlos en tu sección de Favoritos.
          </p>
        </div>
      ),
    },
    {
      title: 'Ticket Digital & Rastreo GPS en Vivo',
      subtitle: 'Transparencia total en tu entrega',
      icon: <MapPin className="w-12 h-12 text-emerald-500" />,
      badge: 'Paso 3 de 3',
      content: (
        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
          <p>
            Al confirmar tu pedido, se genera un <b>Ticket Digital con Folio Único</b> accesible en cualquier momento.
          </p>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-2xl text-left space-y-1.5">
            <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Avisos de Llegada & Tolerancia de 10 Minutos</span>
            </div>
            <p className="text-[11px] text-emerald-950 dark:text-emerald-200">
              Cuando el repartidor llegue afuera de tu domicilio, recibirás una notificación de inmediato con un temporizador de 10 minutos para salir a recibir tu pedido.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const handleFinish = () => {
    try {
      localStorage.setItem('rodo_tutorial_completed', 'true');
    } catch (e) {}
    onClose();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleFinish();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleFinish();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800 cursor-default"
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
          <span className="bg-red-50 dark:bg-red-950/60 text-[#ed0718] font-mono text-[11px] font-black px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-900/50">
            {steps[currentStep].badge}
          </span>
          <button
            onClick={handleFinish}
            aria-label="Cerrar tutorial"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del Paso */}
        <div className="p-5 sm:p-6 text-center space-y-4 flex-1">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gray-50 dark:bg-slate-800/80 flex items-center justify-center shadow-inner">
            {steps[currentStep].icon}
          </div>

          <div className="space-y-1">
            <h3 className="font-black text-lg sm:text-xl text-gray-900 dark:text-white">
              {steps[currentStep].title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {steps[currentStep].subtitle}
            </p>
          </div>

          {steps[currentStep].content}

          {/* Indicadores de Pasos (Dots) */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === idx
                    ? 'w-6 bg-[#ed0718]'
                    : 'w-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer con Botones de Navegación */}
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-3.5 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-3.5 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              Omitir
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="bg-[#ed0718] hover:bg-[#c90012] text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <span>¡Empezar a ordenar!</span>
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
