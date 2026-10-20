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

// Mando alto según el nivel jerárquico que devuelve el backend (/api/rbac/perfil).
// Solo oculta/mostrar acciones: la autorización real la valida el backend (403).
export function isHighHierarchy(user) {
  return user?.hierarchyLevel === 'HIGH'
}

// Módulos habilitados según la Matriz de permisos (usuario > rol). La única
// fuente accesible para cualquier usuario es GET /api/dashboard/config.
// Mientras carga (o si falla) devuelve [] → lo que depende de él queda oculto.
// También define qué contextos ofrece Nexi (ver nexiModules.js).
//
// Cacheado por sesión (por `userKey`): el sidebar y la pantalla de Inicio
// montan este hook casi al mismo tiempo al loguearse y pedían cada uno su
// propia copia del mismo GET; ahora comparten un único pedido en vuelo, y
// una vez resuelto queda en memoria — volver a Inicio más tarde no vuelve a
// pedirlo. Solo la primera vez de la sesión paga el viaje de red real.
let cacheKey
let cachedPromise = null

function fetchAllowedModulesOnce(userKey) {
  if (cacheKey === userKey && cachedPromise) return cachedPromise
  cacheKey = userKey
  cachedPromise = api.getDashboardConfig()
    .then(res => res?.allowedModules || [])
    .catch(() => [])
  return cachedPromise
}

// Devuelve [allowedModules, loading]: `loading` permite a quien lo use
// distinguir "todavía no sé" de "ya sé y no tiene acceso" (ej. para no
// esconder/mostrar de golpe un ítem que depende de este pedido).
export function useAllowedModules(userKey) {
  const [allowedModules, setAllowedModules] = useState([])
  const [loading, setLoading] = useState(cacheKey !== userKey)
  useEffect(() => {
    let alive = true
    setLoading(cacheKey !== userKey)
    fetchAllowedModulesOnce(userKey).then(data => {
      if (alive) { setAllowedModules(data); setLoading(false) }
    })
    return () => { alive = false }
  }, [userKey])
  return [allowedModules, loading]
}
