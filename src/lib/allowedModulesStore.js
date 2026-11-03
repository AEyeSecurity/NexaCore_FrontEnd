// Estado compartido de los módulos habilitados (allowedModules de
// GET /api/dashboard/config) para la sesión actual. Sin React ni red: el
// fetcher se inyecta (ver permissions.js), así se puede probar con node --test.
//
// Estado por sesión (`key` = usuario logueado):
//   - status 'loading': todavía no hay una respuesta confirmada.
//   - status 'success': `data` es la última lista confirmada por el backend.
//   - status 'error':   el pedido falló y no hay ninguna lista confirmada.
// Reglas:
//   - Un solo pedido en vuelo por sesión (Inicio, sidebar y Nexi lo comparten).
//   - Una lista confirmada se reutiliza al instante; pasado `ttl` se vuelve a
//     pedir en segundo plano sin ocultarla (refleja cambios de permisos).
//   - Si falla una revalidación se conserva la última lista confirmada; si
//     falla la primera, queda 'error' y el próximo montaje reintenta.
//   - `limpiar()` (cerrar sesión / iniciar otra) descarta todo, incluida la
//     respuesta de un pedido que todavía esté en vuelo.

export const TTL_MODULOS_MS = 60 * 1000

export function crearStoreModulos(fetchModulos, { ahora = () => Date.now(), ttl = TTL_MODULOS_MS } = {}) {
  let estado = null   // { key, generacion, status, data, confirmadoEn } — inmutable
  let enVuelo = null  // { key, generacion, promise }
  let generaciones = 0
  const listeners = new Set()

  function publicar(nuevo) {
    estado = nuevo
    listeners.forEach(l => l())
  }

  function cargar(key) {
    if (enVuelo?.key === key && enVuelo.generacion === estado?.generacion) return enVuelo.promise

    if (estado?.key !== key) {
      publicar({ key, generacion: ++generaciones, status: 'loading', data: null, confirmadoEn: 0 })
    } else if (estado.status === 'error') {
      publicar({ ...estado, status: 'loading' })
    }
    const { generacion } = estado

    const promise = Promise.resolve()
      .then(() => fetchModulos())
      .then(
        (data) => {
          if (estado?.generacion !== generacion) return // otra sesión: se descarta
          publicar({ ...estado, status: 'success', data: Array.isArray(data) ? data : [], confirmadoEn: ahora() })
        },
        () => {
          if (estado?.generacion !== generacion) return
          publicar({ ...estado, status: estado.data ? 'success' : 'error' })
        },
      )
      .finally(() => { if (enVuelo?.promise === promise) enVuelo = null })
    enVuelo = { key, generacion, promise }
    return promise
  }

  return {
    // Estado de `key` (null si no es la sesión actual o todavía no se pidió).
    // Devuelve siempre el mismo objeto mientras no cambie (useSyncExternalStore).
    snapshot(key) {
      return key && estado?.key === key ? estado : null
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    // Pide la lista si no hay una confirmada y vigente para `key`.
    asegurar(key) {
      if (!key) return null
      const vigente = estado?.key === key && estado.status === 'success' && ahora() - estado.confirmadoEn < ttl
      return vigente ? null : cargar(key)
    },
    limpiar() {
      enVuelo = null
      if (estado) publicar(null)
    },
  }
}

// Forma que devuelve useAllowedModules: [allowedModules, loading, status].
// `loading` es true solo mientras no hay ninguna lista confirmada y no falló:
// una revalidación en segundo plano no vuelve a mostrar "cargando".
export function leerModulos(entry, key) {
  if (!key) return [[], false, 'idle']
  if (!entry) return [[], true, 'loading']
  if (entry.data) return [entry.data, false, 'success']
  return [[], entry.status !== 'error', entry.status]
}
