import {
  TrendingUp, Briefcase, Users, Calendar,
  BarChart2, Settings, UserCog, Building2,
  LayoutGrid, LogOut, Layers, ClipboardCheck,
} from 'lucide-react'
import logoUrl from '../../resources/logo3.png'

const MODULES = [
  { id: 'finance',       label: 'Finanzas',      icon: TrendingUp },
  { id: 'operations',    label: 'Operativo',      icon: Briefcase },
  { id: 'crm',           label: 'CRM',            icon: Users },
  { id: 'planification', label: 'Planificación',  icon: Calendar },
  { id: 'protocolos',    label: 'Protocolos',     icon: ClipboardCheck },
]

const SYSTEM_ITEMS = [
  { id: 'reportes',      label: 'Reportes',      icon: BarChart2  },
  { id: 'usuarios',      label: 'Usuarios',      icon: UserCog    },
  { id: 'organizacion',  label: 'Organización',  icon: Building2  },
  { id: 'settings',      label: 'Configuración', icon: Settings   },
]

const ROLE_PAGES = {
  'Superadmin': null,
  'Dirección':  null,
  'Operativo':  ['operations'],
  'Contable':   ['finance', 'reportes'],
  'Comercial':  ['crm', 'planification'],
}

function getInitials(name = '') {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last  = parts[parts.length - 1][0] ?? ''
  return (first + (last !== first ? last : '')).toUpperCase()
}

export default function Home({ user, onNavigate, onLogout }) {
  const userRole     = user?.role ?? ''
  const userName     = user?.name ?? 'Usuario'
  const userInitials = getInitials(userName)
  const allowedPages = ROLE_PAGES[userRole] ?? null

  const canSeeDashboard = !allowedPages
  const visibleModules  = MODULES.filter(m => !allowedPages || allowedPages.includes(m.id))
  const visibleSystem   = SYSTEM_ITEMS.filter(m => !allowedPages || allowedPages.includes(m.id))

  // Orden: Dashboard primero, luego el resto de módulos visibles
  const dashboardEntry = canSeeDashboard ? [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }] : []
  const allModules = [...dashboardEntry, ...visibleModules]
  const row1Modules = allModules.slice(0, 3)
  const row2Modules = allModules.slice(3)

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#EEF2F0' }}>

      {/* Top bar – más angosto */}
      <div
        className="bg-white flex items-center px-6 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(15,110,86,0.13)' }}
      >
        <img src={logoUrl} alt="NexaCore" className="h-10 w-auto object-contain" />
      </div>

      {/* Content – scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>

          {/* Módulos section */}
          <div className="mb-5">
            {/* Título Módulos – no clickeable */}
            <div
              className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 mb-4"
              style={{ background: '#04342C' }}
            >
              <Layers size={19} className="text-white" />
              <span className="font-serif font-bold text-[16.5px] text-white">Módulos</span>
            </div>

            {/* Fila 1: hasta 3 módulos en grid */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {row1Modules.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className="bg-white rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-150 hover:shadow-md hover:-translate-y-[2px]"
                  style={{ border: '1px solid rgba(15,110,86,0.07)', minHeight: '130px', padding: '24px 16px' }}
                >
                  <div className="mb-3" style={{ color: '#1D9E75' }}>
                    <Icon size={28} strokeWidth={1.8} />
                  </div>
                  <div className="font-semibold text-gray-900 text-[14.5px] leading-tight">{label}</div>
                </button>
              ))}
            </div>

            {/* Fila 2: módulos restantes centrados */}
            {row2Modules.length > 0 && (
              <div className="flex justify-center gap-4">
                {row2Modules.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className="bg-white rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-150 hover:shadow-md hover:-translate-y-[2px]"
                    style={{
                      border: '1px solid rgba(15,110,86,0.07)',
                      minHeight: '130px',
                      padding: '24px 16px',
                      width: 'calc((100% - 2rem) / 3)',
                    }}
                  >
                    <div className="mb-3" style={{ color: '#1D9E75' }}>
                      <Icon size={28} strokeWidth={1.8} />
                    </div>
                    <div className="font-semibold text-gray-900 text-[14.5px] leading-tight">{label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sistema section */}
          {visibleSystem.length > 0 && (
            <div>
              {/* Título Sistema – no clickeable, siempre visible */}
              <div
                className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 mb-4"
                style={{ background: '#04342C' }}
              >
                <Settings size={19} className="text-white" strokeWidth={1.8} />
                <span className="font-serif font-bold text-[16.5px] text-white">Sistema</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {visibleSystem.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className="bg-white rounded-2xl flex items-center gap-4 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-[2px]"
                    style={{ border: '1px solid rgba(15,110,86,0.07)', padding: '20px 24px' }}
                  >
                    <Icon size={22} style={{ color: '#1D9E75' }} strokeWidth={1.8} />
                    <span className="font-medium text-gray-700 text-[14.5px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom user bar – siempre visible */}
      <div
        className="bg-white flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(15,110,86,0.13)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#1D9E75,#5DCAA5)' }}
          >
            {userInitials}
          </div>
          <div>
            <div className="font-medium text-gray-800 text-[13.5px] leading-tight">{userName}</div>
            <div className="text-gray-400 text-[11.5px]">{userRole}</div>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

    </div>
  )
}
