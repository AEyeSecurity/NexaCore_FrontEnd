import { AlertCircle, RefreshCw } from 'lucide-react'
import { EstadoBadge, motivoSinDatos } from './IndicadorViz'
import {
  PERSPECTIVA_LABELS, UNIDAD_LABELS,
  perspectivaStyle, formatValor, mensajeErrorHttp,
} from './constants'

// Tarjeta vertical compacta para la vista de lista.
// Solo muestra lo esencial: perspectiva, estado, nombre, valor actual y objetivo.
// El detalle completo (gráfico, tendencia, fórmula, tabla histórica) vive en
// IndicadorDetailDrawer, que se abre al hacer clic.
// IndicadorCard.jsx no se toca: sigue siendo el preview del wizard.
export default function IndicadorRow({ indicador, historico, onClick, onRetry }) {
  const pStyle = perspectivaStyle(indicador.perspectiva)
  const { loading, data, error } = historico || { loading: false, data: null, error: null }
  const ultimo = data?.ultimoValido || null
  const unidad = indicador.unidad

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border p-4 flex flex-col transition-all ${onClick ? 'hover:shadow-md hover:-translate-y-[2px]' : ''}`}
      style={{ borderColor: 'rgba(15,110,86,0.1)', borderTop: `3px solid ${pStyle.color}` }}
    >
      {/* Perspectiva + estado */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide"
          style={pStyle}>
          {PERSPECTIVA_LABELS[indicador.perspectiva] ?? indicador.perspectiva}
        </span>
        {!loading && !error && <EstadoBadge estado={ultimo?.estado ?? null} size="sm" />}
      </div>

      {/* Nombre */}
      <h3 className="font-serif font-semibold text-gray-900 text-[14.5px] leading-snug mb-3 flex-1">
        {indicador.nombre}
      </h3>

      {/* Valor actual */}
      <div>
        {loading ? (
          <p className="text-[24px] font-bold leading-none" style={{ color: pStyle.color, opacity: 0.3 }}>···</p>
        ) : error ? (
          <div className="flex flex-col items-start gap-1.5">
            <span className="flex items-start gap-1.5 text-[12px] text-red-600">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              {mensajeErrorHttp(error)}
            </span>
            {onRetry && (
              <span role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onRetry() }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRetry() } }}
                className="flex items-center gap-1 text-[11.5px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer">
                <RefreshCw size={11} /> Reintentar
              </span>
            )}
          </div>
        ) : ultimo ? (
          <p className="text-[26px] font-bold text-gray-900 leading-none">
            {formatValor(ultimo.valor, unidad, { compact: true })}
          </p>
        ) : (
          <p className="text-[15px] font-semibold text-gray-400 leading-none">
            {motivoSinDatos(data) || 'Sin datos'}
          </p>
        )}

        {/* Objetivo */}
        {indicador.valor_objetivo != null && (
          <p className="text-[11.5px] text-gray-400 mt-1.5">
            Objetivo: <span className="font-medium text-gray-600">{formatValor(indicador.valor_objetivo, unidad, { compact: true })}</span>
            {unidad && <span> {UNIDAD_LABELS[unidad] ?? unidad}</span>}
          </p>
        )}
      </div>
    </Wrapper>
  )
}
