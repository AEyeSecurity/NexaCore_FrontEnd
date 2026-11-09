process.env.TZ = 'America/Argentina/Buenos_Aires'

import test from 'node:test'
import assert from 'node:assert/strict'
import { cargarComponentes } from './helpers/renderizar.js'

const m = await cargarComponentes([
  ['AccionesTarjeta', 'src/modules/operations/AccionesTarjeta.jsx'],
  ['IndicadorTemporizador', 'src/modules/operations/AccionesTarjeta.jsx', 'IndicadorTemporizador'],
  ['TextoConMenciones', 'src/modules/operations/ComposerMenciones.jsx', 'TextoConMenciones'],
  ['ComposerMenciones', 'src/modules/operations/ComposerMenciones.jsx'],
  ['RegistroTiempoForm', 'src/modules/operations/RegistroTiempoForm.jsx'],
])
const omitir = m ? false : 'esbuild no disponible para compilar JSX'
const noop = () => {}
const botones = (html) => [...html.matchAll(/<button[^>]*>/g)].map(b => b[0])

test('Kanban: barra de acciones con áreas de 36 px, íconos de 16 px y aria-label', { skip: omitir }, () => {
  const html = m.render(m.AccionesTarjeta, { titulo: 'Revisar bomba', onActualizaciones: noop, onHistorial: noop, onEditar: noop, onEliminar: noop })
  const b = botones(html)
  assert.equal(b.length, 4)
  assert.deepEqual(b.map(x => /aria-label="([^"]+)"/.exec(x)[1]), [
    'Abrir actualizaciones: Revisar bomba', 'Ver historial de cambios: Revisar bomba', 'Editar tarea: Revisar bomba', 'Eliminar tarea: Revisar bomba',
  ])
  assert.ok(b.every(x => /type="button"/.test(x) && /title="/.test(x)), 'tipo y tooltip en todos')
  assert.ok(b.every(x => /h-9/.test(x)), '36 px de alto')
  assert.ok(b.slice(1).every(x => /w-9/.test(x)), 'íconos: 36×36 px')
  assert.ok(b.every(x => /focus-visible:ring-2/.test(x) && /disabled:/.test(x)), 'estados focus y disabled')
  assert.ok(b.slice(1).every(x => /text-gray-500/.test(x)) && !/text-gray-300/.test(html), 'contraste mayor que el anterior')
  assert.equal([...html.matchAll(/<svg[^>]*width="16"/g)].length, 4, 'íconos de 16 px')
  assert.match(html, />Actualizaciones<\/span>/, 'Actualizaciones con ícono y texto')
})

test('Kanban: las finalizadas conservan sus acciones (sin Eliminar) y la etiqueta "Ver / editar"', { skip: omitir }, () => {
  const html = m.render(m.AccionesTarjeta, { titulo: 'T', editarLabel: 'Ver / editar', onActualizaciones: noop, onHistorial: noop, onEditar: noop })
  assert.equal(botones(html).length, 3)
  assert.doesNotMatch(html, /Eliminar/)
  assert.match(html, /title="Ver \/ editar"/)
})

test('Kanban: indicador de temporizador propio, discreto y sin datos cuando no hay', { skip: omitir }, () => {
  assert.equal(m.render(m.IndicadorTemporizador, { temporizador: undefined }), '')
  const hoy = m.render(m.IndicadorTemporizador, { temporizador: { inicio: '2026-11-09T14:05:00Z' }, ahora: new Date('2026-11-09T15:00:00Z') })
  assert.match(hoy, /Tu temporizador en curso · desde 11:05/)
  assert.match(hoy, /motion-reduce:animate-none/, 'respeta reducción de movimiento')
  const otroDia = m.render(m.IndicadorTemporizador, { temporizador: { inicio: '2026-11-08T14:05:00Z' }, ahora: new Date('2026-11-09T15:00:00Z') })
  assert.match(otroDia, /desde 08\/11\/26 11:05/)
})

test('Menciones: chips con el nombre actual; quitadas y eliminadas como texto', { skip: omitir }, () => {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  const html = m.render(m.TextoConMenciones, {
    contenido: `@[Gino](${id}) revisá. @[Viejo](bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee) <b>no</b>`,
    menciones: [{ id, nombre: 'Gino Pérez', activo: true }],
  })
  assert.match(html, /<span title="Mención a Gino Pérez"[^>]*>@(<!-- -->)?Gino Pérez<\/span>/)
  assert.match(html, /@Viejo &lt;b&gt;no&lt;\/b&gt;/, 'texto escapado, sin HTML del comentario')
  assert.doesNotMatch(html, new RegExp(id), 'el uuid no se muestra')
})

test('Menciones: el editor expone el patrón combobox accesible', { skip: omitir }, () => {
  const html = m.render(m.ComposerMenciones, { valor: { texto: 'Hola', menciones: [] }, onChange: noop, mencionables: { status: 'success', data: [] }, ariaLabel: 'Escribir' })
  assert.match(html, /role="combobox"/)
  assert.match(html, /aria-autocomplete="list"/)
  assert.match(html, /aria-expanded="false"/)
  assert.doesNotMatch(html, /maxlength/i, 'el límite se controla sobre el texto serializado')
})

test('Tiempo: formulario de alta con etiquetas y campos nativos de fecha y hora', { skip: omitir }, () => {
  const html = m.render(m.RegistroTiempoForm, { tareaId: 't', listo: true, ocupado: '', ejecutar: noop })
  for (const etiqueta of ['Fecha de inicio', 'Hora de inicio', 'Fecha de finalización', 'Hora de finalización']) {
    const [, para] = new RegExp(`<label for="([^"]+)"[^>]*>${etiqueta}</label>`).exec(html) ?? []
    assert.ok(para && html.includes(`id="${para}"`), `${etiqueta} asociada a su campo`)
  }
  assert.equal([...html.matchAll(/type="date"/g)].length, 2)
  assert.equal([...html.matchAll(/type="time"/g)].length, 2)
  assert.match(html, />Registrar<\/button>/)
  assert.doesNotMatch(html, /Cancelar corrección/)
})

test('Tiempo: corrección precargada con versión, horario y Cancelar corrección', { skip: omitir }, () => {
  const registro = { id: 'r1', version: 2, inicio: '2026-11-03T12:00:00Z', fin: '2026-11-03T13:30:00Z', duracion_segundos: 5400 }
  const html = m.render(m.RegistroTiempoForm, { tareaId: 't', registro, listo: true, ocupado: '', ejecutar: noop })
  assert.match(html, /Corrigiendo tu registro/)
  assert.match(html, /versión 2/)
  assert.match(html, /value="2026-11-03"/)
  assert.match(html, /value="09:00"/)
  assert.match(html, /value="10:30"/)
  assert.match(html, /Cancelar corrección/)
  assert.match(html, />Guardar cambios<\/button>/)
  const sinListo = m.render(m.RegistroTiempoForm, { tareaId: 't', registro, listo: false, ocupado: '', ejecutar: noop })
  assert.match(sinListo, /<button type="submit"[^>]*disabled=""/, 'sin acceso confirmado no se puede guardar')
})
