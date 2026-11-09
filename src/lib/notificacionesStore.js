// Notificaciones persistentes (menciones) de la sesión actual — /api/notificaciones,
// contrato 2026-11-09 r2 §4. Mismo patrón que alertasStore: sin React ni red
// (las funciones de la API se inyectan, ver notificaciones.js), un estado por
// sesión (`key` = usuario logueado) y un solo pedido en vuelo por tipo.
//
// Reglas:
//   - `noLeidas` es SIEMPRE el dato del backend (pendientes = no leídas de
//     tareas que el usuario ve hoy). El frontend no lo recalcula: se actualiza
//     con GET /no-leidas/cantidad, con `no_leidas` del listado y con la
//     respuesta de marcar todas; después de marcar una se vuelve a pedir.
//   - La lista se pide al abrir la campana (estado=todas: historial con leídas
//     y no leídas). "Ver más" usa offset.
//   - `limpiar()` (logout / otra cuenta) descarta todo, incluidas respuestas
//     de pedidos que todavía estén en vuelo.
//   - Un error (endpoint todavía no desplegado, red) nunca lanza hacia la UI:
//     queda en el estado (`falloCantidad`, `lista.status = 'error'`).

export const INTERVALO_NOTIFICACIONES_MS = 60 * 1000
export const LIMITE_PAGINA = 20

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function crearStoreNotificaciones(fuente, { ahora = () => Date.now() } = {}) {
  let estado = null
  let generaciones = 0
  let cantidadEnVuelo = null
  let listaEnVuelo = null
  const listeners = new Set()

  function publicar(nuevo) {
    estado = nuevo
    listeners.forEach(l => l())
  }

  function sesion(key) {
    if (estado?.key !== key) {
      publicar({
        key, generacion: ++generaciones,
        noLeidas: null, falloCantidad: false, recibidoEn: 0,
        lista: { status: 'idle', items: [], hayMas: false, cargandoMas: false },
        marcando: [], marcandoTodas: false,
      })
    }
    return estado.generacion
  }
  const vigente = (generacion) => estado?.generacion === generacion
  const actualizar = (generacion, cambios) => { if (vigente(generacion)) publicar({ ...estado, ...cambios(estado) }) }
  const cantidadValida = (n) => (Number.isInteger(n) && n >= 0 ? n : null)

  function cargarCantidad(key) {
    const generacion = sesion(key)
    if (cantidadEnVuelo?.generacion === generacion) return cantidadEnVuelo.promise
    const promise = Promise.resolve()
      .then(() => fuente.cantidad())
      .then(
        (r) => actualizar(generacion, e => ({ noLeidas: cantidadValida(r?.no_leidas) ?? e.noLeidas, falloCantidad: false, recibidoEn: ahora() })),
        () => actualizar(generacion, () => ({ falloCantidad: true })),
      )
      .finally(() => { if (cantidadEnVuelo?.promise === promise) cantidadEnVuelo = null })
    cantidadEnVuelo = { generacion, promise }
    return promise
  }

  function cargarLista(key, { mas = false } = {}) {
    const generacion = sesion(key)
    if (listaEnVuelo?.generacion === generacion) return listaEnVuelo.promise
    const offset = mas ? estado.lista.items.length : 0
    actualizar(generacion, e => ({
      lista: mas ? { ...e.lista, cargandoMas: true } : { ...e.lista, status: e.lista.items.length ? 'success' : 'loading', actualizando: true },
    }))
    const promise = Promise.resolve()
      .then(() => fuente.listar({ estado: 'todas', limite: LIMITE_PAGINA, offset }))
      .then(
        (r) => actualizar(generacion, e => {
          const nuevos = Array.isArray(r?.data) ? r.data : []
          const items = mas ? [...e.lista.items, ...nuevos.filter(n => !e.lista.items.some(i => i.id === n.id))] : nuevos
          return {
            noLeidas: cantidadValida(r?.no_leidas) ?? e.noLeidas,
            lista: { status: 'success', items, hayMas: r?.hay_mas === true, cargandoMas: false, actualizando: false, fallo: false },
          }
        }),
        () => actualizar(generacion, e => ({
          lista: e.lista.items.length
            ? { ...e.lista, cargandoMas: false, actualizando: false, fallo: true }
            : { status: 'error', items: [], hayMas: false, cargandoMas: false, actualizando: false, fallo: true },
        })),
      )
      .finally(() => { if (listaEnVuelo?.promise === promise) listaEnVuelo = null })
    listaEnVuelo = { generacion, promise }
    return promise
  }

  // Devuelve { ok, error? }. 404 (NOTIFICACION_NO_ENCONTRADA: la tarea se
  // eliminó) quita la notificación de la lista.
  async function marcarLeida(key, id) {
    const generacion = sesion(key)
    const item = estado.lista.items.find(n => n.id === id)
    if (item?.leida) return { ok: true }
    if (estado.marcando.includes(id)) return { ok: false }
    actualizar(generacion, e => ({ marcando: [...e.marcando, id] }))
    try {
      const n = await fuente.marcarLeida(id)
      actualizar(generacion, e => ({ lista: { ...e.lista, items: e.lista.items.map(i => (i.id === id ? { ...i, ...n } : i)) } }))
      return { ok: true }
    } catch (error) {
      if (error?.status === 404) {
        actualizar(generacion, e => ({ lista: { ...e.lista, items: e.lista.items.filter(i => i.id !== id) } }))
      }
      return { ok: false, error }
    } finally {
      actualizar(generacion, e => ({ marcando: e.marcando.filter(x => x !== id) }))
      if (vigente(generacion)) cargarCantidad(key)
    }
  }

  async function marcarTodas(key) {
    const generacion = sesion(key)
    if (estado.marcandoTodas) return { ok: false }
    actualizar(generacion, () => ({ marcandoTodas: true }))
    try {
      const r = await fuente.marcarTodas()
      actualizar(generacion, e => ({ noLeidas: cantidadValida(r?.no_leidas) ?? e.noLeidas }))
      if (vigente(generacion)) await cargarLista(key) // leida_at real de cada una
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    } finally {
      actualizar(generacion, () => ({ marcandoTodas: false }))
    }
  }

  return {
    snapshot(key) { return key && estado?.key === key ? estado : null },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    asegurarCantidad(key, edadMinima = 0) {
      if (!key) return null
      const reciente = estado?.key === key && estado.recibidoEn && !estado.falloCantidad && ahora() - estado.recibidoEn < edadMinima
      return reciente ? null : cargarCantidad(key)
    },
    refrescarCantidad(key) { return key ? cargarCantidad(key) : null },
    cargarLista(key, opciones) { return key ? cargarLista(key, opciones) : null },
    marcarLeida(key, id) { return key ? marcarLeida(key, id) : Promise.resolve({ ok: false }) },
    marcarTodas(key) { return key ? marcarTodas(key) : Promise.resolve({ ok: false }) },
    limpiar() {
      cantidadEnVuelo = null
      listaEnVuelo = null
      if (estado) publicar(null)
    },
  }
}

