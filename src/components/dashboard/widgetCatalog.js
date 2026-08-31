import {
  TrendingUp, TrendingDown, Activity, Receipt,
  Wallet, Users, Briefcase,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatK, fmtARS } from './format'

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Módulos reales (slugs) tal como los define el backend en la tabla `modulos`
// y en dashboard/config/widgets.js. Solo se usan para agrupar visualmente el
// panel de edición — el permiso real llega en `allowedModules` desde
// GET /api/dashboard/config, nunca se infiere localmente por rol.
export const MODULE_META = {
  finance:       { label: 'Finanzas',      color: '#0F6E56' },
  crm:           { label: 'CRM',           color: '#DB2777' },
  operations:    { label: 'Operativo',     color: '#D97706' },
}

// Un "group" agrupa mosaicos que comparten el mismo endpoint fuente, para
// pedir los datos una sola vez aunque haya varios mosaicos de ese grupo
// visibles a la vez (ej. ingresos/gastos/resultado neto comparten
// GET /api/finance/movimientos/metricas).
//
// `aggregate` solo lo usan los mosaicos con periodMonths > 1 (ej. "últimos
// 6 meses"): el backend solo acepta un mes puntual, así que useDashboardMetrics
// pide varios meses en paralelo y aggregate combina esos resultados. Es una
// suma en el frontend, no una agregación real del backend — los % de
// tendencia mes a mes no tienen sentido sumados, por eso se devuelven en null.
export const WIDGET_GROUPS = {
  'finance-movimientos': {
    supportsPeriod: true,
    fetch: (params) => api.getMetricas(params),
    aggregate: (monthly, periods) => {
      const ingresos = monthly.reduce((s, r) => s + Number(r?.ingresos || 0), 0)
      const gastos   = monthly.reduce((s, r) => s + Number(r?.gastos || 0), 0)
      const catTotals = {}
      monthly.forEach(r => {
        (r?.gastosPorCategoria || []).forEach(c => {
          catTotals[c.categoria] = (catTotals[c.categoria] || 0) + Number(c.total || 0)
        })
      })
      // monthly (y periods) vienen del más reciente al más viejo
      // (trailingPeriods); para un gráfico se lee de izquierda a derecha,
      // así que se invierten acá.
      const chronological = [...monthly].reverse()
      const chronPeriods  = [...(periods || [])].reverse()
      return {
        ingresos,
        gastos,
        balance: ingresos - gastos,
        // Fecha real de cada punto (primer día del mes) — para ejes de
        // gráfico que necesiten mostrar el período real, no un índice.
        serieDates: chronPeriods.map(p => ({
          fecha: `${p.anio}-${String(p.mes).padStart(2, '0')}-01`,
          label: MESES_CORTO[p.mes - 1] || '',
        })),
        serieIngresos: chronological.map(r => Number(r?.ingresos || 0)),
        serieGastos:   chronological.map(r => Number(r?.gastos || 0)),
        serieBalance:  chronological.map(r => Number(r?.ingresos || 0) - Number(r?.gastos || 0)),
        gastosPorCategoria: Object.entries(catTotals)
          .map(([categoria, total]) => ({ categoria, total }))
          .sort((a, b) => b.total - a.total),
        // No es acumulable: es el pendiente de OCR actual, no algo del período.
        pendientesOCR: monthly[0]?.pendientesOCR ?? 0,
      }
    },
  },
  'finance-salarios': {
    supportsPeriod: true,
    fetch: (params) => api.getMetricasSalarios(params),
    aggregate: (monthly) => ({
      // Dotación es una foto del mes más reciente, no se suma entre meses.
      totalEmpleados: monthly[0]?.totalEmpleados ?? 0,
      totalNomina: monthly.reduce((s, r) => s + Number(r?.totalNomina || 0), 0),
    }),
  },
  'crm-contactos': {
    supportsPeriod: true,
    fetch: (params) => api.getMetricasCrm(params),
    aggregate: (monthly) => ({
      total:       monthly.reduce((s, r) => s + Number(r?.total || 0), 0),
      clientes:    monthly.reduce((s, r) => s + Number(r?.clientes || 0), 0),
      prospectos:  monthly.reduce((s, r) => s + Number(r?.prospectos || 0), 0),
      proveedores: monthly.reduce((s, r) => s + Number(r?.proveedores || 0), 0),
    }),
  },
  'operations-tareas': {
    supportsPeriod: true,
    fetch: (params) => api.getMetricasOperations(params),
    aggregate: (monthly) => ({
      total:       monthly.reduce((s, r) => s + Number(r?.total || 0), 0),
      pendientes:  monthly.reduce((s, r) => s + Number(r?.pendientes || 0), 0),
      enProceso:   monthly.reduce((s, r) => s + Number(r?.enProceso || 0), 0),
      completadas: monthly.reduce((s, r) => s + Number(r?.completadas || 0), 0),
    }),
  },
}

