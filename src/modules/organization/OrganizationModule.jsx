import { useState, useEffect, useCallback } from 'react'
import {
  GitBranch, Shield, Layers, Plus, X, ChevronDown,
  Edit2, Save, Loader2, Building2, AlertTriangle,
  Mail, Phone
} from 'lucide-react'
import { api } from '../../lib/api'

// ── Constantes de estilos ─────────────────────────────────────

const NIVEL_CONFIG = {
  'Directivo':          { dot: '#7C3AED', badge: '#EDE9FE', text: '#6D28D9', avatar: 'linear-gradient(135deg,#7C3AED,#A78BFA)' },
  'Mandos Medios':      { dot: '#3B82F6', badge: '#DBEAFE', text: '#1D4ED8', avatar: 'linear-gradient(135deg,#1D4ED8,#60A5FA)' },
  'Operarios / Staff':  { dot: '#10B981', badge: '#D1FAE5', text: '#065F46', avatar: 'linear-gradient(135deg,#0F6E56,#5DCAA5)' },
  'Externo':            { dot: '#9CA3AF', badge: '#F3F4F6', text: '#6B7280', avatar: 'linear-gradient(135deg,#6B7280,#9CA3AF)' },
}

const PERMISO_CONFIG = {
  administrador: { bg: '#FEF9C3', color: '#713F12', label: 'Admin'      },
  editor:        { bg: '#D1FAE5', color: '#065F46', label: 'Editor'     },
  lector:        { bg: '#DBEAFE', color: '#1D4ED8', label: 'Lector'     },
  sin_acceso:    { bg: '#F3F4F6', color: '#9CA3AF', label: 'Sin acceso' },
  no_aplica:     { bg: '#F3F4F6', color: '#9CA3AF', label: 'No aplica'  },
}

const ALCANCE_CONFIG = {
  global:         { color: '#10B981', label: 'Global'         },
  subarbol:       { color: '#3B82F6', label: 'Subárbol'       },
  equipo_directo: { color: '#F59E0B', label: 'Equipo directo' },
  propio:         { color: '#8B5CF6', label: 'Propio'         },
}

const NIVELES   = ['Directivo', 'Mandos Medios', 'Operarios / Staff', 'Externo']
const PERMISOS  = ['sin_acceso', 'lector', 'editor', 'administrador']
const ALCANCES  = ['propio', 'equipo_directo', 'subarbol', 'global']

// Origen de una persona del organigrama: rbac (usuario), Sueldos (empleado), ambos, o carga manual/externa.
const ORIGEN_CONFIG = {
  usuario:  { bg: '#DBEAFE', color: '#1D4ED8', label: 'Usuario del sistema'   },
  empleado: { bg: '#FEF3C7', color: '#92400E', label: 'Empleado'              },
  ambos:    { bg: '#D1FAE5', color: '#065F46', label: 'Usuario + empleado'    },
  manual:   { bg: '#F3E8FF', color: '#6B21A8', label: 'Persona externa/manual' },
}

const MODULOS_PRINCIPALES = ['dashboard','finance','operations','crm','planification','reportes','usuarios','configuracion','organizacion']

const inputCls   = 'w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }
const selectCls  = `${inputCls} cursor-pointer appearance-none`

