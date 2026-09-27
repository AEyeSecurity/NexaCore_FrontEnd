import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RefreshCw, AlertCircle, Activity, CheckCircle2, AlertTriangle, XCircle, Gauge } from 'lucide-react'
import { api } from '../../lib/api'
import IndicadorCard from './IndicadorCard'
import IndicadorDetailDrawer from './IndicadorDetailDrawer'
import IndicadorWizard from './IndicadorWizard'
import { useHistoricos, invalidateIndicador } from './indicadoresData'
import { PERSPECTIVAS, ESTADO_META, mensajeErrorHttp } from './constants'

// Ventana del histórico en la vista general y el detalle: 12 meses (default
// del backend). Alcanza para ver tendencia en todas las frecuencias (12
// meses, 4 trimestres, 2 semestres, 1 año).
const PERIODO_VISTA = '12m'

function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="bg-white rounded-xl p-5 border shadow-sm" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '18' }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-[12.5px] text-gray-500">{label}</p>
      <p className="text-[22px] font-semibold text-gray-900">
        {loading ? <span className="text-gray-300">···</span> : value}
      </p>
    </div>
  )
}

export default function IndicadoresModule() {
  const [indicadores, setIndicadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [perspectiva, setPerspectiva] = useState('todas')
  const [selectedId, setSelectedId] = useState(null)
  const [wizard, setWizard] = useState(null) // null | { id: null } (crear) | { id } (editar)

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const showToast = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Listado de activos (default del backend). El filtro por perspectiva se
  // aplica en memoria para no volver a pedir datos al cambiar de pestaña.
  const cargar = useCallback(() => {
    setLoading(true)
    setError(null)
    return api.getIndicadores()
      .then(res => setIndicadores(Array.isArray(res?.data) ? res.data : []))
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const ids = useMemo(() => indicadores.map(i => i.id), [indicadores])
  const { byId: historicos, retry } = useHistoricos(ids, PERIODO_VISTA)

  // Resumen a partir del estado que calculó el backend para el último
  // período con datos de cada indicador (ultimoValido.estado).
  const resumen = useMemo(() => {
    const estados = ids.map(id => historicos[id])
    const pendiente = estados.some(s => !s || s.loading)
    const contar = (e) => estados.filter(s => s?.data?.ultimoValido?.estado === e).length
    return {
      pendiente,
      enObjetivo: contar('EN_OBJETIVO'),
      enRiesgo: contar('EN_RIESGO'),
      criticos: contar('CRITICO'),
    }
  }, [ids, historicos])

  const visibles = perspectiva === 'todas'
    ? indicadores
    : indicadores.filter(i => i.perspectiva === perspectiva)

  const selected = indicadores.find(i => i.id === selectedId) || null

  const handleSaved = (saved) => {
    const id = saved?.id || wizard?.id
    if (id) invalidateIndicador(id)
    showToast(wizard?.id ? 'Indicador actualizado' : 'Indicador creado')
    setWizard(null)
    cargar()
  }

  const handleDeleted = () => {
    invalidateIndicador(selectedId)
    setSelectedId(null)
    showToast('Indicador eliminado')
    cargar()
  }

  const refrescar = () => {
    ids.forEach(id => invalidateIndicador(id))
    cargar()
  }

  return (
    <div className="fade-in space-y-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-[21px] font-semibold text-gray-900">Indicadores</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Seguimiento de indicadores clave de desempeño</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refrescar} title="Actualizar"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setWizard({ id: null })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm"
            style={{ background: '#0F6E56' }}>
            <Plus size={15} /> Nuevo indicador
          </button>
        </div>
      </div>

      {/* ── Error de listado ───────────────────────────────── */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error.status === 403 ? 'No tenés permisos para acceder al módulo Indicadores.' : mensajeErrorHttp(error, 'accion')}
          </div>
          <button onClick={cargar} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-red-700 hover:underline flex-shrink-0">
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* ── Resumen ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Indicadores activos" value={indicadores.length} icon={Activity} color="#0F6E56" loading={loading} />
            <StatCard label="En objetivo" value={resumen.enObjetivo} icon={CheckCircle2} color={ESTADO_META.EN_OBJETIVO.chart} loading={loading || resumen.pendiente} />
            <StatCard label="En riesgo" value={resumen.enRiesgo} icon={AlertTriangle} color={ESTADO_META.EN_RIESGO.chart} loading={loading || resumen.pendiente} />
            <StatCard label="Críticos" value={resumen.criticos} icon={XCircle} color={ESTADO_META.CRITICO.chart} loading={loading || resumen.pendiente} />
          </div>

          {/* ── Filtros por perspectiva ─────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {[{ value: 'todas', label: 'Todas' }, ...PERSPECTIVAS].map(p => (
              <button key={p.value} onClick={() => setPerspectiva(p.value)}
                className="px-4 py-2 rounded-xl text-[12.5px] font-semibold border transition-all"
                style={perspectiva === p.value
                  ? { background: '#04342C', color: '#fff', borderColor: '#04342C' }
                  : { borderColor: 'rgba(15,110,86,0.2)', color: '#6b7280', background: 'white' }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* ── Grilla ──────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-[13.5px] bg-white rounded-xl border" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
              <RefreshCw size={18} className="animate-spin mr-2" /> Cargando indicadores...
            </div>
          ) : indicadores.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-2xl border" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#E1F5EE' }}>
                <Gauge size={24} style={{ color: '#0F6E56' }} />
              </div>
              <p className="font-serif text-[16px] font-semibold text-gray-800 mb-1">No hay indicadores creados.</p>
              <p className="text-[13px] text-gray-500 mb-5">Definí el primer indicador para empezar a medir el desempeño.</p>
              <button onClick={() => setWizard({ id: null })}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white"
                style={{ background: '#0F6E56' }}>
                <Plus size={14} /> Nuevo indicador
              </button>
            </div>
          ) : visibles.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[13.5px] text-gray-400 bg-white rounded-2xl border" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
              No hay indicadores en esta perspectiva.
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {visibles.map(ind => (
                <IndicadorCard
                  key={ind.id}
                  indicador={ind}
                  historico={historicos[ind.id]}
                  onClick={() => setSelectedId(ind.id)}
                  onRetry={() => retry(ind.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selected && !wizard && (
        <IndicadorDetailDrawer
          indicador={selected}
          historico={historicos[selected.id]}
          onClose={() => setSelectedId(null)}
          onRetry={() => retry(selected.id)}
          onEdit={() => setWizard({ id: selected.id })}
          onDeleted={handleDeleted}
        />
      )}

      {wizard && (
        <IndicadorWizard
          indicadorId={wizard.id}
          onClose={() => setWizard(null)}
          onSaved={handleSaved}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-lg z-[60]"
          style={{ background: '#04342C' }}>
          <CheckCircle2 size={15} style={{ color: '#5DCAA5' }} />
          {toast}
        </div>
      )}
    </div>
  )
}
