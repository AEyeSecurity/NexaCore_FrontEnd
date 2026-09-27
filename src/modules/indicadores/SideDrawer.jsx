import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Panel lateral derecho montado en #app-main — mismo patrón visual que el
// asistente "Agregar mosaico" del Dashboard (overlay verde translúcido,
// cierre con Escape o clic afuera, scroll del contenido bloqueado).
export default function SideDrawer({ title, header, onClose, footer, children, width = 'sm:w-[520px]', ariaLabel }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    const main = document.getElementById('app-main')
    if (main) main.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (main) main.style.overflow = ''
    }
  }, [onClose])

  const root = document.getElementById('app-main')
  if (!root) return null

  return createPortal(
    <div className="absolute inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(10, 82, 64, 0.18)' }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        className={`relative bg-white shadow-2xl w-full ${width} max-w-[92vw] h-full flex flex-col fade-in`}
      >
        <div className="px-6 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <h2 className="font-serif text-[19px] font-semibold text-gray-900">{title}</h2>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar panel"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
          {header}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    root
  )
}
