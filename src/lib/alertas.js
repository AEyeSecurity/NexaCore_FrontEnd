import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api'
import { crearStoreAlertas, INTERVALO_ALERTAS_MS } from './alertasStore'

// Alertas dinámicas de la sesión (ver alertasStore.js). Un solo estado en
// memoria para toda la app: la campana de Inicio y la del Layout lo comparten.
const alertasStore = crearStoreAlertas(() => api.getAlertas())

// Al volver el foco o abrir el panel no se repite un pedido muy reciente.
const EDAD_MINIMA_FOCO_MS = 30 * 1000

// Descarta las alertas de la sesión anterior (logout, login con otra cuenta).
export function clearAlertas() {
  alertasStore.limpiar()
}

export function refrescarAlertas(userKey) {
  return alertasStore.refrescar(userKey)
}

// Oculta una alerta en esta sesión. No modifica nada en el sistema.
export function descartarAlerta(userKey, id) {
  alertasStore.descartar(userKey, id)
}

export function asegurarAlertas(userKey) {
  return alertasStore.asegurar(userKey, EDAD_MINIMA_FOCO_MS)
}

// Estado de las alertas de `userKey` (null hasta el primer pedido).
export function useAlertas(userKey) {
  const leer = () => alertasStore.snapshot(userKey)
  return useSyncExternalStore(alertasStore.subscribe, leer, leer)
}

// Actualización automática mientras haya sesión (se llama una sola vez, en
// App.jsx): pide al iniciar sesión, al volver a la pestaña y cada 3 minutos si
// la pestaña está visible. Sin sesión no hace nada; al cerrar sesión se
// detiene (cambia `userKey`).
export function useAlertasAutoRefresh(userKey) {
  useEffect(() => {
    if (!userKey) return
    alertasStore.asegurar(userKey)
    const visible = () => document.visibilityState === 'visible'
    const alVolver = () => { if (visible()) alertasStore.asegurar(userKey, EDAD_MINIMA_FOCO_MS) }
    const intervalo = setInterval(() => {
      if (visible()) alertasStore.asegurar(userKey, INTERVALO_ALERTAS_MS / 2)
    }, INTERVALO_ALERTAS_MS)
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [userKey])
}
