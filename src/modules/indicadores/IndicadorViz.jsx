import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatValor, estadoMeta, mensajeErrorCalculo, ESTADO_META } from './constants'

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const AXIS_TICK = { fontSize: 10.5, fill: '#898781' }
const GRID = '#e1e0d9'

// Etiqueta corta de eje a partir de la clave del período del backend
// ('2026-09' | '2026-Q3' | '2026-S2' | '2026').
export function periodoCorto(periodo) {
  const clave = periodo?.clave || ''
  let m
  if ((m = /^(\d{4})-(\d{2})$/.exec(clave))) return `${MESES_CORTO[Number(m[2]) - 1]} ${m[1].slice(2)}`
  if ((m = /^(\d{4})-Q(\d)$/.exec(clave))) return `T${m[2]} ${m[1].slice(2)}`
  if ((m = /^(\d{4})-S(\d)$/.exec(clave))) return `S${m[2]} ${m[1].slice(2)}`
  return periodo?.label || clave
}

export function periodoLargo(periodo) {
  if (!periodo) return ''
  return `${periodo.label}${periodo.parcial ? ' (en curso)' : ''}`
}

export function EstadoBadge({ estado, size = 'md' }) {
  const meta = estadoMeta(estado)
  const cls = size === 'sm' ? 'text-[10.5px] px-2 py-0.5' : 'text-[11.5px] px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${cls}`}
      style={{ background: meta.background, color: meta.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

// Motivo por el que no hay valor: el error de cálculo más reciente que informó
// el backend (ej. DIVISION_POR_CERO) o, si no hay, falta de datos.
export function motivoSinDatos(data) {
  const puntos = data?.puntos || []
  const conError = [...puntos].reverse().find(p => p.error)
  return mensajeErrorCalculo(conError?.error) || 'No hay datos suficientes para calcular el indicador.'
}

function SinDatos({ data, compact }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-3 gap-1">
      <p className={`${compact ? 'text-[13px]' : 'text-[15px]'} font-semibold text-gray-500`}>Sin datos</p>
      <p className="text-[11.5px] text-gray-400 leading-snug">{motivoSinDatos(data)}</p>
    </div>
  )
}

function KpiView({ data, compact }) {
  const { indicador, ultimoValido } = data
  if (!ultimoValido) return <SinDatos data={data} compact={compact} />
  return (
    <div className="h-full flex flex-col justify-end">
      <p className={`${compact ? 'text-[26px]' : 'text-[34px]'} font-bold text-gray-900 leading-none`}>
        {formatValor(ultimoValido.valor, indicador?.unidad, { compact })}
      </p>
      <p className="text-[11.5px] text-gray-500 mt-1.5">{periodoLargo(ultimoValido.periodo)}</p>
      <p className="text-[11.5px] text-gray-400 mt-0.5">
        Objetivo: <span className="font-semibold text-gray-600">{formatValor(indicador?.valorObjetivo, indicador?.unidad, { compact })}</span>
      </p>
    </div>
  )
}

// ── Medidor ──────────────────────────────────────────────────────────────
// Las bandas de color solo dibujan los umbrales configurados; el estado que se
// informa (color de la aguja y badge) es siempre el que calculó el backend.
function polar(cx, cy, r, angle) {
  return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)]
}
function arcPath(cx, cy, r, a1, a2) {
  const [x1, y1] = polar(cx, cy, r, a1)
  const [x2, y2] = polar(cx, cy, r, a2)
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`
}

function GaugeView({ data, compact }) {
  const { indicador, ultimoValido } = data
  if (!ultimoValido) return <SinDatos data={data} compact={compact} />
  const valor = Number(ultimoValido.valor)
  const objetivo = Number(indicador?.valorObjetivo)
  const limite = Number(indicador?.limiteAceptable)
  const refs = [valor, objetivo, limite].filter(Number.isFinite)
  let lo = Math.min(0, ...refs)
  let hi = Math.max(...refs)
  if (hi === lo) hi = lo + 1
  hi += (hi - lo) * 0.15
  const clamp = (v) => Math.min(hi, Math.max(lo, v))
  const angleOf = (v) => Math.PI * (1 - (clamp(v) - lo) / (hi - lo))

  const mayor = indicador?.sentido !== 'MENOR_ES_MEJOR'
  const zonas = mayor
    ? [[lo, limite, ESTADO_META.CRITICO.chart], [limite, objetivo, ESTADO_META.EN_RIESGO.chart], [objetivo, hi, ESTADO_META.EN_OBJETIVO.chart]]
    : [[lo, objetivo, ESTADO_META.EN_OBJETIVO.chart], [objetivo, limite, ESTADO_META.EN_RIESGO.chart], [limite, hi, ESTADO_META.CRITICO.chart]]

  const cx = 100, cy = 100, r = 78
  const needle = polar(cx, cy, r - 14, angleOf(valor))
  const color = estadoMeta(ultimoValido.estado).chart

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <svg viewBox="0 0 200 112" className="w-full" style={{ maxWidth: compact ? 210 : 260 }} role="img"
        aria-label={`Medidor: ${formatValor(valor, indicador?.unidad)}`}>
        <path d={arcPath(cx, cy, r, Math.PI, 0)} fill="none" stroke="#EDF1EF" strokeWidth={14} />
        {zonas.filter(([a, b]) => b > a).map(([a, b, c], i) => (
          <path key={i} d={arcPath(cx, cy, r, angleOf(a), angleOf(b))} fill="none" stroke={c} strokeOpacity={0.35} strokeWidth={14} />
        ))}
        <line x1={cx} y1={cy} x2={needle[0]} y2={needle[1]} stroke={color} strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
      </svg>
      <p className={`${compact ? 'text-[20px]' : 'text-[26px]'} font-bold text-gray-900 leading-none -mt-1`}>
        {formatValor(valor, indicador?.unidad, { compact })}
      </p>
      <p className="text-[11px] text-gray-400 mt-1">
        {periodoLargo(ultimoValido.periodo)} · Objetivo {formatValor(objetivo, indicador?.unidad, { compact: true })}
      </p>
    </div>
  )
}

// ── Series (línea / área / barra) sobre `puntos` ─────────────────────────
function TooltipContent({ active, payload, unidad }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const meta = estadoMeta(p.estado)
  return (
    <div className="rounded-lg px-2.5 py-1.5 text-[12px] shadow-md bg-white border" style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
      <p className="text-gray-500">{p.largo}</p>
      {p.valor === null
        ? <p className="text-gray-400">Sin datos</p>
        : <p className="font-semibold text-gray-800">{formatValor(p.valor, unidad)} · <span style={{ color: meta.color }}>{meta.label}</span></p>}
    </div>
  )
}

function SeriesView({ data, chartType, accent, gradientId }) {
  const { indicador, puntos = [] } = data
  if (!puntos.some(p => p.valor !== null)) return <SinDatos data={data} />
  const unidad = indicador?.unidad
  const series = puntos.map(p => ({
    label: periodoCorto(p.periodo),
    largo: periodoLargo(p.periodo),
    valor: p.valor,
    estado: p.estado,
  }))
  const objetivo = Number(indicador?.valorObjetivo)
  const axisFmt = (v) => formatValor(v, unidad, { compact: true })
  const common = (
    <>
      <CartesianGrid horizontal vertical={false} stroke={GRID} />
      <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} />
      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={axisFmt} width={52} />
      {Number.isFinite(objetivo) && (
        <ReferenceLine y={objetivo} stroke={ESTADO_META.EN_OBJETIVO.chart} strokeDasharray="4 4" ifOverflow="extendDomain"
          label={{ value: 'Objetivo', position: 'insideTopRight', fontSize: 10, fill: ESTADO_META.EN_OBJETIVO.color }} />
      )}
      <Tooltip content={<TooltipContent unidad={unidad} />} cursor={chartType === 'bar' ? { fill: 'rgba(15,110,86,0.05)' } : undefined} />
    </>
  )
  const margin = { top: 8, right: 6, left: 0, bottom: 0 }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'bar' ? (
        <BarChart data={series} margin={margin}>
          {common}
          <Bar dataKey="valor" radius={[3, 3, 3, 3]} maxBarSize={26} isAnimationActive={false}>
            {series.map((s, i) => <Cell key={i} fill={estadoMeta(s.estado).chart} />)}
          </Bar>
        </BarChart>
      ) : chartType === 'area' ? (
        <AreaChart data={series} margin={margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          {common}
          <Area type="monotone" dataKey="valor" stroke={accent} strokeWidth={2} fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: accent, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </AreaChart>
      ) : (
        <LineChart data={series} margin={margin}>
          {common}
          <Line type="monotone" dataKey="valor" stroke={accent} strokeWidth={2}
            dot={{ r: 3, fill: accent, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      )}
    </ResponsiveContainer>
  )
}

// Representa un histórico ya obtenido. Cambiar `chartType` no pide datos ni
// modifica el indicador: es solo otra forma de ver la misma respuesta.
// kpi / gauge → ultimoValido · line / area / bar → puntos.
export default function IndicadorViz({ data, chartType, accent = '#0F6E56', compact = false, idSuffix = '' }) {
  if (!data) return null
  const gradientId = `kpiFill-${String(data.indicador?.id || '')}-${idSuffix}`.replace(/[^\w-]/g, '-')
  switch (chartType) {
    case 'gauge': return <GaugeView data={data} compact={compact} />
    case 'line':
    case 'area':
    case 'bar':  return <SeriesView data={data} chartType={chartType} accent={accent} gradientId={gradientId} />
    default:     return <KpiView data={data} compact={compact} />
  }
}
