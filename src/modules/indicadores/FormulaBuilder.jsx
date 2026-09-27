import { useMemo, useState } from 'react'
import { X, Delete, Eraser, Plus, CheckCircle2, AlertCircle, RefreshCw, Info } from 'lucide-react'
import { OPERADORES, mensajeErrorHttp } from './constants'
import { formulaFromTokens, tokenLabel } from './formula'

const BORDER = 'rgba(15,110,86,0.15)'
const TIPO_PLURAL = { Ingreso: 'Ingresos', Gasto: 'Gastos' }

// Agrupa el catálogo del backend por `tipo`, con el total (categoria null)
// primero. No hay ninguna lista de variables en el frontend.
function agruparVariables(variables) {
  const grupos = new Map()
  for (const v of variables) {
    if (!grupos.has(v.tipo)) grupos.set(v.tipo, [])
    grupos.get(v.tipo).push(v)
  }
  return [...grupos.entries()].map(([tipo, vars]) => ({
    tipo,
    label: TIPO_PLURAL[tipo] || tipo,
    vars: [...vars.filter(v => v.categoria === null), ...vars.filter(v => v.categoria !== null)],
  }))
}

// tokens: [{ type: 'var'|'op'|'num', value }] — `value` es siempre el valor
// técnico (INGRESOS_TOTAL, *, /, 100). La fórmula se valida en el backend.
export default function FormulaBuilder({ tokens, onChange, variablesState, validation }) {
  const [selected, setSelected] = useState(null) // índice del token seleccionado (inserción después de él)
  const [numero, setNumero] = useState('')
  const [numeroError, setNumeroError] = useState(null)

  const { loading, variables, error } = variablesState
  const variablesByKey = useMemo(() => Object.fromEntries(variables.map(v => [v.key, v])), [variables])
  const grupos = useMemo(() => agruparVariables(variables), [variables])

  const insertar = (token) => {
    const at = selected === null ? tokens.length : selected + 1
    const next = [...tokens.slice(0, at), token, ...tokens.slice(at)]
    onChange(next)
    setSelected(selected === null ? null : at)
  }

  const quitar = (index) => {
    onChange(tokens.filter((_, i) => i !== index))
    setSelected(null)
  }

  const borrar = () => {
    if (tokens.length === 0) return
    quitar(selected === null ? tokens.length - 1 : selected)
  }

  const agregarNumero = () => {
    // Solo se normaliza la coma decimal; el formato final lo valida el backend.
    const limpio = numero.trim().replace(',', '.')
    if (!/^\d+(\.\d+)?$/.test(limpio)) {
      setNumeroError('Ingresá un número positivo (ej: 100 o 0,5).')
      return
    }
    insertar({ type: 'num', value: limpio })
    setNumero('')
    setNumeroError(null)
  }

  const formula = formulaFromTokens(tokens)

  return (
    <div>
      {/* Vista previa de fórmula */}
      <p className="text-[12.5px] font-semibold text-gray-500 mb-1.5">Vista previa de fórmula</p>
      <div
        className="min-h-[76px] rounded-xl border px-3 py-2.5 flex flex-wrap items-center gap-1.5"
        style={{ borderColor: validation.status === 'invalid' ? 'rgba(185,28,28,0.4)' : BORDER, background: '#F8FAF9' }}
        onClick={() => setSelected(null)}
      >
        {tokens.length === 0 ? (
          <span className="text-[12.5px] text-gray-400">Agregá variables, operadores y números desde abajo.</span>
        ) : tokens.map((t, i) => {
          const isSel = selected === i
          const desconocida = t.type === 'var' && variables.length > 0 && !variablesByKey[t.value]
          const base = t.type === 'var'
            ? { background: '#E1F5EE', color: '#0F6E56' }
            : t.type === 'num'
              ? { background: '#EAF0FC', color: '#3B6FD6' }
              : { background: '#fff', color: '#374151' }
          return (
            <span key={i}
              onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : i) }}
              className="group inline-flex items-center gap-1 rounded-lg border pl-2 pr-1 py-1 text-[12.5px] font-semibold cursor-pointer select-none"
              style={{
                ...base,
                ...(desconocida ? { background: '#FEE2E2', color: '#B91C1C' } : {}),
                borderColor: isSel ? '#04342C' : 'rgba(15,110,86,0.12)',
                boxShadow: isSel ? '0 0 0 1px #04342C' : undefined,
              }}
              title={desconocida ? 'Variable que ya no existe en el catálogo' : t.type === 'var' ? t.value : undefined}>
              {tokenLabel(t, variablesByKey)}
              <button type="button" aria-label="Quitar"
                onClick={(e) => { e.stopPropagation(); quitar(i) }}
                className="w-4 h-4 rounded flex items-center justify-center opacity-40 hover:opacity-100">
                <X size={11} />
              </button>
            </span>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <p className="text-[11px] text-gray-400">
          {selected === null
            ? 'Los elementos se agregan al final. Tocá uno para insertar después de él.'
            : 'Insertando después del elemento seleccionado.'}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={borrar} disabled={tokens.length === 0} title="Borrar elemento"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            <Delete size={15} />
          </button>
          <button type="button" onClick={() => { onChange([]); setSelected(null) }} disabled={tokens.length === 0} title="Limpiar fórmula"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            <Eraser size={15} />
          </button>
        </div>
      </div>
      {formula && <p className="text-[11px] text-gray-400 font-mono break-all mt-0.5">{formula}</p>}

      {/* Estado de validación (backend) */}
      <div className="mt-2 min-h-[20px]">
        {validation.status === 'validating' && (
          <p className="flex items-center gap-1.5 text-[12px] text-gray-500"><RefreshCw size={12} className="animate-spin" /> Validando fórmula…</p>
        )}
        {validation.status === 'valid' && (
          <p className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: '#0F6E56' }}><CheckCircle2 size={13} /> Fórmula válida</p>
        )}
        {validation.status === 'invalid' && (
          <p className="flex items-start gap-1.5 text-[12px] text-red-600"><AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {validation.error}</p>
        )}
      </div>

      {/* Operadores y números */}
      <p className="text-[12.5px] font-semibold text-gray-500 mt-4 mb-1.5">Operadores</p>
      <div className="flex flex-wrap gap-1.5">
        {OPERADORES.map(op => (
          <button key={op.value} type="button" onClick={() => insertar({ type: 'op', value: op.value })}
            className="w-10 h-9 rounded-xl border text-[16px] font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: BORDER }}>
            {op.display}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <input type="text" inputMode="decimal" value={numero}
            onChange={e => { setNumero(e.target.value); setNumeroError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarNumero() } }}
            placeholder="Número"
            className="w-24 border rounded-xl px-3 py-2 text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
            style={{ borderColor: 'rgba(15,110,86,0.25)' }} />
          <button type="button" onClick={agregarNumero}
            className="flex items-center gap-1 px-3 h-9 rounded-xl border text-[12.5px] font-semibold text-gray-700 bg-white hover:bg-gray-50"
            style={{ borderColor: BORDER }}>
            <Plus size={13} /> Agregar
          </button>
        </div>
      </div>
      {numeroError && <p className="text-[11.5px] text-red-600 mt-1 text-right">{numeroError}</p>}
      <p className="flex items-start gap-1.5 text-[11.5px] text-gray-400 mt-2">
        <Info size={12} className="flex-shrink-0 mt-0.5" />
        Si el indicador es un porcentaje, agregá “× 100” en la fórmula: la unidad solo define cómo se muestra el valor.
      </p>

      {/* Variables del backend */}
      <p className="text-[12.5px] font-semibold text-gray-500 mt-5 mb-1.5">Variables financieras</p>
      {loading ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-gray-400"><RefreshCw size={12} className="animate-spin" /> Cargando variables…</p>
      ) : error ? (
        <p className="flex items-start gap-1.5 text-[12.5px] text-red-600"><AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {mensajeErrorHttp(error)}</p>
      ) : (
        <div className="space-y-3.5">
          {grupos.map(g => (
            <div key={g.tipo}>
              <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.vars.map(v => (
                  <button key={v.key} type="button" onClick={() => insertar({ type: 'var', value: v.key })}
                    className="px-2.5 py-1.5 rounded-lg border text-[12px] font-medium text-gray-700 bg-white hover:border-teal-700/40 hover:bg-[#F6FAF8] transition-colors"
                    style={{ borderColor: BORDER, fontWeight: v.categoria === null ? 600 : 500 }}
                    title={v.key}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
