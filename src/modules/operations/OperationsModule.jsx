import {
  Briefcase, Plus, CheckCircle, Clock, AlertCircle, XCircle,
  Search, RefreshCw, Trash2, X, User, Calendar, Edit2, AlertTriangle,
  Send, ThumbsUp, ThumbsDown, Inbox, History,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'Pendiente',  label: 'Pendiente',  color: '#EF9F27', bg: '#FFFBEB', icon: AlertCircle },
  { id: 'En Proceso', label: 'En Proceso', color: '#0EA5E9', bg: '#F0F9FF', icon: Clock       },
  { id: 'Completada', label: 'Completada', color: '#1D9E75', bg: '#ECFDF5', icon: CheckCircle  },
  { id: 'Cancelada',  label: 'Cancelada',  color: '#9CA3AF', bg: '#F9FAFB', icon: XCircle      },
]

const PRIORIDADES  = ['Alta', 'Media', 'Baja']
const ESTADOS      = ['Pendiente', 'En Proceso', 'Completada', 'Cancelada']
const ROLES_ADMIN  = ['Superadmin', 'Dirección']

const PRIORIDAD_CFG = {
  Alta:  { background: '#FEE2E2', color: '#991B1B' },
  Media: { background: '#FEF3C7', color: '#92400E' },
  Baja:  { background: '#DCFCE7', color: '#166534' },
}

const PRIORIDAD_ORDEN = { Alta: 1, Media: 2, Baja: 3 }

