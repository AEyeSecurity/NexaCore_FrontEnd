import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Eye, RefreshCw, FileText, Image, Plus, Save, X } from 'lucide-react'
import { api } from '../lib/api'

const CATEGORIAS = ['Tecnología', 'RRHH', 'Insumos', 'Servicios', 'Inversión', 'Otros']

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function RegistrarMovimientoPanel({ comprobante, onGuardado, onCancelar }) {
  const [form, setForm] = useState({
    tipo: 'Gasto',
    fecha: comprobante.ocr_fecha || new Date().toISOString().split('T')[0],
    monto: comprobante.ocr_monto ? String(comprobante.ocr_monto) : '',
    descripcion: comprobante.ocr_proveedor ? `Compra — ${comprobante.ocr_proveedor}` : '',
    categoria: 'Insumos',
    proveedor_cliente: comprobante.ocr_proveedor || '',
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleGuardar = async () => {
    if (!form.fecha || !form.descripcion || !form.monto) {
      setError('Completá fecha, descripción y monto.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const movimiento = await api.crearMovimiento(form)
      await api.vincularComprobante(comprobante.id, movimiento.id)
      onGuardado()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-sm">Registrar movimiento</h3>
        <button onClick={onCancelar} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X size={16} />
        </button>
      </div>

      {(comprobante.ocr_fecha || comprobante.ocr_monto || comprobante.ocr_proveedor) && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
          <p className="font-medium mb-1">✓ Datos extraídos por OCR — revisá y ajustá si es necesario</p>
          {comprobante.ocr_fecha && <p>Fecha detectada: {comprobante.ocr_fecha}</p>}
          {comprobante.ocr_monto && <p>Monto detectado: {fmt(comprobante.ocr_monto)}</p>}
          {comprobante.ocr_proveedor && <p>Proveedor: {comprobante.ocr_proveedor}</p>}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {['Ingreso', 'Gasto'].map(t => (
          <button
            key={t}
            onClick={() => set('tipo', t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
              form.tipo === t
                ? t === 'Ingreso'
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-red-50 border-red-300 text-red-600'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fecha *</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
              className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Monto *</label>
            <input type="number" value={form.monto} onChange={e => set('monto', e.target.value)}
              placeholder="0.00" className="input-field text-xs" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Descripción *</label>
          <input type="text" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
            placeholder="Ej: Compra cables Mercado Libre" className="input-field text-xs" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
              className="input-field text-xs">
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {form.tipo === 'Ingreso' ? 'Cliente' : 'Proveedor'}
            </label>
            <input type="text" value={form.proveedor_cliente}
              onChange={e => set('proveedor_cliente', e.target.value)}
              placeholder="Nombre" className="input-field text-xs" />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onCancelar} className="btn-secondary flex-1 justify-center text-xs py-1.5">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading}
            className="btn-primary flex-1 justify-center text-xs py-1.5">
            <Save size={13} />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetallePanel({ comprobante, onRegistrar, onEliminar }) {
  const tieneMovimiento = !!comprobante.movimientos
  const vencido = !comprobante.url_archivo

  const estadoBadge = (estado) => {
    if (estado === 'procesado') return <span className="badge-ocr">✓ OCR</span>
    if (estado === 'error') return <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Error OCR</span>
    return <span className="badge-pendiente">Pendiente</span>
  }

  return (
    <div className="animate-fadeIn">
      <h3 className="font-semibold text-gray-900 mb-4 text-sm">Detalle del comprobante</h3>

      {vencido ? (
        <div className="flex flex-col items-center justify-center h-44 bg-gray-50 rounded-lg mb-4 border border-gray-200 text-gray-400">
          <FileText size={28} className="mb-2 opacity-30" />
          <p className="text-xs font-medium text-gray-500">Comprobante vencido</p>
          <p className="text-[11px] text-gray-400 mt-1 text-center px-4">El archivo fue eliminado tras 6 meses. Solo se conserva el registro contable.</p>
        </div>
      ) : comprobante.tipo_archivo !== 'application/pdf' ? (
        <img src={comprobante.url_archivo} alt="Comprobante"
          className="w-full h-44 object-cover rounded-lg mb-4 border border-gray-100" />
      ) : (
        <a href={comprobante.url_archivo} target="_blank" rel="noreferrer"
          className="flex items-center justify-center h-44 bg-red-50 rounded-lg mb-4 border border-red-100 text-red-600 hover:bg-red-100 transition-colors">
          <div className="text-center">
            <FileText size={28} className="mx-auto mb-1" />
            <p className="text-xs font-medium">Abrir PDF</p>
          </div>
        </a>
      )}

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-xs">Estado OCR</span>
          {estadoBadge(comprobante.ocr_estado)}
        </div>
        {comprobante.ocr_fecha && (
          <div className="flex justify-between">
            <span className="text-gray-500 text-xs">Fecha extraída</span>
            <span className="text-xs font-medium">{comprobante.ocr_fecha}</span>
          </div>
        )}
        {comprobante.ocr_monto && (
          <div className="flex justify-between">
            <span className="text-gray-500 text-xs">Monto extraído</span>
            <span className="text-xs font-medium">{fmt(comprobante.ocr_monto)}</span>
          </div>
        )}
        {comprobante.ocr_proveedor && (
          <div className="flex justify-between">
            <span className="text-gray-500 text-xs">Proveedor</span>
            <span className="text-xs font-medium truncate max-w-[130px] text-right">{comprobante.ocr_proveedor}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <span className="text-gray-500 text-xs">Movimiento</span>
          {tieneMovimiento ? (
            <div className="text-right">
              <span className={`text-xs font-medium ${comprobante.movimientos.tipo === 'Ingreso' ? 'text-green-700' : 'text-red-600'}`}>
                {comprobante.movimientos.tipo}
              </span>
              <p className="text-xs text-gray-500 truncate max-w-[130px]">{comprobante.movimientos.descripcion}</p>
            </div>
          ) : (
            <span className="text-xs text-amber-600 font-medium">Sin registrar</span>
          )}
        </div>
      </div>

      {comprobante.ocr_texto && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Texto extraído (OCR)</p>
          <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600 max-h-24 overflow-y-auto font-mono leading-relaxed">
            {comprobante.ocr_texto}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!tieneMovimiento && !vencido && (
          <button onClick={onRegistrar} className="btn-primary w-full justify-center">
            <Plus size={15} /> Registrar como ingreso / gasto
          </button>
        )}
        <div className="flex gap-2">
          {!vencido && (
            <a href={comprobante.url_archivo} target="_blank" rel="noreferrer"
              className="btn-secondary flex-1 justify-center text-xs">
              <Eye size={13} /> Ver archivo
            </a>
          )}
          <button onClick={onEliminar} className={`btn-danger justify-center text-xs ${vencido ? 'w-full' : 'flex-1'}`}>
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Comprobantes() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [registrando, setRegistrando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const fileRef = useRef()

  const cargar = async () => {
    setLoading(true)
    try {
      const comp = await api.getComprobantes()
      setItems(comp.data)
      if (selected) {
        const actualizado = comp.data.find(c => c.id === selected.id)
        setSelected(actualizado || null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('archivo', file)
      const res = await api.subirComprobante(fd)
      await cargar()
      setSelected(res.comprobante)
      setRegistrando(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  const handleDelete = async (c) => {
    try {
      await api.eliminarComprobante(c.id)
      setConfirmDelete(null)
      if (selected?.id === c.id) { setSelected(null); setRegistrando(false) }
      cargar()
    } catch (err) {
      alert(err.message)
    }
  }

  const estadoBadge = (estado) => {
    if (estado === 'procesado') return <span className="badge-ocr">✓ OCR</span>
    if (estado === 'error') return <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Error</span>
    return <span className="badge-pendiente">Pendiente</span>
  }

  return (
    <div className="animate-fadeIn">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,application/pdf"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Comprobantes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {items.length} archivos · Subí un comprobante y registralo como ingreso o gasto
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Cargando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Archivo', 'OCR', 'Movimiento', 'Fecha', ''].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => { setSelected(c); setRegistrando(false) }}
                      className={`border-b border-gray-50 cursor-pointer transition-colors group ${
                        selected?.id === c.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {c.url_archivo ? (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              c.tipo_archivo === 'application/pdf' ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                              {c.tipo_archivo === 'application/pdf'
                                ? <FileText size={14} className="text-red-600" />
                                : <Image size={14} className="text-blue-600" />}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                              <FileText size={14} className="text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900 truncate max-w-[130px] text-xs block">{c.nombre_archivo}</span>
                            {!c.url_archivo && (
                              <span className="text-[10px] text-amber-600 font-medium">Vencido</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{estadoBadge(c.ocr_estado)}</td>
                      <td className="py-3 px-4 text-xs">
                        {c.movimientos ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-medium ${c.movimientos.tipo === 'Ingreso' ? 'text-green-700' : 'text-red-600'}`}>
                              {c.movimientos.tipo}
                            </span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-600 truncate max-w-[80px]">{c.movimientos.descripcion}</span>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(c); setRegistrando(true) }}
                            className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 text-xs"
                          >
                            <Plus size={11} /> Registrar
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDelete(c) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <button
                          onClick={() => fileRef.current.click()}
                          disabled={uploading}
                          className="w-full py-16 text-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors group"
                        >
                          <Upload size={32} className="mx-auto mb-2 opacity-20 group-hover:opacity-60 transition-opacity" />
                          <p className="text-sm font-medium">No hay comprobantes aún</p>
                          <p className="text-xs mt-1">Hacé clic aquí o usá el botón de arriba para subir una foto o PDF</p>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => fileRef.current.click()}
            disabled={uploading}
            className={`card flex flex-col items-center justify-center gap-3 py-6 w-full border-2 border-dashed transition-all group ${
              uploading
                ? 'border-gray-200 opacity-60 cursor-not-allowed'
                : 'border-primary-300 hover:border-primary-500 hover:bg-primary-50 cursor-pointer'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              uploading ? 'bg-gray-100' : 'bg-primary-100 group-hover:bg-primary-200'
            }`}>
              {uploading
                ? <RefreshCw size={22} className="animate-spin text-primary-500" />
                : <Upload size={22} className="text-primary-600" />
              }
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">
                {uploading ? 'Procesando OCR...' : 'Subir comprobante'}
              </p>
              {!uploading && <p className="text-xs text-gray-400 mt-0.5">JPG, PNG o PDF</p>}
            </div>
          </button>

          <div className="card p-5">
          {selected && registrando ? (
            <RegistrarMovimientoPanel
              comprobante={selected}
              onGuardado={() => { setRegistrando(false); cargar() }}
              onCancelar={() => setRegistrando(false)}
            />
          ) : selected ? (
            <DetallePanel
              comprobante={selected}
              onRegistrar={() => setRegistrando(true)}
              onEliminar={() => setConfirmDelete(selected)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <FileText size={36} className="mb-3 opacity-20" />
              <p className="text-sm text-center leading-relaxed">
                Seleccioná un comprobante para ver el detalle o subí uno nuevo para registrarlo
              </p>
            </div>
          )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full animate-fadeIn">
            <h3 className="font-semibold text-gray-900 mb-2">¿Eliminar comprobante?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Se eliminará "<span className="font-medium">{confirmDelete.nombre_archivo}</span>". El movimiento vinculado no se elimina.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
