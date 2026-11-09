import test from 'node:test'
import assert from 'node:assert/strict'
import {
  crearStoreNotificaciones, estadoNotificacion, destinoNotificacion, contadorCampana, LIMITE_PAGINA,
} from '../src/lib/notificacionesStore.js'
import { resolverDestino } from '../src/lib/alertasStore.js'
import { normalizarDestinoTarea, pasoDestino, mensajeErrorDestino, MENSAJES_DESTINO } from '../src/modules/operations/navegacion.js'

const TABLERO = '0b0b0b0b-1111-4222-8333-444444444444'
const TAREA = '7a7a7a7a-1111-4222-8333-444444444444'
const COMENTARIO = 'c0c0c0c0-1111-4222-8333-444444444444'

function notificacion(id, extra = {}) {
  return {
    id, tipo: 'mencion_comentario', created_at: '2026-11-03T11:00:00.000Z', leida: false, leida_at: null, accesible: true,
    autor: { id: 'u1', nombre: 'Nico' }, tarea: { id: TAREA, titulo: 'Revisar bomba', tablero_id: TABLERO },
    comentario: { id: COMENTARIO, eliminado: false, eliminado_at: null, mencion_vigente: true },
    destino: { modulo: 'operations', tablero_id: TABLERO, tarea_id: TAREA, comentario_id: COMENTARIO },
    ...extra,
  }
}

function fuenteFalsa(datos) {
  const llamadas = []
  return {
    llamadas,
    cantidad: async () => { llamadas.push('cantidad'); if (datos.falla) throw new Error('red'); return { no_leidas: datos.noLeidas } },
    listar: async (p) => { llamadas.push(['listar', p]); if (datos.falla) throw new Error('red'); return { data: datos.items.slice(p.offset, p.offset + p.limite), no_leidas: datos.noLeidas, hay_mas: datos.items.length > p.offset + p.limite } },
    marcarLeida: async (id) => {
      llamadas.push(['leida', id])
      if (datos.borradas?.includes(id)) throw Object.assign(new Error('x'), { status: 404, codigo: 'NOTIFICACION_NO_ENCONTRADA' })
      datos.noLeidas = Math.max(0, datos.noLeidas - 1)
      return { ...datos.items.find(n => n.id === id), leida: true, leida_at: '2026-11-09T12:00:00Z' }
    },
    marcarTodas: async () => { llamadas.push('todas'); const n = datos.noLeidas; datos.noLeidas = 0; datos.items = datos.items.map(i => ({ ...i, leida: true })); return { actualizadas: n, no_leidas: 0 } },
  }
}

test('notificaciones: el contador es el del backend y se combina sin duplicar con las alertas', async () => {
  // El backend cuenta 1 pendiente aunque la lista tenga 2 no leídas (una sin acceso).
  const datos = { noLeidas: 1, items: [notificacion('n1'), notificacion('n2', { accesible: false, autor: null, tarea: null, comentario: null, destino: null })] }
  const store = crearStoreNotificaciones(fuenteFalsa(datos))
  await store.refrescarCantidad('ana')
  assert.equal(store.snapshot('ana').noLeidas, 1)
  await store.cargarLista('ana')
  assert.equal(store.snapshot('ana').lista.items.length, 2)
  assert.equal(store.snapshot('ana').noLeidas, 1, 'no se recalcula con la lista')
  assert.equal(contadorCampana(2, 1), 3)
  assert.equal(contadorCampana(0, null), 0, 'sin respuesta de menciones no suma')
})

test('notificaciones: marcar una y todas como leídas; 404 la quita de la lista', async () => {
  const datos = { noLeidas: 3, items: [notificacion('n1'), notificacion('n2'), notificacion('n3')], borradas: ['n3'] }
  const fuente = fuenteFalsa(datos)
  const store = crearStoreNotificaciones(fuente)
  await store.cargarLista('ana')
  assert.deepEqual(await store.marcarLeida('ana', 'n1'), { ok: true })
  await new Promise(r => setTimeout(r, 0))
  assert.equal(store.snapshot('ana').lista.items.find(n => n.id === 'n1').leida, true)
  assert.equal(store.snapshot('ana').noLeidas, 2, 'contador vuelto a pedir al backend')
  assert.deepEqual(await store.marcarLeida('ana', 'n1'), { ok: true }, 'ya leída: no repite el pedido')
  assert.equal(fuente.llamadas.filter(l => l[0] === 'leida').length, 1)

  const r = await store.marcarLeida('ana', 'n3') // la tarea se eliminó
  assert.equal(r.ok, false)
  assert.equal(store.snapshot('ana').lista.items.some(n => n.id === 'n3'), false)

  await store.marcarTodas('ana')
  assert.equal(store.snapshot('ana').noLeidas, 0)
  assert.ok(store.snapshot('ana').lista.items.every(n => n.leida))
})

test('notificaciones: paginación con offset y sin duplicados', async () => {
  const items = Array.from({ length: LIMITE_PAGINA + 5 }, (_, i) => notificacion(`n${i}`))
  const store = crearStoreNotificaciones(fuenteFalsa({ noLeidas: items.length, items }))
  await store.cargarLista('ana')
  assert.equal(store.snapshot('ana').lista.hayMas, true)
  await store.cargarLista('ana', { mas: true })
  const s = store.snapshot('ana').lista
  assert.equal(s.items.length, LIMITE_PAGINA + 5)
  assert.equal(s.hayMas, false)
})

