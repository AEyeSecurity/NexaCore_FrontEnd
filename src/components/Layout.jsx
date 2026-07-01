import { useState } from 'react'
import {
  LayoutDashboard, TrendingUp, Briefcase, Users, Calendar,
  BarChart2, Settings, Menu, X, ChevronLeft, ChevronRight,
  Zap, UserCog, LogOut, Home, Building2, ClipboardCheck,
} from 'lucide-react'

const NAV = [
  { section: 'PRINCIPAL', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'MÓDULOS', items: [
    { id: 'finance',       label: 'Finanzas',      icon: TrendingUp },
    { id: 'operations',    label: 'Operativo',     icon: Briefcase  },
    { id: 'crm',           label: 'CRM',           icon: Users      },
    { id: 'planification', label: 'Planificación', icon: Calendar   },
    { id: 'protocolos',    label: 'Protocolos',    icon: ClipboardCheck },
  ]},
  { section: 'SISTEMA', items: [
    { id: 'reportes',       label: 'Reportes',      icon: BarChart2  },
    { id: 'usuarios',       label: 'Usuarios',      icon: UserCog    },
    { id: 'organizacion',   label: 'Organización',  icon: Building2  },
    { id: 'settings',       label: 'Configuración', icon: Settings   },
  ]},
]

const ROLE_PAGES = {
  'Superadmin': null,
  'Dirección':  null,
  'Director':   null,
  'Operativo':  ['operations'],
  'Contable':   ['finance', 'reportes'],
  'Comercial':  ['crm', 'planification'],
  'Mando Medio': ['dashboard', 'operations', 'crm', 'planification'],
  'Operario':    ['dashboard', 'operations'],
  'Auditor / Lector': ['dashboard', 'finance', 'operations', 'crm', 'planification', 'reportes'],
  'Externo':     ['dashboard'],
}

const MODULE_LABELS = {
  dashboard:     'Panel General',
  finance:       'Módulo Financiero',
  operations:    'Módulo Operativo',
  crm:           'CRM — Contactos y Clientes',
  planification: 'Módulo de Planificación',
  protocolos:    'Protocolos',
  reportes:      'Reportes',
  usuarios:      'Gestión de usuarios',
  organizacion:  'Organización y Permisos',
  settings:      'Configuración',
}

function getInitials(name = '') {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last  = parts[parts.length - 1][0] ?? ''
  return (first + (last !== first ? last : '')).toUpperCase()
}

