import { supabase, API_URL } from './supabase'

function getSessionCache() {
  try {
    const raw = localStorage.getItem('nexacore_session')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const { role, email } = getSessionCache()
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(role  ? { 'X-User-Role':   role  } : {}),
    ...(email ? { 'X-User-Email':  email } : {}),
  }
}

async function request(path, options = {}) {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud')
  return data
}

async function requestMultipart(path, method, formData) {
  const authHeaders = await getAuthHeaders()
  // No incluir Content-Type: fetch lo setea automáticamente para FormData
  delete authHeaders['Content-Type']
  const res = await fetch(`${API_URL}${path}`, {
    method,
    body: formData,
    headers: authHeaders,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud')
  return data
}

export const api = {
  // ── Finance ──────────────────────────────────────
  getMovimientos: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'Todos'))
    ).toString()
    return request(`/api/finance/movimientos${qs ? `?${qs}` : ''}`)
  },
  getMetricas: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return request(`/api/finance/movimientos/metricas${qs ? `?${qs}` : ''}`)
  },
  getFlujo: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return request(`/api/finance/movimientos/flujo${qs ? `?${qs}` : ''}`)
  },
  getMovimiento: (id) => request(`/api/finance/movimientos/${id}`),
  getTrazabilidad: () => request('/api/finance/movimientos/trazabilidad'),
  crearMovimiento:   (body)     => request('/api/finance/movimientos',      { method: 'POST',   body: JSON.stringify(body) }),
  editarMovimiento:  (id, body) => request(`/api/finance/movimientos/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarMovimiento:(id)       => request(`/api/finance/movimientos/${id}`, { method: 'DELETE' }),

  getComprobantes: () => request('/api/finance/comprobantes'),
  subirComprobante: (formData) => requestMultipart('/api/finance/comprobantes/upload', 'POST', formData),
  vincularComprobante: (id, movimiento_id) =>
    request(`/api/finance/comprobantes/${id}/vincular`, { method: 'PUT', body: JSON.stringify({ movimiento_id }) }),
  eliminarComprobante: (id) => request(`/api/finance/comprobantes/${id}`, { method: 'DELETE' }),

  validarExcel:  (formData) => requestMultipart('/api/finance/excel/validar',  'POST', formData),
  importarExcel: (formData) => requestMultipart('/api/finance/excel/importar', 'POST', formData),
  getPlantillaInfo: () => request('/api/finance/excel/plantilla'),

  // ── Migración de datos ────────────────────────────
  getMigracionTipos: () => request('/api/finance/migracion/tipos'),
  previewMigracion:  (formData) => requestMultipart('/api/finance/migracion/preview',    'POST', formData),
  confirmarMigracion:(formData) => requestMultipart('/api/finance/migracion/confirmar',  'POST', formData),
  getMigracionBatches: () => request('/api/finance/migracion/batches'),
  getMigracionBatch:   (id) => request(`/api/finance/migracion/batches/${id}`),
  revertirMigracion:   (id) => request(`/api/finance/migracion/batches/${id}/revertir`, { method: 'POST' }),

  // ── Deudas ───────────────────────────────────────
  getDeudas: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'Todos'))
    ).toString()
    return request(`/api/finance/deudas${qs ? `?${qs}` : ''}`)
  },
  getMetricasDeudas: () => request('/api/finance/deudas/metricas'),
  crearDeuda:   (body)     => request('/api/finance/deudas',      { method: 'POST',   body: JSON.stringify(body) }),
  editarDeuda:  (id, body) => request(`/api/finance/deudas/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarDeuda:(id)       => request(`/api/finance/deudas/${id}`, { method: 'DELETE' }),

  // ── Salarios ─────────────────────────────────────
  getMetricasSalarios: () => request('/api/finance/salarios/metricas'),

  getEmpleados: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'Todos'))
    ).toString()
    return request(`/api/finance/salarios/empleados${qs ? `?${qs}` : ''}`)
  },
  getEmpleado:    (id)       => request(`/api/finance/salarios/empleados/${id}`),
  crearEmpleado:  (body)     => request('/api/finance/salarios/empleados',      { method: 'POST',   body: JSON.stringify(body) }),
  editarEmpleado: (id, body) => request(`/api/finance/salarios/empleados/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarEmpleado:(id)      => request(`/api/finance/salarios/empleados/${id}`, { method: 'DELETE' }),

  getCategoriasSalario:    ()     => request('/api/finance/salarios/categorias'),
  crearCategoriaSalario:   (body) => request('/api/finance/salarios/categorias',      { method: 'POST',   body: JSON.stringify(body) }),
  eliminarCategoriaSalario:(id)   => request(`/api/finance/salarios/categorias/${id}`, { method: 'DELETE' }),

  getCotizacionDiaria:  ()     => request('/api/finance/salarios/cotizacion-dolar'),
  guardarCotizacion:    (body) => request('/api/finance/salarios/cotizacion-dolar', { method: 'POST', body: JSON.stringify(body) }),

  getMovimientosSalario: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return request(`/api/finance/salarios/movimientos${qs ? `?${qs}` : ''}`)
  },
  crearMovimientoSalario:  (body)     => request('/api/finance/salarios/movimientos',      { method: 'POST',   body: JSON.stringify(body) }),
  editarMovimientoSalario: (id, body) => request(`/api/finance/salarios/movimientos/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarMovimientoSalario:(id)      => request(`/api/finance/salarios/movimientos/${id}`, { method: 'DELETE' }),

  // ── Suscripciones ────────────────────────────────
  getSuscripciones: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'Todas'))
    ).toString()
    return request(`/api/finance/suscripciones${qs ? `?${qs}` : ''}`)
  },
  getSuscripcionesProximasVencer: (dias = 7) => request(`/api/finance/suscripciones/proximas-vencer?dias=${dias}`),
  crearSuscripcion:   (body)     => request('/api/finance/suscripciones',      { method: 'POST',   body: JSON.stringify(body) }),
  editarSuscripcion:  (id, body) => request(`/api/finance/suscripciones/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarSuscripcion:(id)       => request(`/api/finance/suscripciones/${id}`, { method: 'DELETE' }),

  // ── Operations ───────────────────────────────────
  getTareas: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'Todos'))
    ).toString()
    return request(`/api/operations/tareas${qs ? `?${qs}` : ''}`)
  },
  getMetricasOperations: () => request('/api/operations/tareas/metricas'),
  crearTarea:   (body)     => request('/api/operations/tareas',       { method: 'POST',   body: JSON.stringify(body) }),
  editarTarea:  (id, body) => request(`/api/operations/tareas/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarTarea:(id)       => request(`/api/operations/tareas/${id}`, { method: 'DELETE' }),
  getHistorialTarea: (id)  => request(`/api/operations/tareas/${id}/historial`),

  getPropuestas: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return request(`/api/operations/tareas/propuestas${qs ? `?${qs}` : ''}`)
  },
  aprobarPropuesta:  (id, body = {}) => request(`/api/operations/tareas/propuestas/${id}/aprobar`,  { method: 'POST', body: JSON.stringify(body) }),
  rechazarPropuesta: (id, body = {}) => request(`/api/operations/tareas/propuestas/${id}/rechazar`, { method: 'POST', body: JSON.stringify(body) }),

  // ── CRM ──────────────────────────────────────────
  getContactos: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'Todos'))
    ).toString()
    return request(`/api/crm/contactos${qs ? `?${qs}` : ''}`)
  },
  getMetricasCrm: () => request('/api/crm/contactos/metricas'),
  crearContacto:   (body)     => request('/api/crm/contactos',       { method: 'POST',   body: JSON.stringify(body) }),
  editarContacto:  (id, body) => request(`/api/crm/contactos/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarContacto:(id)       => request(`/api/crm/contactos/${id}`, { method: 'DELETE' }),

  // ── Planification ────────────────────────────────
  getProyectos: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'Todos'))
    ).toString()
    return request(`/api/planification/proyectos${qs ? `?${qs}` : ''}`)
  },
  getMetricasPlanification: () => request('/api/planification/proyectos/metricas'),
  crearProyecto:   (body)     => request('/api/planification/proyectos',       { method: 'POST',   body: JSON.stringify(body) }),
  editarProyecto:  (id, body) => request(`/api/planification/proyectos/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarProyecto:(id)       => request(`/api/planification/proyectos/${id}`, { method: 'DELETE' }),

  // ── RBAC ─────────────────────────────────────────
  getUsuariosAsignables: () => request('/api/rbac/usuarios/asignables'),
  getUsuarios:           () => request('/api/rbac/usuarios'),
  crearUsuario:   (body)     => request('/api/rbac/usuarios',       { method: 'POST',   body: JSON.stringify(body) }),
  editarUsuario:  (id, body) => request(`/api/rbac/usuarios/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  eliminarUsuario:(id)       => request(`/api/rbac/usuarios/${id}`, { method: 'DELETE' }),
  getRoles:              () => request('/api/rbac/roles'),

  // ── Organización ──────────────────────────────────
  getOrganigrama:       ()           => request('/api/organizacion/organigrama'),
  crearNodoOrganigrama: (body)       => request('/api/organizacion/organigrama',      { method: 'POST',   body: JSON.stringify(body) }),
  actualizarNodoOrganigrama: (id, body) => request(`/api/organizacion/organigrama/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  eliminarNodoOrganigrama:   (id)    => request(`/api/organizacion/organigrama/${id}`, { method: 'DELETE' }),

  getPermisosUsuario:    (uid)       => request(`/api/organizacion/permisos/${uid}`),
  actualizarPermisosUsuario: (uid, body) => request(`/api/organizacion/permisos/${uid}`, { method: 'PUT', body: JSON.stringify(body) }),

  getMatrizPermisos:     ()          => request('/api/organizacion/matriz'),
  getModulosOrganizacion:()          => request('/api/organizacion/modulos'),
  getRolesPredefinidos:  ()          => request('/api/organizacion/roles-predefinidos'),
  inactivarExpirados:    ()          => request('/api/organizacion/inactivar-expirados', { method: 'POST' }),
}
