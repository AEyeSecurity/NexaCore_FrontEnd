import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tareaFinalParaTemporizador, referenciaTemporizador, segundosVisibles, formatoReloj, formatoDuracion, mensajeActualizaciones } from '../src/modules/operations/actualizaciones.js'

test('recupera tiempo del servidor sin depender de la hora del equipo ni acumular ticks', () => {
  const referencia = referenciaTemporizador({ activo: {
    inicio: '2026-11-03T10:00:00Z', servidor_ahora: '2026-11-03T11:00:00.500Z', transcurrido_segundos: 3600,
  } }, 100)
  assert.equal(segundosVisibles(referencia, 100), 3600)
  assert.equal(segundosVisibles(referencia, 900600), 4501, 'un intervalo suspendido no pierde tiempo')
  assert.equal(segundosVisibles(referencia, 0), 3600, 'no retrocede por una referencia local menor')
  assert.equal(formatoReloj(segundosVisibles(referencia, 900600)), '01:15:01')
})

test('referencias independientes, reapertura, finalización automática y fallback contractual', () => {
  const a = referenciaTemporizador({ activo: { transcurrido_segundos: 100 } }, 0)
  const b = referenciaTemporizador({ activo: { transcurrido_segundos: 20 } }, 0)
  assert.equal(segundosVisibles(a, 2000), 102)
  assert.equal(segundosVisibles(b, 2000), 22)
  const reabierto = referenciaTemporizador({ activo: { transcurrido_segundos: 3600 } }, 5000)
  assert.equal(segundosVisibles(reabierto, 6000), 3601)
  assert.equal(segundosVisibles(referenciaTemporizador({ activo: null })), 0)
  assert.equal(formatoReloj(27 * 3600 + 61), '27:01:01')
  assert.equal(formatoDuracion(13500), '3 h 45 min 0 s')
  assert.equal(formatoDuracion(0), '0 s')
})

test('errores conocidos y errores técnicos se presentan sin detalles internos', () => {
  for (const status of [400, 401, 403, 404, 409]) {
    assert.notEqual(mensajeActualizaciones({ status }), mensajeActualizaciones({ status: 500 }))
  }
  assert.equal(mensajeActualizaciones(new Error('SQL secreto')), 'No se pudo conectar con el servidor. Intentá nuevamente.')
})

test('cliente compartido integra los ocho contratos y conserva autenticación y errores 409', async () => {
  const originalFetch = globalThis.fetch
  const solicitudes = []
  // Se sustituye únicamente el proveedor de sesión: se ejecuta el cliente HTTP real.
  const fuente = (await readFile(new URL('../src/lib/api.js', import.meta.url), 'utf8'))
    .replace("import { supabase, API_URL } from './supabase'", "const API_URL = 'https://api.test'; const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) } }")
  const { api } = await import(`data:text/javascript;base64,${Buffer.from(fuente).toString('base64')}`)
  globalThis.fetch = async (url, options) => {
    solicitudes.push({ url, ...options })
    return { ok: true, json: async () => ({ data: [], total: 0 }) }
  }
  try {
    await api.getActualizacionesTarea('t1')
    await api.getComentariosTarea('t1')
    await api.crearComentarioTarea('t1', 'Hola')
    await api.editarComentarioTarea('t1', 'c1', 'Editado')
    await api.eliminarComentarioTarea('t1', 'c1')
    await api.getTemporizadorTarea('t1')
    await api.iniciarTemporizadorTarea('t1')
    await api.detenerTemporizadorTarea('t1')
    assert.deepEqual(solicitudes.map(r => [r.method || 'GET', r.url.replace('https://api.test/api/operations/tareas/t1', '')]), [
      ['GET', '/actualizaciones'], ['GET', '/comentarios'], ['POST', '/comentarios'],
      ['PATCH', '/comentarios/c1'], ['DELETE', '/comentarios/c1'], ['GET', '/temporizador'],
      ['POST', '/temporizador/iniciar'], ['POST', '/temporizador/detener'],
    ])
    assert.deepEqual(JSON.parse(solicitudes[2].body), { contenido: 'Hola' })
    assert.deepEqual(JSON.parse(solicitudes[3].body), { contenido: 'Editado' })
    assert.ok(solicitudes.every(r => r.headers.Authorization === 'Bearer test-token'))
    assert.equal(solicitudes[6].body, undefined, 'autor y tiempo se calculan en backend')
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'Conflicto' }) })
    await assert.rejects(api.iniciarTemporizadorTarea('t1'), { status: 409 })
  } finally { globalThis.fetch = originalFetch }
})


test('temporizador: completadas y canceladas por tipo_base actual son finales', () => {
  for (const tipo_base of ['completada', 'cancelada']) {
    assert.equal(tareaFinalParaTemporizador({ operativo_etapas: { tipo_base }, estado: 'Pendiente' }), true)
  }
})

test('temporizador: revisión abierta y cerrada no son finales aunque estado diga Completada', () => {
  for (const tipo_base of ['en_revision_abierta', 'en_revision_cerrada']) {
    assert.equal(tareaFinalParaTemporizador({ operativo_etapas: { tipo_base }, estado: 'Completada' }), false)
  }
})

test('temporizador: reabrir reemplaza la clasificación final sin depender de fechas ni historial', () => {
  const tarea = { operativo_etapas: { tipo_base: 'completada' }, estado: 'Completada',
    fecha_finalizacion: '2026-11-03T12:00:00Z', fecha_fin_real: '2026-11-03' }
  assert.equal(tareaFinalParaTemporizador(tarea), true)
  for (const tipo_base of ['pendiente', 'en_curso', 'en_revision_abierta', 'en_revision_cerrada']) {
    assert.equal(tareaFinalParaTemporizador({ ...tarea, operativo_etapas: { tipo_base } }), false)
  }
})

test('temporizador: tareas confirmadas sin etapa usan estado canónico actual', () => {
  for (const estado of ['Completada', 'Cancelada']) {
    assert.equal(tareaFinalParaTemporizador({ operativo_etapas: null, etapa_id: null, estado }), true)
  }
  for (const estado of ['Pendiente', 'En Proceso']) {
    assert.equal(tareaFinalParaTemporizador({ operativo_etapas: null, etapa_id: null, estado }), false)
  }
})

test('temporizador: datos insuficientes no se interpretan como finales', () => {
  for (const tarea of [undefined, {}, { estado: 'Completada' },
    { operativo_etapas: null, etapa_id: 'etapa-no-cargada', estado: 'Completada' },
    { operativo_etapas: { tipo_base: 'nuevo_tipo', nombre: 'Completada' }, estado: 'Completada' },
    { operativo_etapas: null, estado: 'Desconocido' }]) {
    assert.equal(tareaFinalParaTemporizador(tarea), null)
  }
})
