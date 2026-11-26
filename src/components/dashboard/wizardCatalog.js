import { TrendingUp, Briefcase, Gauge, ShieldCheck, Bell, LayoutGrid } from 'lucide-react'
import { WIDGET_CATALOG, PERIOD_LABELS } from './widgetCatalog'
import { periodosCompatibles } from '../../modules/indicadores/constants'

// Capa de presentación del asistente "Crear gráfico personalizado".
//
// QUÉ se puede agregar (módulos, métricas, períodos, visualizaciones, tipos de
// alerta y horizontes) lo define GET /api/dashboard/catalogo, ya filtrado por
// permisos y sin mosaicos deprecados (CRM). Si un módulo no viene, no se
// muestra. Acá solo vive cómo se ve cada módulo (ícono, color, orden).

// Claves de módulo del catálogo (`modules[].module`).
export const INDICATOR_MODULE = 'indicador'

// Orden de las tarjetas (grilla de 2 columnas, todas del mismo tamaño) del paso "Módulo".
const GRID_ORDER = ['finanzas', 'operativo', 'indicador', 'protocolos', 'alertas']

const MODULE_PRESENTATION = {
  finanzas:   { icon: TrendingUp,  color: '#0F6E56', label: 'Finanzas' },
  operativo:  { icon: Briefcase,   color: '#D97706', label: 'Operativo' },
  indicador:  { icon: Gauge,       color: '#3B6FD6', label: 'Indicador' },
  protocolos: { icon: ShieldCheck, color: '#6A52D6', label: 'Protocolos' },
  alertas:    { icon: Bell,        color: '#0F6E56', label: 'Alertas' },
}

// Subtítulo de cada métrica en el paso 2 (opcional; sin entrada no se muestra).
const METRIC_TAG = {
  finanzas_ingresos_mes:         'Tendencia en el tiempo',
  finanzas_gastos_mes:           'Tendencia en el tiempo',
  finanzas_resultado_neto:       'Tendencia en el tiempo',
  finanzas_metricas_movimientos: 'Desglose por categoría',
  finanzas_metricas_salarios:    'Resumen del período',
  operativo_metricas_tareas:     'Resumen del período',
  protocolos_activos:            'Total y por categoría',
  protocolos_registros:          'Registros cargados en el período',
  protocolos_incumplimientos:    'Porcentaje con ítems fallidos',
  protocolos_ultimos_registros:  'Listado',
  protocolos_sin_registros:      'Listado',
  alertas_proximas:              'Vencimientos dentro del horizonte',
}

// Métricas que el frontend sabe dibujar (cualquier otra se omite).
function renderableMetrics(mod) {
  return (Array.isArray(mod?.metrics) ? mod.metrics : [])
    .filter(m => m?.id && WIDGET_CATALOG[m.id])
    .map(m => ({
      ...m,
      label: m.title || WIDGET_CATALOG[m.id].title,
      tag: METRIC_TAG[m.id] || '',
      periods: Array.isArray(m.periods) ? m.periods : [],
      chartTypes: Array.isArray(m.chartTypes) && m.chartTypes.length ? m.chartTypes : ['kpi'],
      defaultChartType: m.defaultChartType || m.chartTypes?.[0] || 'kpi',
    }))
}

// Respuesta del catálogo → módulos ordenados según GRID_ORDER, cada uno con
// { id, label, icon, color, metrics }. Módulos sin métricas dibujables se omiten.
export function buildWizardModules(catalogo) {
  const mods = (Array.isArray(catalogo?.modules) ? catalogo.modules : [])
    .map(m => {
      const p = MODULE_PRESENTATION[m.module] || { icon: LayoutGrid, color: '#4B5563' }
      return {
        id: m.module,
        label: p.label || m.label || m.module,
        icon: p.icon,
        color: p.color,
        metrics: renderableMetrics(m),
      }
    })
    .filter(m => m.metrics.length > 0)

  const pos = (id) => { const i = GRID_ORDER.indexOf(id); return i === -1 ? GRID_ORDER.length : i }
  return mods.sort((a, b) => pos(a.id) - pos(b.id))
}

export function periodOptions(periods) {
  return (periods || []).map(id => ({ id, label: PERIOD_LABELS[id] || id }))
}

// Períodos del indicador: los del catálogo que además son compatibles con la
// frecuencia del indicador (el backend sigue siendo la validación final).
export function indicatorPeriodsFor(frecuencia, catalogPeriods) {
  const compat = periodosCompatibles(frecuencia)
  return (catalogPeriods || []).filter(p => compat.includes(p))
}

// Tarjetas de visualización del paso 4. Se muestran siempre las 4 base (las no
// disponibles, deshabilitadas) más cualquier otra que ofrezca la métrica.
const CHART_CARDS = {
  kpi:   { label: 'Número (KPI)', hint: 'Un valor grande del período.' },
  area:  { label: 'Área',         hint: 'Evolución del valor a lo largo de los meses.' },
  bar:   { label: 'Barras',       hint: 'Un valor por mes o por categoría.' },
  list:  { label: 'Lista',        hint: 'Filas con el detalle.' },
  line:  { label: 'Línea',        hint: 'Evolución del valor en cada período de la ventana.' },
  gauge: { label: 'Medidor',      hint: 'El porcentaje en un medidor de 0 a 100 %.' },
}
const INDICATOR_CHART_CARDS = {
  kpi:   { label: 'Número',  hint: 'El último valor calculado del indicador.' },
  line:  { label: 'Línea',   hint: 'Evolución del indicador en cada período de la ventana.' },
  bar:   { label: 'Barra',   hint: 'Un valor por período, coloreado según su estado.' },
  area:  { label: 'Área',    hint: 'Evolución del indicador con el área resaltada.' },
  gauge: { label: 'Medidor', hint: 'El último valor frente al objetivo y al límite aceptable.' },
}
const BASE_CARDS = ['kpi', 'area', 'bar', 'list']

export function chartCardsFor(metric, isIndicator) {
  const allowed = metric?.chartTypes || []
  if (isIndicator) {
    return allowed.filter(id => INDICATOR_CHART_CARDS[id]).map(id => ({ id, ...INDICATOR_CHART_CARDS[id] }))
  }
  const ids = [...BASE_CARDS, ...allowed.filter(id => !BASE_CARDS.includes(id))]
  return ids.filter(id => CHART_CARDS[id]).map(id => ({ id, ...CHART_CARDS[id] }))
}
