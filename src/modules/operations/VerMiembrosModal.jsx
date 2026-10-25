import { createPortal } from 'react-dom'
import { X, Users } from 'lucide-react'

// Lista de solo lectura de los miembros de un tablero — para usuarios sin
// permiso de edición (Dirección/Superadmin usan "Editar tablero" en su lugar).
export default function VerMiembrosModal({ tablero, onClose }) {
  const miembros = tablero?.miembros ?? []

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm fade-in flex flex-col" style={{ maxHeight: '80vh' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Users size={15} style={{ color: '#0F6E56' }} className="shrink-0" />
              <h3 className="font-serif font-semibold text-gray-900 text-[16px]">Miembros del tablero</h3>
            </div>
            <p className="text-[11.5px] text-gray-400 mt-0.5 truncate">{tablero?.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {miembros.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-6">Este tablero todavía no tiene miembros.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: '#f0f1f0' }}>
              {miembros.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: '#0F6E56' }}>
                    {(m.nombre || '?').trim().slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">{m.nombre}</p>
                    {m.email && <p className="text-[11.5px] text-gray-400 truncate">{m.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <p className="text-[11.5px] text-gray-400 text-center">
            {miembros.length} {miembros.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>
      </div>
    </div>
  , document.body)
}
