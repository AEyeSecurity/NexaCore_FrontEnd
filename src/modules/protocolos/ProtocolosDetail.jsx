import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Edit3, Plus, RefreshCw, Lock, ClipboardList, History, Trash2, AlertCircle } from 'lucide-react'
import { protocolosApi } from './protocolosApi'
import { CATEGORIA_LABELS, CATEGORIA_BADGE } from './constants'
import ProtocoloModal from './ProtocoloModal'
import PruebaModal from './PruebaModal'
import AppModal from '../../components/AppModal'
import { isHighHierarchy } from '../../lib/permissions'

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Sin `status` = el fetch no llegó al servidor (TypeError) o la respuesta no era JSON.
function mensajeErrorEliminar(err) {
  switch (err?.status) {
    case 401: return 'Tu sesión expiró. Volvé a iniciar sesión.'
    case 403: return 'No tenés permisos para eliminar este protocolo.'
    case 404: return 'El protocolo ya no existe o fue eliminado.'
    case 409: return err.message || 'No se puede eliminar el protocolo porque tiene registros asociados.'
    case undefined:
      return err instanceof TypeError
        ? 'No se pudo conectar con el servidor. Revisá tu conexión e intentá nuevamente.'
        : 'No se pudo eliminar el protocolo. Intentá nuevamente.'
    default: return 'No se pudo eliminar el protocolo. Intentá nuevamente.'
  }
}

