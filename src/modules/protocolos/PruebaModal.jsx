import { useState } from 'react'
import { X, Save } from 'lucide-react'
import AppModal from '../../components/AppModal'
import { protocolosApi } from './protocolosApi'
import { ESTADOS_ITEM } from './constants'

const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

const OPT_STYLE = {
  ok:   { background: '#E1F5EE', color: '#0F6E56', borderColor: '#0F6E56' },
  fail: { background: '#FEE2E2', color: '#B91C1C', borderColor: '#B91C1C' },
  na:   { background: '#F3F4F6', color: '#374151', borderColor: '#9CA3AF' },
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function PruebaModal({ protocolo, onClose, onSaved }) {
  const items = protocolo.items ?? []
  const [fecha, setFecha] = useState(today())
  const [respuestas, setRespuestas] = useState({})
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const setRespuesta = (itemId, patch) =>
    setRespuestas(r => ({ ...r, [itemId]: { ...r[itemId], ...patch } }))

  const handleSubmit = async () => {
    const faltantes = items.filter(it => !respuestas[it.id]?.estado)
    if (faltantes.length > 0) {
      setError('Marcá una respuesta (Cumple / No cumple / N/A) para cada ítem.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resultados = items.map(it => ({
        item_id: it.id,
        texto: it.texto,
        estado: respuestas[it.id].estado,
      }))
      await protocolosApi.registrarPrueba(protocolo.id, {
        fecha,
        resultados,
        observaciones: observaciones.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal onClose={onClose} maxWidth="max-w-xl">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <h2 className="font-serif font-semibold text-gray-900 text-[16px]">Nueva prueba — {protocolo.nombre}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} style={inputStyle} />
        </div>

        <div className="space-y-3">
          {items.map((it, i) => {
            const r = respuestas[it.id] || {}
            return (
              <div key={it.id} className="border rounded-xl p-4" style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
                <p className="text-[13.5px] font-semibold text-gray-800 mb-2.5">{i + 1}. {it.texto}</p>
                <div className="flex gap-2">
                  {ESTADOS_ITEM.map(op => (
                    <button key={op.value} onClick={() => setRespuesta(it.id, { estado: op.value })}
                      className="flex-1 py-2 rounded-lg text-[12.5px] font-medium border transition-all"
                      style={r.estado === op.value ? OPT_STYLE[op.value] : { borderColor: 'rgba(15,110,86,0.2)', color: '#6b7280', background: 'white' }}>
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          {items.length === 0 && (
            <p className="text-[13px] text-gray-400">Este protocolo no tiene ítems configurados en su checklist.</p>
          )}
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Observaciones generales</label>
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
            rows={3} maxLength={300}
            placeholder="Agregar un comentario general de la prueba (opcional)"
            className={inputCls + ' resize-none'} style={inputStyle} />
          <p className="text-right text-[11px] text-gray-400 mt-1">{observaciones.length}/300</p>
        </div>

        {error && <div className="p-3 rounded-xl text-[13px] text-red-600 bg-red-50">{error}</div>}
      </div>

      <div className="flex-shrink-0 flex gap-2 px-6 py-4 border-t" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <button onClick={onClose}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={loading || items.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm transition-colors disabled:opacity-60"
          style={{ background: '#0F6E56' }}>
          <Save size={15} />
          {loading ? 'Guardando...' : 'Guardar prueba'}
        </button>
      </div>
    </AppModal>
  )
}
