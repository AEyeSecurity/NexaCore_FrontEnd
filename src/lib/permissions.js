import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api'
import { crearStoreModulos, leerModulos } from './allowedModulesStore'

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
// fuente accesible para cualquier usuario es GET /api/dashboard/config, que
// sigue siendo la que decide: acá solo se guarda su última respuesta.
// Mientras no hay respuesta confirmada (o si falla) devuelve [] → lo que
// depende de él queda oculto. También define qué contextos ofrece Nexi.
//
// Estado compartido por sesión (ver allowedModulesStore.js): Inicio, sidebar y
// Nexi comparten un único pedido en vuelo; una respuesta ya confirmada se lee
// en el primer render (volver a Inicio no parpadea) y se revalida en segundo
// plano pasados 60 s. Se descarta al iniciar o cerrar sesión (App.jsx).
const modulosStore = crearStoreModulos(
  () => api.getDashboardConfig().then(res => res?.allowedModules || [])
)

// Dispara el pedido apenas se conoce la sesión (App.jsx), antes de renderizar
// Inicio, sidebar y Nexi: cuando ellos montan ya está en vuelo y lo reutilizan.
export function prefetchAllowedModules(userKey) {
  modulosStore.asegurar(userKey)
}

// Descarta los módulos de la sesión anterior (logout, login con otra cuenta).
export function clearAllowedModules() {
  modulosStore.limpiar()
}

// Devuelve [allowedModules, loading, status]: `loading` distingue "todavía no
// sé" de "ya sé y no tiene acceso" (para reservar el lugar de un ítem sin
// mostrarlo ni esconderlo de golpe). status: 'loading' | 'success' | 'error' | 'idle'.
export function useAllowedModules(userKey) {
  const entry = useSyncExternalStore(modulosStore.subscribe, () => modulosStore.snapshot(userKey))
  useEffect(() => {
    modulosStore.asegurar(userKey)
  }, [userKey])
  return leerModulos(entry, userKey)
}
