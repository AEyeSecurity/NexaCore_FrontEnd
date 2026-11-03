import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Edit2, MessageSquare, Play, RefreshCw, Send, Square, Trash2, X } from 'lucide-react'
import { api } from '../../lib/api'
import { formatoDuracion, formatoReloj, tareaFinalParaTemporizador, mensajeActualizaciones, referenciaTemporizador, segundosVisibles } from './actualizaciones'

const boton = 'p-2 rounded-lg hover:bg-teal-50 text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed'
const campo = 'w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 resize-none'
const fecha = valor => new Date(valor).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

export default function ActualizacionesPanel({ tarea, tableroId, version, onClose }) {
  const [eventos, setEventos] = useState([])
  const [referencia, setReferencia] = useState(null)
  const [segundos, setSegundos] = useState(0)
  const [finalizada, setFinalizada] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [contenido, setContenido] = useState('')
  const [edicion, setEdicion] = useState(null)
  const [borrando, setBorrando] = useState(null)
  const [ultimaDuracion, setUltimaDuracion] = useState(null)
  const vigente = useRef(true)
  const secuencia = useRef(0)
  const bloqueo = useRef(false)
  const dialogo = useRef(null)
  const cerrar = useRef(onClose)
  cerrar.current = onClose

  const sincronizar = useCallback(async () => {
    const pedido = ++secuencia.current
    setCargando(true)
    const resultados = await Promise.allSettled([
      api.getActualizacionesTarea(tarea.id),
      api.getTemporizadorTarea(tarea.id),
      // Sin vista ni filtros: incluye el estado actual de tareas antiguas y reabiertas.
      api.getTareas({ tablero_id: tableroId }),
    ])
    if (!vigente.current || pedido !== secuencia.current) return
    // Si solo falta la clasificación actual, el backend puede validar el inicio.
    // Errores de acceso sí bloquean las acciones, también en esta tercera consulta.
    const fallo = resultados.find((r, i) => r.status === 'rejected'
      && (i < 2 || [401, 403, 404].includes(r.reason?.status)))
    setListo(!fallo)
    if (fallo) {
      setError(mensajeActualizaciones(fallo.reason))
      if ([401, 403, 404].includes(fallo.reason?.status)) {
        setEventos([]); setReferencia(null)
      }
    }
    if (resultados[0].status === 'fulfilled' && ![401, 403, 404].includes(fallo?.reason?.status)) setEventos(resultados[0].value.data)
    if (resultados[1].status === 'fulfilled' && ![401, 403, 404].includes(fallo?.reason?.status)) setReferencia(referenciaTemporizador(resultados[1].value))
    setFinalizada(resultados[2].status === 'fulfilled'
      ? tareaFinalParaTemporizador(resultados[2].value.data?.find(t => t.id === tarea.id))
      : null)
    setCargando(false)
  }, [tarea.id, tableroId])

  useEffect(() => {
    vigente.current = true
    sincronizar()
    // Foco y visibilitychange suelen llegar juntos: una sola sincronización.
    let regreso
    const volver = () => {
      clearTimeout(regreso)
      if (document.visibilityState === 'visible' && !bloqueo.current) {
        regreso = setTimeout(() => { setError(''); sincronizar() }, 150)
      }
    }
    document.addEventListener('visibilitychange', volver)
    window.addEventListener('focus', volver)
    return () => {
      clearTimeout(regreso)
      vigente.current = false; secuencia.current++
      document.removeEventListener('visibilitychange', volver)
      window.removeEventListener('focus', volver)
    }
  }, [sincronizar, version])

  useEffect(() => {
    const actualizar = () => setSegundos(segundosVisibles(referencia))
    actualizar()
    if (!referencia) return
    const intervalo = setInterval(actualizar, 1000)
    return () => clearInterval(intervalo)
  }, [referencia])

  useEffect(() => {
    const anterior = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogo.current.focus()
    const teclado = e => {
      if (e.key === 'Escape') cerrar.current()
      if (e.key !== 'Tab') return
      const items = [...dialogo.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      const primero = items[0], ultimo = items.at(-1)
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === dialogo.current)) { e.preventDefault(); ultimo?.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus() }
    }
    document.addEventListener('keydown', teclado)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', teclado); anterior?.focus() }
  }, [])

  async function ejecutar(nombre, accion, despues) {
    if (bloqueo.current) return
    bloqueo.current = true
    secuencia.current++ // Invalida lecturas anteriores a esta escritura.
    setOcupado(nombre); setError('')
    try {
      const resultado = await accion()
      if (!vigente.current) return
      despues?.(resultado)
      await sincronizar()
    } catch (e) {
      if (!vigente.current) return
      setError(mensajeActualizaciones(e))
      // Una respuesta perdida también puede ocultar una escritura confirmada.
      await sincronizar()
    } finally {
      bloqueo.current = false
      if (vigente.current) setOcupado('')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end sm:p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(10,82,64,0.22)' }} onClick={onClose} />
      <section ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="actualizaciones-titulo"
        className="relative w-full sm:max-w-xl h-full bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden outline-none">
        <header className="p-4 sm:p-5 border-b border-teal-900/10 shrink-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h2 id="actualizaciones-titulo" className="font-sans text-xl font-semibold text-gray-900">Actualizaciones</h2>
              <p className="text-sm text-gray-500 mt-1 break-words">{tarea.titulo}</p>
            </div>
            <div className={`rounded-xl px-2 py-1 shrink-0 ${referencia ? 'bg-teal-50 text-teal-800' : 'bg-gray-50 text-gray-600'}`}>
              <div className="flex items-center">
                <span className="font-sans text-sm tabular-nums" aria-label="Tiempo transcurrido">{formatoReloj(segundos)}</span>
                <button className={boton} disabled={!listo || cargando || !!ocupado || (!referencia && finalizada === true)}
                  title={referencia ? 'Detener temporizador' : finalizada ? 'La tarea está finalizada' : 'Iniciar temporizador'}
                  aria-label={referencia ? 'Detener temporizador' : 'Iniciar temporizador'}
                  onClick={() => ejecutar('temporizador', () => referencia ? api.detenerTemporizadorTarea(tarea.id) : api.iniciarTemporizadorTarea(tarea.id), r => {
                    if (r.tipo === 'registro_tiempo') { setUltimaDuracion(r.duracion_segundos); setReferencia(null) }
                    else { setUltimaDuracion(null); setReferencia(referenciaTemporizador({ activo: r })) }
                  })}>
                  {ocupado === 'temporizador' ? <RefreshCw size={16} className="animate-spin" /> : referencia ? <Square size={16} /> : <Play size={16} />}
                </button>
              </div>
              <p className="text-[10px] pb-1">{referencia ? 'Tu sesión en curso' : finalizada ? 'Tarea finalizada' : 'Tu temporizador'}</p>
            </div>
            <button onClick={onClose} className={boton} aria-label="Cerrar actualizaciones"><X size={18} /></button>
          </div>
          {ultimaDuracion !== null && <p role="status" className="text-xs text-teal-700 mt-2">Sesión guardada: {formatoDuracion(ultimaDuracion)}.</p>}
        </header>
        <div className="px-4 py-2 flex items-center justify-between border-b text-xs text-gray-400 shrink-0">
          <span>{cargando ? 'Actualizando…' : `${eventos.length} actualizaciones · más antiguas primero`}</span>
          <button className={boton} aria-label="Actualizar contenido" disabled={cargando || !!ocupado} onClick={() => { setError(''); sincronizar() }}><RefreshCw size={14} className={cargando ? 'animate-spin' : ''} /></button>
        </div>
        {error && <div role="alert" className="m-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm shrink-0">{error}</div>}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4" aria-busy={cargando}>
          {!eventos.length && <div className="py-12 text-center text-gray-400"><MessageSquare className="mx-auto mb-3" size={28} /><p className="text-sm">{cargando ? 'Cargando actualizaciones…' : error ? 'No se pudieron cargar las actualizaciones.' : 'Todavía no hay actualizaciones.'}</p></div>}
          {eventos.map(evento => <article key={`${evento.tipo}:${evento.id}`} className={`rounded-xl p-3 sm:p-4 border ${evento.tipo === 'registro_tiempo' ? 'bg-teal-50/70 border-teal-100' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-start gap-2">
              {evento.tipo === 'registro_tiempo' && <Clock size={16} className="text-teal-700 shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-700 break-words">{evento.usuario?.nombre || 'Usuario eliminado'}</p><p className="text-xs text-gray-400 mt-0.5">{fecha(evento.fecha)}{evento.editado && ' · editado'}</p></div>
              {evento.tipo === 'comentario' && <div className="flex shrink-0">
                {evento.permisos?.puede_editar && <button className={boton} disabled={!!ocupado || !listo} aria-label="Editar comentario" onClick={() => { setEdicion({ id: evento.id, contenido: evento.contenido }); setBorrando(null) }}><Edit2 size={14} /></button>}
                {evento.permisos?.puede_eliminar && <button className={boton} disabled={!!ocupado || !listo} aria-label="Eliminar comentario" onClick={() => { setBorrando(evento.id); setEdicion(null) }}><Trash2 size={14} /></button>}
              </div>}
            </div>
            {evento.tipo === 'registro_tiempo' ? <p className="text-sm text-teal-800 mt-3">Trabajó por <strong>{formatoDuracion(evento.duracion_segundos)}</strong>.</p>
              : edicion?.id === evento.id ? <form className="mt-3" onSubmit={e => { e.preventDefault(); if (edicion.contenido.trim()) ejecutar('editar', () => api.editarComentarioTarea(tarea.id, evento.id, edicion.contenido.trim()), () => setEdicion(null)) }}>
                <textarea aria-label="Editar contenido" className={campo} rows={3} maxLength={2000} value={edicion.contenido} disabled={!!ocupado} onChange={e => setEdicion({ ...edicion, contenido: e.target.value })} />
                <div className="flex justify-end text-sm"><button type="button" className={boton} disabled={!!ocupado} onClick={() => setEdicion(null)}>Cancelar</button><button className={boton} disabled={!!ocupado || !listo || !edicion.contenido.trim()}>{ocupado === 'editar' ? 'Guardando…' : 'Guardar'}</button></div>
              </form> : <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap break-words">{evento.contenido}</p>}
            {borrando === evento.id && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"><p>¿Eliminar este comentario? No se puede recuperar.</p><div className="flex justify-end gap-3 mt-2"><button disabled={!!ocupado} onClick={() => setBorrando(null)}>Cancelar</button><button className="font-semibold disabled:opacity-40" disabled={!!ocupado || !listo} onClick={() => ejecutar('eliminar', () => api.eliminarComentarioTarea(tarea.id, evento.id), () => setBorrando(null))}>{ocupado === 'eliminar' ? 'Eliminando…' : 'Eliminar'}</button></div></div>}
          </article>)}
        </div>
        <form className="p-4 sm:p-5 border-t border-teal-900/10 shrink-0 bg-gray-50/50" onSubmit={e => { e.preventDefault(); if (contenido.trim()) ejecutar('enviar', () => api.crearComentarioTarea(tarea.id, contenido.trim()), () => setContenido('')) }}>
          <label htmlFor="nuevo-comentario" className="sr-only">Escribir un comentario</label>
          <textarea id="nuevo-comentario" className={campo} placeholder="Escribí una actualización…" rows={2} maxLength={2000} value={contenido} disabled={!!ocupado || !listo} onChange={e => setContenido(e.target.value)} />
          <div className="flex items-center justify-between mt-2"><span className="text-xs text-gray-400">{contenido.length}/2000</span><button disabled={!contenido.trim() || !!ocupado || !listo} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-[#0F6E56] text-white hover:bg-[#085541] disabled:opacity-40"><Send size={14} />{ocupado === 'enviar' ? 'Enviando…' : 'Enviar'}</button></div>
        </form>
      </section>
    </div>, document.body,
  )
}
