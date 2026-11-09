import { useEffect, useId, useRef, useState } from 'react'
import { Bell, RefreshCw, X, AlertTriangle, AlertCircle, Info, ArrowRight, CheckCircle, AtSign, Check, CheckCheck } from 'lucide-react'
import { useAlertas, refrescarAlertas, asegurarAlertas, descartarAlerta } from '../lib/alertas'
import { resolverDestino, agruparPorModulo, alertasVisibles } from '../lib/alertasStore'
import {
  useNotificaciones, refrescarNotificaciones, cargarNotificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas,
} from '../lib/notificaciones'
import { contadorCampana, destinoNotificacion, estadoNotificacion } from '../lib/notificacionesStore'

// Campana única con dos secciones:
//   - Alertas: dinámicas (GET /api/alertas), sin cambios de semántica; el
//     backend ya las filtra por permisos y "Descartar" solo las oculta en la sesión.
//   - Menciones: notificaciones persistentes (/api/notificaciones, r2 §4) con
//     leídas / no leídas.
// Se usa en Inicio (`tono="claro"`) y en el Layout (`tono="oscuro"`); el estado
// de ambas fuentes es uno solo por sesión (lib/alertas.js, lib/notificaciones.js).
//
// Contador del botón = alertas visibles (sin las descartadas) + menciones
// pendientes según el backend (`no_leidas`). Son fuentes disjuntas: no se duplica.

const MODULO_LABEL = { finance: 'Finanzas', operations: 'Operativo', indicadores: 'Indicadores' }
const FUENTE_LABEL = { deudas: 'Deudas', comprobantes: 'Comprobantes', tareas: 'Tareas', indicadores: 'Indicadores' }
const FOCO = 'outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]'

const SEVERIDAD_CFG = {
  alta:  { icon: AlertTriangle, color: '#C23B3A', fondo: '#FCE9E9', label: 'Prioridad alta' },
  media: { icon: AlertCircle,   color: '#92400E', fondo: '#FEF3C7', label: 'Atención' },
  info:  { icon: Info,          color: '#0F6E56', fondo: '#E1F5EE', label: 'Información' },
}

function fmtHora(iso) {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null
}
function fmtFechaHora(iso) {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : ''
}
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

