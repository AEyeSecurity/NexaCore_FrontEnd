import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Users, ShieldCheck, ShieldPlus, ShieldMinus, ShieldAlert, UserPlus, UserMinus, RefreshCw,
} from 'lucide-react'
import { api } from '../../lib/api'
import UsuariosSelector from './UsuariosSelector'

const btnPrimary =
  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm transition-colors cursor-pointer disabled:opacity-60'
const btnSecondary =
  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors cursor-pointer'
const btnIcon =
  'p-1.5 rounded-lg text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

// Mensaje para errores de las operaciones de miembros. El backend ya manda un
// texto claro; esto es el respaldo por código de estado.
const MENSAJE_POR_STATUS = {
  400: 'Datos inválidos: el usuario no existe o no está activo.',
  403: 'No tenés permisos para gestionar los miembros de este tablero.',
  404: 'El tablero o el miembro ya no existe.',
  409: 'La operación no es compatible con las reglas de administradores del tablero.',
}
export const mensajeErrorMiembros = (err) =>
  err?.message && err.message !== 'Error en la solicitud'
    ? err.message
    : (MENSAJE_POR_STATUS[err?.status] || 'No se pudo completar la operación.')

const esActivo = (m) => m.estado === 'Activo'

// Miembros de un tablero, estilo grupos de WhatsApp. Lo ven todos los que ven
// el tablero; las acciones dependen solo de `tablero.permisos` (que calcula el
// backend): el rol jerárquico no habilita nada acá. El backend vuelve a
// verificar cada operación.
//   - puede_agregar_miembros:     agregar integrantes (entran como miembros comunes)
//   - puede_administrar_permisos: promover / quitar administrador
//   - puede_quitar_miembros:      quitar integrantes
//   - puede_regularizar_admin:    designar un administrador en un tablero sin
//                                 administradores activos (mando alto)
// Cada operación exitosa llama a onActualizado(tableroActualizado); los errores
// van a onError(err) — el módulo muestra el aviso y refresca los tableros.
export default function VerMiembrosModal({ tablero, user, onClose, onActualizado, onError }) {
  const miembros = tablero?.miembros ?? []
  const permisos = tablero?.permisos ?? {}

  const [panel, setPanel]                 = useState(null) // null | 'agregar' | 'regularizar'
  const [usuarios, setUsuarios]           = useState([])
  const [loadingUsers, setLoadingUsers]   = useState(false)
  const [seleccion, setSeleccion]         = useState([])
  const [confirmacion, setConfirmacion]   = useState(null) // { titulo, mensaje, label, peligro, accion }
  const [procesando, setProcesando]       = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Si el tablero se actualiza y ya no corresponde el panel abierto (ej. se
  // regularizó, o el usuario perdió el permiso), se cierra solo.
  useEffect(() => {
    if (panel === 'agregar' && !permisos.puede_agregar_miembros) setPanel(null)
    if (panel === 'regularizar' && !permisos.puede_regularizar_admin) setPanel(null)
  }, [panel, permisos.puede_agregar_miembros, permisos.puede_regularizar_admin])

  const abrirPanel = (nombre) => {
    setPanel(nombre)
    setSeleccion([])
    if (usuarios.length) return
    setLoadingUsers(true)
    api.getUsuariosAsignables()
      .then(r => setUsuarios(r.data ?? []))
      .catch(err => onError(err))
      .finally(() => setLoadingUsers(false))
  }

  const ejecutar = async (operacion, exito) => {
    setProcesando(true)
    try {
      const res = await operacion()
      setConfirmacion(null)
      onActualizado(res, exito)
      return true
    } catch (err) {
      setConfirmacion(null)
      onError(err)
      return false
    } finally {
      setProcesando(false)
    }
  }

  // Un tablero que tiene administradores activos no puede quedarse sin ninguno:
  // se evita desde la UI el caso obvio (el último), el backend responde 409 igual.
  const adminsActivos = miembros.filter(m => m.es_admin && esActivo(m))
  const esUltimoAdmin = (m) => m.es_admin && esActivo(m) && adminsActivos.length === 1
  const nombreDe = (m) => (m.id === user?.id ? 'vos' : m.nombre)

  const pedirCambioAdmin = (m) => {
    const promover = !m.es_admin
    setConfirmacion({
      titulo:  promover ? '¿Hacer administrador?' : '¿Quitar privilegios de administrador?',
      mensaje: promover
        ? `${m.nombre} va a poder agregar y quitar integrantes y gestionar administradores de este tablero.`
        : m.id === user?.id
          ? 'Vas a dejar de administrar este tablero. Vas a seguir siendo miembro.'
          : `${m.nombre} va a seguir siendo miembro, pero ya no va a poder administrar el tablero.`,
      label:   promover ? 'Hacer administrador' : 'Quitar privilegios',
      peligro: !promover,
      accion:  () => ejecutar(
        () => api.cambiarAdminTablero(tablero.id, m.id, promover),
        promover ? `${m.nombre} ahora es administrador.` : `${m.nombre} ya no es administrador.`,
      ),
    })
  }

  const pedirQuitar = (m) => {
    const yo = m.id === user?.id
    setConfirmacion({
      titulo:  yo ? '¿Salir del tablero?' : '¿Quitar del tablero?',
      mensaje: yo
        ? 'Vas a dejar de ser miembro de este tablero. Tus tareas conservan su responsable.'
        : `${m.nombre} va a dejar de ver el tablero. Sus tareas conservan el responsable.`,
      label:   yo ? 'Salir' : 'Quitar',
      peligro: true,
      accion:  () => ejecutar(
        () => api.quitarMiembroTablero(tablero.id, m.id),
        yo ? 'Saliste del tablero.' : `${m.nombre} fue quitado del tablero.`,
      ),
    })
  }

  const agregarSeleccionados = async () => {
    if (!seleccion.length) return
    const ok = await ejecutar(
      () => api.agregarMiembrosTablero(tablero.id, seleccion),
      seleccion.length === 1 ? 'Integrante agregado.' : `${seleccion.length} integrantes agregados.`,
    )
    if (ok) { setSeleccion([]); setPanel(null) }
  }

  const pedirRegularizar = () => {
    const u = usuarios.find(x => x.id === seleccion[0])
    if (!u) return
    setConfirmacion({
      titulo:  '¿Designar administrador?',
      mensaje: `${u.nombre} va a quedar como administrador de "${tablero.nombre}"${miembros.some(m => m.id === u.id) ? '' : ' y se lo agrega como miembro'}. Desde ahí, los integrantes los gestionan sus administradores.`,
      label:   'Designar',
      peligro: false,
      accion:  async () => {
        const ok = await ejecutar(
          () => api.regularizarAdminTablero(tablero.id, u.id),
          `${u.nombre} es ahora administrador del tablero.`,
        )
        if (ok) { setSeleccion([]); setPanel(null) }
      },
    })
  }

  const idsMiembros = miembros.map(m => m.id)
  const candidatosAgregar = usuarios.filter(u => !idsMiembros.includes(u.id) && esActivo(u))
  const candidatosRegularizar = usuarios.filter(esActivo)
  const toggleSeleccion = (id) => setSeleccion(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const puedeGestionar = permisos.puede_administrar_permisos || permisos.puede_quitar_miembros

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md fade-in flex flex-col" style={{ maxHeight: '85vh' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Users size={15} style={{ color: '#0F6E56' }} className="shrink-0" />
              <h3 className="font-serif font-semibold text-gray-900 text-[16px]">Miembros del tablero</h3>
            </div>
            <p className="text-[11.5px] text-gray-400 mt-0.5 truncate">{tablero?.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* ── Tablero sin administrador activo ── */}
          {permisos.puede_regularizar_admin && panel !== 'regularizar' && (
            <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 border"
              style={{ background: '#FFFBEB', borderColor: 'rgba(217,119,6,0.3)' }}>
              <ShieldAlert size={14} className="mt-0.5 shrink-0" style={{ color: '#D97706' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium" style={{ color: '#92400E' }}>Este tablero no tiene un administrador activo.</p>
                <button type="button" onClick={() => abrirPanel('regularizar')}
                  className="text-[12px] font-semibold mt-0.5 hover:underline" style={{ color: '#B45309' }}>
                  Designar administrador
                </button>
              </div>
            </div>
          )}

          {panel === 'regularizar' && (
            <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
              <p className="text-[12px] font-medium text-gray-600 mb-2">Designar administrador</p>
              <UsuariosSelector
                usuarios={candidatosRegularizar}
                loading={loadingUsers}
                seleccionados={seleccion}
                onToggle={(id) => setSeleccion([id])}
                multiple={false}
                etiqueta={(u) => (idsMiembros.includes(u.id) ? 'Miembro' : null)}
                vacio="No hay usuarios activos."
                maxHeight={160}
              />
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setPanel(null)} className={btnSecondary + ' flex-1 justify-center py-2'}
                  style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                  Cancelar
                </button>
                <button type="button" onClick={pedirRegularizar} disabled={!seleccion.length || procesando}
                  className={btnPrimary + ' flex-1 justify-center py-2'} style={{ background: '#0F6E56' }}>
                  <ShieldPlus size={14} /> Designar
                </button>
              </div>
            </div>
          )}

          {/* ── Agregar integrantes ── */}
          {permisos.puede_agregar_miembros && (
            panel === 'agregar' ? (
              <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
                <p className="text-[12px] font-medium text-gray-600 mb-2">
                  Agregar integrantes {seleccion.length > 0 && <span className="text-gray-400 font-normal">({seleccion.length} seleccionados)</span>}
                </p>
                <UsuariosSelector
                  usuarios={candidatosAgregar}
                  loading={loadingUsers}
                  seleccionados={seleccion}
                  onToggle={toggleSeleccion}
                  vacio="Todos los usuarios activos ya son miembros."
                  maxHeight={160}
                />
                <p className="text-[11.5px] text-gray-400 mt-2">Entran como miembros comunes.</p>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => setPanel(null)} className={btnSecondary + ' flex-1 justify-center py-2'}
                    style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={agregarSeleccionados} disabled={!seleccion.length || procesando}
                    className={btnPrimary + ' flex-1 justify-center py-2'} style={{ background: '#0F6E56' }}>
                    {procesando ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />} Agregar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => abrirPanel('agregar')}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12.5px] font-medium border border-dashed transition-colors hover:bg-gray-50"
                style={{ borderColor: 'rgba(15,110,86,0.35)', color: '#0F6E56' }}>
                <UserPlus size={14} /> Agregar integrantes
              </button>
            )
          )}

          {/* ── Listado ── */}
          {miembros.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-6">Este tablero todavía no tiene miembros.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: '#f0f1f0' }}>
              {miembros.map(m => {
                const ultimo = esUltimoAdmin(m)
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: esActivo(m) ? '#0F6E56' : '#9CA3AF' }}>
                      {(m.nombre || '?').trim().slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-gray-800 truncate">
                        {m.nombre}
                        {m.id === user?.id && <span className="text-gray-400 font-normal"> (vos)</span>}
                        {!esActivo(m) && <span className="text-gray-400 font-normal"> · inactivo</span>}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        {m.es_admin ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold flex-shrink-0"
                            style={{ background: '#E1F5EE', color: '#0F6E56' }}>
                            <ShieldCheck size={10} /> Administrador
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 flex-shrink-0">Miembro</span>
                        )}
                        {m.email && <span className="text-[11.5px] text-gray-400 truncate">· {m.email}</span>}
                      </div>
                    </div>
                    {puedeGestionar && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {permisos.puede_administrar_permisos && (m.es_admin ? (
                          <button type="button" onClick={() => pedirCambioAdmin(m)} disabled={ultimo || procesando}
                            className={btnIcon + ' hover:text-amber-600 hover:bg-amber-50'}
                            title={ultimo ? 'Es el único administrador activo: promové a otro miembro antes' : `Quitar privilegios de administrador a ${nombreDe(m)}`}
                            aria-label="Quitar privilegios de administrador">
                            <ShieldMinus size={15} />
                          </button>
                        ) : (
                          <button type="button" onClick={() => pedirCambioAdmin(m)} disabled={!esActivo(m) || procesando}
                            className={btnIcon + ' hover:text-teal-700 hover:bg-teal-50'}
                            title={esActivo(m) ? `Hacer administrador a ${nombreDe(m)}` : 'Un usuario inactivo no puede ser administrador'}
                            aria-label="Hacer administrador">
                            <ShieldPlus size={15} />
                          </button>
                        ))}
                        {permisos.puede_quitar_miembros && (
                          <button type="button" onClick={() => pedirQuitar(m)} disabled={ultimo || procesando}
                            className={btnIcon + ' hover:text-red-500 hover:bg-red-50'}
                            title={ultimo ? 'Es el único administrador activo: promové a otro miembro antes' : m.id === user?.id ? 'Salir del tablero' : `Quitar a ${m.nombre} del tablero`}
                            aria-label="Quitar del tablero">
                            <UserMinus size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <p className="text-[11.5px] text-gray-400 text-center">
            {miembros.length} {miembros.length === 1 ? 'miembro' : 'miembros'}
            {' · '}
            {adminsActivos.length} {adminsActivos.length === 1 ? 'administrador' : 'administradores'}
          </p>
        </div>

        {/* ── Confirmación ── */}
        {confirmacion && (
          <div className="absolute inset-0 rounded-2xl flex items-center justify-center p-6" style={{ background: 'rgba(255,255,255,0.92)' }}>
            <div className="bg-white rounded-2xl shadow-xl border p-5 w-full max-w-xs fade-in" style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
              <h4 className="font-serif font-semibold text-gray-900 mb-2 text-[15px]">{confirmacion.titulo}</h4>
              <p className="text-[12.5px] text-gray-500 mb-4 leading-relaxed">{confirmacion.mensaje}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmacion(null)} disabled={procesando}
                  className={btnSecondary + ' flex-1 justify-center py-2'} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                  Cancelar
                </button>
                <button type="button" onClick={confirmacion.accion} disabled={procesando}
                  className={btnPrimary + ' flex-1 justify-center py-2'}
                  style={{ background: confirmacion.peligro ? '#EF4444' : '#0F6E56' }}>
                  {procesando && <RefreshCw size={13} className="animate-spin" />} {confirmacion.label}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  , document.body)
}
