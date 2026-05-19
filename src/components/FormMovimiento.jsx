import { useState, useEffect } from 'react'
import { X, Save, Upload, Repeat, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import AppModal from './AppModal'
import { obtenerCotizacion } from '../lib/dolarService'

const CATEGORIAS = ['Tecnología', 'RRHH', 'Insumos', 'Servicios', 'Inversión', 'Otros', 'Suscripción']
const MAX_FILE_MB = 10
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']

const INICIAL = {
  fecha: new Date().toISOString().split('T')[0],
  descripcion: '',
  categoria: 'Servicios',
  tipo: 'Gasto',
  monto: '',
  proveedor_cliente: '',
  notas: '',
}

const inputCls = `
  w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors
  focus:ring-2
`.trim()

const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

export default function FormMovimiento({ tipo, movimiento, onClose, onSaved, categoriaInicial }) {
  const modoInversion = categoriaInicial === 'Inversión' && !movimiento
  const modoSalario   = movimiento?._source === 'salario'

  const [form, setForm] = useState(
    movimiento
      ? { ...movimiento }
      : { ...INICIAL, tipo: tipo || 'Gasto', categoria: categoriaInicial || INICIAL.categoria }
  )
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [archivo, setArchivo]         = useState(null)
  const [archivoError, setArchivoError] = useState(null)
  const [ocrData, setOcrData]         = useState(null)
  const [uploadingOCR, setUploadingOCR] = useState(false)

  // Suscripción integration (only when tipo=Gasto + categoria=Suscripción, on creation)
  const [suscOpcion, setSuscOpcion]         = useState('ninguna') // 'ninguna' | 'existente' | 'nueva'
  const [suscActivas, setSuscActivas]       = useState([])
  const [suscSelId, setSuscSelId]           = useState('')
  const [suscNueva, setSuscNueva]           = useState({ nombre: '', detalle: '', proveedor: '', monto: '', moneda: 'ARS', dia_vencimiento: '', frecuencia: 'mensual' })
  const [cotizandoSusc, setCotizandoSusc]   = useState(false)
  const [cotizErrorSusc, setCotizErrorSusc] = useState(null)

  const esSuscGasto = !movimiento && form.tipo === 'Gasto' && form.categoria === 'Suscripción'

  // Load active suscripciones when section activates
  useEffect(() => {
    if (esSuscGasto) {
      api.getSuscripciones({ estado: 'activa' })
        .then(res => setSuscActivas(res.data || []))
        .catch(() => setSuscActivas([]))
    } else {
      setSuscOpcion('ninguna')
    }
  }, [esSuscGasto])

  // Autofill form fields when an existing suscripción is selected
  useEffect(() => {
    if (suscOpcion !== 'existente' || !suscSelId) return
    const susc = suscActivas.find(s => s.id === suscSelId)
    if (!susc) return

    const autoDesc = susc.nombre + (susc.detalle ? ` — ${susc.detalle}` : '')

    if (susc.moneda === 'ARS') {
      setForm(f => ({
        ...f,
        descripcion:       autoDesc,
        proveedor_cliente: susc.proveedor || f.proveedor_cliente,
        monto:             String(susc.monto),
      }))
    } else {
      // USD → autofill text immediately, then convert monto via cotización
      setCotizandoSusc(true)
      setCotizErrorSusc(null)
      setForm(f => ({
        ...f,
        descripcion:       autoDesc,
        proveedor_cliente: susc.proveedor || f.proveedor_cliente,
      }))
      obtenerCotizacion()
        .then(cot => {
          const montoARS = Math.round(Number(susc.monto) * cot.valor)
          setForm(f => ({ ...f, monto: String(montoARS) }))
        })
        .catch(err => {
          setCotizErrorSusc(
            `No se pudo obtener la cotización del dólar para convertir el monto: ${err.message}`
          )
        })
        .finally(() => setCotizandoSusc(false))
    }
  }, [suscSelId, suscOpcion, suscActivas])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleArchivo = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setArchivoError(null)

    // Validación de tipo antes de subir
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setArchivoError('Formato inválido. Solo se permiten JPG, PNG o PDF.')
      e.target.value = ''
      return
    }

    // Validación de tamaño antes de subir
    if (file.size > MAX_FILE_BYTES) {
      setArchivoError(`El archivo supera el límite de ${MAX_FILE_MB} MB.`)
      e.target.value = ''
      return
    }

    setArchivo(file)
    setUploadingOCR(true)
    setOcrData(null)

    try {
      const fd = new FormData()
      fd.append('archivo', file)
      const res = await api.subirComprobante(fd)
      setOcrData({ comprobanteId: res.comprobante.id, ...res.ocr })
      if (res.ocr.fecha && !form.fecha) set('fecha', res.ocr.fecha)
      if (res.ocr.monto && !form.monto) set('monto', String(res.ocr.monto))
      if (res.ocr.proveedor && !form.proveedor_cliente) set('proveedor_cliente', res.ocr.proveedor)
    } catch (err) {
      console.error('OCR error:', err)
      setArchivoError('Error al procesar el comprobante. Podés completar los datos manualmente.')
    } finally {
      setUploadingOCR(false)
    }
  }

  const handleSubmit = async () => {
    // Validaciones frontend con trim
    if (!form.fecha) { setError('La fecha es obligatoria.'); return }
    if (!form.descripcion?.trim()) { setError('La descripción es obligatoria.'); return }
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0.'); return }
    if (!form.categoria) { setError('La categoría es obligatoria.'); return }
    if (!form.tipo) { setError('El tipo es obligatorio.'); return }

    setLoading(true)
    setError(null)

    // Trim de campos de texto antes de enviar
    const payload = {
      ...form,
      descripcion:       form.descripcion?.trim(),
      proveedor_cliente: form.proveedor_cliente?.trim() || '',
      notas:             form.notas?.trim() || '',
    }

    try {
      // If creating a Gasto-Suscripción and user wants to create a new suscripcion inline
      if (esSuscGasto && suscOpcion === 'nueva') {
        const diaNum = parseInt(suscNueva.dia_vencimiento)
        if (!suscNueva.nombre?.trim()) { setError('Ingresá el nombre de la suscripción.'); setLoading(false); return }
        if (!diaNum || diaNum < 1 || diaNum > 31) { setError('Día de vencimiento de la suscripción debe ser entre 1 y 31.'); setLoading(false); return }
        const nueva = await api.crearSuscripcion({ ...suscNueva, dia_vencimiento: diaNum })
        payload.suscripcion_id = nueva.id
      } else if (esSuscGasto && suscOpcion === 'existente' && suscSelId) {
        payload.suscripcion_id = suscSelId
      }

      let saved
      if (modoSalario) {
        saved = await api.editarMovimientoSalario(movimiento.id, {
          empleado_id:  movimiento.empleado_id,
          categoria_id: movimiento.categoria_id,
          fecha:        form.fecha,
          monto:        form.monto,
          descripcion:  form.descripcion?.trim(),
        })
      } else if (movimiento) {
        saved = await api.editarMovimiento(movimiento.id, payload)
      } else {
        saved = await api.crearMovimiento(payload)
        if (ocrData?.comprobanteId) await api.vincularComprobante(ocrData.comprobanteId, saved.id)
      }
      onSaved(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal onClose={onClose} maxWidth="max-w-lg">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <h2 className="font-serif font-semibold text-gray-900 text-[16px]">
          {movimiento ? 'Editar' : 'Nuevo'} {form.tipo}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {!movimiento && (
          modoInversion ? (
            <div className="p-1 bg-gray-100 rounded-xl">
              <div className="w-full py-2 rounded-lg text-[13px] font-medium text-center select-none"
                style={{ background: '#1D9E75', color: '#fff' }}>
                Ingreso
              </div>
            </div>
          ) : (
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              {['Ingreso', 'Gasto'].map(t => (
                <button key={t} onClick={() => set('tipo', t)}
                  className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={form.tipo === t
                    ? { background: t === 'Ingreso' ? '#1D9E75' : '#E24B4A', color: '#fff' }
                    : { color: '#6b7280' }}>
                  {t}
                </button>
              ))}
            </div>
          )
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Fecha *</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Monto *</label>
            <input type="number" value={form.monto} onChange={e => set('monto', e.target.value)}
              placeholder="0.00" min="0.01" step="0.01" className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Descripción *</label>
          <input type="text" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
            placeholder="Ej: Servidor AWS Marzo 2026" className={inputCls} style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Categoría *</label>
            {modoInversion || modoSalario ? (
              <div className={inputCls} style={{ ...inputStyle, background: '#f9fafb', color: '#6b7280', cursor: 'default' }}>
                {form.categoria}
              </div>
            ) : (
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
                className={inputCls} style={inputStyle}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">
              {modoSalario ? 'Empleado' : form.tipo === 'Ingreso' ? 'Cliente' : 'Proveedor'}
            </label>
            {modoSalario ? (
              <div className={inputCls} style={{ ...inputStyle, background: '#f9fafb', color: '#6b7280', cursor: 'default' }}>
                {form.proveedor_cliente}
              </div>
            ) : (
              <input type="text" value={form.proveedor_cliente}
                onChange={e => set('proveedor_cliente', e.target.value)}
                placeholder={form.tipo === 'Ingreso' ? 'Nombre cliente' : 'Nombre proveedor'}
                className={inputCls} style={inputStyle} />
            )}
          </div>
        </div>

        {/* Suscripción integration — solo al crear un Gasto con categoría Suscripción */}
        {esSuscGasto && (
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgba(15,110,86,0.2)', background: '#f8fdfb' }}>
            <div className="flex items-center gap-2 mb-1">
              <Repeat size={14} style={{ color: '#0F6E56' }} />
              <span className="text-[12.5px] font-semibold text-gray-700">¿Este gasto corresponde a una suscripción?</span>
            </div>
            <div className="flex gap-2">
              {[
                { val: 'ninguna',   label: 'No asociar' },
                { val: 'existente', label: 'Seleccionar existente' },
                { val: 'nueva',     label: 'Crear nueva' },
              ].map(({ val, label }) => (
                <button key={val} type="button" onClick={() => setSuscOpcion(val)}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-all"
                  style={suscOpcion === val
                    ? { background: '#0F6E56', color: '#fff', borderColor: 'transparent' }
                    : { borderColor: 'rgba(15,110,86,0.2)', color: '#6b7280', background: 'white' }
                  }>
                  {label}
                </button>
              ))}
            </div>

            {suscOpcion === 'existente' && (
              <div>
                <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Suscripción activa</label>
                <select value={suscSelId} onChange={e => setSuscSelId(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10 transition-colors"
                  style={{ borderColor: 'rgba(15,110,86,0.25)' }}>
                  <option value="">— Elegir suscripción —</option>
                  {suscActivas.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}{s.proveedor ? ` (${s.proveedor})` : ''} · {s.moneda} {Number(s.monto).toLocaleString('es-AR')}
                    </option>
                  ))}
                </select>
                {cotizandoSusc && (
                  <p className="flex items-center gap-1.5 text-[12px] text-gray-400 mt-1.5">
                    <RefreshCw size={12} className="animate-spin" />
                    Convirtiendo monto USD a ARS con la cotización vigente...
                  </p>
                )}
                {cotizErrorSusc && (
                  <p className="text-[12px] text-amber-600 mt-1.5">{cotizErrorSusc}</p>
                )}
                {suscActivas.length === 0 && (
                  <p className="text-[12px] text-gray-400 mt-1.5">No hay suscripciones activas registradas.</p>
                )}
              </div>
            )}

            {suscOpcion === 'nueva' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Nombre *</label>
                    <input type="text" value={suscNueva.nombre}
                      onChange={e => setSuscNueva(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ej: ChatGPT Plus"
                      className="w-full border rounded-xl px-3 py-2 text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
                      style={{ borderColor: 'rgba(15,110,86,0.25)' }} />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Proveedor</label>
                    <input type="text" value={suscNueva.proveedor}
                      onChange={e => setSuscNueva(f => ({ ...f, proveedor: e.target.value }))}
                      placeholder="Ej: OpenAI"
                      className="w-full border rounded-xl px-3 py-2 text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
                      style={{ borderColor: 'rgba(15,110,86,0.25)' }} />
                  </div>
                </div>
                <div>
                  <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Detalle</label>
                  <input type="text" value={suscNueva.detalle}
                    onChange={e => setSuscNueva(f => ({ ...f, detalle: e.target.value }))}
                    placeholder="Ej: Plan mensual con acceso a GPT-4"
                    className="w-full border rounded-xl px-3 py-2 text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
                    style={{ borderColor: 'rgba(15,110,86,0.25)' }} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Monto *</label>
                    <input type="number" value={suscNueva.monto} min="0" step="0.01"
                      onChange={e => setSuscNueva(f => ({ ...f, monto: e.target.value }))}
                      placeholder="0.00"
                      className="w-full border rounded-xl px-3 py-2 text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
                      style={{ borderColor: 'rgba(15,110,86,0.25)' }} />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Moneda</label>
                    <div className="flex gap-1.5 h-[38px]">
                      {['ARS', 'USD'].map(m => (
                        <button key={m} type="button" onClick={() => setSuscNueva(f => ({ ...f, moneda: m }))}
                          className="flex-1 rounded-lg text-[12px] font-medium border transition-all"
                          style={suscNueva.moneda === m
                            ? { background: '#0F6E56', color: '#fff', borderColor: 'transparent' }
                            : { borderColor: 'rgba(15,110,86,0.2)', color: '#6b7280', background: 'white' }
                          }>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Día vcto. *</label>
                    <input type="number" value={suscNueva.dia_vencimiento} min="1" max="31" step="1"
                      onChange={e => setSuscNueva(f => ({ ...f, dia_vencimiento: e.target.value }))}
                      placeholder="1–31"
                      className="w-full border rounded-xl px-3 py-2 text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
                      style={{ borderColor: 'rgba(15,110,86,0.25)' }} />
                  </div>
                </div>
                <div>
                  <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Frecuencia</label>
                  <select value={suscNueva.frecuencia}
                    onChange={e => setSuscNueva(f => ({ ...f, frecuencia: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-[13px] outline-none bg-white focus:ring-2 focus:ring-teal-700/10"
                    style={{ borderColor: 'rgba(15,110,86,0.25)' }}>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Notas</label>
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
            rows={2} placeholder="Notas adicionales..." className={inputCls + ' resize-none'} style={inputStyle} />
        </div>

        {!movimiento && (
          <div>
            <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Comprobante (opcional)</label>
            <label className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-[13px]"
              style={{
                borderColor: archivoError ? '#EF4444' : archivo ? '#1D9E75' : 'rgba(15,110,86,0.2)',
                color: archivoError ? '#EF4444' : archivo ? '#0F6E56' : '#9ca3af',
                background: archivo && !archivoError ? '#E1F5EE' : 'transparent',
              }}>
              <Upload size={15} />
              {uploadingOCR ? 'Procesando OCR...' : archivo ? archivo.name : 'Subir imagen o PDF (máx. 10 MB)'}
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleArchivo}
                className="hidden"
              />
            </label>
            {archivoError && (
              <p className="mt-1 text-[12px] text-red-500">{archivoError}</p>
            )}
            {ocrData?.estado === 'procesado' && (
              <div className="mt-2 p-3 rounded-xl text-[12px]" style={{ background: '#E1F5EE', color: '#0F6E56' }}>
                <p className="font-semibold mb-1">✓ OCR completado</p>
                {ocrData.fecha && <p>Fecha: {ocrData.fecha}</p>}
                {ocrData.monto && <p>Monto: ${ocrData.monto.toLocaleString('es-AR')}</p>}
                {ocrData.proveedor && <p>Emisor: {ocrData.proveedor}</p>}
              </div>
            )}
            {ocrData?.estado === 'error' && (
              <p className="mt-1 text-[12px] text-amber-600">No se pudo extraer datos. Completá manualmente.</p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl text-[13px] text-red-600 bg-red-50">{error}</div>
        )}
      </div>

      {/* Footer */}
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
          {loading ? 'Guardando...' : movimiento ? 'Guardar cambios' : 'Crear registro'}
        </button>
      </div>
    </AppModal>
  )
}
