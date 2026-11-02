import { useMemo, useState } from 'react'
import { Search, RefreshCw } from 'lucide-react'

const inputCls = [
  'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none',
  'bg-white transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10',
].join(' ')
const border = { borderColor: 'rgba(15,110,86,0.25)' }

// Lista de usuarios con búsqueda (nombre o email). La usan TableroModal (miembros
// del tablero) y VerMiembrosModal (agregar integrantes / designar administrador).
// `multiple`: checkboxes; si no, radio (un solo usuario). `bloqueados`: ids que
// se muestran pero no se pueden cambiar, con `etiqueta(u)` como aclaración.
export default function UsuariosSelector({
  usuarios, loading, seleccionados, onToggle, multiple = true,
  bloqueados = [], etiqueta, vacio = 'Sin resultados.', maxHeight = 180,
}) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter(u => u.nombre?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  }, [usuarios, busqueda])

  return (
    <>
      <div className="relative mb-2">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar persona..." className={inputCls + ' pl-8 py-2 text-[13px]'} style={border} />
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-[13px] py-3">
          <RefreshCw size={12} className="animate-spin" /> Cargando usuarios…
        </div>
      ) : (
        <div className="border rounded-xl overflow-y-auto divide-y" style={{ borderColor: 'rgba(15,110,86,0.15)', maxHeight }}>
          {filtrados.map(u => {
            const bloqueado = bloqueados.includes(u.id)
            const extra = etiqueta?.(u)
            return (
              <label key={u.id}
                className={`flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 ${bloqueado ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                <input type={multiple ? 'checkbox' : 'radio'} checked={seleccionados.includes(u.id)}
                  onChange={() => onToggle(u.id)} disabled={bloqueado}
                  className="w-4 h-4 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed" style={{ accentColor: '#0F6E56' }} />
                <span className="truncate">{u.nombre}</span>
                {u.estado && u.estado !== 'Activo' && <span className="text-gray-400 flex-shrink-0">(inactivo)</span>}
                {extra && <span className="ml-auto text-[11px] text-gray-400 flex-shrink-0">{extra}</span>}
              </label>
            )
          })}
          {filtrados.length === 0 && (
            <p className="text-[12.5px] text-gray-400 px-3 py-3">{busqueda.trim() ? 'Sin resultados.' : vacio}</p>
          )}
        </div>
      )}
    </>
  )
}
