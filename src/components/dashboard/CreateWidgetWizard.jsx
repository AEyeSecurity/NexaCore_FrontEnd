import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, AlertCircle, Check, Hash, AreaChart, BarChart3, List, LineChart, Gauge,
  Search, RefreshCw,
} from 'lucide-react'
import { api } from '../../lib/api'
import {
  resolveWidget, INDICATOR_WIDGET_ID, PERIOD_LABELS, WIDGET_CATALOG,
  ALERT_TYPE_LABELS, PROTOCOLOS_LIMITE,
} from './widgetCatalog'
import { DEFAULT_TILE_SIZE } from './widgetSizes'
import {
  buildWizardModules, periodOptions, indicatorPeriodsFor, chartCardsFor,
  INDICATOR_MODULE,
} from './wizardCatalog'
import { PERSPECTIVA_LABELS, FRECUENCIA_LABELS, mensajeErrorHttp } from '../../modules/indicadores/constants'
import WidgetCard from './WidgetCard'

const VIZ_ICON = { kpi: Hash, area: AreaChart, bar: BarChart3, list: List, line: LineChart, gauge: Gauge }

const BORDER = 'rgba(15,110,86,0.15)'
const GREEN = '#0F6E56'

const optionStyle = (selected) => ({
  borderColor: selected ? '#04342C' : BORDER,
  background: selected ? '#F6FAF8' : '#fff',
  borderWidth: selected ? 1.5 : 1,
})

