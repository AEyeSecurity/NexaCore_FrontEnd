import {
  TrendingUp, Briefcase, Users,
  BarChart2, UserCog, Building2,
  LayoutGrid, LogOut, ClipboardCheck, Gauge,
  ArrowRight, ChevronRight,
} from 'lucide-react'
import logoUrl from '../../resources/logo3.png'
import { ROLE_PAGES, useAllowedModules } from '../lib/permissions'
import { useNexi } from '../context/NexiContext'
import { HeroOndas, ModuloIlustracion } from './home/HomeIlustraciones'

const MODULES = [
  { id: 'finance',       label: 'Finanzas',      icon: TrendingUp,     descripcion: 'Gestión financiera y control de recursos.' },
  { id: 'operations',    label: 'Operativo',      icon: Briefcase,      descripcion: 'Procesos y operaciones del día a día.' },
  { id: 'crm',           label: 'CRM',            icon: Users,          descripcion: 'Gestión de clientes y relaciones comerciales.' },
  { id: 'protocolos',    label: 'Protocolos',     icon: ClipboardCheck, descripcion: 'Procedimientos, normativas y controles.' },
]

const SYSTEM_ITEMS = [
  { id: 'reportes',      label: 'Reportes',      icon: BarChart2, descripcion: 'Historial de reportes generados con Nexi.' },
  { id: 'usuarios',      label: 'Usuarios',      icon: UserCog,   descripcion: 'Administración de usuarios.' },
  { id: 'organizacion',  label: 'Organización',  icon: Building2, descripcion: 'Estructura, roles y permisos.' },
]

const DASHBOARD_ITEM   = { id: 'dashboard',   label: 'Dashboard',   icon: LayoutGrid, descripcion: 'Vista general de la información clave de tu organización.' }
const INDICADORES_ITEM = { id: 'indicadores', label: 'Indicadores', icon: Gauge,      descripcion: 'Seguimiento y análisis de tus indicadores.' }

// Medidas que escalan con la altura del viewport: en una notebook (~1440×800)
// Inicio entra completo sin scroll; en pantallas más altas respira más.
// En alturas muy chicas o mobile se aceptan los mínimos y hay scroll.
const FIT = {
  heroPadY:     'clamp(14px, 3.2vh, 52px)',
  artH:         'clamp(200px, 36vh, 420px)',
  greeting:     'clamp(34px, 5.4vh, 62px)',
  sectionGap:   'clamp(16px, 3vh, 44px)',
  sectionTitle: 'clamp(20px, 3vh, 30px)',
  headingGap:   'clamp(10px, 1.6vh, 20px)',
  gridGap:      'clamp(10px, 1.6vh, 20px)',
  cardMinH:     'clamp(122px, 17vh, 196px)',
  cardPad:      'clamp(14px, 2.1vh, 24px)',
  systemPadY:   'clamp(10px, 1.5vh, 16px)',
}

const GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
const CARD_SHADOW = '0 1px 2px rgba(4,52,44,0.04), 0 8px 24px rgba(4,52,44,0.06)'
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF2F0]'

function getInitials(name = '') {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last  = parts[parts.length - 1][0] ?? ''
  return (first + (last !== first ? last : '')).toUpperCase()
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div style={{ marginBottom: FIT.headingGap }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.3em] text-gray-500">{eyebrow}</p>
      <h2 className="font-serif leading-tight text-gray-900 mt-1" style={{ fontSize: FIT.sectionTitle }}>{title}</h2>
    </div>
  )
}

function IconCircle({ icon: Icon }) {
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E1F5EE' }}>
      <Icon size={19} strokeWidth={1.8} style={{ color: '#0F6E56' }} />
    </div>
  )
}

