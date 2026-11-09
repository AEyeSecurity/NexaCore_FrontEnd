// Zona fija para que las pruebas no dependan del equipo (se cambia antes de usar Date).
process.env.TZ = 'America/Argentina/Buenos_Aires'

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  instanteLocal, partesLocales, valoresIniciales, prepararRegistroTiempo, mensajeActualizaciones, esErrorDeAcceso,
  indexarTemporizadores, describirSuperposicion, rangoRegistro,
} from '../src/modules/operations/actualizaciones.js'

const AHORA = Date.parse('2026-11-09T15:00:00Z') // 12:00 en Buenos Aires
const REGISTRO = {
  id: '11111111-2222-4333-8444-555555555555', tipo: 'registro_tiempo', version: 2,
  // La base puede devolver microsegundos y +00:00 (r2 §0).
  inicio: '2026-11-03T12:00:00.123456+00:00', fin: '2026-11-03T13:30:45.000Z', duracion_segundos: 5445,
}

test('tiempo: fecha + hora locales → ISO con offset explícito, sin alterar el instante', () => {
  assert.equal(instanteLocal('2026-11-08', '22:30'), '2026-11-08T22:30:00-03:00')
  assert.equal(Date.parse(instanteLocal('2026-11-08', '22:30')), Date.parse('2026-11-09T01:30:00Z'))
  assert.equal(instanteLocal('2026-02-30', '10:00'), null, 'fecha inexistente')
  assert.equal(instanteLocal('2026-11-08', '24:00'), null, 'hora inexistente')
  assert.equal(instanteLocal('', '10:00'), null)
  assert.deepEqual(partesLocales('2026-11-09T01:15:00Z'), { fecha: '2026-11-08', hora: '22:15' })
})

test('tiempo: cambio de horario — offset propio de cada fecha y horas salteadas rechazadas', () => {
  const anterior = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    assert.equal(instanteLocal('2026-01-15', '09:00'), '2026-01-15T09:00:00-05:00')
    assert.equal(instanteLocal('2026-07-15', '09:00'), '2026-07-15T09:00:00-04:00')
    assert.equal(instanteLocal('2026-03-08', '02:30'), null, '02:30 no existe ese día')
  } finally { process.env.TZ = anterior }
})

test('tiempo: alta manual válida, cruce de medianoche y validaciones locales', () => {
  const ok = prepararRegistroTiempo({ fechaInicio: '2026-11-08', horaInicio: '22:30', fechaFin: '2026-11-09', horaFin: '01:15' }, null, AHORA)
  assert.equal(ok.error, null)
  assert.equal(ok.duracion, 2 * 3600 + 45 * 60)
  assert.deepEqual(ok.guardar, { inicio: '2026-11-08T22:30:00-03:00', fin: '2026-11-09T01:15:00-03:00' })
  assert.deepEqual(ok.validar, ok.guardar)

  const base = { fechaInicio: '2026-11-09', horaInicio: '10:00', fechaFin: '2026-11-09', horaFin: '09:00' }
  assert.equal(prepararRegistroTiempo(base, null, AHORA).error, 'INTERVALO_INVALIDO')
  assert.equal(prepararRegistroTiempo({ ...base, horaFin: '10:00' }, null, AHORA).error, 'INTERVALO_INVALIDO', 'inicio = fin')
  assert.equal(prepararRegistroTiempo({ ...base, horaFin: '13:00' }, null, AHORA).error, 'FIN_FUTURO')
  assert.equal(prepararRegistroTiempo({ ...base, horaFin: '' }, null, AHORA).error, 'DATOS_FALTANTES')
  assert.equal(prepararRegistroTiempo({ ...base, fechaInicio: '2026-02-30' }, null, AHORA).error, 'FECHA_INVALIDA')
  assert.equal(valoresIniciales(null, new Date(AHORA)).fechaInicio, '2026-11-09')
})

test('tiempo: corrección envía version y solo los campos modificados', () => {
  const iniciales = valoresIniciales(REGISTRO)
  assert.deepEqual(iniciales, { fechaInicio: '2026-11-03', horaInicio: '09:00', fechaFin: '2026-11-03', horaFin: '10:30' })

  const sinCambios = prepararRegistroTiempo(iniciales, REGISTRO, AHORA)
  assert.equal(sinCambios.sinCambios, true)

  const soloFin = prepararRegistroTiempo({ ...iniciales, horaFin: '11:00' }, REGISTRO, AHORA)
  assert.equal(soloFin.error, null)
  assert.deepEqual(soloFin.guardar, { fin: '2026-11-03T11:00:00-03:00', version: 2 }, 'el inicio guardado (con microsegundos) no se toca')
  assert.deepEqual(soloFin.validar, { inicio: '2026-11-03T12:00:00.123Z', fin: '2026-11-03T11:00:00-03:00', registro_id: REGISTRO.id })
  assert.equal(soloFin.sinCambios, false)

  const ambos = prepararRegistroTiempo({ ...iniciales, horaInicio: '08:00', horaFin: '11:00' }, REGISTRO, AHORA)
  assert.deepEqual(ambos.guardar, { inicio: '2026-11-03T08:00:00-03:00', fin: '2026-11-03T11:00:00-03:00', version: 2 })
})

