import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PATRON_TOKEN, MAX_COMENTARIO, etiquetaDe, crearToken, segmentarContenido, editorVacio, desdeContenido,
  serializar, longitudSerializada, idsMencionados, aplicarEdicion, consultaMencion, insertarMencion, filtrarMencionables,
} from '../src/modules/operations/menciones.js'

const LEO_A = '3f0c1111-2222-4333-8444-5555666677e1'
const LEO_B = '3f0c1111-2222-4333-8444-5555666677e2'
const GINO = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

// Escribe `texto` al final, carácter por carácter, como en el textarea.
function escribir(estado, texto) {
  for (const c of texto) estado = aplicarEdicion(estado, estado.texto + c, estado.texto.length + 1).estado
  return estado
}
function mencionar(estado, usuario) {
  const consulta = consultaMencion(estado, estado.texto.length)
  assert.ok(consulta, 'hay una consulta @ abierta')
  return insertarMencion(estado, consulta, usuario).estado
}

test('menciones: misma expresión que el backend (r2 §3.1)', () => {
  assert.equal(PATRON_TOKEN.source, String.raw`@\[([^[\]\r\n]{1,100})\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)`)
  assert.equal(MAX_COMENTARIO, 2000)
  assert.equal(etiquetaDe('  Ana [Admin]\nPérez '), 'Ana Admin Pérez')
  assert.equal(etiquetaDe(''), 'usuario')
  assert.equal(etiquetaDe('x'.repeat(150)).length, 100)
  assert.equal(crearToken({ id: LEO_A.toUpperCase(), nombre: 'Leo' }), `@[Leo](${LEO_A})`, 'uuid en minúsculas')
})

test('menciones: selección con teclado/mouse inserta el token y se sigue escribiendo', () => {
  let e = escribir(editorVacio(), 'Hola @Gi')
  e = mencionar(e, { id: GINO, nombre: 'Gino' })
  assert.equal(e.texto, 'Hola @Gino ')
  e = escribir(e, 'ya terminé. ¿Podés revisar?')
  assert.equal(serializar(e), `Hola @[Gino](${GINO}) ya terminé. ¿Podés revisar?`)
  assert.equal(e.menciones.length, 1)
})

test('menciones: múltiples menciones y nombres repetidos conservan cada id', () => {
  let e = escribir(editorVacio(), '@')
  e = mencionar(e, { id: LEO_A, nombre: 'Leo' })
  e = escribir(e, 'y @')
  e = mencionar(e, { id: LEO_B, nombre: 'leo' })
  e = escribir(e, 'y otra vez @')
  e = mencionar(e, { id: LEO_A, nombre: 'Leo' })
  assert.equal(serializar(e), `@[Leo](${LEO_A}) y @[leo](${LEO_B}) y otra vez @[Leo](${LEO_A}) `)
  assert.deepEqual(idsMencionados(e), [LEO_A, LEO_B])
})

test('menciones: @nombre escrito sin seleccionar es texto común (no se serializa como token)', () => {
  const e = escribir(editorVacio(), '@Gino revisá esto, mail a gino@empresa.com')
  assert.equal(serializar(e), '@Gino revisá esto, mail a gino@empresa.com')
  assert.equal(e.menciones.length, 0)
  assert.equal(consultaMencion(e, e.texto.length), null, 'un @ dentro de un email no abre el selector')
  assert.equal(consultaMencion(escribir(editorVacio(), '@ '), 2), null, '"@ " no es una consulta')
})

test('menciones: borrar sobre una mención la quita completa; escribir dentro la convierte en texto', () => {
  let e = mencionar(escribir(editorVacio(), 'Hola @'), { id: GINO, nombre: 'Gino' }) // "Hola @Gino "
  e = escribir(e, 'ok')
  // Backspace con el cursor justo después de "@Gino" (posición 10): borra "o".
  const borrar = aplicarEdicion(e, 'Hola @Gin ok', 9)
  assert.equal(borrar.estado.texto, 'Hola  ok')
  assert.equal(borrar.cursor, 5)
  assert.equal(borrar.estado.menciones.length, 0)
  // Insertar dentro de la mención: deja de ser mención, el texto queda.
  const dentro = aplicarEdicion(e, 'Hola @GiXno ok', 9)
  assert.equal(dentro.estado.menciones.length, 0)
  assert.equal(serializar(dentro.estado), 'Hola @GiXno ok')
  // Escribir antes desplaza la mención sin romperla.
  const antes = aplicarEdicion(e, '¡Hola @Gino ok', 1)
  assert.equal(serializar(antes.estado), `¡Hola @[Gino](${GINO}) ok`)
})

