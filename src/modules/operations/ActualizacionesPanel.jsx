import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, CalendarClock, Clock, Edit2, Info, MessageSquare, Play, RefreshCw, Send, Square, Trash2, X } from 'lucide-react'
import { api } from '../../lib/api'
import {
  esErrorDeAcceso, etiquetaDia, fechaLocal, fmtFechaHora, fmtHora, formatoDuracion, formatoReloj,
  mensajeActualizaciones, rangoRegistro, referenciaTemporizador, segundosVisibles, tareaFinalParaTemporizador,
} from './actualizaciones'
import { MAX_COMENTARIO, desdeContenido, editorVacio, longitudSerializada, serializar } from './menciones'
import ComposerMenciones, { Iniciales, TextoConMenciones } from './ComposerMenciones'
import RegistroTiempoForm, { BOTON_PRIMARIO, BOTON_SECUNDARIO } from './RegistroTiempoForm'

// Panel "Actualizaciones" de una tarea: temporizador, historial (comentarios y
// registros de tiempo, del más antiguo al más reciente) y, abajo, dos
// pestañas: escribir un comentario (con menciones @) o registrar tiempo
// manualmente. Contratos: docs/operativo-actualizaciones.md y
// NexaCore_BackEnd/docs/operativo-actualizaciones-contratos.md (r2).

const FOCO = 'outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-1'
const ICONO = `inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-[#0F6E56] hover:bg-[#E1F5EE] active:bg-[#CBEDE0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent ${FOCO}`
const ENFOCABLES = 'button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
const claveEvento = (e) => `${e.tipo}:${e.id}`
const CERCA_DEL_FINAL_PX = 80

