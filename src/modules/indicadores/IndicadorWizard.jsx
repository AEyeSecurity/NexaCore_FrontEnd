import { useEffect, useMemo, useState } from 'react'
import { Check, AlertCircle, RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import SideDrawer from './SideDrawer'
import FormulaBuilder from './FormulaBuilder'
import IndicadorCard from './IndicadorCard'
import { useVariables } from './indicadoresData'
import { tokensFromFormula, formulaFromTokens, formulaLegible } from './formula'
import {
  PERSPECTIVAS, FRECUENCIAS, UNIDADES, SENTIDOS,
  PERSPECTIVA_LABELS, FRECUENCIA_LABELS, UNIDAD_LABELS, SENTIDO_LABELS, SENTIDO_HINTS,
  ESTADO_META, formatValor, mensajeErrorHttp,
} from './constants'

const STEPS = ['Información', 'Fórmula', 'Objetivo', 'Revisión']
const BORDER = 'rgba(15,110,86,0.15)'
const GREEN = '#0F6E56'
const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

// Límites de longitud del backend (indicators/config/indicadores.js). Se
// usan solo para feedback inmediato; el backend vuelve a validar todo.
const MIN_TEXTO = 2
const MAX_TEXTO = 150
const MAX_DESCRIPCION = 1000

const FORM_VACIO = {
  nombre: '', descripcion: '', perspectiva: '', responsable: '', frecuencia: '',
  unidad: '', sentido: 'MAYOR_ES_MEJOR', valor_objetivo: '', limite_aceptable: '',
}

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
                style={done ? { background: '#1D9E75', color: '#fff' } : active ? { background: '#04342C', color: '#fff' } : { background: '#EDF1EF', color: '#8B9A91' }}
              >
                {done ? <Check size={12} strokeWidth={3} /> : n}
              </span>
              <span className="text-[11.5px] whitespace-nowrap" style={active ? { color: '#16211B', fontWeight: 600 } : { color: '#8B9A91' }}>
                {label}
              </span>
            </div>
            {n < STEPS.length && <span className="flex-1 h-px mx-2" style={{ background: BORDER }} />}
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

function Field({ label, hint, error, children, counter }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-[12.5px] font-semibold text-gray-600">{label}</label>
        {counter}
      </div>
      {children}
      {error ? <p className="text-[11.5px] text-red-600 mt-1">{error}</p> : hint ? <p className="text-[11.5px] text-gray-400 mt-1">{hint}</p> : null}
    </div>
  )
}

