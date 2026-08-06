import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Image, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { api } from '../lib/api'

function fmt(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(value)
}

function Estado({ estado }) {
  if (estado === 'procesado') return <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Registrado</span>
  if (estado === 'requiere_revision') return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Revisión</span>
  return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Error</span>
}

function Detalle({ comprobante, onEliminar }) {
  const extraction = comprobante.extraccion
  const errors = comprobante.diagnostico?.errors || []
  const vencido = !comprobante.archivo_url

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Detalle del comprobante</h3>
          <p className="mt-1 text-xs text-gray-500">{comprobante.nombre_archivo}</p>
        </div>
        <Estado estado={comprobante.estado_analisis} />
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle size={14} /> Movimiento no creado</div>
          {errors.map(error => <p key={error}>{error}</p>)}
        </div>
      )}

      {vencido ? (
        <div className="flex h-36 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-500">Archivo eliminado por vencimiento.</div>
      ) : comprobante.tipo_archivo === 'application/pdf' ? (
        <a href={comprobante.archivo_url} target="_blank" rel="noreferrer" className="flex h-36 flex-col items-center justify-center rounded-lg bg-red-50 text-red-600">
          <FileText size={28} /><span className="mt-2 text-xs font-medium">Abrir PDF seguro</span>
        </a>
      ) : (
        <img src={comprobante.archivo_url} alt="Comprobante" className="h-44 w-full rounded-lg border border-gray-100 object-cover" />
      )}

      {extraction && (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <Dato etiqueta="Tipo" valor={extraction.documentType?.replace('_', ' ')} />
            <Dato etiqueta="Fecha emisión" valor={extraction.issueDate} />
            <Dato etiqueta="Emisor" valor={extraction.issuer?.name} />
            <Dato etiqueta="CUIT emisor" valor={extraction.issuer?.cuit} />
            <Dato etiqueta="Comprobante" valor={[extraction.pointOfSale, extraction.documentNumber].filter(Boolean).join('-')} />
            <Dato etiqueta="CAE" valor={extraction.cae} />
            <Dato etiqueta="Categoría IA" valor={extraction.suggestedCategory} />
            <Dato etiqueta="Total" valor={fmt(extraction.total)} destacado />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-gray-50 text-gray-500"><tr><th className="p-2">Descripción</th><th className="p-2 text-right">Cant.</th><th className="p-2 text-right">Importe</th></tr></thead>
              <tbody>{(comprobante.comprobante_items || []).map(item => <tr key={item.id} className="border-t border-gray-100"><td className="p-2">{item.descripcion}</td><td className="p-2 text-right">{item.cantidad ?? '—'}</td><td className="p-2 text-right">{fmt(item.importe)}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}

      {comprobante.movimientos && <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={14} className="mr-1 inline" /> Movimiento {comprobante.movimientos.tipo} creado: {comprobante.movimientos.descripcion}</div>}
      <button onClick={onEliminar} className="flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 py-2 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 size={13} /> Eliminar comprobante</button>
    </div>
  )
}

function Dato({ etiqueta, valor, destacado = false }) {
  return <div><p className="text-gray-500">{etiqueta}</p><p className={destacado ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}>{valor || '—'}</p></div>
}

export default function Comprobantes() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const fileRef = useRef()

  const cargar = async () => {
    setLoading(true)
    try {
      const response = await api.getComprobantes()
      setItems(response.data || [])
      if (selected) setSelected(response.data?.find(item => item.id === selected.id) || null)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleUpload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setNotice(null)
    try {
      const data = new FormData()
      data.append('archivo', file)
      const response = await api.subirComprobante(data)
      setSelected(response.comprobante)
      setNotice(response.movimiento
        ? { type: 'success', message: `Movimiento ${response.movimiento.tipo} creado automáticamente.` }
        : { type: 'warning', message: response.analysis?.errors?.join(' ') || 'El comprobante requiere revisión.' })
      await cargar()
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleDelete = async () => {
    try {
      await api.eliminarComprobante(confirmDelete.id)
      if (selected?.id === confirmDelete.id) setSelected(null)
      setConfirmDelete(null)
      await cargar()
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    }
  }

  return (
    <div className="animate-fadeIn">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleUpload} className="hidden" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Comprobantes</h1><p className="mt-0.5 text-sm text-gray-500">Análisis automático y registro financiero validado</p></div>
        <button onClick={() => fileRef.current.click()} disabled={uploading} className="btn-primary text-sm">{uploading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}{uploading ? 'Analizando…' : 'Subir comprobante'}</button>
      </div>

      {notice && <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border p-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><span>{notice.message}</span><button onClick={() => setNotice(null)}><X size={15} /></button></div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card overflow-hidden lg:col-span-2">
          {loading ? <div className="flex h-48 items-center justify-center text-gray-400"><RefreshCw size={20} className="mr-2 animate-spin" /> Cargando…</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100 bg-gray-50">{['Archivo', 'Estado', 'Movimiento', 'Fecha'].map(label => <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id} onClick={() => setSelected(item)} className={`cursor-pointer border-b border-gray-50 ${selected?.id === item.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}><td className="flex items-center gap-2 px-4 py-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tipo_archivo === 'application/pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{item.tipo_archivo === 'application/pdf' ? <FileText size={14} /> : <Image size={14} />}</span><span className="max-w-[160px] truncate text-xs font-medium">{item.nombre_archivo}</span></td><td className="px-4 py-3"><Estado estado={item.estado_analisis} /></td><td className="px-4 py-3 text-xs">{item.movimientos ? `${item.movimientos.tipo} · ${fmt(item.movimientos.monto)}` : 'No creado'}</td><td className="px-4 py-3 text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString('es-AR')}</td></tr>)}{items.length === 0 && <tr><td colSpan="4" className="px-4 py-16 text-center text-sm text-gray-400">No hay comprobantes cargados.</td></tr>}</tbody></table></div>}
        </div>
        <div className="card p-5">{selected ? <Detalle comprobante={selected} onEliminar={() => setConfirmDelete(selected)} /> : <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-gray-400"><FileText size={32} className="mb-3 opacity-30" /><p className="text-sm">Seleccioná un comprobante para ver la extracción.</p></div>}</div>
      </div>

      {confirmDelete && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} /><div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h3 className="mb-2 font-semibold">¿Eliminar comprobante?</h3><p className="mb-4 text-sm text-gray-600">El movimiento creado no se eliminará.</p><div className="flex gap-2"><button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">Cancelar</button><button onClick={handleDelete} className="btn-danger flex-1 justify-center">Eliminar</button></div></div></div>}
    </div>
  )
}
