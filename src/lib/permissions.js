import { useEffect, useState } from 'react'
import { api } from './api'

// Fuente única de verdad para qué páginas/módulos puede ver cada rol.
// null = acceso total (sin restricción). Reutilizado por el sidebar (Layout.jsx).
export const ROLE_PAGES = {
  'Superadmin': null,
  'Dirección':  null,
  'Director':   null,
  'Operativo':  ['dashboard', 'operations'],
  'Contable':   ['dashboard', 'finance', 'reportes'],
  'Comercial':  ['dashboard'],
  'Mando Medio': ['dashboard', 'operations'],
  'Operario':    ['dashboard', 'operations'],
  'Auditor / Lector': ['dashboard', 'finance', 'operations', 'reportes'],
  'Externo':     ['dashboard'],
}

export function getAllowedPages(role) {
  return ROLE_PAGES[role] ?? null
}

// Módulos habilitados según la Matriz de permisos (usuario > rol). La única
// fuente accesible para cualquier usuario es GET /api/dashboard/config.
// Mientras carga (o si falla) devuelve [] → lo que depende de él queda oculto.
// También define qué contextos ofrece Nexi (ver nexiModules.js).
export function useAllowedModules(userKey) {
  const [allowedModules, setAllowedModules] = useState([])
  useEffect(() => {
    let alive = true
    api.getDashboardConfig()
      .then(res => { if (alive) setAllowedModules(res?.allowedModules || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [userKey])
  return allowedModules
}
