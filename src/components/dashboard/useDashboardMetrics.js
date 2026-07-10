import { useCallback, useEffect, useRef, useState } from 'react'
import { WIDGET_CATALOG, WIDGET_GROUPS } from './widgetCatalog'

// Pide datos solo para los "groups" (endpoints fuente) de los mosaicos
// realmente visibles, una vez por grupo aunque varios mosaicos lo compartan
// (ej. ingresos/gastos/resultado neto/resumen de movimientos comparten
// GET /api/finance/movimientos/metricas). Se recarga cuando cambia el
// conjunto de grupos visibles o el período global.
export function useDashboardMetrics(visibleWidgetIds, mes, anio) {
  const [metricsByGroup, setMetricsByGroup] = useState({})
  const periodRef = useRef({ mes, anio })
  periodRef.current = { mes, anio }

  const groupsNeeded = [...new Set(
    visibleWidgetIds.map(id => WIDGET_CATALOG[id]?.group).filter(Boolean)
  )]
  const groupsKey = groupsNeeded.slice().sort().join(',')

  const fetchGroup = useCallback((group) => {
    const cfg = WIDGET_GROUPS[group]
    if (!cfg) return
    setMetricsByGroup(prev => ({ ...prev, [group]: { ...(prev[group] || {}), loading: true, error: null } }))
    const { mes, anio } = periodRef.current
    const params = cfg.supportsPeriod ? { mes, anio } : {}
    cfg.fetch(params)
      .then(data => {
        setMetricsByGroup(prev => ({ ...prev, [group]: { loading: false, error: null, data } }))
      })
      .catch(err => {
        setMetricsByGroup(prev => ({ ...prev, [group]: { loading: false, error: err.message || 'No se pudo cargar', data: null } }))
      })
  }, [])

  useEffect(() => {
    groupsNeeded.forEach(group => fetchGroup(group))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsKey, mes, anio])

  return { metricsByGroup, retryGroup: fetchGroup }
}