export default function Layout({ children, page, onNavigate, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(false)

  const userName     = user?.name ?? 'Usuario'
  const userRole     = user?.role ?? ''
  const userInitials = getInitials(userName)
  const allowedPages = ROLE_PAGES[userRole] ?? null

  const filteredNAV = NAV.map(section => ({
    ...section,
    items: section.items.filter(item => !allowedPages || allowedPages.includes(item.id)),
  })).filter(section => section.items.length > 0)

  const renderSidebar = (isCollapsed, showCollapseControls = true) => (
    <div className="flex flex-col h-full" style={{ background: '#04342C' }}>

      {/* Header */}
      <div
        className="flex items-center border-b border-white/[0.08] flex-shrink-0"
        style={{
          minHeight: '64px',
          padding: isCollapsed ? '14px 0' : '14px 18px',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        {isCollapsed ? (
          /* Colapsado: solo botón expandir, grande y visible */
          showCollapseControls && (
            <button
              onClick={() => setCollapsed(false)}
              className="p-2.5 rounded-xl hover:bg-white/15 text-white/60 hover:text-white transition-colors"
              title="Expandir menú"
            >
              <ChevronRight size={20} />
            </button>
          )
        ) : (
          /* Expandido: logo + botón colapsar */
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#1D9E75,#5DCAA5)' }}
              >
                <Zap size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold text-white leading-tight">NexaCore</div>
                <div className="text-[9px] text-white/35 tracking-[0.1em] uppercase">Sistema Integral</div>
              </div>
            </div>
            {showCollapseControls && (
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors flex-shrink-0 ml-2"
                title="Contraer menú"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">

        {/* Botón Inicio – siempre visible */}
        <button
          onClick={() => { onNavigate('home'); setMobileOpen(false) }}
          className="w-full flex items-center transition-all duration-150 hover:bg-white/[0.07]"
          style={{
            padding:        isCollapsed ? '10px 0' : '10px 18px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap:            isCollapsed ? 0 : '10px',
            color:          'rgba(255,255,255,0.6)',
            fontSize:       '13.5px',
          }}
          title={isCollapsed ? 'Inicio' : undefined}
        >
          <Home size={17} className="flex-shrink-0" style={{ opacity: 0.75 }} />
          {!isCollapsed && 'Inicio'}
        </button>

        <div className="mx-3 my-2 border-t border-white/[0.07]" />

        {filteredNAV.map(({ section, items }) => (
          <div key={section}>
            {!isCollapsed && (
              <p className="text-[9.5px] font-semibold tracking-[0.13em] uppercase text-white/30 px-[18px] pt-3 pb-1">
                {section}
              </p>
            )}
            {isCollapsed && <div className="pt-3" />}
            {items.map(({ id, label, icon: Icon }) => {
              const active = page === id
              return (
                <button
                  key={id}
                  onClick={() => { onNavigate(id); setMobileOpen(false) }}
                  title={isCollapsed ? label : undefined}
                  className="w-full flex items-center transition-all duration-150 my-px text-left"
                  style={{
                    padding:        isCollapsed ? '9px 0' : '9px 18px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap:            isCollapsed ? 0 : '10px',
                    borderLeft:     `3px solid ${!isCollapsed && active ? '#5DCAA5' : 'transparent'}`,
                    background:     active ? 'rgba(93,202,165,0.13)' : 'transparent',
                    color:          active ? '#5DCAA5' : 'rgba(255,255,255,0.65)',
                    fontWeight:     active ? 500 : 400,
                    fontSize:       '13.5px',
                  }}
                >
                  <Icon size={17} style={{ opacity: active ? 1 : 0.8 }} className="flex-shrink-0" />
                  {!isCollapsed && label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-white/[0.08] flex-shrink-0">
        {isCollapsed ? (
          /* Colapsado: avatar + ícono logout */
          <div className="flex flex-col items-center gap-2 py-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#1D9E75,#5DCAA5)' }}
              title={userName}
            >
              {userInitials}
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/35 hover:text-red-400 transition-colors"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        ) : (
          /* Expandido: avatar + nombre + rol + botón "Cerrar sesión" con texto */
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#1D9E75,#5DCAA5)' }}
              >
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-white/85 font-medium leading-tight truncate">{userName}</p>
                <p className="text-[10.5px] text-white/55">{userRole}</p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/20 text-white/45 hover:text-red-400 transition-colors text-[13px]"
              >
                <LogOut size={14} />
                <span>Cerrar sesión</span>
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#eef2f0' }}>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200"
        style={{ width: collapsed ? '64px' : '232px' }}
      >
        {renderSidebar(collapsed, true)}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-[232px]">
            {renderSidebar(false, false)}
          </div>
          <button className="absolute top-4 right-4 text-white z-20" onClick={() => setMobileOpen(false)}>
            <X size={22} />
          </button>
        </div>
      )}

      {/* Main content */}
      <div id="app-main" className="relative flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <div
          className="bg-white border-b h-[58px] flex items-center justify-between px-7 flex-shrink-0 z-10"
          style={{ borderColor: 'rgba(15,110,86,0.13)' }}
        >
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="font-serif font-semibold text-[17px] text-gray-900">
              {MODULE_LABELS[page] || 'NexaCore'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ background: '#E1F5EE', color: '#0F6E56' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Sistema activo
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 fade-in">
          {children}
        </main>

      </div>
    </div>
  )
}
