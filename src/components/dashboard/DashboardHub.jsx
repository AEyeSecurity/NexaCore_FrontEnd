import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api'
import { RefreshCw, AlertCircle } from 'lucide-react'
import Dashboard from '../Dashboard'
import DashboardTabBar from './DashboardTabBar'
import DashboardView from './DashboardView'
import CreateViewModal from './CreateViewModal'

// Wrapper principal que gestiona múltiples vistas de Dashboard.
// "Panel General" es el tab fijo (componente Dashboard existente, sin tocar).
// Las vistas de usuario se crean/eliminan vía API y se renderizan con DashboardView.

export default function DashboardHub({ user, onNavigate }) {
  // Lista de vistas del usuario: [{ id, name }]
  const [views, setViews]               = useState([])
  const [viewsLoading, setViewsLoading] = useState(true)
  const [viewsError, setViewsError]     = useState(null)

  // null = Panel General; string = id de vista de usuario
  const [activeViewId, setActiveViewId] = useState(null)

  // Modal de creación
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating]               = useState(false)
  const [createError, setCreateError]         = useState(null)

  // id de la vista cuyo DELETE está en curso (para deshabilitar el ×)
  const [deleting, setDeleting] = useState(null)

  const loadViews = useCallback(() => {
    setViewsLoading(true)
    setViewsError(null)
    return api.getDashboardViews()
      .then(res => setViews(Array.isArray(res) ? res : []))
      .catch(err => setViewsError(err.message || 'No se pudieron cargar las vistas'))
      .finally(() => setViewsLoading(false))
  }, [])

  useEffect(() => { loadViews() }, [loadViews])

  // Crear nueva vista: POST → agrega al array → navega automáticamente a ella
  const handleCreate = (nombre) => {
    setCreating(true)
    setCreateError(null)
    api.createDashboardView(nombre)
      .then(res => {
        setViews(prev => [...prev, res])
        setActiveViewId(res.id)
        setCreateModalOpen(false)
      })
      .catch(err => setCreateError(err.message || 'No se pudo crear la vista'))
      .finally(() => setCreating(false))
  }

  // Eliminar vista: DELETE → remueve del array → si era la activa vuelve al Panel General
  const handleDelete = (id) => {
    setDeleting(id)
    api.deleteDashboardView(id)
      .then(() => {
        setViews(prev => prev.filter(v => v.id !== id))
        if (activeViewId === id) setActiveViewId(null)
      })
      .catch(() => {
        // Si el DELETE falla, no modificamos el estado: el tab permanece
      })
      .finally(() => setDeleting(null))
  }

  const openCreateModal = () => {
    setCreateError(null)
    setCreateModalOpen(true)
  }

  return (
    <div className="space-y-4">

      {/* ── Barra de tabs ───────────────────────────────────────────────── */}
      {viewsLoading ? (
        <div className="flex items-center gap-1.5 text-[12.5px] text-gray-400 h-[38px]">
          <RefreshCw size={12} className="animate-spin" />
          Cargando vistas…
        </div>
      ) : viewsError ? (
        <div className="flex items-center gap-2 text-[12.5px] text-red-600 h-[38px]">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span>{viewsError}</span>
          <button onClick={loadViews} className="underline hover:no-underline font-medium">
            Reintentar
          </button>
        </div>
      ) : (
        <DashboardTabBar
          views={views}
          activeViewId={activeViewId}
          onTabChange={setActiveViewId}
          onCreate={openCreateModal}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}

      {/* ── Contenido del tab activo ────────────────────────────────────── */}
      {/* key fuerza remonte y re-dispara fade-in al cambiar de vista */}
      <div key={activeViewId ?? '__general__'}>
        {activeViewId === null
          ? <Dashboard user={user} onNavigate={onNavigate} />
          : <DashboardView viewId={activeViewId} user={user} />
        }
      </div>

      {/* ── Modal de creación ───────────────────────────────────────────── */}
      <CreateViewModal
        open={createModalOpen}
        creating={creating}
        createError={createError}
        onConfirm={handleCreate}
        onCancel={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
