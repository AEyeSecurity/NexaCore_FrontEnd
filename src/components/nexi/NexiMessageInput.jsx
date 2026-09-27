import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useNexi } from '../../context/NexiContext'

// Mismo límite que valida el backend (LIMITES.MAX_MENSAJE_CARACTERES).
const MAX_CHARS = 2000
const MAX_HEIGHT = 120

export default function NexiMessageInput() {
  const { sendMessage, isSending } = useNexi()
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  // Auto-alto del textarea hasta MAX_HEIGHT; luego scrollea.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [text])

  const canSend = text.trim() !== '' && !isSending

  const submit = () => {
    if (!canSend) return
    sendMessage(text)
    setText('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    submit()
  }

  // Enter envía; Shift+Enter agrega una línea.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 px-3 py-3 border-t flex-shrink-0"
      style={{ borderColor: 'rgba(15,110,86,0.13)' }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={MAX_CHARS}
        placeholder="Preguntale algo a Nexi…"
        aria-label="Mensaje para Nexi"
        className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-[13px] leading-snug outline-none resize-none"
        style={{ background: '#F1F5F3', color: '#233F38', maxHeight: `${MAX_HEIGHT}px` }}
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Enviar mensaje"
        className="w-9 h-9 mb-0.5 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg,#1D9E75,#5DCAA5)' }}
      >
        <Send size={15} />
      </button>
    </form>
  )
}
