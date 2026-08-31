import { useNexi } from '../../context/NexiContext'
import NexiHeader from './NexiHeader'
import NexiModuleSelector from './NexiModuleSelector'
import NexiMessageList from './NexiMessageList'
import NexiMessageInput from './NexiMessageInput'

export default function NexiChatPanel() {
  const { isOpen } = useNexi()

  return (
    <div
      className={`fixed top-0 right-0 h-full z-50 w-full md:w-[400px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      aria-hidden={!isOpen}
    >
      <NexiHeader />
      <NexiModuleSelector />
      <NexiMessageList />
      <NexiMessageInput />
    </div>
  )
}
