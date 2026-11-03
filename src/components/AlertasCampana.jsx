import { useEffect, useId, useRef, useState } from 'react'
import { Bell, RefreshCw, X, AlertTriangle, AlertCircle, Info, ArrowRight, CheckCircle } from 'lucide-react'
import { useAlertas, refrescarAlertas, asegurarAlertas, descartarAlerta } from '../lib/alertas'
import { resolverDestino, agruparPorModulo, alertasVisibles } from '../lib/alertasStore'

// Campana + panel de alertas dinámicas (GET /api/alertas). Se usa en la barra
// superior de Inicio (`tono="claro"`) y en la del Layout (`tono="oscuro"`); el
// estado es uno solo para toda la sesión (lib/alertas.js). El backend ya filtra
// las alertas según los permisos del usuario: acá solo se muestran.

const MODULO_LABEL = { finance: 'Finanzas', operations: 'Operativo', indicadores: 'Indicadores' }
const FUENTE_LABEL = { deudas: 'Deudas', comprobantes: 'Comprobantes', tareas: 'Tareas', indicadores: 'Indicadores' }

const SEVERIDAD_CFG = {
  alta:  { icon: AlertTriangle, color: '#C23B3A', fondo: '#FCE9E9', label: 'Prioridad alta' },
  media: { icon: AlertCircle,   color: '#92400E', fondo: '#FEF3C7', label: 'Atención' },
  info:  { icon: Info,          color: '#0F6E56', fondo: '#E1F5EE', label: 'Información' },
}

function fmtHora(iso) {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null
}

export default function AlertasCampana({ userKey, onNavigate, tono = 'oscuro' }) {
  const estado = useAlertas(userKey)
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef(null)
  const botonRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()

  // El contador refleja solo las alertas visibles (sin las descartadas).
  const visibles = alertasVisibles(estado)
  const total = visibles.length
  const hayAlta = visibles.some(a => a.severidad === 'alta')
  const cargando = !estado || estado.status === 'loading'
  const errorTotal = estado?.status === 'error'

  const cerrar = (devolverFoco = false) => {
    setAbierto(false)
    if (devolverFoco) botonRef.current?.focus()
  }

  // Al abrir: revalidar si la última respuesta no es reciente, y llevar el foco al panel.
  useEffect(() => {
    if (!abierto) return
    asegurarAlertas(userKey)
    panelRef.current?.focus()
  }, [abierto, userKey])

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

  const oscuro = tono === 'oscuro'
  const etiqueta = cargando ? 'Alertas (cargando)'
    : errorTotal ? 'Alertas (no se pudieron cargar)'
    : total > 0 ? `Alertas: ${total} ${total === 1 ? 'situación activa' : 'situaciones activas'}`
    : 'Alertas: sin alertas activas'

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(v => !v)}
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
        {!cargando && !errorTotal && total > 0 && (
          <span aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: hayAlta ? '#E24B4A' : '#EF9F27', boxShadow: `0 0 0 2px ${oscuro ? '#04342C' : '#fff'}` }}>
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
          aria-label="Alertas"
          tabIndex={-1}
          className="fixed left-3 right-3 top-[64px] max-h-[calc(100vh-160px)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px] sm:max-h-[min(560px,calc(100vh-88px))] z-50 bg-white rounded-2xl border shadow-xl flex flex-col fade-in outline-none"
          style={{ borderColor: 'rgba(15,110,86,0.12)' }}
        >
          <PanelAlertas estado={estado} userKey={userKey} onCerrar={() => cerrar(true)} onIr={irA} onDescartar={descartar} />
        </div>
      )}
    </div>
  )
}

function PanelAlertas({ estado, userKey, onCerrar, onIr, onDescartar }) {
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
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-gray-900 text-[15px] leading-tight">Alertas</h2>
          <p className="text-[11.5px] text-gray-400 mt-0.5">
            {cargando ? 'Cargando…'
              : errorTotal ? 'No disponibles'
              : `${total} ${total === 1 ? 'situación activa' : 'situaciones activas'}${ocultas > 0 ? ` · ${ocultas} ${ocultas === 1 ? 'descartada' : 'descartadas'}` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={() => refrescarAlertas(userKey)} disabled={actualizando}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#0F6E56] hover:bg-[#E1F5EE] transition-colors disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]"
            title="Actualizar" aria-label="Actualizar alertas">
            <RefreshCw size={14} className={actualizando ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={onCerrar}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]"
            title="Cerrar" aria-label="Cerrar alertas">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Contenido */}
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
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] font-medium flex-shrink-0 transition-colors hover:bg-[#E1F5EE] outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]"
          style={{ color: '#0F6E56' }} aria-label={`Ir a ${alerta.titulo}`}>
          Ver <ArrowRight size={12} />
        </button>
      )}
      {/* Solo oculta la alerta en esta sesión; no cambia nada en el sistema */}
      <button type="button" onClick={() => onDescartar(alerta)}
        className="-mt-1 -mr-1.5 p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]"
        title="Descartar alerta" aria-label={`Descartar alerta: ${alerta.titulo}`}>
        <X size={12} />
      </button>
    </li>
  )
}
