import { Plus } from 'lucide-react'

export default function AddWidgetCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-gray-400 hover:text-[#0F6E56] transition-colors cursor-pointer"
      style={{ borderColor: 'rgba(15,110,86,0.25)', minHeight: '160px' }}
    >
      <Plus size={22} />
      <span className="text-[13px] font-medium">Agregar mosaico</span>
    </button>
  )
}
