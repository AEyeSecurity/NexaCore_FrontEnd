import { TrendingUp, Users, Briefcase } from 'lucide-react'
import {
  WIDGET_CATALOG, MODULE_META, isWidgetSelectable,
  WIDGET_CHART_MATRIX, DASHBOARD_PERIODS, PERIOD_LABELS,
} from './widgetCatalog'

// Capa de presentación del asistente "Crear gráfico personalizado".
//
// El asistente elige, de forma independiente:
//   familia (→ ID base del catálogo)  +  period  +  chartType
// y al terminar arma { id: baseId, size: DEFAULT_TILE_SIZE, period, chartType }.
//
// Los IDs *_6m del catálogo NO se usan para crear mosaicos nuevos: quedan
// sólo para leer configuraciones históricas.

const MODULE_ICON = {
  finance: TrendingUp,
  crm: Users,
  operations: Briefcase,
}

export const WIZARD_MODULES = Object.entries(MODULE_META).map(([id, meta]) => ({
  id,
  label: meta.label,
  color: meta.color,
  icon: MODULE_ICON[id],
}))

// Los 4 períodos del contrato. Todas las familias los admiten.
export const WIZARD_PERIODS = DASHBOARD_PERIODS.map(id => ({ id, label: PERIOD_LABELS[id] }))

// Familia de métrica → ID base real del catálogo. La matriz de tipos de
// gráfico permitidos sale de WIDGET_CHART_MATRIX (aprobada por backend).
const FAMILIES_RAW = [
  { id: 'finance_ingresos',           module: 'finance',    label: 'Ingresos',              tag: 'Tendencia en el tiempo', baseId: 'finanzas_ingresos_mes' },
  { id: 'finance_gastos',             module: 'finance',    label: 'Gastos',                tag: 'Tendencia en el tiempo', baseId: 'finanzas_gastos_mes' },
  { id: 'finance_resultado',          module: 'finance',    label: 'Resultado neto',        tag: 'Tendencia en el tiempo', baseId: 'finanzas_resultado_neto' },
  { id: 'finance_gastos_categoria',   module: 'finance',    label: 'Gastos por categoría',  tag: 'Desglose por categoría', baseId: 'finanzas_metricas_movimientos' },
  { id: 'finance_nomina',             module: 'finance',    label: 'Nómina',                tag: 'Resumen del período',    baseId: 'finanzas_metricas_salarios' },
  { id: 'crm_contactos',              module: 'crm',        label: 'Contactos',             tag: 'Resumen del período',    baseId: 'crm_metricas_contactos' },
  { id: 'operations_tareas',          module: 'operations', label: 'Tareas',                tag: 'Resumen del período',    baseId: 'operativo_metricas_tareas' },
]

export const METRIC_FAMILIES = FAMILIES_RAW
  .filter(f => WIDGET_CATALOG[f.baseId] && WIDGET_CHART_MATRIX[f.baseId])
  .map(f => ({
    ...f,
    allowedChartTypes: WIDGET_CHART_MATRIX[f.baseId].allowed,
    defaultChartType: WIDGET_CHART_MATRIX[f.baseId].default,
  }))

// Familias del módulo que el usuario puede usar (permisos reales + rol).
export function familiesForModule(moduleId, allowedModules, userRole) {
  return METRIC_FAMILIES.filter(f =>
    f.module === moduleId && isWidgetSelectable(f.baseId, allowedModules, userRole)
  )
}

export function defaultChartTypeFor(family) {
  return family?.defaultChartType || 'kpi'
}

// Tarjetas de visualización del paso 4. El sistema sabe renderizar estos 4
// tipos hoy (no hay "torta").
export const CHART_TYPE_CARDS = [
  { id: 'kpi',  label: 'Número (KPI)', hint: 'Un valor grande del período.' },
  { id: 'area', label: 'Área',         hint: 'Evolución del valor a lo largo de los meses.' },
  { id: 'bar',  label: 'Barras',       hint: 'Un valor por mes o por categoría.' },
  { id: 'list', label: 'Lista',        hint: 'Filas de etiqueta y valor.' },
]