test('notificaciones: cambio de sesión descarta respuestas en vuelo; fallos no lanzan', async () => {
  let liberar
  const store = crearStoreNotificaciones({
    cantidad: () => new Promise(r => { liberar = () => r({ no_leidas: 9 }) }),
    listar: async () => { throw new Error('404 sin desplegar') },
  })
  const p = store.refrescarCantidad('ana')
  await new Promise(r => setTimeout(r, 0)) // el pedido ya está en vuelo
  store.limpiar()
  liberar(); await p
  assert.equal(store.snapshot('ana'), null, 'la respuesta de la sesión anterior se descarta')

  await store.cargarLista('beto')
  assert.equal(store.snapshot('beto').lista.status, 'error')
  assert.equal(store.snapshot('ana'), null)
  const falla = crearStoreNotificaciones(fuenteFalsa({ falla: true, items: [] }))
  await falla.refrescarCantidad('ana')
  assert.equal(falla.snapshot('ana').falloCantidad, true)
  assert.equal(falla.snapshot('ana').noLeidas, null)
})

test('notificaciones: estados del contrato (r2 §4.2) y destino de navegación', () => {
  const disponible = notificacion('a')
  assert.equal(estadoNotificacion(disponible), 'disponible')
  assert.deepEqual(destinoNotificacion(disponible), { tablero_id: TABLERO, tarea_id: TAREA, comentario_id: COMENTARIO, aviso: null })

  const quitada = notificacion('b', { comentario: { id: COMENTARIO, eliminado: false, mencion_vigente: false } })
  assert.equal(estadoNotificacion(quitada), 'mencion_quitada')
  assert.equal(destinoNotificacion(quitada).comentario_id, COMENTARIO)
  assert.match(destinoNotificacion(quitada).aviso, /quitada/)

  const eliminado = notificacion('c', {
    comentario: { id: COMENTARIO, eliminado: true, eliminado_at: '2026-11-04T00:00:00Z', mencion_vigente: false },
    destino: { modulo: 'operations', tablero_id: TABLERO, tarea_id: TAREA, comentario_id: null },
  })
  assert.equal(estadoNotificacion(eliminado), 'comentario_eliminado')
  assert.equal(destinoNotificacion(eliminado).comentario_id, null)
  assert.match(destinoNotificacion(eliminado).aviso, /eliminado/)

  const sinAcceso = notificacion('d', { accesible: false, autor: null, tarea: null, comentario: null, destino: null })
  assert.equal(estadoNotificacion(sinAcceso), 'sin_acceso')
  assert.equal(destinoNotificacion(sinAcceso), null, 'sin enlace ni datos protegidos')
  assert.equal(destinoNotificacion(notificacion('e', { destino: { modulo: 'operations', tablero_id: 'x', tarea_id: TAREA } })), null, 'ids inválidos')
})

test('navegación: resolverDestino abre la tarea; las alertas de Operativo siguen abriendo el módulo', () => {
  assert.deepEqual(resolverDestino({ modulo: 'operations', tablero_id: TABLERO, tarea_id: TAREA, comentario_id: COMENTARIO }),
    { page: 'operations', opts: { tablero_id: TABLERO, tarea_id: TAREA, comentario_id: COMENTARIO } })
  assert.deepEqual(resolverDestino({ modulo: 'operations', seccion: null }), { page: 'operations', opts: {} })
  assert.deepEqual(resolverDestino({ modulo: 'operations', tablero_id: TABLERO, tarea_id: 'javascript:alert(1)' }), { page: 'operations', opts: {} })
})

test('navegación: tablero → tarea, cambios de tablero y accesos revocados', () => {
  const d = normalizarDestinoTarea({ tablero_id: TABLERO, tarea_id: TAREA, comentario_id: 'no-uuid', aviso: 'x' })
  assert.deepEqual(d, { tablero_id: TABLERO, tarea_id: TAREA, comentario_id: null, aviso: 'x' })
  assert.equal(normalizarDestinoTarea({ tarea_id: TAREA }), null)
  assert.equal(normalizarDestinoTarea(null), null)

  const tableros = [{ id: TABLERO }, { id: 'otro' }]
  assert.equal(pasoDestino(d, { tableros: [], tablerosCargando: true, tableroActivoId: null }), 'esperar')
  assert.equal(pasoDestino(d, { tableros: [{ id: 'otro' }], tablerosCargando: false, tableroActivoId: 'otro' }), 'sin_tablero', 'perdió el acceso al tablero')
  assert.equal(pasoDestino(d, { tableros, tablerosCargando: false, tableroActivoId: 'otro' }), 'seleccionar_tablero')
  assert.equal(pasoDestino(d, { tableros, tablerosCargando: false, tableroActivoId: TABLERO }), 'buscar_tarea')

  assert.equal(mensajeErrorDestino({ status: 403 }), MENSAJES_DESTINO.sin_acceso)
  assert.equal(mensajeErrorDestino({ status: 404 }), MENSAJES_DESTINO.sin_tarea)
  assert.equal(mensajeErrorDestino(new Error('red')), MENSAJES_DESTINO.error)
})
