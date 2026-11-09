// Menciones con @ en los comentarios del Operativo (contrato 2026-11-09 r2, §3).
//
// Serialización (la única que entiende el backend), dentro de `contenido`:
//     @[Etiqueta](uuid)
// El uuid es la identidad de la persona; la etiqueta es solo presentación y el
// backend la reemplaza por el nombre actual al guardar. Cualquier otro texto
// (`@Leo` sin token, `@[Leo](123)`) es texto común: no menciona ni notifica.
//
// El editor no muestra los tokens: trabaja con un modelo
//     { texto, menciones: [{ inicio, fin, id, nombre }] }
// donde `texto` es lo que ve el usuario (cada mención aparece como `@Nombre`) y
// cada mención es el rango [inicio, fin) de ese texto, asociado a un id. Solo
// esos rangos se serializan como tokens: escribir `@Leo` a mano no menciona a
// nadie. Sin React ni red: se prueba con node --test.

// Misma expresión que el backend (operations/services/menciones.js).
export const PATRON_TOKEN = /@\[([^[\]\r\n]{1,100})\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi
export const MAX_COMENTARIO = 2000
const MAX_ETIQUETA = 100
const MAX_CONSULTA = 40

// Copia por uso: una expresión /g compartida guarda lastIndex entre llamadas.
const tokens = (texto) => String(texto ?? '').matchAll(new RegExp(PATRON_TOKEN.source, 'gi'))

// Igual que etiquetaDe del backend: sin [ ] ni saltos de línea, 1..100 caracteres.
export function etiquetaDe(nombre) {
  const limpia = String(nombre ?? '').replace(/[[\]\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_ETIQUETA).trim()
  return limpia || 'usuario'
}

export function crearToken({ id, nombre }) {
  return `@[${etiquetaDe(nombre)}](${String(id).toLowerCase()})`
}

// ── Render de comentarios guardados ─────────────────────────────────────────
// Recorre `contenido` con la expresión del contrato. Un token cuyo uuid está en
// `menciones` (vigentes, con el nombre actual) es una mención; el resto
// (usuario eliminado, mención quitada) se muestra como `@Etiqueta`, texto común.
// Los comentarios históricos (sin tokens) quedan como un único texto.
export function segmentarContenido(contenido, menciones = []) {
  const texto = String(contenido ?? '')
  const vigentes = new Map((menciones ?? []).map(m => [String(m.id).toLowerCase(), m]))
  const partes = []
  const agregarTexto = (t) => {
    if (!t) return
    const ultima = partes.at(-1)
    if (ultima?.tipo === 'texto') ultima.texto += t
    else partes.push({ tipo: 'texto', texto: t })
  }
  let desde = 0
  for (const m of tokens(texto)) {
    agregarTexto(texto.slice(desde, m.index))
    const id = m[2].toLowerCase()
    const vigente = vigentes.get(id)
    if (vigente) partes.push({ tipo: 'mencion', id, nombre: vigente.nombre, activo: vigente.activo !== false })
    else agregarTexto(`@${m[1]}`)
    desde = m.index + m[0].length
  }
  agregarTexto(texto.slice(desde))
  return partes
}

// ── Modelo del editor ───────────────────────────────────────────────────────

export const editorVacio = () => ({ texto: '', menciones: [] })

// Para editar un comentario guardado: las menciones vigentes conservan su id
// (aunque la persona haya dejado el tablero) y muestran el nombre actual; los
// tokens que ya no son menciones pasan a ser el texto `@Etiqueta`, igual que
// se ven en el historial.
export function desdeContenido(contenido, mencionesVigentes = []) {
  const vigentes = new Map((mencionesVigentes ?? []).map(m => [String(m.id).toLowerCase(), m]))
  const original = String(contenido ?? '')
  let texto = ''
  const menciones = []
  let desde = 0
  for (const m of tokens(original)) {
    texto += original.slice(desde, m.index)
    const id = m[2].toLowerCase()
    const vigente = vigentes.get(id)
    if (vigente) {
      const nombre = etiquetaDe(vigente.nombre)
      menciones.push({ inicio: texto.length, fin: texto.length + 1 + nombre.length, id, nombre })
      texto += `@${nombre}`
    } else {
      texto += `@${m[1]}`
    }
    desde = m.index + m[0].length
  }
  texto += original.slice(desde)
  return { texto, menciones }
}

const ordenadas = (menciones) => [...menciones].sort((a, b) => a.inicio - b.inicio)

// Texto que se envía al backend: cada rango de mención se reemplaza por su token.
export function serializar(estado) {
  const { texto, menciones } = estado
  let salida = ''
  let desde = 0
  for (const m of ordenadas(menciones)) {
    salida += texto.slice(desde, m.inicio) + crearToken(m)
    desde = m.fin
  }
  return salida + texto.slice(desde)
}

// El límite de 2000 del backend se aplica al contenido serializado (con tokens).
export function longitudSerializada(estado) {
  return serializar(estado).length
}

export function idsMencionados(estado) {
  return [...new Set(ordenadas(estado.menciones).map(m => m.id))]
}

// Aplica un cambio del textarea (`nuevoTexto`) al modelo. `cursor` es
// selectionEnd después del cambio: ubica la edición aunque haya caracteres
// repetidos alrededor. Reglas:
//   - menciones antes del cambio: intactas; después: se desplazan;
//   - escribir dentro de una mención la convierte en texto común;
//   - borrar (sin escribir nada) sobre una mención la borra completa, así no
//     quedan restos como "@Gin" que parezcan una mención.
// Devuelve { estado, cursor } (cursor: dónde dejar el cursor, o null).
export function aplicarEdicion(estado, nuevoTexto, cursor) {
  const viejo = estado.texto
  if (viejo === nuevoTexto) return { estado, cursor: null }

  let sufijo = -1
  if (Number.isInteger(cursor) && cursor >= 0 && cursor <= nuevoTexto.length) {
    const s = nuevoTexto.length - cursor
    if (s <= viejo.length && viejo.endsWith(nuevoTexto.slice(cursor))) sufijo = s
  }
  const minimo = Math.min(viejo.length, nuevoTexto.length)
  if (sufijo < 0) {
    sufijo = 0
    while (sufijo < minimo && viejo[viejo.length - 1 - sufijo] === nuevoTexto[nuevoTexto.length - 1 - sufijo]) sufijo++
  }
  let prefijo = 0
  const tope = Math.min(viejo.length - sufijo, nuevoTexto.length - sufijo)
  while (prefijo < tope && viejo[prefijo] === nuevoTexto[prefijo]) prefijo++

  const finViejo = viejo.length - sufijo
  const insertado = nuevoTexto.slice(prefijo, nuevoTexto.length - sufijo)
  const delta = nuevoTexto.length - viejo.length
  // Rango reemplazado [prefijo, finViejo); una inserción pura (rango vacío) solo
  // afecta a la mención que la contiene estrictamente.
  const afectada = (m) => (finViejo === prefijo ? m.inicio < prefijo && m.fin > prefijo : m.inicio < finViejo && m.fin > prefijo)
  const afectadas = estado.menciones.filter(afectada)

  if (!insertado && afectadas.length) {
    const desde = Math.min(prefijo, ...afectadas.map(m => m.inicio))
    const hasta = Math.max(finViejo, ...afectadas.map(m => m.fin))
    const texto = viejo.slice(0, desde) + viejo.slice(hasta)
    const corrimiento = texto.length - viejo.length
    const menciones = estado.menciones
      .filter(m => m.fin <= desde || m.inicio >= hasta)
      .map(m => (m.inicio >= hasta ? { ...m, inicio: m.inicio + corrimiento, fin: m.fin + corrimiento } : m))
    return { estado: { texto, menciones }, cursor: desde }
  }

  const menciones = estado.menciones
    .filter(m => !afectadas.includes(m))
    .map(m => (m.inicio >= finViejo ? { ...m, inicio: m.inicio + delta, fin: m.fin + delta } : m))
  return { estado: { texto: nuevoTexto, menciones }, cursor: null }
}

// Consulta de mención abierta en la posición del cursor: un `@` al principio o
// después de un espacio/puntuación (no en un email), sin saltos de línea ni
// corchetes hasta el cursor y fuera de una mención existente.
// Devuelve { inicio, fin, consulta } o null.
export function consultaMencion(estado, cursor) {
  const { texto, menciones } = estado
  if (!Number.isInteger(cursor) || cursor < 1) return null
  const antes = texto.slice(0, cursor)
  const arroba = antes.lastIndexOf('@')
  if (arroba < 0) return null
  if (arroba > 0 && !/[\s([{"'¿¡,;:]/.test(antes[arroba - 1])) return null
  if (menciones.some(m => arroba >= m.inicio && arroba < m.fin)) return null
  const consulta = antes.slice(arroba + 1)
  if (consulta.length > MAX_CONSULTA || /[\r\n[\]@]/.test(consulta) || /^\s/.test(consulta)) return null
  return { inicio: arroba, fin: cursor, consulta }
}

// Reemplaza la consulta (`@texto`) por la mención de `usuario` y agrega un
// espacio si no lo hay. Devuelve { estado, cursor } con el cursor después de
// la mención, listo para seguir escribiendo.
export function insertarMencion(estado, rango, usuario) {
  const nombre = etiquetaDe(usuario.nombre)
  const visible = `@${nombre}`
  const siguiente = estado.texto[rango.fin]
  const hayEspacio = siguiente !== undefined && /\s/.test(siguiente)
  const insertado = visible + (hayEspacio ? '' : ' ')
  const texto = estado.texto.slice(0, rango.inicio) + insertado + estado.texto.slice(rango.fin)
  const delta = insertado.length - (rango.fin - rango.inicio)
  const menciones = estado.menciones
    .filter(m => m.fin <= rango.inicio || m.inicio >= rango.fin)
    .map(m => (m.inicio >= rango.fin ? { ...m, inicio: m.inicio + delta, fin: m.fin + delta } : m))
  menciones.push({ inicio: rango.inicio, fin: rango.inicio + visible.length, id: String(usuario.id).toLowerCase(), nombre })
  return {
    estado: { texto, menciones: ordenadas(menciones) },
    cursor: rango.inicio + visible.length + 1,
  }
}

const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Filtra por nombre (sin mayúsculas ni acentos): primero los que empiezan con
// la consulta, después los que tienen una palabra que empieza así y por último
// los que la contienen. Conserva el orden del backend (por nombre).
export function filtrarMencionables(lista, consulta, limite = 8) {
  const q = normalizar(consulta)
  const usuarios = Array.isArray(lista) ? lista : []
  if (!q) return usuarios.slice(0, limite)
  const puntaje = (u) => {
    const nombre = normalizar(u.nombre)
    if (nombre.startsWith(q)) return 0
    if (nombre.split(/\s+/).some(p => p.startsWith(q))) return 1
    return nombre.includes(q) ? 2 : -1
  }
  return usuarios
    .map((u, i) => ({ u, i, p: puntaje(u) }))
    .filter(x => x.p >= 0)
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .slice(0, limite)
    .map(x => x.u)
}
