import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, ReferenceLine,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatK, fmtARS } from './format'

// Mosaico de tendencia genérico (ícono + pregunta + badge, subtítulo,
// gráfico, número grande abajo) — lo usan los mosaicos de "últimos 6 meses"
// que declaran type: 'trend' (hoy Ingresos, Gastos y Resultado neto). Todo
// lo visual sale del propio widget (question, subtitle, colors, getSeries),
// así que agregar otro no toca MetricBody/DetailBody ni a los demás
// mosaicos. chartVariant: 'bar' es para series que pueden ser negativas
// (Resultado neto); el resto usa el área con gradiente de siempre.
//
// Sin etiqueta de valor fija por barra a propósito — con barras chicas
// (ej. -$56K al lado de un +$218K) el texto termina pisando la barra sin
// importar el offset. El eje Y + la grilla + el tooltip al pasar el mouse
// ya dan el detalle exacto; "nunca un número en cada punto" es la regla.

// Verde ya usado para "positivo" en el resto del dashboard (Ingresos) +
// este rojo (no el #E11D48 de Gastos) porque contra ese verde el rojo de
// marca falla el chequeo de separación CVD de la skill de dataviz (ΔE 5.8,
// piso 6); este tono pasa (ΔE 7.9, banda de aviso) — mitigado acá por la
// posición arriba/abajo de la línea de cero, que ya es su propia
// codificación secundaria (más fuerte que una etiqueta), y por el tooltip.
const POSITIVO = '#059669'
const NEGATIVO = '#e34948'

function TooltipContent({ active, payload, color }) {
  if (!active || !payload?.length) return null
  const { label, valor } = payload[0].payload
  const barColor = typeof color === 'function' ? color(valor) : color
  return (
    <div className="rounded-lg px-2.5 py-1.5 text-[12px] shadow-md bg-white border" style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
      <p className="text-gray-500 capitalize">{label}</p>
      <p className="font-semibold" style={{ color: barColor }}>{fmtARS(valor)}</p>
    </div>
  )
}

export default function TrendCard({ widget, data, loading }) {
  const { icon: Icon, colors } = widget
  const series = !loading ? widget.getSeries(data) : []
  const gradientId = `trendFill-${widget.id}`

  const first = series[0]?.valor
  const last = series[series.length - 1]?.valor
  const hasTrend = series.length > 1 && first != null && first !== 0
  const trendPct = hasTrend ? Math.round(((last - first) / first) * 100) : null
  const up = trendPct > 0
  // "Arriba" no siempre es bueno (ej. Gastos) — positiveDirection lo declara
  // el mosaico, igual criterio que en el resto de las tarjetas de métrica.
  const isGood = trendPct === 0 ? null : (widget.positiveDirection === 'down' ? !up : up)
  const badgeColor = trendPct === 0 ? 'text-gray-500' : isGood ? 'text-emerald-700' : 'text-red-600'

  return (
    <div className="h-full flex flex-col">
      {/* Header: ícono + título pregunta + badge de tendencia */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: colors.iconBg }}
          >
            <Icon size={17} style={{ color: colors.accent }} />
          </div>
          <h3 className="font-serif font-semibold text-[14px] text-gray-800">
            {widget.question}
          </h3>
        </div>
        {hasTrend && (
          <span
            title="vs. inicio del período"
            className={`flex-shrink-0 flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-full ${badgeColor}`}
            style={{ background: 'rgba(255,255,255,0.65)' }}
          >
            {trendPct === 0 ? '' : up ? '+' : '-'}{Math.abs(trendPct)}%
          </span>
        )}
      </div>

      {/* Subtítulo */}
      <p className="text-[11.5px] text-gray-500 mb-3">{widget.subtitle}</p>

      {/* Gráfico */}
      <div className="flex-1 min-h-[110px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: colors.accent, opacity: 0.4 }}>
            Cargando···
          </div>
        ) : series.length < 2 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-gray-400">
            Sin datos en el período
          </div>
        ) : widget.chartVariant === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal vertical={false} stroke="#e1e0d9" />
              <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#898781' }} axisLine={{ stroke: '#e1e0d9' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10.5, fill: '#898781' }} axisLine={false} tickLine={false} tickFormatter={formatK} width={48} />
              <ReferenceLine y={0} stroke="#c3c2b7" />
              <Tooltip content={<TooltipContent color={(v) => (v >= 0 ? POSITIVO : NEGATIVO)} />} cursor={{ fill: 'rgba(15,110,86,0.05)' }} />
              <Bar dataKey="valor" radius={[3, 3, 3, 3]} maxBarSize={26} isAnimationActive={false}>
                {series.map((s, i) => (
                  <Cell key={i} fill={s.valor >= 0 ? POSITIVO : NEGATIVO} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal vertical={false} stroke="#e1e0d9" />
              <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#898781' }} axisLine={{ stroke: '#e1e0d9' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10.5, fill: '#898781' }} axisLine={false} tickLine={false} tickFormatter={formatK} width={40} />
              <Tooltip content={<TooltipContent color={colors.accent} />} />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={colors.accent}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={{ r: 3, fill: colors.accent, stroke: colors.bg, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Número grande, separado del gráfico */}
      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
        <p className="text-[24px] font-bold text-gray-900 leading-none mb-1.5">
          {loading ? <span style={{ color: colors.accent, opacity: 0.3 }}>···</span> : widget.getValue(data)}
        </p>
        <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: colors.accent }}>
          {widget.title}
        </p>
      </div>
    </div>
  )
}
