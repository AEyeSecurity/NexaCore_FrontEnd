import { useMemo, useState } from 'react'
import { Pencil, Trash2, AlertCircle, RefreshCw, Hash, LineChart as LineIcon, BarChart3, AreaChart as AreaIcon, Gauge } from 'lucide-react'
import AppModal from '../../components/AppModal'
import { api } from '../../lib/api'
import SideDrawer from './SideDrawer'
import IndicadorViz, { EstadoBadge, periodoLargo, motivoSinDatos } from './IndicadorViz'
import { useVariables } from './indicadoresData'
import { formulaLegible } from './formula'
import {
  PERSPECTIVA_LABELS, FRECUENCIA_LABELS, UNIDAD_LABELS, SENTIDO_LABELS, SENTIDO_HINTS,
  VISUALIZACIONES, perspectivaStyle, formatValor, mensajeErrorHttp, mensajeErrorCalculo,
} from './constants'

const BORDER = 'rgba(15,110,86,0.15)'
export const VIZ_ICON = { kpi: Hash, line: LineIcon, bar: BarChart3, area: AreaIcon, gauge: Gauge }

function Dato({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <div className="text-[13.5px] text-gray-800 mt-0.5">{children}</div>
    </div>
  )
}

function ConfirmarEliminar({ indicador, onCancel, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const confirmar = () => {
    setDeleting(true)
    setError(null)
    api.eliminarIndicador(indicador.id)
      .then(() => onDeleted())
      .catch(err => { setError(mensajeErrorHttp(err, 'accion')); setDeleting(false) })
  }

  return (
    <AppModal onClose={deleting ? () => {} : onCancel} maxWidth="max-w-md">
      <div className="p-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#FEE2E2' }}>
          <Trash2 size={18} style={{ color: '#B91C1C' }} />
        </div>
        <h3 className="font-serif text-[17px] font-semibold text-gray-900">Eliminar indicador</h3>
        <p className="text-[13px] text-gray-600 mt-1.5">
          <span className="font-semibold">{indicador.nombre}</span>
        </p>
        <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
          Este indicador dejará de estar disponible para nuevos mosaicos. Los Dashboard que ya lo utilizan conservarán su configuración.
        </p>
        {error && (
          <div className="flex items-start gap-1.5 text-[12.5px] text-red-600 mt-3">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}
        <div className="flex justify-end gap-2.5 mt-5">
          <button onClick={onCancel} disabled={deleting}
            className="px-4 py-2.5 rounded-xl border text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ borderColor: BORDER }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: '#B91C1C' }}>
            {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Eliminando…' : 'Eliminar indicador'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}

export default function IndicadorDetailDrawer({ indicador, historico, onClose, onRetry, onEdit, onDeleted }) {
  const [viz, setViz] = useState('line')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { variables } = useVariables()
  const variablesByKey = useMemo(() => Object.fromEntries(variables.map(v => [v.key, v])), [variables])

  const pStyle = perspectivaStyle(indicador.perspectiva)
  const { loading, data, error } = historico || { loading: true, data: null, error: null }
  const ultimo = data?.ultimoValido || null
  const unidad = indicador.unidad
  const puntos = data?.puntos || []

  const header = (
    <div className="mt-2">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide" style={pStyle}>
        {PERSPECTIVA_LABELS[indicador.perspectiva] ?? indicador.perspectiva}
      </span>
      <div className="flex items-center gap-2 mt-3">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          style={{ borderColor: BORDER }}>
          <Pencil size={13} /> Editar
        </button>
        <button onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition-colors"
          style={{ borderColor: 'rgba(185,28,28,0.2)' }}>
          <Trash2 size={13} /> Eliminar indicador
        </button>
      </div>
    </div>
  )

  return (
    <>
      <SideDrawer title={indicador.nombre} header={header} onClose={onClose} ariaLabel="Detalle del indicador">
        {indicador.descripcion && (
          <p className="text-[13px] text-gray-600 leading-relaxed mb-5">{indicador.descripcion}</p>
        )}

        {/* Valor actual + estado */}
        <div className="rounded-2xl border p-4 mb-5" style={{ borderColor: 'rgba(15,110,86,0.1)', background: '#F8FAF9' }}>
          {loading ? (
            <p className="flex items-center gap-2 text-[13px] text-gray-400"><RefreshCw size={14} className="animate-spin" /> Cargando valores…</p>
          ) : error ? (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-start gap-1.5 text-[12.5px] text-red-600">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {mensajeErrorHttp(error)}
              </span>
              <button onClick={onRetry} className="flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-gray-700 flex-shrink-0">
                <RefreshCw size={12} /> Reintentar
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Valor actual</p>
                {ultimo ? (
                  <>
                    <p className="text-[28px] font-bold text-gray-900 leading-tight">{formatValor(ultimo.valor, unidad)}</p>
                    <p className="text-[11.5px] text-gray-400">{periodoLargo(ultimo.periodo)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[18px] font-semibold text-gray-400 leading-tight mt-1">Sin datos</p>
                    <p className="text-[11.5px] text-gray-400 mt-0.5">{motivoSinDatos(data)}</p>
                  </>
                )}
              </div>
              <EstadoBadge estado={ultimo?.estado ?? null} />
            </div>
          )}
        </div>

        {/* Histórico con selector de visualización */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wider">Histórico · últimos 12 meses</p>
          </div>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {VISUALIZACIONES.map(v => {
              const Icon = VIZ_ICON[v.id]
              const selected = viz === v.id
              return (
                <button key={v.id} onClick={() => setViz(v.id)}
                  className="border rounded-xl py-2 flex flex-col items-center gap-1 transition-colors"
                  style={{
                    borderColor: selected ? '#04342C' : BORDER,
                    background: selected ? '#F6FAF8' : '#fff',
                    borderWidth: selected ? 1.5 : 1,
                  }}>
                  <Icon size={15} style={{ color: '#0F6E56' }} />
                  <span className="text-[11px] font-semibold text-gray-700">{v.label}</span>
                </button>
              )
            })}
          </div>
          <div className="h-[210px] rounded-2xl border p-3" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            {loading ? (
              <div className="h-full flex items-center justify-center text-[12px] text-gray-400">Cargando···</div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-[12px] text-gray-400 text-center px-4">{mensajeErrorHttp(error)}</div>
            ) : (
              <IndicadorViz data={data} chartType={viz} accent={pStyle.color} idSuffix="detalle" />
            )}
          </div>
        </div>

        {/* Definición */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-6">
          <Dato label="Objetivo">{formatValor(indicador.valor_objetivo, unidad) ?? '—'}</Dato>
          <Dato label="Límite aceptable">{formatValor(indicador.limite_aceptable, unidad) ?? '—'}</Dato>
          <Dato label="Responsable">{indicador.responsable || '—'}</Dato>
          <Dato label="Frecuencia">{FRECUENCIA_LABELS[indicador.frecuencia] ?? indicador.frecuencia}</Dato>
          <Dato label="Unidad">{UNIDAD_LABELS[unidad] ?? unidad}</Dato>
          <Dato label="Sentido">
            {SENTIDO_LABELS[indicador.sentido] ?? indicador.sentido}
            <p className="text-[11.5px] text-gray-400 mt-0.5">{SENTIDO_HINTS[indicador.sentido]}</p>
          </Dato>
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Fórmula</p>
          <div className="rounded-xl border px-3.5 py-3 text-[13.5px] text-gray-800" style={{ borderColor: 'rgba(15,110,86,0.1)', background: '#F8FAF9' }}>
            {formulaLegible(indicador.formula, variablesByKey)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 font-mono break-all">{indicador.formula}</p>
        </div>

        {/* Tabla del histórico */}
        {!loading && !error && puntos.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Detalle por período</p>
            <div className="rounded-xl border divide-y" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
              {[...puntos].reverse().map(p => (
                <div key={p.periodo?.clave} className="flex items-center justify-between gap-3 px-3.5 py-2.5" style={{ borderColor: 'rgba(15,110,86,0.07)' }}>
                  <span className="text-[12.5px] text-gray-600">{periodoLargo(p.periodo)}</span>
                  <span className="flex items-center gap-2.5">
                    {p.valor === null ? (
                      <span className="text-[12px] text-gray-400" title={mensajeErrorCalculo(p.error) || undefined}>
                        {p.error?.codigo === 'DIVISION_POR_CERO' ? 'División por cero' : 'Sin datos'}
                      </span>
                    ) : (
                      <span className="text-[13px] font-semibold text-gray-800">{formatValor(p.valor, unidad)}</span>
                    )}
                    <EstadoBadge estado={p.estado} size="sm" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SideDrawer>

      {confirmDelete && (
        <ConfirmarEliminar
          indicador={indicador}
          onCancel={() => setConfirmDelete(false)}
          onDeleted={() => { setConfirmDelete(false); onDeleted() }}
        />
      )}
    </>
  )
}
