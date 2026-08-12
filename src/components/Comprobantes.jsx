import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Eye, RefreshCw, FileText, Image } from 'lucide-react'
import { api } from '../lib/api'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function DetallePanel({ comprobante, onEliminar }) {
  const tieneMovimiento = !!comprobante.movimientos
  const vencido = !comprobante.archivo_url
  const extraccion = comprobante.extraccion || {}

  const estadoBadge = (estado) => {
    if (estado === 'procesado') return <span className="badge-ocr">✓ OCR</span>
    if (estado === 'error') return <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Error OCR</span>
    if (estado === 'requiere_revision') return <span className="badge-pendiente">Requiere revisión</span>
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
        <img src={comprobante.archivo_url} alt="Comprobante"
          className="w-full h-44 object-cover rounded-lg mb-4 border border-gray-100" />
      ) : (
        <a href={comprobante.archivo_url} target="_blank" rel="noreferrer"
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
          {estadoBadge(comprobante.estado_analisis)}
        </div>
        {extraccion.issueDate && (
          <div className="flex justify-between">
            <span className="text-gray-500 text-xs">Fecha extraída</span>
            <span className="text-xs font-medium">{extraccion.issueDate}</span>
          </div>
        )}
        {extraccion.total && (
          <div className="flex justify-between">
            <span className="text-gray-500 text-xs">Monto extraído</span>
            <span className="text-xs font-medium">{fmt(extraccion.total)}</span>
          </div>
        )}
        {extraccion.issuer?.name && (
          <div className="flex justify-between">
            <span className="text-gray-500 text-xs">Proveedor</span>
            <span className="text-xs font-medium truncate max-w-[130px] text-right">{extraccion.issuer.name}</span>
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

      {comprobante.estado_analisis !== 'procesado' && comprobante.diagnostico?.errors?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Diagnóstico</p>
          <ul className="bg-amber-50 rounded-lg p-2 text-xs text-amber-700 space-y-0.5 list-disc list-inside">
            {comprobante.diagnostico.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {comprobante.duplicate_of_id && (
        <p className="mb-4 text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
          Posible duplicado de otro comprobante ya cargado.
        </p>
      )}

      {comprobante.comprobante_items?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Renglones</p>
          <div className="bg-gray-50 rounded-lg p-2 max-h-32 overflow-y-auto">
            <table className="w-full text-xs">
              <tbody>
                {comprobante.comprobante_items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-1 pr-2 text-gray-600 truncate max-w-[100px]">{item.descripcion}</td>
                    <td className="py-1 pr-2 text-gray-400 text-right whitespace-nowrap">{item.cantidad ?? ''}</td>
                    <td className="py-1 text-gray-700 text-right whitespace-nowrap">{fmt(item.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!tieneMovimiento && !vencido && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
            Este comprobante no generó un movimiento. Registrá el ingreso o gasto manualmente desde el módulo de Movimientos usando los datos de arriba como referencia.
          </p>
        )}
        <div className="flex gap-2">
          {!vencido && (
            <a href={comprobante.archivo_url} target="_blank" rel="noreferrer"
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
      if (selected?.id === c.id) { setSelected(null) }
      cargar()
    } catch (err) {
      alert(err.message)
    }
  }

  const estadoBadge = (estado) => {
    if (estado === 'procesado') return <span className="badge-ocr">✓ OCR</span>
    if (estado === 'error') return <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Error</span>
    if (estado === 'requiere_revision') return <span className="badge-pendiente">Requiere revisión</span>
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
                      onClick={() => setSelected(c)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors group ${
                        selected?.id === c.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {c.archivo_url ? (
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
                            {!c.archivo_url && (
                              <span className="text-[10px] text-amber-600 font-medium">Vencido</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{estadoBadge(c.estado_analisis)}</td>
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
                          <span className="text-amber-600 font-medium text-xs">Sin registrar</span>
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
          {selected ? (
            <DetallePanel
              comprobante={selected}
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
