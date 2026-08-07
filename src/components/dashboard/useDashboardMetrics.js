import { useCallback, useEffect, useRef, useState } from 'react'
import { WIDGET_CATALOG, WIDGET_GROUPS, seriesKeyFor } from './widgetCatalog'

// Los `count` meses anteriores a (mes, anio) inclusive, más reciente primero.
function trailingPeriods(mes, anio, count) {
  const periods = []
  for (let i = 0; i < count; i++) {
    let m = mes - i
    let a = anio
    while (m <= 0) { m += 12; a -= 1 }
    periods.push({ mes: m, anio: a })
  }
  return periods
}

// Pide datos solo para las "series" (group + periodMonths) realmente
// visibles, una vez por serie aunque varios mosaicos la compartan (ej.
// ingresos/gastos/resultado neto del mismo mes comparten
// GET /api/finance/movimientos/metricas). Los mosaicos de "últimos 6 meses"
// piden esos 6 meses en paralelo y los combinan con `aggregate` del group —
// el backend solo acepta un mes puntual, la suma se hace acá. Se recarga
// cuando cambia el conjunto de series visibles o el período global.
export function useDashboardMetrics(visibleWidgetIds, mes, anio) {
  const [metricsBySeries, setMetricsBySeries] = useState({})
  const periodRef = useRef({ mes, anio })
  periodRef.current = { mes, anio }

  const visibleWidgets = visibleWidgetIds.map(id => WIDGET_CATALOG[id]).filter(Boolean)
  const seriesNeeded = [...new Set(visibleWidgets.map(seriesKeyFor))]
  const seriesKey = seriesNeeded.slice().sort().join(',')

  const fetchSeries = useCallback((seriesId) => {
    const [group, countStr] = seriesId.split(':')
    const cfg = WIDGET_GROUPS[group]
    if (!cfg) return
    const count = Number(countStr) || 1
    setMetricsBySeries(prev => ({ ...prev, [seriesId]: { ...(prev[seriesId] || {}), loading: true, error: null } }))
    const { mes, anio } = periodRef.current

    const finish = (promise) => promise
      .then(data => {
        setMetricsBySeries(prev => ({ ...prev, [seriesId]: { loading: false, error: null, data } }))
      })
      .catch(err => {
        setMetricsBySeries(prev => ({ ...prev, [seriesId]: { loading: false, error: err.message || 'No se pudo cargar', data: null } }))
      })

    if (count <= 1 || !cfg.supportsPeriod) {
      const params = cfg.supportsPeriod ? { mes, anio } : {}
      finish(cfg.fetch(params))
      return
    }

    const periods = trailingPeriods(mes, anio, count)
    finish(
      Promise.all(periods.map(p => cfg.fetch({ mes: p.mes, anio: p.anio })))
        .then(monthly => cfg.aggregate ? cfg.aggregate(monthly) : monthly[0])
    )
  }, [])

  useEffect(() => {
    seriesNeeded.forEach(s => fetchSeries(s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, mes, anio])

  return { metricsBySeries, retrySeries: fetchSeries }
}
