// Criterio verificado en operations/config/etapas.js y tarea_es_final del backend.
// null significa información insuficiente: el POST de inicio decide (409).
export function tareaFinalParaTemporizador(tarea) {
  const tipo = tarea?.operativo_etapas?.tipo_base
  if (['completada', 'cancelada'].includes(tipo)) return true
  if (['pendiente', 'en_curso', 'en_revision_abierta', 'en_revision_cerrada'].includes(tipo)) return false
  // Solo usar el estado canónico para una tarea confirmada sin etapa.
  // Una relación ausente/incompleta o un tipo desconocido no es evidencia de cierre.
  if (!tarea || tarea.operativo_etapas !== null || tarea.etapa_id != null) return null
  if (['Completada', 'Cancelada'].includes(tarea.estado)) return true
  if (['Pendiente', 'En Proceso'].includes(tarea.estado)) return false
  return null
}

// El reloj local solo mide el tiempo desde la última respuesta del servidor.
export function referenciaTemporizador(respuesta, ahora = performance.now()) {
  const activo = respuesta.activo
  if (!activo) return null
  const servidor = Date.parse(activo.servidor_ahora || respuesta.servidor_ahora)
  const inicio = Date.parse(activo.inicio)
  const segundos = Number.isFinite(servidor - inicio)
    ? Math.max(0, (servidor - inicio) / 1000) : activo.transcurrido_segundos
  return { segundos: Math.max(0, Number(segundos) || 0), recibido: ahora }
}
export function segundosVisibles(referencia, ahora = performance.now()) {
  return referencia ? Math.floor(referencia.segundos + Math.max(0, ahora - referencia.recibido) / 1000) : 0
}
export function formatoReloj(valor) {
  const s = Math.max(0, Math.floor(Number(valor) || 0))
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':')
}
export function formatoDuracion(valor) {
  const s = Math.max(0, Math.floor(Number(valor) || 0))
  return [s >= 3600 && `${Math.floor(s / 3600)} h`, s >= 60 && `${Math.floor(s / 60) % 60} min`, `${s % 60} s`].filter(Boolean).join(' ')
}

// ── Errores ──────────────────────────────────────────────────────────────────
// `codigo` (contrato r2, §0.1) decide la lógica y el mensaje; sin `codigo`
// (401 del middleware, 500, red) se usa el status HTTP. Nunca se muestran
// detalles internos de un 5xx ni de un error de red.
const MENSAJES_CODIGO = {
  NO_AUTENTICADO:           'Tu sesión venció. Volvé a iniciar sesión.',
  ACCESO_DENEGADO:          'Ya no tenés acceso a esta tarea o a su tablero.',
  TAREA_NO_ENCONTRADA:      'La tarea ya no existe.',
  TABLERO_INVALIDO:         'El tablero indicado no es válido.',
  TABLERO_NO_ENCONTRADO:    'El tablero ya no existe.',
  FECHA_INVALIDA:           'Revisá las fechas y horas: alguna no es válida.',
  INTERVALO_INVALIDO:       'El inicio tiene que ser anterior a la finalización.',
  FIN_FUTURO:               'La finalización no puede ser posterior a la hora actual.',
  VERSION_REQUERIDA:        'No se pudo identificar la versión del registro. Volvé a abrir la corrección.',
  DATOS_INCOMPLETOS:        'Modificá el inicio o la finalización para corregir el registro.',
  REGISTRO_NO_ENCONTRADO:   'El registro de tiempo ya no existe.',
  REGISTRO_AJENO:           'Solo quien registró este tiempo puede corregirlo.',
  REGISTRO_TIEMPO_ACTIVO:   'El temporizador de este registro sigue activo: detenelo antes de corregirlo.',
  VERSION_DESACTUALIZADA:   'El registro cambió desde que lo abriste. Revisá la versión actual y repetí la corrección.',
  REGISTRO_INMUTABLE:       'El registro de tiempo no se pudo modificar.',
  TEMPORIZADOR_YA_ACTIVO:   'Ya tenés un temporizador en curso en esta tarea.',
  SIN_TEMPORIZADOR_ACTIVO:  'No tenés un temporizador en curso en esta tarea.',
  TAREA_FINALIZADA:         'La tarea está completada o cancelada: no se puede iniciar el temporizador. Podés registrar tiempo manualmente.',
  CONTENIDO_INVALIDO:       'Revisá el comentario: debe tener entre 1 y 2000 caracteres (las menciones cuentan completas).',
  MENCION_INVALIDA:         'Alguna persona mencionada ya no es miembro activo del tablero. Quitá esa mención y volvé a intentar.',
  COMENTARIO_NO_ENCONTRADO: 'El comentario ya no existe.',
  COMENTARIO_AJENO:         'Solo el autor puede modificar o eliminar este comentario.',
  NOTIFICACION_NO_ENCONTRADA: 'La notificación ya no existe.',
  PARAMETRO_INVALIDO:       'No se pudieron consultar las notificaciones.',
  // Validaciones locales del formulario de tiempo (no las envía el backend).
  DATOS_FALTANTES:          'Completá la fecha y la hora de inicio y de finalización.',
  SIN_CAMBIOS:              'No hay cambios para guardar.',
}
const MENSAJES_STATUS = {
  400: 'Revisá el comentario: debe contener entre 1 y 2000 caracteres.',
  401: 'Tu sesión venció. Volvé a iniciar sesión.',
  403: 'No tenés permiso para esta acción o ya no tenés acceso al tablero.',
  404: 'La tarea o el comentario ya no existe.',
  409: 'El temporizador o la tarea cambió. Estamos consultando el estado actual.',
}
const GENERICO = 'No se pudo conectar con el servidor. Intentá nuevamente.'

