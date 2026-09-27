import { TrendingUp, Gauge, Briefcase, Users } from 'lucide-react'

// Único mapa de contextos de Nexi: label visual → slug del backend.
// Los ids son los slugs reales de public.modulos, los mismos que llegan en
// `allowedModules` (GET /api/dashboard/config) y los únicos que acepta
// `contextoModulo` en POST /api/nexi/chat. Protocolos queda afuera: Nexi V1
// no tiene herramientas para ese módulo.
// `suggestions` son solo ayudas visuales para el estado vacío; no representan
// permisos ni lógica.
export const NEXI_MODULES = [
  {
    id: 'finance', label: 'Finanzas', icon: TrendingUp,
    suggestions: ['¿Cuánto ingresamos este mes?', '¿Cómo evolucionaron los gastos?'],
  },
  {
    id: 'indicadores', label: 'Indicadores', icon: Gauge,
    suggestions: ['¿Cómo están mis indicadores?', '¿Cómo evolucionó Gastos sobre ingresos?'],
  },
  {
    id: 'operations', label: 'Operativo', icon: Briefcase,
    suggestions: ['¿Cuáles son mis tareas pendientes?'],
  },
  {
    id: 'crm', label: 'CRM', icon: Users,
    suggestions: ['Mostrame un resumen del CRM.'],
  },
]

export const NEXI_GENERAL_LABEL = 'General'

export const NEXI_GENERAL_SUGGESTIONS = [
  { text: '¿Cuánto ingresamos este mes?',       module: 'finance' },
  { text: '¿Cómo están mis indicadores?',       module: 'indicadores' },
  { text: '¿Cuáles son mis tareas pendientes?', module: 'operations' },
  { text: 'Mostrame un resumen del CRM.',       module: 'crm' },
]

// Contextos que se muestran según la Matriz de permisos real (allowedModules).
// No calcula permisos: solo interseca el catálogo de Nexi con lo que el
// backend ya habilitó. El backend sigue siendo la autoridad final.
export function getNexiModules(allowedModules = []) {
  return NEXI_MODULES.filter(m => allowedModules.includes(m.id))
}

export function getNexiModuleLabel(moduleId) {
  return NEXI_MODULES.find(m => m.id === moduleId)?.label ?? NEXI_GENERAL_LABEL
}
