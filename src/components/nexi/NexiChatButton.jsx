import { MessageCircle } from 'lucide-react'
import { useNexi } from '../../context/NexiContext'

export default function NexiChatButton() {
  const { isOpen, open } = useNexi()

  if (isOpen) return null

  return (
    <button
      onClick={open}
      aria-label="Abrir asistente Nexi"
      title="Nexi"
      className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-transform duration-150 cursor-pointer"
      style={{ background: 'linear-gradient(135deg,#1D9E75,#5DCAA5)', boxShadow: '0 6px 20px rgba(15,110,86,0.35)' }}
    >
      <MessageCircle size={24} />
    </button>
  )
}
