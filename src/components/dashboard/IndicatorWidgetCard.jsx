import { AlertCircle, RefreshCw, Gauge } from 'lucide-react'
import { PERIOD_LABELS } from './widgetCatalog'
import { useIndicadorHistorico } from '../../modules/indicadores/indicadoresData'
import IndicadorViz, { EstadoBadge } from '../../modules/indicadores/IndicadorViz'
import { PERSPECTIVA_LABELS, perspectivaStyle, mensajeErrorHttp } from '../../modules/indicadores/constants'

// Mosaico `indicador_kpi`. El Dashboard backend no calcula el KPI: los datos
// salen de GET /api/indicadores/:indicatorId/historico?period=<period>, con
// caché compartido por indicatorId+period (dos instancias iguales = 1 request).
// kpi / gauge usan `ultimoValido`; line / area / bar usan `puntos`.
export default function IndicatorWidgetCard({ widget }) {
  const { loading, data, error, retry } = useIndicadorHistorico(widget.indicatorId, widget.period)
  const indicador = data?.indicador
  const pStyle = perspectivaStyle(indicador?.perspectiva)
  const inactivo = indicador?.activo === false
  const periodLabel = PERIOD_LABELS[widget.period] || ''

  return (
    <div className="h-full min-h-[190px] rounded-2xl p-5 shadow-sm bg-white flex flex-col"
      style={{ borderTop: `3px solid ${indicador ? pStyle.color : 'rgba(15,110,86,0.15)'}` }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: pStyle.background }}>
            <Gauge size={17} style={{ color: pStyle.color }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif font-semibold text-[14px] text-gray-800 truncate" title={indicador?.nombre}>
              {indicador?.nombre || 'Indicador'}
            </h3>
            <p className="text-[11px] text-gray-400 truncate">
              {indicador ? `${PERSPECTIVA_LABELS[indicador.perspectiva] ?? indicador.perspectiva} · ` : ''}{periodLabel}
            </p>
          </div>
        </div>
        {!loading && !error && data && <EstadoBadge estado={data.ultimoValido?.estado ?? null} size="sm" />}
      </div>
      {inactivo && (
        <p className="text-[10.5px] text-gray-400 italic mb-1" title="El indicador fue desactivado. El mosaico se conserva.">
          Indicador inactivo
        </p>
      )}

      <div className="flex-1 min-h-[120px] mt-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: pStyle.color, opacity: 0.4 }}>
            Cargando···
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-start justify-center gap-2">
            <div className="flex items-start gap-1.5 text-[12px] text-red-600">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{mensajeErrorHttp(error)}</span>
            </div>
            <button onClick={retry} className="flex items-center gap-1 text-[11.5px] font-medium text-gray-500 hover:text-gray-700">
              <RefreshCw size={11} /> Reintentar
            </button>
          </div>
        ) : (
          <IndicadorViz data={data} chartType={widget.chartType} accent={pStyle.color} compact idSuffix={widget.instanceId} />
        )}
      </div>
    </div>
  )
}
