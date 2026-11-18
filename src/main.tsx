import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { LanguageProvider } from './utils/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'Error inesperado' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RODO App Error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReload = () => {
    try {
      // Clear possible corrupted local storage keys if any
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public handleFullReset = () => {
    try {
      localStorage.removeItem('rodo_restaurants');
      localStorage.removeItem('rodo_restaurants_cache');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fcf9f9] text-[#1a1213] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#900] to-[#cb1a2a] text-white flex items-center justify-center font-black text-3xl shadow-xl mb-5 ring-4 ring-red-100 animate-pulse">
            R
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mb-2 tracking-tight">
            RODO Moto Mandados
          </h1>
          <p className="text-sm text-neutral-600 max-w-sm mb-6 leading-relaxed">
            Se recuperó la sesión del sistema. Haz clic abajo para cargar el catálogo completo al instante.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full py-3.5 px-4 bg-[#cb1a2a] hover:bg-[#a51522] text-white font-extrabold rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer text-sm"
            >
              🔄 Cargar RODO
            </button>
            <button
              onClick={this.handleFullReset}
              className="w-full py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-700 font-bold rounded-2xl border border-neutral-300 shadow-sm transition-transform active:scale-95 cursor-pointer text-xs"
            >
              Limpiar Caché Local
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('RODO: Unhandled promise rejection prevented from crashing UI:', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </ErrorBoundary>
);
