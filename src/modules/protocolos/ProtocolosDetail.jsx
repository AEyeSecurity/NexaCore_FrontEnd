import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Edit3, Plus, RefreshCw, Lock, ClipboardList, History } from 'lucide-react'
import { protocolosApi } from './protocolosApi'
import { CATEGORIA_LABELS, CATEGORIA_BADGE } from './constants'
import ProtocoloModal from './ProtocoloModal'
import PruebaModal from './PruebaModal'

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProtocolosDetail({ protocoloId, user, onBack, onOpenPrueba }) {
  const [protocolo, setProtocolo] = useState(null)
  const [pruebas, setPruebas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showPrueba, setShowPrueba] = useState(false)

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
              <p className="text-[12px] text-gray-400">Pruebas registradas</p>
            </div>
            {protocolo.acceso && (
              <div>
                <p className="text-[14px] font-semibold text-gray-900 flex items-center gap-1"><Lock size={13} /> {protocolo.acceso}</p>
                <p className="text-[12px] text-gray-400">Acceso</p>
              </div>
            )}
            <div>
              <p className="text-[14px] font-semibold text-gray-900">{ultimaPrueba ? formatFecha(ultimaPrueba.fecha) : '—'}</p>
              <p className="text-[12px] text-gray-400">Última prueba</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <Edit3 size={14} /> Editar protocolo
          </button>
          <button onClick={() => setShowPrueba(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm"
            style={{ background: '#0F6E56' }}>
            <Plus size={15} /> Nueva prueba
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
            <History size={16} style={{ color: '#0F6E56' }} /> Trazabilidad — historial de pruebas
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                {['FECHA', 'REALIZADO POR', 'RESULTADO', 'CUMPLIMIENTO', ''].map(h => (
                  <th key={h} className="text-left py-3 px-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pruebas.map(p => {
                const resultados = Array.isArray(p.resultados) ? p.resultados : []
                const okCount = resultados.filter(r => r.estado === 'ok').length
                const failCount = resultados.filter(r => r.estado === 'fail').length
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                    <td className="py-3.5 px-5 font-medium text-gray-700">{formatFecha(p.fecha)}</td>
                    <td className="py-3.5 px-5 text-gray-500">{p.realizado_por || '—'}</td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold"
                        style={failCount > 0 ? { background: '#FEE2E2', color: '#B91C1C' } : { background: '#E1F5EE', color: '#0F6E56' }}>
                        {failCount > 0 ? 'Con incumplimientos' : 'Cumplido'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-gray-500">{okCount}/{resultados.length} ítems OK</td>
                    <td className="py-3.5 px-5 text-right">
                      <button onClick={() => onOpenPrueba(p.id)}
                        className="text-[12.5px] font-semibold" style={{ color: '#3B6FD6' }}>
                        Ver reporte →
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pruebas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400 text-[13.5px]">
                    Todavía no se registraron pruebas para este protocolo.
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
          defaultRealizadoPor={user?.name}
          onClose={() => setShowPrueba(false)}
          onSaved={() => { setShowPrueba(false); cargar() }}
        />
      )}
    </div>
  )
}
