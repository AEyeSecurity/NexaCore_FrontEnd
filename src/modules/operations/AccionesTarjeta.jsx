import { Edit2, History, MessageSquare, Timer, Trash2 } from 'lucide-react'
import { fechaLocal, fmtFechaHora, fmtHora } from './actualizaciones'

// Barra inferior de acciones de una tarjeta del Operativo (Kanban y historial de
// finalizadas). Mismas acciones y condiciones que antes: cada acción aparece
// solo si se recibe su handler (las finalizadas no pasan `onEliminar`).
//
// Medidas: botones de 36×36 px con íconos de 16 px; Actualizaciones lleva
// ícono + texto. En la columna de 280 px (248 px útiles) entran juntos sin
// quitarle espacio al título, que ahora ocupa todo el ancho del encabezado.
// Contraste: gris #6B7280 sobre blanco (≈4.8:1) y verde #0F6E56 sobre #E1F5EE.

const FOCO = 'outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-1'
const ICONO = `inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 transition-colors ${FOCO}`
  + ' disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500'

export default function AccionesTarjeta({ titulo, onActualizaciones, onHistorial, onEditar, onEliminar, editarLabel = 'Editar', disabled = false }) {
  const tarea = titulo ? `: ${titulo}` : ''
  return (
    <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
      {onActualizaciones && (
        <button type="button" onClick={() => onActualizaciones()} disabled={disabled}
          aria-label={`Abrir actualizaciones${tarea}`} title="Actualizaciones: comentarios y tiempo trabajado"
          className={`inline-flex items-center gap-1.5 h-9 px-2.5 min-w-0 rounded-lg text-[12.5px] font-semibold text-[#0F6E56] bg-[#E1F5EE] hover:bg-[#CBEDE0] active:bg-[#B7E4D3] transition-colors ${FOCO} disabled:opacity-40 disabled:cursor-not-allowed`}>
          <MessageSquare size={16} className="shrink-0" aria-hidden="true" />
          <span className="truncate">Actualizaciones</span>
        </button>
      )}
      <div className="flex items-center gap-0.5 shrink-0 ml-auto">
        {onHistorial && (
          <button type="button" onClick={() => onHistorial()} disabled={disabled}
            aria-label={`Ver historial de cambios${tarea}`} title="Historial de cambios"
            className={`${ICONO} hover:text-[#0F6E56] hover:bg-[#E1F5EE] active:bg-[#CBEDE0]`}>
            <History size={16} aria-hidden="true" />
          </button>
        )}
        {onEditar && (
          <button type="button" onClick={() => onEditar()} disabled={disabled}
            aria-label={`${editarLabel} tarea${tarea}`} title={editarLabel}
            className={`${ICONO} hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100`}>
            <Edit2 size={16} aria-hidden="true" />
          </button>
        )}
        {onEliminar && (
          <button type="button" onClick={() => onEliminar()} disabled={disabled}
            aria-label={`Eliminar tarea${tarea}`} title="Eliminar"
            className={`${ICONO} hover:text-red-600 hover:bg-red-50 active:bg-red-100`}>
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

// Indicador discreto de un temporizador propio en curso (GET
// temporizadores-activos). Es del usuario, no un estado de la tarea: por eso
// dice "Tu temporizador" y no usa los colores de prioridad/vencimiento.
export function IndicadorTemporizador({ temporizador, ahora = new Date() }) {
  if (!temporizador) return null
  const hoy = temporizador.inicio && fechaLocal(new Date(temporizador.inicio)) === fechaLocal(ahora)
  const desde = temporizador.inicio ? (hoy ? fmtHora(temporizador.inicio) : fmtFechaHora(temporizador.inicio)) : ''
  return (
    <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#0F6E56]"
      title="Tenés un temporizador en curso en esta tarea. Se detiene desde Actualizaciones.">
      <span className="relative flex w-2 h-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-60 animate-ping motion-reduce:animate-none" />
        <span className="relative inline-flex w-2 h-2 rounded-full bg-[#1D9E75]" />
      </span>
      <Timer size={12} className="shrink-0" aria-hidden="true" />
      <span>Tu temporizador en curso{desde && ` · desde ${desde}`}</span>
    </p>
  )
}
