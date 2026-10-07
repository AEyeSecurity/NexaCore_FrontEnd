import { useState } from 'react'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import AppModal from '../../components/AppModal'
import { protocolosApi } from './protocolosApi'
import { ESTADOS_ITEM } from './constants'
import { hoyISO } from './fechas'

const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

const OPT_STYLE = {
  ok:   { background: '#E1F5EE', color: '#0F6E56', borderColor: '#0F6E56' },
  fail: { background: '#FEE2E2', color: '#B91C1C', borderColor: '#B91C1C' },
  na:   { background: '#F3F4F6', color: '#374151', borderColor: '#9CA3AF' },
}

let actionItemSeq = 0
const nuevoActionItem = (texto = '') => ({ key: ++actionItemSeq, texto })

// En edición el checklist sale de los resultados guardados del registro (no del
// checklist actual del protocolo, que pudo cambiar después de cargarlo).
function filasChecklist(protocolo, prueba) {
  if (prueba) {
    return (Array.isArray(prueba.resultados) ? prueba.resultados : [])
      .map((r, i) => ({ key: r.item_id ?? `r${i}`, item_id: r.item_id, texto: r.texto }))
  }
  return (protocolo.items ?? []).map(it => ({ key: it.id, item_id: it.id, texto: it.texto }))
}

function respuestasIniciales(prueba) {
  if (!prueba) return {}
  return Object.fromEntries((Array.isArray(prueba.resultados) ? prueba.resultados : [])
    .map((r, i) => [r.item_id ?? `r${i}`, { estado: r.estado, tildado: !!r.tildado }]))
}

/** Alta (sin `prueba`) o edición (con `prueba`) de un registro del protocolo. */
export default function PruebaModal({ protocolo, prueba, onClose, onSaved, onNotFound }) {
  const isEdit = Boolean(prueba)
  const [items] = useState(() => filasChecklist(protocolo, prueba))
  const [fecha, setFecha] = useState(prueba?.fecha ? String(prueba.fecha).slice(0, 10) : hoyISO())
  const [respuestas, setRespuestas] = useState(() => respuestasIniciales(prueba))
  const [resultadoTexto, setResultadoTexto] = useState(prueba?.resultado_texto ?? '')
  const [observaciones, setObservaciones] = useState(prueba?.observaciones ?? '')
  const [actionItems, setActionItems] = useState(() =>
    (Array.isArray(prueba?.action_items) ? prueba.action_items : []).map(a => nuevoActionItem(a.texto ?? '')))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const setRespuesta = (key, patch) =>
    setRespuestas(r => ({ ...r, [key]: { ...r[key], ...patch } }))

  const agregarActionItem = () => setActionItems(a => [...a, nuevoActionItem()])
  const editarActionItem = (key, texto) => setActionItems(a => a.map(x => x.key === key ? { ...x, texto } : x))
  const quitarActionItem = (key) => setActionItems(a => a.filter(x => x.key !== key))

  const handleSubmit = async () => {
    const faltantes = items.filter(it => !respuestas[it.key]?.estado)
    if (faltantes.length > 0) {
      setError('Marcá una respuesta (Cumple / No cumple / N/A) para cada ítem.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resultados = items.map(it => ({
        item_id: it.item_id,
        texto: it.texto,
        estado: respuestas[it.key].estado,
        tildado: !!respuestas[it.key]?.tildado,
      }))
      const action_items = actionItems
        .map(a => a.texto.trim())
        .filter(Boolean)
        .map(texto => ({ texto }))
      // En edición se mandan siempre las listas completas (el backend las reemplaza)
      // y null en los textos vaciados para que se borren.
      if (isEdit) {
        await protocolosApi.editarRegistro(protocolo.id, prueba.id, {
          fecha,
          resultados,
          resultado_texto: resultadoTexto.trim() || null,
          observaciones: observaciones.trim() || null,
          action_items,
        })
      } else {
        await protocolosApi.crearRegistro(protocolo.id, {
          fecha,
          resultados,
          resultado_texto: resultadoTexto.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
          action_items,
        })
      }
      onSaved()
    } catch (err) {
      if (isEdit && err.status === 404) {
        onNotFound?.()
        return
      }
      const esErrorDeRed = err instanceof TypeError || err.message === 'Failed to fetch'
      setError(
        esErrorDeRed
          ? 'No se pudo conectar con el servidor. Verificá que el backend esté activo.'
          : (err.message || 'Error al guardar el registro.')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal onClose={onClose} maxWidth="max-w-xl">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <h2 className="font-serif font-semibold text-gray-900 text-[16px]">
          {isEdit ? 'Editar registro' : 'Nuevo registro'} — {protocolo.nombre}
        </h2>
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
            const r = respuestas[it.key] || {}
            return (
              <div key={it.key} className="border rounded-xl p-4" style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
                <p className="text-[13.5px] font-semibold text-gray-800 mb-2.5">{i + 1}. {it.texto}</p>
                <div className="flex gap-2">
                  {ESTADOS_ITEM.map(op => (
                    <button key={op.value} onClick={() => setRespuesta(it.key, { estado: op.value })}
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

        {items.length > 0 && (
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 block">Acciones realizadas</label>
            <p className="text-[11.5px] text-gray-400 mb-2">
              {items.filter(it => respuestas[it.key]?.tildado).length} de {items.length} tildadas
            </p>
            <div className="border rounded-xl divide-y" style={{ borderColor: 'rgba(15,110,86,0.15)' }}>
              {items.map(it => {
                const tildado = !!respuestas[it.key]?.tildado
                return (
                  <label key={it.key} className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={tildado}
                      onChange={e => setRespuesta(it.key, { tildado: e.target.checked })}
                      className="w-4 h-4 flex-shrink-0 cursor-pointer" style={{ accentColor: '#0F6E56' }} />
                    <span className={tildado ? 'text-gray-500 line-through' : ''}>{it.texto}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Resultados</label>
          <textarea value={resultadoTexto} onChange={e => setResultadoTexto(e.target.value)}
            rows={3} maxLength={800}
            placeholder="Escribir el resultado general del registro"
            className={inputCls + ' resize-none'} style={inputStyle} />
          <p className="text-right text-[11px] text-gray-400 mt-1">{resultadoTexto.length}/800</p>
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 block">Action Items</label>
          <p className="text-[11.5px] text-gray-400 mb-2">Acciones a realizar que surgieron de este registro (opcional)</p>
          {actionItems.length > 0 && (
            <div className="space-y-2 mb-2">
              {actionItems.map(a => (
                <div key={a.key} className="flex items-center gap-2">
                  <input type="text" value={a.texto} onChange={e => editarActionItem(a.key, e.target.value)}
                    placeholder="Ej: Revisar sensor delantero" className={inputCls} style={inputStyle} />
                  <button type="button" onClick={() => quitarActionItem(a.key)}
                    title="Quitar action item" aria-label="Quitar action item"
                    className="flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-xl border text-gray-400 bg-white hover:bg-red-50 hover:text-red-600 transition-colors"
                    style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={agregarActionItem}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: '#0F6E56' }}>
            <Plus size={14} /> Agregar action item
          </button>
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Observaciones generales</label>
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
            rows={3} maxLength={800}
            placeholder="Agregar un comentario general del registro (opcional)"
            className={inputCls + ' resize-none'} style={inputStyle} />
          <p className="text-right text-[11px] text-gray-400 mt-1">{observaciones.length}/800</p>
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
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar registro'}
        </button>
      </div>
    </AppModal>
  )
}
