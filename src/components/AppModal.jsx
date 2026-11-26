import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Modal unificado del área principal de la aplicación.
 * Se monta dentro de #app-main (excluyendo el sidebar) mediante createPortal.
 * El overlay cubre solo el área de contenido: topbar + módulo activo.
 * El sidebar queda siempre visible y nítido.
 */
// `closeOnBackdrop` (default true): permite desactivar el cierre con clic en el
// fondo en modales que hoy no lo admiten (ej. formularios del organigrama).
export default function AppModal({ onClose, children, maxWidth = 'max-w-lg', closeOnBackdrop = true }) {
  useEffect(() => {
    const main = document.getElementById('app-main')
    if (main) main.style.overflow = 'hidden'
    return () => { if (main) main.style.overflow = '' }
  }, [])

  const root = document.getElementById('app-main')
  if (!root) return null

  return createPortal(
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(10, 82, 64, 0.18)' }}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} flex flex-col fade-in overflow-hidden`}
        style={{ maxHeight: '90%' }}
      >
        {children}
      </div>
    </div>,
    root
  )
}
