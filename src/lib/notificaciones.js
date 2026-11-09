import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api'
import { crearStoreNotificaciones, INTERVALO_NOTIFICACIONES_MS } from './notificacionesStore'

// Menciones de la sesión (ver notificacionesStore.js). Un solo estado en memoria
// compartido por la campana de Inicio y la del Layout.
const store = crearStoreNotificaciones({
  cantidad: () => api.getNotificacionesNoLeidas(),
  listar: (params) => api.getNotificaciones(params),
  marcarLeida: (id) => api.marcarNotificacionLeida(id),
  marcarTodas: () => api.marcarTodasNotificacionesLeidas(),
})

// Al volver el foco no se repite un pedido muy reciente.
const EDAD_MINIMA_FOCO_MS = 30 * 1000

export function clearNotificaciones() { store.limpiar() }
export function refrescarNotificaciones(userKey) { return store.refrescarCantidad(userKey) }
export function cargarNotificaciones(userKey, opciones) { return store.cargarLista(userKey, opciones) }
export function marcarNotificacionLeida(userKey, id) { return store.marcarLeida(userKey, id) }
export function marcarTodasNotificacionesLeidas(userKey) { return store.marcarTodas(userKey) }

export function useNotificaciones(userKey) {
  const leer = () => store.snapshot(userKey)
  return useSyncExternalStore(store.subscribe, leer, leer)
}

// Contador liviano: al iniciar sesión, al volver a la pestaña y cada 60 s con
// la pestaña visible (sugerencia del contrato; no hay tiempo real). Se llama
// una sola vez, en App.jsx, junto al de alertas.
export function useNotificacionesAutoRefresh(userKey) {
  useEffect(() => {
    if (!userKey) return
    store.asegurarCantidad(userKey)
    const visible = () => document.visibilityState === 'visible'
    const alVolver = () => { if (visible()) store.asegurarCantidad(userKey, EDAD_MINIMA_FOCO_MS) }
    const intervalo = setInterval(() => {
      if (visible()) store.asegurarCantidad(userKey, INTERVALO_NOTIFICACIONES_MS / 2)
    }, INTERVALO_NOTIFICACIONES_MS)
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [userKey])
}
