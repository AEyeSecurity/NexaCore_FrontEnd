import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Cliente HTTP real (src/lib/api.js) con un proveedor de sesión falso, igual
// que test/actualizaciones.test.js. Verifica rutas, métodos y cuerpos del
// contrato 2026-11-09 r2 sin backend.
async function clienteReal() {
  const fuente = (await readFile(new URL('../src/lib/api.js', import.meta.url), 'utf8'))
    .replace("import { supabase, API_URL } from './supabase'", "const API_URL = 'https://api.test'; const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: 'tk' } } }) } }")
  return (await import(`data:text/javascript;base64,${Buffer.from(fuente).toString('base64')}`)).api
}

test('contratos r2: registros de tiempo, mencionables, temporizadores activos y notificaciones', async () => {
  const api = await clienteReal()
  const original = globalThis.fetch
  const pedidos = []
  globalThis.fetch = async (url, opciones) => {
    pedidos.push({ url: url.replace('https://api.test', ''), metodo: opciones.method || 'GET', body: opciones.body, auth: opciones.headers.Authorization })
    return { ok: true, json: async () => ({ data: [] }) }
  }
  try {
    const intervalo = { inicio: '2026-11-03T06:00:00-03:00', fin: '2026-11-03T07:30:00-03:00' }
    await api.validarRegistroTiempo('t1', { ...intervalo, registro_id: 'r1' })
    await api.crearRegistroTiempo('t1', intervalo)
    await api.corregirRegistroTiempo('t1', 'r1', { fin: intervalo.fin, version: 3 })
    await api.getCorreccionesRegistro('t1', 'r1')
    await api.getMencionablesTarea('t1')
    await api.getTemporizadoresActivos('b 1')
    await api.getNotificaciones({ estado: 'todas', limite: 20, offset: 40 })
    await api.getNotificacionesNoLeidas()
    await api.marcarNotificacionLeida('n1')
    await api.marcarTodasNotificacionesLeidas()
    assert.deepEqual(pedidos.map(p => [p.metodo, p.url]), [
      ['POST', '/api/operations/tareas/t1/registros-tiempo/validar'],
      ['POST', '/api/operations/tareas/t1/registros-tiempo'],
      ['PATCH', '/api/operations/tareas/t1/registros-tiempo/r1'],
      ['GET', '/api/operations/tareas/t1/registros-tiempo/r1/correcciones'],
      ['GET', '/api/operations/tareas/t1/mencionables'],
      ['GET', '/api/operations/tareas/temporizadores-activos?tablero_id=b%201'],
      ['GET', '/api/notificaciones?estado=todas&limite=20&offset=40'],
      ['GET', '/api/notificaciones/no-leidas/cantidad'],
      ['PATCH', '/api/notificaciones/n1/leida'],
      ['POST', '/api/notificaciones/marcar-todas-leidas'],
    ])
    assert.deepEqual(JSON.parse(pedidos[0].body), { ...intervalo, registro_id: 'r1' })
    assert.deepEqual(JSON.parse(pedidos[1].body), intervalo)
    assert.deepEqual(JSON.parse(pedidos[2].body), { fin: intervalo.fin, version: 3 })
    assert.equal(pedidos[8].body, undefined, 'marcar leída va sin body')
    assert.equal(pedidos[9].body, undefined)
    assert.ok(pedidos.every(p => p.auth === 'Bearer tk'))
  } finally { globalThis.fetch = original }
})

test('contratos r2: el error conserva status y agrega codigo solo si el backend lo envía', async () => {
  const api = await clienteReal()
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'El registro cambió…', codigo: 'VERSION_DESACTUALIZADA' }) })
    await assert.rejects(api.corregirRegistroTiempo('t1', 'r1', { fin: 'x', version: 1 }),
      e => e.status === 409 && e.codigo === 'VERSION_DESACTUALIZADA' && e.message === 'El registro cambió…')
    // Resto de los módulos (sin codigo): mismo error que antes.
    globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: 'Sin permiso' }) })
    await assert.rejects(api.getTableros(), e => e.status === 403 && !('codigo' in e) && e.message === 'Sin permiso')
  } finally { globalThis.fetch = original }
})
