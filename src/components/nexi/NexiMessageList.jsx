import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { AlertCircle, X, FileText, Download, Loader2 } from 'lucide-react'
import avatarNexi from '../../../resources/avatarNexi.png'
import { useNexi } from '../../context/NexiContext'
import { NEXI_GENERAL_SUGGESTIONS } from '../../lib/nexiModules'

const bubbleShape = 'rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-snug break-words'
const bubbleBase = `max-w-[85%] ${bubbleShape}`
const assistantBubble = `${bubbleBase} whitespace-pre-wrap`

// Markdown básico para respuestas de Nexi. Solo estos elementos; el resto
// (links, imágenes, tablas, títulos…) se desenvuelve a texto. Sin rehype-raw:
// el HTML crudo que venga del modelo nunca se renderiza.
const MARKDOWN_ELEMENTS = ['p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'code']

// Espaciado compacto dentro de la burbuja (preflight de Tailwind ya quita
// márgenes y viñetas; acá se reponen de forma mínima).
const markdownComponents = {
  p:      ({ node, ...props }) => <p className="whitespace-pre-line [&:not(:first-child)]:mt-2" {...props} />,
  ul:     ({ node, ...props }) => <ul className="list-disc pl-4 [&:not(:first-child)]:mt-1.5 space-y-0.5" {...props} />,
  ol:     ({ node, ...props }) => <ol className="list-decimal pl-4 [&:not(:first-child)]:mt-1.5 space-y-0.5" {...props} />,
  li:     ({ node, ...props }) => <li className="pl-0.5 [&>ul]:mt-0.5 [&>ol]:mt-0.5" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
  em:     ({ node, ...props }) => <em className="italic" {...props} />,
  code:   ({ node, ...props }) => <code className="px-1 py-px rounded text-[12px] font-mono bg-[#0F6E56]/10" {...props} />,
}

function AssistantMarkdown({ children }) {
  return (
    <Markdown
      allowedElements={MARKDOWN_ELEMENTS}
      unwrapDisallowed
      skipHtml
      components={markdownComponents}
    >
      {children}
    </Markdown>
  )
}

function AssistantRow({ children }) {
  return (
    <div className="self-start flex items-end gap-2 max-w-full">
      <img src={avatarNexi} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
      {children}
    </div>
  )
}

function ReportCard({ reporte }) {
  const { downloadReport } = useNexi()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    await downloadReport(reporte)
    setIsDownloading(false)
  }

  return (
    <div className="rounded-xl border bg-white px-3 py-2.5 flex items-center gap-2.5" style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#E1F5EE' }}>
        <FileText size={16} style={{ color: '#0F6E56' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold leading-snug break-words" style={{ color: '#233F38' }}>{reporte.titulo}</p>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: '#4B5A55' }}>{reporte.formato}</p>
      </div>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`Descargar ${reporte.titulo}`}
        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-white transition-opacity cursor-pointer hover:opacity-90 disabled:opacity-60 disabled:cursor-wait"
        style={{ background: '#0F6E56' }}
      >
        {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        {isDownloading ? 'Descargando…' : 'Descargar'}
      </button>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <AssistantRow>
      <div
        className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[12.5px] flex items-center gap-2"
        style={{ background: '#F1F5F3', color: '#4B5A55' }}
        role="status"
      >
        <span className="flex gap-1" aria-hidden="true">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        Nexi está pensando…
      </div>
    </AssistantRow>
  )
}

function Suggestions({ nexiModules, onPick, disabled }) {
  const allowedIds = nexiModules.map(m => m.id)
  const suggestions = NEXI_GENERAL_SUGGESTIONS.filter(s => allowedIds.includes(s.module)).map(s => s.text)

  if (suggestions.length === 0) return null

  return (
    <div className="flex flex-col items-start gap-1.5 pl-8">
      {suggestions.map(text => (
        <button
          key={text}
          onClick={() => onPick(text)}
          disabled={disabled}
          className="text-left px-3 py-1.5 rounded-xl text-[12.5px] border transition-colors cursor-pointer hover:bg-[#E1F5EE] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ borderColor: 'rgba(15,110,86,0.25)', color: '#0F6E56' }}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export default function NexiMessageList() {
  const {
    messages, user, isSending, isLoadingMessages, error, dismissError,
    nexiModules, sendMessage,
  } = useNexi()
  const scrollRef = useRef(null)

  // Scroll al final solo cuando cambia el contenido del chat (mensaje nuevo,
  // respuesta, indicador de carga, conversación cargada o error).
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, isSending, isLoadingMessages, error])

  const greeting = `Hola${user?.name ? `, ${user.name}` : ''} 👋 Soy Nexi. Puedo ayudarte con la información disponible en los módulos a los que tenés acceso. Haceme una pregunta.`

  const isEmpty = messages.length === 0 && !isLoadingMessages

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      {isEmpty && (
        <>
          <AssistantRow>
            <div className={assistantBubble} style={{ background: '#F1F5F3', color: '#233F38' }}>
              {greeting}
            </div>
          </AssistantRow>
          <Suggestions
            nexiModules={nexiModules}
            onPick={sendMessage}
            disabled={isSending}
          />
        </>
      )}

      {isLoadingMessages && (
        <p className="self-center text-[12px] py-2" style={{ color: '#4B5A55' }} role="status">
          Cargando conversación…
        </p>
      )}

      {messages.map(msg => (
        msg.rol === 'usuario' ? (
          <div key={msg.id} className="self-end max-w-[85%] flex flex-col items-end gap-0.5">
            <div
              className={`rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-snug text-white whitespace-pre-wrap break-words ${msg.fallido ? 'opacity-60' : ''}`}
              style={{ background: '#0F6E56' }}
            >
              {msg.contenido}
            </div>
            {msg.fallido && <span className="text-[11px] text-red-600">No enviado</span>}
          </div>
        ) : (
          <AssistantRow key={msg.id}>
            {msg.reportes?.length > 0 ? (
              <div className="max-w-[85%] min-w-0 flex flex-col gap-2">
                <div className={bubbleShape} style={{ background: '#F1F5F3', color: '#233F38' }}>
                  <AssistantMarkdown>{msg.contenido}</AssistantMarkdown>
                </div>
                {msg.reportes.map(r => <ReportCard key={r.id} reporte={r} />)}
              </div>
            ) : (
              <div className={bubbleBase} style={{ background: '#F1F5F3', color: '#233F38' }}>
                <AssistantMarkdown>{msg.contenido}</AssistantMarkdown>
              </div>
            )}
          </AssistantRow>
        )
      ))}

      {isSending && <ThinkingIndicator />}

      {error && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12.5px] leading-snug border"
          style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
          role="alert"
        >
          <AlertCircle size={15} className="flex-shrink-0 mt-px" />
          <span className="flex-1">{error}</span>
          <button onClick={dismissError} aria-label="Descartar aviso" className="flex-shrink-0 opacity-70 hover:opacity-100 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
