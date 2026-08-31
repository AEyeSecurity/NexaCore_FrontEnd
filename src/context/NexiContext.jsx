import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getAllowedNexiModules } from '../lib/nexiModules'

const NexiContext = createContext(null)

function pickInitialModule(currentPage, allowedModules) {
  if (allowedModules.some(m => m.id === currentPage)) return currentPage
  return allowedModules[0]?.id ?? null
}

// TODO: conectar con el endpoint de Nexi cuando el backend esté disponible.
// Handler desacoplado a propósito: hoy solo registra el mensaje del usuario
// en el historial del módulo, sin generar ninguna respuesta simulada.
function requestNexiResponse({ module, message, user }) {
  // no-op intencional
}

export function NexiProvider({ children, user, currentPage }) {
  const allowedModules = useMemo(() => getAllowedNexiModules(user?.role), [user?.role])

  const [isOpen, setIsOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState(
    () => pickInitialModule(currentPage, allowedModules)
  )
  const [conversations, setConversations] = useState({})

  const open = useCallback(() => {
    setIsOpen(true)
    setSelectedModule(prev => {
      if (allowedModules.some(m => m.id === currentPage)) return currentPage
      if (prev && allowedModules.some(m => m.id === prev)) return prev
      return allowedModules[0]?.id ?? null
    })
  }, [allowedModules, currentPage])

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, open, close])

  const selectModule = useCallback((moduleId) => {
    if (!allowedModules.some(m => m.id === moduleId)) return
    setSelectedModule(moduleId)
  }, [allowedModules])

  const sendMessage = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed || !selectedModule) return

    const userMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed, ts: Date.now() }
    setConversations(prev => ({
      ...prev,
      [selectedModule]: [...(prev[selectedModule] ?? []), userMessage],
    }))

    requestNexiResponse({ module: selectedModule, message: trimmed, user })
  }, [selectedModule, user])

  const messages = conversations[selectedModule] ?? []

  const value = {
    isOpen, open, close, toggle,
    allowedModules,
    selectedModule, selectModule,
    messages, sendMessage,
    user,
  }

  return <NexiContext.Provider value={value}>{children}</NexiContext.Provider>
}

export function useNexi() {
  const ctx = useContext(NexiContext)
  if (!ctx) throw new Error('useNexi debe usarse dentro de un NexiProvider')
  return ctx
}
