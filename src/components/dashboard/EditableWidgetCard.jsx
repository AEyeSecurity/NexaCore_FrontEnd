import { Minus } from 'lucide-react'
import WidgetCard from './WidgetCard'
import { TILE_SIZE_OPTIONS } from './widgetSizes'

// Envoltorio de modo edición sobre WidgetCard: agrega el control para quitar
// el mosaico, el selector de tamaño (chico/mediano/grande) y los handlers de
// drag & drop nativos (HTML5), reordenando dentro de la grilla existente sin
// posicionamiento libre.
export default function EditableWidgetCard({
  widget, groupState, onRetry, onRemove,
  size, onSizeChange,
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
      className={`relative h-full rounded-2xl cursor-grab active:cursor-grabbing transition-all ${
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
      <div
        className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5 rounded-full shadow-md p-0.5"
        style={{ background: '#FFFFFF', border: '1px solid rgba(15,110,86,0.15)' }}
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
      >
        {TILE_SIZE_OPTIONS.map(opt => (
          <button
            key={opt.key}
            type="button"
            title={opt.title}
            aria-label={`Tamaño ${opt.title}`}
            onClick={() => onSizeChange(opt.key)}
            draggable={false}
            onDragStart={(e) => e.stopPropagation()}
            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
              size === opt.key ? 'text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
            style={size === opt.key ? { background: '#0F6E56' } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <WidgetCard widget={widget} groupState={groupState} onRetry={onRetry} />
    </div>
  )
}
