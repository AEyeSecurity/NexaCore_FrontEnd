import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Edit3, Plus, RefreshCw, Lock, ClipboardList, History, Trash2, AlertCircle, Pencil, X, ListChecks } from 'lucide-react'
import { protocolosApi } from './protocolosApi'
import { CATEGORIA_LABELS, CATEGORIA_BADGE } from './constants'
import ProtocoloModal from './ProtocoloModal'
import PruebaModal from './PruebaModal'
import AppModal from '../../components/AppModal'
import { isHighHierarchy } from '../../lib/permissions'
import { formatFecha } from './fechas'

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

function mensajeErrorEliminarRegistro(err) {
  switch (err?.status) {
    case 401: return 'Tu sesión expiró. Volvé a iniciar sesión.'
    case 403: return 'No tenés permisos para eliminar este registro.'
    case undefined:
      return err instanceof TypeError
        ? 'No se pudo conectar con el servidor. Revisá tu conexión e intentá nuevamente.'
        : 'No se pudo eliminar el registro. Intentá nuevamente.'
    default: return err.message || 'No se pudo eliminar el registro. Intentá nuevamente.'
  }
}

const REGISTRO_NO_ENCONTRADO = 'El registro ya no existe o no pertenece a este protocolo. Se actualizó el historial.'

// `onError` puede devolver true si resolvió el error por su cuenta (p. ej. un 404).
function ConfirmarEliminacion({ titulo, confirmLabel, eliminar, mensajeError, onCancel, onDeleted, onError, children }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const confirmar = () => {
    setDeleting(true)
    setError(null)
    eliminar()
      .then(res => onDeleted(res))
      .catch(err => {
        if (onError?.(err)) return
        setError(mensajeError(err))
        setDeleting(false)
      })
  }

  return (
    <AppModal onClose={deleting ? () => {} : onCancel} maxWidth="max-w-md">
      <div className="p-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#FEE2E2' }}>
          <Trash2 size={18} style={{ color: '#B91C1C' }} />
        </div>
        <h3 className="font-serif text-[17px] font-semibold text-gray-900">{titulo}</h3>
        {children}
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
            {deleting ? 'Eliminando…' : confirmLabel}
          </button>
        </div>
      </div>
    </AppModal>
  )
}

function ActionItemsModal({ prueba, onClose }) {
  const actionItems = prueba.action_items ?? []
  return (
    <AppModal onClose={onClose} maxWidth="max-w-md">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div>
          <h2 className="font-serif font-semibold text-gray-900 text-[16px]">Action Items</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">Registro del {formatFecha(prueba.fecha)}</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={18} />
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
        {actionItems.map((a, i) => (
          <li key={a.id ?? i} className="flex items-start gap-2.5 text-[13.5px] text-gray-800">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]" style={{ background: '#0F6E56' }} />
            <span className="break-words min-w-0">{a.texto}</span>
          </li>
        ))}
      </ul>
    </AppModal>
  )
}

