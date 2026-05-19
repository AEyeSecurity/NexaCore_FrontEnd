import { Calendar, Plus, PlayCircle, CheckSquare, DollarSign } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-5 border shadow-sm" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '18' }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-[12.5px] text-gray-500">{label}</p>
      <p className="text-[22px] font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default function PlanificationModule() {
  const [metricas, setMetricas] = useState(null)

  useEffect(() => {
    api.getMetricasPlanification().then(setMetricas).catch(() => {})
  }, [])

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-AR')}` : '—'

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[20px] font-semibold text-gray-900">Planificación</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Proyectos, hitos y presupuesto</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-medium shadow-sm"
          style={{ background: '#0F6E56' }}>
          <Plus size={15} /> Nuevo Proyecto
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total proyectos" value={metricas?.total ?? '—'} icon={Calendar} color="#0EA5E9" />
        <StatCard label="En curso" value={metricas?.activos ?? '—'} icon={PlayCircle} color="#1D9E75" />
        <StatCard label="Completados" value={metricas?.completados ?? '—'} icon={CheckSquare} color="#6366F1" />
        <StatCard label="Presupuesto total" value={fmt(metricas?.presupuestoTotal)} icon={DollarSign} color="#F59E0B" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-8 text-center" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: '#0EA5E918' }}>
          <Calendar size={26} style={{ color: '#0EA5E9' }} />
        </div>
        <p className="font-semibold text-gray-700 text-[15px]">Módulo en desarrollo</p>
        <p className="text-gray-400 text-[13px] mt-1">
          Conectá la tabla <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">proyectos</code> en Supabase para activar este módulo.
        </p>
      </div>
    </div>
  )
}
