import { useState, useEffect, useCallback } from 'react'
import { Plus, MoreVertical, X, ChevronDown } from 'lucide-react'
import { api } from '../lib/api'
import { validateUserForm } from '../utils/validators'
import AppModal from './AppModal'

const ROL_STYLE = {
  'Dirección': { background: '#E1F5EE', color: '#0F6E56' },
  'Operativo': { background: '#EFF6FF', color: '#1D4ED8' },
  'Financiero': { background: '#FEF3C7', color: '#92400E' },
  'CRM':        { background: '#FCE7F3', color: '#9D174D' },
  'Superadmin': { background: '#FEF9C3', color: '#713F12' },
}

const ESTADO_STYLE = {
  'Activo':   { background: '#E1F5EE', color: '#0F6E56',  dot: '#22C55E' },
  'Inactivo': { background: '#F3F4F6', color: '#6B7280',  dot: '#9CA3AF' },
}

const AVATAR_GRADIENTS = [
  ['#1D9E75', '#5DCAA5'],
  ['#6366F1', '#818CF8'],
  ['#EC4899', '#F472B6'],
  ['#F59E0B', '#FCD34D'],
  ['#3B82F6', '#93C5FD'],
  ['#8B5CF6', '#C4B5FD'],
]

function getInitials(nombre = '', apellido = '') {
  const first = nombre[0] ?? ''
  const last  = apellido[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

function getGradient(index) {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
}

const inputCls =
  'w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

const COLUMNS = ['Usuario', 'Email', 'Rol', 'Estado', '']

export default function Usuarios({ user }) {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [openMenu, setOpenMenu] = useState(null)
  const [modal, setModal]       = useState(null) // null | 'nuevo' | usuario-object
  const [form, setForm]         = useState({ email: '', nombre: '', rol_id: '', estado: 'Activo' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  // ── Permission helpers ────────────────────────────────────────
  const isCurrentUser = (u) => u.email === user?.email

  const canEditUser = (u) => {
    if (!user?.role) return false
    if (user.role === 'Superadmin') return true
    if (user.role === 'Dirección') return isCurrentUser(u)
    return false
  }

  const canDeleteUser = (u) => {
    if (!user?.role) return false
    if (user.role === 'Superadmin') return !isCurrentUser(u)
    return false
  }

  const hasUserActions = (u) => canEditUser(u) || canDeleteUser(u)
  // ─────────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [ru, rr] = await Promise.allSettled([api.getUsuarios(), api.getRoles()])
      if (ru.status === 'fulfilled') setUsuarios(ru.value.data)
      if (rr.status === 'fulfilled') setRoles(rr.value.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => {
    setForm({ email: '', nombre: '', rol_id: roles[0]?.id || '', estado: 'Activo' })
    setError(null)
    setModal('nuevo')
  }

  const abrirEditar = (u) => {
    if (!canEditUser(u)) return
    setForm({ email: u.email, nombre: u.nombre, rol_id: u.rol_id, estado: u.estado })
    setError(null)
    setModal(u)
    setOpenMenu(null)
  }

  const guardar = async (e) => {
    e.preventDefault()
    // Re-check permission before submitting
    if (modal !== 'nuevo' && !canEditUser(modal)) {
      setError('No tenés permisos para editar este usuario.')
      return
    }
    // Validación de campos antes de enviar
    const validationErrors = validateUserForm(form)
    if (validationErrors.length > 0) {
      setError(validationErrors[0])
      return
    }
    setSaving(true); setError(null)
    try {
      if (modal === 'nuevo') {
        await api.crearUsuario(form)
      } else {
        await api.editarUsuario(modal.id, form)
      }
      setModal(null)
      cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (u) => {
    if (!canDeleteUser(u)) return
    setOpenMenu(null)
    if (!confirm('¿Eliminar este usuario?')) return
    try { await api.eliminarUsuario(u.id); cargar() }
    catch (err) { alert(err.message) }
  }

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fade-in space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[20px] font-semibold text-gray-900">Gestión de usuarios</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {loading ? '…' : `${usuarios.length} usuarios registrados`}
          </p>
        </div>
        {user?.role === 'Superadmin' && (
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium shadow-sm transition-colors"
            style={{ background: '#0F6E56' }}
          >
            <Plus size={15} /> Nuevo usuario
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl border shadow-sm overflow-hidden"
        style={{ borderColor: 'rgba(15,110,86,0.1)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                {COLUMNS.map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-[13px]">Cargando…</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-[13px]">Sin usuarios registrados</td></tr>
              ) : usuarios.map((u, i) => {
                const rolNombre   = u.roles?.nombre || '—'
                const rolStyle    = ROL_STYLE[rolNombre] || ROL_STYLE['Operativo']
                const estadoStyle = ESTADO_STYLE[u.estado] || ESTADO_STYLE['Inactivo']
                const grad        = getGradient(i)
                const initials    = getInitials(u.nombre.split(' ')[0], u.nombre.split(' ').slice(-1)[0])
                const menuOpen    = openMenu === u.id
                const showActions = hasUserActions(u)

                return (
                  <tr
                    key={u.id}
                    className="border-b hover:bg-gray-50/50 transition-colors group relative"
                    style={{ borderColor: 'rgba(15,110,86,0.06)' }}
                  >
                    {/* Usuario */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                          style={{ background: `linear-gradient(135deg,${grad[0]},${grad[1]})` }}
                        >
                          {initials}
                        </div>
                        <span className="font-medium text-gray-900 whitespace-nowrap">{u.nombre}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">{u.email}</td>

                    {/* Rol */}
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium whitespace-nowrap"
                        style={rolStyle}
                      >
                        {rolNombre}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium"
                        style={{ background: estadoStyle.background, color: estadoStyle.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: estadoStyle.dot }} />
                        {u.estado}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4">
                      {showActions && (
                        <div className={`flex justify-end relative transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button
                            onClick={() => setOpenMenu(menuOpen ? null : u.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <MoreVertical size={15} />
                          </button>
                          {menuOpen && (
                            <div
                              className="absolute right-0 top-8 z-20 bg-white border rounded-xl shadow-lg py-1 w-36"
                              style={{ borderColor: 'rgba(15,110,86,0.12)' }}
                            >
                              {canEditUser(u) && (
                                <button
                                  onClick={() => abrirEditar(u)}
                                  className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                >
                                  Editar
                                </button>
                              )}
                              {canDeleteUser(u) && (
                                <button
                                  onClick={() => eliminar(u)}
                                  className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Click-outside close for menu */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}

      {/* Modal crear/editar */}
      {modal && (
        <AppModal onClose={() => setModal(null)} maxWidth="max-w-sm">
          <div className="h-[3px]" style={{ background: 'linear-gradient(90deg,#1D9E75,#5DCAA5)' }} />
          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-semibold text-[17px] text-gray-900">
                {modal === 'nuevo' ? 'Nuevo usuario' : 'Editar usuario'}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={guardar} className="space-y-3">
              <div>
                <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Nombre *</label>
                <input value={form.nombre} onChange={e => set('nombre')(e.target.value)}
                  required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Email *</label>
                <input type="email" value={form.email} onChange={e => set('email')(e.target.value)}
                  required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Rol *</label>
                <div className="relative">
                  <select value={form.rol_id} onChange={e => set('rol_id')(e.target.value)}
                    required className={inputCls + ' appearance-none pr-8'} style={inputStyle}>
                    <option value="">Seleccionar rol</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">Estado</label>
                <div className="relative">
                  <select value={form.estado} onChange={e => set('estado')(e.target.value)}
                    className={inputCls + ' appearance-none pr-8'} style={inputStyle}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              {error && (
                <p className="text-[12.5px] text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 hover:bg-gray-50"
                  style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm disabled:opacity-60"
                  style={{ background: '#0F6E56' }}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}
    </div>
  )
}
