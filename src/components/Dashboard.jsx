import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import {
  TrendingUp, TrendingDown, Briefcase,
  ArrowUpRight, ArrowDownRight, AlertCircle,
  Activity, ChevronDown, Repeat,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatK(n) {
  if (n == null || isNaN(n)) return '—'
  const abs  = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}K`
  return `${sign}$${Math.round(abs).toLocaleString('es-AR')}`
}

function fmtARS(n) {
  if (n == null) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
}

function getMesesOptions() {
  const now  = new Date()
  const opts = []
  for (let i = 11; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const raw   = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    opts.push({ value, label: raw.charAt(0).toUpperCase() + raw.slice(1) })
  }
  return opts
}

function parseMesAnio(value) {
  const [anio, mes] = value.split('-')
  return { mes: parseInt(mes), anio: parseInt(anio) }
}

function colorAlerta(tipo) {
  if (tipo === 'vencida') return '#EF4444'
  if (tipo === 'proxima') return '#F59E0B'
  return '#3B82F6'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, trend, icon: Icon, bg, accent, iconBg, loading }) {
  const up = Number(trend) > 0
  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ background: bg }}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={20} style={{ color: accent }} />
        </div>
        {trend != null && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-full ${
              up ? 'text-emerald-700' : 'text-red-600'
            }`}
            style={{ background: 'rgba(255,255,255,0.65)' }}
          >
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(Number(trend))}%
          </span>
        )}
      </div>
      <p className="text-[24px] font-bold text-gray-900 leading-none mb-1.5">
        {loading ? <span style={{ color: accent, opacity: 0.3 }}>···</span> : value}
      </p>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
        {label}
      </p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-xl shadow-md px-3 py-2.5 text-[12px]"
      style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.dataKey === 'ingresos' ? 'Ingresos' : 'Gastos'}:</span>
          <span className="font-medium text-gray-900">{fmtARS(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard({ onNavigate }) {
  const MESES = getMesesOptions()
  const [selectedMes, setSelectedMes]   = useState(MESES[MESES.length - 1].value)
  const [loading, setLoading]           = useState(true)
  const [loadingFlujo, setLoadingFlujo] = useState(true)
  const [metricas, setMetricas]         = useState(null)
  const [tareasInfo, setTareasInfo]     = useState(null)
  const [deudasInfo, setDeudasInfo]     = useState(null)
  const [deudasList, setDeudasList]     = useState([])
  const [flujoData, setFlujoData]       = useState([])
  const [proyectos, setProyectos]       = useState([])
  const [alertas, setAlertas]           = useState([])
  const [suscProximas, setSuscProximas] = useState([])

  // Carga inicial: tareas, deudas, proyectos (no dependen del mes seleccionado)
  useEffect(() => {
    Promise.allSettled([
      api.getMetricasOperations(),
      api.getMetricasDeudas(),
      api.getDeudas({ estado: 'Pendiente' }),
      api.getProyectos(),
      api.getSuscripcionesProximasVencer(7),
    ]).then(([tar, deu, deuList, proy, susc]) => {
      if (tar.status      === 'fulfilled') setTareasInfo(tar.value)
      if (deu.status      === 'fulfilled') setDeudasInfo(deu.value)
      if (deuList.status  === 'fulfilled') {
        const lista = deuList.value?.data ?? []
        setDeudasList(lista.slice(0, 4))
        // Construir alertas desde deudas reales
        const hoy = new Date()
        const en7dias = new Date(hoy); en7dias.setDate(hoy.getDate() + 7)
        const nuevasAlertas = []
        lista.forEach(d => {
          const venc = new Date(d.vencimiento)
          if (d.estado === 'Vencida' || (d.estado === 'Pendiente' && venc < hoy)) {
            nuevasAlertas.push({ tipo: 'vencida', texto: `Deuda con ${d.acreedor} vencida — ${fmtARS(Number(d.monto))}` })
          } else if (d.estado === 'Pendiente' && venc <= en7dias) {
            const diff = Math.ceil((venc - hoy) / 86400000)
            nuevasAlertas.push({ tipo: 'proxima', texto: `Deuda con ${d.acreedor} vence en ${diff} día${diff !== 1 ? 's' : ''} — ${fmtARS(Number(d.monto))}` })
          }
        })
        setAlertas(nuevasAlertas)
      }
      if (proy.status === 'fulfilled') {
        const lista = (proy.value?.data ?? [])
          .filter(p => p.estado === 'En Curso' || p.estado === 'Planificado' || p.estado === 'En entrega')
          .slice(0, 3)
        setProyectos(lista)
      }
      if (susc.status === 'fulfilled') setSuscProximas(susc.value?.data ?? [])
    })
  }, [])

  // Flujo financiero: se recarga cuando cambia el mes seleccionado
  useEffect(() => {
    const { mes, anio } = parseMesAnio(selectedMes)
    setLoadingFlujo(true)
    api.getFlujo({ meses: 6, mes, anio })
      .then(data => setFlujoData(data?.data ?? []))
      .catch(() => setFlujoData([]))
      .finally(() => setLoadingFlujo(false))
  }, [selectedMes])

  // Carga de métricas según mes seleccionado
  const cargarMetricas = useCallback((mesValue) => {
    const { mes, anio } = parseMesAnio(mesValue)
    setLoading(true)
    api.getMetricas({ mes, anio })
      .then(data => setMetricas(data))
      .catch(() => setMetricas(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    cargarMetricas(selectedMes)
  }, [selectedMes, cargarMetricas])

  const mesLabel = MESES.find(m => m.value === selectedMes)?.label ?? ''

  const tareasTotal = tareasInfo?.pendientes ?? tareasInfo?.total ?? 0
  const tareasVenc  = tareasInfo?.vencidas ?? 0

  const totalDeudas = deudasInfo?.totalPendiente != null
    ? -Math.abs(deudasInfo.totalPendiente)
    : deudasList.reduce((s, d) => s - Math.abs(Number(d.monto)), 0)

  const deudasDisplay = deudasList.map(d => ({
    nombre: d.acreedor,
    monto:  -Math.abs(Number(d.monto)),
  }))

  // Calcula el porcentaje de avance de un proyecto en base a sus fechas
  function pctProyecto(p) {
    if (!p.fecha_inicio || !p.fecha_fin) return null
    const inicio = new Date(p.fecha_inicio)
    const fin    = new Date(p.fecha_fin)
    const hoy    = new Date()
    if (hoy >= fin) return 100
    if (hoy <= inicio) return 0
    return Math.round(((hoy - inicio) / (fin - inicio)) * 100)
  }

  function colorEstado(estado) {
    const m = { 'En Curso': '#1D9E75', 'Planificado': '#6366F1', 'Completado': '#059669', 'Pausado': '#F59E0B', 'Cancelado': '#EF4444' }
    return m[estado] ?? '#6B7280'
  }

  return (
    <div className="fade-in space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[21px] font-semibold text-gray-900">Tablero de Comando</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">NexaCore · {mesLabel}</p>
        </div>
        <div className="relative">
          <select
            value={selectedMes}
            onChange={e => setSelectedMes(e.target.value)}
            className="appearance-none border rounded-xl pl-3 pr-8 py-2 text-[13px] text-gray-700 bg-white outline-none cursor-pointer hover:border-teal-600/30 transition-colors"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}
          >
            {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── 4 Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Ingresos del mes"
          value={formatK(metricas?.ingresos)}
          trend={metricas?.pctIngreso}
          icon={TrendingUp}
          bg="#F0FDF9" accent="#059669" iconBg="#D1FAE5"
          loading={loading}
        />
        <StatCard
          label="Gastos del mes"
          value={formatK(metricas?.gastos)}
          trend={metricas?.pctGasto}
          icon={TrendingDown}
          bg="#FFF1F2" accent="#E11D48" iconBg="#FFE4E6"
          loading={loading}
        />
        <StatCard
          label="Resultado neto"
          value={formatK(metricas?.balance)}
          icon={Activity}
          bg="#EFF6FF" accent="#2563EB" iconBg="#DBEAFE"
          loading={loading}
        />
        <StatCard
          label="Tareas activas"
          value={loading ? null : String(tareasTotal)}
          sub={tareasVenc > 0 ? `${tareasVenc} vencidas` : undefined}
          icon={Briefcase}
          bg="#FFFBEB" accent="#D97706" iconBg="#FEF3C7"
        />
      </div>

      {/* ── Gráfico flujo financiero real ───────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="mb-4">
          <h3 className="font-serif font-semibold text-gray-900 text-[15px]">
            Flujo Financiero — últimos 6 meses
          </h3>
          <p className="text-[12px] text-gray-400 mt-0.5">Ingresos vs Gastos (datos reales)</p>
        </div>

        {loadingFlujo ? (
          <div className="h-[200px] flex items-center justify-center text-gray-300 text-[13px]">Cargando...</div>
        ) : flujoData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-[13px]">
            Sin movimientos registrados en los últimos 6 meses
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={flujoData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#E24B4A" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#E24B4A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,110,86,0.06)" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={v => formatK(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="ingresos" stroke="#1D9E75" strokeWidth={2.5} fill="url(#gI)" dot={false} />
                <Area type="monotone" dataKey="gastos"   stroke="#E24B4A" strokeWidth={2.5} fill="url(#gG)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2">
              {[['#1D9E75', 'Ingresos'], ['#E24B4A', 'Gastos']].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  <span className="text-[12px] text-gray-500">{l}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 3 cards inferiores ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Alertas reales */}
        <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#F5F3FF' }}>
          <h3 className="font-serif font-semibold text-[14px] mb-3" style={{ color: '#5B21B6' }}>
            Alertas & Notificaciones
          </h3>
          {metricas?.pendientesOCR > 0 && (
            <div className="flex items-start gap-2.5 py-2.5 border-b" style={{ borderColor: 'rgba(109,40,217,0.1)' }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#3B82F6' }} />
              <p className="flex-1 text-[12px] text-gray-700 leading-snug">
                {metricas.pendientesOCR} comprobante{metricas.pendientesOCR !== 1 ? 's' : ''} pendiente{metricas.pendientesOCR !== 1 ? 's' : ''} de validación OCR
              </p>
            </div>
          )}
          {alertas.length === 0 && suscProximas.length === 0 && !metricas?.pendientesOCR ? (
            <p className="text-[12px] text-gray-400 py-2">Sin alertas pendientes</p>
          ) : (
            <>
              {alertas.map((a, i) => (
                <div key={i}>
                  <div className="flex items-start gap-2.5 py-2.5">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: colorAlerta(a.tipo) }} />
                    <p className="flex-1 text-[12px] text-gray-700 leading-snug">{a.texto}</p>
                  </div>
                  {(i < alertas.length - 1 || suscProximas.length > 0) && (
                    <div className="border-b" style={{ borderColor: 'rgba(109,40,217,0.1)' }} />
                  )}
                </div>
              ))}
              {suscProximas.slice(0, 3).map((s, i) => {
                const diasLabel = s.dias_restantes === 0 ? 'vence hoy'
                  : s.dias_restantes === 1 ? 'vence mañana'
                  : `vence en ${s.dias_restantes} días`
                return (
                  <div key={s.id}>
                    <div className="flex items-start gap-2.5 py-2.5">
                      <Repeat size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                      <p className="flex-1 text-[12px] text-gray-700 leading-snug">
                        <span className="font-medium">{s.nombre}</span>{' '}
                        <span className="text-amber-600">{diasLabel}</span>
                        {' · '}{s.moneda} {Number(s.monto).toLocaleString('es-AR')}
                      </p>
                    </div>
                    {i < Math.min(suscProximas.length, 3) - 1 && (
                      <div className="border-b" style={{ borderColor: 'rgba(109,40,217,0.1)' }} />
                    )}
                  </div>
                )
              })}
              {suscProximas.length > 3 && (
                <p className="text-[11px] text-gray-400 pt-1.5">
                  + {suscProximas.length - 3} suscripción{suscProximas.length - 3 !== 1 ? 'es' : ''} próxima{suscProximas.length - 3 !== 1 ? 's' : ''}
                </p>
              )}
            </>
          )}
        </div>

        {/* Deudas pendientes reales */}
        <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#FFF7ED' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-semibold text-[14px]" style={{ color: '#C2410C' }}>
              Deudas pendientes
            </h3>
            <button
              onClick={() => onNavigate('finance', { tab: 'deudas' })}
              className="text-[11px] font-medium hover:underline"
              style={{ color: '#C2410C' }}
            >
              Ver todas
            </button>
          </div>
          {deudasDisplay.length === 0 ? (
            <p className="text-[12px] text-gray-400 py-2">Sin deudas pendientes</p>
          ) : (
            <div className="space-y-0">
              {deudasDisplay.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[13px] text-gray-600 truncate pr-2">{d.nombre}</span>
                    <span className="text-[13px] font-semibold text-red-500 flex-shrink-0">{fmtARS(d.monto)}</span>
                  </div>
                  {i < deudasDisplay.length - 1 && (
                    <div className="border-b" style={{ borderColor: 'rgba(194,65,12,0.1)' }} />
                  )}
                </div>
              ))}
              <div className="border-t pt-2.5 mt-0.5 flex items-center justify-between"
                style={{ borderColor: 'rgba(194,65,12,0.15)' }}>
                <span className="text-[12.5px] font-semibold text-gray-700">Total deudas</span>
                <span className="text-[13px] font-bold text-red-600">{fmtARS(totalDeudas)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Proyectos reales */}
        <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#F0FDFA' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-semibold text-[14px]" style={{ color: '#0F766E' }}>
              Proyectos en curso
            </h3>
            <button
              onClick={() => onNavigate('planification')}
              className="text-[11px] font-medium hover:underline"
              style={{ color: '#0F766E' }}
            >
              Ver todos
            </button>
          </div>
          {proyectos.length === 0 ? (
            <p className="text-[12px] text-gray-400 py-2">Sin proyectos activos</p>
          ) : (
            <div className="space-y-4">
              {proyectos.map((p, i) => {
                const pct = pctProyecto(p) ?? 0
                const color = colorEstado(p.estado)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] text-gray-700 font-medium truncate pr-2">{p.nombre}</span>
                      <span
                        className="text-[10.5px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{ background: color + '22', color }}
                      >
                        {p.estado}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(13,148,136,0.12)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <p className="text-[10.5px] text-gray-400 mt-0.5 text-right">{pct}%</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