function ModuleCard({ item, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden text-left bg-white rounded-3xl flex flex-col border border-[rgba(15,110,86,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(4,52,44,0.05),0_16px_36px_rgba(4,52,44,0.11)] ${focusRing}`}
      style={{ boxShadow: CARD_SHADOW, minHeight: FIT.cardMinH, padding: FIT.cardPad }}
    >
      <ModuloIlustracion id={item.id} />
      <div className="relative z-10 flex flex-col flex-1">
        <IconCircle icon={item.icon} />
        <h3 className="mt-auto pt-2.5 text-[16.5px] font-semibold text-gray-900 leading-tight">{item.label}</h3>
        <p className="mt-1 text-[12.5px] leading-[1.45] text-gray-500 max-w-[60%]">{item.descripcion}</p>
      </div>
      <span
        className="absolute z-10 bottom-4 right-4 w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-800 transition-colors duration-200 group-hover:bg-[#04342C] group-hover:text-white"
        style={{ boxShadow: '0 2px 10px rgba(4,52,44,0.12)' }}
        aria-hidden="true"
      >
        <ArrowRight size={15} strokeWidth={2} />
      </span>
    </button>
  )
}

// Mismo tamaño/forma que ModuleCard — ocupa el lugar de "Indicadores" mientras
// se resuelve la Matriz de permisos real, para que al llegar la respuesta no
// se corran las demás tarjetas (solo ese lugar cambia de contenido).
function ModuleCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse bg-white rounded-3xl flex flex-col border border-[rgba(15,110,86,0.06)]"
      style={{ boxShadow: CARD_SHADOW, minHeight: FIT.cardMinH, padding: FIT.cardPad }}
    >
      <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: '#EEF1EE' }} />
      <div className="mt-auto pt-2.5 h-4 w-24 rounded" style={{ background: '#EEF1EE' }} />
      <div className="mt-2 h-3 w-32 rounded" style={{ background: '#EEF1EE' }} />
    </div>
  )
}

function SystemCard({ item, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ boxShadow: CARD_SHADOW, paddingTop: FIT.systemPadY, paddingBottom: FIT.systemPadY }}
      className={`group flex items-center gap-3.5 text-left bg-white rounded-2xl px-5 border border-[rgba(15,110,86,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(4,52,44,0.05),0_12px_28px_rgba(4,52,44,0.1)] ${focusRing}`}
    >
      <IconCircle icon={item.icon} />
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-gray-900 leading-tight">{item.label}</p>
        <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{item.descripcion}</p>
      </div>
      <ChevronRight size={18} className="flex-shrink-0 text-gray-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0F6E56]" aria-hidden="true" />
    </button>
  )
}

export default function Home({ user, onNavigate, onLogout }) {
  const userRole     = user?.role ?? ''
  const userName     = user?.name ?? 'Usuario'
  const userInitials = getInitials(userName)
  const allowedPages = ROLE_PAGES[userRole] ?? null
  const firstName    = String(user?.name ?? '').trim().split(/\s+/)[0] ?? ''

  const canSeeDashboard = !allowedPages || allowedPages.includes('dashboard')
  const visibleModules  = MODULES.filter(m => !allowedPages || allowedPages.includes(m.id))
  const visibleSystem   = SYSTEM_ITEMS.filter(m => !allowedPages || allowedPages.includes(m.id))

  // Indicadores: mismo criterio que el menú lateral — Matriz de permisos real
  // (allowedModules), no por rol. Mientras esa respuesta no llegó se reserva
  // el lugar con un skeleton (en vez de no renderizar nada) para que el resto
  // de las tarjetas no se corra cuando por fin se sabe si corresponde o no.
  const [allowedModules, modulosLoading] = useAllowedModules(user?.email)
  const { isOpen: nexiOpen } = useNexi()
  const indicadoresEntry = modulosLoading
    ? [{ id: 'indicadores-skeleton', skeleton: true }]
    : allowedModules.includes('indicadores') ? [INDICADORES_ITEM] : []

  // Orden: Dashboard, Indicadores, luego el resto de módulos visibles
  const dashboardEntry = canSeeDashboard ? [DASHBOARD_ITEM] : []
  const allModules = [...dashboardEntry, ...indicadoresEntry, ...visibleModules]

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${nexiOpen ? 'md:mr-[400px]' : ''}`} style={{ background: 'linear-gradient(180deg, #F2F6F4 0%, #EEF2F0 60%, #EAF0ED 100%)' }}>

      {/* Top bar */}
      <div
        className="bg-white flex items-center px-6 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(15,110,86,0.13)' }}
      >
        <img src={logoUrl} alt="NexaCore" className="h-10 w-auto object-contain" />
      </div>

      {/* Content – scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        <div className="relative">
        {/* Ondas: fondo absoluto que baja por detrás del hero y del primer título,
            y se funde antes de las tarjetas (que quedan por encima). */}
        <HeroOndas
          className="absolute top-0 right-0 w-full md:w-[70%] opacity-35 sm:opacity-60 md:opacity-100 pointer-events-none"
          style={{ height: FIT.artH }}
        />

        {/* Hero */}
        <section className="relative">
          <div
            className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-x-5 gap-y-2"
            style={{ paddingTop: FIT.heroPadY, paddingBottom: FIT.heroPadY }}
          >
            <h1
              className="font-serif font-bold leading-[1.05] tracking-[-0.02em] text-gray-900 break-words"
              style={{ fontSize: FIT.greeting }}
            >
              {firstName
                ? <>Hola, <span style={{ color: '#0F6E56' }}>{firstName}</span></>
                : 'Hola'}
            </h1>
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12.5px] font-medium"
              style={{ background: 'rgba(225,245,238,0.9)', color: '#0F6E56', boxShadow: 'inset 0 0 0 1px rgba(29,158,117,0.15)' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: '#1D9E75', boxShadow: '0 0 0 3px rgba(29,158,117,0.18)' }} />
              Sistema activo
            </span>
          </div>
        </section>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingBottom: FIT.sectionGap }}>

          {/* Módulos principales */}
          {allModules.length > 0 && (
            <section style={{ marginBottom: FIT.sectionGap }}>
              <SectionHeading eyebrow="Módulos principales" title="Todo lo que necesitás, en un solo lugar" />
              <div className={GRID} style={{ gap: FIT.gridGap }}>
                {allModules.map(item => (
                  item.skeleton
                    ? <ModuleCardSkeleton key={item.id} />
                    : <ModuleCard key={item.id} item={item} onClick={() => onNavigate(item.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Herramientas del sistema */}
          {visibleSystem.length > 0 && (
            <section>
              <SectionHeading eyebrow="Herramientas del sistema" title="Gestión y administración" />
              <div className={GRID} style={{ gap: FIT.gridGap }}>
                {visibleSystem.map(item => (
                  <SystemCard key={item.id} item={item} onClick={() => onNavigate(item.id)} />
                ))}
              </div>
            </section>
          )}

        </div>
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
