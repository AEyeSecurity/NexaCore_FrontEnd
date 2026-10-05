import { useState, useRef, useCallback, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import ProtocolosList from './ProtocolosList'
import ProtocolosDetail from './ProtocolosDetail'
import ReportePrueba from './ReportePrueba'

export default function ProtocolosModule({ user }) {
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedPruebaId, setSelectedPruebaId] = useState(null)

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const showToast = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const openDetail = (id) => { setSelectedId(id); setView('detail') }
  const openReport = (pruebaId) => { setSelectedPruebaId(pruebaId); setView('report') }
  const backToList = () => { setSelectedId(null); setView('list') }
  const backToDetail = () => { setSelectedPruebaId(null); setView('detail') }

  // Volver al listado (se vuelve a montar y recarga protocolos + métricas).
  const handleDeleted = (res) => {
    setSelectedPruebaId(null)
    backToList()
    const n = res?.registrosEliminados ?? 0
    showToast(n > 0
      ? `Protocolo eliminado correctamente. Se eliminaron ${n} ${n === 1 ? 'registro asociado' : 'registros asociados'}.`
      : 'Protocolo eliminado correctamente.')
  }

  return (
    <div className="fade-in">
      {view === 'list' && (
        <ProtocolosList onOpenProtocolo={openDetail} />
      )}
      {view === 'detail' && selectedId && (
        <ProtocolosDetail
          protocoloId={selectedId}
          user={user}
          onBack={backToList}
          onOpenPrueba={openReport}
          onDeleted={handleDeleted}
        />
      )}
      {view === 'report' && selectedPruebaId && (
        <ReportePrueba
          pruebaId={selectedPruebaId}
          onBack={backToDetail}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-lg z-[60]"
          style={{ background: '#04342C' }}
        >
          <CheckCircle2 size={15} style={{ color: '#5DCAA5' }} />
          {toast}
        </div>
      )}
    </div>
  )
}
