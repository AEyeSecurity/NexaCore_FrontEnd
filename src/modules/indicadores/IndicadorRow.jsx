import { AlertCircle, RefreshCw, User, CalendarClock } from 'lucide-react'
import Sparkline from '../../components/dashboard/Sparkline'
import { Tendencia } from './IndicadorCard'
import { EstadoBadge, periodoLargo, motivoSinDatos } from './IndicadorViz'
import {
  PERSPECTIVA_LABELS, FRECUENCIA_LABELS, UNIDAD_LABELS,
  perspectivaStyle, formatValor, mensajeErrorHttp,
} from './constants'

// Fila horizontal de la vista de lista (reemplaza la grilla de tarjetas en
// IndicadoresModule): mismo contenido que IndicadorCard, pero distribuido en
// columnas — izquierda identidad, centro valor/variación, gráfico ancho al
// medio, derecha objetivo/responsable/frecuencia. Se apila en celular.
// IndicadorCard.jsx no se toca: la sigue usando el wizard para su preview
// compacta (max-w-320px), un contexto distinto a esta lista.
export default function IndicadorRow({ indicador, historico, onClick, onRetry }) {
  const pStyle = perspectivaStyle(indicador.perspectiva)
  const { loading, data, error } = historico || { loading: false, data: null, error: null }
  const ultimo = data?.ultimoValido || null
  const unidad = indicador.unidad
  const serie = (data?.puntos || []).filter(p => p.valor !== null).map(p => Number(p.valor))

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 transition-all ${onClick ? 'hover:shadow-md' : ''}`}
      style={{ borderColor: 'rgba(15,110,86,0.1)', borderLeft: `4px solid ${pStyle.color}` }}
    >
      {/* Identidad: categoría, estado, nombre */}
      <div className="sm:w-[240px] sm:flex-shrink-0 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide"
            style={pStyle}>
            {PERSPECTIVA_LABELS[indicador.perspectiva] ?? indicador.perspectiva}
          </span>
          {!loading && !error && <EstadoBadge estado={ultimo?.estado ?? null} size="sm" />}
        </div>
        <h3 className="font-serif font-semibold text-gray-900 text-[15px] leading-snug">
          {indicador.nombre}
        </h3>
      </div>

      {/* Valor actual + variación */}
      <div className="sm:w-[170px] sm:flex-shrink-0 min-w-0">
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
          <>
            <div className="flex items-end gap-2 flex-wrap">
              <p className="text-[24px] font-bold text-gray-900 leading-none">
                {formatValor(ultimo.valor, unidad, { compact: true })}
              </p>
              <Tendencia tendencia={data?.tendencia} sentido={indicador.sentido} unidad={unidad} />
            </div>
            <p className="text-[11.5px] text-gray-400 mt-1">{periodoLargo(ultimo.periodo)}</p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-gray-400 leading-none">Sin datos</p>
            <p className="text-[11.5px] text-gray-400 mt-1 leading-snug">{motivoSinDatos(data)}</p>
          </>
        )}
      </div>

      {/* Gráfico — más ancho que en la tarjeta de grilla */}
      <div className="h-[44px] sm:h-[40px] flex-1 min-w-0">
        {serie.length > 1 && <Sparkline values={serie} color={pStyle.color} surface="#fff" height={40} />}
      </div>

      {/* Objetivo, responsable y frecuencia */}
      <div className="sm:w-[220px] sm:flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-6 grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11.5px]"
        style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
        <span className="text-gray-400">Objetivo</span>
        <span className="text-right font-semibold text-gray-700 truncate">
          {formatValor(indicador.valor_objetivo, unidad) ?? '—'}
          <span className="font-normal text-gray-400"> · {UNIDAD_LABELS[unidad] ?? unidad ?? '—'}</span>
        </span>
        <span className="flex items-center gap-1 text-gray-400"><User size={11} /> Responsable</span>
        <span className="text-right text-gray-700 truncate" title={indicador.responsable}>{indicador.responsable || '—'}</span>
        <span className="flex items-center gap-1 text-gray-400"><CalendarClock size={11} /> Frecuencia</span>
        <span className="text-right text-gray-700">{FRECUENCIA_LABELS[indicador.frecuencia] ?? indicador.frecuencia ?? '—'}</span>
      </div>
    </Wrapper>
  )
}
