import { useState, useEffect } from 'react'
import { ArrowLeft, Printer, RefreshCw, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { protocolosApi } from './protocolosApi'
import { ESTADO_ITEM_STYLE } from './constants'

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const ESTADO_LABEL = { ok: 'Cumple', fail: 'No cumple', na: 'N/A' }
const ESTADO_ICON = { ok: CheckCircle2, fail: XCircle, na: MinusCircle }

export default function ReportePrueba({ pruebaId, onBack }) {
  const [prueba, setPrueba] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    protocolosApi.obtenerPrueba(pruebaId)
      .then(data => { if (active) setPrueba(data) })
      .catch(e => console.error(e))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [pruebaId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-[13.5px]">
        <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
      </div>
    )
  }
  if (!prueba) return null

  const resultados = Array.isArray(prueba.resultados) ? prueba.resultados : []
  const protocoloNombre = prueba.protocolos?.nombre ?? 'Protocolo'

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #protocolo-print-area, #protocolo-print-area * { visibility: visible; }
          #protocolo-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <button onClick={onBack} className="no-print flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={14} /> Volver al protocolo
      </button>

      <div id="protocolo-print-area" className="space-y-4">
        <div className="bg-white rounded-2xl border p-6 flex flex-wrap items-start justify-between gap-4" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <div>
            <h2 className="font-serif text-[20px] font-semibold text-gray-900">{protocoloNombre}</h2>
            <p className="text-[13px] text-gray-500 mt-1">
              Reporte de prueba realizada el {formatFecha(prueba.fecha)} por {prueba.realizado_por || 'responsable no especificado'}
            </p>
          </div>
          <button onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors flex-shrink-0"
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <Printer size={14} /> Imprimir / Descargar PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <h4 className="font-serif font-semibold text-gray-900 text-[15px] mb-4">Resultados del checklist</h4>
          <div className="divide-y" style={{ borderColor: '#f0f1f0' }}>
            {resultados.map((r, i) => {
              const Icon = ESTADO_ICON[r.estado] ?? MinusCircle
              return (
                <div key={i} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-[13.5px] font-medium text-gray-800">{i + 1}. {r.texto}</p>
                    {r.nota && <p className="text-[12px] text-gray-400 mt-0.5">📝 {r.nota}</p>}
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold flex-shrink-0"
                    style={ESTADO_ITEM_STYLE[r.estado] ?? ESTADO_ITEM_STYLE.na}>
                    <Icon size={12} /> {ESTADO_LABEL[r.estado] ?? r.estado}
                  </span>
                </div>
              )
            })}
            {resultados.length === 0 && (
              <p className="text-[13px] text-gray-400 py-4">Esta prueba no tiene resultados registrados.</p>
            )}
          </div>
          {prueba.observaciones && (
            <div className="mt-4 pt-4 border-t text-[13px] text-gray-600" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
              <span className="font-semibold text-gray-800">Observaciones generales: </span>{prueba.observaciones}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
