import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RefreshCw, Search, FileText, Download, Loader2, Lock, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api'
import { descargarReporteNexi } from '../../lib/nexiReportes'

// Historial de reportes generados por Nexi (GET /api/nexi/reportes). El backend
// ya filtra por usuario y exige lectura en Reportes (403 si no la tiene).

const TIPOS = [
  { value: 'financiero',    label: 'Financiero' },
  { value: 'operativo',     label: 'Operativo' },
  { value: 'crm',           label: 'CRM' },
  { value: 'indicadores',   label: 'Indicadores' },
  { value: 'protocolos',    label: 'Protocolos' },
  { value: 'dashboard',     label: 'Dashboard' },
  { value: 'organizacion',  label: 'Organización' },
  { value: 'ejecutivo',     label: 'Ejecutivo' },
  { value: 'personalizado', label: 'Personalizado' },
]
const TIPO_LABELS = Object.fromEntries(TIPOS.map(t => [t.value, t.label]))

const ESTADO_BADGE = {
  GENERADO:   { label: 'Generado',   style: { background: '#E1F5EE', color: '#0F6E56' } },
  EN_PROCESO: { label: 'En proceso', style: { background: '#FDF1E3', color: '#B4691E' } },
  DENEGADO:   { label: 'Denegado',   style: { background: '#F1F3F2', color: '#4B5A55' } },
  ERROR:      { label: 'Error',      style: { background: '#FCE9E9', color: '#C23B3A' } },
}

const borderSoft = { borderColor: 'rgba(15,110,86,0.1)' }
const borderInput = { borderColor: 'rgba(15,110,86,0.25)' }

