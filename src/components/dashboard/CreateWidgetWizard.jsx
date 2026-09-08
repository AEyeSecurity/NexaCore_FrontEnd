import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, Check, Hash, AreaChart, BarChart3, List } from 'lucide-react'
import { resolveWidget } from './widgetCatalog'
import { DEFAULT_TILE_SIZE } from './widgetSizes'
import {
  WIZARD_MODULES, WIZARD_PERIODS, CHART_TYPE_CARDS,
  familiesForModule, defaultChartTypeFor,
} from './wizardCatalog'
import WidgetCard from './WidgetCard'

const STEPS = ['Módulo', 'Métrica', 'Período', 'Visualización']

const VIZ_ICON = { kpi: Hash, area: AreaChart, bar: BarChart3, list: List }

const BORDER = 'rgba(15,110,86,0.15)'
const GREEN = '#0F6E56'

function Stepper({ step }) {
  return (
    <div className="flex items-center mt-4">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
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
            {n < STEPS.length && (
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

export default function CreateWidgetWizard({
  open, savedWidgets, allowedModules, userRole,
  saving, saveError, onCancel, onSave,
}) {
  const [step, setStep] = useState(1)
  const [moduleId, setModuleId] = useState(null)
  const [familyId, setFamilyId] = useState(null)
  const [periodId, setPeriodId] = useState(null)
  const [chartType, setChartType] = useState(null)

  useEffect(() => {
    if (open) {
      setStep(1)
      setModuleId(null)
      setFamilyId(null)
      setPeriodId(null)
      setChartType(null)
    }
  }, [open])

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

  const modules = useMemo(
    () => WIZARD_MODULES.filter(m => allowedModules?.includes(m.id)),
    [allowedModules]
  )
  const families = useMemo(
    () => (moduleId ? familiesForModule(moduleId, allowedModules, userRole) : []),
    [moduleId, allowedModules, userRole]
  )
  const family = useMemo(
    () => families.find(f => f.id === familyId) || null,
    [families, familyId]
  )

  // Mosaico de referencia para la vista previa (period/chartType provisorios
  // hasta que el usuario los elige).
  const previewWidget = useMemo(() => {
    if (!family) return null
    return resolveWidget({
      id: family.baseId,
      size: DEFAULT_TILE_SIZE,
      period: periodId || '6m',
      chartType: chartType || defaultChartTypeFor(family),
    })
  }, [family, periodId, chartType])

  if (!open) return null
  const root = document.getElementById('app-main')
  if (!root) return null

  const selectModule = (id) => {
    setModuleId(id)
    setFamilyId(null)
    setPeriodId(null)
    setChartType(null)
  }

  const selectFamily = (id) => {
    setFamilyId(id)
    // Cambiar de métrica: el chartType vuelve al recomendado de la nueva
    // métrica (descarta una selección que podría no ser compatible).
    const nextFam = families.find(f => f.id === id) || null
    setChartType(defaultChartTypeFor(nextFam))
  }

  const selectPeriod = (id) => setPeriodId(id)   // no toca chartType

  const selectChartType = (id) => {
    if (!family?.allowedChartTypes?.includes(id)) return
    setChartType(id)
  }

  const stepValid =
    step === 1 ? !!moduleId :
    step === 2 ? !!familyId :
    step === 3 ? !!periodId :
    !!chartType

  const isLast = step === 4

  const handleNext = () => {
    if (!stepValid) return
    if (!isLast) { setStep(step + 1); return }
    // Cada "Agregar al panel" crea SIEMPRE una instancia nueva (instanceId
    // único generado en el click, no en render). No se deduplica por id:
    // pueden coexistir varias instancias del mismo mosaico.
    onSave([
      ...(savedWidgets || []),
      {
        id: family.baseId,
        instanceId: crypto.randomUUID(),
        size: DEFAULT_TILE_SIZE,
        period: periodId,
        chartType,
      },
    ])
  }
  const handleBack = () => { if (step > 1) setStep(step - 1) }

  const recommended = family ? defaultChartTypeFor(family) : null

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
        className="relative bg-white shadow-2xl w-full sm:w-[460px] max-w-[92vw] h-full flex flex-col fade-in"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-[19px] font-semibold text-gray-900">Crear gráfico personalizado</h2>
            <button
              onClick={onCancel}
              aria-label="Cerrar panel"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
          <Stepper step={step} />
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
              {modules.length === 0 ? (
                <p className="text-[13px] text-gray-400">No tenés módulos habilitados con gráficos disponibles.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {modules.map(m => {
                    const Icon = m.icon
                    const selected = moduleId === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => selectModule(m.id)}
                        className="text-left border rounded-xl p-3.5 flex flex-col gap-2 transition-colors"
                        style={{
                          borderColor: selected ? '#04342C' : BORDER,
                          background: selected ? '#F6FAF8' : '#fff',
                          borderWidth: selected ? 1.5 : 1,
                        }}
                      >
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: m.color + '1A', color: m.color }}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="text-[13.5px] font-semibold text-gray-800">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Paso 2: Métrica ────────────────────────────── */}
          {step === 2 && (
            <div className="fade-in">
              <StepHeading
                title="¿Qué querés medir?"
                desc="Estas son las métricas disponibles para el módulo elegido."
              />
              {families.length === 0 ? (
                <p className="text-[13px] text-gray-400">No hay métricas disponibles para este módulo.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {families.map(f => {
                    const selected = familyId === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => selectFamily(f.id)}
                        className="text-left border rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 transition-colors"
                        style={{
                          borderColor: selected ? '#04342C' : BORDER,
                          background: selected ? '#F6FAF8' : '#fff',
                          borderWidth: selected ? 1.5 : 1,
                        }}
                      >
                        <span>
                          <span className="block text-[14px] font-semibold text-gray-800">{f.label}</span>
                          <span className="block text-[10.5px] text-gray-400 uppercase tracking-wide mt-0.5">{f.tag}</span>
                        </span>
                        <span
                          className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0"
                          style={
                            selected
                              ? { background: '#04342C', borderColor: '#04342C', color: '#fff' }
                              : { borderColor: BORDER }
                          }
                        >
                          {selected && <Check size={12} strokeWidth={3} />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Paso 3: Período ────────────────────────────── */}
          {step === 3 && (
            <div className="fade-in">
              <StepHeading
                title="¿Qué período querés analizar?"
                desc="Definí la ventana de tiempo que va a mostrar el gráfico."
              />
              <div className="flex flex-col gap-2">
                {WIZARD_PERIODS.map(p => {
                  const selected = periodId === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectPeriod(p.id)}
                      className="text-left border rounded-xl px-3.5 py-3 text-[14px] font-semibold transition-colors"
                      style={{
                        borderColor: selected ? '#04342C' : BORDER,
                        background: selected ? '#F6FAF8' : '#fff',
                        borderWidth: selected ? 1.5 : 1,
                        color: '#16211B',
                      }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Paso 4: Visualización ──────────────────────── */}
          {step === 4 && family && (
            <div className="fade-in">
              <StepHeading
                title="¿Cómo lo querés visualizar?"
                desc="Marcamos con una etiqueta el formato recomendado, pero podés elegir cualquiera de los habilitados."
              />
              <div className="grid grid-cols-2 gap-2.5">
                {CHART_TYPE_CARDS.map(v => {
                  const Icon = VIZ_ICON[v.id]
                  const enabled = family.allowedChartTypes.includes(v.id)
                  const selected = chartType === v.id
                  const isRecommended = recommended === v.id
                  return (
                    <button
                      key={v.id}
                      disabled={!enabled}
                      onClick={() => selectChartType(v.id)}
                      className="border rounded-xl p-3.5 flex flex-col items-center gap-2 relative transition-colors disabled:cursor-not-allowed"
                      style={{
                        borderColor: selected ? '#04342C' : BORDER,
                        background: selected ? '#F6FAF8' : '#fff',
                        borderWidth: selected ? 1.5 : 1,
                        opacity: enabled ? 1 : 0.4,
                      }}
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
                {CHART_TYPE_CARDS.find(v => v.id === chartType)?.hint}
              </p>

              <label className="text-[12.5px] font-semibold text-gray-500 mt-5 mb-2 block">Título del mosaico</label>
              <input
                type="text"
                value={previewWidget?.title || ''}
                readOnly
                className="w-full border rounded-xl px-3 py-2.5 text-[14px] text-gray-700 bg-gray-50"
                style={{ borderColor: BORDER }}
              />
              <p className="text-[11.5px] text-gray-400 mt-1.5">
                El título lo define el mosaico según la métrica y el período.
              </p>
            </div>
          )}

          {/* ── Vista previa ───────────────────────────────── */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: BORDER }}>
            <p className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Vista previa</p>
            {previewWidget ? (
              <>
                <div className="h-[190px]">
                  <WidgetCard widget={previewWidget} groupState={{ loading: true, error: null, data: null }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Estructura del mosaico. Los valores reales se calculan al agregarlo al panel.
                </p>
              </>
            ) : (
              <div
                className="border border-dashed rounded-2xl min-h-[120px] flex items-center justify-center text-[13px] text-gray-400 text-center px-6"
                style={{ borderColor: BORDER }}
              >
                Elegí un módulo y una métrica para ver la vista previa
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          {saveError && (
            <div className="flex items-start gap-1.5 text-[12px] text-red-600 mb-3">
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
