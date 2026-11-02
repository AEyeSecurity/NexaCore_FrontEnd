import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'
import UsuariosSelector from './UsuariosSelector'

const inputCls = [
  'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none',
  'bg-white transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10',
].join(' ')
const border = { borderColor: 'rgba(15,110,86,0.25)' }

const btnPrimary =
  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm transition-colors cursor-pointer disabled:opacity-60'
const btnSecondary =
  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors cursor-pointer'

const mismosIds = (a, b) => a.length === b.length && a.every(id => b.includes(id))

// Crear / editar un tablero: nombre, descripción y miembros (selector con
// búsqueda sobre el mismo listado de usuarios activos que ya usa el
// selector de responsables de ModalTarea — api.getUsuariosAsignables()).
//
// Administradores: al crear, el backend agrega a quien crea como miembro
// administrador (no hace falta elegirse). Al editar, `miembros` es la lista
// completa: los que siguen conservan su privilegio y los nuevos entran como
// miembros comunes. Promover o quitar administradores se hace desde
// VerMiembrosModal, no desde acá.
export default function TableroModal({ open, tablero, user, onClose, onSaved }) {
  const isEdit = !!tablero

  const [nombre, setNombre]           = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [miembros, setMiembros]       = useState([]) // array de usuario_id

  const [usuarios, setUsuarios]           = useState([])
  const [loadingUsers, setLoadingUsers]   = useState(true)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState(null)

  useEffect(() => {
    if (!open) return
    setNombre(tablero?.nombre ?? '')
    setDescripcion(tablero?.descripcion ?? '')
    setMiembros((tablero?.miembros ?? []).map(m => m.id))
    setError(null)
    setLoadingUsers(true)
    document.body.style.overflow = 'hidden'
    api.getUsuariosAsignables()
      .then(r => setUsuarios(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
    return () => { document.body.style.overflow = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tablero])

  const miembrosOriginales = (tablero?.miembros ?? []).map(m => m.id)
  const adminIds = (tablero?.miembros ?? []).filter(m => m.es_admin).map(m => m.id)
  // Administradores activos que siguen marcados: si queda uno solo, no se puede
  // desmarcar (el backend respondería 409 por dejar el tablero sin administradores).
  const adminsActivosMarcados = (tablero?.miembros ?? [])
    .filter(m => m.es_admin && m.estado === 'Activo' && miembros.includes(m.id))
    .map(m => m.id)
  const creadorId = !isEdit ? user?.id : null

  const bloqueados = isEdit
    ? (adminsActivosMarcados.length === 1 ? adminsActivosMarcados : [])
    : (creadorId ? [creadorId] : [])
  const seleccionados = creadorId ? [...new Set([...miembros, creadorId])] : miembros
  const etiqueta = (u) => {
    if (u.id === creadorId) return 'Vos · administrador'
    if (isEdit && adminIds.includes(u.id)) return 'Administrador'
    return null
  }

  const toggleMiembro = (id) => {
    setMiembros(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre del tablero es obligatorio.'); return }
    setSaving(true)
    setError(null)
    try {
      const body = { nombre: nombre.trim(), descripcion: descripcion.trim() || null }
      let res
      if (isEdit) {
        // La lista completa solo se manda si cambió: así guardar nombre o
        // descripción no pisa altas/bajas que un administrador haya hecho mientras
        // el modal estaba abierto.
        if (!mismosIds(miembros, miembrosOriginales)) body.miembros = miembros
        res = await api.editarTablero(tablero.id, body)
      } else {
        // El creador lo agrega el backend como administrador; no se manda duplicado.
        res = await api.crearTablero({ ...body, miembros: miembros.filter(id => id !== creadorId) })
      }
      onSaved(res)
    } catch (err) {
      setError(err.message || 'No se pudo guardar el tablero.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md fade-in flex flex-col" style={{ maxHeight: '88vh' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <h3 className="font-serif font-semibold text-gray-900 text-[16px]">
            {isEdit ? 'Editar tablero' : 'Nuevo tablero'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="px-6 py-5 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Mantenimiento" className={inputCls} style={border} />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Descripción</label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Opcional" rows={2} className={inputCls + ' resize-none'} style={border} />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Miembros {seleccionados.length > 0 && <span className="text-gray-400 font-normal">({seleccionados.length} seleccionados)</span>}
              </label>
              <UsuariosSelector
                usuarios={usuarios}
                loading={loadingUsers}
                seleccionados={seleccionados}
                onToggle={toggleMiembro}
                bloqueados={bloqueados}
                etiqueta={etiqueta}
              />
              <p className="flex items-start gap-1.5 text-[11.5px] text-gray-500 mt-2 leading-snug">
                <ShieldCheck size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#0F6E56' }} />
                {isEdit
                  ? 'Los nuevos miembros entran como miembros comunes. Los administradores se gestionan desde "Miembros del tablero".'
                  : 'Quedás como administrador del tablero. El resto entra como miembro común.'}
              </p>
              {isEdit && (
                <p className="flex items-start gap-1.5 text-[11.5px] text-gray-500 mt-1.5 leading-snug">
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                  Las tareas de las personas que quites conservan su responsable, pero esas personas dejarán de ver el tablero.
                </p>
              )}
            </div>

            {error && (
              <p className="flex items-start gap-1.5 text-[12.5px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <button type="button" onClick={onClose} className={btnSecondary + ' flex-1 justify-center'} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: saving ? '#6BA897' : '#0F6E56' }}>
              <Save size={14} /> {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear tablero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}