function Stepper({ step, steps }) {
  return (
    <div className="flex items-center mt-4">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors"
                style={
                  done
                    ? { background: '#1D9E75', color: '#fff' }
                    : active
                      ? { background: '#04342C', color: '#fff' }
                      : { background: '#EDF1EF', color: '#8B9A91' }
                }
              >
                {done ? <Check size={12} strokeWidth={3} /> : n}
              </span>
              <span
                className="text-[11.5px] whitespace-nowrap"
                style={active ? { color: '#16211B', fontWeight: 600 } : { color: '#8B9A91' }}
              >
                {label}
              </span>
            </div>
            {n < steps.length && (
              <span className="flex-1 h-px mx-2" style={{ background: BORDER }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function StepHeading({ title, desc }) {
  return (
    <div className="mb-4">
      <p className="text-[15px] font-bold text-gray-900">{title}</p>
      <p className="text-[13px] text-gray-400 mt-0.5">{desc}</p>
    </div>
  )
}

function RadioDot({ selected }) {
  return (
    <span
      className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0"
      style={selected ? { background: '#04342C', borderColor: '#04342C', color: '#fff' } : { borderColor: BORDER }}
    >
      {selected && <Check size={12} strokeWidth={3} />}
    </span>
  )
}

export default function CreateWidgetWizard({
  open, savedWidgets,
  saving, saveError, onCancel, onSave,
}) {
  const [step, setStep] = useState(1)
  const [moduleId, setModuleId] = useState(null)
  const [metricId, setMetricId] = useState(null)
  const [periodId, setPeriodId] = useState(null)
  const [chartType, setChartType] = useState(null)
  // Alertas: tipos marcados + horizonte (reemplazan al período).
  const [alertTypes, setAlertTypes] = useState([])
  const [horizonDays, setHorizonDays] = useState(null)
  // Flujo "Indicador": indicador elegido + listado de activos del backend.
  const [indicatorId, setIndicatorId] = useState(null)
  const [indicadores, setIndicadores] = useState({ loading: false, error: null, data: null })
  const [indicatorSearch, setIndicatorSearch] = useState('')
  // Catálogo del backend (GET /api/dashboard/catalogo), una vez por apertura.
  const [catalogo, setCatalogo] = useState({ loading: false, error: null, data: null })
  // Vista previa de Protocolos con datos reales, una respuesta por period.
  const [protoPreview, setProtoPreview] = useState({})
  const [protoRetry, setProtoRetry] = useState(0)
  const protoRequested = useRef(new Set())

  const loadCatalogo = useCallback(() => {
    setCatalogo({ loading: true, error: null, data: null })
    api.getDashboardCatalogo()
      .then(res => setCatalogo({ loading: false, error: null, data: res }))
      .catch(err => setCatalogo({ loading: false, error: err.message || 'No se pudo cargar el catálogo', data: null }))
  }, [])

  useEffect(() => {
    if (open) {
      setStep(1)
      setModuleId(null)
      setMetricId(null)
      setPeriodId(null)
      setChartType(null)
      setAlertTypes([])
      setHorizonDays(null)
      setIndicatorId(null)
      setIndicatorSearch('')
      setIndicadores({ loading: false, error: null, data: null })
      setProtoPreview({})
      protoRequested.current = new Set()
      loadCatalogo()
    }
  }, [open, loadCatalogo])

  const allModules = useMemo(
    () => buildWizardModules(catalogo.data),
    [catalogo.data]
  )
  const currentModule = allModules.find(m => m.id === moduleId) || null
  const metrics = currentModule?.metrics || []
  const isIndicator = moduleId === INDICATOR_MODULE
  // En Indicador la métrica es única (indicador_kpi); el paso 2 elige el indicador.
  const metric = isIndicator
    ? (metrics.find(m => m.id === INDICATOR_WIDGET_ID) || null)
    : (metrics.find(m => m.id === metricId) || null)
  const usesHorizon = !!metric?.usesHorizon

  // Solo indicadores activos (default de GET /api/indicadores): uno
  // desactivado nunca se ofrece para un mosaico nuevo. Se pide una vez por
  // apertura del asistente.
  useEffect(() => {
    if (!open || !isIndicator || indicadores.data || indicadores.loading || indicadores.error) return
    setIndicadores({ loading: true, error: null, data: null })
    api.getIndicadores()
      .then(res => setIndicadores({ loading: false, error: null, data: Array.isArray(res?.data) ? res.data : [] }))
      .catch(err => setIndicadores({ loading: false, error: err, data: null }))
  }, [open, isIndicator, indicadores.data, indicadores.loading, indicadores.error])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKeyDown)
    const main = document.getElementById('app-main')
    if (main) main.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (main) main.style.overflow = ''
    }
  }, [open, onCancel])

  const indicator = useMemo(
    () => (indicadores.data || []).find(i => i.id === indicatorId) || null,
    [indicadores.data, indicatorId]
  )
  const periods = isIndicator
    ? (indicator ? indicatorPeriodsFor(indicator.frecuencia, metric?.periods) : [])
    : (metric?.periods || [])
  const allPeriodOptions = periodOptions(metric?.periods)
  const filteredIndicadores = useMemo(() => {
    const q = indicatorSearch.trim().toLowerCase()
    const list = indicadores.data || []
    return q ? list.filter(i => i.nombre.toLowerCase().includes(q)) : list
  }, [indicadores.data, indicatorSearch])

  // Mosaico de referencia para la vista previa.
  const previewWidget = useMemo(() => {
    if (isIndicator) {
      if (!indicatorId) return null
      return resolveWidget({
        id: INDICATOR_WIDGET_ID,
        instanceId: 'preview',
        indicatorId,
        size: DEFAULT_TILE_SIZE,
        period: periodId || metric?.defaultPeriod || '12m',
        chartType: chartType || metric?.defaultChartType || 'kpi',
      })
    }
    if (!metric) return null
    if (metric.usesHorizon) {
      if (!alertTypes.length) return null
      return resolveWidget({
        id: metric.id,
        instanceId: 'preview',
        size: DEFAULT_TILE_SIZE,
        chartType: 'list',
        alertTypes,
        horizonDays: horizonDays || metric.defaultHorizon,
      })
    }
    return resolveWidget({
      id: metric.id,
      instanceId: 'preview',
      size: DEFAULT_TILE_SIZE,
      period: periodId || metric.defaultPeriod || 'month',
      chartType: chartType || metric.defaultChartType,
    })
  }, [isIndicator, indicatorId, metric, periodId, chartType, alertTypes, horizonDays])

  // Protocolos: la vista previa usa datos reales (un solo pedido por period).
  const previewProtoPeriod = previewWidget?.group === 'protocolos' ? previewWidget.period : null
  useEffect(() => {
    if (!open || !previewProtoPeriod || protoRequested.current.has(previewProtoPeriod)) return
    protoRequested.current.add(previewProtoPeriod)
    const p = previewProtoPeriod
    setProtoPreview(prev => ({ ...prev, [p]: { loading: true, error: null, data: null } }))
    api.getDashboardProtocolos({ period: p, limite: PROTOCOLOS_LIMITE })
      .then(data => setProtoPreview(prev => ({ ...prev, [p]: { loading: false, error: null, data } })))
      .catch(err => setProtoPreview(prev => ({ ...prev, [p]: { loading: false, error: err.message || 'No se pudo cargar', data: null } })))
  }, [open, previewProtoPeriod, protoRetry])

  if (!open) return null
  const root = document.getElementById('app-main')
  if (!root) return null

  const resetSelection = () => {
    setMetricId(null)
    setIndicatorId(null)
    setPeriodId(null)
    setChartType(null)
    setAlertTypes([])
    setHorizonDays(null)
  }

  const applyMetricDefaults = (m) => {
    if (!m) return
    setChartType(m.defaultChartType)
    if (m.usesHorizon) {
      setPeriodId(null)
      setAlertTypes([...(m.alertTypes || [])])
      setHorizonDays(m.defaultHorizon ?? m.horizons?.[0] ?? null)
    } else {
      setPeriodId(m.periods?.includes(m.defaultPeriod) ? m.defaultPeriod : (m.periods?.[0] ?? null))
    }
  }

  const selectModule = (id) => {
    if (id === moduleId) return
    setModuleId(id)
    resetSelection()
    // Un módulo con una sola métrica (ej. Alertas) la deja elegida.
    const mod = allModules.find(m => m.id === id)
    if (id !== INDICATOR_MODULE && mod?.metrics.length === 1) {
      setMetricId(mod.metrics[0].id)
      applyMetricDefaults(mod.metrics[0])
    }
  }

  const selectIndicator = (ind) => {
    setIndicatorId(ind.id)
    const compatibles = indicatorPeriodsFor(ind.frecuencia, metric?.periods)
    // Si el período elegido no es compatible con la frecuencia del nuevo
    // indicador, se toma el default (o el primero compatible).
    setPeriodId(prev => {
      if (prev && compatibles.includes(prev)) return prev
      if (compatibles.includes(metric?.defaultPeriod)) return metric.defaultPeriod
      return compatibles[0] ?? null
    })
    setChartType(prev => prev || metric?.defaultChartType || 'kpi')
  }

  const selectMetric = (id) => {
    setMetricId(id)
    // Cambiar de métrica: período/visualización vuelven a los defaults de la nueva.
    applyMetricDefaults(metrics.find(m => m.id === id))
  }

  const selectPeriod = (id) => {
    if (!periods.includes(id)) return
    setPeriodId(id)
  }

  const toggleAlertType = (t) => {
    setAlertTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const allowedChartTypes = metric?.chartTypes || []
  const selectChartType = (id) => {
    if (!allowedChartTypes.includes(id)) return
    setChartType(id)
  }

  const stepValid =
    step === 1 ? !!currentModule :
    step === 2 ? (isIndicator ? !!indicatorId && !!metric : !!metric) :
    step === 3 ? (usesHorizon ? alertTypes.length > 0 && !!horizonDays : !!periodId && periods.includes(periodId)) :
    !!chartType && allowedChartTypes.includes(chartType)

  const isLast = step === 4
  const steps = ['Módulo', 'Métrica', usesHorizon ? 'Horizonte' : 'Período', 'Visualización']

  const handleNext = () => {
    if (!stepValid) return
    if (!isLast) { setStep(step + 1); return }
    // Cada "Agregar al panel" crea SIEMPRE una instancia nueva (instanceId
    // único generado en el click, no en render). No se deduplica por id.
    const base = { id: metric.id, instanceId: crypto.randomUUID(), size: DEFAULT_TILE_SIZE }
    let nuevo
    if (isIndicator) {
      nuevo = { ...base, period: periodId, chartType, indicatorId }
    } else if (usesHorizon) {
      // Alertas: sin `period`.
      nuevo = { ...base, chartType: 'list', alertTypes: [...alertTypes], horizonDays }
    } else {
      nuevo = { ...base, period: periodId, chartType }
    }
    onSave([...(savedWidgets || []), nuevo])
  }
  const handleBack = () => { if (step > 1) setStep(step - 1) }

  const recommended = metric?.defaultChartType || null
  const chartCards = chartCardsFor(metric, isIndicator)

  const previewGroupState = previewWidget?.group === 'protocolos'
    ? (protoPreview[previewWidget.period] || { loading: true, error: null, data: null })
    : { loading: true, error: null, data: null }
  const previewIsLive = isIndicator || usesHorizon || previewWidget?.group === 'protocolos'
  const previewTall = previewWidget && (isIndicator || usesHorizon || previewWidget.chartType === 'list' || previewWidget.chartType === 'gauge')

  const metricTitle = previewWidget?.title || (metric ? WIDGET_CATALOG[metric.id]?.title : '') || ''

  return createPortal(
    <div className="absolute inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(10, 82, 64, 0.18)' }}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear gráfico personalizado"
        className="font-sans [&_.font-serif]:font-sans relative bg-white shadow-2xl w-full sm:w-[460px] max-w-[92vw] h-full flex flex-col fade-in"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div className="flex items-start justify-between">
            <h2 className="font-sans text-[19px] font-semibold text-gray-900">Crear gráfico personalizado</h2>
            <button
              onClick={onCancel}
              aria-label="Cerrar panel"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
          <Stepper step={step} steps={steps} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Paso 1: Módulo ─────────────────────────────── */}
          {step === 1 && (
            <div className="fade-in">
              <StepHeading
                title="¿De qué módulo querés el dato?"
                desc="Elegí el área del sistema de la que se va a generar el gráfico."
              />
              {catalogo.loading || (!catalogo.data && !catalogo.error) ? (
                <p className="flex items-center gap-2 text-[13px] text-gray-400"><RefreshCw size={13} className="animate-spin" /> Cargando módulos…</p>
              ) : catalogo.error ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="flex items-start gap-1.5 text-[13px] text-red-600"><AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {catalogo.error}</p>
                  <button onClick={loadCatalogo} className="flex items-center gap-1 text-[12px] font-medium text-gray-500 hover:text-gray-700">
                    <RefreshCw size={12} /> Reintentar
                  </button>
                </div>
              ) : allModules.length === 0 ? (
                <p className="text-[13px] text-gray-400">No tenés módulos habilitados con gráficos disponibles.</p>
              ) : (
                // 2 columnas, todas las tarjetas del mismo ancho y alto (h fija).
                // Con cantidad impar la última queda en una sola columna, a la izquierda.
                <div className="grid grid-cols-2 gap-2.5">
                  {allModules.map(m => {
                    const Icon = m.icon
                    const selected = moduleId === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => selectModule(m.id)}
                        className="h-[96px] text-left border rounded-xl p-3.5 flex flex-col justify-between transition-colors"
                        style={optionStyle(selected)}
                      >
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: m.color + '1A', color: m.color }}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="text-[13.5px] font-semibold text-gray-800 truncate">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Paso 2 (Indicador): elegir indicador activo ── */}
          {step === 2 && isIndicator && (
            <div className="fade-in">
              <StepHeading
                title="¿Qué indicador querés ver?"
                desc="Solo se muestran los indicadores activos."
              />
              {indicadores.loading || (!indicadores.data && !indicadores.error) ? (
                <p className="flex items-center gap-2 text-[13px] text-gray-400"><RefreshCw size={13} className="animate-spin" /> Cargando indicadores…</p>
              ) : indicadores.error ? (
                <p className="flex items-start gap-1.5 text-[13px] text-red-600"><AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {mensajeErrorHttp(indicadores.error, 'accion')}</p>
              ) : indicadores.data.length === 0 ? (
                <p className="text-[13px] text-gray-400">No hay indicadores creados. Crealos desde la sección Indicadores.</p>
              ) : (
                <>
                  <div className="relative mb-2.5">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={indicatorSearch}
                      onChange={e => setIndicatorSearch(e.target.value)}
                      placeholder="Buscar indicador…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
                      style={{ borderColor: 'rgba(15,110,86,0.25)' }}
                    />
                  </div>
                  {filteredIndicadores.length === 0 ? (
                    <p className="text-[13px] text-gray-400">Ningún indicador coincide con la búsqueda.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredIndicadores.map(ind => {
                        const selected = indicatorId === ind.id
                        return (
                          <button
                            key={ind.id}
                            onClick={() => selectIndicator(ind)}
                            className="text-left border rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 transition-colors"
                            style={optionStyle(selected)}
                          >
                            <span className="min-w-0">
                              <span className="block text-[14px] font-semibold text-gray-800 truncate">{ind.nombre}</span>
                              <span className="block text-[11.5px] text-gray-400 mt-0.5">
                                {PERSPECTIVA_LABELS[ind.perspectiva] ?? ind.perspectiva} · {FRECUENCIA_LABELS[ind.frecuencia] ?? ind.frecuencia}
                              </span>
                            </span>
                            <RadioDot selected={selected} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Paso 2: Métrica ────────────────────────────── */}
          {step === 2 && !isIndicator && (
            <div className="fade-in">
              <StepHeading
                title="¿Qué querés medir?"
                desc="Estas son las métricas disponibles para el módulo elegido."
              />
              {metrics.length === 0 ? (
                <p className="text-[13px] text-gray-400">No hay métricas disponibles para este módulo.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {metrics.map(m => {
                    const selected = metricId === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => selectMetric(m.id)}
                        className="text-left border rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 transition-colors"
                        style={optionStyle(selected)}
                      >
                        <span>
                          <span className="block text-[14px] font-semibold text-gray-800">{m.label}</span>
                          {m.tag && <span className="block text-[10.5px] text-gray-400 uppercase tracking-wide mt-0.5">{m.tag}</span>}
                        </span>
                        <RadioDot selected={selected} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Paso 3: Horizonte (Alertas) ────────────────── */}
          {step === 3 && usesHorizon && metric && (
            <div className="fade-in">
              <StepHeading
                title="¿Qué alertas y con cuánta anticipación?"
                desc="Elegí los tipos de vencimiento y cuántos días hacia adelante mirar."
              />
              <p className="text-[12.5px] font-semibold text-gray-500 mb-2">Tipos de alerta</p>
              <div className="flex flex-col gap-2">
                {(metric.alertTypes || []).map(t => {
                  const checked = alertTypes.includes(t)
                  return (
                    <label
                      key={t}
                      className="border rounded-xl px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors"
                      style={optionStyle(checked)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAlertType(t)}
                        className="w-4 h-4 accent-[#04342C]"
                      />
                      <span className="text-[14px] font-semibold text-gray-800">{ALERT_TYPE_LABELS[t] || t}</span>
                    </label>
                  )
                })}
              </div>
              {alertTypes.length === 0 && (
                <p className="text-[11.5px] text-amber-700 mt-2">Marcá al menos un tipo de alerta.</p>
              )}

              <p className="text-[12.5px] font-semibold text-gray-500 mt-5 mb-2">Horizonte</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Horizonte en días">
                {(metric.horizons || []).map(h => {
                  const selected = horizonDays === h
                  return (
                    <button
                      key={h}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setHorizonDays(h)}
                      className="border rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-800 transition-colors"
                      style={optionStyle(selected)}
                    >
                      {h} días
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Paso 3: Período ────────────────────────────── */}
          {step === 3 && !usesHorizon && (
            <div className="fade-in">
              <StepHeading
                title="¿Qué período querés analizar?"
                desc="Definí la ventana de tiempo que va a mostrar el gráfico."
              />
              <div className="flex flex-col gap-2">
                {allPeriodOptions.map(p => {
                  const selected = periodId === p.id
                  // Indicador: solo ventanas compatibles con su frecuencia.
                  const enabled = periods.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectPeriod(p.id)}
                      disabled={!enabled}
                      className="text-left border rounded-xl px-3.5 py-3 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed"
                      style={{ ...optionStyle(selected), color: '#16211B', opacity: enabled ? 1 : 0.4 }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              {isIndicator && indicator && periods.length < allPeriodOptions.length && (
                <p className="text-[11.5px] text-gray-400 mt-2.5">
                  El indicador tiene frecuencia {(FRECUENCIA_LABELS[indicator.frecuencia] || '').toLowerCase()}: solo se habilitan las ventanas que abarcan al menos un período completo.
                </p>
              )}
              {(metric?.id === 'protocolos_activos' || metric?.id === 'protocolos_sin_registros') && (
                <p className="text-[11.5px] text-gray-400 mt-2.5">
                  Esta métrica no depende del período: siempre muestra la situación actual.
                </p>
              )}
            </div>
          )}

          {/* ── Paso 4: Visualización ──────────────────────── */}
          {step === 4 && metric && (!isIndicator || indicator) && (
            <div className="fade-in">
              <StepHeading
                title="¿Cómo lo querés visualizar?"
                desc="Marcamos con una etiqueta el formato recomendado, pero podés elegir cualquiera de los habilitados."
              />
              <div className="grid grid-cols-2 gap-2.5">
                {chartCards.map(v => {
                  const Icon = VIZ_ICON[v.id] || Hash
                  const enabled = allowedChartTypes.includes(v.id)
                  const selected = chartType === v.id
                  const isRecommended = recommended === v.id
                  return (
                    <button
                      key={v.id}
                      disabled={!enabled}
                      onClick={() => selectChartType(v.id)}
                      className="border rounded-xl p-3.5 flex flex-col items-center gap-2 relative transition-colors disabled:cursor-not-allowed"
                      style={{ ...optionStyle(selected), opacity: enabled ? 1 : 0.4 }}
                    >
                      {isRecommended && (
                        <span
                          className="absolute -top-2 right-3 text-[9.5px] font-bold text-white px-2 py-0.5 rounded-full"
                          style={{ background: '#1D9E75' }}
                        >
                          Recomendado
                        </span>
                      )}
                      <Icon size={20} style={{ color: enabled ? GREEN : '#9CA3AF' }} />
                      <span className="text-[12.5px] font-semibold text-gray-800">{v.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11.5px] text-gray-400 mt-2.5">
                {chartCards.find(v => v.id === chartType)?.hint}
              </p>

              <label className="text-[12.5px] font-semibold text-gray-500 mt-5 mb-2 block">Título del mosaico</label>
              <input
                type="text"
                value={isIndicator
                  ? `${indicator?.nombre || ''} · ${(PERIOD_LABELS[periodId] || '').toLowerCase()}`
                  : metricTitle}
                readOnly
                className="w-full border rounded-xl px-3 py-2.5 text-[14px] text-gray-700 bg-gray-50"
                style={{ borderColor: BORDER }}
              />
              <p className="text-[11.5px] text-gray-400 mt-1.5">
                {isIndicator
                  ? 'El título lo define el mosaico según el indicador y el período.'
                  : usesHorizon
                    ? 'El título lo define el mosaico según el horizonte elegido.'
                    : 'El título lo define el mosaico según la métrica y el período.'}
              </p>
            </div>
          )}

          {/* ── Vista previa ───────────────────────────────── */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: BORDER }}>
            <p className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Vista previa</p>
            {previewWidget ? (
              <>
                <div className={previewTall ? 'h-[280px]' : 'h-[190px]'}>
                  <WidgetCard
                    key={`${previewWidget.id}:${previewWidget.chartType}`}
                    widget={previewWidget}
                    groupState={previewGroupState}
                    onRetry={() => {
                      if (!previewProtoPeriod) return
                      protoRequested.current.delete(previewProtoPeriod)
                      setProtoRetry(n => n + 1)
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  {isIndicator
                    ? 'Valores reales del indicador para el período elegido.'
                    : previewIsLive
                      ? 'Valores reales con la configuración elegida.'
                      : 'Estructura del mosaico. Los valores reales se calculan al agregarlo al panel.'}
                </p>
              </>
            ) : (
              <div
                className="border border-dashed rounded-2xl min-h-[120px] flex items-center justify-center text-[13px] text-gray-400 text-center px-6"
                style={{ borderColor: BORDER }}
              >
                {isIndicator
                  ? 'Elegí un indicador para ver la vista previa'
                  : usesHorizon
                    ? 'Marcá al menos un tipo de alerta para ver la vista previa'
                    : 'Elegí un módulo y una métrica para ver la vista previa'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          {saveError && (
            <div role="alert" className="flex items-start gap-1.5 text-[12px] text-red-600 mb-3">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2.5">
            <button
              onClick={handleBack}
              disabled={step === 1 || saving}
              className="px-4 py-2.5 rounded-xl border text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: BORDER }}
            >
              Atrás
            </button>
            <div className="flex items-center gap-2.5">
              <button
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                style={{ borderColor: BORDER }}
              >
                Cancelar
              </button>
              <button
                onClick={handleNext}
                disabled={!stepValid || saving}
                className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: GREEN }}
              >
                {isLast ? (saving ? 'Guardando…' : 'Agregar al panel') : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    root
  )
}
