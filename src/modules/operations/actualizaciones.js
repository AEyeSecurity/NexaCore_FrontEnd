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
export function mensajeActualizaciones(error) {
  return ({
    400: 'Revisá el comentario: debe contener entre 1 y 2000 caracteres.',
    401: 'Tu sesión venció. Volvé a iniciar sesión.',
    403: 'No tenés permiso para esta acción o ya no tenés acceso al tablero.',
    404: 'La tarea o el comentario ya no existe.',
    409: 'El temporizador o la tarea cambió. Estamos consultando el estado actual.',
  })[error?.status] || 'No se pudo conectar con el servidor. Intentá nuevamente.'
}
