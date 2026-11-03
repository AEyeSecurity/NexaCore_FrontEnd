// Estado de las alertas dinámicas (GET /api/alertas) de la sesión actual. Sin
// React ni red: el fetcher se inyecta (ver alertas.js), así se puede probar con
// node --test. Las alertas son volátiles: viven solo en memoria, nunca en
// localStorage/sessionStorage, y se descartan al cerrar o cambiar de sesión.
//
// Estado por sesión (`key` = usuario logueado):
//   - status 'loading': todavía no hay ninguna respuesta del backend.
//   - status 'success': `data` es la última respuesta recibida.
//   - status 'error':   el pedido falló y no hay ninguna respuesta previa.
//   - `fallo`:          la última actualización falló (aunque haya `data` previa).
//   - `actualizando`:   hay un pedido en vuelo.
//   - `descartadas`:    ids de alertas que el usuario descartó en esta sesión
//                       (solo se ocultan; no cambian nada en el sistema).
// Reglas:
//   - Un solo pedido en vuelo por sesión: campana, foco, intervalo y botón
//     "actualizar" lo comparten.
//   - `asegurar(key, edadMinima)` solo pide si la última respuesta tiene al
//     menos `edadMinima` ms (evita ráfagas al volver el foco); `refrescar` pide
//     siempre (salvo que ya haya uno en vuelo).
//   - `limpiar()` (cerrar sesión / iniciar otra) descarta todo, incluida la
//     respuesta de un pedido que todavía esté en vuelo y los descartes.
//   - Un descarte se mantiene en las actualizaciones de la sesión. Solo una
//     respuesta completa (parcial: false) que ya no trae esa alerta lo borra
//     (la condición se resolvió y puede volver a notificarse); una respuesta
//     parcial o fallida nunca prueba que se resolvió.

export const INTERVALO_ALERTAS_MS = 3 * 60 * 1000

export function crearStoreAlertas(fetchAlertas, { ahora = () => Date.now() } = {}) {
  let estado = null   // { key, generacion, status, data, fallo, actualizando, recibidoEn } — inmutable
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
      publicar({ key, generacion: ++generaciones, status: 'loading', data: null, fallo: false, actualizando: true, recibidoEn: 0, descartadas: [] })
    } else {
      publicar({ ...estado, status: estado.data ? 'success' : 'loading', actualizando: true })
    }
    const { generacion } = estado

    const promise = Promise.resolve()
      .then(() => fetchAlertas())
      .then(
        (data) => {
          if (estado?.generacion !== generacion) return // otra sesión: se descarta
          const respuesta = normalizar(data)
          const activas = new Set(respuesta.alertas.map(a => a.id))
          const descartadas = respuesta.parcial ? estado.descartadas : estado.descartadas.filter(id => activas.has(id))
          publicar({ ...estado, status: 'success', data: respuesta, fallo: false, actualizando: false, recibidoEn: ahora(), descartadas })
        },
        () => {
          if (estado?.generacion !== generacion) return
          publicar({ ...estado, status: estado.data ? 'success' : 'error', fallo: true, actualizando: false })
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
    asegurar(key, edadMinima = 0) {
      if (!key) return null
      const reciente = estado?.key === key && estado.recibidoEn && !estado.fallo && ahora() - estado.recibidoEn < edadMinima
      return reciente ? null : cargar(key)
    },
    refrescar(key) {
      return key ? cargar(key) : null
    },
    // Oculta una alerta durante la sesión de `key` (solo en memoria).
    descartar(key, id) {
      if (!key || estado?.key !== key || id == null || estado.descartadas.includes(id)) return
      publicar({ ...estado, descartadas: [...estado.descartadas, id] })
    },
    limpiar() {
      enVuelo = null
      if (estado) publicar(null)
    },
  }
}

// Respuesta tal como la arma el backend; solo se asegura la forma (sin
// recalcular reglas de negocio).
function normalizar(data) {
  return {
    alertas:     Array.isArray(data?.alertas) ? data.alertas : [],
    total:       Number.isFinite(data?.total) ? data.total : (Array.isArray(data?.alertas) ? data.alertas.length : 0),
    generado_en: data?.generado_en ?? null,
    parcial:     data?.parcial === true,
    fuentes:     Array.isArray(data?.fuentes) ? data.fuentes : [],
  }
}

// Alertas que se muestran (las de la última respuesta menos las descartadas).
// El contador de la campana es la cantidad de estas.
export function alertasVisibles(estado) {
  const alertas = estado?.data?.alertas ?? []
  const descartadas = estado?.descartadas ?? []
  return descartadas.length ? alertas.filter(a => !descartadas.includes(a.id)) : alertas
}

// Destinos conocidos de la navegación interna. Cualquier otro `destino` se
// ignora (no se interpreta como URL ni como página arbitraria).
export function resolverDestino(destino) {
  if (destino?.modulo === 'finance' && (destino.seccion === 'deudas' || destino.seccion === 'comprobantes')) {
    return { page: 'finance', opts: { tab: destino.seccion } }
  }
  if (destino?.modulo === 'operations')  return { page: 'operations', opts: {} }
  if (destino?.modulo === 'indicadores') return { page: 'indicadores', opts: {} }
  return null
}

// Agrupa por módulo conservando el orden del backend (por severidad) dentro de
// cada grupo. Los grupos siguen `ordenModulos`; los desconocidos van al final.
export function agruparPorModulo(alertas, ordenModulos = ['finance', 'operations', 'indicadores']) {
  const grupos = new Map()
  for (const a of alertas) {
    if (!grupos.has(a.modulo)) grupos.set(a.modulo, [])
    grupos.get(a.modulo).push(a)
  }
  const pos = (m) => { const i = ordenModulos.indexOf(m); return i === -1 ? ordenModulos.length : i }
  return [...grupos.entries()]
    .sort(([a], [b]) => pos(a) - pos(b))
    .map(([modulo, items]) => ({ modulo, alertas: items }))
}