function ConfirmarEliminarProtocolo({ protocolo, registros, onCancel, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const confirmar = () => {
    setDeleting(true)
    setError(null)
    protocolosApi.eliminar(protocolo.id)
      .then(res => onDeleted(res))
      .catch(err => { setError(mensajeErrorEliminar(err)); setDeleting(false) })
  }

  return (
    <AppModal onClose={deleting ? () => {} : onCancel} maxWidth="max-w-md">
      <div className="p-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#FEE2E2' }}>
          <Trash2 size={18} style={{ color: '#B91C1C' }} />
        </div>
        <h3 className="font-serif text-[17px] font-semibold text-gray-900">Eliminar protocolo</h3>
        <p className="text-[13px] text-gray-600 mt-1.5">
          <span className="font-semibold">{protocolo.nombre}</span>
        </p>
        <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
          ¿Estás seguro de que querés eliminar este protocolo? Esta acción no se puede deshacer.
          {registros > 0 && (
            <> También se eliminarán {registros} {registros === 1 ? 'registro asociado' : 'registros asociados'}.</>
          )}
        </p>
        {error && (
          <div className="flex items-start gap-1.5 text-[12.5px] text-red-600 mt-3">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}
        <div className="flex justify-end gap-2.5 mt-5">
          <button onClick={onCancel} disabled={deleting}
            className="px-4 py-2.5 rounded-xl border text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: '#B91C1C' }}>
            {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Eliminando…' : 'Eliminar protocolo'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}

export default function ProtocolosDetail({ protocoloId, user, onBack, onOpenPrueba, onDeleted }) {
  const [protocolo, setProtocolo] = useState(null)
  const [pruebas, setPruebas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showPrueba, setShowPrueba] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const puedeEliminar = isHighHierarchy(user)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [det, hist] = await Promise.all([
        protocolosApi.obtener(protocoloId),
        protocolosApi.listarPruebas(protocoloId),
      ])
      setProtocolo(det)
      setPruebas(hist.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [protocoloId])

  useEffect(() => { cargar() }, [cargar])

  if (loading && !protocolo) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-[13.5px]">
        <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
      </div>
    )
  }
  if (!protocolo) return null

  const items = protocolo.items ?? []
  const ultimaPrueba = pruebas[0]

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={14} /> Volver a protocolos
      </button>

      <div className="bg-white rounded-2xl border p-6 flex flex-wrap items-start justify-between gap-4" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
            style={CATEGORIA_BADGE[protocolo.categoria]}>
            {CATEGORIA_LABELS[protocolo.categoria] ?? protocolo.categoria}
          </span>
          <h2 className="font-serif text-[21px] font-semibold text-gray-900 mt-2.5">{protocolo.nombre}</h2>
          {protocolo.descripcion && (
            <p className="text-[13.5px] text-gray-500 mt-1 max-w-xl">{protocolo.descripcion}</p>
          )}
          <div className="flex flex-wrap gap-6 mt-4">
            <div>
              <p className="text-[14px] font-semibold text-gray-900">{items.length}</p>
              <p className="text-[12px] text-gray-400">Ítems del checklist</p>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-900">{pruebas.length}</p>
              <p className="text-[12px] text-gray-400">Registros</p>
            </div>
            {protocolo.acceso && (
              <div>
                <p className="text-[14px] font-semibold text-gray-900 flex items-center gap-1"><Lock size={13} /> {protocolo.acceso}</p>
                <p className="text-[12px] text-gray-400">Acceso</p>
              </div>
            )}
            <div>
              <p className="text-[14px] font-semibold text-gray-900">{ultimaPrueba ? formatFecha(ultimaPrueba.fecha) : '—'}</p>
              <p className="text-[12px] text-gray-400">Último registro</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {puedeEliminar && (
            <button onClick={() => setShowDelete(true)}
              title="Eliminar protocolo" aria-label="Eliminar protocolo"
              className="flex items-center justify-center w-10 h-10 rounded-xl border text-gray-400 bg-white hover:bg-red-50 hover:text-red-600 transition-colors"
              style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
              <Trash2 size={15} />
            </button>
          )}
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <Edit3 size={14} /> Editar protocolo
          </button>
          <button onClick={() => setShowPrueba(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm"
            style={{ background: '#0F6E56' }}>
            <Plus size={15} /> Nuevo registro
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <h4 className="font-serif font-semibold text-gray-900 text-[15px] mb-4 flex items-center gap-2">
          <ClipboardList size={16} style={{ color: '#0F6E56' }} /> Checklist estático del protocolo
        </h4>
        {items.length === 0 ? (
          <p className="text-[13px] text-gray-400">Este protocolo todavía no tiene ítems configurados.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f0f1f0' }}>
            {items.map((it, i) => (
              <div key={it.id ?? i} className="flex items-start gap-3 py-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-gray-500 flex-shrink-0 mt-0.5" style={{ background: '#EEF1EE' }}>
                  {i + 1}
                </div>
                <p className="text-[13.5px] text-gray-800">{it.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="px-6 pt-5 pb-1">
          <h4 className="font-serif font-semibold text-gray-900 text-[15px] flex items-center gap-2">
            <History size={16} style={{ color: '#0F6E56' }} /> Trazabilidad — historial de registros
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                {['FECHA', 'RESULTADO', 'CUMPLIMIENTO', 'COMENTARIOS', ''].map(h => (
                  <th key={h} className="text-left py-3 px-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pruebas.map(p => {
                const resultados = Array.isArray(p.resultados) ? p.resultados : []
                const okCount = resultados.filter(r => r.estado === 'ok').length
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                    <td className="py-3.5 px-5 font-medium text-gray-700 align-top whitespace-nowrap">{formatFecha(p.fecha)}</td>
                    <td className="py-3.5 px-5 text-gray-700 text-[13px] align-top" style={{ maxWidth: '300px' }}>
                      <span className="block break-words whitespace-pre-wrap">
                        {p.resultado_texto || 'Sin resultados cargados'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-gray-500 align-top whitespace-nowrap">{okCount}/{resultados.length} ítems OK</td>
                    <td className="py-3.5 px-5 text-gray-400 text-[12.5px] align-top" style={{ maxWidth: '250px' }}>
                      <span className="block break-words whitespace-pre-wrap">
                        {p.observaciones || 'Sin observaciones'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right align-top">
                      <button onClick={() => onOpenPrueba(p.id)}
                        className="text-[12.5px] font-semibold whitespace-nowrap" style={{ color: '#3B6FD6' }}>
                        Ver reporte →
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pruebas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400 text-[13.5px]">
                    Todavía no hay registros para este protocolo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEdit && (
        <ProtocoloModal
          protocolo={protocolo}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); cargar() }}
        />
      )}
      {showPrueba && (
        <PruebaModal
          protocolo={protocolo}
          onClose={() => setShowPrueba(false)}
          onSaved={() => { setShowPrueba(false); cargar() }}
        />
      )}
      {showDelete && (
        <ConfirmarEliminarProtocolo
          protocolo={protocolo}
          registros={pruebas.length}
          onCancel={() => setShowDelete(false)}
          onDeleted={(res) => { setShowDelete(false); onDeleted?.(res) }}
        />
      )}
    </div>
  )
}
