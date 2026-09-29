import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../../lib/api'

// Parsear 'YYYY-MM-DD' como string evita que new Date() lo interprete como UTC
// y muestre el día anterior en zonas con offset negativo (ej: Argentina UTC-3)
function formatFecha(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

// hoyStr se calcula en cada llamada para que si la pestaña queda abierta
// de un día para otro los colores se actualicen sin necesidad de recargar
function proximoStyle(str) {
  if (!str) return {}
  const hoy = new Date()
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  if (str < hoyStr)   return { color: '#DC2626', fontWeight: 500 } // rojo — vencido
  if (str === hoyStr) return { color: '#D97706', fontWeight: 500 } // ámbar — hoy
  return {}
}

const COLS = [
  'Nombre', 'Teléfono', 'Pertenece a', 'Email',
  'Último contacto', 'Próximo contacto', 'Comentarios', '',
]

export default function ContactosTable({ onEdit, onDelete, refreshKey }) {
  const [search, setSearch]       = useState('')
  const [contactos, setContactos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    const t = setTimeout(() => {
      api.getContactos({ search: search || undefined, orden: 'proximo_contacto' })
        .then(res  => { if (!cancelado) { setContactos(res.data); setError(null) } })
        .catch(err => { if (!cancelado) setError(err.message) })
        .finally(() => { if (!cancelado) setLoading(false) })
    }, 300)
    return () => { cancelado = true; clearTimeout(t) }
  }, [search, refreshKey])

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, empresa o email…"
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-[13.5px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10"
          style={{ borderColor: 'rgba(15,110,86,0.25)' }}
        />
      </div>

      {/* Tabla */}
      <div
        className="bg-white rounded-xl border shadow-sm overflow-hidden"
        style={{ borderColor: 'rgba(15,110,86,0.1)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                {COLS.map(h => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400 text-[13px]">
                    Cargando…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-red-500 text-[13px]">
                    {error}
                  </td>
                </tr>
              ) : contactos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400 text-[13px]">
                    {search ? 'Sin resultados para esa búsqueda.' : 'No hay contactos registrados.'}
                  </td>
                </tr>
              ) : (
                contactos.map(c => (
                  <tr
                    key={c.id}
                    className="border-b hover:bg-gray-50/50 transition-colors"
                    style={{ borderColor: 'rgba(15,110,86,0.06)' }}
                  >
                    <td className="py-3.5 px-4 font-medium text-gray-900 whitespace-nowrap">
                      {c.nombre}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                      {c.telefono || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                      {c.empresa || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                      {c.email || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                      {formatFecha(c.ultimo_contacto)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap" style={proximoStyle(c.proximo_contacto)}>
                      {formatFecha(c.proximo_contacto)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 max-w-[160px]">
                      <span className="block truncate" title={c.notas || ''}>
                        {c.notas || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => onEdit(c)}
                          className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(c.id)}
                          className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
