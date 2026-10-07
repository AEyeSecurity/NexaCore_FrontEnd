import { useNexi } from '../../context/NexiContext'
import NexiHeader from './NexiHeader'
import NexiMessageList from './NexiMessageList'
import NexiMessageInput from './NexiMessageInput'
import NexiConversationList from './NexiConversationList'

export default function NexiChatPanel() {
  const { isOpen, isHistoryOpen } = useNexi()

  return (
    <div
      className={`fixed top-0 right-0 h-full z-50 w-full md:w-[400px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      aria-hidden={!isOpen}
    >
      <NexiHeader />
      {isHistoryOpen && <NexiConversationList />}
      {/* El chat queda montado detrás del historial: conserva borrador y scroll. */}
      <div className={`flex-1 flex-col min-h-0 ${isHistoryOpen ? 'hidden' : 'flex'}`}>
        <NexiMessageList />
        <NexiMessageInput />
      </div>
    </div>
  )
}
