import { useState } from 'react'
import { Plus, X } from 'lucide-react'

// Barra de tabs dinámica para múltiples vistas de Dashboard.
// Props:
//   views        [{ id, name }]  — vistas creadas por el usuario
//   activeViewId  string | null   — null = Panel General
//   onTabChange   (id | null) => void
//   onCreate      () => void       — abre el modal de creación
//   onDelete      (id) => void     — ejecuta el DELETE tras confirmación inline
//   deleting      string | null   — id del view cuyo DELETE está en curso

const ACTIVE_STYLE   = { background: '#1B7A5E', color: '#fff' }
const INACTIVE_STYLE = { background: 'transparent', color: '#1B7A5E', border: '1px solid rgba(27,122,94,0.3)' }

export default function DashboardTabBar({ views, activeViewId, onTabChange, onCreate, onDelete, deleting }) {
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  const handleTabClick = (id) => {
    setPendingDeleteId(null)
    onTabChange(id)
  }

  const requestDelete = (e, id) => {
    e.stopPropagation()
    setPendingDeleteId(id)
  }

  const confirmDelete = (id) => {
    onDelete(id)
    setPendingDeleteId(null)
  }

  const cancelDelete = () => setPendingDeleteId(null)

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 min-w-0">

      {/* Tab fijo: Panel General (no eliminable) */}
      <button
        onClick={() => handleTabClick(null)}
        className="flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors whitespace-nowrap"
        style={activeViewId === null ? ACTIVE_STYLE : INACTIVE_STYLE}
      >
        Panel General
      </button>

      {/* Tabs de vistas del usuario */}
      {views.map(view => {
        const isActive        = activeViewId === view.id
        const isPendingDelete = pendingDeleteId === view.id
        const isDeleting      = deleting === view.id

        // Estado de confirmación inline: reemplaza el tab normal
        if (isPendingDelete) {
          return (
            <div
              key={view.id}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-medium whitespace-nowrap"
              style={{ border: '1px solid rgba(220,38,38,0.35)', background: 'rgba(254,242,242,1)', color: '#DC2626' }}
            >
              <span>¿Eliminar &ldquo;{view.nombre}&rdquo;?</span>
              <button
                onClick={() => confirmDelete(view.id)}
                className="font-semibold underline hover:no-underline"
              >
                Sí
              </button>
              <span className="opacity-40">·</span>
              <button onClick={cancelDelete} className="hover:underline">No</button>
            </div>
          )
        }

        // Tab normal con botón ×
        return (
          <div
            key={view.id}
            className="flex-shrink-0 flex items-center rounded-xl overflow-hidden"
            style={isActive ? ACTIVE_STYLE : INACTIVE_STYLE}
          >
            <button
              onClick={() => handleTabClick(view.id)}
              className="pl-3.5 pr-2 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors"
              style={{ color: 'inherit', background: 'transparent' }}
            >
              {view.nombre}
            </button>
            <button
              onClick={(e) => requestDelete(e, view.id)}
              disabled={isDeleting}
              title="Eliminar vista"
              className="pr-2.5 py-2 transition-colors disabled:opacity-40"
              style={{ color: isActive ? 'rgba(255,255,255,0.65)' : 'rgba(27,122,94,0.45)', background: 'transparent' }}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}

      {/* Botón crear nueva vista */}
      <button
        onClick={onCreate}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors whitespace-nowrap"
        style={{ background: 'transparent', color: '#1B7A5E', border: '1px dashed rgba(27,122,94,0.4)' }}
      >
        <Plus size={14} />
        Nueva vista
      </button>
    </div>
  )
}
