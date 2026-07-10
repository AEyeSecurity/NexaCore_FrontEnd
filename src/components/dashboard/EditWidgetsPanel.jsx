import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronUp, ChevronDown, X, AlertCircle } from 'lucide-react'
import { WIDGET_CATALOG, MODULE_META, isWidgetSelectable } from './widgetCatalog'

export default function EditWidgetsPanel({
  open, savedWidgets, allowedModules, userRole,
  saving, saveError, onCancel, onSave,
}) {
  const [draft, setDraft] = useState(savedWidgets)

  // Al abrir, partimos siempre de la configuración guardada (no de un
  // intento anterior sin guardar) — el panel edita una copia temporal.
  useEffect(() => {
    if (open) setDraft(savedWidgets)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKeyDown)
    const main = document.getElementById('app-main')
    if (main) main.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (main) main.style.overflow = ''
    }
  }, [open, onCancel])

  if (!open) return null
  const root = document.getElementById('app-main')
  if (!root) return null

  const toggleWidget = (id, checked) => {
    setDraft(prev => checked ? [...prev, id] : prev.filter(x => x !== id))
  }

  const moveWidget = (id, direction) => {
    setDraft(prev => {
      const i = prev.indexOf(id)
      const j = direction === 'up' ? i - 1 : i + 1
      if (i === -1 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const modulesToShow = Object.entries(MODULE_META).filter(([moduleId]) =>
    allowedModules?.includes(moduleId)
  )

  const draftWidgets = draft.map(id => WIDGET_CATALOG[id]).filter(Boolean)

  return createPortal(
    <div className="absolute inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(10, 82, 64, 0.18)' }}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar mosaicos"
        className="relative bg-white shadow-2xl w-full sm:w-[400px] max-w-[92vw] h-full flex flex-col fade-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div>
            <h2 className="font-serif text-[18px] font-semibold text-gray-900">Editar mosaicos</h2>
            <p className="text-[12.5px] text-gray-500 mt-1">
              Elegí qué mosaicos ver y en qué orden aparecen en tu panel.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cerrar panel"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {modulesToShow.length === 0 ? (
            <p className="text-[13px] text-gray-400">No tenés módulos habilitados con mosaicos disponibles.</p>
          ) : (
            modulesToShow.map(([moduleId, meta]) => {
              const widgets = Object.values(WIDGET_CATALOG).filter(
                w => w.module === moduleId && isWidgetSelectable(w.id, allowedModules, userRole)
              )
              if (widgets.length === 0) return null
              return (
                <div key={moduleId} className="mb-5 pb-5 border-b last:border-b-0" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                    <span className="text-[13px] font-semibold text-gray-700">{meta.label}</span>
                  </div>
                  {widgets.map(w => (
                    <label key={w.id} htmlFor={`widget-${w.id}`} className="flex items-center gap-2.5 py-1.5 text-[13.5px] text-gray-700 cursor-pointer">
                      <input
                        id={`widget-${w.id}`}
                        type="checkbox"
                        checked={draft.includes(w.id)}
                        onChange={(e) => toggleWidget(w.id, e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                        style={{ accentColor: '#1D9E75' }}
                      />
                      {w.title}
                    </label>
                  ))}
                </div>
              )
            })
          )}

          {/* Orden */}
          <div className="mt-2">
            <h3 className="text-[13px] font-semibold text-gray-700 mb-1">Orden en el tablero</h3>
            <p className="text-[11.5px] text-gray-400 mb-3">Usá las flechas para cambiar el orden de los mosaicos seleccionados.</p>
            {draftWidgets.length === 0 ? (
              <p className="text-[12px] text-gray-400 py-2">No hay mosaicos seleccionados todavía.</p>
            ) : (
              <div className="space-y-2">
                {draftWidgets.map((w, idx) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2.5 rounded-xl border px-3 py-2"
                    style={{ borderColor: 'rgba(15,110,86,0.12)', background: '#F8FAF9' }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: w.colors.accent }} />
                    <span className="flex-1 text-[12.5px] font-medium text-gray-700 truncate">{w.title}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveWidget(w.id, 'up')}
                        disabled={idx === 0}
                        aria-label={`Subir ${w.title}`}
                        className="w-6 h-6 rounded-md border flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors"
                        style={{ borderColor: 'rgba(15,110,86,0.15)' }}
                      >
                        <ChevronUp size={13} className="text-gray-500" />
                      </button>
                      <button
                        onClick={() => moveWidget(w.id, 'down')}
                        disabled={idx === draftWidgets.length - 1}
                        aria-label={`Bajar ${w.title}`}
                        className="w-6 h-6 rounded-md border flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors"
                        style={{ borderColor: 'rgba(15,110,86,0.15)' }}
                      >
                        <ChevronDown size={13} className="text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          {saveError && (
            <div className="flex items-start gap-1.5 text-[12px] text-red-600 mb-3">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ borderColor: 'rgba(15,110,86,0.15)' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(draft)}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: '#0F6E56' }}
            >
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    root
  )
}
