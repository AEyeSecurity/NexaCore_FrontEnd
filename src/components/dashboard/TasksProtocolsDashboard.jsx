import { CheckSquare, Clock, Play, CheckCircle2, FlaskConical, Activity, FileCheck, Info } from 'lucide-react'

// ── Definición de tarjetas de Tareas ────────────────────────────────────────
const TASK_CARDS = [
  {
    id: 'total_tareas',
    icon: CheckSquare,
    title: 'Total de Tareas',
    colors: { bg: 'rgba(27,122,94,0.07)', iconBg: 'rgba(27,122,94,0.14)', accent: '#1B7A5E' },
  },
  {
    id: 'tareas_pendientes',
    icon: Clock,
    title: 'Pendientes',
    colors: { bg: 'rgba(217,119,6,0.07)', iconBg: 'rgba(217,119,6,0.14)', accent: '#B45309' },
  },
  {
    id: 'tareas_en_progreso',
    icon: Play,
    title: 'En Progreso',
    colors: { bg: 'rgba(59,130,246,0.07)', iconBg: 'rgba(59,130,246,0.14)', accent: '#2563EB' },
  },
  {
    id: 'tareas_completadas',
    icon: CheckCircle2,
    title: 'Completadas',
    colors: { bg: 'rgba(22,163,74,0.07)', iconBg: 'rgba(22,163,74,0.14)', accent: '#16A34A' },
  },
]

// ── Definición de tarjetas de Protocolos ────────────────────────────────────
const PROTOCOL_CARDS = [
  {
    id: 'total_protocolos',
    icon: FlaskConical,
    title: 'Total de Protocolos',
    colors: { bg: 'rgba(27,122,94,0.07)', iconBg: 'rgba(27,122,94,0.14)', accent: '#1B7A5E' },
  },
  {
    id: 'protocolos_activos',
    icon: Activity,
    title: 'Activos',
    colors: { bg: 'rgba(59,130,246,0.07)', iconBg: 'rgba(59,130,246,0.14)', accent: '#2563EB' },
  },
  {
    id: 'protocolos_completados',
    icon: FileCheck,
    title: 'Completados',
    colors: { bg: 'rgba(22,163,74,0.07)', iconBg: 'rgba(22,163,74,0.14)', accent: '#16A34A' },
  },
]

// ── Tarjeta de métrica placeholder ──────────────────────────────────────────
// Mismo estilo visual que WidgetCard (rounded-2xl, p-5, shadow-sm).
// Muestra "—" como valor hasta que el endpoint esté configurado.
function PlaceholderMetricCard({ card }) {
  const { icon: Icon, title, colors } = card
  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ background: colors.bg }}>
      <div className="flex flex-col" style={{ minHeight: '96px' }}>
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: colors.iconBg }}
          >
            <Icon size={20} style={{ color: colors.accent }} />
          </div>
        </div>
        <div className="mt-auto">
          <p className="text-[24px] font-bold text-gray-300 leading-none mb-1.5">—</p>
          <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: colors.accent }}>
            {title}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Cabecera de sección ──────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return (
    <h2 className="font-serif text-[13px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
      {label}
    </h2>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function TasksProtocolsDashboard() {
  return (
    <div className="fade-in space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-serif text-[21px] font-semibold text-gray-900">Tareas y Protocolos</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">NexaCore · Vista operativa</p>
      </div>

      {/* Banner: endpoint pendiente */}
      <div
        className="flex items-start gap-2.5 rounded-xl p-4 text-[13px]"
        style={{ background: 'rgba(27,122,94,0.08)', color: '#1B7A5E' }}
      >
        <Info size={15} className="flex-shrink-0 mt-0.5" />
        <span>
          Los datos se cargarán desde el backend cuando el endpoint esté disponible.
          Configurar la llamada a la API en{' '}
          <code className="font-mono text-[12px] bg-white/60 px-1 py-0.5 rounded">
            TasksProtocolsDashboard.jsx
          </code>.
        </span>
      </div>

      {/* Sección: Tareas */}
      <div>
        <SectionHeader label="Tareas" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TASK_CARDS.map(card => (
            <PlaceholderMetricCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      {/* Sección: Protocolos */}
      <div>
        <SectionHeader label="Protocolos" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROTOCOL_CARDS.map(card => (
            <PlaceholderMetricCard key={card.id} card={card} />
          ))}
        </div>
      </div>

    </div>
  )
}