function formatFechaHora(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

function seccionesExcluidas(reporte) {
  const lista = Array.isArray(reporte.secciones_excluidas) ? reporte.secciones_excluidas : []
  return lista
    .map(e => (typeof e === 'string' ? { titulo: e } : { titulo: e?.titulo || e?.seccion, motivo: e?.motivo }))
    .filter(e => e.titulo)
}

function listaErrorMessage(err) {
  if (err?.status === 403) return 'Tus permisos no te permiten ver reportes.'
  if (err?.status === 401) return 'Tu sesión expiró. Volvé a iniciar sesión para ver tus reportes.'
  if (err instanceof TypeError || err?.message === 'Failed to fetch') {
    return 'No se pudo conectar con el servidor. Intentá nuevamente.'
  }
  return 'No se pudo cargar el historial de reportes. Intentá nuevamente.'
}

function DownloadButton({ reporte }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState(null)
  const disponible = reporte.estado === 'GENERADO' && !!reporte.descargaUrl

  const handleDownload = async () => {
    setIsDownloading(true)
    setError(null)
    try {
      await descargarReporteNexi(reporte)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDownload}
        disabled={!disponible || isDownloading}
        aria-label={`Descargar ${reporte.titulo} en PDF`}
        title={disponible ? undefined : 'Este reporte no tiene un archivo disponible'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-white whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: '#0F6E56', ...(isDownloading ? { cursor: 'wait', opacity: 0.6 } : {}) }}
      >
        {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        {isDownloading ? 'Descargando…' : 'Descargar PDF'}
      </button>
      {error && <p className="text-[11.5px] text-right max-w-[220px]" style={{ color: '#C23B3A' }} role="alert">{error}</p>}
    </div>
  )
}

function ReporteRow({ reporte }) {
  const badge = ESTADO_BADGE[reporte.estado] ?? { label: reporte.estado, style: ESTADO_BADGE.DENEGADO.style }
  const excluidas = seccionesExcluidas(reporte)
  const tamano = reporte.estado === 'GENERADO' ? formatBytes(reporte.archivo_bytes) : null

  return (
    <tr className="border-t align-top" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#E1F5EE' }}>
            <FileText size={15} style={{ color: '#0F6E56' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 break-words">{reporte.titulo}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-px rounded-full text-[10.5px] font-bold uppercase tracking-wide" style={badge.style}>
                {badge.label}
              </span>
              {excluidas.length > 0 && (
                <span
                  className="text-[11.5px] text-gray-400"
                  title={excluidas.map(e => (e.motivo ? `${e.titulo}: ${e.motivo}` : e.titulo)).join('\n')}
                >
                  No incluye: {excluidas.map(e => e.titulo).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[13px] text-gray-600 whitespace-nowrap">{TIPO_LABELS[reporte.tipo] ?? reporte.tipo}</td>
      <td className="px-4 py-3 text-[13px] text-gray-600">{reporte.periodo_etiqueta || '—'}</td>
      <td className="px-4 py-3 text-[13px] text-gray-600 whitespace-nowrap">{formatFechaHora(reporte.created_at)}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-600">{reporte.formato || 'pdf'}</p>
        {tamano && <p className="text-[11.5px] text-gray-400 mt-0.5">{tamano}</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <DownloadButton reporte={reporte} />
      </td>
    </tr>
  )
}

function Panel({ children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-48 px-4 text-center text-gray-400 text-[13.5px] bg-white rounded-xl border" style={borderSoft}>
      {children}
    </div>
  )
}

export default function ReportesModule() {
  const [reportes, setReportes] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const [tipo, setTipo] = useState('todos')
  const [search, setSearch] = useState('')
  const [soloDescargables, setSoloDescargables] = useState(false)

  // Descarta respuestas viejas si se pide "Actualizar" varias veces seguidas.
  const reqRef = useRef(0)

  const cargar = useCallback(async ({ inicial = false } = {}) => {
    const req = ++reqRef.current
    if (inicial) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.listarReportesNexi()
      if (reqRef.current !== req) return
      const data = Array.isArray(res?.data) ? res.data : []
      setReportes(data)
      setTotal(Number.isFinite(res?.total) ? res.total : data.length)
      setError(null)
    } catch (err) {
      if (reqRef.current !== req) return
      setError({ status: err?.status, message: listaErrorMessage(err) })
    } finally {
      if (reqRef.current === req) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => { cargar({ inicial: true }) }, [cargar])

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reportes
      .filter(r => tipo === 'todos' || r.tipo === tipo)
      .filter(r => !soloDescargables || r.estado === 'GENERADO')
      .filter(r => !q || String(r.titulo || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [reportes, tipo, search, soloDescargables])

  const hayFiltros = tipo !== 'todos' || soloDescargables || search.trim() !== ''
  const sinPermiso = error?.status === 403

  return (
    <div className="fade-in space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-[20px] font-semibold text-gray-900">Reportes</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Historial de reportes que generaste con Nexi.
          </p>
        </div>
        {!sinPermiso && (
          <button
            onClick={() => cargar()}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        )}
      </div>

      {!sinPermiso && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            aria-label="Filtrar por tipo"
            className="px-3 py-2 rounded-xl border text-[13px] text-gray-700 outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
            style={borderInput}
          >
            <option value="todos">Todos los tipos</option>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título..."
              aria-label="Buscar por título"
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
              style={borderInput}
            />
          </div>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[13px] text-gray-600 bg-white cursor-pointer select-none" style={borderInput}>
            <input
              type="checkbox"
              checked={soloDescargables}
              onChange={e => setSoloDescargables(e.target.checked)}
              className="accent-[#0F6E56]"
            />
            Solo descargables
          </label>
        </div>
      )}

      {loading ? (
        <Panel>
          <span className="flex items-center"><RefreshCw size={18} className="animate-spin mr-2" /> Cargando...</span>
        </Panel>
      ) : sinPermiso ? (
        <Panel>
          <Lock size={20} />
          <p className="text-gray-500">{error.message}</p>
        </Panel>
      ) : error && reportes.length === 0 ? (
        <Panel>
          <AlertTriangle size={20} style={{ color: '#E24B4A' }} />
          <p className="text-gray-500">{error.message}</p>
          <button
            onClick={() => cargar()}
            className="px-4 py-2 rounded-xl text-white text-[13px] font-medium"
            style={{ background: '#0F6E56' }}
          >
            Reintentar
          </button>
        </Panel>
      ) : reportes.length === 0 ? (
        <Panel>
          <FileText size={20} />
          <p className="text-gray-500">Todavía no generaste reportes. Pedile uno a Nexi</p>
        </Panel>
      ) : (
        <>
          {error && (
            <p className="text-[12.5px] px-3 py-2 rounded-lg" style={{ background: '#FCE9E9', color: '#C23B3A' }} role="alert">
              {error.message}
            </p>
          )}
          <div className="bg-white rounded-xl border overflow-x-auto" style={borderSoft}>
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-[11.5px] font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Generado</th>
                  <th className="px-4 py-3">Formato</th>
                  <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(r => <ReporteRow key={r.id} reporte={r} />)}
              </tbody>
            </table>
            {visibles.length === 0 && hayFiltros && (
              <p className="py-8 text-center text-gray-400 text-[13.5px]">Ningún reporte coincide con los filtros.</p>
            )}
          </div>
          {total > reportes.length && (
            <p className="text-[12px] text-gray-400">Mostrando los {reportes.length} más recientes</p>
          )}
        </>
      )}
    </div>
  )
}