export default function ActualizacionesPanel({
  tarea, tableroId, version, onClose, onTemporizadorCambio, comentarioDestacado = null, avisoInicial = null,
}) {
  const [eventos, setEventos] = useState([])
  const [referencia, setReferencia] = useState(null)
  const [segundos, setSegundos] = useState(0)
  const [finalizada, setFinalizada] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState(avisoInicial ? { tipo: 'info', texto: avisoInicial } : null)
  const [ocupado, setOcupado] = useState('')
  const [borrador, setBorrador] = useState(editorVacio)
  const [edicion, setEdicion] = useState(null)       // { id, estado }
  const [borrando, setBorrando] = useState(null)
  const [pestana, setPestana] = useState('comentario')
  const [correccion, setCorreccion] = useState(null) // registro de tiempo en corrección
  const [avisoCorreccion, setAvisoCorreccion] = useState(null)
  const [focoTiempo, setFocoTiempo] = useState(0) // cada incremento enfoca el primer campo
  const [mencionables, setMencionables] = useState({ status: 'loading', data: [] })
  const [correcciones, setCorrecciones] = useState({}) // registroId → { status, data }
  const [destacado, setDestacado] = useState(null)
  const [hayNuevas, setHayNuevas] = useState(false)

  const vigente = useRef(true)
  const secuencia = useRef(0)
  const bloqueo = useRef(false)
  const dialogo = useRef(null)
  const lista = useRef(null)
  const cerrar = useRef(onClose)
  cerrar.current = onClose
  const avisarTemporizador = useRef(onTemporizadorCambio)
  avisarTemporizador.current = onTemporizadorCambio
  // Scroll: la primera carga va a lo más reciente (o al comentario del enlace).
  const primeraCarga = useRef(true)
  const cercaDelFinal = useRef(true)
  const irAlFinal = useRef(false)
  const objetivo = useRef(comentarioDestacado ? `comentario:${comentarioDestacado}` : null)
  const cantidadPrevia = useRef(0)
  const escapeFormulario = useRef(null)
  const registrarEscape = useCallback((fn) => { escapeFormulario.current = fn }, [])

  // Devuelve los eventos recibidos (o null si fallaron / quedó vieja).
  const sincronizar = useCallback(async () => {
    const pedido = ++secuencia.current
    setCargando(true)
    const resultados = await Promise.allSettled([
      api.getActualizacionesTarea(tarea.id),
      api.getTemporizadorTarea(tarea.id),
      // Sin vista ni filtros: incluye el estado actual de tareas antiguas y reabiertas.
      api.getTareas({ tablero_id: tableroId }),
    ])
    if (!vigente.current || pedido !== secuencia.current) return null
    // Si solo falta la clasificación actual, el backend puede validar el inicio.
    // Errores de acceso sí bloquean las acciones, también en esta tercera consulta.
    const fallo = resultados.find((r, i) => r.status === 'rejected'
      && (i < 2 || [401, 403, 404].includes(r.reason?.status)))
    const sinAcceso = [401, 403, 404].includes(fallo?.reason?.status)
    setListo(!fallo)
    if (fallo) {
      setError(mensajeActualizaciones(fallo.reason))
      // Acceso revocado o tarea eliminada: no se sigue mostrando contenido protegido.
      if (sinAcceso) { setEventos([]); setReferencia(null); setMencionables({ status: 'error', data: [] }) }
    }
    const datos = resultados[0].status === 'fulfilled' && !sinAcceso ? (resultados[0].value.data ?? []) : null
    if (datos) setEventos(datos)
    if (resultados[1].status === 'fulfilled' && !sinAcceso) setReferencia(referenciaTemporizador(resultados[1].value))
    setFinalizada(resultados[2].status === 'fulfilled'
      ? tareaFinalParaTemporizador(resultados[2].value.data?.find(t => t.id === tarea.id))
      : null)
    setCargando(false)
    return datos
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

  // Mencionables: una vez por apertura del panel; se filtran localmente (r2 §3.3).
  // Un fallo no bloquea el panel: el menú lo informa y se puede seguir escribiendo.
  useEffect(() => {
    let activo = true
    api.getMencionablesTarea(tarea.id)
      .then(r => { if (activo) setMencionables({ status: 'success', data: Array.isArray(r?.data) ? r.data : [] }) })
      .catch(() => { if (activo) setMencionables({ status: 'error', data: [] }) })
    return () => { activo = false }
  }, [tarea.id])

  useEffect(() => {
    const actualizar = () => setSegundos(segundosVisibles(referencia))
    actualizar()
    if (!referencia) return
    const intervalo = setInterval(actualizar, 1000)
    return () => clearInterval(intervalo)
  }, [referencia])

  useEffect(() => {
    if (!destacado) return
    const t = setTimeout(() => setDestacado(null), 4000)
    return () => clearTimeout(t)
  }, [destacado])

  // Escape cierra primero lo secundario (menú de menciones —lo resuelve el
  // editor con preventDefault—, confirmaciones, edición, corrección) y recién
  // después el panel.
  const cerrarSecundario = useRef(() => false)
  cerrarSecundario.current = () => {
    if (escapeFormulario.current) { escapeFormulario.current(); return true }
    if (borrando) { setBorrando(null); return true }
    if (edicion) { setEdicion(null); return true }
    if (correccion) { setCorreccion(null); setAvisoCorreccion(null); return true }
    return false
  }

  useEffect(() => {
    const anterior = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogo.current.focus()
    const teclado = e => {
      if (e.defaultPrevented) return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!cerrarSecundario.current()) cerrar.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...dialogo.current.querySelectorAll(ENFOCABLES)].filter(el => el.offsetParent !== null || el === document.activeElement)
      const primero = items[0], ultimo = items.at(-1)
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === dialogo.current)) { e.preventDefault(); ultimo?.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus() }
    }
    document.addEventListener('keydown', teclado)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', teclado); anterior?.focus?.() }
  }, [])

  // ── Scroll del historial ───────────────────────────────────────────────────
  const buscarNodo = (clave) => lista.current?.querySelector(`[data-evento="${CSS.escape(clave)}"]`)
  useLayoutEffect(() => {
    const el = lista.current
    if (!el || cargando) return
    const previa = cantidadPrevia.current
    cantidadPrevia.current = eventos.length
    if (objetivo.current && listo) {
      const nodo = buscarNodo(objetivo.current)
      const clave = objetivo.current
      objetivo.current = null
      primeraCarga.current = false
      if (nodo) {
        nodo.scrollIntoView({ block: 'center' })
        setDestacado(clave)
        return
      }
      if (!avisoInicial) setAviso({ tipo: 'info', texto: 'El comentario del enlace ya no está disponible: puede haber sido eliminado.' })
    }
    if (primeraCarga.current || irAlFinal.current || cercaDelFinal.current) {
      el.scrollTop = el.scrollHeight
      primeraCarga.current = false
      irAlFinal.current = false
      setHayNuevas(false)
    } else if (eventos.length > previa) {
      setHayNuevas(true)
    }
  }, [eventos, cargando, listo, avisoInicial])

  function alDesplazar() {
    const el = lista.current
    cercaDelFinal.current = el.scrollHeight - el.scrollTop - el.clientHeight < CERCA_DEL_FINAL_PX
    if (cercaDelFinal.current) setHayNuevas(false)
  }
  function verMasRecientes() {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
    setHayNuevas(false)
  }
  function destacarYMostrar(clave) {
    const nodo = buscarNodo(clave)
    if (nodo) { nodo.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); setDestacado(clave) }
  }

  // ── Escrituras ─────────────────────────────────────────────────────────────
  // Una escritura a la vez; después se resincroniza (también si falla: una
  // respuesta perdida puede ocultar una escritura confirmada). Devuelve
  // { ok, resultado?, error?, eventos? } y nunca lanza.
  async function correr(nombre, accion, { sincronizar: resincronizar = true, despues } = {}) {
    if (bloqueo.current) return { ok: false, ocupado: true }
    bloqueo.current = true
    if (resincronizar) secuencia.current++ // Invalida lecturas anteriores a esta escritura.
    setOcupado(nombre)
    try {
      const resultado = await accion()
      if (!vigente.current) return { ok: false, desmontado: true }
      despues?.(resultado)
      const datos = resincronizar ? await sincronizar() : null
      return { ok: true, resultado, eventos: datos }
    } catch (err) {
      if (!vigente.current) return { ok: false, desmontado: true }
      const datos = resincronizar || esErrorDeAcceso(err) ? await sincronizar() : null
      return { ok: false, error: err, eventos: datos }
    } finally {
      bloqueo.current = false
      if (vigente.current) setOcupado('')
    }
  }

  // Variante para comentarios y temporizador: los errores van al aviso general.
  async function ejecutar(nombre, accion, despues) {
    setError('')
    const r = await correr(nombre, accion, { despues })
    if (r.error) setError(mensajeActualizaciones(r.error))
    return r
  }

  async function alternarTemporizador() {
    const detener = !!referencia
    irAlFinal.current = detener
    await ejecutar('temporizador', () => (detener ? api.detenerTemporizadorTarea(tarea.id) : api.iniciarTemporizadorTarea(tarea.id)), r => {
      if (r.tipo === 'registro_tiempo') {
        setReferencia(null)
        setAviso({ tipo: 'ok', texto: `Sesión guardada: ${formatoDuracion(r.duracion_segundos)}.` })
      } else {
        setReferencia(referenciaTemporizador({ activo: r }))
        setAviso(null)
      }
    })
    avisarTemporizador.current?.()
  }

  function enviarComentario() {
    const contenido = serializar(borrador).trim()
    if (!contenido || contenido.length > MAX_COMENTARIO || ocupado || !listo) return
    irAlFinal.current = true
    // Se limpia con la respuesta: el texto guardado sale del historial (el
    // backend normaliza las etiquetas de las menciones).
    ejecutar('enviar', () => api.crearComentarioTarea(tarea.id, contenido), () => setBorrador(editorVacio()))
  }

  function guardarEdicion(id) {
    const contenido = serializar(edicion.estado).trim()
    if (!contenido || contenido.length > MAX_COMENTARIO) return
    ejecutar('editar', () => api.editarComentarioTarea(tarea.id, id, contenido), () => setEdicion(null))
  }

  function abrirRegistroManual() {
    setCorreccion(null); setAvisoCorreccion(null)
    setPestana('tiempo'); setFocoTiempo(n => n + 1)
  }

  function corregir(registro) {
    setEdicion(null); setBorrando(null)
    setCorreccion(registro); setAvisoCorreccion(null)
    setPestana('tiempo'); setFocoTiempo(n => n + 1)
  }

  function tiempoGuardado({ registro, advertencias }, { correccion: esCorreccion }) {
    const n = advertencias?.superposicion ? (advertencias.superposiciones?.length ?? 0) : 0
    const base = esCorreccion
      ? `Corrección guardada: ${formatoDuracion(registro?.duracion_segundos)} (versión ${registro?.version}).`
      : `Tiempo registrado: ${formatoDuracion(registro?.duracion_segundos)}.`
    // Advertencias definitivas (calculadas después de guardar): informativas, no errores.
    setAviso({ tipo: n ? 'atencion' : 'ok', texto: n ? `${base} Quedó superpuesto con ${n === 1 ? 'otro registro tuyo' : `${n} registros tuyos`}.` : base })
    setCorreccion(null); setAvisoCorreccion(null)
    setCorrecciones(c => (registro?.id ? { ...c, [registro.id]: undefined } : c))
    if (registro?.id) requestAnimationFrame(() => destacarYMostrar(`registro_tiempo:${registro.id}`))
  }

  async function versionDesactualizada(registroId, datosRecientes) {
    const datos = datosRecientes ?? await sincronizar()
    const actual = datos?.find(e => e.tipo === 'registro_tiempo' && e.id === registroId)
    if (actual?.permisos?.puede_editar) {
      setCorreccion(actual)
      setAvisoCorreccion(`El registro cambió desde que lo abriste. Cargamos la versión actual (versión ${actual.version}): revisá los valores y volvé a guardar.`)
    } else {
      setCorreccion(null); setAvisoCorreccion(null)
      setError('El registro cambió y ya no se puede corregir desde acá.')
    }
  }

  async function alternarCorrecciones(registro) {
    const actual = correcciones[registro.id]
    if (actual?.abierto) { setCorrecciones(c => ({ ...c, [registro.id]: { ...actual, abierto: false } })); return }
    setCorrecciones(c => ({ ...c, [registro.id]: { abierto: true, status: 'loading', data: [] } }))
    try {
      const r = await api.getCorreccionesRegistro(tarea.id, registro.id)
      if (vigente.current) setCorrecciones(c => ({ ...c, [registro.id]: { abierto: true, status: 'success', data: r?.data ?? [] } }))
    } catch (err) {
      if (vigente.current) setCorrecciones(c => ({ ...c, [registro.id]: { abierto: true, status: 'error', data: [], mensaje: mensajeActualizaciones(err) } }))
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const largo = longitudSerializada(borrador)
  const excedido = largo > MAX_COMENTARIO
  const puedeEnviar = !!serializar(borrador).trim() && !excedido && !ocupado && listo
  const temporizadorDeshabilitado = !listo || cargando || !!ocupado || (!referencia && finalizada === true)
  const etiquetaTemporizador = referencia ? 'Tu sesión en curso' : finalizada ? 'Tarea finalizada: podés registrar tiempo manualmente' : 'Tu temporizador'

  let diaAnterior = null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end sm:p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(10,82,64,0.22)' }} onClick={onClose} />
      <section ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="actualizaciones-titulo"
        className="relative w-full sm:max-w-xl h-full bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden outline-none font-sans">

        {/* ── Encabezado: tarea + temporizador ── */}
        <header className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 border-b shrink-0" style={{ borderColor: 'rgba(15,110,86,0.12)' }}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0F6E56]">Actualizaciones</p>
              <h2 id="actualizaciones-titulo" className="mt-0.5 text-[18px] sm:text-[19px] font-semibold leading-snug text-gray-900 break-words">{tarea.titulo}</h2>
            </div>
            <button type="button" onClick={onClose} className={`${ICONO} w-10 h-10 -mr-1 -mt-1`} aria-label="Cerrar actualizaciones" title="Cerrar">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className={`mt-3 rounded-2xl border px-3.5 py-3 sm:px-4 ${referencia ? 'bg-[#E1F5EE] border-[#1D9E75]/30' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
                  {referencia && (
                    <span className="relative flex w-2 h-2 shrink-0" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-60 animate-ping motion-reduce:animate-none" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-[#1D9E75]" />
                    </span>
                  )}
                  <span className="truncate">{etiquetaTemporizador}</span>
                </p>
                <p className="text-[26px] leading-tight font-semibold tabular-nums text-gray-900" role="timer" aria-label={`Tiempo transcurrido: ${formatoReloj(segundos)}`}>
                  {formatoReloj(segundos)}
                </p>
              </div>
              <button type="button" disabled={temporizadorDeshabilitado} onClick={alternarTemporizador}
                title={referencia ? 'Detener temporizador' : finalizada ? 'La tarea está finalizada' : 'Iniciar temporizador'}
                className={referencia
                  ? `inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-[14px] font-semibold bg-white text-[#C23B3A] border border-[#C23B3A]/40 hover:bg-[#FCE9E9] active:bg-[#F8D8D8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`
                  : `${BOTON_PRIMARIO} h-11 text-[14px]`}>
                {ocupado === 'temporizador' ? <RefreshCw size={16} className="animate-spin" aria-hidden="true" /> : referencia ? <Square size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                {referencia ? 'Detener' : 'Iniciar'}
              </button>
            </div>
            <button type="button" onClick={abrirRegistroManual}
              className={`mt-2 inline-flex items-center gap-1.5 min-h-[32px] rounded-lg -ml-1 px-1 text-[12.5px] font-medium text-[#0F6E56] hover:underline underline-offset-2 ${FOCO}`}>
              <CalendarClock size={14} aria-hidden="true" /> Registrar tiempo manualmente
            </button>
          </div>
        </header>

        {/* ── Barra de estado ── */}
        <div className="px-4 sm:px-5 py-1.5 flex items-center justify-between gap-2 border-b text-[12px] text-gray-500 shrink-0" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
          <span aria-live="polite">{cargando ? 'Actualizando…' : `${eventos.length} ${eventos.length === 1 ? 'actualización' : 'actualizaciones'} · lo más reciente al final`}</span>
          <button type="button" className={ICONO} aria-label="Actualizar contenido" title="Actualizar" disabled={cargando || !!ocupado}
            onClick={() => { setError(''); sincronizar() }}>
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-4 sm:mx-5 mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700 shrink-0">
            <p className="flex-1 py-1">{error}</p>
            <button type="button" onClick={() => setError('')} className={`${ICONO} w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-100`} aria-label="Ocultar mensaje de error">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        {aviso && (
          <div role="status" className={`mx-4 sm:mx-5 mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] shrink-0 ${aviso.tipo === 'atencion' ? 'bg-amber-50 text-amber-900' : aviso.tipo === 'info' ? 'bg-sky-50 text-sky-900' : 'bg-[#E1F5EE] text-[#085041]'}`}>
            <Info size={15} className="shrink-0 mt-1.5" aria-hidden="true" />
            <p className="flex-1 py-1">{aviso.texto}</p>
            <button type="button" onClick={() => setAviso(null)} className={`${ICONO} w-8 h-8`} aria-label="Ocultar aviso">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Historial ── */}
        <div className="relative flex-1 min-h-0">
          <div ref={lista} onScroll={alDesplazar} className="h-full overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 space-y-3" aria-busy={cargando}>
            {!eventos.length && (
              <div className="py-12 text-center text-gray-500">
                {cargando ? <RefreshCw className="mx-auto mb-3 animate-spin text-gray-400" size={24} aria-hidden="true" /> : <MessageSquare className="mx-auto mb-3 text-gray-300" size={28} aria-hidden="true" />}
                <p className="text-[13.5px]">{cargando ? 'Cargando actualizaciones…' : error ? 'No se pudieron cargar las actualizaciones.' : 'Todavía no hay actualizaciones.'}</p>
                {!cargando && !error && <p className="text-[12.5px] text-gray-400 mt-1">Escribí la primera o registrá tiempo trabajado.</p>}
              </div>
            )}
            {eventos.map(evento => {
              const dia = fechaLocal(new Date(evento.fecha))
              const separador = dia !== diaAnterior
              diaAnterior = dia
              const clave = claveEvento(evento)
              return (
                <Fragment key={clave}>
                  {separador && (
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400" role="separator" aria-label={etiquetaDia(evento.fecha)}>
                      <span className="h-px flex-1 bg-gray-200" /> {etiquetaDia(evento.fecha)} <span className="h-px flex-1 bg-gray-200" />
                    </div>
                  )}
                  {evento.tipo === 'registro_tiempo' ? (
                    <RegistroItem evento={evento} destacado={destacado === clave} enCorreccion={correccion?.id === evento.id}
                      bloqueado={!!ocupado || !listo} correcciones={correcciones[evento.id]}
                      onCorregir={() => corregir(evento)} onVerCorrecciones={() => alternarCorrecciones(evento)} />
                  ) : (
                    <ComentarioItem evento={evento} destacado={destacado === clave} bloqueado={!!ocupado || !listo} ocupado={ocupado}
                      edicion={edicion?.id === evento.id ? edicion : null} borrando={borrando === evento.id} mencionables={mencionables}
                      onEditar={() => { setEdicion({ id: evento.id, estado: desdeContenido(evento.contenido, evento.menciones) }); setBorrando(null) }}
                      onCambiarEdicion={estado => setEdicion({ id: evento.id, estado })}
                      onGuardarEdicion={() => guardarEdicion(evento.id)} onCancelarEdicion={() => setEdicion(null)}
                      onEliminar={() => { setBorrando(evento.id); setEdicion(null) }} onCancelarEliminar={() => setBorrando(null)}
                      onConfirmarEliminar={() => ejecutar('eliminar', () => api.eliminarComentarioTarea(tarea.id, evento.id), () => setBorrando(null))} />
                  )}
                </Fragment>
              )
            })}
          </div>
          {hayNuevas && (
            <button type="button" onClick={verMasRecientes}
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#0F6E56] text-white text-[12.5px] font-semibold shadow-lg hover:bg-[#085541] ${FOCO}`}>
              <ArrowDown size={14} aria-hidden="true" /> Nuevas actualizaciones
            </button>
          )}
        </div>

        {/* ── Comentario / Registrar tiempo ── */}
        <div className="border-t shrink-0 bg-gray-50/70" style={{ borderColor: 'rgba(15,110,86,0.12)' }}>
          <div role="tablist" aria-label="Agregar una actualización" className="flex gap-1 px-4 sm:px-5 pt-3"
            onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const sig = pestana === 'comentario' ? 'tiempo' : 'comentario'; setPestana(sig); document.getElementById(`pestana-${sig}`)?.focus() } }}>
            {[['comentario', 'Comentario', MessageSquare], ['tiempo', 'Registrar tiempo', Clock]].map(([valor, texto, Icono]) => (
              <button key={valor} id={`pestana-${valor}`} type="button" role="tab" aria-selected={pestana === valor} aria-controls={`panel-${valor}`}
                tabIndex={pestana === valor ? 0 : -1} onClick={() => setPestana(valor)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors ${FOCO} ${pestana === valor ? 'bg-white text-[#0F6E56] shadow-sm border border-[#0F6E56]/20' : 'text-gray-600 hover:bg-white/80 border border-transparent'}`}>
                <Icono size={14} aria-hidden="true" /> {texto}
              </button>
            ))}
          </div>

          {pestana === 'comentario' ? (
            <form id="panel-comentario" role="tabpanel" aria-labelledby="pestana-comentario" className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5"
              onSubmit={e => { e.preventDefault(); enviarComentario() }}>
              <label htmlFor="nuevo-comentario" className="sr-only">Escribir un comentario</label>
              <ComposerMenciones id="nuevo-comentario" valor={borrador} onChange={setBorrador} mencionables={mencionables}
                onSubmit={enviarComentario} disabled={ocupado === 'enviar' || !listo} invalido={excedido}
                placeholder="Escribí una actualización… Usá @ para mencionar" describedBy="nuevo-comentario-ayuda" />
              <div className="flex items-center justify-between gap-3 mt-2">
                <p id="nuevo-comentario-ayuda" className="text-[11.5px] text-gray-500 min-w-0">
                  <span className="hidden sm:inline">@ para mencionar · Ctrl + Enter para enviar · </span>
                  <span className={excedido ? 'font-semibold text-red-600' : ''}>{largo}/{MAX_COMENTARIO}</span>
                  {excedido && <span className="text-red-600"> · las menciones cuentan con su formato completo</span>}
                </p>
                <button type="submit" disabled={!puedeEnviar} className={BOTON_PRIMARIO}>
                  {ocupado === 'enviar' ? <RefreshCw size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                  {ocupado === 'enviar' ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </form>
          ) : (
            <div id="panel-tiempo" role="tabpanel" aria-labelledby="pestana-tiempo" className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5 max-h-[55vh] overflow-y-auto">
              <RegistroTiempoForm key={correccion ? `${correccion.id}:${correccion.version}` : 'nuevo'}
                tareaId={tarea.id} registro={correccion} aviso={correccion ? avisoCorreccion : null}
                listo={listo} ocupado={ocupado} ejecutar={correr} autoFocus={focoTiempo}
                temporizadorActivo={!!referencia} onDetenerTemporizador={alternarTemporizador}
                onGuardado={tiempoGuardado} onVersionDesactualizada={versionDesactualizada}
                onCancelarCorreccion={() => { setCorreccion(null); setAvisoCorreccion(null) }}
                registrarEscape={registrarEscape} />
              {finalizada === true && !correccion && (
                <p className="mt-3 text-[12px] text-gray-500">La tarea está finalizada: el tiempo se registra sin cambiar su etapa ni sus fechas.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>, document.body,
  )
}

// ── Elementos del historial ─────────────────────────────────────────────────

function ComentarioItem({
  evento, destacado, bloqueado, ocupado, edicion, borrando, mencionables,
  onEditar, onCambiarEdicion, onGuardarEdicion, onCancelarEdicion, onEliminar, onCancelarEliminar, onConfirmarEliminar,
}) {
  const nombre = evento.usuario?.nombre || 'Usuario eliminado'
  const largoEdicion = edicion ? longitudSerializada(edicion.estado) : 0
  const edicionValida = edicion && serializar(edicion.estado).trim() && largoEdicion <= MAX_COMENTARIO
  return (
    <article data-evento={claveEvento(evento)} aria-label={`Comentario de ${nombre}`}
      className={`rounded-xl border bg-white p-3 sm:p-4 transition-shadow ${destacado ? 'ring-2 ring-[#1D9E75] ring-offset-2' : ''}`}
      style={{ borderColor: 'rgba(15,110,86,0.14)' }}>
      <div className="flex items-start gap-2.5">
        <Iniciales nombre={evento.usuario?.nombre} />
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-gray-800 break-words">{nombre}</p>
          <p className="text-[11.5px] text-gray-500">
            <time dateTime={evento.fecha} title={fmtFechaHora(evento.fecha)}>{fmtHora(evento.fecha)}</time>
            {evento.editado && <span title={evento.editado_at ? `Editado el ${fmtFechaHora(evento.editado_at)}` : undefined}> · editado</span>}
          </p>
        </div>
        {(evento.permisos?.puede_editar || evento.permisos?.puede_eliminar) && !edicion && (
          <div className="flex shrink-0 -mr-1 -mt-1">
            {evento.permisos?.puede_editar && (
              <button type="button" className={ICONO} disabled={bloqueado} onClick={onEditar} aria-label="Editar comentario" title="Editar comentario">
                <Edit2 size={16} aria-hidden="true" />
              </button>
            )}
            {evento.permisos?.puede_eliminar && (
              <button type="button" className={`${ICONO} hover:text-red-600 hover:bg-red-50 active:bg-red-100`} disabled={bloqueado} onClick={onEliminar} aria-label="Eliminar comentario" title="Eliminar comentario">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {edicion ? (
        <form className="mt-3" onSubmit={e => { e.preventDefault(); if (edicionValida) onGuardarEdicion() }}
          onKeyDown={e => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); onCancelarEdicion() } }}>
          <ComposerMenciones valor={edicion.estado} onChange={onCambiarEdicion} mencionables={mencionables} ariaLabel="Editar comentario"
            onSubmit={() => { if (edicionValida) onGuardarEdicion() }} disabled={!!ocupado} rows={3} menuArriba={false} autoFocus
            invalido={largoEdicion > MAX_COMENTARIO} />
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            <span className={`text-[11.5px] ${largoEdicion > MAX_COMENTARIO ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{largoEdicion}/{MAX_COMENTARIO}</span>
            <div className="flex gap-2">
              <button type="button" className={`${BOTON_SECUNDARIO} h-9`} disabled={!!ocupado} onClick={onCancelarEdicion}>Cancelar</button>
              <button type="submit" className={`${BOTON_PRIMARIO} h-9`} disabled={bloqueado || !edicionValida}>{ocupado === 'editar' ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-2 sm:pl-[42px] text-[13.5px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
          <TextoConMenciones contenido={evento.contenido} menciones={evento.menciones} />
        </p>
      )}

      {borrando && (
        <div role="alertdialog" aria-label="Confirmar eliminación" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800"
          onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onCancelarEliminar() } }}>
          <p>¿Eliminar este comentario? No se puede recuperar.</p>
          <div className="flex justify-end gap-2 mt-2.5">
            <button type="button" autoFocus className={`${BOTON_SECUNDARIO} h-9`} disabled={!!ocupado} onClick={onCancelarEliminar}>Cancelar</button>
            <button type="button" disabled={bloqueado} onClick={onConfirmarEliminar}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`}>
              <Trash2 size={14} aria-hidden="true" /> {ocupado === 'eliminar' ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

const ORIGEN = {
  temporizador: { texto: 'Temporizador', clase: 'border-gray-300 text-gray-600' },
  carga_manual: { texto: 'Carga manual', clase: 'border-[#1D9E75]/50 text-[#085041]' },
}

function RegistroItem({ evento, destacado, enCorreccion, bloqueado, correcciones, onCorregir, onVerCorrecciones }) {
  const nombre = evento.usuario?.nombre || 'Usuario eliminado'
  const origen = ORIGEN[evento.origen] ?? ORIGEN.temporizador
  return (
    <article data-evento={claveEvento(evento)} aria-label={`Registro de tiempo de ${nombre}`}
      className={`rounded-xl border-l-4 border-[#1D9E75] bg-[#F3FAF7] px-3 py-2.5 transition-shadow ${destacado ? 'ring-2 ring-[#1D9E75] ring-offset-2' : ''} ${enCorreccion ? 'outline outline-2 outline-amber-300' : ''}`}>
      <div className="flex items-start gap-2.5">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white shrink-0" aria-hidden="true">
          <Clock size={16} className="text-[#0F6E56]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-gray-800 break-words">
            <span className="font-semibold">{nombre}</span> trabajó <strong className="text-[#085041] tabular-nums">{formatoDuracion(evento.duracion_segundos)}</strong>
          </p>
          <p className="text-[12px] text-gray-600 tabular-nums mt-0.5">{rangoRegistro(evento.inicio, evento.fin)}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={`inline-flex items-center rounded-full border px-2 py-px text-[11px] font-medium bg-white ${origen.clase}`}>{origen.texto}</span>
            {evento.corregido && (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-px text-[11px] font-medium text-amber-800"
                title={evento.corregido_at ? `Última corrección: ${fmtFechaHora(evento.corregido_at)}` : undefined}>Corregido</span>
            )}
            {evento.origen !== 'carga_manual' && evento.motivo_finalizacion === 'automatico' && (
              <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-px text-[11px] text-gray-600"
                title="Se detuvo solo: la tarea se finalizó o se perdió el acceso">Cierre automático</span>
            )}
          </div>
        </div>
        {evento.permisos?.puede_editar && (
          <button type="button" onClick={onCorregir} disabled={bloqueado || enCorreccion}
            className={`inline-flex items-center gap-1 h-9 px-2.5 rounded-lg text-[12.5px] font-semibold text-[#0F6E56] bg-white border border-[#0F6E56]/25 hover:bg-[#E1F5EE] active:bg-[#CBEDE0] shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`}
            aria-label={`Corregir registro de ${formatoDuracion(evento.duracion_segundos)}`}>
            <Edit2 size={14} aria-hidden="true" /> Corregir
          </button>
        )}
      </div>
      {evento.corregido && (
        <div className="mt-1.5 pl-[42px]">
          <button type="button" onClick={onVerCorrecciones} aria-expanded={!!correcciones?.abierto}
            className={`min-h-[32px] rounded-md px-1 -ml-1 text-[12px] font-medium text-[#0F6E56] hover:underline underline-offset-2 ${FOCO}`}>
            {correcciones?.abierto ? 'Ocultar correcciones' : 'Ver correcciones'}
          </button>
          {correcciones?.abierto && (
            <div className="mt-1 text-[12px] text-gray-600" aria-live="polite">
              {correcciones.status === 'loading' && <p>Cargando correcciones…</p>}
              {correcciones.status === 'error' && <p className="text-red-700">{correcciones.mensaje}</p>}
              {correcciones.status === 'success' && (
                <ol className="space-y-1">
                  {correcciones.data.map(c => (
                    <li key={c.id} className="tabular-nums">
                      <span className="font-medium text-gray-700">v{c.version}</span> · {c.actor?.nombre || 'Usuario eliminado'} · {fmtFechaHora(c.created_at)}:{' '}
                      {c.accion === 'carga_manual'
                        ? <>cargó {rangoRegistro(c.inicio_nuevo, c.fin_nuevo)} ({formatoDuracion(c.duracion_nueva_segundos)})</>
                        : <>{rangoRegistro(c.inicio_anterior, c.fin_anterior)} ({formatoDuracion(c.duracion_anterior_segundos)}) → {rangoRegistro(c.inicio_nuevo, c.fin_nuevo)} ({formatoDuracion(c.duracion_nueva_segundos)})</>}
                    </li>
                  ))}
                  {!correcciones.data.length && <li>Sin correcciones registradas.</li>}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
