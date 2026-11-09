// Navegación directa a una tarea del Operativo (desde una notificación):
// módulo → tablero → tarea → panel de Actualizaciones → comentario. Usa el
// patrón existente App.navigate(page, opts); no hay rutas nuevas.
// Sin React: se prueba con node --test.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// opts de navigate('operations', opts) → destino normalizado o null.
export function normalizarDestinoTarea(opts) {
  if (!opts || !UUID.test(opts.tablero_id ?? '') || !UUID.test(opts.tarea_id ?? '')) return null
  return {
    tablero_id: opts.tablero_id,
    tarea_id: opts.tarea_id,
    comentario_id: UUID.test(opts.comentario_id ?? '') ? opts.comentario_id : null,
    aviso: typeof opts.aviso === 'string' && opts.aviso ? opts.aviso : null,
  }
}

// Próximo paso para atender un destino pendiente:
//   'esperar'             → los tableros todavía cargan
//   'sin_tablero'         → el tablero no está entre los visibles (sin acceso o eliminado)
//   'seleccionar_tablero' → hay que activar el tablero del destino
//   'buscar_tarea'        → el tablero activo es el del destino
export function pasoDestino(destino, { tableros, tablerosCargando, tableroActivoId }) {
  if (tablerosCargando) return 'esperar'
  if (!(tableros ?? []).some(t => t.id === destino.tablero_id)) return 'sin_tablero'
  return tableroActivoId === destino.tablero_id ? 'buscar_tarea' : 'seleccionar_tablero'
}

export const MENSAJES_DESTINO = {
  sin_tablero: 'No tenés acceso al tablero de esa tarea o ya no existe.',
  sin_tarea: 'La tarea ya no existe o no tenés acceso a ella.',
  sin_acceso: 'Ya no tenés acceso a esa tarea.',
  error: 'No se pudo abrir la tarea. Intentá nuevamente.',
}

export function mensajeErrorDestino(error) {
  if (error?.status === 403) return MENSAJES_DESTINO.sin_acceso
  if (error?.status === 404) return MENSAJES_DESTINO.sin_tarea
  return MENSAJES_DESTINO.error
}
