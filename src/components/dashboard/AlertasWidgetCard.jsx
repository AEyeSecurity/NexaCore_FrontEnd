import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, Bell, ChevronRight, CheckCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { resolverDestino } from '../../lib/alertasStore'

// Mosaico `alertas_proximas`. Datos de GET /api/alertas/proximas?tipos=&horizonte=
// (el backend omite sin error los tipos sin permiso). Caché en memoria por
// tipos+horizonte: dos instancias iguales comparten un solo pedido.

const CACHE_TTL_MS = 60 * 1000
const cache = new Map() // key → { ts, promise }

function fetchAlertas(tipos, horizonte, { force = false } = {}) {
  const key = `${[...tipos].sort().join(',')}|${horizonte}`
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.promise
  const promise = api.getAlertasProximas({ tipos, horizonte })
  cache.set(key, { ts: Date.now(), promise })
  promise.catch(() => cache.delete(key))
  return promise
}

const SEVERIDAD = {
  vencida:     { color: '#C23B3A', fondo: '#FCE9E9', label: 'Vencida' },
  proxima:     { color: '#92400E', fondo: '#FEF3C7', label: 'Próxima' },
  informativa: { color: '#1D4ED8', fondo: '#EFF6FF', label: 'Informativa' },
}

const dias = (n) => `${n} ${n === 1 ? 'día' : 'días'}`

function textoDias(d) {
  const n = Number(d)
  if (!Number.isFinite(n)) return ''
  if (n < 0) return `Vencida hace ${dias(Math.abs(n))}`
  if (n === 0) return 'Vence hoy'
  return `Vence en ${dias(n)}`
}

export function useAlertasProximas(tipos, horizonte) {
  const tiposKey = (tipos || []).join(',')
  const [state, setState] = useState({ loading: true, error: null, data: null })

  const load = useCallback((force = false) => {
    const lista = tiposKey ? tiposKey.split(',') : []
    if (!lista.length) {
      setState({ loading: false, error: null, data: { alertas: [], parcial: false } })
      return () => {}
    }
    let alive = true
    setState(prev => ({ ...prev, loading: true, error: null }))
    fetchAlertas(lista, horizonte, { force })
      .then(data => { if (alive) setState({ loading: false, error: null, data }) })
      .catch(err => { if (alive) setState({ loading: false, error: err.message || 'No se pudieron cargar las alertas', data: null }) })
    return () => { alive = false }
  }, [tiposKey, horizonte])

  useEffect(() => load(), [load])

  return { ...state, retry: () => load(true) }
}

export default function AlertasWidgetCard({ widget, onNavigate }) {
  const { loading, error, data, retry } = useAlertasProximas(widget.alertTypes, widget.horizonDays)
  const alertas = Array.isArray(data?.alertas) ? data.alertas : []

  const ir = (a) => {
    const destino = resolverDestino({ modulo: a?.referencia?.modulo, seccion: a?.referencia?.seccion })
    if (destino && onNavigate) onNavigate(destino.page, destino.opts)
  }

  return (
    <div className="h-full min-h-[190px] rounded-2xl p-5 shadow-sm bg-white flex flex-col"
      style={{ borderTop: '3px solid #0F6E56' }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E1F5EE' }}>
          <Bell size={17} style={{ color: '#0F6E56' }} />
        </div>
        <div className="min-w-0">
          <h3 className="font-serif font-semibold text-[14px] text-gray-800 truncate">Alertas próximas</h3>
          <p className="text-[11px] text-gray-400">Próximos {widget.horizonDays} días</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[12px]" style={{ color: '#0F6E56', opacity: 0.4 }}>
            Cargando···
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-start justify-center gap-2">
            <div className="flex items-start gap-1.5 text-[12px] text-red-600">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button onClick={retry} className="flex items-center gap-1 text-[11.5px] font-medium text-gray-500 hover:text-gray-700">
              <RefreshCw size={11} /> Reintentar
            </button>
          </div>
        ) : (
          <>
            {data?.parcial && (
              <p className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
                <AlertCircle size={12} className="flex-shrink-0" /> Algunas alertas no se pudieron cargar
              </p>
            )}
            {alertas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
                <CheckCircle size={20} style={{ color: '#1D9E75' }} />
                <p className="text-[12.5px] text-gray-500">No hay alertas en los próximos {widget.horizonDays} días</p>
              </div>
            ) : (
              <ul className="flex-1 min-h-0 overflow-y-auto max-h-[280px] space-y-1.5 -mr-2 pr-2">
                {alertas.map(a => {
                  const cfg = SEVERIDAD[a.severidad] || SEVERIDAD.informativa
                  const navegable = !!onNavigate && !!resolverDestino({ modulo: a?.referencia?.modulo, seccion: a?.referencia?.seccion })
                  const contenido = (
                    <>
                      <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: cfg.color }} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-gray-800 truncate" title={a.titulo}>{a.titulo}</span>
                        {a.detalle && <span className="block text-[11px] text-gray-500 truncate" title={a.detalle}>{a.detalle}</span>}
                        <span className="inline-block mt-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: cfg.fondo, color: cfg.color }}>
                          <span className="sr-only">{cfg.label}: </span>{textoDias(a.dias_restantes)}
                        </span>
                      </span>
                      {navegable && <ChevronRight size={14} className="text-gray-400 flex-shrink-0 self-center" aria-hidden="true" />}
                    </>
                  )
                  return (
                    <li key={a.id ?? `${a.tipo}:${a?.referencia?.id}`}>
                      {navegable ? (
                        <button type="button" onClick={() => ir(a)}
                          className="w-full text-left flex gap-2.5 rounded-xl border px-2.5 py-2 transition-colors hover:bg-gray-50 outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]"
                          style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
                          {contenido}
                        </button>
                      ) : (
                        <div className="flex gap-2.5 rounded-xl border px-2.5 py-2" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
                          {contenido}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
