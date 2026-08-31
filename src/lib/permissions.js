// Fuente única de verdad para qué páginas/módulos puede ver cada rol.
// null = acceso total (sin restricción). Reutilizado por el sidebar (Layout.jsx)
// y por el adaptador de contextos de Nexi (nexiModules.js).
export const ROLE_PAGES = {
  'Superadmin': null,
  'Dirección':  null,
  'Director':   null,
  'Operativo':  ['dashboard', 'operations'],
  'Contable':   ['dashboard', 'finance', 'reportes'],
  'Comercial':  ['dashboard', 'crm'],
  'Mando Medio': ['dashboard', 'operations', 'crm'],
  'Operario':    ['dashboard', 'operations'],
  'Auditor / Lector': ['dashboard', 'finance', 'operations', 'crm', 'reportes'],
  'Externo':     ['dashboard'],
}

export function getAllowedPages(role) {
  return ROLE_PAGES[role] ?? null
}