function getInitials(nombre = '') {
  const parts = nombre.split(' ').filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// Origen de un nodo del organigrama. Si el backend ya lo manda (campo `origen`),
// se respeta tal cual; si no (nodos/backends anteriores), se infiere por los ids presentes.
function getNodeOrigen(node) {
  if (node.origen) return node.origen
  if (node.usuario_id && node.empleado_id) return 'ambos'
  if (node.usuario_id) return 'usuario'
  if (node.empleado_id) return 'empleado'
  return 'manual'
}

// Normaliza los datos de la persona de un nodo: usa `usuarios`, y si no hay
// cae a `empleados`, y si tampoco hay (persona externa/manual) cae a los
// campos *_manual cargados directamente en el nodo. Si hay usuario y empleado,
// prioriza usuario para nombre/estado pero completa teléfono desde empleado.
function getNodePersona(node) {
  const u = node.usuarios || null
  const e = node.empleados || null
  if (u) {
    return {
      nombre:   u.nombre || (e ? `${e.nombre || ''} ${e.apellido || ''}`.trim() : '') || 'Sin nombre',
      email:    u.email    || e?.email    || null,
      telefono: u.telefono || e?.telefono || null,
      estado:   u.estado   || e?.estado   || null,
      rolNombre: u.roles?.nombre || null,
    }
  }
  if (e) {
    return {
      nombre:   `${e.nombre || ''} ${e.apellido || ''}`.trim() || 'Sin nombre',
      email:    e.email    || null,
      telefono: e.telefono || null,
      estado:   e.estado   || null,
      rolNombre: null,
    }
  }
  const nombreManual = `${node.nombre_manual || ''} ${node.apellido_manual || ''}`.trim()
  return {
    nombre:   nombreManual || 'Sin nombre',
    email:    node.email_manual    || null,
    telefono: node.telefono_manual || null,
    estado:   null,
    rolNombre: null,
  }
}

// ── Componente: tarjeta de nodo en el árbol ───────────────────

function OrgCard({ node, isSelected, onClick }) {
  const nivel   = node.nivel || 'Externo'
  const cfg     = NIVEL_CONFIG[nivel] || NIVEL_CONFIG['Externo']
  const persona = getNodePersona(node)
  const nombre  = persona.nombre
  const activo  = node.activo && (persona.estado ? persona.estado === 'Activo' : true)
  const origen  = getNodeOrigen(node)
  const origenCfg = ORIGEN_CONFIG[origen]

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all duration-150 select-none"
      style={{
        width: 148,
        background: '#fff',
        border: `2px solid ${isSelected ? '#0F6E56' : 'rgba(15,110,86,0.15)'}`,
        borderRadius: 14,
        padding: '10px 8px',
        textAlign: 'center',
        boxShadow: isSelected
          ? '0 4px 16px rgba(15,110,86,0.2)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
    >
      {/* Estado inactivo overlay */}
      {!activo && (
        <div
          className="absolute inset-0 rounded-xl bg-white/70 flex items-center justify-center"
          style={{ zIndex: 1 }}
        >
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">Inactivo</span>
        </div>
      )}

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-[12px] font-bold"
        style={{ background: cfg.avatar }}
      >
        {getInitials(nombre)}
      </div>

      {/* Dot indicador nivel */}
      <div
        className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{ background: cfg.dot }}
        title={nivel}
      />

      <p className="text-[11px] font-semibold text-gray-800 leading-tight truncate">{nombre}</p>
      {node.cargo && <p className="text-[10px] text-gray-500 truncate mt-0.5">{node.cargo}</p>}
      {node.area  && <p className="text-[9px] text-gray-400 truncate">{node.area}</p>}

      {(node.es_externo || origen !== 'usuario') && (
        <div className="flex flex-wrap gap-1 justify-center mt-1">
          {node.es_externo && (
            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: '#F3F4F6', color: '#6B7280' }}>
              Externo
            </span>
          )}
          {origen !== 'usuario' && (
            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: origenCfg.bg, color: origenCfg.color }}>
              {origenCfg.label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente: rama recursiva del árbol ──────────────────────

function TreeBranch({ node, allNodes, onSelect, selectedId }) {
  const children = allNodes.filter(n => n.superior_id === node.id)

  return (
    <div className="flex flex-col items-center" style={{ minWidth: 164 }}>
      <OrgCard
        node={node}
        isSelected={selectedId === node.id}
        onClick={() => onSelect(node)}
      />

      {children.length > 0 && (
        <>
          {/* Línea vertical hacia abajo */}
          <div style={{ width: 1, height: 22, background: '#CBD5E1' }} />

          {/* Fila de hijos con líneas horizontales */}
          <div className="org-children-row">
            {children.map(child => (
              <div key={child.id} className="org-child-col">
                <div className="org-child-connector" />
                <TreeBranch
                  node={child}
                  allNodes={allNodes}
                  onSelect={onSelect}
                  selectedId={selectedId}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Componente: panel de detalle del usuario ──────────────────

function UserDetailPanel({ node, permisos, modulos, orgNodes, user, onClose, onEditPermisos, onEditNodo }) {
  const [detailTab, setDetailTab] = useState('permisos')
  const persona = getNodePersona(node)
  const origen  = getNodeOrigen(node)
  const origenCfg = ORIGEN_CONFIG[origen]
  const nivel   = node.nivel || 'Externo'
  const cfg     = NIVEL_CONFIG[nivel] || NIVEL_CONFIG['Externo']
  const tienePermisos = !!node.usuario_id

  // Resolver nombre del superior desde el árbol
  const superiorNode   = orgNodes?.find(n => n.id === node.superior_id)
  const superiorNombre = superiorNode ? getNodePersona(superiorNode).nombre : null

  // permisos es la lista mezclada (usuario > rol > sin_acceso) por módulo
  const permisoMap = {}
  for (const p of permisos) {
    if (p.modulo_id) permisoMap[p.modulo_id] = p
  }

  const isSuperadmin = user?.role === 'Superadmin'

  return (
    <div
      className="flex flex-col h-full bg-white rounded-2xl border overflow-hidden"
      style={{ borderColor: 'rgba(15,110,86,0.15)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-[13px]"
            style={{ background: cfg.avatar }}
          >
            {getInitials(persona.nombre)}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">{persona.nombre}</p>
            <p className="text-[11px] text-gray-500">{node.cargo || persona.rolNombre || '—'}</p>
            <p className="text-[11px] text-gray-400">{node.area || '—'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <X size={16} />
        </button>
      </div>

      {/* Email / Teléfono */}
      <div className="px-4 pt-3 pb-0 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Mail size={12} className="text-gray-400" />
          <span className="text-[11px] text-gray-500">{persona.email || '—'}</span>
        </div>
        {persona.telefono && (
          <div className="flex items-center gap-1.5">
            <Phone size={12} className="text-gray-400" />
            <span className="text-[11px] text-gray-500">{persona.telefono}</span>
          </div>
        )}
      </div>

      {/* Badges: estado, nivel, origen */}
      <div className="px-4 pt-2 pb-3 flex items-center gap-2 flex-wrap">
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: persona.estado === 'Activo' ? '#E1F5EE' : '#F3F4F6',
            color:      persona.estado === 'Activo' ? '#0F6E56' : '#6B7280',
          }}
        >
          {persona.estado || '—'}
        </span>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: cfg.badge, color: cfg.text }}
        >
          {nivel}
        </span>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: origenCfg.bg, color: origenCfg.color }}
          title="Origen de la persona"
        >
          {origenCfg.label}
        </span>
      </div>

      {/* Info rápida */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-gray-400">Reporte a</p>
          <p className="text-gray-700 font-medium truncate">
            {node.superior_id
              ? (superiorNombre || 'Ver organigrama')
              : '— Raíz —'}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Tipo</p>
          <p className="text-gray-700 font-medium">{node.es_externo ? 'Externo' : 'Interno'}</p>
        </div>
        <div>
          <p className="text-gray-400">Ingreso</p>
          <p className="text-gray-700 font-medium">{node.fecha_inicio || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400">Vencimiento</p>
          <p className="text-gray-700 font-medium" style={{ color: node.fecha_fin ? '#EF4444' : undefined }}>
            {node.fecha_fin || '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-4 gap-4" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        {['permisos', 'informacion'].map(t => (
          <button
            key={t}
            onClick={() => setDetailTab(t)}
            className="pb-2 text-[12px] capitalize border-b-2 transition-colors"
            style={{
              borderColor:  detailTab === t ? '#0F6E56' : 'transparent',
              color:        detailTab === t ? '#0F6E56' : '#9CA3AF',
              fontWeight:   detailTab === t ? 600 : 400,
            }}
          >
            {t === 'permisos' ? 'Permisos' : 'Información'}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      <div className="flex-1 overflow-y-auto p-4">
        {detailTab === 'permisos' && !tienePermisos && (
          <div className="p-3 rounded-xl text-[12px] bg-gray-50 border text-gray-500" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
            Esta persona no posee usuario del sistema, por lo tanto no tiene permisos configurables.
          </div>
        )}

        {detailTab === 'permisos' && tienePermisos && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-gray-700">Permisos asignados</p>
              {isSuperadmin && (
                <button
                  onClick={onEditPermisos}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                  style={{ background: '#E1F5EE', color: '#0F6E56' }}
                >
                  <Edit2 size={11} />
                  Editar permisos
                </button>
              )}
            </div>

            {modulos.length === 0 ? (
              <p className="text-[12px] text-gray-400">Cargando módulos...</p>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-400 border-b" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
                    <th className="text-left py-1.5 font-medium">Módulo</th>
                    <th className="text-left py-1.5 font-medium">Permiso</th>
                    <th className="text-left py-1.5 font-medium">Alcance</th>
                  </tr>
                </thead>
                <tbody>
                  {modulos.filter(m => m.nombre !== 'organizacion').map(mod => {
                    const p       = permisoMap[mod.id]
                    const permiso = p?.permiso  || 'sin_acceso'
                    const alcance = p?.alcance  || null
                    const source  = p?.source   || 'ninguno'
                    const pc = PERMISO_CONFIG[permiso] || PERMISO_CONFIG.sin_acceso
                    const ac = alcance ? ALCANCE_CONFIG[alcance] : null
                    return (
                      <tr key={mod.id} className="border-b last:border-0" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                        <td className="py-1.5 font-medium text-gray-700 capitalize">{mod.label}</td>
                        <td className="py-1.5">
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: pc.bg, color: pc.color, opacity: source === 'rol' ? 0.8 : 1 }}
                            title={source === 'rol' ? 'Heredado del rol' : source === 'usuario' ? 'Permiso explícito' : undefined}
                          >
                            {pc.label}
                          </span>
                        </td>
                        <td className="py-1.5">
                          {ac ? (
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: ac.color }}>
                              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: ac.color }} />
                              {ac.label}
                            </span>
                          ) : source === 'rol' ? (
                            <span className="text-[9px] text-gray-400 italic">Del rol</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            <p className="text-[10px] text-gray-400 mt-3">Los permisos y alcances definen qué acciones puede realizar y sobre qué nivel de la organización.</p>
          </>
        )}

        {detailTab === 'informacion' && (
          <div className="space-y-3 text-[12px]">
            {isSuperadmin && (
              <div className="flex justify-end -mt-1 mb-1">
                <button
                  onClick={() => onEditNodo(node)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                  style={{ background: '#E1F5EE', color: '#0F6E56' }}
                >
                  <Edit2 size={11} />
                  Editar nodo
                </button>
              </div>
            )}
            <Row label="Nivel"        value={nivel} />
            <Row label="Área"         value={node.area || '—'} />
            <Row label="Cargo"        value={node.cargo || '—'} />
            <Row label="Tipo"         value={node.es_externo ? 'Externo' : 'Interno'} />
            <Row label="Origen"       value={origenCfg.label} />
            <Row label="Rol sistema"  value={persona.rolNombre || '—'} />
            <Row label="Fecha ingreso" value={node.fecha_inicio || '—'} />
            <Row label="Vencimiento"  value={node.fecha_fin || 'Sin límite'} highlight={!!node.fecha_fin} />
            <Row label="Estado nodo"  value={node.activo ? 'Activo' : 'Inactivo'} />
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-1 border-b" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-800" style={highlight ? { color: '#EF4444' } : {}}>
        {value}
      </span>
    </div>
  )
}

// ── Componente: modal editar permisos ─────────────────────────

function ModalEditPermisos({ usuario, permisos, modulos, onSave, onClose, saving }) {
  const [form, setForm] = useState(() => {
    const map = {}
    for (const p of permisos) map[p.modulo_id] = { permiso: p.permiso, alcance: p.alcance }
    return map
  })

  const handleChange = (moduloId, field, value) => {
    setForm(prev => ({
      ...prev,
      [moduloId]: { ...prev[moduloId], [field]: value },
    }))
  }

  const handleSave = () => {
    const payload = modulos
      .filter(m => m.nombre !== 'organizacion')
      .map(m => ({
        modulo_id: m.id,
        permiso: form[m.id]?.permiso || 'sin_acceso',
        alcance: form[m.id]?.alcance || 'propio',
      }))
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(15,110,86,0.12)' }}>
          <div>
            <p className="text-[15px] font-semibold text-gray-900">Editar permisos</p>
            <p className="text-[12px] text-gray-500">{usuario?.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-5">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-gray-400 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                <th className="text-left py-2 font-medium">Módulo</th>
                <th className="text-left py-2 font-medium">Permiso</th>
                <th className="text-left py-2 font-medium">Alcance</th>
              </tr>
            </thead>
            <tbody>
              {modulos.filter(m => m.nombre !== 'organizacion').map(mod => (
                <tr key={mod.id} className="border-b last:border-0" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                  <td className="py-2 font-medium text-gray-700 capitalize">{mod.label}</td>
                  <td className="py-2 pr-2">
                    <select
                      value={form[mod.id]?.permiso || 'sin_acceso'}
                      onChange={e => handleChange(mod.id, 'permiso', e.target.value)}
                      className={selectCls} style={inputStyle}
                    >
                      {PERMISOS.map(p => (
                        <option key={p} value={p}>{PERMISO_CONFIG[p]?.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <select
                      value={form[mod.id]?.alcance || 'propio'}
                      onChange={e => handleChange(mod.id, 'alcance', e.target.value)}
                      disabled={(form[mod.id]?.permiso || 'sin_acceso') === 'sin_acceso'}
                      className={selectCls} style={inputStyle}
                    >
                      {ALCANCES.map(a => (
                        <option key={a} value={a}>{ALCANCE_CONFIG[a]?.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'rgba(15,110,86,0.25)', color: '#4B5563' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] text-white font-medium transition-colors"
            style={{ background: '#0F6E56' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente: modal crear/editar nodo ───────────────────────

const ORIGEN_FILTROS = [
  { id: 'todos',    label: 'Todos'     },
  { id: 'usuario',  label: 'Usuarios'  },
  { id: 'empleado', label: 'Empleados' },
]

const personaKey = (p) => `${p.usuario_id || ''}|${p.empleado_id || ''}`

function ModalNodo({ nodo, personas, orgNodes, onSave, onClose, saving }) {
  const isEdit = !!nodo?.id
  const [form, setForm] = useState({
    usuario_id:   nodo?.usuario_id  || '',
    empleado_id:  nodo?.empleado_id || '',
    superior_id:  nodo?.superior_id || '',
    nivel:        nodo?.nivel       || 'Operarios / Staff',
    area:         nodo?.area        || '',
    cargo:        nodo?.cargo       || '',
    es_externo:   nodo?.es_externo  ?? false,
    fecha_inicio: nodo?.fecha_inicio || '',
    fecha_fin:    nodo?.fecha_fin    || '',
    nombre_manual:   nodo?.nombre_manual   || '',
    apellido_manual: nodo?.apellido_manual || '',
    email_manual:    nodo?.email_manual    || '',
    telefono_manual: nodo?.telefono_manual || '',
  })
  const [personaKeySel, setPersonaKeySel] = useState('')
  const [origenFiltro, setOrigenFiltro]   = useState('todos')
  const [modoPersona, setModoPersona]     = useState('existente') // 'existente' | 'manual'

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSelectPersona = (key) => {
    const p = personas.find(x => personaKey(x) === key)
    setPersonaKeySel(key)
    setForm(prev => ({ ...prev, usuario_id: p?.usuario_id || '', empleado_id: p?.empleado_id || '' }))
  }

  // Backend ya excluye personas con nodo asignado en /personas-asignables
  const personasFiltradas = personas.filter(p => {
    if (origenFiltro === 'todos') return true
    if (origenFiltro === 'usuario')  return p.origen === 'usuario'  || p.origen === 'ambos'
    if (origenFiltro === 'empleado') return p.origen === 'empleado' || p.origen === 'ambos'
    return true
  })

  // Posibles superiores (excluir el mismo nodo)
  const posiblesSuperiores = orgNodes.filter(n => n.id !== nodo?.id)

  const personaValida = isEdit
    ? true
    : modoPersona === 'manual'
      ? !!form.nombre_manual.trim()
      : (!!form.usuario_id || !!form.empleado_id)

  const handleGuardar = () => {
    // Persona manual/externa: no se envían usuario_id/empleado_id, solo los *_manual.
    if (!isEdit && modoPersona === 'manual') {
      const { usuario_id, empleado_id, ...resto } = form
      onSave({
        ...resto,
        nombre_manual:   form.nombre_manual.trim(),
        apellido_manual: form.apellido_manual.trim() || null,
        email_manual:    form.email_manual.trim()    || null,
        telefono_manual: form.telefono_manual.trim() || null,
      })
      return
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(15,110,86,0.12)' }}>
          <p className="text-[15px] font-semibold text-gray-900">
            {isEdit ? 'Editar nodo' : 'Agregar al organigrama'}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto max-h-[65vh] p-5 space-y-4">
          {/* Persona (usuario del sistema, empleado de Sueldos, o carga manual/externa) */}
          {!isEdit && (
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Persona *</label>

              <div className="flex gap-1.5 mb-2">
                <button type="button" onClick={() => setModoPersona('existente')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors"
                  style={modoPersona === 'existente'
                    ? { background: '#0F6E56', borderColor: '#0F6E56', color: '#fff' }
                    : { background: '#fff', borderColor: 'rgba(15,110,86,0.2)', color: '#4B5563' }
                  }
                >
                  Persona existente
                </button>
                <button type="button" onClick={() => setModoPersona('manual')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors"
                  style={modoPersona === 'manual'
                    ? { background: '#0F6E56', borderColor: '#0F6E56', color: '#fff' }
                    : { background: '#fff', borderColor: 'rgba(15,110,86,0.2)', color: '#4B5563' }
                  }
                >
                  Persona externa / manual
                </button>
              </div>

              {modoPersona === 'existente' ? (
                <>
                  <div className="flex gap-1.5 mb-2">
                    {ORIGEN_FILTROS.map(f2 => (
                      <button
                        key={f2.id}
                        type="button"
                        onClick={() => setOrigenFiltro(f2.id)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors"
                        style={origenFiltro === f2.id
                          ? { background: '#0F6E56', borderColor: '#0F6E56', color: '#fff' }
                          : { background: '#fff', borderColor: 'rgba(15,110,86,0.2)', color: '#4B5563' }
                        }
                      >
                        {f2.label}
                      </button>
                    ))}
                  </div>

                  <select value={personaKeySel} onChange={e => handleSelectPersona(e.target.value)}
                    className={selectCls} style={inputStyle}>
                    <option value="">Seleccionar persona...</option>
                    {personasFiltradas.map(p => (
                      <option key={personaKey(p)} value={personaKey(p)}>
                        {p.nombre} — {p.email} ({ORIGEN_CONFIG[p.origen]?.label || p.origen})
                      </option>
                    ))}
                  </select>
                  {personasFiltradas.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">No hay personas disponibles para agregar con este filtro.</p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Nombre *</label>
                    <input value={form.nombre_manual} onChange={e => f('nombre_manual', e.target.value)}
                      className={inputCls} style={inputStyle} placeholder="Nombre" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Apellido</label>
                      <input value={form.apellido_manual} onChange={e => f('apellido_manual', e.target.value)}
                        className={inputCls} style={inputStyle} placeholder="Opcional" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Email</label>
                      <input type="email" value={form.email_manual} onChange={e => f('email_manual', e.target.value)}
                        className={inputCls} style={inputStyle} placeholder="Opcional" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Teléfono</label>
                    <input value={form.telefono_manual} onChange={e => f('telefono_manual', e.target.value)}
                      className={inputCls} style={inputStyle} placeholder="Opcional" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nivel */}
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Nivel *</label>
            <select value={form.nivel} onChange={e => f('nivel', e.target.value)}
              className={selectCls} style={inputStyle}>
              {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Superior jerárquico */}
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Reporta a (superior directo)</label>
            <select value={form.superior_id} onChange={e => f('superior_id', e.target.value)}
              className={selectCls} style={inputStyle}>
              <option value="">— Raíz (sin superior) —</option>
              {posiblesSuperiores.map(n => (
                <option key={n.id} value={n.id}>
                  {getNodePersona(n).nombre} – {n.nivel}
                </option>
              ))}
            </select>
          </div>

          {/* Cargo y Área */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Cargo</label>
              <input value={form.cargo} onChange={e => f('cargo', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="Ej: CFO" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Área</label>
              <input value={form.area} onChange={e => f('area', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="Ej: Finanzas" />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Fecha de ingreso</label>
              <input type="date" value={form.fecha_inicio} onChange={e => f('fecha_inicio', e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Vencimiento
                <span className="text-gray-400 font-normal ml-1">(solo externos)</span>
              </label>
              <input type="date" value={form.fecha_fin} onChange={e => f('fecha_fin', e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* Externo */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.es_externo}
              onChange={e => f('es_externo', e.target.checked)}
              className="w-4 h-4 rounded accent-teal-700" />
            <span className="text-[12px] text-gray-600">Es una persona externa</span>
          </label>

          {form.fecha_fin && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 text-[11px]">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              El nodo será desactivado automáticamente al vencer la fecha indicada.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'rgba(15,110,86,0.25)', color: '#4B5563' }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving || !personaValida}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] text-white font-medium transition-colors disabled:opacity-50"
            style={{ background: '#0F6E56' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? 'Actualizar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente: matriz de permisos ────────────────────────────

function MatrizPermisos({ usuarios, permisos, modulos, rolPermisos = [], personas }) {
  const modulosFiltrados = modulos.filter(m =>
    ['dashboard','finance','operations','crm','planification','reportes','usuarios'].includes(m.nombre)
  )

  // Resuelve el permiso efectivo de un usuario: usuario > rol > sin_acceso
  const getPermisoUsuario = (usuarioId, moduloId) => {
    const up = permisos.find(x => x.usuario_id === usuarioId && x.modulo_id === moduloId)
    if (up) return { permiso: up.permiso, alcance: up.alcance, source: 'usuario' }

    const usuario = usuarios.find(u => u.id === usuarioId)
    if (usuario?.rol_id) {
      const rp = rolPermisos.find(x => x.rol_id === usuario.rol_id && x.modulo_id === moduloId)
      if (rp?.puede_ver) {
        return {
          permiso: rp.puede_editar ? 'editor' : 'lector',
          alcance: 'global',
          source:  'rol',
        }
      }
    }
    return { permiso: 'sin_acceso', alcance: null, source: 'ninguno' }
  }

  // Filas: si el backend manda `personas` (usuarios + empleados sin usuario + manuales),
  // se usa eso. Si no, se mantiene compatibilidad con el shape anterior (solo usuarios).
  const filas = personas && personas.length > 0
    ? personas
    : usuarios.map(u => ({ id: u.id, nombre: u.nombre, origen: 'usuario', usuario_id: u.id, roles: u.roles }))

  const getPermisoFila = (fila, moduloId) => {
    // El backend ya puede traer el permiso resuelto por persona (incluye 'no_aplica').
    if (Array.isArray(fila.permisos)) {
      const p = fila.permisos.find(x => x.modulo_id === moduloId)
      if (p) return { permiso: p.permiso, alcance: p.alcance || null, source: p.source || 'usuario' }
    }
    if (!fila.usuario_id) return { permiso: 'no_aplica', alcance: null, source: 'no_aplica' }
    return getPermisoUsuario(fila.usuario_id, moduloId)
  }

  if (filas.length === 0) {
    return <div className="p-6 text-center text-gray-400 text-[13px]">No hay personas para mostrar en la matriz.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]" style={{ minWidth: 600 }}>
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <th className="text-left py-2 px-3 font-medium text-gray-500 w-40">Persona</th>
            {modulosFiltrados.map(m => (
              <th key={m.id} className="text-center py-2 px-1 font-medium text-gray-500 capitalize">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map(fila => (
            <tr key={fila.id ?? fila.usuario_id} className="border-b last:border-0 hover:bg-gray-50/50"
              style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
              <td className="py-2 px-3">
                <p className="font-medium text-gray-800 truncate max-w-[140px]">{fila.nombre}</p>
                <p className="text-gray-400 text-[10px]">{fila.roles?.nombre || ORIGEN_CONFIG[fila.origen]?.label || '—'}</p>
              </td>
              {modulosFiltrados.map(m => {
                const { permiso, alcance, source } = getPermisoFila(fila, m.id)
                const cfg = PERMISO_CONFIG[permiso] || PERMISO_CONFIG.sin_acceso
                const ac  = alcance ? ALCANCE_CONFIG[alcance] : null
                return (
                  <td key={m.id} className="py-2 px-1 text-center">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        background: cfg.bg,
                        color:      cfg.color,
                        // Rol-based permissions shown slightly faded to distinguish from explicit
                        opacity: source === 'rol' ? 0.75 : 1,
                      }}
                      title={source === 'rol' ? `Heredado del rol (${alcance || 'global'})` : alcance ? `Alcance: ${ac?.label || alcance}` : undefined}
                    >
                      {cfg.label}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Componente: panel de roles predefinidos ───────────────────

function PanelRoles({ roles, user, onNuevoRol }) {
  const [selectedRol, setSelectedRol] = useState(null)
  const isSuperadmin = user?.role === 'Superadmin'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-semibold text-gray-900">Roles predefinidos</p>
          <p className="text-[11px] text-gray-500">Plantillas de permisos para asignación rápida</p>
        </div>
        {isSuperadmin && (
          <button
            onClick={onNuevoRol}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-white"
            style={{ background: '#0F6E56' }}
          >
            <Plus size={13} /> Nuevo Rol
          </button>
        )}
      </div>

      <div className="space-y-2">
        {roles.map(rol => {
          const cantMod = rol.permisos?.filter(p => p.puede_ver).length || 0
          const isSelected = selectedRol?.id === rol.id
          return (
            <div key={rol.id}>
              <button
                onClick={() => setSelectedRol(isSelected ? null : rol)}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all"
                style={{
                  borderColor: isSelected ? '#0F6E56' : 'rgba(15,110,86,0.12)',
                  background:  isSelected ? '#F0FDF4' : '#fff',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: isSelected ? '#E1F5EE' : '#F3F4F6' }}
                  >
                    <Shield size={15} style={{ color: isSelected ? '#0F6E56' : '#9CA3AF' }} />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-gray-800">{rol.nombre}</p>
                    <p className="text-[10px] text-gray-500">{rol.descripcion || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{cantMod} módulos</span>
                  <ChevronDown size={13} className="text-gray-400" style={{ transform: isSelected ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </div>
              </button>

              {isSelected && (
                <div className="mt-1 mx-2 p-3 rounded-xl border text-[11px] space-y-1"
                  style={{ borderColor: 'rgba(15,110,86,0.1)', background: '#FAFAFA' }}>
                  {rol.permisos?.length === 0
                    ? <p className="text-gray-400">Sin permisos definidos.</p>
                    : rol.permisos?.filter(p => p.puede_ver).map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-gray-600 capitalize">{p.modulos?.label || p.modulos?.nombre}</span>
                        <span className="font-medium" style={{ color: p.puede_editar ? '#065F46' : '#3B82F6' }}>
                          {p.puede_editar ? 'Editor' : 'Lector'}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-3">
        Los roles son plantillas iniciales. Podés personalizar los permisos por usuario desde el organigrama.
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export default function OrganizationModule({ user }) {
  const [activeTab, setActiveTab]               = useState('organigrama')
  const [orgNodes,  setOrgNodes]                = useState([])
  const [personas,  setPersonas]                = useState([])
  const [modulos,   setModulos]                 = useState([])
  const [roles,     setRoles]                   = useState([])
  const [matrizData, setMatrizData]             = useState({ usuarios: [], permisos: [], modulos: [], rolPermisos: [], personas: [] })
  const [selectedNode,   setSelectedNode]       = useState(null)
  const [selectedPermisos, setSelectedPermisos] = useState([])
  const [loading, setLoading]                   = useState(true)
  const [loadingPermisos, setLoadingPermisos]   = useState(false)
  const [saving,  setSaving]                    = useState(false)
  const [error,   setError]                     = useState(null)
  const [showModalNodo, setShowModalNodo]       = useState(false)
  const [editingNodo, setEditingNodo]           = useState(null)
  const [showModalPermisos, setShowModalPermisos] = useState(false)

  const isSuperadmin = user?.role === 'Superadmin'

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orgRes, modRes, rolesRes] = await Promise.allSettled([
        api.getOrganigrama(),
        api.getModulosOrganizacion(),
        api.getRolesPredefinidos(),
      ])

      if (orgRes.status   === 'fulfilled') setOrgNodes(orgRes.value.data   ?? [])
      if (modRes.status   === 'fulfilled') setModulos(modRes.value.data    ?? [])
      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value.data    ?? [])
    } catch (err) {
      setError('Error al cargar datos de organización.')
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarPersonasAsignables = useCallback(async () => {
    try {
      const res = await api.getPersonasAsignables()
      setPersonas(res.data ?? [])
    } catch { /* silencioso */ }
  }, [])

  const cargarMatriz = useCallback(async () => {
    try {
      const res = await api.getMatrizPermisos()
      setMatrizData(res)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (showModalNodo) cargarPersonasAsignables()
  }, [showModalNodo, cargarPersonasAsignables])

  useEffect(() => {
    if (activeTab === 'roles' || activeTab === 'organigrama') cargarMatriz()
  }, [activeTab, cargarMatriz])

  // Cargar permisos cuando se selecciona un nodo (solo aplica a nodos con usuario del sistema)
  useEffect(() => {
    if (!selectedNode) return
    if (!selectedNode.usuario_id) { setSelectedPermisos([]); return }
    setLoadingPermisos(true)
    api.getPermisosUsuario(selectedNode.usuario_id)
      .then(res => setSelectedPermisos(res.data ?? []))
      .catch(() => setSelectedPermisos([]))
      .finally(() => setLoadingPermisos(false))
  }, [selectedNode])

  const handleSelectNode = (node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }

  const handleSaveNodo = async (form) => {
    setSaving(true)
    try {
      if (editingNodo?.id) {
        await api.actualizarNodoOrganigrama(editingNodo.id, form)
      } else {
        await api.crearNodoOrganigrama(form)
      }
      await cargar()
      setShowModalNodo(false)
      setEditingNodo(null)
      if (selectedNode?.id === editingNodo?.id) setSelectedNode(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSavePermisos = async (permisos) => {
    if (!selectedNode?.usuario_id) return
    setSaving(true)
    try {
      await api.actualizarPermisosUsuario(selectedNode.usuario_id, { permisos })
      setShowModalPermisos(false)
      // Recargar permisos del panel lateral con el fallback actualizado
      const res = await api.getPermisosUsuario(selectedNode.usuario_id)
      setSelectedPermisos(res.data ?? [])
      // Actualizar también la matriz
      await cargarMatriz()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditNodo = (node) => {
    setEditingNodo(node)
    setShowModalNodo(true)
  }

  const TABS = [
    { id: 'organigrama', label: 'Organigrama',      icon: GitBranch },
    { id: 'roles',       label: 'Roles y Permisos',  icon: Shield    },
    { id: 'modulos',     label: 'Módulos',            icon: Layers    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-teal-700" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[20px] font-semibold text-gray-900">Organización y Permisos</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Gestioná la estructura organizacional, roles y permisos del sistema</p>
        </div>
        {isSuperadmin && (
          <button
            onClick={() => { setEditingNodo(null); setShowModalNodo(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white transition-all"
            style={{ background: '#0F6E56' }}
          >
            <Plus size={15} /> Agregar al organigrama
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-[12px]">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(15,110,86,0.13)' }}>
        <div className="flex border-b px-1" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-3.5 text-[13px] border-b-2 transition-colors"
              style={{
                borderColor: activeTab === id ? '#0F6E56' : 'transparent',
                color:       activeTab === id ? '#0F6E56' : '#9CA3AF',
                fontWeight:  activeTab === id ? 600 : 400,
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB: Organigrama ─────────────────────────── */}
        {activeTab === 'organigrama' && (
          <div>
            <div className="flex gap-0" style={{ minHeight: 400 }}>
              {/* Árbol principal */}
              <div className="flex-1 overflow-auto p-6 relative">
                {/* Leyenda de niveles */}
                <div className="flex items-center gap-4 mb-5 flex-wrap">
                  {NIVELES.map(n => {
                    const cfg = NIVEL_CONFIG[n]
                    return (
                      <div key={n} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                        {n}
                      </div>
                    )
                  })}
                </div>

                {orgNodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Building2 size={32} className="text-gray-300 mb-3" />
                    <p className="text-[13px] font-medium text-gray-500">El organigrama está vacío</p>
                    {isSuperadmin && (
                      <p className="text-[12px] text-gray-400 mt-1">
                        Presioná <strong>Agregar al organigrama</strong> para agregar el primer nodo.
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 'max-content' }}>
                    {/* Raíces del árbol */}
                    {(() => {
                      const roots = orgNodes.filter(n => !n.superior_id)
                      if (roots.length === 0) {
                        // Si hay nodos pero ninguno es raíz (estado inconsistente), mostrarlos igual
                        return (
                          <div className="flex gap-8 flex-wrap justify-center">
                            {orgNodes.map(n => (
                              <TreeBranch key={n.id} node={n} allNodes={orgNodes} onSelect={handleSelectNode} selectedId={selectedNode?.id} />
                            ))}
                          </div>
                        )
                      }
                      if (roots.length === 1) {
                        return <TreeBranch node={roots[0]} allNodes={orgNodes} onSelect={handleSelectNode} selectedId={selectedNode?.id} />
                      }
                      return (
                        <div className="flex gap-8 flex-wrap justify-center">
                          {roots.map(r => (
                            <TreeBranch key={r.id} node={r} allNodes={orgNodes} onSelect={handleSelectNode} selectedId={selectedNode?.id} />
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Panel de detalle */}
              {selectedNode && (
                <div className="flex-shrink-0 border-l p-4" style={{ width: 400, borderColor: 'rgba(15,110,86,0.1)' }}>
                  {loadingPermisos ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 size={20} className="animate-spin text-teal-700" />
                    </div>
                  ) : (
                    <UserDetailPanel
                      node={selectedNode}
                      permisos={selectedPermisos}
                      modulos={modulos}
                      orgNodes={orgNodes}
                      user={user}
                      onClose={() => setSelectedNode(null)}
                      onEditPermisos={() => setShowModalPermisos(true)}
                      onEditNodo={handleEditNodo}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Alcances leyenda */}
            <div className="flex items-center gap-4 px-6 pb-4 border-t pt-3 flex-wrap" style={{ borderColor: 'rgba(15,110,86,0.07)' }}>
              <span className="text-[11px] text-gray-400 font-medium mr-1">Alcances:</span>
              {Object.entries(ALCANCE_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1 text-[11px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                  <span style={{ color: v.color }}>{v.label}</span>
                </div>
              ))}
            </div>

            {/* Matriz de permisos (solo Superadmin) */}
            {isSuperadmin && orgNodes.length > 0 && (
              <div className="border-t mx-6 pb-6" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                <div className="pt-5 mb-3">
                  <p className="text-[13px] font-semibold text-gray-900">Matriz de permisos por módulo</p>
                  <p className="text-[11px] text-gray-500">Vista rápida de permisos por usuario</p>
                </div>
                <MatrizPermisos
                  usuarios={matrizData.usuarios}
                  permisos={matrizData.permisos}
                  modulos={matrizData.modulos}
                  rolPermisos={matrizData.rolPermisos}
                  personas={matrizData.personas}
                />
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Roles y Permisos ─────────────────────── */}
        {activeTab === 'roles' && (
          <div className="p-6">
            <PanelRoles roles={roles} user={user} onNuevoRol={() => alert('Próximamente: crear rol personalizado')} />
            <p className="text-[11px] text-gray-400 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(15,110,86,0.08)' }}>
              La vista completa de permisos por usuario se encuentra en la pestaña <strong>Organigrama</strong>, sección "Matriz de permisos por módulo".
            </p>
          </div>
        )}

        {/* ── TAB: Módulos ─────────────────────────────── */}
        {activeTab === 'modulos' && (
          <div className="p-6">
            <p className="text-[13px] font-semibold text-gray-900 mb-4">Módulos del sistema</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modulos.map(m => (
                <div key={m.id}
                  className="p-4 rounded-xl border"
                  style={{ borderColor: 'rgba(15,110,86,0.12)', background: '#FAFAFA' }}>
                  <p className="text-[13px] font-semibold text-gray-800 capitalize">{m.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{m.descripcion || '—'}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">{m.nombre}</p>
                </div>
              ))}
              {modulos.length === 0 && (
                <p className="text-[12px] text-gray-400 col-span-3">No se encontraron módulos.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {showModalNodo && (
        <ModalNodo
          nodo={editingNodo}
          personas={personas}
          orgNodes={orgNodes}
          onSave={handleSaveNodo}
          onClose={() => { setShowModalNodo(false); setEditingNodo(null) }}
          saving={saving}
        />
      )}

      {showModalPermisos && selectedNode?.usuario_id && (
        <ModalEditPermisos
          usuario={selectedNode.usuarios}
          permisos={selectedPermisos}
          modulos={modulos}
          onSave={handleSavePermisos}
          onClose={() => setShowModalPermisos(false)}
          saving={saving}
        />
      )}
    </div>
  )
}
