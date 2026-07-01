import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, ClipboardList, Clock, CheckCircle2, AlertTriangle, Lock, Search } from 'lucide-react'
import { protocolosApi } from './protocolosApi'
import { CATEGORIAS, CATEGORIA_LABELS, CATEGORIA_BADGE } from './constants'
import ProtocoloModal from './ProtocoloModal'

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

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProtocolosList({ onOpenProtocolo }) {
  const [items, setItems] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState('todos')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (categoria !== 'todos') params.categoria = categoria
      if (search.trim()) params.search = search.trim()
      const data = await protocolosApi.listar(params)
      setItems(data.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [categoria, search])

  const cargarMetricas = useCallback(async () => {
    try {
      const data = await protocolosApi.metricas()
      setMetrics(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { cargarMetricas() }, [cargarMetricas])

  const refrescarTodo = () => { cargar(); cargarMetricas() }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[20px] font-semibold text-gray-900">Protocolos</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Checklists estáticas para procesos repetitivos — pruebas, instalaciones, inicializaciones y RR.HH.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refrescarTodo}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm"
            style={{ background: '#0F6E56' }}>
            <Plus size={15} /> Nuevo protocolo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Protocolos activos" value={metrics?.totalProtocolosActivos ?? '—'} icon={ClipboardList} color="#6A52D6" />
        <StatCard label="Pruebas registradas" value={metrics?.totalPruebas ?? '—'} icon={Clock} color="#E08A2C" />
        <StatCard label="Sin incumplimientos" value={metrics?.pruebasSinIncumplimientos ?? '—'} icon={CheckCircle2} color="#1D9E75" />
        <StatCard label="Con incumplimientos" value={metrics?.pruebasConIncumplimientos ?? '—'} icon={AlertTriangle} color="#E24B4A" />
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {[{ value: 'todos', label: 'Todos' }, ...CATEGORIAS].map(c => (
            <button key={c.value} onClick={() => setCategoria(c.value)}
              className="px-4 py-2 rounded-xl text-[12.5px] font-semibold border transition-all"
              style={categoria === c.value
                ? { background: '#04342C', color: '#fff', borderColor: '#04342C' }
                : { borderColor: 'rgba(15,110,86,0.2)', color: '#6b7280', background: 'white' }}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar protocolo..."
            className="pl-9 pr-3 py-2 rounded-xl border text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
            style={{ borderColor: 'rgba(15,110,86,0.25)' }} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-[13.5px] bg-white rounded-xl border" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {items.map(p => (
            <button key={p.id} onClick={() => onOpenProtocolo(p.id)}
              className="text-left bg-white rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-[2px]"
              style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
              <div className="flex items-start justify-between mb-3 gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
                  style={CATEGORIA_BADGE[p.categoria]}>
                  {CATEGORIA_LABELS[p.categoria] ?? p.categoria}
                </span>
                {p.acceso && (
                  <span className="flex items-center gap-1 text-[11.5px] text-gray-400 flex-shrink-0">
                    <Lock size={12} /> {p.acceso}
                  </span>
                )}
              </div>
              <h3 className="font-serif font-semibold text-gray-900 text-[15.5px] mb-1.5">{p.nombre}</h3>
              <p className="text-[13px] text-gray-500 mb-4" style={{ minHeight: '38px' }}>
                {p.descripcion || 'Sin descripción.'}
              </p>
              <div className="flex items-center justify-between border-t pt-3 text-[12px] text-gray-400" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
                <span>Creado {formatFecha(p.created_at)}</span>
                <span className="font-medium" style={{ color: '#0F6E56' }}>Ver detalle →</span>
              </div>
            </button>
          ))}

          <button onClick={() => setShowModal(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-gray-400 hover:text-[#0F6E56] transition-colors"
            style={{ borderColor: 'rgba(15,110,86,0.25)', minHeight: '178px' }}>
            <Plus size={22} />
            <span className="text-[13px] font-medium">Nuevo protocolo</span>
          </button>

          {items.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 text-[13.5px]">
              No hay protocolos {categoria !== 'todos' ? 'en esta categoría' : 'registrados'} todavía.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ProtocoloModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); refrescarTodo() }}
        />
      )}
    </div>
  )
}
