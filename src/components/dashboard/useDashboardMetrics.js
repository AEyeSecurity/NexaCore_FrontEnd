import { useCallback, useEffect, useRef, useState } from 'react'
import { WIDGET_GROUPS, seriesKeyFor } from './widgetCatalog'

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

// Pide datos solo para las "series" (group + cantidad de meses) realmente
// visibles, una vez por serie aunque varios mosaicos la compartan (ej.
// ingresos/gastos/resultado neto del mismo período comparten
// GET /api/finance/movimientos/metricas). El backend solo acepta un mes
// puntual: para cualquier ventana (1, 3, 6 o 12 meses) se piden esos meses
// en paralelo y se combinan con `aggregate` del group — la agregación se
// hace acá, no en el backend. Se recarga cuando cambia el conjunto de series
// visibles o el mes/año de referencia.
//
// `visibleWidgets` son mosaicos ya resueltos (con `.group` y `.period`).
export function useDashboardMetrics(visibleWidgets, mes, anio) {
  const [metricsBySeries, setMetricsBySeries] = useState({})
  const periodRef = useRef({ mes, anio })
  periodRef.current = { mes, anio }

  // Solo mosaicos con `group` (los de indicador piden su propio histórico).
  const seriesNeeded = [...new Set((visibleWidgets || []).filter(w => w?.group).map(seriesKeyFor))]
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

    if (!cfg.supportsPeriod) {
      finish(cfg.fetch({}))
      return
    }

    // Cualquier ventana (incluido "este mes" = 1) pasa por el mismo camino:
    // N llamadas mensuales + aggregate. Así el resultado tiene siempre la
    // misma forma (series + totales) para KPI, área, barras y lista.
    const periods = trailingPeriods(mes, anio, count)
    finish(
      Promise.all(periods.map(p => cfg.fetch({ mes: p.mes, anio: p.anio })))
        .then(monthly => cfg.aggregate ? cfg.aggregate(monthly, periods) : monthly[0])
    )
  }, [])

  useEffect(() => {
    seriesNeeded.forEach(s => fetchSeries(s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, mes, anio])

  return { metricsBySeries, retrySeries: fetchSeries }
}
