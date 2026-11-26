import { AlertCircle, RefreshCw } from 'lucide-react'
import Sparkline from './Sparkline'
import TrendCard from './TrendCard'
import IndicatorWidgetCard from './IndicatorWidgetCard'
import AlertasWidgetCard from './AlertasWidgetCard'

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-start gap-2 py-1">
      <div className="flex items-center gap-1.5 text-[12px] text-red-600">
        <AlertCircle size={14} className="flex-shrink-0" />
        <span>{message || 'No se pudo cargar este mosaico'}</span>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-[11.5px] font-medium text-gray-500 hover:text-gray-700"
      >
        <RefreshCw size={11} /> Reintentar
      </button>
    </div>
  )
}

function MetricBody({ widget, data, loading }) {
  const { icon: Icon, colors } = widget
  const trend = widget.getTrend ? widget.getTrend(data) : null
  const hasTrend = trend != null && !isNaN(Number(trend))
  const trendNum = Number(trend)
  const isFlat = hasTrend && trendNum === 0
  const up = trendNum > 0
  // "Arriba" no siempre es bueno (ej. Gastos) — positiveDirection lo declara
  // el mosaico; sin ese campo se asume que subir es la buena noticia.
  const isGood = isFlat ? null : (widget.positiveDirection === 'down' ? !up : up)
  const badgeColor = isFlat ? 'text-gray-500' : isGood ? 'text-emerald-700' : 'text-red-600'
  const sign = isFlat ? '' : up ? '+' : '-'

  // KPI es un único valor grande (sin sparkline). El mini-gráfico sólo se
  // usa para el mosaico "metric" legacy que lo declaraba con getSeries.
  const rawSeries = (!loading && widget.chartType !== 'kpi' && widget.getSeries)
    ? widget.getSeries(data) : null
  const series = rawSeries && !widget.categorical
    ? rawSeries.map(p => (typeof p === 'number' ? p : Number(p?.valor ?? 0)))
    : null

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: colors.iconBg }}
        >
          <Icon size={20} style={{ color: colors.accent }} />
        </div>
        {hasTrend && (
          <span
            title="vs. mes anterior"
            className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-full ${badgeColor}`}
            style={{ background: 'rgba(255,255,255,0.65)' }}
          >
            {sign}{Math.abs(trendNum)}%
          </span>
        )}
      </div>

      {series && series.length > 1 && (
        <div className="flex-1 min-h-[32px] flex items-end mb-2">
          <Sparkline values={series} color={colors.accent} surface={colors.bg} />
        </div>
      )}

      <div className={series ? '' : 'mt-auto'}>
        <p className="text-[24px] font-bold text-gray-900 leading-none mb-1.5">
          {loading ? <span style={{ color: colors.accent, opacity: 0.3 }}>···</span> : (widget.getValue ? widget.getValue(data) : '—')}
        </p>
        {!loading && widget.getCaption && (
          <p className="text-[11.5px] text-gray-500 mb-1">{widget.getCaption(data)}</p>
        )}
        <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: colors.accent }}>
          {widget.title}
        </p>
      </div>
    </div>
  )
}

// Medidor semicircular 0–100 % (mosaicos que declaran getGauge).
function GaugeBody({ widget, data, loading }) {
  const { icon: Icon, colors } = widget
  const value = loading || !widget.getGauge ? null : widget.getGauge(data)
  const R = 52
  const C = Math.PI * R // largo del semicírculo
  const pct = value == null ? 0 : value / 100
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: colors.iconBg }}>
          <Icon size={17} style={{ color: colors.accent }} />
        </div>
        <h3 className="font-serif font-semibold text-[14px] text-gray-800">{widget.question || widget.title}</h3>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-[100px]">
        {loading ? (
          <p className="text-[12px]" style={{ color: colors.accent, opacity: 0.4 }}>Cargando···</p>
        ) : value == null ? (
          <p className="text-[12px] text-gray-400">Sin datos en el período</p>
        ) : (
          <>
            <svg viewBox="0 0 128 72" className="w-full max-w-[180px]" role="img"
              aria-label={`${widget.getValue ? widget.getValue(data) : ''} ${widget.title}`}>
              <path d="M 12 64 A 52 52 0 0 1 116 64" fill="none" stroke="#E7E5E4" strokeWidth="11" strokeLinecap="round" />
              <path d="M 12 64 A 52 52 0 0 1 116 64" fill="none" stroke={colors.accent} strokeWidth="11" strokeLinecap="round"
                strokeDasharray={`${C * pct} ${C}`} />
            </svg>
            <p className="text-[22px] font-bold text-gray-900 leading-none -mt-7">{widget.getValue(data)}</p>
            {widget.getCaption && <p className="text-[11.5px] text-gray-500 mt-2">{widget.getCaption(data)}</p>}
          </>
        )}
      </div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider mt-2" style={{ color: colors.accent }}>
        {widget.title}
      </p>
    </div>
  )
}

const BADGE_TONE = {
  danger:  { background: '#FCE9E9', color: '#B42318' },
  ok:      { background: '#E1F5EE', color: '#0F6E56' },
  neutral: { background: '#F3F4F6', color: '#4B5563' },
}

function DetailBody({ widget, data, loading }) {
  const { icon: Icon, colors } = widget
  const rows = (loading || !widget.getRows) ? [] : widget.getRows(data)
  // Filas "ricas" (con subtítulo o marca): lista con scroll, alineada arriba.
  const rich = rows.some(r => r.sublabel || r.badge)
  if (rich) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: colors.accent + '1A' }}>
            <Icon size={17} style={{ color: colors.accent }} />
          </div>
          <h3 className="font-serif font-semibold text-[13.5px]" style={{ color: colors.accent }}>{widget.title}</h3>
        </div>
        <ul className="flex-1 min-h-0 overflow-y-auto max-h-[260px] -mr-2 pr-2">
          {rows.map((row, i) => (
            <li key={row.key ?? i} className="py-2 border-b last:border-b-0" style={{ borderColor: 'rgba(15,110,86,0.07)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-gray-800 truncate" title={row.label}>{row.label}</p>
                  {row.sublabel && <p className="text-[11px] text-gray-500 truncate">{row.sublabel}</p>}
                </div>
                {row.value && <span className="text-[12px] font-semibold text-gray-700 flex-shrink-0">{row.value}</span>}
              </div>
              {row.badge && (
                <span className="inline-block mt-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                  style={BADGE_TONE[row.badge.tone] || BADGE_TONE.neutral}>
                  {row.badge.text}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2.5 mb-3.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: colors.accent + '1A' }}
        >
          <Icon size={17} style={{ color: colors.accent }} />
        </div>
        <h3 className="font-serif font-semibold text-[13.5px]" style={{ color: colors.accent }}>
          {widget.title}
        </h3>
      </div>
      {loading ? (
        <p className="text-[12px]" style={{ color: colors.accent, opacity: 0.4 }}>Cargando···</p>
      ) : rows.length === 0 ? (
        <p className="text-[12px] text-gray-400">{widget.emptyText || 'Sin datos'}</p>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          {rows.map((row, i) => (
            <div key={i}>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12.5px] text-gray-600 truncate pr-2">{row.label}</span>
                <span className="text-[13px] font-semibold text-gray-800 flex-shrink-0">{row.value}</span>
              </div>
              {i < rows.length - 1 && <div className="border-b" style={{ borderColor: 'rgba(15,110,86,0.07)' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Elige el cuerpo del mosaico. Prioridad al `chartType` del nuevo contrato
// ({ id, size, period, chartType }); si el mosaico no lo trae (config legacy
// sin resolver), cae al comportamiento anterior por `widget.type`.
function WidgetBody({ widget, data, loading }) {
  switch (widget.chartType) {
    case 'kpi':
      return <MetricBody widget={widget} data={data} loading={loading} />
    case 'area':
      return <TrendCard widget={{ ...widget, chartVariant: 'area' }} data={data} loading={loading} />
    case 'bar':
      return <TrendCard widget={{ ...widget, chartVariant: 'bar' }} data={data} loading={loading} />
    case 'list':
      return <DetailBody widget={widget} data={data} loading={loading} />
    case 'gauge':
      return <GaugeBody widget={widget} data={data} loading={loading} />
    default:
      return widget.type === 'trend'
        ? <TrendCard widget={widget} data={data} loading={loading} />
        : widget.type === 'metric'
          ? <MetricBody widget={widget} data={data} loading={loading} />
          : <DetailBody widget={widget} data={data} loading={loading} />
  }
}

export default function WidgetCard({ widget, groupState, onRetry, onNavigate }) {
  // Los mosaicos de indicador y de alertas piden sus propios datos (no usan groupState).
  if (widget.requiresIndicator) return <IndicatorWidgetCard widget={widget} />
  if (widget.usesHorizon) return <AlertasWidgetCard widget={widget} onNavigate={onNavigate} />
  const { loading, error, data } = groupState || { loading: true, error: null, data: null }

  return (
    <div className="h-full rounded-2xl p-5 shadow-sm" style={{ background: widget.colors.bg }}>
      {error
        ? <ErrorState message={error} onRetry={onRetry} />
        : <WidgetBody widget={widget} data={data} loading={loading} />}
    </div>
  )
}