// Clave de la serie de datos que le corresponde a un mosaico: mosaicos del
// mismo group y mismo periodMonths comparten una sola llamada a la fuente.
export function seriesKeyFor(widget) {
  return `${widget.group}:${widget.periodMonths || 1}`
}

// Catálogo cerrado — los IDs, `module` y `requiresRole` deben calzar
// exactamente con dashboard/config/widgets.js del backend. title/icon/colors
// y las funciones de presentación son responsabilidad del frontend.
export const WIDGET_CATALOG = {
  finanzas_ingresos_mes: {
    id: 'finanzas_ingresos_mes',
    title: 'Ingresos del mes',
    module: 'finance',
    group: 'finance-movimientos',
    type: 'metric',
    icon: TrendingUp,
    colors: { bg: '#F0FDF9', accent: '#059669', iconBg: '#D1FAE5' },
    getValue: (data) => formatK(data?.ingresos),
    getTrend: (data) => data?.pctIngreso,
    positiveDirection: 'up',
  },
  finanzas_ingresos_6m: {
    id: 'finanzas_ingresos_6m',
    title: 'Ingresos (últimos 6 meses)',
    question: '¿Cómo venimos con los ingresos?',
    subtitle: 'Evolución de ingresos — últimos 6 meses',
    module: 'finance',
    group: 'finance-movimientos',
    periodMonths: 6,
    type: 'trend',
    icon: TrendingUp,
    colors: { bg: '#F0FDF9', accent: '#059669', iconBg: '#D1FAE5' },
    positiveDirection: 'up',
    getValue: (data) => formatK(data?.ingresos),
    // Array de {fecha, label, valor} — mismo formato que Gastos (6 meses).
    getSeries: (data) => (data?.serieDates || []).map((d, i) => ({
      ...d,
      valor: data?.serieIngresos?.[i] ?? 0,
    })),
  },
  finanzas_gastos_mes: {
    id: 'finanzas_gastos_mes',
    title: 'Gastos del mes',
    module: 'finance',
    group: 'finance-movimientos',
    type: 'metric',
    icon: TrendingDown,
    colors: { bg: '#FFF1F2', accent: '#E11D48', iconBg: '#FFE4E6' },
    getValue: (data) => formatK(data?.gastos),
    getTrend: (data) => data?.pctGasto,
    positiveDirection: 'down',
  },
  finanzas_gastos_6m: {
    id: 'finanzas_gastos_6m',
    title: 'Gastos (últimos 6 meses)',
    question: '¿Cómo venimos con los gastos?',
    subtitle: 'Evolución de gastos — últimos 6 meses',
    module: 'finance',
    group: 'finance-movimientos',
    periodMonths: 6,
    type: 'trend',
    icon: TrendingDown,
    colors: { bg: '#FFF1F2', accent: '#E11D48', iconBg: '#FFE4E6' },
    positiveDirection: 'down',
    getValue: (data) => formatK(data?.gastos),
    // Array de {fecha, label, valor} — un punto real por mes, no un índice
    // sin fecha. Ya viene de datos reales (6 llamadas al endpoint mensual
    // existente); el día es siempre "01" porque el backend solo da mes/año.
    getSeries: (data) => (data?.serieDates || []).map((d, i) => ({
      ...d,
      valor: data?.serieGastos?.[i] ?? 0,
    })),
  },
  finanzas_resultado_neto: {
    id: 'finanzas_resultado_neto',
    title: 'Resultado neto',
    module: 'finance',
    group: 'finance-movimientos',
    type: 'metric',
    icon: Activity,
    colors: { bg: '#EFF6FF', accent: '#2563EB', iconBg: '#DBEAFE' },
    getValue: (data) => formatK(data?.balance),
  },
  finanzas_resultado_neto_6m: {
    id: 'finanzas_resultado_neto_6m',
    title: 'Resultado neto (últimos 6 meses)',
    question: 'Balance',
    subtitle: 'Ingresos menos gastos — últimos 6 meses',
    module: 'finance',
    group: 'finance-movimientos',
    periodMonths: 6,
    type: 'trend',
    chartVariant: 'bar',
    icon: Activity,
    colors: { bg: '#EFF6FF', accent: '#2563EB', iconBg: '#DBEAFE' },
    getValue: (data) => formatK(data?.balance),
    // El balance puede ser negativo — barras arriba/abajo de cero, no área.
    getSeries: (data) => (data?.serieDates || []).map((d, i) => ({
      ...d,
      valor: data?.serieBalance?.[i] ?? 0,
    })),
  },
  finanzas_metricas_movimientos: {
    id: 'finanzas_metricas_movimientos',
    title: 'Gastos por categoría',
    module: 'finance',
    group: 'finance-movimientos',
    type: 'detail',
    icon: Receipt,
    colors: { bg: '#F5F3FF', accent: '#6D28D9' },
    // Todas las categorías con gasto (no un top fijo) y siempre de mayor a
    // menor — no se asume el orden del backend, se ordena acá para que la
    // categoría con más gasto quede arriba pase lo que pase.
    getRows: (data) => {
      const categorias = Array.isArray(data?.gastosPorCategoria) ? data.gastosPorCategoria : []
      return categorias
        .filter(c => Number(c.total) > 0)
        .slice()
        .sort((a, b) => Number(b.total) - Number(a.total))
        .map(c => ({ label: c.categoria, value: fmtARS(Number(c.total)) }))
    },
  },
  finanzas_metricas_movimientos_6m: {
    id: 'finanzas_metricas_movimientos_6m',
    title: 'Gastos por categoría (últimos 6 meses)',
    module: 'finance',
    group: 'finance-movimientos',
    periodMonths: 6,
    type: 'detail',
    icon: Receipt,
    colors: { bg: '#F5F3FF', accent: '#6D28D9' },
    getRows: (data) => {
      const categorias = Array.isArray(data?.gastosPorCategoria) ? data.gastosPorCategoria : []
      return categorias
        .filter(c => Number(c.total) > 0)
        .slice()
        .sort((a, b) => Number(b.total) - Number(a.total))
        .map(c => ({ label: c.categoria, value: fmtARS(Number(c.total)) }))
    },
  },
  finanzas_metricas_salarios: {
    id: 'finanzas_metricas_salarios',
    title: 'Nómina',
    module: 'finance',
    requiresRole: ['Dirección', 'Superadmin'],
    group: 'finance-salarios',
    type: 'detail',
    icon: Wallet,
    colors: { bg: '#F0FDFA', accent: '#0F766E' },
    getRows: (data) => [
      { label: 'Empleados activos', value: String(data?.totalEmpleados ?? 0) },
      { label: 'Total nómina', value: fmtARS(Number(data?.totalNomina ?? 0)) },
    ],
  },
  finanzas_metricas_salarios_6m: {
    id: 'finanzas_metricas_salarios_6m',
    title: 'Nómina (últimos 6 meses)',
    module: 'finance',
    requiresRole: ['Dirección', 'Superadmin'],
    group: 'finance-salarios',
    periodMonths: 6,
    type: 'detail',
    icon: Wallet,
    colors: { bg: '#F0FDFA', accent: '#0F766E' },
    getRows: (data) => [
      { label: 'Empleados activos', value: String(data?.totalEmpleados ?? 0) },
      { label: 'Total nómina pagada', value: fmtARS(Number(data?.totalNomina ?? 0)) },
    ],
  },
  crm_metricas_contactos: {
    id: 'crm_metricas_contactos',
    title: 'Contactos CRM',
    module: 'crm',
    group: 'crm-contactos',
    type: 'detail',
    icon: Users,
    colors: { bg: '#FDF2F8', accent: '#DB2777' },
    getRows: (data) => [
      { label: 'Total', value: String(data?.total ?? 0) },
      { label: 'Clientes', value: String(data?.clientes ?? 0) },
      { label: 'Prospectos', value: String(data?.prospectos ?? 0) },
      { label: 'Proveedores', value: String(data?.proveedores ?? 0) },
    ],
  },
  crm_metricas_contactos_6m: {
    id: 'crm_metricas_contactos_6m',
    title: 'Contactos CRM (últimos 6 meses)',
    module: 'crm',
    group: 'crm-contactos',
    periodMonths: 6,
    type: 'detail',
    icon: Users,
    colors: { bg: '#FDF2F8', accent: '#DB2777' },
    getRows: (data) => [
      { label: 'Total', value: String(data?.total ?? 0) },
      { label: 'Clientes', value: String(data?.clientes ?? 0) },
      { label: 'Prospectos', value: String(data?.prospectos ?? 0) },
      { label: 'Proveedores', value: String(data?.proveedores ?? 0) },
    ],
  },
  operativo_metricas_tareas: {
    id: 'operativo_metricas_tareas',
    title: 'Tareas',
    module: 'operations',
    group: 'operations-tareas',
    type: 'detail',
    icon: Briefcase,
    colors: { bg: '#FFFBEB', accent: '#D97706' },
    getRows: (data) => [
      { label: 'Total', value: String(data?.total ?? 0) },
      { label: 'Pendientes', value: String(data?.pendientes ?? 0) },
      { label: 'En proceso', value: String(data?.enProceso ?? 0) },
      { label: 'Completadas', value: String(data?.completadas ?? 0) },
    ],
  },
  operativo_metricas_tareas_6m: {
    id: 'operativo_metricas_tareas_6m',
    title: 'Tareas (últimos 6 meses)',
    module: 'operations',
    group: 'operations-tareas',
    periodMonths: 6,
    type: 'detail',
    icon: Briefcase,
    colors: { bg: '#FFFBEB', accent: '#D97706' },
    getRows: (data) => [
      { label: 'Total', value: String(data?.total ?? 0) },
      { label: 'Pendientes', value: String(data?.pendientes ?? 0) },
      { label: 'En proceso', value: String(data?.enProceso ?? 0) },
      { label: 'Completadas', value: String(data?.completadas ?? 0) },
    ],
  },
}

export const WIDGET_IDS = Object.keys(WIDGET_CATALOG)

// Espejo, solo para UX, de la regla que el backend ya aplica en
// dashboard/services/dashboardService.js (_widgetPermitido): un mosaico se
// puede marcar en el panel si su módulo está en `allowedModules` (fuente de
// verdad del backend) y, si declara `requiresRole`, el rol del usuario está
// incluido. El guardado real igual queda validado server-side (403 si no
// corresponde) — este chequeo solo evita ofrecer opciones que van a fallar.
export function isWidgetSelectable(widgetId, allowedModules, userRole) {
  const widget = WIDGET_CATALOG[widgetId]
  if (!widget) return false
  if (!allowedModules?.includes(widget.module)) return false
  if (widget.requiresRole && !widget.requiresRole.includes(userRole)) return false
  return true
}