export function mensajeActualizaciones(error) {
  if (typeof error === 'string') return MENSAJES_CODIGO[error] || GENERICO
  const porCodigo = error?.codigo && MENSAJES_CODIGO[error.codigo]
  if (porCodigo) return porCodigo
  return MENSAJES_STATUS[error?.status] || GENERICO
}

// Errores tras los cuales el panel no debe seguir mostrando datos de la tarea.
export function esErrorDeAcceso(error) {
  return ['NO_AUTENTICADO', 'ACCESO_DENEGADO', 'TAREA_NO_ENCONTRADA'].includes(error?.codigo)
    || [401, 403, 404].includes(error?.status) && !error?.codigo
}

// ── Fechas y horas del formulario de tiempo ─────────────────────────────────
// Los campos nativos dan fecha (AAAA-MM-DD) y hora (HH:MM) locales. Se envían
// como ISO 8601 con el offset que tiene esa fecha en la zona del navegador
// (incluye cambios de horario): el instante enviado es exactamente el elegido.

const dos = (n) => String(n).padStart(2, '0')

export function fechaLocal(fecha) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}
export function horaLocal(fecha) {
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
}

// { fecha, hora } locales de un instante ISO (hora con minutos).
export function partesLocales(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : { fecha: fechaLocal(d), hora: horaLocal(d) }
}

// '2026-11-08' + '22:30' → '2026-11-08T22:30:00-03:00'. null si la fecha no
// existe (31/02) o la hora no existe en la zona local (salto por cambio de
// horario): no se "corrige" en silencio lo que eligió el usuario.
export function instanteLocal(fecha, hora) {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha ?? '')
  const h = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(hora ?? '')
  if (!f || !h) return null
  const [anio, mes, dia, hh, mm, ss] = [+f[1], +f[2], +f[3], +h[1], +h[2], +(h[3] ?? 0)]
  if (mes < 1 || mes > 12 || hh > 23 || mm > 59 || ss > 59) return null
  const d = new Date(anio, mes - 1, dia, hh, mm, ss)
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia
    || d.getHours() !== hh || d.getMinutes() !== mm) return null
  const offset = -d.getTimezoneOffset()
  const signo = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return `${fecha}T${dos(hh)}:${dos(mm)}:${dos(ss)}${signo}${dos(Math.floor(abs / 60))}:${dos(abs % 60)}`
}

export function valoresIniciales(registro, ahora = new Date()) {
  if (!registro) {
    const hoy = fechaLocal(ahora)
    return { fechaInicio: hoy, horaInicio: '', fechaFin: hoy, horaFin: '' }
  }
  const inicio = partesLocales(registro.inicio) ?? { fecha: '', hora: '' }
  const fin = partesLocales(registro.fin) ?? { fecha: '', hora: '' }
  return { fechaInicio: inicio.fecha, horaInicio: inicio.hora, fechaFin: fin.fecha, horaFin: fin.hora }
}

// Tolerancia para la validación local de "fin futuro": la decisión final es
// del backend (hora del servidor); acá solo se evita un viaje inútil.
const TOLERANCIA_FUTURO_MS = 60 * 1000

