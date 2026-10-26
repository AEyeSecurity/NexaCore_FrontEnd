import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { getNexiModules, moduleForPage } from '../lib/nexiModules'
import { useAllowedModules } from '../lib/permissions'
import { descargarReporteNexi } from '../lib/nexiReportes'

const NexiContext = createContext(null)

// Traduce errores HTTP a mensajes para el usuario. Nunca muestra detalles
// técnicos: solo los 400 de Nexi (validaciones marcadas como públicas por el
// backend, ej. largo máximo) pasan su texto.
function nexiErrorMessage(err) {
  if (err instanceof TypeError || err?.message === 'Failed to fetch') {
    return 'No se pudo conectar con el servidor. Intentá nuevamente.'
  }
  switch (err?.status) {
    case 400: return err.message || 'No se pudo enviar la consulta.'
    case 401: return 'Tu sesión expiró. Volvé a iniciar sesión para seguir usando Nexi.'
    case 403: return 'No tenés acceso a la información necesaria para realizar esta consulta.'
    case 404: return 'Esta conversación ya no está disponible.'
    case 429: return 'Estás enviando mensajes muy rápido. Esperá unos segundos e intentá nuevamente.'
    default:  return 'Nexi no pudo responder en este momento. Intentá nuevamente.'
  }
}

