import { Minus } from 'lucide-react'
import WidgetCard from './WidgetCard'

// Envoltorio de modo edición sobre WidgetCard: agrega el control para quitar
// el mosaico y los handlers de drag & drop nativos (HTML5), reordenando
// dentro de la grilla existente sin posicionamiento libre.
export default function EditableWidgetCard({
  widget, groupState, onRetry, onRemove,
  isDragging, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative rounded-2xl cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-40' : ''
      } ${isDragOver ? 'ring-2 ring-offset-2' : ''}`}
      style={isDragOver ? { '--tw-ring-color': '#0F6E56' } : undefined}
    >
      <button
        type="button"
        onClick={onRemove}
        onDragStart={(e) => e.stopPropagation()}
        draggable={false}
        aria-label={`Quitar ${widget.title}`}
        title="Quitar mosaico"
        className="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform cursor-pointer"
        style={{ background: '#DC2626' }}
      >
        <Minus size={14} strokeWidth={3} />
      </button>
      <WidgetCard widget={widget} groupState={groupState} onRetry={onRetry} />
    </div>
  )
}
