import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Trash2, RefreshCw, X, Save, Repeat } from 'lucide-react'
import { api } from '../lib/api'
import AppModal from './AppModal'

function fmtARS(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
function fmtUSD(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const ESTADOS = ['activa', 'pausada', 'cancelada']
const ESTADOS_FILTRO = ['Todas', 'activa', 'pausada', 'cancelada']

const ESTADO_CFG = {
  activa:    { label: 'Activa',    bg: '#E1F5EE', color: '#0F6E56' },
  pausada:   { label: 'Pausada',   bg: '#FEF3C7', color: '#92400E' },
  cancelada: { label: 'Cancelada', bg: '#F3F4F6', color: '#4B5563' },
}

const FRECUENCIAS = [
  { val: 'mensual',    label: 'Mensual'    },
  { val: 'trimestral', label: 'Trimestral' },
  { val: 'semestral',  label: 'Semestral'  },
  { val: 'anual',      label: 'Anual'      },
]
const FRECUENCIA_LABEL = Object.fromEntries(FRECUENCIAS.map(f => [f.val, f.label]))

const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

const INICIAL = {
  nombre: '',
  detalle: '',
  proveedor: '',
  monto: '',
  moneda: 'ARS',
  dia_vencimiento: '',
  frecuencia: 'mensual',
  estado: 'activa',
}

// ─── Form ────────────────────────────────────────────────────

function FormSuscripcion({ suscripcion, onClose, onSaved }) {
  const [form, setForm] = useState(suscripcion ? { ...suscripcion } : { ...INICIAL })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.nombre?.trim()) { setError('El nombre es obligatorio.'); return }
    if (form.monto === '' || form.monto === null) { setError('El monto es obligatorio.'); return }
    if (Number(form.monto) < 0) { setError('El monto debe ser mayor o igual a 0.'); return }
    const dia = parseInt(form.dia_vencimiento)
    if (!dia || dia < 1 || dia > 31) { setError('Ingresá un día de vencimiento entre 1 y 31.'); return }

    setLoading(true)
    setError(null)
    try {
      if (suscripcion) {
        await api.editarSuscripcion(suscripcion.id, form)
      } else {
        await api.crearSuscripcion(form)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal onClose={onClose} maxWidth="max-w-md">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <h2 className="font-serif font-semibold text-gray-900 text-[16px]">
          {suscripcion ? 'Editar suscripción' : 'Nueva suscripción'}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Nombre *</label>
          <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)}
            placeholder="Ej: ChatGPT Plus" className={inputCls} style={inputStyle} autoFocus />
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Detalle / Motivo</label>
          <input type="text" value={form.detalle} onChange={e => set('detalle', e.target.value)}
            placeholder="Ej: Plan Plus con acceso a GPT-4" className={inputCls} style={inputStyle} />
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Proveedor</label>
          <input type="text" value={form.proveedor} onChange={e => set('proveedor', e.target.value)}
            placeholder="Ej: OpenAI" className={inputCls} style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Monto *</label>
            <input type="number" value={form.monto} onChange={e => set('monto', e.target.value)}
              placeholder="0.00" min="0" step="0.01" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Moneda</label>
            <div className="flex gap-2 h-[42px]">
              {['ARS', 'USD'].map(m => (
                <button key={m} type="button" onClick={() => set('moneda', m)}
                  className="flex-1 rounded-xl text-[13px] font-medium border transition-all"
                  style={form.moneda === m
                    ? { background: '#0F6E56', color: '#fff', borderColor: 'transparent' }
                    : { borderColor: 'rgba(15,110,86,0.2)', color: '#6b7280', background: 'white' }
                  }>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Día de vencimiento *</label>
            <input type="number" value={form.dia_vencimiento} onChange={e => set('dia_vencimiento', e.target.value)}
              placeholder="Ej: 10" min="1" max="31" step="1" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Frecuencia</label>
            <select value={form.frecuencia} onChange={e => set('frecuencia', e.target.value)}
              className={inputCls} style={inputStyle}>
              {FRECUENCIAS.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Estado</label>
          <div className="flex gap-2">
            {ESTADOS.map(e => (
              <button key={e} type="button" onClick={() => set('estado', e)}
                className="flex-1 py-2 rounded-xl text-[12.5px] font-medium border transition-all"
                style={form.estado === e
                  ? { background: ESTADO_CFG[e].color, color: '#fff', borderColor: 'transparent' }
                  : { borderColor: 'rgba(15,110,86,0.2)', color: '#6b7280', background: 'white' }
                }>
                {ESTADO_CFG[e].label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 rounded-xl text-[13px] text-red-600 bg-red-50">{error}</div>}
      </div>

      <div className="flex-shrink-0 flex gap-2 px-6 py-4 border-t" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <button onClick={onClose}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm transition-colors disabled:opacity-60"
          style={{ background: '#0F6E56' }}>
          <Save size={15} />
          {loading ? 'Guardando...' : suscripcion ? 'Guardar cambios' : 'Crear suscripción'}
        </button>
      </div>
    </AppModal>
  )
}

// ─── Main component ──────────────────────────────────────────

export default function Suscripciones() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todas')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroEstado !== 'Todas') params.estado = filtroEstado
      if (search.trim()) params.search = search.trim()
      const res = await api.getSuscripciones(params)
      setItems(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, search])

  useEffect(() => { cargar() }, [cargar])

  const handleDelete = async (id) => {
    try {
      await api.eliminarSuscripcion(id)
      setConfirmDelete(null)
      cargar()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleCambiarEstado = async (item, nuevoEstado) => {
    try {
      await api.editarSuscripcion(item.id, { ...item, estado: nuevoEstado })
      cargar()
    } catch (e) {
      alert(e.message)
    }
  }

  // Métricas
  const activas = items.filter(s => s.estado === 'activa')
  const totalARS = activas.filter(s => s.moneda === 'ARS').reduce((sum, s) => sum + Number(s.monto), 0)
  const totalUSD = activas.filter(s => s.moneda === 'USD').reduce((sum, s) => sum + Number(s.monto), 0)

  return (
    <div className="fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[20px] font-semibold text-gray-900">Suscripciones</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {items.length} registro{items.length !== 1 ? 's' : ''} · {activas.length} activa{activas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm"
            style={{ background: '#0F6E56' }}>
            <Plus size={15} /> Nueva suscripción
          </button>
        </div>
      </div>

      {/* Métricas */}
      {(totalARS > 0 || totalUSD > 0) && (
        <div className="flex gap-3 flex-wrap">
          {totalARS > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white"
              style={{ borderColor: 'rgba(15,110,86,0.12)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#E1F5EE' }}>
                <Repeat size={15} style={{ color: '#0F6E56' }} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Mensual ARS</p>
                <p className="text-[15px] font-semibold" style={{ color: '#0F6E56' }}>{fmtARS(totalARS)}</p>
              </div>
            </div>
          )}
          {totalUSD > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white"
              style={{ borderColor: 'rgba(15,110,86,0.12)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#DBEAFE' }}>
                <Repeat size={15} style={{ color: '#1E40AF' }} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Mensual USD</p>
                <p className="text-[15px] font-semibold" style={{ color: '#1E40AF' }}>{fmtUSD(totalUSD)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buscador + filtro estado */}
      <div className="bg-white rounded-xl border shadow-sm p-4 flex gap-2 flex-wrap" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, detalle o proveedor..."
            className={inputCls + ' pl-9'}
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ESTADOS_FILTRO.map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className="px-3 py-2 rounded-lg text-[12.5px] font-medium border transition-all"
              style={filtroEstado === e
                ? { background: '#0F6E56', color: '#fff', borderColor: 'transparent' }
                : { borderColor: 'rgba(15,110,86,0.2)', color: '#6b7280', background: 'white' }
              }>
              {e === 'Todas' ? 'Todas' : ESTADO_CFG[e]?.label ?? e}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-[13.5px]">
            <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                  {['Nombre', 'Detalle', 'Proveedor', 'Monto', 'Moneda', 'Día vcto.', 'Frecuencia', 'Estado', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(s => {
                  const cfg = ESTADO_CFG[s.estado] || ESTADO_CFG.cancelada
                  return (
                    <tr key={s.id}
                      className="border-b hover:bg-gray-50/50 transition-colors group"
                      style={{ borderColor: 'rgba(15,110,86,0.06)', opacity: s.estado === 'cancelada' ? 0.6 : 1 }}>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">{s.nombre}</td>
                      <td className="py-3.5 px-4 text-gray-500 max-w-[160px] truncate">{s.detalle || '—'}</td>
                      <td className="py-3.5 px-4 text-gray-500">{s.proveedor || '—'}</td>
                      <td className="py-3.5 px-4 font-semibold" style={{ color: s.estado === 'activa' ? '#0F6E56' : '#6b7280' }}>
                        {s.moneda === 'USD' ? fmtUSD(s.monto) : fmtARS(s.monto)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: s.moneda === 'USD' ? '#DBEAFE' : '#F0FDF4', color: s.moneda === 'USD' ? '#1E40AF' : '#15803D' }}>
                          {s.moneda}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        Día {s.dia_vencimiento}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium"
                          style={{ background: '#F0FDF4', color: '#15803D' }}>
                          {FRECUENCIA_LABEL[s.frecuencia] ?? s.frecuencia}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Cambio rápido de estado */}
                          {s.estado !== 'activa' && (
                            <button
                              onClick={() => handleCambiarEstado(s, 'activa')}
                              className="px-2 py-1 rounded-lg text-[11.5px] font-medium transition-colors"
                              style={{ color: '#0F6E56', background: '#E1F5EE' }}>
                              Activar
                            </button>
                          )}
                          {s.estado === 'activa' && (
                            <button
                              onClick={() => handleCambiarEstado(s, 'pausada')}
                              className="px-2 py-1 rounded-lg text-[11.5px] font-medium transition-colors"
                              style={{ color: '#92400E', background: '#FEF3C7' }}>
                              Pausar
                            </button>
                          )}
                          <button
                            onClick={() => { setEditItem(s); setShowForm(true) }}
                            className="px-2 py-1 rounded-lg text-[11.5px] font-medium text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(s)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: '#E1F5EE' }}>
                        <Repeat size={22} style={{ color: '#0F6E56' }} />
                      </div>
                      <p className="text-gray-400 text-[13.5px]">No hay suscripciones registradas</p>
                      <button onClick={() => { setEditItem(null); setShowForm(true) }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm mt-4 mx-auto"
                        style={{ background: '#0F6E56' }}>
                        <Plus size={15} /> Crear primera suscripción
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <FormSuscripcion
          suscripcion={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); cargar() }}
        />
      )}

      {confirmDelete && (
        <AppModal onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <div className="p-6">
            <h3 className="font-serif font-semibold text-gray-900 mb-2 text-[16px]">¿Eliminar suscripción?</h3>
            <p className="text-[13px] text-gray-500 mb-5">
              Se eliminará{' '}
              <span className="font-medium text-gray-700">"{confirmDelete.nombre}"</span>.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium bg-red-500 hover:bg-red-600 transition-colors">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  )
}
