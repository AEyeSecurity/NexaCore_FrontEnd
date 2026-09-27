import { X, History, SquarePen } from 'lucide-react'
import avatarNexi from '../../../resources/avatarNexi.png'
import { useNexi } from '../../context/NexiContext'
import { getNexiModuleLabel } from '../../lib/nexiModules'

const iconButton = 'p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer flex-shrink-0'

export default function NexiHeader() {
  const { close, selectedModule, isHistoryOpen, openHistory, closeHistory, newConversation } = useNexi()

  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 flex-shrink-0 border-b border-white/[0.08]"
      style={{ background: '#04342C' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={avatarNexi}
          alt="Nexi"
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/20"
        />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white leading-tight">Nexi</p>
          <p className="text-[11px] text-white/55 truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5] flex-shrink-0" />
            Contexto: {getNexiModuleLabel(selectedModule)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={newConversation}
          aria-label="Nueva conversación"
          title="Nueva conversación"
          className={iconButton}
        >
          <SquarePen size={17} />
        </button>
        <button
          onClick={isHistoryOpen ? closeHistory : openHistory}
          aria-label="Historial de conversaciones"
          aria-pressed={isHistoryOpen}
          title="Historial"
          className={`${iconButton} ${isHistoryOpen ? 'bg-white/15 text-white' : ''}`}
        >
          <History size={17} />
        </button>
        <button
          onClick={close}
          aria-label="Cerrar Nexi"
          title="Cerrar"
          className={iconButton}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
