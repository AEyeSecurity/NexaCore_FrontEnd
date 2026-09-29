import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, GripVertical, RefreshCw, AlertCircle, Save } from 'lucide-react'
import { api } from '../../lib/api'

// tipo_base es un enum fijo del schema (no hay endpoint para listarlo) —
// se hardcodea acá con etiquetas legibles, tal cual lo pide el asistente
// de creación de etapas.
const TIPO_BASE_OPTIONS = [
  { value: 'pendiente',  label: 'Abierta · Pendiente'  },
  { value: 'en_curso',   label: 'Abierta · En curso'   },
  { value: 'completada', label: 'Cerrada · Completada' },
  { value: 'cancelada',  label: 'Cerrada · Cancelada'  },
]

const DEFAULT_COLOR = '#0F6E56'

const inputCls = [
  'w-full border rounded-lg px-2.5 py-2 text-[12.5px] outline-none',
  'bg-white transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10',
].join(' ')

const btnPrimary =
  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-[12.5px] font-medium shadow-sm transition-colors cursor-pointer disabled:opacity-60'

const btnSecondary =
  'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12.5px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors cursor-pointer'

const sameEtapa = (a, b) =>
  a.nombre === b.nombre && a.color === b.color && a.tipo_base === b.tipo_base

// ── EtapaRow ──────────────────────────────────────────────────────────────
function EtapaRow({
  etapa, original, onChange, onSave, onDelete, saving, deleteError,
  isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const dirty = !sameEtapa(etapa, original)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className="rounded-xl border p-3 space-y-2 transition-all"
      style={{
        borderColor: isDragOver ? '#0F6E56' : 'rgba(15,110,86,0.15)',
        background:  isDragOver ? 'rgba(15,110,86,0.04)' : '#fff',
        opacity:     isDragging ? 0.4 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <GripVertical size={14} className="text-gray-300 cursor-grab flex-shrink-0" />
        <input
          type="color"
          value={etapa.color}
          onChange={e => onChange({ ...etapa, color: e.target.value })}
          className="w-8 h-8 rounded-lg border cursor-pointer flex-shrink-0"
          style={{ borderColor: 'rgba(15,110,86,0.2)' }}
        />
        <input
          value={etapa.nombre}
          onChange={e => onChange({ ...etapa, nombre: e.target.value })}
          placeholder="Nombre de la etapa"
          className={inputCls + ' flex-1'}
          style={{ borderColor: 'rgba(15,110,86,0.2)' }}
        />
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
          title="Eliminar etapa"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 pl-6">
        <select
          value={etapa.tipo_base}
          onChange={e => onChange({ ...etapa, tipo_base: e.target.value })}
          className={inputCls + ' flex-1'}
          style={{ borderColor: 'rgba(15,110,86,0.2)' }}
        >
          {TIPO_BASE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {dirty && (
          <button
            onClick={onSave}
            disabled={saving || !etapa.nombre.trim()}
            className={btnPrimary}
            style={{ background: '#0F6E56' }}
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            Guardar
          </button>
        )}
      </div>

      {deleteError && (
        <p className="pl-6 text-[11.5px] text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
          {deleteError}
        </p>
      )}
    </div>
  )
}

// ── EtapasConfigModal ─────────────────────────────────────────────────────
export default function EtapasConfigModal({ open, etapas, onClose, onChanged }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [rowErrors, setRowErrors] = useState({})

  const [dragIndex, setDragIndex]       = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const [creating, setCreating] = useState(false)
  const [newEtapa, setNewEtapa] = useState({ nombre: '', color: DEFAULT_COLOR, tipo_base: 'pendiente' })
  const [createError, setCreateError] = useState(null)

  useEffect(() => {
    if (open) {
      setItems(etapas.map(e => ({ ...e })))
      setError(null)
      setRowErrors({})
      setCreating(false)
      setNewEtapa({ nombre: '', color: DEFAULT_COLOR, tipo_base: 'pendiente' })
      setCreateError(null)
    }
    // Se sincroniza solo al abrir — mientras está abierto, `items` es la
    // copia editable y se refresca desde el servidor tras cada mutación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const originalById = Object.fromEntries(etapas.map(e => [e.id, e]))

  const refresh = () => {
    setLoading(true)
    setError(null)
    return api.getEtapas()
      .then(res => {
        const data = Array.isArray(res?.data) ? res.data : []
        setItems(data.map(e => ({ ...e })))
        onChanged()
      })
      .catch(err => setError(err.message || 'No se pudieron recargar las etapas'))
      .finally(() => setLoading(false))
  }

  const setItemAt = (id, next) => {
    setItems(prev => prev.map(it => (it.id === id ? next : it)))
  }

  const handleSaveRow = (etapa) => {
    setSavingId(etapa.id)
    setRowErrors(prev => ({ ...prev, [etapa.id]: null }))
    api.editarEtapa(etapa.id, {
      nombre: etapa.nombre.trim(),
      color: etapa.color,
      tipo_base: etapa.tipo_base,
    })
      .then(() => refresh())
      .catch(err => setRowErrors(prev => ({ ...prev, [etapa.id]: err.message || 'No se pudo guardar' })))
      .finally(() => setSavingId(null))
  }

  const handleDeleteRow = (etapa) => {
    if (!confirm(`¿Eliminar la etapa "${etapa.nombre}"?`)) return
    setRowErrors(prev => ({ ...prev, [etapa.id]: null }))
    api.eliminarEtapa(etapa.id)
      .then(() => refresh())
      .catch(err => {
        // 409: la etapa tiene tareas asignadas — se muestra el mensaje
        // específico del backend en la fila, no como error genérico.
        if (err.status === 409) {
          setRowErrors(prev => ({ ...prev, [etapa.id]: err.message }))
        } else {
          setRowErrors(prev => ({ ...prev, [etapa.id]: err.message || 'No se pudo eliminar la etapa' }))
        }
      })
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newEtapa.nombre.trim()) { setCreateError('El nombre es obligatorio'); return }
    setLoading(true)
    setCreateError(null)
    api.crearEtapa({
      nombre: newEtapa.nombre.trim(),
      color: newEtapa.color,
      tipo_base: newEtapa.tipo_base,
    })
      .then(() => {
        setNewEtapa({ nombre: '', color: DEFAULT_COLOR, tipo_base: 'pendiente' })
        setCreating(false)
        return refresh()
      })
      .catch(err => setCreateError(err.message || 'No se pudo crear la etapa'))
      .finally(() => setLoading(false))
  }

  // ── Reordenar por drag-and-drop (mismo patrón que Dashboard.jsx) ──────
  const handleDragStart = (index) => (e) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
  const handleDragOverRow = (index) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndex !== null && dragIndex !== index && dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }
  const handleDrop = (index) => (e) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      const etapa = items[dragIndex]
      setDragIndex(null)
      setDragOverIndex(null)
      setLoading(true)
      api.editarEtapa(etapa.id, { posicion: index })
        .then(() => refresh())
        .catch(err => setError(err.message || 'No se pudo reordenar'))
        .finally(() => setLoading(false))
      return
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg fade-in flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div>
            <h3 className="font-serif font-semibold text-gray-900 text-[16px]">Configurar etapas</h3>
            <p className="text-[11.5px] text-gray-400 mt-0.5">Columnas del tablero — nombre, color, orden y tipo</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-[12.5px] text-red-700">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          {items.map((etapa, index) => (
            <EtapaRow
              key={etapa.id}
              etapa={etapa}
              original={originalById[etapa.id] || etapa}
              onChange={(next) => setItemAt(etapa.id, next)}
              onSave={() => handleSaveRow(etapa)}
              onDelete={() => handleDeleteRow(etapa)}
              saving={savingId === etapa.id}
              deleteError={rowErrors[etapa.id]}
              isDragging={dragIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOverRow(index)}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
            />
          ))}

          {items.length === 0 && !loading && (
            <p className="text-[12.5px] text-gray-400 text-center py-6">Todavía no hay etapas configuradas.</p>
          )}

          {/* Alta de etapa nueva */}
          {creating ? (
            <form onSubmit={handleCreate} className="rounded-xl border p-3 space-y-2"
              style={{ borderColor: 'rgba(15,110,86,0.25)', background: '#F7FAF9' }}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newEtapa.color}
                  onChange={e => setNewEtapa(f => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded-lg border cursor-pointer flex-shrink-0"
                  style={{ borderColor: 'rgba(15,110,86,0.2)' }}
                />
                <input
                  autoFocus
                  value={newEtapa.nombre}
                  onChange={e => setNewEtapa(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre de la etapa"
                  className={inputCls + ' flex-1'}
                  style={{ borderColor: 'rgba(15,110,86,0.2)' }}
                />
              </div>
              <select
                value={newEtapa.tipo_base}
                onChange={e => setNewEtapa(f => ({ ...f, tipo_base: e.target.value }))}
                className={inputCls}
                style={{ borderColor: 'rgba(15,110,86,0.2)' }}
              >
                {TIPO_BASE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {createError && <p className="text-[11.5px] text-red-600">{createError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setCreating(false); setCreateError(null) }}
                  className={btnSecondary + ' flex-1 justify-center'} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className={btnPrimary + ' flex-1 justify-center'} style={{ background: '#0F6E56' }}>
                  <Plus size={13} /> Crear etapa
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-medium transition-colors"
              style={{ color: '#0F6E56', border: '1.5px dashed rgba(15,110,86,0.35)' }}>
              <Plus size={14} /> Agregar etapa
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex-shrink-0 flex items-center justify-between"
          style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <p className="text-[11px] text-gray-400">
            {loading ? <span className="flex items-center gap-1.5"><RefreshCw size={11} className="animate-spin" /> Sincronizando…</span>
              : 'Arrastrá las filas para reordenar las columnas del tablero.'}
          </p>
          <button onClick={onClose} className={btnSecondary} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  , document.body)
}