// Valida el formulario y arma los pedidos (r2 §1.4–1.6). En una corrección,
// los campos que el usuario no tocó NO se envían en el PATCH (el backend los
// conserva al microsegundo); para /validar, que exige ambos, se usa el valor
// guardado. Devuelve:
//   { error, campo, inicio, fin, duracion, sinCambios, validar, guardar }
export function prepararRegistroTiempo(valores, registro = null, ahora = Date.now()) {
  const vacio = (campo) => ({ error: 'DATOS_FALTANTES', campo, inicio: null, fin: null, duracion: null, sinCambios: false })
  if (!valores.fechaInicio || !valores.horaInicio) return vacio('inicio')
  if (!valores.fechaFin || !valores.horaFin) return vacio('fin')

  const iniciales = registro ? valoresIniciales(registro) : null
  const cambioInicio = !iniciales || valores.fechaInicio !== iniciales.fechaInicio || valores.horaInicio !== iniciales.horaInicio
  const cambioFin = !iniciales || valores.fechaFin !== iniciales.fechaFin || valores.horaFin !== iniciales.horaFin

  const inicio = cambioInicio ? instanteLocal(valores.fechaInicio, valores.horaInicio) : new Date(registro.inicio).toISOString()
  const fin = cambioFin ? instanteLocal(valores.fechaFin, valores.horaFin) : new Date(registro.fin).toISOString()
  const base = { inicio, fin, duracion: null, sinCambios: !!registro && !cambioInicio && !cambioFin }
  if (!inicio) return { ...base, error: 'FECHA_INVALIDA', campo: 'inicio' }
  if (!fin) return { ...base, error: 'FECHA_INVALIDA', campo: 'fin' }

  const msInicio = Date.parse(inicio)
  const msFin = Date.parse(fin)
  const duracion = Math.floor((msFin - msInicio) / 1000)
  if (msInicio >= msFin) return { ...base, error: 'INTERVALO_INVALIDO', campo: 'fin' }
  if (msFin > ahora + TOLERANCIA_FUTURO_MS) return { ...base, duracion, error: 'FIN_FUTURO', campo: 'fin' }

  return {
    ...base,
    error: null,
    campo: null,
    duracion,
    validar: registro ? { inicio, fin, registro_id: registro.id } : { inicio, fin },
    guardar: registro
      ? { ...(cambioInicio ? { inicio } : {}), ...(cambioFin ? { fin } : {}), version: registro.version }
      : { inicio, fin },
  }
}

// ── Formatos de presentación ────────────────────────────────────────────────

const valida = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d }

// Formatos armados a mano (24 h, dd/mm/aa): iguales en cualquier navegador,
// sin depender de las variantes de ICU para es-AR ("p. m.", "08-11").
export function fmtHora(iso) {
  const d = valida(iso)
  return d ? horaLocal(d) : ''
}
export function fmtFechaHora(iso) {
  const d = valida(iso)
  return d ? `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${horaLocal(d)}` : ''
}
function fmtDia(d) {
  const semana = d.toLocaleDateString('es-AR', { weekday: 'short' }).replace(/\.$/, '')
  return `${semana} ${dos(d.getDate())}/${dos(d.getMonth() + 1)}`
}

// "lun 03/11 · 09:00 – 10:30"; si cruza la medianoche: "lun 03/11 · 22:30 – mar 04/11 · 01:15".
export function rangoRegistro(inicioIso, finIso) {
  const inicio = valida(inicioIso)
  const fin = valida(finIso)
  if (!inicio || !fin) return ''
  const mismoDia = fechaLocal(inicio) === fechaLocal(fin)
  return mismoDia
    ? `${fmtDia(inicio)} · ${fmtHora(inicioIso)} – ${fmtHora(finIso)}`
    : `${fmtDia(inicio)} · ${fmtHora(inicioIso)} – ${fmtDia(fin)} · ${fmtHora(finIso)}`
}

// Separador por día del historial: "Hoy", "Ayer" o "lunes, 3 de noviembre".
export function etiquetaDia(iso, ahora = new Date()) {
  const d = valida(iso)
  if (!d) return ''
  const hoy = fechaLocal(ahora)
  const ayer = new Date(ahora); ayer.setDate(ayer.getDate() - 1)
  if (fechaLocal(d) === hoy) return 'Hoy'
  if (fechaLocal(d) === fechaLocal(ayer)) return 'Ayer'
  return d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    ...(d.getFullYear() !== ahora.getFullYear() ? { year: 'numeric' } : {}),
  })
}

// Una superposición (r2 §1.3) en una línea. `tarea: null` = tarea que el
// usuario ya no ve: solo se informa el horario.
export function describirSuperposicion(s) {
  const donde = s.misma_tarea ? 'Esta tarea' : s.tarea?.titulo ? s.tarea.titulo : 'Una tarea a la que ya no tenés acceso'
  const horario = s.activo ? `${fmtHora(s.inicio)} – temporizador en curso` : rangoRegistro(s.inicio, s.fin)
  return `${donde} · ${horario} · ${formatoDuracion(s.solapamiento_segundos)} superpuestos`
}

// ── Indicador de temporizadores activos ─────────────────────────────────────
// GET /tareas/temporizadores-activos (r2 §2) → Map tarea_id → temporizador.
// Solo se aceptan los del tablero pedido y, si se conoce, del usuario de la
// sesión: nunca se muestra información de temporizadores ajenos.
export function indexarTemporizadores(respuesta, { tableroId, usuarioId } = {}) {
  const mapa = new Map()
  for (const t of Array.isArray(respuesta?.data) ? respuesta.data : []) {
    if (!t?.tarea_id || t.activo === false) continue
    if (tableroId && t.tablero_id !== tableroId) continue
    if (usuarioId && t.usuario_id !== usuarioId) continue
    mapa.set(t.tarea_id, { id: t.id, inicio: t.inicio, transcurrido_segundos: t.transcurrido_segundos, servidor_ahora: t.servidor_ahora })
  }
  return mapa
}