function OptionGrid({ options, value, onChange, cols = 2 }) {
  return (
    <div className={`grid gap-2 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {options.map(o => {
        const selected = value === o.value
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="text-left border rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors"
            style={{ borderColor: selected ? '#04342C' : BORDER, background: selected ? '#F6FAF8' : '#fff', borderWidth: selected ? 1.5 : 1, color: '#16211B' }}>
            {o.label}
            {o.sub && <span className="block text-[11px] font-normal text-gray-400 mt-0.5">{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

function Resumen({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0" style={{ borderColor: 'rgba(15,110,86,0.07)' }}>
      <span className="text-[12.5px] text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-[13px] text-gray-800 font-medium text-right">{children}</span>
    </div>
  )
}

// Explicación de objetivo/límite según el sentido. Solo describe las reglas
// del backend; el estado real siempre lo calcula el backend.
function ExplicacionUmbrales({ sentido }) {
  const mayor = sentido === 'MAYOR_ES_MEJOR'
  const filas = mayor
    ? [
        [ESTADO_META.EN_OBJETIVO, 'Valor objetivo: a partir de este valor el indicador está "En objetivo".'],
        [ESTADO_META.EN_RIESGO, 'Entre el límite aceptable y el objetivo: "En riesgo".'],
        [ESTADO_META.CRITICO, 'Límite aceptable: por debajo de este valor pasa a "Crítico".'],
      ]
    : [
        [ESTADO_META.EN_OBJETIVO, 'Valor objetivo: hasta este valor el indicador está "En objetivo".'],
        [ESTADO_META.EN_RIESGO, 'Entre el objetivo y el límite aceptable: "En riesgo".'],
        [ESTADO_META.CRITICO, 'Límite aceptable: si supera este valor pasa a "Crítico".'],
      ]
  return (
    <div className="rounded-xl border px-3.5 py-3 space-y-1.5" style={{ borderColor: 'rgba(15,110,86,0.1)', background: '#F8FAF9' }}>
      {filas.map(([meta, texto]) => (
        <p key={meta.label} className="flex items-start gap-2 text-[12px] text-gray-600">
          <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: meta.chart }} />
          {texto}
        </p>
      ))}
    </div>
  )
}

const esNumero = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v))

// Crear (indicadorId = null) o editar un indicador. Al editar se carga la
// definición actual con GET /api/indicadores/:id y se envía completa con PUT.
export default function IndicadorWizard({ indicadorId = null, onClose, onSaved }) {
  const isEdit = Boolean(indicadorId)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(FORM_VACIO)
  const [tokens, setTokens] = useState([])
  const [validation, setValidation] = useState({ status: 'idle', error: null, formula: null })
  const [loadingDef, setLoadingDef] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [touched, setTouched] = useState(false)
  const variablesState = useVariables()
  const variablesByKey = useMemo(
    () => Object.fromEntries(variablesState.variables.map(v => [v.key, v])),
    [variablesState.variables]
  )

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const formula = formulaFromTokens(tokens)

  const validar = (f) => {
    setValidation({ status: 'validating', error: null, formula: null })
    return api.validarFormulaIndicador(f)
      .then(res => {
        const next = res?.valida
          ? { status: 'valid', error: null, formula: res.formula }
          : { status: 'invalid', error: res?.error || 'La fórmula no es válida.', formula: null }
        setValidation(next)
        return next
      })
      .catch(err => {
        const next = { status: 'invalid', error: mensajeErrorHttp(err, 'accion'), formula: null }
        setValidation(next)
        return next
      })
  }

  // Edición: cargar la definición actual y validar su fórmula.
  useEffect(() => {
    if (!isEdit) return
    let alive = true
    setLoadingDef(true)
    api.getIndicador(indicadorId)
      .then(ind => {
        if (!alive) return
        setForm({
          nombre: ind.nombre ?? '',
          descripcion: ind.descripcion ?? '',
          perspectiva: ind.perspectiva ?? '',
          responsable: ind.responsable ?? '',
          frecuencia: ind.frecuencia ?? '',
          unidad: ind.unidad ?? '',
          sentido: ind.sentido ?? 'MAYOR_ES_MEJOR',
          valor_objetivo: ind.valor_objetivo ?? '',
          limite_aceptable: ind.limite_aceptable ?? '',
        })
        setTokens(tokensFromFormula(ind.formula))
        validar(ind.formula)
      })
      .catch(err => { if (alive) setLoadError(mensajeErrorHttp(err, 'accion')) })
      .finally(() => { if (alive) setLoadingDef(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicadorId])

  const changeTokens = (next) => {
    setTokens(next)
    setValidation({ status: 'idle', error: null, formula: null })
  }

  // ── Validaciones de UX por paso ────────────────────────────────────────
  const nombre = form.nombre.trim()
  const responsable = form.responsable.trim()
  const errores1 = {
    nombre: nombre.length < MIN_TEXTO || nombre.length > MAX_TEXTO ? `Entre ${MIN_TEXTO} y ${MAX_TEXTO} caracteres.` : null,
    descripcion: form.descripcion.trim().length > MAX_DESCRIPCION ? `Máximo ${MAX_DESCRIPCION} caracteres.` : null,
    perspectiva: !form.perspectiva ? 'Elegí una perspectiva.' : null,
    responsable: responsable.length < MIN_TEXTO || responsable.length > MAX_TEXTO ? `Entre ${MIN_TEXTO} y ${MAX_TEXTO} caracteres.` : null,
    frecuencia: !form.frecuencia ? 'Elegí una frecuencia.' : null,
  }
  const errores3 = {
    unidad: !form.unidad ? 'Elegí una unidad.' : null,
    valor_objetivo: !esNumero(form.valor_objetivo) ? 'Ingresá un número.' : null,
    limite_aceptable: !esNumero(form.limite_aceptable) ? 'Ingresá un número.' : null,
  }
  const step1Ok = Object.values(errores1).every(e => !e)
  const step3Ok = Object.values(errores3).every(e => !e) && !!form.sentido

  // Aviso (no bloqueante) de coherencia: el backend decide finalmente.
  let avisoCoherencia = null
  if (esNumero(form.valor_objetivo) && esNumero(form.limite_aceptable)) {
    const obj = Number(form.valor_objetivo)
    const lim = Number(form.limite_aceptable)
    if (form.sentido === 'MAYOR_ES_MEJOR' && lim > obj) avisoCoherencia = 'Con "Mayor es mejor", el límite aceptable debería ser menor o igual al objetivo.'
    if (form.sentido === 'MENOR_ES_MEJOR' && lim < obj) avisoCoherencia = 'Con "Menor es mejor", el límite aceptable debería ser mayor o igual al objetivo.'
  }

  const handleNext = async () => {
    setTouched(true)
    if (step === 1) {
      if (!step1Ok) return
      setTouched(false)
      setStep(2)
      return
    }
    if (step === 2) {
      if (tokens.length === 0) {
        setValidation({ status: 'invalid', error: 'La fórmula es obligatoria.', formula: null })
        return
      }
      const res = validation.status === 'valid' ? validation : await validar(formula)
      if (res.status !== 'valid') return
      setTouched(false)
      setStep(3)
      return
    }
    if (step === 3) {
      if (!step3Ok) return
      setTouched(false)
      setStep(4)
      return
    }
    guardar()
  }

  const guardar = () => {
    // Definición completa (PUT es reemplazo total, no PATCH).
    const body = {
      nombre,
      descripcion: form.descripcion.trim() || null,
      perspectiva: form.perspectiva,
      responsable,
      frecuencia: form.frecuencia,
      formula: validation.formula || formula,
      unidad: form.unidad,
      sentido: form.sentido,
      valor_objetivo: Number(form.valor_objetivo),
      limite_aceptable: Number(form.limite_aceptable),
    }
    setSaving(true)
    setSaveError(null)
    const req = isEdit ? api.editarIndicador(indicadorId, body) : api.crearIndicador(body)
    req
      .then(saved => onSaved(saved))
      .catch(err => setSaveError(mensajeErrorHttp(err, 'accion')))
      .finally(() => setSaving(false))
  }

  const handleBack = () => { if (step > 1) { setStep(step - 1); setSaveError(null) } }
  const showErr = (e) => (touched ? e : null)

  const previewIndicador = {
    nombre, perspectiva: form.perspectiva, responsable, frecuencia: form.frecuencia,
    unidad: form.unidad, sentido: form.sentido,
    valor_objetivo: esNumero(form.valor_objetivo) ? Number(form.valor_objetivo) : null,
  }

  const footer = (
    <>
      {saveError && (
        <div className="flex items-start gap-1.5 text-[12px] text-red-600 mb-3">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2.5">
        <button onClick={handleBack} disabled={step === 1 || saving}
          className="px-4 py-2.5 rounded-xl border text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: BORDER }}>
          Atrás
        </button>
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2.5 rounded-xl border text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ borderColor: BORDER }}>
            Cancelar
          </button>
          <button onClick={handleNext}
            disabled={saving || loadingDef || !!loadError || validation.status === 'validating'}
            className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: GREEN }}>
            {step === 4
              ? (saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear indicador')
              : step === 2 && validation.status === 'validating' ? 'Validando…' : 'Siguiente'}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <SideDrawer
      title={isEdit ? 'Editar indicador' : 'Nuevo indicador'}
      header={<Stepper step={step} />}
      onClose={saving ? () => {} : onClose}
      footer={footer}
      width="sm:w-[560px]"
    >
      {loadingDef ? (
        <p className="flex items-center gap-2 text-[13px] text-gray-400"><RefreshCw size={14} className="animate-spin" /> Cargando indicador…</p>
      ) : loadError ? (
        <p className="flex items-start gap-1.5 text-[13px] text-red-600"><AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {loadError}</p>
      ) : (
        <>
          {/* ── Paso 1: Información general ─────────────────────── */}
          {step === 1 && (
            <div className="fade-in space-y-4">
              <StepHeading title="Información general" desc="Definí qué mide el indicador y quién es responsable de su seguimiento." />
              <Field label="Nombre del indicador" error={showErr(errores1.nombre)}
                counter={<span className="text-[10.5px] text-gray-400">{form.nombre.trim().length}/{MAX_TEXTO}</span>}>
                <input className={inputCls} style={inputStyle} value={form.nombre} maxLength={MAX_TEXTO}
                  onChange={e => set('nombre', e.target.value)} placeholder="Ej: Margen de contribución" />
              </Field>
              <Field label="Descripción (opcional)" error={showErr(errores1.descripcion)}
                counter={<span className="text-[10.5px] text-gray-400">{form.descripcion.trim().length}/{MAX_DESCRIPCION}</span>}>
                <textarea className={inputCls} style={inputStyle} rows={3} value={form.descripcion} maxLength={MAX_DESCRIPCION}
                  onChange={e => set('descripcion', e.target.value)} placeholder="Qué representa y cómo se interpreta" />
              </Field>
              <Field label="Perspectiva" error={showErr(errores1.perspectiva)}>
                <OptionGrid options={PERSPECTIVAS} value={form.perspectiva} onChange={v => set('perspectiva', v)} />
              </Field>
              <Field label="Responsable" error={showErr(errores1.responsable)} hint="Área o rol responsable. Ej: Operaciones, Responsable Comercial.">
                <input className={inputCls} style={inputStyle} value={form.responsable} maxLength={MAX_TEXTO}
                  onChange={e => set('responsable', e.target.value)} placeholder="Ej: Dirección de Producto y Tecnología" />
              </Field>
              <Field label="Frecuencia" error={showErr(errores1.frecuencia)}>
                <OptionGrid options={FRECUENCIAS} value={form.frecuencia} onChange={v => set('frecuencia', v)} />
              </Field>
            </div>
          )}

          {/* ── Paso 2: Fórmula ──────────────────────────────────── */}
          {step === 2 && (
            <div className="fade-in">
              <StepHeading title="Fórmula" desc="Armá el cálculo con las variables financieras disponibles. Se valida antes de continuar." />
              <FormulaBuilder tokens={tokens} onChange={changeTokens} variablesState={variablesState} validation={validation} />
            </div>
          )}

          {/* ── Paso 3: Objetivo ─────────────────────────────────── */}
          {step === 3 && (
            <div className="fade-in space-y-4">
              <StepHeading title="Objetivo" desc="Definí cómo se representa el valor y cuándo el indicador está en objetivo." />
              <Field label="Unidad" error={showErr(errores3.unidad)} hint="Solo define la representación del valor; no transforma el cálculo.">
                <OptionGrid cols={3} value={form.unidad} onChange={v => set('unidad', v)}
                  options={UNIDADES.map(u => ({ value: u.value, label: u.label, sub: u.simbolo }))} />
              </Field>
              <Field label="Sentido del indicador">
                <OptionGrid value={form.sentido} onChange={v => set('sentido', v)}
                  options={SENTIDOS.map(s => ({ value: s.value, label: s.label, sub: s.hint }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor objetivo" error={showErr(errores3.valor_objetivo)}>
                  <input type="number" step="any" className={inputCls} style={inputStyle} value={form.valor_objetivo}
                    onChange={e => set('valor_objetivo', e.target.value)} />
                </Field>
                <Field label="Límite aceptable" error={showErr(errores3.limite_aceptable)}>
                  <input type="number" step="any" className={inputCls} style={inputStyle} value={form.limite_aceptable}
                    onChange={e => set('limite_aceptable', e.target.value)} />
                </Field>
              </div>
              {avisoCoherencia && (
                <p className="flex items-start gap-1.5 text-[12px]" style={{ color: '#B45309' }}>
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {avisoCoherencia}
                </p>
              )}
              <ExplicacionUmbrales sentido={form.sentido} />
            </div>
          )}

          {/* ── Paso 4: Revisión ─────────────────────────────────── */}
          {step === 4 && (
            <div className="fade-in">
              <StepHeading title="Revisión" desc="Confirmá la definición antes de guardar." />
              <div className="rounded-xl border px-3.5 py-1 mb-5" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                <Resumen label="Nombre">{nombre}</Resumen>
                <Resumen label="Descripción">{form.descripcion.trim() || '—'}</Resumen>
                <Resumen label="Perspectiva">{PERSPECTIVA_LABELS[form.perspectiva]}</Resumen>
                <Resumen label="Responsable">{responsable}</Resumen>
                <Resumen label="Frecuencia">{FRECUENCIA_LABELS[form.frecuencia]}</Resumen>
                <Resumen label="Fórmula">{formulaLegible(validation.formula || formula, variablesByKey)}</Resumen>
                <Resumen label="Unidad">{UNIDAD_LABELS[form.unidad]}</Resumen>
                <Resumen label="Objetivo">{formatValor(form.valor_objetivo, form.unidad)}</Resumen>
                <Resumen label="Límite aceptable">{formatValor(form.limite_aceptable, form.unidad)}</Resumen>
                <Resumen label="Sentido">{SENTIDO_LABELS[form.sentido]} <span className="block text-[11px] font-normal text-gray-400">{SENTIDO_HINTS[form.sentido]}</span></Resumen>
              </div>
              <p className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Vista previa de la tarjeta</p>
              <div className="max-w-[320px]">
                <IndicadorCard indicador={previewIndicador} preview />
              </div>
            </div>
          )}
        </>
      )}
    </SideDrawer>
  )
}
