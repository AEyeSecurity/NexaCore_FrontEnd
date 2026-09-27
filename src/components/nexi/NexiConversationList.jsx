import { useState } from 'react'
import { ArrowLeft, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useNexi } from '../../context/NexiContext'

function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

function ConversationItem({ conversation, active, onSelect, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDelete(conversation.id)
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <li className="rounded-xl px-3 py-2.5 border" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
        <p className="text-[12.5px] mb-2" style={{ color: '#991B1B' }}>
          ¿Eliminar “{conversation.titulo}”? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="px-3 py-1 rounded-lg text-[12px] font-medium cursor-pointer disabled:opacity-50"
            style={{ background: '#ffffff', color: '#4B5A55' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1 rounded-lg text-[12px] font-medium text-white bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors"
        style={{ background: active ? '#E1F5EE' : 'transparent' }}
      >
        <button
          onClick={() => onSelect(conversation.id)}
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
        >
          <MessageSquare size={14} className="flex-shrink-0" style={{ color: '#0F6E56' }} />
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] truncate" style={{ color: '#233F38' }}>{conversation.titulo}</span>
            <span className="block text-[11px]" style={{ color: '#4B5A55' }}>{formatDate(conversation.updated_at)}</span>
          </span>
        </button>
        <button
          onClick={() => setConfirming(true)}
          aria-label={`Eliminar conversación ${conversation.titulo}`}
          title="Eliminar"
          className="p-1.5 rounded-lg text-[#4B5A55] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {deleteError && <p className="text-[11.5px] text-red-600 px-3 pt-1">{deleteError}</p>}
    </li>
  )
}

export default function NexiConversationList() {
  const {
    conversations, isLoadingConversations, currentConversationId,
    selectConversation, deleteConversation, newConversation, closeHistory,
  } = useNexi()

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.13)' }}>
        <button
          onClick={closeHistory}
          className="flex items-center gap-1.5 text-[12.5px] font-medium cursor-pointer hover:opacity-80"
          style={{ color: '#4B5A55' }}
        >
          <ArrowLeft size={14} />
          Volver al chat
        </button>
        <button
          onClick={newConversation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-white cursor-pointer hover:opacity-90"
          style={{ background: '#0F6E56' }}
        >
          <Plus size={13} />
          Nueva conversación
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoadingConversations && conversations.length === 0 ? (
          <p className="text-center text-[12px] py-6" style={{ color: '#4B5A55' }} role="status">Cargando conversaciones…</p>
        ) : conversations.length === 0 ? (
          <p className="text-center text-[12.5px] py-6 px-4" style={{ color: '#4B5A55' }}>
            Todavía no tenés conversaciones con Nexi.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map(c => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === currentConversationId}
                onSelect={selectConversation}
                onDelete={deleteConversation}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
