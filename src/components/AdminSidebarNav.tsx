import React from 'react';
import {
  Bike,
  Archive,
  Wallet,
  Bell,
  Store,
  Sparkles,
  KeyRound,
  Map,
  TrendingUp,
  BarChart3,
  Users,
  LifeBuoy,
  Activity,
  History,
  Sliders,
  Globe2,
  X,
} from 'lucide-react';

export type AdminTabId =
  | 'despacho'
  | 'historico'
  | 'rendimiento'
  | 'estadisticas'
  | 'notificaciones'
  | 'recuperacion'
  | 'locales_api'
  | 'restaurantes'
  | 'especialidades'
  | 'cobertura'
  | 'clientes'
  | 'seguridad_otp'
  | 'cortes'
  | 'ajustes'
  | 'bitacora'
  | 'enlaces_web';

export interface AdminNavItem {
  id: AdminTabId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeTone?: 'danger' | 'neutral' | 'amber';
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export interface AdminNavCounts {
  newLiveOrders: number;
  totalHistoryOrders: number;
  partnerLocalsCount: number;
  activeSpecialtiesCount: number;
  pendingRecoveriesCount: number;
}

export function buildAdminNavGroups(counts: AdminNavCounts): AdminNavGroup[] {
  return [
    {
      title: 'Operación Diaria',
      items: [
        {
          id: 'despacho',
          label: 'Despacho en Vivo',
          subtitle: 'Pedidos activos de las últimas 24 horas con limpieza automática',
          icon: Bike,
          badge: counts.newLiveOrders > 0 ? counts.newLiveOrders : undefined,
          badgeTone: 'danger',
        },
        {
          id: 'historico',
          label: 'Histórico de Pedidos',
          subtitle: 'Archivo permanente con estatus finales, filtros avanzados y CSV',
          icon: Archive,
          badge: counts.totalHistoryOrders,
          badgeTone: 'neutral',
        },
        {
          id: 'cortes',
          label: 'Cortes Diarios',
          subtitle: 'Balance de efectivo, transferencias SPEI, comisiones y propinas',
          icon: Wallet,
        },
        {
          id: 'notificaciones',
          label: 'Notificaciones',
          subtitle: 'Envía avisos promocionales y alertas a todos los usuarios',
          icon: Bell,
        },
      ],
    },
    {
      title: 'Catálogo & Zonas',
      items: [
        {
          id: 'restaurantes',
          label: 'Restaurantes & Tarifas',
          subtitle: 'Administra comercios, menús, horarios, cierres y comisiones',
          icon: Store,
        },
        {
          id: 'especialidades',
          label: 'Especialidades',
          subtitle: 'Categorías del catálogo de restaurantes y motomandados',
          icon: Sparkles,
          badge: counts.activeSpecialtiesCount,
          badgeTone: 'amber',
        },
        {
          id: 'locales_api',
          label: 'Códigos Locales',
          subtitle: 'Claves PIN de 3 dígitos para locales asociados',
          icon: KeyRound,
          badge: counts.partnerLocalsCount,
          badgeTone: 'neutral',
        },
        {
          id: 'cobertura',
          label: 'Mapa de Cobertura',
          subtitle: 'Geocerca oficial de San Miguel de Allende y zonas activas',
          icon: Map,
        },
      ],
    },
    {
      title: 'Analítica',
      items: [
        {
          id: 'rendimiento',
          label: 'Rendimiento',
          subtitle: 'Gráficas de volumen, tiempos y desempeño operativo',
          icon: TrendingUp,
        },
        {
          id: 'estadisticas',
          label: 'Estadísticas',
          subtitle: 'Indicadores de ventas, comercios top y comportamiento',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'Clientes & Seguridad',
      items: [
        {
          id: 'clientes',
          label: 'Clientes & Antifraude',
          subtitle: 'Cuentas verificadas INE, bloqueos y control de adeudos',
          icon: Users,
        },
        {
          id: 'recuperacion',
          label: 'Recuperar Cuentas',
          subtitle: 'Solicitudes de cambio de correo y validación de identidad',
          icon: LifeBuoy,
          badge: counts.pendingRecoveriesCount > 0 ? counts.pendingRecoveriesCount : undefined,
          badgeTone: 'danger',
        },
        {
          id: 'seguridad_otp',
          label: 'Diagnóstico OTP',
          subtitle: 'Estado del sistema de verificación y seguridad interna',
          icon: Activity,
        },
        {
          id: 'bitacora',
          label: 'Bitácora Auditoría',
          subtitle: 'Registro inmutable de acciones administrativas',
          icon: History,
        },
      ],
    },
    {
      title: 'Configuración',
      items: [
        {
          id: 'ajustes',
          label: 'Repartidores & Ajustes',
          subtitle: 'Flotilla WhatsApp, cuentas CLABE, temas festivos y pausas',
          icon: Sliders,
        },
        {
          id: 'enlaces_web',
          label: 'Integraciones Web',
          subtitle: 'Conexión y enlaces externos con otros sitios',
          icon: Globe2,
        },
      ],
    },
  ];
}

export function getAdminTabMeta(tabId: AdminTabId, groups: AdminNavGroup[]): AdminNavItem {
  for (const g of groups) {
    const found = g.items.find((i) => i.id === tabId);
    if (found) return found;
  }
  return groups[0].items[0];
}

interface AdminSidebarNavProps {
  groups: AdminNavGroup[];
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  mobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
}

const NavGroupsList: React.FC<{
  groups: AdminNavGroup[];
  activeTab: AdminTabId;
  onSelect: (tab: AdminTabId) => void;
}> = ({ groups, activeTab, onSelect }) => (
  <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-5">
    {groups.map((group) => (
      <div key={group.title} className="space-y-1">
        <div className="px-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          {group.title}
        </div>
        {group.items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-[#ed0718] text-white shadow-md shadow-red-950/40'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-white text-[#ed0718]'
                      : item.badgeTone === 'danger'
                      ? 'bg-[#ed0718] text-white animate-pulse'
                      : item.badgeTone === 'amber'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    ))}
  </nav>
);

export const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({
  groups,
  activeTab,
  onSelectTab,
  mobileDrawerOpen,
  onCloseMobileDrawer,
}) => {
  return (
    <>
      {/* Sidebar fijo en Escritorio (lg+) */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 h-full min-h-0 bg-[#0b1220] text-slate-100 border-r border-slate-800">
        <div className="px-4 py-4 border-b border-slate-800/90 flex items-center gap-3">
          <img
            src="/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg"
            alt="RODO"
            className="h-10 w-10 rounded-xl object-cover border border-white/20 shrink-0 shadow-sm"
          />
          <div className="min-w-0">
            <div className="font-black text-sm tracking-wide text-white leading-tight">
              RODO ADMIN
            </div>
            <div className="text-[11px] text-slate-400 truncate">Central de Despacho</div>
          </div>
        </div>
        <NavGroupsList groups={groups} activeTab={activeTab} onSelect={onSelectTab} />
      </aside>

      {/* Drawer lateral deslizable en Móvil / Tablet (< lg) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-2xs"
            onClick={onCloseMobileDrawer}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-[100dvh] bg-[#0b1220] text-slate-100 flex flex-col shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200">
            <div className="px-4 py-4 pt-safe border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/assets/aistudio/IMG-20260902-WA0090_1__d4eb6002.jpg"
                  alt="RODO"
                  className="h-9 w-9 rounded-xl object-cover border border-white/20 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-black text-sm text-white leading-tight">RODO ADMIN</div>
                  <div className="text-[10px] text-slate-400">Todas las secciones</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                aria-label="Cerrar menú de secciones"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavGroupsList
              groups={groups}
              activeTab={activeTab}
              onSelect={(tab) => {
                onSelectTab(tab);
                onCloseMobileDrawer();
              }}
            />
          </aside>
        </div>
      )}
    </>
  );
};