test('tiempo: errores por codigo (r2 §0.1) y respaldo por status sin codigo', () => {
  const codigos = ['VERSION_DESACTUALIZADA', 'REGISTRO_TIEMPO_ACTIVO', 'INTERVALO_INVALIDO', 'FIN_FUTURO', 'FECHA_INVALIDA',
    'REGISTRO_AJENO', 'ACCESO_DENEGADO', 'TAREA_NO_ENCONTRADA', 'REGISTRO_NO_ENCONTRADO', 'VERSION_REQUERIDA', 'DATOS_INCOMPLETOS',
    'REGISTRO_INMUTABLE', 'TEMPORIZADOR_YA_ACTIVO', 'SIN_TEMPORIZADOR_ACTIVO', 'TAREA_FINALIZADA', 'CONTENIDO_INVALIDO',
    'MENCION_INVALIDA', 'COMENTARIO_NO_ENCONTRADO', 'COMENTARIO_AJENO', 'NOTIFICACION_NO_ENCONTRADA', 'PARAMETRO_INVALIDO',
    'NO_AUTENTICADO', 'TABLERO_INVALIDO', 'TABLERO_NO_ENCONTRADO']
  const generico = mensajeActualizaciones({ status: 500 })
  const mensajes = codigos.map(codigo => mensajeActualizaciones({ status: 400, codigo }))
  assert.ok(mensajes.every(m => m !== generico), 'todos los códigos del contrato tienen mensaje')
  assert.equal(new Set(mensajes).size, codigos.length, 'mensajes distintos por código')
  assert.match(mensajeActualizaciones({ status: 409, codigo: 'VERSION_DESACTUALIZADA' }), /cambió/)
  assert.equal(mensajeActualizaciones({ status: 409, codigo: 'DESCONOCIDO' }), mensajeActualizaciones({ status: 409 }), 'código desconocido → status')
  assert.equal(mensajeActualizaciones({ status: 500, message: 'relation "x" does not exist' }), generico, 'sin detalles internos')
  assert.equal(esErrorDeAcceso({ status: 403, codigo: 'ACCESO_DENEGADO' }), true)
  assert.equal(esErrorDeAcceso({ status: 401 }), true, '401 del middleware sin código')
  assert.equal(esErrorDeAcceso({ status: 403, codigo: 'REGISTRO_AJENO' }), false)
  assert.equal(esErrorDeAcceso({ status: 404, codigo: 'COMENTARIO_NO_ENCONTRADO' }), false)
})

test('tiempo: superposiciones legibles, incluida una tarea sin acceso', () => {
  const base = { registro_id: 'r', inicio: '2026-11-03T11:00:00Z', fin: '2026-11-03T12:00:00Z', activo: false, solapamiento_segundos: 2700 }
  assert.match(describirSuperposicion({ ...base, misma_tarea: true, tarea: { id: 't', titulo: 'A' } }), /^Esta tarea · .* · 45 min 0 s superpuestos$/)
  assert.match(describirSuperposicion({ ...base, misma_tarea: false, tarea: { id: 't2', titulo: 'Revisar bomba' } }), /^Revisar bomba/)
  assert.match(describirSuperposicion({ ...base, misma_tarea: false, tarea: null }), /^Una tarea a la que ya no tenés acceso/)
  assert.match(describirSuperposicion({ ...base, misma_tarea: false, tarea: null, activo: true, fin: null }), /temporizador en curso/)
  assert.match(rangoRegistro('2026-11-09T01:30:00Z', '2026-11-09T04:15:00Z'), /22:30 – .* 01:15$/, 'cruce de medianoche muestra ambas fechas')
})

test('indicador: temporizadores activos indexados por tarea, solo propios y del tablero', () => {
  const respuesta = { data: [
    { id: 'a', tarea_id: 't1', tablero_id: 'b1', usuario_id: 'yo', inicio: '2026-11-09T14:00:00Z', activo: true, transcurrido_segundos: 60 },
    { id: 'b', tarea_id: 't2', tablero_id: 'b2', usuario_id: 'yo', inicio: '2026-11-09T14:00:00Z', activo: true },
    { id: 'c', tarea_id: 't3', tablero_id: 'b1', usuario_id: 'otro', inicio: '2026-11-09T14:00:00Z', activo: true },
  ], total: 3 }
  const mapa = indexarTemporizadores(respuesta, { tableroId: 'b1', usuarioId: 'yo' })
  assert.deepEqual([...mapa.keys()], ['t1'])
  assert.equal(mapa.get('t1').inicio, '2026-11-09T14:00:00Z')
  assert.equal(indexarTemporizadores(null).size, 0, 'respuesta inválida o endpoint no disponible: sin indicadores')
  assert.equal(indexarTemporizadores({ data: [respuesta.data[2]] }, { tableroId: 'b1' }).size, 1, 'sin usuario conocido confía en el filtro del backend')
})
