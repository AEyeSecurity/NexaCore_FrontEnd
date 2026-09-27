import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

// Caché en memoria de GET /api/indicadores/:id/historico, compartido por la
// vista Indicadores y los mosaicos `indicador_kpi` del Dashboard.
//
// - Clave `${indicatorId}:${period}`: dos mosaicos del mismo indicador y
//   período comparten una sola llamada (nunca se indexa por instanceId).
// - Las promesas en curso también se comparten (sin requests duplicados).
// - Máximo MAX_CONCURRENT requests simultáneos: la vista pide un histórico por
//   indicador y no hay endpoint agregado; así no se satura el backend.
// - Los resultados expiran a los TTL_MS; editar/desactivar invalida el indicador.

const TTL_MS = 60_000
const MAX_CONCURRENT = 4

const cache = new Map()      // key → { data, error, at }
const inflight = new Map()   // key → Promise
const listeners = new Set()

let active = 0
const queue = []

function runLimited(task) {
  return new Promise((resolve, reject) => {
    const start = () => {
      active++
      task().then(resolve, reject).finally(() => {
        active--
        const next = queue.shift()
        if (next) next()
      })
    }
    if (active < MAX_CONCURRENT) start()
    else queue.push(start)
  })
}

const keyOf = (id, period) => `${id}:${period}`

function notify() {
  listeners.forEach(fn => fn())
}

function isFresh(entry) {
  return entry && Date.now() - entry.at < TTL_MS
}

export function fetchHistorico(id, period, { force = false } = {}) {
  const key = keyOf(id, period)
  const cached = cache.get(key)
  if (!force && isFresh(cached)) {
    return cached.error ? Promise.reject(cached.error) : Promise.resolve(cached.data)
  }
  if (inflight.has(key)) return inflight.get(key)

  const promise = runLimited(() => api.getHistoricoIndicador(id, period))
    .then(data => {
      cache.set(key, { data, error: null, at: Date.now() })
      return data
    })
    .catch(error => {
      cache.set(key, { data: null, error, at: Date.now() })
      throw error
    })
    .finally(() => {
      inflight.delete(key)
      notify()
    })
  inflight.set(key, promise)
  return promise
}

export function invalidateIndicador(id) {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${id}:`)) cache.delete(key)
  }
  notify()
}

// Estado del histórico de un indicador para un período. Se suscribe al caché
// para reflejar recargas/invalidaciones hechas desde otra parte de la UI.
export function useIndicadorHistorico(indicatorId, period) {
  const read = useCallback(() => {
    if (!indicatorId || !period) return { loading: false, data: null, error: null }
    const entry = cache.get(keyOf(indicatorId, period))
    if (entry) return { loading: false, data: entry.data, error: entry.error }
    return { loading: true, data: null, error: null }
  }, [indicatorId, period])

  const [state, setState] = useState(read)

  useEffect(() => {
    setState(read())
    if (!indicatorId || !period) return undefined
    let alive = true
    const key = keyOf(indicatorId, period)
    // Si la entrada falta (invalidada tras editar/desactivar) se vuelve a pedir.
    const sync = () => {
      if (!alive) return
      if (!cache.has(key) && !inflight.has(key)) fetchHistorico(indicatorId, period).catch(() => {})
      setState(read())
    }
    listeners.add(sync)
    if (!isFresh(cache.get(key))) fetchHistorico(indicatorId, period).catch(() => {})
    return () => { alive = false; listeners.delete(sync) }
  }, [indicatorId, period, read])

  const retry = useCallback(() => {
    if (!indicatorId || !period) return
    cache.delete(keyOf(indicatorId, period))
    setState({ loading: true, data: null, error: null })
    fetchHistorico(indicatorId, period, { force: true }).catch(() => {})
  }, [indicatorId, period])

  return { ...state, retry }
}

// Históricos de varios indicadores para un mismo período (vista Indicadores).
// Devuelve { [id]: { loading, data, error } } y un `retry(id)`. Las llamadas
// pasan por el mismo caché/limitador que los mosaicos del Dashboard.
export function useHistoricos(ids, period) {
  const idsKey = (ids || []).join(',')
  const read = useCallback(() => {
    const out = {}
    for (const id of (idsKey ? idsKey.split(',') : [])) {
      const entry = cache.get(keyOf(id, period))
      out[id] = entry
        ? { loading: false, data: entry.data, error: entry.error }
        : { loading: true, data: null, error: null }
    }
    return out
  }, [idsKey, period])

  const [state, setState] = useState(read)

  useEffect(() => {
    setState(read())
    let alive = true
    const list = idsKey ? idsKey.split(',') : []
    const sync = () => {
      if (!alive) return
      for (const id of list) {
        const key = keyOf(id, period)
        if (!cache.has(key) && !inflight.has(key)) fetchHistorico(id, period).catch(() => {})
      }
      setState(read())
    }
    listeners.add(sync)
    for (const id of list) {
      if (!isFresh(cache.get(keyOf(id, period)))) fetchHistorico(id, period).catch(() => {})
    }
    return () => { alive = false; listeners.delete(sync) }
  }, [idsKey, period, read])

  const retry = useCallback((id) => {
    cache.delete(keyOf(id, period))
    fetchHistorico(id, period, { force: true }).catch(() => {})
    notify()
  }, [period])

  return { byId: state, retry }
}

// Catálogo de variables (GET /api/indicadores/variables): se pide una sola vez
// por sesión; si falla, el próximo uso reintenta.
let variablesPromise = null
export function fetchVariables() {
  if (!variablesPromise) {
    variablesPromise = api.getVariablesIndicadores()
      .then(res => (Array.isArray(res?.data) ? res.data : []))
      .catch(err => { variablesPromise = null; throw err })
  }
  return variablesPromise
}

export function useVariables() {
  const [state, setState] = useState({ loading: true, variables: [], error: null })
  useEffect(() => {
    let alive = true
    fetchVariables()
      .then(variables => { if (alive) setState({ loading: false, variables, error: null }) })
      .catch(error => { if (alive) setState({ loading: false, variables: [], error }) })
    return () => { alive = false }
  }, [])
  return state
}
