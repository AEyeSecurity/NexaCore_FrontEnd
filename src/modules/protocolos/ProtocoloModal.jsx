import { useState } from 'react'
import { X, Save } from 'lucide-react'
import AppModal from '../../components/AppModal'
import { protocolosApi } from './protocolosApi'
import { CATEGORIAS } from './constants'

const ACCESOS = ['Todo el equipo', 'Técnicos de campo', 'Ingeniería', 'RR.HH.', 'Solo administradores']

const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

function itemsToText(items) {
  return (items || []).map(i => i.texto).join('\n')
}

function textToItems(text) {
  return text.split('\n').map(s => s.trim()).filter(Boolean).map((texto, orden) => ({ texto, orden }))
}

export default function ProtocoloModal({ protocolo, onClose, onSaved }) {
  const isEdit = Boolean(protocolo)
  const [nombre, setNombre] = useState(protocolo?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(protocolo?.descripcion ?? '')
  const [categoria, setCategoria] = useState(protocolo?.categoria ?? CATEGORIAS[0].value)
  const [acceso, setAcceso] = useState(protocolo?.acceso ?? ACCESOS[0])
  const [itemsText, setItemsText] = useState(itemsToText(protocolo?.items))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError('El nombre del protocolo es obligatorio.')
      return
    }
    const items = textToItems(itemsText)
    if (items.length === 0) {
      setError('Agregá al menos un ítem al checklist.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const body = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, categoria, acceso }
      if (isEdit) {
        await protocolosApi.editar(protocolo.id, body)
        await protocolosApi.guardarItems(protocolo.id, items)
      } else {
        await protocolosApi.crear({ ...body, items })
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal onClose={onClose} maxWidth="max-w-lg">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <h2 className="font-serif font-semibold text-gray-900 text-[16px]">
          {isEdit ? 'Editar protocolo' : 'Nuevo protocolo'}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Nombre del protocolo *</label>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Protocolo de instalación de cámaras" className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Descripción</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
            rows={2} placeholder="¿Para qué sirve este protocolo?" className={inputCls + ' resize-none'} style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Categoría</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls} style={inputStyle}>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Acceso</label>
            <select value={acceso} onChange={e => setAcceso(e.target.value)} className={inputCls} style={inputStyle}>
              {ACCESOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Ítems del checklist (uno por línea) *</label>
          <textarea value={itemsText} onChange={e => setItemsText(e.target.value)}
            rows={6} placeholder={'Verificar carga de batería\nCalibrar sensores\nRegistrar tiempo de respuesta'}
            className={inputCls + ' resize-none'} style={inputStyle} />
          {isEdit && (
            <p className="text-[11.5px] text-gray-400 mt-1.5">
              Al guardar, este checklist reemplaza al anterior y aplicará a las próximas pruebas.
            </p>
          )}
        </div>
        {error && <div className="p-3 rounded-xl text-[13px] text-red-600 bg-red-50">{error}</div>}
      </div>

      <div className="flex-shrink-0 flex gap-2 px-6 py-4 border-t" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <button onClick={onClose}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm transition-colors disabled:opacity-60"
          style={{ background: '#0F6E56' }}>
          <Save size={15} />
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear protocolo'}
        </button>
      </div>
    </AppModal>
  )
}
