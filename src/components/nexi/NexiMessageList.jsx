import { useNexi } from '../../context/NexiContext'

export default function NexiMessageList() {
  const { messages, user } = useNexi()

  const greeting = user?.name
    ? `Hola, ${user.name} 👋 Soy Nexi. Puedo ayudarte con la información disponible en los módulos a los que tenés acceso. Seleccioná un módulo y haceme una pregunta.`
    : 'Hola 👋 Soy Nexi. Puedo ayudarte con la información disponible en los módulos a los que tenés acceso. Seleccioná un módulo y haceme una pregunta.'

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      <div
        className="self-start max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-snug"
        style={{ background: '#F1F5F3', color: '#233F38' }}
      >
        {greeting}
      </div>

      {messages.map(msg => (
        <div
          key={msg.id}
          className="self-end max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-snug text-white"
          style={{ background: '#0F6E56' }}
        >
          {msg.text}
        </div>
      ))}
    </div>
  )
}