// Montado en App (Inicio y páginas del Layout comparten la conversación).
// `allowedModules` viene de la Matriz de permisos real, el mismo pedido
// cacheado que usa el sidebar; Nexi no calcula permisos propios.
// `page` (página actual de App) solo ordena las sugerencias: al backend se
// le sigue enviando el modo General.
export function NexiProvider({ children, user, page }) {
  const [allowedModules] = useAllowedModules(user?.email)
  const nexiModules = useMemo(() => getNexiModules(allowedModules), [allowedModules])
  const currentModule = moduleForPage(page)

  const [isOpen, setIsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const [conversations, setConversations] = useState([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)

  // Se incrementa cada vez que cambia la conversación en pantalla: descarta
  // respuestas que llegan tarde para una conversación que ya no se muestra.
  const viewRef = useRef(0)
  const sendingRef = useRef(false)

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const res = await api.getNexiConversations()
      setConversations(res?.data ?? [])
    } catch {
      // El listado es secundario: si falla, el chat sigue funcionando.
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  const resetConversation = useCallback(() => {
    viewRef.current++
    setCurrentConversationId(null)
    setMessages([])
    setIsLoadingMessages(false)
    setError(null)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    loadConversations()
  }, [loadConversations])

  const close = useCallback(() => {
    setIsOpen(false)
    setIsHistoryOpen(false)
  }, [])

  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, open, close])

  const openHistory  = useCallback(() => { setIsHistoryOpen(true); loadConversations() }, [loadConversations])
  const closeHistory = useCallback(() => setIsHistoryOpen(false), [])

  const newConversation = useCallback(() => {
    resetConversation()
    setIsHistoryOpen(false)
  }, [resetConversation])

  const selectConversation = useCallback(async (id) => {
    const view = ++viewRef.current
    setIsHistoryOpen(false)
    setCurrentConversationId(id)
    setMessages([])
    setError(null)
    setIsLoadingMessages(true)
    try {
      const res = await api.getNexiMessages(id)
      if (viewRef.current !== view) return
      setMessages(res?.data ?? [])
    } catch (err) {
      if (viewRef.current !== view) return
      if (err.status === 404) {
        setConversations(prev => prev.filter(c => c.id !== id))
        resetConversation()
      }
      setError(nexiErrorMessage(err))
    } finally {
      if (viewRef.current === view) setIsLoadingMessages(false)
    }
  }, [resetConversation])

  // Lanza el error para que la UI de confirmación pueda informarlo.
  const deleteConversation = useCallback(async (id) => {
    try {
      await api.deleteNexiConversation(id)
    } catch (err) {
      if (err.status !== 404) throw new Error(nexiErrorMessage(err))
    }
    setConversations(prev => prev.filter(c => c.id !== id))
    if (id === currentConversationId) resetConversation()
  }, [currentConversationId, resetConversation])

  const sendMessage = useCallback(async (text) => {
    const mensaje = text.trim()
    if (!mensaje || sendingRef.current) return

    const view = viewRef.current
    const tempId = `tmp-${crypto.randomUUID()}`

    sendingRef.current = true
    setIsSending(true)
    setError(null)
    setMessages(prev => [...prev, { id: tempId, rol: 'usuario', contenido: mensaje, created_at: new Date().toISOString() }])

    try {
      // Sin contextoModulo (modo General): el backend elige las herramientas según la pregunta.
      const res = await api.sendNexiMessage({ conversationId: currentConversationId, mensaje })

      setConversations(prev => [
        { id: res.conversationId, titulo: res.titulo, updated_at: new Date().toISOString() },
        ...prev.filter(c => c.id !== res.conversationId),
      ])
      if (viewRef.current !== view) return

      setCurrentConversationId(res.conversationId)
      if (res.mensaje) {
        setMessages(prev => [...prev, {
          ...res.mensaje,
          herramientasUsadas: res.herramientasUsadas ?? [],
          reportes: res.reportes ?? [],
        }])
      }
    } catch (err) {
      if (viewRef.current !== view) return
      // Sin status HTTP (red caída, respuesta no JSON de un proxy) el backend
      // pudo haber guardado el intercambio: el reintento lo verifica antes de reenviar.
      setMessages(prev => prev.map(m => (m.id === tempId
        ? { ...m, fallido: true, errorRed: !err?.status, conversationId: currentConversationId }
        : m)))

      if (err.status === 404 && currentConversationId) {
        setConversations(prev => prev.filter(c => c.id !== currentConversationId))
        resetConversation()
      }
      setError(nexiErrorMessage(err))
    } finally {
      sendingRef.current = false
      setIsSending(false)
    }
  }, [currentConversationId, resetConversation])

  // Reintento de un mensaje "No enviado". El backend guarda pregunta y respuesta
  // juntas y solo si la respuesta salió bien, así que reenviar no duplica nada.
  // Única excepción: error de red en una conversación existente, donde el
  // servidor pudo haber guardado el intercambio igual. En ese caso, si el último
  // mensaje del usuario en el servidor es este mismo texto, se agrega lo guardado
  // en vez de reenviar. En una conversación nueva se reenvía directamente.
  const retryMessage = useCallback(async (id) => {
    const fallido = messages.find(m => m.id === id && m.fallido)
    if (!fallido || sendingRef.current) return

    if (fallido.errorRed && fallido.conversationId) {
      const view = viewRef.current
      sendingRef.current = true
      setIsSending(true)
      setError(null)
      let guardados = null
      try {
        const res = await api.getNexiMessages(fallido.conversationId)
        const data = res?.data ?? []
        const ultimo = data.findLastIndex(m => m.rol === 'usuario')
        if (ultimo !== -1 && data[ultimo].contenido === fallido.contenido) guardados = data.slice(ultimo)
      } catch (err) {
        if (viewRef.current === view) setError(nexiErrorMessage(err))
        return
      } finally {
        sendingRef.current = false
        setIsSending(false)
      }
      if (viewRef.current !== view) return
      if (guardados) {
        setMessages(prev => [...prev.filter(m => m.id !== id), ...guardados])
        return
      }
    }

    setMessages(prev => prev.filter(m => m.id !== id))
    sendMessage(fallido.contenido)
  }, [messages, sendMessage])

  const dismissError = useCallback(() => setError(null), [])

  // Los errores de descarga van al mismo aviso del chat.
  const downloadReport = useCallback(async (reporte) => {
    try {
      await descargarReporteNexi(reporte)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const value = {
    isOpen, open, close, toggle,
    isHistoryOpen, openHistory, closeHistory,
    nexiModules, currentModule,
    conversations, isLoadingConversations,
    currentConversationId, newConversation, selectConversation, deleteConversation,
    messages, isLoadingMessages,
    sendMessage, retryMessage, isSending,
    error, dismissError,
    downloadReport,
    user,
  }

  return <NexiContext.Provider value={value}>{children}</NexiContext.Provider>
}

export function useNexi() {
  const ctx = useContext(NexiContext)
  if (!ctx) throw new Error('useNexi debe usarse dentro de un NexiProvider')
  return ctx
}
