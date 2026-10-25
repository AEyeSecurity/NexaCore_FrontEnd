// Módulos de Nexi que tienen sugerencias en el estado vacío del chat. Los ids
// son los slugs reales de public.modulos, los mismos que llegan en
// `allowedModules` (GET /api/dashboard/config). Nexi no fija un contextoModulo:
// el backend elige las herramientas según la pregunta y aplica los permisos.
// Las sugerencias son solo ayudas visuales; no representan permisos ni lógica.
export const NEXI_MODULES = [
  { id: 'finance',      label: 'Finanzas' },
  { id: 'indicadores',  label: 'Indicadores' },
  { id: 'operations',   label: 'Operativo' },
  { id: 'crm',          label: 'CRM' },
  { id: 'protocolos',   label: 'Protocolos' },
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'organizacion', label: 'Organización' },
  { id: 'reportes',     label: 'Reportes' },
]

// Cada sugerencia se responde con una herramienta existente de Nexi
// (backend: nexi/tools/*Tools.js), indicada al lado.
export const NEXI_GENERAL_SUGGESTIONS = [
  { text: '¿Cuánto ingresamos este mes?',                          module: 'finance' },      // resumen_finanzas
  { text: '¿Cómo están mis indicadores?',                          module: 'indicadores' },  // listar_indicadores
  { text: '¿Cuáles son mis tareas pendientes?',                    module: 'operations' },   // mis_tareas_pendientes
  { text: 'Mostrame un resumen del CRM.',                          module: 'crm' },          // metricas_crm
  { text: 'Mostrame un resumen de los protocolos.',                module: 'protocolos' },   // resumen_protocolos
  { text: 'Resumime mi dashboard.',                                module: 'dashboard' },    // resumen_dashboard
  { text: '¿Cómo está organizada la estructura de la empresa?',    module: 'organizacion' }, // estructura_organizacion
  { text: '¿Qué reportes generé últimamente?',                     module: 'reportes' },     // mis_reportes
]

const MAX_SUGGESTIONS = 4

// Páginas de la app (App.jsx) que corresponden a un módulo de Nexi. Inicio,
// Usuarios y el resto no tienen módulo: se muestran las sugerencias generales.
const PAGE_MODULE = {
  dashboard: 'dashboard', indicadores: 'indicadores', finance: 'finance',
  operations: 'operations', crm: 'crm', protocolos: 'protocolos',
  reportes: 'reportes', organizacion: 'organizacion',
}

export function moduleForPage(page) {
  return PAGE_MODULE[page] ?? null
}

// Herramientas de Nexi → módulo (backend: nexi/tools/registry.js). Solo se usa
// para mostrar las fuentes de una respuesta; los nombres internos nunca se muestran.
const TOOL_MODULE = {
  resumen_finanzas: 'finance', flujo_financiero: 'finance',
  proximos_vencimientos: 'finance', total_movimientos_periodo: 'finance',
  listar_indicadores: 'indicadores', valor_indicador: 'indicadores', historico_indicador: 'indicadores',
  resumen_operativo: 'operations', mis_tareas_pendientes: 'operations',
  metricas_crm: 'crm',
  mi_dashboard: 'dashboard', catalogo_dashboard: 'dashboard',
  datos_widget_dashboard: 'dashboard', resumen_dashboard: 'dashboard',
  mi_posicion_organigrama: 'organizacion', mi_equipo: 'organizacion',
  estructura_organizacion: 'organizacion', buscar_puesto: 'organizacion',
  listar_protocolos: 'protocolos', detalle_protocolo: 'protocolos',
  ejecuciones_protocolos: 'protocolos', resumen_protocolos: 'protocolos',
  estado_modulo_reportes: 'reportes', tipos_de_reporte: 'reportes',
  mis_reportes: 'reportes', generar_reporte: 'reportes',
}

// Nombres legibles de los módulos consultados, sin repetir y en el orden de uso.
// Herramientas desconocidas se omiten.
export function sourceLabels(herramientasUsadas = []) {
  const labels = herramientasUsadas
    .map(h => NEXI_MODULES.find(m => m.id === TOOL_MODULE[h])?.label)
    .filter(Boolean)
  return [...new Set(labels)]
}

// Módulos habilitados según la Matriz de permisos real (allowedModules).
// No calcula permisos: solo interseca el catálogo de Nexi con lo que el
// backend ya habilitó. El backend sigue siendo la autoridad final.
export function getNexiModules(allowedModules = []) {
  return NEXI_MODULES.filter(m => allowedModules.includes(m.id))
}

// Sugerencias de los módulos accesibles, primero las del módulo de la página actual.
export function suggestionsFor(nexiModules, currentModule) {
  const allowedIds = nexiModules.map(m => m.id)
  const available = NEXI_GENERAL_SUGGESTIONS.filter(s => allowedIds.includes(s.module))
  const ordered = [
    ...available.filter(s => s.module === currentModule),
    ...available.filter(s => s.module !== currentModule),
  ]
  return ordered.slice(0, MAX_SUGGESTIONS).map(s => s.text)
}
