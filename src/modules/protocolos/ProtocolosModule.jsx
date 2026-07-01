import { useState } from 'react'
import ProtocolosList from './ProtocolosList'
import ProtocolosDetail from './ProtocolosDetail'
import ReportePrueba from './ReportePrueba'

export default function ProtocolosModule({ user }) {
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedPruebaId, setSelectedPruebaId] = useState(null)

  const openDetail = (id) => { setSelectedId(id); setView('detail') }
  const openReport = (pruebaId) => { setSelectedPruebaId(pruebaId); setView('report') }
  const backToList = () => { setSelectedId(null); setView('list') }
  const backToDetail = () => { setSelectedPruebaId(null); setView('detail') }

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
        />
      )}
      {view === 'report' && selectedPruebaId && (
        <ReportePrueba
          pruebaId={selectedPruebaId}
          onBack={backToDetail}
        />
      )}
    </div>
  )
}
