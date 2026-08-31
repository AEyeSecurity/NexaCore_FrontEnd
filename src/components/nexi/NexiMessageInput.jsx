import { useState } from 'react'
import { Send } from 'lucide-react'
import { useNexi } from '../../context/NexiContext'

export default function NexiMessageInput() {
  const { sendMessage, selectedModule } = useNexi()
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim() || !selectedModule) return
    sendMessage(text)
    setText('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-3 border-t flex-shrink-0"
      style={{ borderColor: 'rgba(15,110,86,0.13)' }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!selectedModule}
        placeholder="Preguntale algo a Nexi…"
        className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-[13px] outline-none disabled:opacity-50"
        style={{ background: '#F1F5F3', color: '#233F38' }}
      />
      <button
        type="submit"
        disabled={!text.trim() || !selectedModule}
        aria-label="Enviar mensaje"
        className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg,#1D9E75,#5DCAA5)' }}
      >
        <Send size={15} />
      </button>
    </form>
  )
}
