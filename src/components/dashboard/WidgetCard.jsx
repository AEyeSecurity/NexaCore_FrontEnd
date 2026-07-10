import { AlertCircle, RefreshCw } from 'lucide-react'

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
  const up = Number(trend) > 0
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: colors.iconBg }}
        >
          <Icon size={20} style={{ color: colors.accent }} />
        </div>
        {hasTrend && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-full ${
              up ? 'text-emerald-700' : 'text-red-600'
            }`}
            style={{ background: 'rgba(255,255,255,0.65)' }}
          >
            {Math.abs(Number(trend))}%
          </span>
        )}
      </div>
      <p className="text-[24px] font-bold text-gray-900 leading-none mb-1.5">
        {loading ? <span style={{ color: colors.accent, opacity: 0.3 }}>···</span> : widget.getValue(data)}
      </p>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: colors.accent }}>
        {widget.title}
      </p>
    </>
  )
}

function DetailBody({ widget, data, loading }) {
  const { icon: Icon, colors } = widget
  const rows = loading ? [] : widget.getRows(data)
  return (
    <>
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
        <p className="text-[12px] text-gray-400">Sin datos</p>
      ) : (
        <div className="space-y-0">
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
    </>
  )
}

export default function WidgetCard({ widget, groupState, onRetry }) {
  const { loading, error, data } = groupState || { loading: true, error: null, data: null }

  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ background: widget.colors.bg }}>
      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : widget.type === 'metric' ? (
        <MetricBody widget={widget} data={data} loading={loading} />
      ) : (
        <DetailBody widget={widget} data={data} loading={loading} />
      )}
    </div>
  )
}