// ── Presentación (r2 §4.2) ──────────────────────────────────────────────────
// Qué mostrar de cada notificación. Nunca hay texto del comentario.
//   disponible            → "te mencionó en <tarea>"; abre y resalta el comentario
//   mencion_quitada       → idem + "(la mención fue quitada)"
//   comentario_eliminado  → "en un comentario que fue eliminado"; abre la tarea
//   sin_acceso            → texto genérico, sin enlace (se puede marcar como leída)
export function estadoNotificacion(n) {
  if (!n?.accesible) return 'sin_acceso'
  if (n.comentario?.eliminado) return 'comentario_eliminado'
  if (n.comentario && n.comentario.mencion_vigente === false) return 'mencion_quitada'
  return 'disponible'
}

const AVISOS_DESTINO = {
  comentario_eliminado: 'El comentario en el que te mencionaron fue eliminado.',
  mencion_quitada: 'Te mencionaron en este comentario, pero la mención fue quitada.',
}

// Opciones de navegación (App.navigate('operations', opts)) o null si la
// notificación no lleva a ningún lado. Solo ids con formato UUID.
export function destinoNotificacion(n) {
  const d = n?.destino
  const tipo = estadoNotificacion(n)
  if (tipo === 'sin_acceso' || d?.modulo !== 'operations' || !UUID.test(d.tablero_id ?? '') || !UUID.test(d.tarea_id ?? '')) return null
  return {
    tablero_id: d.tablero_id,
    tarea_id: d.tarea_id,
    comentario_id: tipo !== 'comentario_eliminado' && UUID.test(d.comentario_id ?? '') ? d.comentario_id : null,
    aviso: AVISOS_DESTINO[tipo] ?? null,
  }
}

// Contador de la campana: alertas visibles (sin las descartadas en la sesión)
// + menciones pendientes según el backend. Fuentes disjuntas: no se duplican.
export function contadorCampana(alertasVisiblesTotal, noLeidas) {
  return (Number.isInteger(alertasVisiblesTotal) ? alertasVisiblesTotal : 0) + (Number.isInteger(noLeidas) ? noLeidas : 0)
}
