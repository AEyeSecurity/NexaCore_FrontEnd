import { X } from 'lucide-react'
import avatarNexi from '../../../resources/avatarNexi.png'
import { useNexi } from '../../context/NexiContext'
import { NEXI_MODULES } from '../../lib/nexiModules'

export default function NexiHeader() {
  const { close, selectedModule } = useNexi()
  const moduleLabel = NEXI_MODULES.find(m => m.id === selectedModule)?.label ?? null

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
            Contexto: {moduleLabel ?? 'sin módulos disponibles'}
          </p>
        </div>
      </div>
      <button
        onClick={close}
        aria-label="Cerrar Nexi"
        title="Cerrar"
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer flex-shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  )
}
