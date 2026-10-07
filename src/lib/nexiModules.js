// Módulos de Nexi que tienen sugerencias en el estado vacío del chat. Los ids
// son los slugs reales de public.modulos, los mismos que llegan en
// `allowedModules` (GET /api/dashboard/config). Nexi no fija un contextoModulo:
// el backend elige las herramientas según la pregunta y aplica los permisos.
// Las sugerencias son solo ayudas visuales; no representan permisos ni lógica.
export const NEXI_MODULES = [
  { id: 'finance' },
  { id: 'indicadores' },
  { id: 'operations' },
  { id: 'crm' },
]

export const NEXI_GENERAL_SUGGESTIONS = [
  { text: '¿Cuánto ingresamos este mes?',       module: 'finance' },
  { text: '¿Cómo están mis indicadores?',       module: 'indicadores' },
  { text: '¿Cuáles son mis tareas pendientes?', module: 'operations' },
  { text: 'Mostrame un resumen del CRM.',       module: 'crm' },
]

// Módulos habilitados según la Matriz de permisos real (allowedModules).
// No calcula permisos: solo interseca el catálogo de Nexi con lo que el
// backend ya habilitó. El backend sigue siendo la autoridad final.
export function getNexiModules(allowedModules = []) {
  return NEXI_MODULES.filter(m => allowedModules.includes(m.id))
}