export default function ProtocolosDetail({ protocoloId, user, onBack, onOpenPrueba, onDeleted, onToast }) {
  const [protocolo, setProtocolo] = useState(null)
  const [pruebas, setPruebas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showPrueba, setShowPrueba] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [pruebaEditando, setPruebaEditando] = useState(null)
  const [pruebaEliminando, setPruebaEliminando] = useState(null)
  const [pruebaActionItems, setPruebaActionItems] = useState(null)
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

  const registroNoEncontrado = () => {
    setPruebaEditando(null)
    setPruebaEliminando(null)
    onToast?.(REGISTRO_NO_ENCONTRADO, 'error')
    cargar()
  }

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
          <table className="w-full min-w-[920px] text-[13px]">
            <thead>
              <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                {['FECHA', 'RESULTADO', 'CUMPLIMIENTO', 'ACTION ITEMS', 'COMENTARIOS', 'ACCIONES'].map(h => (
                  <th key={h} className="text-left last:text-right py-3 px-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pruebas.map(p => {
                const resultados = Array.isArray(p.resultados) ? p.resultados : []
                const okCount = resultados.filter(r => r.estado === 'ok').length
                const nActionItems = Array.isArray(p.action_items) ? p.action_items.length : 0
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                    <td className="py-3.5 px-5 font-medium text-gray-700 align-top whitespace-nowrap">{formatFecha(p.fecha)}</td>
                    <td className="py-3.5 px-5 text-gray-700 text-[13px] align-top" style={{ maxWidth: '300px' }}>
                      <span className="break-words whitespace-pre-wrap line-clamp-3" title={p.resultado_texto || undefined}>
                        {p.resultado_texto || 'Sin resultados cargados'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-gray-500 align-top whitespace-nowrap">{okCount}/{resultados.length} ítems OK</td>
                    <td className="py-3.5 px-5 align-top whitespace-nowrap">
                      {nActionItems > 0 ? (
                        <button onClick={() => setPruebaActionItems(p)}
                          title="Ver action items"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold transition-opacity hover:opacity-80"
                          style={{ background: '#E1F5EE', color: '#0F6E56' }}>
                          <ListChecks size={12} />
                          {nActionItems} {nActionItems === 1 ? 'action item' : 'action items'}
                        </button>
                      ) : (
                        <span className="text-[12.5px] text-gray-400">Sin action items</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-gray-400 text-[12.5px] align-top" style={{ maxWidth: '250px' }}>
                      <span className="break-words whitespace-pre-wrap line-clamp-3" title={p.observaciones || undefined}>
                        {p.observaciones || 'Sin observaciones'}
                      </span>
                    </td>
                    <td className="py-3 px-5 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPruebaEditando(p)}
                          title="Editar registro" aria-label="Editar registro"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setPruebaEliminando(p)}
                          title="Eliminar registro" aria-label="Eliminar registro"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => onOpenPrueba(p.id)}
                          className="ml-2 text-[12.5px] font-semibold whitespace-nowrap" style={{ color: '#3B6FD6' }}>
                          Ver reporte →
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {pruebas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400 text-[13.5px]">
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
          onSaved={() => { setShowPrueba(false); onToast?.('Registro creado correctamente.'); cargar() }}
        />
      )}
      {pruebaEditando && (
        <PruebaModal
          protocolo={protocolo}
          prueba={pruebaEditando}
          onClose={() => setPruebaEditando(null)}
          onSaved={() => { setPruebaEditando(null); onToast?.('Registro actualizado correctamente.'); cargar() }}
          onNotFound={registroNoEncontrado}
        />
      )}
      {pruebaActionItems && (
        <ActionItemsModal prueba={pruebaActionItems} onClose={() => setPruebaActionItems(null)} />
      )}
      {pruebaEliminando && (
        <ConfirmarEliminacion
          titulo="Eliminar registro"
          confirmLabel="Eliminar registro"
          eliminar={() => protocolosApi.eliminarRegistro(protocolo.id, pruebaEliminando.id)}
          mensajeError={mensajeErrorEliminarRegistro}
          onCancel={() => setPruebaEliminando(null)}
          onDeleted={() => { setPruebaEliminando(null); onToast?.('Registro eliminado correctamente.'); cargar() }}
          onError={err => { if (err?.status !== 404) return false; registroNoEncontrado(); return true }}
        >
          <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
            ¿Seguro que querés eliminar este registro? Esta acción no se puede deshacer.
          </p>
        </ConfirmarEliminacion>
      )}
      {showDelete && (
        <ConfirmarEliminacion
          titulo="Eliminar protocolo"
          confirmLabel="Eliminar protocolo"
          eliminar={() => protocolosApi.eliminar(protocolo.id)}
          mensajeError={mensajeErrorEliminar}
          onCancel={() => setShowDelete(false)}
          onDeleted={(res) => { setShowDelete(false); onDeleted?.(res) }}
        >
          <p className="text-[13px] text-gray-600 mt-1.5">
            <span className="font-semibold">{protocolo.nombre}</span>
          </p>
          <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
            ¿Estás seguro de que querés eliminar este protocolo? Esta acción no se puede deshacer.
            {pruebas.length > 0 && (
              <> También se eliminarán {pruebas.length} {pruebas.length === 1 ? 'registro asociado' : 'registros asociados'}.</>
            )}
          </p>
        </ConfirmarEliminacion>
      )}
    </div>
  )
}