export default function AlertasCampana({ userKey, onNavigate, tono = 'oscuro' }) {
  const estado = useAlertas(userKey)
  const notif = useNotificaciones(userKey)
  const [abierto, setAbierto] = useState(false)
  const [seccion, setSeccion] = useState('alertas')
  const contenedorRef = useRef(null)
  const botonRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()

  // Alertas: solo las visibles (sin descartadas), como antes.
  const visibles = alertasVisibles(estado)
  const cargando = !estado || estado.status === 'loading'
  const errorTotal = estado?.status === 'error'
  const totalAlertas = cargando || errorTotal ? 0 : visibles.length
  const hayAlta = visibles.some(a => a.severidad === 'alta')
  // Menciones: el dato del backend; null mientras no haya respuesta.
  const noLeidas = notif?.noLeidas ?? null
  const total = contadorCampana(totalAlertas, noLeidas)

  const cerrar = (devolverFoco = false) => {
    setAbierto(false)
    if (devolverFoco) botonRef.current?.focus()
  }

  const abrir = () => {
    // Sin alertas pero con menciones pendientes, se abre directo en Menciones.
    if (!abierto) setSeccion(totalAlertas === 0 && noLeidas > 0 ? 'menciones' : 'alertas')
    setAbierto(v => !v)
  }

  // Al abrir: revalidar alertas si la última respuesta no es reciente, y llevar el foco al panel.
  useEffect(() => {
    if (!abierto) return
    asegurarAlertas(userKey)
    panelRef.current?.focus()
  }, [abierto, userKey])

  // La lista de menciones se pide al mostrar la sección (no en cada consulta periódica).
  useEffect(() => {
    if (abierto && seccion === 'menciones') cargarNotificaciones(userKey)
  }, [abierto, seccion, userKey])

  // Escape cierra; un clic fuera también.
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e) => { if (e.key === 'Escape') cerrar(true) }
    const alClic = (e) => { if (!contenedorRef.current?.contains(e.target)) cerrar() }
    document.addEventListener('keydown', alTeclear)
    document.addEventListener('mousedown', alClic)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.removeEventListener('mousedown', alClic)
    }
  }, [abierto])

  const irA = (alerta) => {
    const destino = resolverDestino(alerta.destino)
    if (!destino) return
    cerrar()
    onNavigate(destino.page, destino.opts)
  }

  // La tarjeta (y su botón) desaparecen: el foco vuelve al panel.
  const descartar = (alerta) => {
    descartarAlerta(userKey, alerta.id)
    panelRef.current?.focus()
  }

  // Abrir una mención: se marca como leída y se navega a la tarea (y al
  // comentario, si sigue existiendo). El acceso lo vuelve a validar el panel.
  const abrirMencion = (n) => {
    const opts = destinoNotificacion(n)
    if (!opts) return
    if (!n.leida) marcarNotificacionLeida(userKey, n.id)
    cerrar()
    onNavigate('operations', opts)
  }

  const refrescar = () => {
    refrescarAlertas(userKey)
    refrescarNotificaciones(userKey)
    if (seccion === 'menciones') cargarNotificaciones(userKey)
  }

  const oscuro = tono === 'oscuro'
  const partes = []
  if (cargando) partes.push('alertas cargando')
  else if (errorTotal) partes.push('alertas no disponibles')
  else partes.push(totalAlertas > 0 ? plural(totalAlertas, 'alerta activa', 'alertas activas') : 'sin alertas activas')
  if (noLeidas > 0) partes.push(plural(noLeidas, 'mención sin leer', 'menciones sin leer'))
  const etiqueta = `Alertas y menciones: ${partes.join(', ')}`
  const colorContador = hayAlta && totalAlertas > 0 ? '#E24B4A' : totalAlertas > 0 ? '#EF9F27' : '#0F6E56'

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={abrir}
        aria-label={etiqueta}
        title={etiqueta}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? panelId : undefined}
        className={`relative p-2 rounded-lg transition-colors outline-none focus-visible:ring-2 ${oscuro
          ? 'text-white/70 hover:text-white hover:bg-white/10 focus-visible:ring-[#5DCAA5]'
          : 'text-gray-500 hover:text-[#0F6E56] hover:bg-[#E1F5EE] focus-visible:ring-[#1D9E75]'}`}
      >
        <Bell size={18} />
        {total > 0 && (
          <span aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: colorContador, boxShadow: `0 0 0 2px ${oscuro ? '#04342C' : '#fff'}` }}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* En mobile el panel termina por encima del botón flotante de Nexi (bottom-6 + 56px) */}
      {abierto && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Alertas y menciones"
          tabIndex={-1}
          className="fixed left-3 right-3 top-[64px] max-h-[calc(100vh-160px)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px] sm:max-h-[min(600px,calc(100vh-88px))] z-50 bg-white rounded-2xl border shadow-xl flex flex-col fade-in outline-none font-sans"
          style={{ borderColor: 'rgba(15,110,86,0.12)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 flex-shrink-0">
            <h2 className="font-sans font-semibold text-gray-900 text-[15px] leading-tight">Centro de alertas</h2>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button type="button" onClick={refrescar} disabled={!!estado?.actualizando}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-[#0F6E56] hover:bg-[#E1F5EE] transition-colors disabled:opacity-60 ${FOCO}`}
                title="Actualizar" aria-label="Actualizar alertas y menciones">
                <RefreshCw size={14} className={estado?.actualizando || notif?.lista?.actualizando ? 'animate-spin' : ''} />
              </button>
              <button type="button" onClick={() => cerrar(true)}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors ${FOCO}`}
                title="Cerrar" aria-label="Cerrar alertas">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Secciones */}
          <div role="tablist" aria-label="Secciones" className="flex gap-1 px-3 pb-2 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}
            onKeyDown={e => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              e.preventDefault()
              const sig = seccion === 'alertas' ? 'menciones' : 'alertas'
              setSeccion(sig)
              document.getElementById(`${panelId}-tab-${sig}`)?.focus()
            }}>
            {[
              ['alertas', 'Alertas', cargando || errorTotal ? null : totalAlertas],
              ['menciones', 'Menciones', noLeidas],
            ].map(([valor, texto, n]) => (
              <button key={valor} id={`${panelId}-tab-${valor}`} type="button" role="tab" aria-selected={seccion === valor}
                aria-controls={`${panelId}-panel-${valor}`} tabIndex={seccion === valor ? 0 : -1} onClick={() => setSeccion(valor)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold transition-colors ${FOCO} ${seccion === valor ? 'bg-[#E1F5EE] text-[#085041]' : 'text-gray-600 hover:bg-gray-50'}`}>
                {texto}
                {n > 0 && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center text-[10.5px] font-bold ${seccion === valor ? 'bg-[#0F6E56] text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {n > 99 ? '99+' : n}<span className="sr-only">{valor === 'alertas' ? ' activas' : ' sin leer'}</span>
                  </span>
                )}
              </button>
            ))}
          </div>

          {seccion === 'alertas' ? (
            <div id={`${panelId}-panel-alertas`} role="tabpanel" aria-labelledby={`${panelId}-tab-alertas`} className="flex flex-col min-h-0 flex-1">
              <PanelAlertas estado={estado} userKey={userKey} onIr={irA} onDescartar={descartar} />
            </div>
          ) : (
            <div id={`${panelId}-panel-menciones`} role="tabpanel" aria-labelledby={`${panelId}-tab-menciones`} className="flex flex-col min-h-0 flex-1">
              <PanelMenciones notif={notif} userKey={userKey} onAbrir={abrirMencion} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PanelAlertas({ estado, userKey, onIr, onDescartar }) {
  const data = estado?.data
  const cargando = !estado || estado.status === 'loading'
  const actualizando = !!estado?.actualizando
  const errorTotal = estado?.status === 'error'
  const visibles = alertasVisibles(estado)
  const total = visibles.length
  const ocultas = (data?.alertas.length ?? 0) - visibles.length
  const noVerificadas = (data?.fuentes ?? []).filter(f => f.estado === 'error').map(f => FUENTE_LABEL[f.fuente] || f.fuente)
  const hora = fmtHora(data?.generado_en)

  return (
    <>
      <p className="px-4 pt-2 text-[11.5px] text-gray-500 flex-shrink-0">
        {cargando ? 'Cargando…'
          : errorTotal ? 'No disponibles'
          : `${total} ${total === 1 ? 'situación activa' : 'situaciones activas'}${ocultas > 0 ? ` · ${ocultas} ${ocultas === 1 ? 'descartada' : 'descartadas'}` : ''}`}
      </p>

      <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3" aria-live="polite">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-gray-400">
            <RefreshCw size={14} className="animate-spin" /> Cargando alertas…
          </div>
        ) : errorTotal ? (
          <div className="text-center py-8">
            <AlertTriangle size={22} className="mx-auto mb-2" style={{ color: '#E24B4A' }} />
            <p className="text-[13px] font-medium text-gray-700">No se pudieron cargar las alertas.</p>
            <p className="text-[12px] text-gray-400 mt-0.5">Esto no significa que no haya alertas.</p>
            <button type="button" onClick={() => refrescarAlertas(userKey)} disabled={actualizando}
              className="mt-3 px-4 py-2 rounded-xl text-white text-[12.5px] font-medium disabled:opacity-60"
              style={{ background: '#0F6E56' }}>
              {actualizando ? 'Reintentando…' : 'Reintentar'}
            </button>
          </div>
        ) : (
          <>
            {estado.fallo && (
              <p className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: '#FCE9E9', color: '#C23B3A' }}>
                No se pudo actualizar. Se muestran las alertas{hora ? ` de las ${hora}` : ' anteriores'}.
              </p>
            )}
            {data.parcial && (
              <p className="flex items-start gap-1.5 text-[11.5px] px-3 py-2 rounded-lg" style={{ background: '#FEF3C7', color: '#92400E' }}>
                <AlertCircle size={13} className="flex-shrink-0 mt-px" />
                <span>
                  Algunas alertas no se pudieron verificar
                  {noVerificadas.length > 0 && <> ({noVerificadas.join(', ')})</>}. La lista puede estar incompleta.
                </span>
              </p>
            )}

            {visibles.length === 0 ? (
              ocultas > 0 ? (
                <p className="text-[12.5px] text-gray-500 text-center py-6">No hay alertas visibles en esta sesión.</p>
              ) : data.parcial ? (
                <p className="text-[12.5px] text-gray-500 text-center py-6">No hay alertas en las fuentes que se pudieron verificar.</p>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle size={22} className="mx-auto mb-2" style={{ color: '#1D9E75' }} />
                  <p className="text-[13px] font-medium text-gray-700">No hay alertas activas.</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">Todo está al día.</p>
                </div>
              )
            ) : (
              agruparPorModulo(visibles).map(({ modulo, alertas }) => (
                <section key={modulo} aria-label={MODULO_LABEL[modulo] || 'Otros'}>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">
                    {MODULO_LABEL[modulo] || 'Otros'}
                  </p>
                  <ul className="space-y-1.5">
                    {alertas.map(a => <AlertaItem key={a.id} alerta={a} onIr={onIr} onDescartar={onDescartar} />)}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </div>

      {hora && !cargando && !errorTotal && (
        <div className="px-4 py-2 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <p className="text-[11px] text-gray-400 text-center">Actualizado a las {hora}</p>
        </div>
      )}
    </>
  )
}

function AlertaItem({ alerta, onIr, onDescartar }) {
  const cfg = SEVERIDAD_CFG[alerta.severidad] || SEVERIDAD_CFG.info
  const Icon = cfg.icon
  const navegable = !!resolverDestino(alerta.destino)
  return (
    <li className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.fondo }}
        title={cfg.label}>
        <Icon size={14} style={{ color: cfg.color }} aria-hidden="true" />
        <span className="sr-only">{cfg.label}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-800 leading-snug">{alerta.titulo}</p>
        {alerta.mensaje && <p className="text-[12px] text-gray-500 leading-snug mt-0.5">{alerta.mensaje}</p>}
      </div>
      {navegable && (
        <button type="button" onClick={() => onIr(alerta)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] font-medium flex-shrink-0 transition-colors hover:bg-[#E1F5EE] ${FOCO}`}
          style={{ color: '#0F6E56' }} aria-label={`Ir a ${alerta.titulo}`}>
          Ver <ArrowRight size={12} />
        </button>
      )}
      {/* Solo oculta la alerta en esta sesión; no cambia nada en el sistema */}
      <button type="button" onClick={() => onDescartar(alerta)}
        className={`-mt-1 -mr-1.5 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 ${FOCO}`}
        title="Descartar alerta" aria-label={`Descartar alerta: ${alerta.titulo}`}>
        <X size={12} />
      </button>
    </li>
  )
}

function PanelMenciones({ notif, userKey, onAbrir }) {
  const lista = notif?.lista
  const items = lista?.items ?? []
  const status = lista?.status ?? 'loading'
  const noLeidas = notif?.noLeidas
  const hayNoLeidas = noLeidas > 0 || items.some(n => !n.leida)
  const marcando = notif?.marcando ?? []
  const [errorAccion, setErrorAccion] = useState('')

  async function marcarTodas() {
    setErrorAccion('')
    const r = await marcarTodasNotificacionesLeidas(userKey)
    if (r?.error) setErrorAccion('No se pudieron marcar como leídas. Intentá nuevamente.')
  }
  async function marcarUna(n) {
    setErrorAccion('')
    const r = await marcarNotificacionLeida(userKey, n.id)
    if (r?.error && r.error.status !== 404) setErrorAccion('No se pudo marcar la mención como leída.')
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 pt-2 flex-shrink-0">
        <p className="text-[11.5px] text-gray-500">
          {noLeidas == null ? (notif?.falloCantidad ? 'Contador no disponible' : 'Cargando…')
            : noLeidas > 0 ? plural(noLeidas, 'mención sin leer', 'menciones sin leer') : 'Sin menciones pendientes'}
        </p>
        {hayNoLeidas && status === 'success' && (
          <button type="button" onClick={marcarTodas} disabled={notif?.marcandoTodas}
            className={`inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[12px] font-medium text-[#0F6E56] hover:bg-[#E1F5EE] disabled:opacity-60 ${FOCO}`}>
            <CheckCheck size={14} aria-hidden="true" /> {notif?.marcandoTodas ? 'Marcando…' : 'Marcar todas como leídas'}
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2" aria-live="polite">
        {errorAccion && <p role="alert" className="text-[11.5px] px-3 py-2 rounded-lg bg-[#FCE9E9] text-[#C23B3A]">{errorAccion}</p>}
        {lista?.fallo && items.length > 0 && (
          <p className="text-[11.5px] px-3 py-2 rounded-lg bg-[#FCE9E9] text-[#C23B3A]">No se pudo actualizar. Se muestran las menciones anteriores.</p>
        )}
        {status === 'loading' || status === 'idle' ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-gray-400">
            <RefreshCw size={14} className="animate-spin" /> Cargando menciones…
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-8">
            <AlertTriangle size={22} className="mx-auto mb-2" style={{ color: '#E24B4A' }} />
            <p className="text-[13px] font-medium text-gray-700">No se pudieron cargar las menciones.</p>
            <button type="button" onClick={() => cargarNotificaciones(userKey)}
              className="mt-3 px-4 py-2 rounded-xl text-white text-[12.5px] font-medium" style={{ background: '#0F6E56' }}>
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <AtSign size={22} className="mx-auto mb-2 text-gray-300" aria-hidden="true" />
            <p className="text-[13px] font-medium text-gray-700">Todavía no te mencionaron.</p>
            <p className="text-[12px] text-gray-400 mt-0.5">Cuando alguien te mencione en una tarea, lo vas a ver acá.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-1.5">
              {items.map(n => (
                <MencionItem key={n.id} n={n} marcando={marcando.includes(n.id)} onAbrir={() => onAbrir(n)} onMarcar={() => marcarUna(n)} />
              ))}
            </ul>
            {lista.hayMas && (
              <button type="button" onClick={() => cargarNotificaciones(userKey, { mas: true })} disabled={lista.cargandoMas}
                className={`w-full h-9 rounded-lg text-[12.5px] font-medium text-[#0F6E56] hover:bg-[#E1F5EE] disabled:opacity-60 ${FOCO}`}>
                {lista.cargandoMas ? 'Cargando…' : 'Ver más'}
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}

function MencionItem({ n, marcando, onAbrir, onMarcar }) {
  const tipo = estadoNotificacion(n)
  const navegable = !!destinoNotificacion(n)
  const autor = n.autor?.nombre || 'Un usuario eliminado'
  const tarea = n.tarea?.titulo
  return (
    <li className={`rounded-xl border px-3 py-2.5 ${n.leida ? 'bg-white' : 'bg-[#F3FAF7]'}`}
      style={{ borderColor: n.leida ? 'rgba(15,110,86,0.08)' : 'rgba(29,158,117,0.35)' }}>
      <div className="flex items-start gap-2.5">
        <span className="relative w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#E1F5EE]" aria-hidden="true">
          <AtSign size={14} className="text-[#0F6E56]" />
          {!n.leida && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#1D9E75] ring-2 ring-white" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] leading-snug text-gray-800 break-words ${n.leida ? '' : 'font-medium'}`}>
            {tipo === 'sin_acceso' ? 'Te mencionaron en una tarea a la que ya no tenés acceso.'
              : tipo === 'comentario_eliminado' ? <><strong className="font-semibold">{autor}</strong> te mencionó en un comentario que fue eliminado{tarea && <> · <strong className="font-semibold">{tarea}</strong></>}</>
              : <><strong className="font-semibold">{autor}</strong> te mencionó en <strong className="font-semibold">{tarea}</strong></>}
          </p>
          {tipo === 'mencion_quitada' && <p className="text-[12px] text-gray-500 mt-0.5">La mención fue quitada del comentario.</p>}
          <p className="text-[11.5px] text-gray-500 mt-0.5">
            <time dateTime={n.created_at}>{fmtFechaHora(n.created_at)}</time> · {n.leida ? 'Leída' : <span className="font-medium text-[#0F6E56]">Sin leer</span>}
          </p>
        </div>
      </div>
      {(navegable || !n.leida) && (
        <div className="flex justify-end gap-1 mt-1.5">
          {!n.leida && (
            <button type="button" onClick={onMarcar} disabled={marcando}
              className={`inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60 ${FOCO}`}
              aria-label="Marcar como leída">
              <Check size={13} aria-hidden="true" /> {marcando ? 'Marcando…' : 'Marcar como leída'}
            </button>
          )}
          {navegable && (
            <button type="button" onClick={onAbrir}
              className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-[#0F6E56] hover:bg-[#E1F5EE] ${FOCO}`}
              aria-label={tarea ? `Abrir la tarea ${tarea}` : 'Abrir la tarea'}>
              {tipo === 'comentario_eliminado' ? 'Ver tarea' : 'Ver comentario'} <ArrowRight size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </li>
  )
}
