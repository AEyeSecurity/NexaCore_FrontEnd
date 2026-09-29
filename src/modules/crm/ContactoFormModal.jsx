import { useState } from 'react'
import { X, Save } from 'lucide-react'
import AppModal from '../../components/AppModal'
import { api } from '../../lib/api'

const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

const empty = {
  nombre: '', telefono: '', empresa: '', email: '',
  ultimo_contacto: '', proximo_contacto: '',
  notas: '', tipo: 'Cliente', estado: 'Activo',
}

function toForm(c) {
  if (!c) return empty
  return {
    nombre:            c.nombre           ?? '',
    telefono:          c.telefono         ?? '',
    empresa:           c.empresa          ?? '',
    email:             c.email            ?? '',
    ultimo_contacto:   c.ultimo_contacto  ?? '',
    proximo_contacto:  c.proximo_contacto ?? '',
    notas:             c.notas            ?? '',
    tipo:              c.tipo             ?? 'Cliente',
    estado:            c.estado           ?? 'Activo',
  }
}

function toBody(f) {
  return {
    nombre:           f.nombre.trim(),
    telefono:         f.telefono.trim()   || null,
    empresa:          f.empresa.trim()    || null,
    email:            f.email.trim()      || null,
    ultimo_contacto:  f.ultimo_contacto   || null,
    proximo_contacto: f.proximo_contacto  || null,
    notas:            f.notas.trim()      || null,
    tipo:             f.tipo,
    estado:           f.estado,
  }
}

export default function ContactoFormModal({ contacto, onClose, onSaved }) {
  const isEdit = Boolean(contacto)
  const [form, setForm] = useState(() => toForm(contacto))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = toBody(form)
      if (isEdit) {
        await api.editarContacto(contacto.id, body)
      } else {
        await api.crearContacto(body)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal onClose={onClose} maxWidth="max-w-lg">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(15,110,86,0.1)' }}
      >
        <h2 className="font-serif font-semibold text-gray-900 text-[16px]">
          {isEdit ? 'Editar contacto' : 'Nuevo contacto'}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Nombre *</label>
          <input
            type="text"
            value={form.nombre}
            onChange={set('nombre')}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Teléfono</label>
          <input
            type="text"
            value={form.telefono}
            onChange={set('telefono')}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Pertenece a</label>
          <input
            type="text"
            value={form.empresa}
            onChange={set('empresa')}
            placeholder="Empresa u organización"
            className={inputCls}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Último contacto</label>
            <input
              type="date"
              value={form.ultimo_contacto}
              onChange={set('ultimo_contacto')}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Próximo contacto</label>
            <input
              type="date"
              value={form.proximo_contacto}
              onChange={set('proximo_contacto')}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Comentarios</label>
          <textarea
            value={form.notas}
            onChange={set('notas')}
            rows={3}
            className={inputCls + ' resize-none'}
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Tipo</label>
            <select value={form.tipo} onChange={set('tipo')} className={inputCls} style={inputStyle}>
              <option value="Cliente">Cliente</option>
              <option value="Prospecto">Prospecto</option>
              <option value="Proveedor">Proveedor</option>
              <option value="Socio">Socio</option>
            </select>
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Estado</label>
            <select value={form.estado} onChange={set('estado')} className={inputCls} style={inputStyle}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="En negociación">En negociación</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-[13px] text-red-600 bg-red-50">{error}</div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 flex gap-2 px-6 py-4 border-t"
        style={{ borderColor: 'rgba(15,110,86,0.1)' }}
      >
        <button
          onClick={onClose}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'rgba(15,110,86,0.2)' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm transition-colors disabled:opacity-60"
          style={{ background: '#0F6E56' }}
        >
          <Save size={15} />
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear contacto'}
        </button>
      </div>
    </AppModal>
  )
}
