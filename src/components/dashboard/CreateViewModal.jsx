import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle } from 'lucide-react'

// Modal simple para crear una nueva vista de Dashboard.
// Se monta en document.body con position: fixed para estar sobre todo.
// Props:
//   open        boolean
//   creating    boolean   — muestra "Creando…" y deshabilita el botón
//   createError string|null
//   onConfirm   (name: string) => void
//   onCancel    () => void

export default function CreateViewModal({ open, creating, createError, onConfirm, onCancel }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  // Limpiar nombre y enfocar input al abrir
  useEffect(() => {
    if (!open) return
    setName('')
    const id = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [open])

  // Esc para cerrar, Enter para confirmar
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key === 'Enter' && name.trim() && !creating) handleConfirm()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, name, creating]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const trimmed = name.trim()
  const handleConfirm = () => { if (trimmed && !creating) onConfirm(trimmed) }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(10,82,64,0.18)' }}
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 fade-in">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-serif text-[18px] font-semibold text-gray-900">Nueva vista</h2>
            <p className="text-[12.5px] text-gray-500 mt-0.5">Nombrá tu panel personalizado.</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input */}
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Nombre
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 60))}
          placeholder="Ej: Operativo, Ventas, Proyectos…"
          className="w-full border rounded-xl px-3 py-2.5 text-[13.5px] text-gray-800 placeholder-gray-400 outline-none transition-colors"
          style={{
            borderColor: trimmed ? 'rgba(27,122,94,0.45)' : 'rgba(0,0,0,0.15)',
            boxShadow: trimmed ? '0 0 0 3px rgba(27,122,94,0.08)' : 'none',
          }}
        />
        <p className="text-[11.5px] text-gray-400 mt-1 text-right">{name.length}/60</p>

        {/* Error */}
        {createError && (
          <div className="flex items-start gap-1.5 text-[12px] text-red-600 mt-2">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{createError}</span>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2.5 mt-5">
          <button
            onClick={onCancel}
            disabled={creating}
            className="flex-1 px-4 py-2.5 rounded-xl border text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ borderColor: 'rgba(15,110,86,0.15)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!trimmed || creating}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: '#1B7A5E' }}
          >
            {creating ? 'Creando…' : 'Crear vista'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