const PROPUESTA_CFG = {
  pendiente: { background: '#FEF3C7', color: '#92400E', label: 'Pendiente' },
  aprobada:  { background: '#DCFCE7', color: '#166534', label: 'Aprobada'  },
  rechazada: { background: '#FEE2E2', color: '#991B1B', label: 'Rechazada' },
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inputCls = [
  'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none',
  'bg-white transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10',
].join(' ')

const btnPrimary =
  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm transition-colors cursor-pointer'

const btnSecondary =
  'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors cursor-pointer'

// ── Helpers ───────────────────────────────────────────────────────────────────
const esAdmin = (user) => ROLES_ADMIN.includes(user?.role)

function fmtFecha(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

function isVencida(fechaLimite) {
  if (!fechaLimite) return false
  const limite = new Date(fechaLimite + 'T00:00:00')
  const hoy    = new Date(new Date().toDateString())
  return limite < hoy
}

function diasVencida(fechaLimite) {
  const limite = new Date(fechaLimite + 'T00:00:00')
  const hoy    = new Date(new Date().toDateString())
  const dias   = Math.round((hoy - limite) / 86400000)
  if (dias === 1) return 'hace 1 día'
  return `hace ${dias} días`
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, onClick, active }) {
  return (
    <div
      className="bg-white rounded-xl p-5 border shadow-sm transition-all"
      style={{
        borderColor: active ? color : 'rgba(15,110,86,0.1)',
        boxShadow:   active ? `0 0 0 2px ${color}40` : undefined,
        cursor:      onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: color + '18' }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-[12.5px] text-gray-500">{label}</p>
      <p className="text-[22px] font-semibold text-gray-900">{value}</p>
      {active && (
        <p className="text-[10.5px] font-medium mt-1" style={{ color }}>Filtro activo</p>
      )}
    </div>
  )
}

// ── ModalHistorial ────────────────────────────────────────────────────────────
// Muestra el historial de cambios de una tarea en un modal de solo lectura.
// Los registros provienen de la tabla tarea_historial, ordenados del más reciente al más antiguo.
function ModalHistorial({ tarea, onClose }) {
  const [historial, setHistorial] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    api.getHistorialTarea(tarea.id)
      .then(r => setHistorial(r.data))
      .catch(e => setError(e.message || 'Error al cargar el historial'))
      .finally(() => setLoading(false))
    return () => { document.body.style.overflow = '' }
  }, [tarea.id])

  // Etiquetas legibles para cada tipo de acción registrada en tarea_historial.accion
  const ACCION_LABELS = {
    creacion:             'creó la tarea',
    aprobacion_propuesta: 'aprobó la propuesta',
    rechazo_propuesta:    'rechazó la propuesta',
  }

  // Etiquetas legibles para cada campo de la tabla tareas que se audita
  const CAMPO_LABELS = {
    titulo:       'título',
    descripcion:  'descripción',
    estado:       'estado',
    prioridad:    'prioridad',
    asignado_a:   'responsable',
    fecha_limite: 'fecha límite',
  }

  // Formatea fecha ISO "YYYY-MM-DD" a "DD/MM/AAAA" para mostrar en el historial
  function fmtFechaCorta(valor) {
    if (!valor) return '(vacío)'
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return new Date(valor + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    }
    return valor
  }

  // Formatea el timestamp del registro para mostrarlo en la línea de historial
  function fmtFechaHora(ts) {
    return new Date(ts).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // Construye la descripción textual de cada registro según su acción y campo
  function renderDescripcion(h) {
    if (h.accion === 'actualizacion') {
      const campo    = CAMPO_LABELS[h.campo_modificado] || h.campo_modificado
      const anterior = h.campo_modificado === 'fecha_limite'
        ? fmtFechaCorta(h.valor_anterior)
        : (h.valor_anterior || '(vacío)')
      const nuevo = h.campo_modificado === 'fecha_limite'
        ? fmtFechaCorta(h.valor_nuevo)
        : (h.valor_nuevo || '(vacío)')
      return <>cambió {campo} de <span className="font-medium text-gray-800">"{anterior}"</span> a <span className="font-medium text-gray-800">"{nuevo}"</span></>
    }
    return ACCION_LABELS[h.accion] || h.accion
  }

  // Color del punto de la línea de tiempo según el tipo de acción
  function colorAccion(accion) {
    if (accion === 'creacion')             return '#1D9E75'  // verde
    if (accion === 'rechazo_propuesta')    return '#DC2626'  // rojo
    if (accion === 'aprobacion_propuesta') return '#6366F1'  // violeta
    return '#0EA5E9'                                         // azul (actualizacion)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg fade-in flex flex-col"
        style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <History size={15} style={{ color: '#0F6E56' }} className="shrink-0" />
              <h3 className="font-serif font-semibold text-gray-900 text-[16px]">Historial de cambios</h3>
            </div>
            <p className="text-[11.5px] text-gray-400 mt-0.5 truncate">{tarea.titulo}</p>
          </div>
          <button type="button" onClick={onClose}
            className="ml-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Contenido scrolleable — solo lectura, sin botones de edición ni eliminación */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-[13.5px]">
              <RefreshCw size={16} className="animate-spin mr-2" /> Cargando…
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-700">{error}</div>
          ) : historial.length === 0 ? (
            <div className="text-center py-10">
              <History size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="text-[13.5px] font-medium text-gray-500">Sin registros</p>
              <p className="text-[12px] text-gray-400 mt-1">Todavía no hay cambios registrados para esta tarea.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {historial.map((h, i) => (
                <div key={h.id} className="flex gap-3">
                  {/* Línea de tiempo */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-1">
                    <div className="w-2 h-2 rounded-full"
                      style={{ background: colorAccion(h.accion) }} />
                    {i < historial.length - 1 && (
                      <div className="w-px flex-1 my-1" style={{ background: 'rgba(15,110,86,0.12)', minHeight: '20px' }} />
                    )}
                  </div>
                  {/* Descripción del cambio */}
                  <div className="pb-4 flex-1 min-w-0">
                    <p className="text-[12.5px] text-gray-600 leading-snug">
                      <span className="font-semibold text-gray-900">{h.usuario_nombre}</span>
                      {' '}{renderDescripcion(h)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtFechaHora(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con contador */}
        {!loading && !error && historial.length > 0 && (
          <div className="px-6 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <p className="text-[11.5px] text-gray-400 text-center">
              {historial.length} {historial.length === 1 ? 'registro' : 'registros'} · ordenados del más reciente al más antiguo
            </p>
          </div>
        )}
      </div>
    </div>
  , document.body)
}

// ── TareaCard ─────────────────────────────────────────────────────────────────
function TareaCard({ tarea, onEditar, onEliminar, onCambiarEstado, onHistorial }) {
  const [cambiando, setCambiando] = useState(false)
  const prioCfg = PRIORIDAD_CFG[tarea.prioridad] || { background: '#F3F4F6', color: '#4B5563' }
  const vencida =
    tarea.estado !== 'Completada' &&
    tarea.estado !== 'Cancelada'  &&
    isVencida(tarea.fecha_limite)

  const handleEstado = async (e) => {
    const nuevo = e.target.value
    if (nuevo === tarea.estado) return
    setCambiando(true)
    try { await onCambiarEstado(tarea.id, nuevo) }
    finally { setCambiando(false) }
  }

  return (
    <div
      className="rounded-xl border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow"
      style={{
        background:  vencida ? '#FFF5F5' : '#ffffff',
        borderColor: vencida ? 'rgba(220,38,38,0.35)' : 'rgba(15,110,86,0.12)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-800 text-[13.5px] leading-snug flex-1">{tarea.titulo}</p>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onHistorial(tarea)}
            className="p-1 rounded-lg text-gray-300 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Historial">
            <History size={12} />
          </button>
          <button onClick={() => onEditar(tarea)}
            className="p-1 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Editar">
            <Edit2 size={12} />
          </button>
          <button onClick={() => onEliminar(tarea)}
            className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors" title="Eliminar">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {tarea.descripcion && (
        <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">{tarea.descripcion}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {tarea.prioridad && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium" style={prioCfg}>
            {tarea.prioridad}
          </span>
        )}
        {vencida && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
            Vencida
          </span>
        )}
      </div>

      <div className="space-y-1">
        {tarea.asignado_a && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
            <User size={11} className="shrink-0" />
            <span className="truncate">{tarea.asignado_a}</span>
          </div>
        )}
        {tarea.fecha_limite && (
          <div className="flex items-center gap-1.5 text-[11.5px]"
            style={{ color: vencida ? '#DC2626' : '#6B7280' }}>
            <Calendar size={11} className="shrink-0" />
            <span>{fmtFecha(tarea.fecha_limite)}</span>
            {vencida && <span className="font-medium">· {diasVencida(tarea.fecha_limite)}</span>}
          </div>
        )}
      </div>

      <select
        value={tarea.estado}
        onChange={handleEstado}
        disabled={cambiando}
        className="w-full border rounded-lg px-2 py-1.5 text-[12px] text-gray-600 outline-none bg-gray-50 disabled:opacity-60 transition-colors"
        style={{ borderColor: 'rgba(15,110,86,0.2)' }}
      >
        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
    </div>
  )
}

// ── ModalTarea ────────────────────────────────────────────────────────────────
function ModalTarea({ tarea, onClose, onSaved, user }) {
  const adminUser = esAdmin(user)

  const [modo, setModo] = useState(() => {
    if (tarea) return tarea.tipo || 'asignacion'
    return 'asignacion'
  })
  const [form, setForm] = useState({
    titulo:       tarea?.titulo       || '',
    descripcion:  tarea?.descripcion  || '',
    estado:       tarea?.estado       || 'Pendiente',
    prioridad:    tarea?.prioridad    || 'Media',
    asignado_a:   tarea?.asignado_a   || '',
    fecha_limite: tarea?.fecha_limite || '',
  })
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)
  const [usuarios,     setUsuarios]     = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Para usuarios comunes: el modo se deriva automáticamente del responsable elegido
  const modoEfectivo = adminUser
    ? modo
    : (!form.asignado_a || form.asignado_a === user?.name) ? 'asignacion' : 'propuesta'

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    api.getUsuariosAsignables()
      .then(r => setUsuarios(r.data))
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) { setError('El título es obligatorio'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        tipo: modoEfectivo,
        // Datos de auditoría: el backend los usa para tarea_historial y los descarta antes de guardar en tareas
        usuario_nombre: user?.name  || 'Sistema',
        usuario_id:     user?.email || null,
        ...(modoEfectivo === 'propuesta'
          ? { propuesto_por: user?.name, estado_propuesta: 'pendiente' }
          : { propuesto_por: null, estado_propuesta: null }
        ),
      }
      if (tarea) await api.editarTarea(tarea.id, payload)
      else       await api.crearTarea(payload)
      onSaved()
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const border     = { borderColor: 'rgba(15,110,86,0.25)' }
  const esPropuesta = modoEfectivo === 'propuesta'
  const tituloModal = tarea
    ? 'Editar tarea'
    : esPropuesta ? 'Nueva propuesta' : 'Nueva tarea'
  const labelSubmit = saving
    ? <><RefreshCw size={14} className="animate-spin" /> Guardando…</>
    : esPropuesta ? <><Send size={13} /> Enviar propuesta</> : tarea ? 'Guardar cambios' : 'Crear tarea'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <h3 className="font-serif font-semibold text-gray-900 text-[16px]">{tituloModal}</h3>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">

            {/* Toggle asignar/proponer — solo para admins creando una tarea nueva */}
            {!tarea && adminUser && (
              <div className="flex rounded-xl overflow-hidden border"
                style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                <button type="button" onClick={() => setModo('asignacion')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors"
                  style={modo === 'asignacion'
                    ? { background: '#0F6E56', color: '#fff' }
                    : { background: '#fff', color: '#6B7280' }}>
                  <Briefcase size={13} /> Asignar directamente
                </button>
                <button type="button" onClick={() => setModo('propuesta')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors"
                  style={modo === 'propuesta'
                    ? { background: '#6366F1', color: '#fff' }
                    : { background: '#fff', color: '#6B7280' }}>
                  <Send size={13} /> Proponer
                </button>
              </div>
            )}

            {/* Banner informativo para usuarios comunes cuando es propuesta */}
            {!adminUser && !tarea && esPropuesta && (
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 border"
                style={{ background: '#EEF2FF', borderColor: 'rgba(99,102,241,0.3)' }}>
                <Send size={13} className="mt-0.5 shrink-0" style={{ color: '#6366F1' }} />
                <p className="text-[12px]" style={{ color: '#4338CA' }}>
                  Estás asignando a otra persona. Esta tarea se enviará como
                  <strong> propuesta</strong> para aprobación de Dirección.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Título *</label>
              <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
                placeholder="Ej: Revisar stock de materiales"
                className={inputCls} style={border} />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Descripción</label>
              <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="Detalle opcional..." rows={3}
                className={inputCls + ' resize-none'} style={border} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Estado solo visible en modo asignación */}
              {!esPropuesta && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Estado</label>
                  <select value={form.estado} onChange={e => set('estado', e.target.value)}
                    className={inputCls} style={border}>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              )}
              <div className={esPropuesta ? 'col-span-2' : ''}>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Prioridad</label>
                <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)}
                  className={inputCls} style={border}>
                  {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                  {esPropuesta ? 'Responsable sugerido' : 'Asignado a'}
                </label>
                {loadingUsers ? (
                  <div className={inputCls + ' flex items-center gap-2 text-gray-400'} style={border}>
                    <RefreshCw size={12} className="animate-spin" />
                    <span className="text-[13px]">Cargando…</span>
                  </div>
                ) : usuarios.length === 0 ? (
                  <div className={inputCls + ' text-gray-400 text-[13px]'} style={border}>
                    Sin usuarios disponibles
                  </div>
                ) : (
                  <select value={form.asignado_a} onChange={e => set('asignado_a', e.target.value)}
                    className={inputCls} style={border}>
                    <option value="">Sin asignar</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.nombre}>{u.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Fecha límite</label>
                <input type="date" value={form.fecha_limite} onChange={e => set('fecha_limite', e.target.value)}
                  className={inputCls} style={border} />
              </div>
            </div>

            {error && (
              <p className="text-[12.5px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <button type="button" onClick={onClose}
              className={btnSecondary + ' flex-1 justify-center'}
              style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className={btnPrimary + ' flex-1 justify-center disabled:opacity-60'}
              style={{ background: saving ? '#6BA897' : esPropuesta ? '#6366F1' : '#0F6E56' }}>
              {labelSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}

// ── PropuestaCard ─────────────────────────────────────────────────────────────
function PropuestaCard({ propuesta, canAct, onAprobar, onRechazar }) {
  const prioCfg   = PRIORIDAD_CFG[propuesta.prioridad] || { background: '#F3F4F6', color: '#4B5563' }
  const estadoCfg = PROPUESTA_CFG[propuesta.estado_propuesta] || { background: '#F3F4F6', color: '#4B5563', label: propuesta.estado_propuesta }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3"
      style={{ borderColor: 'rgba(99,102,241,0.2)' }}>

      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-800 text-[13.5px] leading-snug flex-1">{propuesta.titulo}</p>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
          style={estadoCfg}>
          {estadoCfg.label}
        </span>
      </div>

      {propuesta.descripcion && (
        <p className="text-[12px] text-gray-500 line-clamp-2">{propuesta.descripcion}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {propuesta.prioridad && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium" style={prioCfg}>
            {propuesta.prioridad}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
          <Send size={11} className="shrink-0" style={{ color: '#6366F1' }} />
          <span>Propuesto por: <span className="font-medium text-gray-700">{propuesta.propuesto_por}</span></span>
        </div>
        {propuesta.asignado_a && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
            <User size={11} className="shrink-0" />
            <span>Para: <span className="font-medium text-gray-700">{propuesta.asignado_a}</span></span>
          </div>
        )}
        {propuesta.fecha_limite && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
            <Calendar size={11} className="shrink-0" />
            <span>{fmtFecha(propuesta.fecha_limite)}</span>
          </div>
        )}
        <p className="text-[11px] text-gray-400">
          {new Date(propuesta.created_at).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {canAct && propuesta.estado_propuesta === 'pendiente' && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onAprobar(propuesta.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
            style={{ background: '#DCFCE7', color: '#166534' }}>
            <ThumbsUp size={12} /> Aprobar
          </button>
          <button onClick={() => onRechazar(propuesta.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
            style={{ background: '#FEE2E2', color: '#991B1B' }}>
            <ThumbsDown size={12} /> Rechazar
          </button>
        </div>
      )}
    </div>
  )
}

// ── PropuestasView ────────────────────────────────────────────────────────────
function PropuestasView({ user, onKanbanRefresh }) {
  const adminUser = esAdmin(user)
  const [subVista,  setSubVista]  = useState('recibidas')
  const [soloMias,  setSoloMias]  = useState(false)
  const [recibidas, setRecibidas] = useState([])
  const [enviadas,  setEnviadas]  = useState([])
  const [todas,     setTodas]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (adminUser) {
        // Admins: traen todo y dividen client-side (sin superposición)
        const res = await api.getPropuestas()
        setTodas(res.data)
        setRecibidas(res.data.filter(p => p.propuesto_por !== user?.name))
        setEnviadas(res.data.filter(p => p.propuesto_por === user?.name))
      } else {
        // Usuarios comunes: dos llamadas separadas
        const [rRec, rEnv] = await Promise.allSettled([
          api.getPropuestas({ asignado_a:   user?.name }),
          api.getPropuestas({ propuesto_por: user?.name }),
        ])
        if (rRec.status === 'fulfilled') setRecibidas(rRec.value.data)
        if (rEnv.status === 'fulfilled') setEnviadas(rEnv.value.data)
      }
    } catch (e) {
      setError(e?.message || 'Error al cargar propuestas')
    } finally {
      setLoading(false)
    }
  }, [adminUser, user])

  useEffect(() => { cargar() }, [cargar])

  const handleAprobar = async (id) => {
    try {
      await api.aprobarPropuesta(id, { usuario_nombre: user?.name || 'Sistema', usuario_id: user?.email || null })
      cargar()
      onKanbanRefresh()
    } catch (e) { alert(e.message) }
  }
  const handleRechazar = async (id) => {
    try {
      await api.rechazarPropuesta(id, { usuario_nombre: user?.name || 'Sistema', usuario_id: user?.email || null })
      cargar()
    } catch (e) { alert(e.message) }
  }

  // Admins: filtro "Solo las mías" sobre recibidas
  const recibidasVis = adminUser && soloMias
    ? recibidas.filter(p => p.asignado_a === user?.name)
    : recibidas

  const lista    = subVista === 'recibidas' ? recibidasVis
                 : subVista === 'enviadas'  ? enviadas
                 : todas
  const canAct   = subVista === 'recibidas'
  const pendientes = lista.filter(p => p.estado_propuesta === 'pendiente')
  const historial  = lista.filter(p => p.estado_propuesta !== 'pendiente')

  const badgeRec   = recibidas.filter(p => p.estado_propuesta === 'pendiente').length
  const badgeEnv   = enviadas.filter(p => p.estado_propuesta === 'pendiente').length
  const badgeFlujo = todas.filter(p => p.estado_propuesta === 'pendiente').length

  return (
    <div className="space-y-5">

      {/* Sub-tabs + controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-white rounded-xl p-1 border w-fit"
          style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          {[
            { id: 'recibidas', label: 'Recibidas',          badge: badgeRec,   adminOnly: false },
            { id: 'enviadas',  label: 'Enviadas',            badge: badgeEnv,   adminOnly: false },
            { id: 'flujo',     label: 'Flujo de propuestas', badge: badgeFlujo, adminOnly: true  },
          ].filter(t => !t.adminOnly || adminUser).map(({ id, label, badge }) => {
            const active = subVista === id
            return (
              <button key={id} onClick={() => setSubVista(id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                style={active ? { background: '#0F6E56', color: '#fff' } : { color: '#6b7280' }}>
                {label}
                {badge > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                    style={active
                      ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                      : { background: '#FEF3C7', color: '#92400E' }}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          {adminUser && subVista === 'recibidas' && (
            <button onClick={() => setSoloMias(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors"
              style={soloMias
                ? { background: '#0F6E56', color: '#fff', borderColor: '#0F6E56' }
                : { background: '#fff', color: '#6b7280', borderColor: 'rgba(15,110,86,0.2)' }}>
              <User size={12} /> Solo las mías
            </button>
          )}
          <button onClick={cargar} className={btnSecondary} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-[13.5px]">
          <RefreshCw size={18} className="animate-spin mr-2" /> Cargando…
        </div>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-2xl border shadow-sm p-10 text-center"
          style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: '#EEF2FF' }}>
            <Inbox size={22} style={{ color: '#6366F1' }} />
          </div>
          <p className="font-semibold text-gray-700 text-[14px]">Sin propuestas</p>
          <p className="text-gray-400 text-[12.5px] mt-1">
            {subVista === 'recibidas' ? 'No tenés propuestas recibidas.'
           : subVista === 'enviadas'  ? 'Todavía no enviaste ninguna propuesta.'
           : 'No hay propuestas registradas en el sistema.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendientes.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Pendientes de aprobación ({pendientes.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendientes.map(p => (
                  <PropuestaCard key={p.id} propuesta={p} canAct={canAct}
                    onAprobar={handleAprobar} onRechazar={handleRechazar} />
                ))}
              </div>
            </div>
          )}
          {historial.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Historial ({historial.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {historial.map(p => (
                  <PropuestaCard key={p.id} propuesta={p} canAct={false}
                    onAprobar={handleAprobar} onRechazar={handleRechazar} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── OperationsModule ──────────────────────────────────────────────────────────
export default function OperationsModule({ user }) {
  const [tareas,    setTareas]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [propuestasCount, setPropuestasCount] = useState(0)

  const [vista, setVista] = useState('kanban')

  const [search,            setSearch]            = useState('')
  const [filtroPrioridad,   setFiltroPrioridad]   = useState('Todos')
  const [filtroResponsable, setFiltroResponsable] = useState('')
  const [filtroVencidas,    setFiltroVencidas]    = useState(false)
  const [ordenamiento,      setOrdenamiento]      = useState('created_at')

  const [showModal,      setShowModal]      = useState(false)
  const [editTarea,      setEditTarea]      = useState(null)
  const [confirmDelete,  setConfirmDelete]  = useState(null)
  // tarea seleccionada para ver su historial; null = modal cerrado
  const [tareaHistorial, setTareaHistorial] = useState(null)

  const adminUser = esAdmin(user)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rTareas, rPropuestas] = await Promise.allSettled([
        api.getTareas(adminUser ? {} : { asignado_a: user?.name }),
        api.getPropuestas({ asignado_a: user?.name }),
      ])
      if (rTareas.status === 'fulfilled') setTareas(rTareas.value.data)
      else throw rTareas.reason
      if (rPropuestas.status === 'fulfilled') {
        const pendientes = rPropuestas.value.data.filter(p => p.estado_propuesta === 'pendiente').length
        setPropuestasCount(pendientes)
      }
    } catch (e) {
      setError(e?.message || 'No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }, [adminUser, user])

  useEffect(() => { cargar() }, [cargar])

  const handleCambiarEstado = async (id, nuevoEstado) => {
    // Se incluyen datos de auditoría para que el backend registre el cambio en tarea_historial
    await api.editarTarea(id, {
      estado:         nuevoEstado,
      usuario_nombre: user?.name  || 'Sistema',
      usuario_id:     user?.email || null,
    })
    cargar()
  }

  const handleDelete = async (tarea) => {
    try {
      await api.eliminarTarea(tarea.id)
      setConfirmDelete(null)
      cargar()
    } catch (e) { alert(e.message) }
  }

  const abrirNueva  = ()  => { setEditTarea(null); setShowModal(true) }
  const abrirEditar = (t) => { setEditTarea(t);    setShowModal(true) }
  const cerrarModal = ()  => { setShowModal(false); setEditTarea(null) }

  const tareasFiltradas = tareas.filter(t => {
    const q = search.toLowerCase()
    if (q && !t.titulo?.toLowerCase().includes(q) && !t.descripcion?.toLowerCase().includes(q)) return false
    if (filtroPrioridad !== 'Todos' && t.prioridad !== filtroPrioridad) return false
    if (filtroResponsable && !t.asignado_a?.toLowerCase().includes(filtroResponsable.toLowerCase())) return false
    if (filtroVencidas && !(t.estado !== 'Completada' && t.estado !== 'Cancelada' && isVencida(t.fecha_limite))) return false
    return true
  })

  const limpiarFiltros = () => {
    setSearch(''); setFiltroPrioridad('Todos'); setFiltroResponsable(''); setFiltroVencidas(false)
  }

  const hayFiltros = search || filtroPrioridad !== 'Todos' || filtroResponsable || filtroVencidas

  const cantVencidas   = tareas.filter(t =>
    t.estado !== 'Completada' && t.estado !== 'Cancelada' && isVencida(t.fecha_limite)
  ).length
  const metricas = {
    total:       tareas.length,
    pendientes:  tareas.filter(t => t.estado === 'Pendiente').length,
    enProceso:   tareas.filter(t => t.estado === 'En Proceso').length,
    completadas: tareas.filter(t => t.estado === 'Completada').length,
  }

  const tareasOrdenadas = [...tareasFiltradas].sort((a, b) => {
    switch (ordenamiento) {
      case 'prioridad':
        return (PRIORIDAD_ORDEN[a.prioridad] ?? 4) - (PRIORIDAD_ORDEN[b.prioridad] ?? 4)
      case 'fecha_limite':
        if (!a.fecha_limite && !b.fecha_limite) return 0
        if (!a.fecha_limite) return 1
        if (!b.fecha_limite) return -1
        return a.fecha_limite.localeCompare(b.fecha_limite)
      default:
        return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    }
  })

  return (
    <div className="fade-in space-y-6">

      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[20px] font-semibold text-gray-900">Operativo</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Gestión de tareas y procesos internos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar} className={btnSecondary}
            style={{ borderColor: 'rgba(15,110,86,0.2)' }} title="Recargar">
            <RefreshCw size={14} />
          </button>
          <button onClick={abrirNueva} className={btnPrimary} style={{ background: '#0F6E56' }}>
            <Plus size={15} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total tareas" value={metricas?.total      ?? '—'} icon={Briefcase}     color="#6366F1" />
        <StatCard label="Pendientes"   value={metricas?.pendientes  ?? '—'} icon={AlertCircle}   color="#EF9F27" />
        <StatCard label="En proceso"   value={metricas?.enProceso   ?? '—'} icon={Clock}         color="#0EA5E9" />
        <StatCard label="Completadas"  value={metricas?.completadas ?? '—'} icon={CheckCircle}   color="#1D9E75" />
        <StatCard label="Vencidas"     value={loading ? '—' : cantVencidas} icon={AlertTriangle} color="#DC2626"
          onClick={() => setFiltroVencidas(v => !v)} active={filtroVencidas} />
      </div>

      {/* ── Tabs: Tablero / Propuestas ── */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border w-fit"
        style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        {[
          { id: 'kanban',     label: 'Tablero',     icon: Briefcase },
          { id: 'propuestas', label: 'Propuestas',  icon: Send      },
        ].map(({ id, label, icon: Icon }) => {
          const active = vista === id
          return (
            <button key={id} onClick={() => setVista(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
              style={active ? { background: '#0F6E56', color: '#fff' } : { color: '#6b7280' }}>
              <Icon size={14} />
              {label}
              {id === 'propuestas' && propuestasCount > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                  style={active
                    ? { background: 'rgba(255,255,255,0.3)', color: '#fff' }
                    : { background: '#EEF2FF', color: '#6366F1' }}>
                  {propuestasCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Vista: Propuestas ── */}
      {vista === 'propuestas' && (
        <PropuestasView user={user} onKanbanRefresh={cargar} />
      )}

      {/* ── Vista: Tablero Kanban ── */}
      {vista === 'kanban' && (
        <>
          {/* Filtros */}
          <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2"
            style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por título o descripción..."
                  className={inputCls + ' pl-9'} style={{ borderColor: 'rgba(15,110,86,0.2)' }} />
              </div>
              <div className="shrink-0" style={{ width: '208px' }}>
                <select value={ordenamiento} onChange={e => setOrdenamiento(e.target.value)}
                  className={inputCls} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                  <option value="created_at">Más recientes</option>
                  <option value="prioridad">Prioridad (Alta → Baja)</option>
                  <option value="fecha_limite">Fecha límite (próxima)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="shrink-0" style={{ width: '192px' }}>
                <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}
                  className={inputCls} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                  <option value="Todos">Todas las prioridades</option>
                  {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="shrink-0 relative" style={{ width: '176px' }}>
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={filtroResponsable} onChange={e => setFiltroResponsable(e.target.value)}
                  placeholder="Responsable..." className={inputCls + ' pl-9'}
                  style={{ borderColor: 'rgba(15,110,86,0.2)' }} />
              </div>
              {filtroVencidas && (
                <button onClick={() => setFiltroVencidas(false)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-colors shrink-0"
                  style={{ background: '#FEF2F2', borderColor: 'rgba(220,38,38,0.35)', color: '#DC2626' }}>
                  <AlertTriangle size={12} /> Solo vencidas <X size={11} />
                </button>
              )}
              {hayFiltros && (
                <button onClick={limpiarFiltros}
                  className={btnSecondary + ' text-[12px] shrink-0'}
                  style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-red-700">No se pudieron cargar las tareas</p>
                <p className="text-[12px] text-red-500 mt-0.5">
                  {error.includes('relation') || error.includes('does not exist')
                    ? 'La tabla "tareas" no existe en Supabase.'
                    : error}
                </p>
              </div>
            </div>
          )}

          {/* Kanban */}
          {!error && (
            loading ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-[13.5px]">
                <RefreshCw size={18} className="animate-spin mr-2" /> Cargando tareas…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                {COLUMNS.map(col => {
                  const colTareas = tareasOrdenadas.filter(t => t.estado === col.id)
                  return (
                    <div key={col.id} className="rounded-2xl flex flex-col min-h-[120px]"
                      style={{ background: col.bg }}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <col.icon size={15} style={{ color: col.color }} />
                          <span className="text-[13px] font-semibold" style={{ color: col.color }}>
                            {col.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: col.color }}>
                          {colTareas.length}
                        </span>
                      </div>
                      <div className="px-3 pb-3 space-y-3">
                        {colTareas.map(t => (
                          <TareaCard key={t.id} tarea={t}
                            onEditar={abrirEditar}
                            onEliminar={setConfirmDelete}
                            onCambiarEstado={handleCambiarEstado}
                            onHistorial={setTareaHistorial} />
                        ))}
                        {colTareas.length === 0 && (
                          <div className="rounded-xl border border-dashed p-4 text-center"
                            style={{ borderColor: col.color + '50' }}>
                            <p className="text-[12px]" style={{ color: col.color + 'bb' }}>Sin tareas</p>
                          </div>
                        )}
                        {col.id === 'Pendiente' && (
                          <button onClick={abrirNueva}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] transition-colors hover:bg-white/80"
                            style={{ color: col.color, border: `1.5px dashed ${col.color}60` }}>
                            <Plus size={13} /> Nueva tarea
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </>
      )}

      {/* ── Modal crear / editar ── */}
      {showModal && (
        <ModalTarea
          tarea={editTarea}
          user={user}
          onClose={cerrarModal}
          onSaved={() => { cerrarModal(); cargar() }}
        />
      )}

      {/* ── Modal historial de cambios — solo lectura ── */}
      {tareaHistorial && (
        <ModalHistorial
          tarea={tareaHistorial}
          onClose={() => setTareaHistorial(null)}
        />
      )}

      {/* ── Confirmar eliminación ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full fade-in">
            <h3 className="font-serif font-semibold text-gray-900 mb-2 text-[16px]">¿Eliminar tarea?</h3>
            <p className="text-[13px] text-gray-500 mb-5">
              Se eliminará <span className="font-medium text-gray-700">"{confirmDelete.titulo}"</span>.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className={btnSecondary + ' flex-1 justify-center'}
                style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-colors">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
