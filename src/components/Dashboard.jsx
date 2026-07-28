import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import {
  ChevronDown, SlidersHorizontal, LayoutGrid,
  RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { WIDGET_CATALOG } from './dashboard/widgetCatalog'
import { useDashboardMetrics } from './dashboard/useDashboardMetrics'
import WidgetCard from './dashboard/WidgetCard'
import EditableWidgetCard from './dashboard/EditableWidgetCard'
import AddWidgetCard from './dashboard/AddWidgetCard'
import EditWidgetsPanel from './dashboard/EditWidgetsPanel'

function getMesesOptions() {
  const now  = new Date()
  const opts = []
  for (let i = 11; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const raw   = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    opts.push({ value, label: raw.charAt(0).toUpperCase() + raw.slice(1) })
  }
  return opts
}

function parseMesAnio(value) {
  const [anio, mes] = value.split('-')
  return { mes: parseInt(mes), anio: parseInt(anio) }
}

export default function Dashboard({ user }) {
  const MESES = getMesesOptions()
  const [selectedMes, setSelectedMes] = useState(MESES[MESES.length - 1].value)
  const { mes, anio } = parseMesAnio(selectedMes)

  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError]     = useState(null)
  const [dashboardName, setDashboardName] = useState('Panel General')
  const [savedWidgets, setSavedWidgets]   = useState([])
  const [allowedModules, setAllowedModules] = useState([])

  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)

  // ── Modo edición (quitar / reordenar) ─────────────────────────────────
  // draftWidgets es una copia local: nada se persiste hasta "Guardar".
  const [editMode, setEditMode]         = useState(false)
  const [draftWidgets, setDraftWidgets] = useState([])
  const [editSaving, setEditSaving]     = useState(false)
  const [editSaveError, setEditSaveError] = useState(null)
  const [dragIndex, setDragIndex]       = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const showToast = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const loadConfig = useCallback(() => {
    setConfigLoading(true)
    setConfigError(null)
    return api.getDashboardConfig()
      .then(res => {
        setDashboardName(res?.dashboard?.name || 'Panel General')
        setSavedWidgets(res?.dashboard?.widgets || [])
        setAllowedModules(res?.allowedModules || [])
        return res
      })
      .catch(err => setConfigError(err.message || 'No se pudo cargar la configuración del panel'))
      .finally(() => setConfigLoading(false))
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const { metricsByGroup, retryGroup } = useDashboardMetrics(savedWidgets, mes, anio)

  const handleSave = (orderedIds) => {
    setSaving(true)
    setSaveError(null)
    api.saveDashboardConfig(orderedIds)
      .then(res => {
        setDashboardName(res?.dashboard?.name || 'Panel General')
        setSavedWidgets(res?.dashboard?.widgets || [])
        setAllowedModules(res?.allowedModules || [])
        setPanelOpen(false)
        showToast('Configuración guardada')
      })
      .catch(err => {
        setSaveError(err.message || 'No se pudo guardar la configuración')
        // 403: los permisos cambiaron desde la última carga — resincronizamos
        // allowedModules/widgets guardados sin aplicar el intento fallido.
        if (err.status === 403) loadConfig()
      })
      .finally(() => setSaving(false))
  }

  // ── Modo edición: quitar / reordenar sobre una copia local ────────────
  const enterEditMode = () => {
    setDraftWidgets(savedWidgets)
    setEditSaveError(null)
    setEditMode(true)
  }

  const cancelEditMode = () => {
    setEditMode(false)
    setEditSaveError(null)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const removeDraftWidget = (id) => {
    setDraftWidgets(prev => prev.filter(x => x !== id))
  }

  const reorderDraftWidgets = (fromIndex, toIndex) => {
    setDraftWidgets(prev => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const handleDragStart = (index) => (e) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOverCard = (index) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndex !== null && dragIndex !== index && dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (index) => (e) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      reorderDraftWidgets(dragIndex, index)
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleSaveEdit = () => {
    setEditSaving(true)
    setEditSaveError(null)
    api.saveDashboardConfig(draftWidgets)
      .then(res => {
        setDashboardName(res?.dashboard?.name || 'Panel General')
        setSavedWidgets(res?.dashboard?.widgets || [])
        setAllowedModules(res?.allowedModules || [])
        setEditMode(false)
        showToast('Configuración guardada')
      })
      .catch(err => {
        setEditSaveError(err.message || 'No se pudo guardar la configuración')
        // 403: los permisos cambiaron desde la última carga — resincronizamos
        // allowedModules/widgets guardados sin aplicar el intento fallido.
        if (err.status === 403) loadConfig()
      })
      .finally(() => setEditSaving(false))
  }

  const mesLabel = MESES.find(m => m.value === selectedMes)?.label ?? ''
  const showEmptyState = !configLoading && !configError && !editMode && savedWidgets.length === 0
  const showGrid = !configLoading && !configError && (editMode || savedWidgets.length > 0)
  const displayedWidgets = (editMode ? draftWidgets : savedWidgets).map(id => WIDGET_CATALOG[id]).filter(Boolean)

  return (
    <div className="fade-in space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[21px] font-semibold text-gray-900">{dashboardName}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">NexaCore · {mesLabel}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedMes}
              onChange={e => setSelectedMes(e.target.value)}
              className="appearance-none border rounded-xl pl-3 pr-8 py-2 text-[13px] text-gray-700 bg-white outline-none cursor-pointer hover:border-teal-600/30 transition-colors"
              style={{ borderColor: 'rgba(15,110,86,0.2)' }}
            >
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {editMode ? (
            <>
              <button
                onClick={cancelEditMode}
                disabled={editSaving}
                className="px-4 py-2 rounded-xl border text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                style={{ borderColor: 'rgba(15,110,86,0.15)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: '#0F6E56' }}
              >
                {editSaving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {editSaving ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          ) : (
            <button
              onClick={enterEditMode}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors"
              style={{ background: '#0F6E56' }}
            >
              <SlidersHorizontal size={14} />
              Editar mosaicos
            </button>
          )}
        </div>
      </div>

      {/* ── Carga inicial ──────────────────────────────────────────────── */}
      {configLoading && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-[13px] gap-2">
          <RefreshCw size={15} className="animate-spin" /> Cargando panel…
        </div>
      )}

      {/* ── Error de configuración ─────────────────────────────────────── */}
      {!configLoading && configError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="flex-shrink-0" />
            {configError}
          </div>
          <button
            onClick={loadConfig}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-red-700 hover:underline flex-shrink-0"
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      {/* ── Estado vacío (modo normal, sin mosaicos configurados) ────────── */}
      {showEmptyState && (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#E1F5EE' }}
          >
            <LayoutGrid size={24} style={{ color: '#0F6E56' }} />
          </div>
          <p className="font-serif text-[16px] font-semibold text-gray-800 mb-1">
            Tu panel todavía está vacío.
          </p>
          <p className="text-[13px] text-gray-500 mb-5">
            Seleccioná los mosaicos que querés visualizar.
          </p>
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-colors"
            style={{ background: '#0F6E56' }}
          >
            <SlidersHorizontal size={14} />
            Agregar mosaico
          </button>
        </div>
      )}

      {/* ── Error al guardar en modo edición ─────────────────────────────── */}
      {editMode && editSaveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="flex-shrink-0" />
          {editSaveError}
        </div>
      )}

      {/* ── Grid de mosaicos ───────────────────────────────────────────── */}
      {showGrid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedWidgets.map((widget, idx) => (
            editMode ? (
              <EditableWidgetCard
                key={widget.id}
                widget={widget}
                groupState={metricsByGroup[widget.group]}
                onRetry={() => retryGroup(widget.group)}
                onRemove={() => removeDraftWidget(widget.id)}
                isDragging={dragIndex === idx}
                isDragOver={dragOverIndex === idx}
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOverCard(idx)}
                onDrop={handleDrop(idx)}
                onDragEnd={handleDragEnd}
              />
            ) : (
              <WidgetCard
                key={widget.id}
                widget={widget}
                groupState={metricsByGroup[widget.group]}
                onRetry={() => retryGroup(widget.group)}
              />
            )
          ))}
          {!editMode && <AddWidgetCard onClick={() => setPanelOpen(true)} />}
        </div>
      )}

      {editMode && draftWidgets.length === 0 && (
        <p className="text-[12.5px] text-gray-400 text-center py-6">
          No hay mosaicos en el panel. Guardá para dejarlo vacío o cancelá y usá «Agregar mosaico».
        </p>
      )}

      <EditWidgetsPanel
        open={panelOpen}
        savedWidgets={savedWidgets}
        allowedModules={allowedModules}
        userRole={user?.role}
        saving={saving}
        saveError={saveError}
        onCancel={() => { setPanelOpen(false); setSaveError(null) }}
        onSave={handleSave}
      />

      {toast && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-lg z-[60]"
          style={{ background: '#04342C' }}
        >
          <CheckCircle2 size={15} style={{ color: '#5DCAA5' }} />
          {toast}
        </div>
      )}
    </div>
  )
}
