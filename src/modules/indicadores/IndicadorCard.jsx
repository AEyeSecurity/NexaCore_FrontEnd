import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus, User, CalendarClock } from 'lucide-react'
import Sparkline from '../../components/dashboard/Sparkline'
import { EstadoBadge, periodoLargo, motivoSinDatos } from './IndicadorViz'
import {
  PERSPECTIVA_LABELS, FRECUENCIA_LABELS, UNIDAD_LABELS,
  perspectivaStyle, formatValor, mensajeErrorHttp,
} from './constants'

// Flecha de tendencia a partir de `tendencia` del backend (no se recalcula).
// El color indica si el movimiento es favorable según el sentido del indicador.
function Tendencia({ tendencia, sentido, unidad }) {
  if (!tendencia) return null
  const { direccion, variacion } = tendencia
  const Icon = direccion === 'SUBE' ? TrendingUp : direccion === 'BAJA' ? TrendingDown : Minus
  const favorable = direccion === 'ESTABLE'
    ? null
    : (sentido === 'MENOR_ES_MEJOR' ? direccion === 'BAJA' : direccion === 'SUBE')
  const color = favorable === null ? '#6B7280' : favorable ? '#0F6E56' : '#B91C1C'
  const signo = variacion > 0 ? '+' : ''
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color }}
      title="Variación respecto del período anterior con datos">
      <Icon size={13} />
      {signo}{formatValor(variacion, unidad, { compact: true })}
    </span>
  )
}

// `preview`: tarjeta de ejemplo del wizard (sin datos calculados todavía).
export default function IndicadorCard({ indicador, historico, onClick, onRetry, preview = false }) {
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
      className={`w-full text-left bg-white rounded-2xl border p-5 flex flex-col transition-all ${onClick ? 'hover:shadow-md hover:-translate-y-[2px]' : ''}`}
      style={{ borderColor: 'rgba(15,110,86,0.1)', borderTop: `3px solid ${pStyle.color}` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide"
          style={pStyle}>
          {PERSPECTIVA_LABELS[indicador.perspectiva] ?? indicador.perspectiva}
        </span>
        {!preview && !loading && !error && <EstadoBadge estado={ultimo?.estado ?? null} size="sm" />}
      </div>

      <h3 className="font-serif font-semibold text-gray-900 text-[15.5px] leading-snug mb-3">
        {indicador.nombre || 'Nombre del indicador'}
      </h3>

      {/* Valor actual */}
      <div className="min-h-[74px]">
        {preview ? (
          <>
            <p className="text-[26px] font-bold text-gray-300 leading-none">—</p>
            <p className="text-[11.5px] text-gray-400 mt-1.5">El valor se calcula al crear el indicador.</p>
          </>
        ) : loading ? (
          <p className="text-[26px] font-bold leading-none" style={{ color: pStyle.color, opacity: 0.3 }}>···</p>
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
            <div className="flex items-end justify-between gap-2">
              <p className="text-[26px] font-bold text-gray-900 leading-none">
                {formatValor(ultimo.valor, unidad, { compact: true })}
              </p>
              <Tendencia tendencia={data?.tendencia} sentido={indicador.sentido} unidad={unidad} />
            </div>
            <p className="text-[11.5px] text-gray-400 mt-1.5">{periodoLargo(ultimo.periodo)}</p>
          </>
        ) : (
          <>
            <p className="text-[18px] font-semibold text-gray-400 leading-none">Sin datos</p>
            <p className="text-[11.5px] text-gray-400 mt-1.5 leading-snug">{motivoSinDatos(data)}</p>
          </>
        )}
      </div>

      {/* Tendencia histórica */}
      <div className="h-[40px] mt-2 mb-3">
        {!preview && serie.length > 1 && (
          <Sparkline values={serie} color={pStyle.color} surface="#fff" />
        )}
      </div>

      <div className="mt-auto pt-3 border-t grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11.5px]" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
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
