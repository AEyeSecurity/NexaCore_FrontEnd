import {
  TrendingUp, TrendingDown, Activity, Receipt,
  Wallet, Users, Briefcase, Calendar,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatK, fmtARS } from './format'

// Módulos reales (slugs) tal como los define el backend en la tabla `modulos`
// y en dashboard/config/widgets.js. Solo se usan para agrupar visualmente el
// panel de edición — el permiso real llega en `allowedModules` desde
// GET /api/dashboard/config, nunca se infiere localmente por rol.
export const MODULE_META = {
  finance:       { label: 'Finanzas',      color: '#0F6E56' },
  crm:           { label: 'CRM',           color: '#DB2777' },
  operations:    { label: 'Operativo',     color: '#D97706' },
  planification: { label: 'Planificación', color: '#4F46E5' },
}

// Un "group" agrupa mosaicos que comparten el mismo endpoint fuente, para
// pedir los datos una sola vez aunque haya varios mosaicos de ese grupo
// visibles a la vez (ej. ingresos/gastos/resultado neto comparten
// GET /api/finance/movimientos/metricas).
export const WIDGET_GROUPS = {
  'finance-movimientos': {
    supportsPeriod: true,
    fetch: (params) => api.getMetricas(params),
  },
  'finance-salarios': {
    supportsPeriod: true,
    fetch: (params) => api.getMetricasSalarios(params),
  },
  'crm-contactos': {
    supportsPeriod: true,
    fetch: (params) => api.getMetricasCrm(params),
  },
  'operations-tareas': {
    supportsPeriod: true,
    fetch: (params) => api.getMetricasOperations(params),
  },
  'planification-proyectos': {
    // El backend (planificationService.getMetricas) todavía no acepta
    // mes/anio — no se inventa el filtro, este mosaico no cambia por período.
    supportsPeriod: false,
    fetch: () => api.getMetricasPlanification(),
  },
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
  finanzas_metricas_movimientos: {
    id: 'finanzas_metricas_movimientos',
    title: 'Resumen de movimientos',
    module: 'finance',
    group: 'finance-movimientos',
    type: 'detail',
    icon: Receipt,
    colors: { bg: '#F5F3FF', accent: '#6D28D9' },
    getRows: (data) => {
      const rows = [
        { label: 'Comprobantes pendientes OCR', value: String(data?.pendientesOCR ?? 0) },
      ]
      const categorias = Array.isArray(data?.gastosPorCategoria) ? data.gastosPorCategoria : []
      categorias.slice(0, 3).forEach(c => {
        rows.push({ label: c.categoria, value: fmtARS(Number(c.total)) })
      })
      return rows
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
  planificacion_metricas_proyectos: {
    id: 'planificacion_metricas_proyectos',
    title: 'Proyectos',
    module: 'planification',
    group: 'planification-proyectos',
    type: 'detail',
    icon: Calendar,
    colors: { bg: '#EEF2FF', accent: '#4F46E5' },
    getRows: (data) => [
      { label: 'Total proyectos', value: String(data?.total ?? 0) },
      { label: 'Activos', value: String(data?.activos ?? 0) },
      { label: 'Completados', value: String(data?.completados ?? 0) },
      { label: 'Presupuesto total', value: fmtARS(Number(data?.presupuestoTotal ?? 0)) },
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