test('menciones: render de históricos, renombres, quitadas y usuarios eliminados', () => {
  assert.deepEqual(segmentarContenido('Comentario viejo @Gino', []), [{ tipo: 'texto', texto: 'Comentario viejo @Gino' }])
  const contenido = `@[Gino](${GINO}) y @[Leo](${LEO_A}) y @[Borrado](${LEO_B})`
  const partes = segmentarContenido(contenido, [
    { id: GINO, nombre: 'Gino Pérez', activo: true }, // renombrado: se muestra el nombre actual
    { id: LEO_A, nombre: 'Leo', activo: false },
  ])
  assert.deepEqual(partes, [
    { tipo: 'mencion', id: GINO, nombre: 'Gino Pérez', activo: true },
    { tipo: 'texto', texto: ' y ' },
    { tipo: 'mencion', id: LEO_A, nombre: 'Leo', activo: false },
    { tipo: 'texto', texto: ' y @Borrado' },
  ])
  assert.deepEqual(segmentarContenido('@[Leo](123) hola', []), [{ tipo: 'texto', texto: '@[Leo](123) hola' }],
    'un token con id inválido es texto común tal cual')
})

test('menciones: edición conserva menciones vigentes y elimina las quitadas', () => {
  const contenido = `@[Gino](${GINO}) revisá con @[Leo](${LEO_A}) y @[Viejo](${LEO_B})`
  // LEO_B ya no es mención vigente (usuario eliminado o mención quitada).
  let e = desdeContenido(contenido, [{ id: GINO, nombre: 'Gino Pérez' }, { id: LEO_A, nombre: 'Leo' }])
  assert.equal(e.texto, '@Gino Pérez revisá con @Leo y @Viejo')
  assert.equal(serializar(e), `@[Gino Pérez](${GINO}) revisá con @[Leo](${LEO_A}) y @Viejo`)
  // El usuario borra la mención a Leo (backspace al final de "@Leo").
  const fin = e.texto.indexOf('@Leo') + 4
  e = aplicarEdicion(e, e.texto.slice(0, fin - 1) + e.texto.slice(fin), fin - 1).estado
  assert.equal(serializar(e), `@[Gino Pérez](${GINO}) revisá con  y @Viejo`)
  assert.deepEqual(idsMencionados(e), [GINO], 'Leo deja de enviarse como vigente')
})

test('menciones: el límite de 2000 cuenta el contenido serializado con tokens', () => {
  let e = escribir(editorVacio(), '@')
  e = mencionar(e, { id: GINO, nombre: 'Gino' })
  assert.equal(e.texto.length, 6)
  assert.equal(longitudSerializada(e), `@[Gino](${GINO}) `.length)
})

test('menciones: filtro por nombre sin acentos ni mayúsculas', () => {
  const lista = [
    { id: '1', nombre: 'Ana Pérez', email: null },
    { id: '2', nombre: 'Leo', email: 'leo.a@x.com' },
    { id: '3', nombre: 'leo', email: 'leo.b@x.com' },
    { id: '4', nombre: 'Pilar Álvarez', email: null },
  ]
  assert.deepEqual(filtrarMencionables(lista, 'leo').map(u => u.id), ['2', '3'])
  assert.deepEqual(filtrarMencionables(lista, 'alv').map(u => u.id), ['4'], 'palabra que empieza así, sin acento')
  assert.deepEqual(filtrarMencionables(lista, 'pe').map(u => u.id), ['1'])
  assert.equal(filtrarMencionables(lista, '').length, 4)
  assert.deepEqual(filtrarMencionables(lista, 'leo.a'), [], 'no filtra por email')
})
