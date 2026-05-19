import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { obtenerCotizacion, obtenerCotizacionDetalle } from '../lib/dolarService'
import {
  Users, DollarSign, Tag, Plus, Trash2, Edit2, X, ChevronDown, Lock,
} from 'lucide-react'
import AppModal from './AppModal'

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const fmtUSD = (n) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const TIPO_PERMANENCIA = ['Planta', 'Temporal']
const ESTADO_EMP       = ['Activo', 'Inactivo']
const TIPO_SALARIO     = ['mensual', 'hora', 'turno']

const TIPO_SALARIO_LABEL = { mensual: 'Mensual', hora: 'Por hora', turno: 'Por turno' }
const MONTO_BASE_LABEL   = { mensual: 'Monto mensual', hora: 'Monto por hora', turno: 'Monto por turno' }

const BADGE = {
  'Planta':    { bg: '#DBEAFE', color: '#1E40AF' },
  'Temporal':  { bg: '#FEF3C7', color: '#92400E' },
  'Mensual':   { bg: '#EFF6FF', color: '#1D4ED8' },
  'Por Turno': { bg: '#F3E8FF', color: '#6B21A8' },
  'Por Horas': { bg: '#FEE2E2', color: '#991B1B' },
  'Activo':    { bg: '#E1F5EE', color: '#0F6E56' },
  'Inactivo':  { bg: '#F3F4F6', color: '#6B7280' },
}

function Badge({ label }) {
  const s = BADGE[label] || { bg: '#F3F4F6', color: '#374151' }
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-[11.5px] font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {label}
    </span>
  )
}

const inputCls =
  'w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

function Label({ children }) {
  return <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">{children}</label>
}

// ── Access denied overlay ─────────────────────────────────────────────────────

function AccesoDenegado() {
  return (
    <div className="flex flex-col items-center justify-center h-72 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: '#FEE2E2' }}
      >
        <Lock size={28} color="#991B1B" />
      </div>
      <div className="text-center">
        <p className="font-serif font-semibold text-[18px] text-gray-800">Sin permisos</p>
        <p className="text-[13px] text-gray-400 mt-1">
          No tenés permisos para acceder al módulo de Sueldos.
        </p>
      </div>
    </div>
  )
}

// ── Modal base ────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <AppModal onClose={onClose} maxWidth="max-w-md">
      <div className="h-[3px] shrink-0" style={{ background: 'linear-gradient(90deg,#1D9E75,#5DCAA5)' }} />
      <div className="px-6 pt-5 pb-4 shrink-0 border-b" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-semibold text-[17px] text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="px-6 py-5 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </AppModal>
  )
}

// ── Form field wrappers ───────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className={inputCls + ' appearance-none pr-8'} style={inputStyle}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

// ── TAB: Empleados ────────────────────────────────────────────────────────────

const EMP_VACIO = {
  nombre: '', apellido: '', email: '', telefono: '',
  tipo_permanencia: 'Planta', modalidad_trabajo: 'Mensual',
  fecha_ingreso: '', estado: 'Activo',
  tipo_salario: 'mensual', monto_base: '', moneda: 'ARS',
  cotizacion_tipo: null, cotizacion_valor: null, cotizacion_fecha: null, cotizacion_fuente: null,
}

function TabEmpleados() {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null) // null | 'nuevo' | empleado-object
  const [form, setForm]           = useState(EMP_VACIO)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [cotizacion, setCotizacion] = useState(null)  // { valor_compra, valor_venta, fuente, fecha }
  const [cotLoading, setCotLoading] = useState(false)
  const [cotError, setCotError]     = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.getEmpleados()
      setEmpleados(data)
    } catch { /* leave empty */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const fetchCotizacionEmpleado = useCallback(async (tipoPreseleccionado = 'venta') => {
    setCotLoading(true)
    setCotError(null)
    try {
      // Primero buscar en la base de datos (reutilizar si ya existe para hoy)
      const { data: existente } = await api.getCotizacionDiaria()
      let cot
      if (existente) {
        cot = existente
      } else {
        // Obtener de las APIs externas
        cot = await obtenerCotizacionDetalle()
        // Guardar en DB (best effort, no bloquea el flujo)
        api.guardarCotizacion({
          fecha:            cot.fecha,
          fuente:           cot.fuente,
          tipo:             'oficial',
          valor_compra:     cot.valor_compra,
          valor_venta:      cot.valor_venta,
          valor_referencia: cot.valor_venta,
        }).catch(() => {})
      }
      setCotizacion(cot)
      // Pre-seleccionar tipo y valor correspondiente
      setForm(f => {
        const tipo  = f.cotizacion_tipo || tipoPreseleccionado
        const valor = tipo === 'compra' ? cot.valor_compra : cot.valor_venta
        return { ...f, cotizacion_tipo: tipo, cotizacion_valor: valor, cotizacion_fecha: cot.fecha, cotizacion_fuente: cot.fuente }
      })
    } catch (err) {
      setCotError('No se pudo obtener la cotización del dólar: ' + err.message)
    } finally {
      setCotLoading(false)
    }
  }, [])

  const abrirNuevo = () => {
    setForm(EMP_VACIO)
    setError(null)
    setCotizacion(null)
    setCotError(null)
    setModal('nuevo')
  }

  const abrirEditar = (emp) => {
    const moneda = emp.moneda || 'ARS'
    setForm({ ...emp, moneda })
    setError(null)
    setCotizacion(null)
    setCotError(null)
    setModal(emp)
    if (moneda === 'USD') fetchCotizacionEmpleado(emp.cotizacion_tipo || 'venta')
  }

  const onMonedaChange = (val) => {
    if (val === 'USD') {
      setForm(f => ({ ...f, moneda: 'USD', cotizacion_tipo: 'venta', cotizacion_valor: null, cotizacion_fecha: null, cotizacion_fuente: null }))
      fetchCotizacionEmpleado('venta')
    } else {
      setForm(f => ({ ...f, moneda: val, cotizacion_tipo: null, cotizacion_valor: null, cotizacion_fecha: null, cotizacion_fuente: null }))
      setCotizacion(null)
      setCotError(null)
    }
  }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      if (form.moneda === 'USD' && (!form.cotizacion_valor || !form.cotizacion_tipo)) {
        throw new Error('Para empleados en USD debe seleccionar una cotización (compra o venta).')
      }
      if (modal === 'nuevo') {
        await api.crearEmpleado(form)
      } else {
        await api.editarEmpleado(modal.id, form)
      }
      setModal(null)
      cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este empleado?')) return
    try {
      await api.eliminarEmpleado(id)
      cargar()
    } catch (err) {
      alert(err.message)
    }
  }

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">{empleados.length} empleados registrados</p>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-medium shadow-sm"
          style={{ background: '#0F6E56' }}
        >
          <Plus size={14} /> Nuevo empleado
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                {['Nombre', 'Email', 'Tipo', 'Sueldo', 'Monto base', 'Ingreso', 'Estado', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-[13px]">Cargando…</td></tr>
              ) : empleados.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-[13px]">Sin empleados registrados</td></tr>
              ) : empleados.map(emp => (
                <tr key={emp.id} className="border-b hover:bg-gray-50/50 transition-colors group" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                  <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{emp.nombre} {emp.apellido}</td>
                  <td className="py-3 px-4 text-gray-500">{emp.email || '—'}</td>
                  <td className="py-3 px-4"><Badge label={emp.tipo_permanencia} /></td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                    {TIPO_SALARIO_LABEL[emp.tipo_salario] || '—'}
                    {emp.moneda === 'USD' && (
                      <span
                        className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: '#EFF6FF', color: '#1D4ED8' }}
                      >
                        USD
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                    {emp.monto_base
                      ? (emp.moneda === 'USD' ? `USD ${fmtUSD(emp.monto_base)}` : fmt(emp.monto_base))
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{emp.fecha_ingreso || '—'}</td>
                  <td className="py-3 px-4"><Badge label={emp.estado} /></td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => abrirEditar(emp)}
                        className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(emp.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'nuevo' ? 'Nuevo empleado' : 'Editar empleado'} onClose={() => setModal(null)}>
          <form onSubmit={guardar} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre *</Label>
                <input value={form.nombre} onChange={e => set('nombre')(e.target.value)}
                  required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <Label>Apellido *</Label>
                <input value={form.apellido} onChange={e => set('apellido')(e.target.value)}
                  required className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <input type="email" value={form.email || ''} onChange={e => set('email')(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <input value={form.telefono || ''} onChange={e => set('telefono')(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <SelectField label="Tipo permanencia *" value={form.tipo_permanencia} onChange={set('tipo_permanencia')} options={TIPO_PERMANENCIA} />
            </div>

            {/* Tipo de sueldo — fila propia */}
            <div>
              <Label>Tipo de sueldo *</Label>
              <div className="relative">
                <select value={form.tipo_salario} onChange={e => set('tipo_salario')(e.target.value)}
                  className={inputCls + ' appearance-none pr-8'} style={inputStyle}>
                  {TIPO_SALARIO.map(o => (
                    <option key={o} value={o}>{TIPO_SALARIO_LABEL[o]}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Moneda | Monto base */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Moneda *</Label>
                <div className="relative">
                  <select value={form.moneda || 'ARS'} onChange={e => onMonedaChange(e.target.value)}
                    className={inputCls + ' appearance-none pr-8'} style={inputStyle}>
                    <option value="ARS">ARS — Peso argentino</option>
                    <option value="USD">USD — Dólar</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <Label>{MONTO_BASE_LABEL[form.tipo_salario] || 'Monto base'} *</Label>
                <input type="number" step="0.01" min="0"
                  value={form.monto_base || ''}
                  onChange={e => set('monto_base')(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="0.00" />
              </div>
            </div>

            {/* Cotización del dólar — solo visible cuando moneda = USD */}
            {form.moneda === 'USD' && (
              <div className="rounded-xl border p-3 space-y-2.5" style={{ borderColor: 'rgba(15,110,86,0.25)', background: '#F0FDF9' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide">Cotización del día</span>
                  {cotizacion && !cotLoading && (
                    <span className="text-[11px] text-gray-400">{cotizacion.fecha} · {cotizacion.fuente}</span>
                  )}
                </div>

                {cotLoading && (
                  <p className="text-[12.5px] text-gray-500">Obteniendo cotización…</p>
                )}

                {cotError && !cotLoading && (
                  <div className="p-2.5 rounded-lg text-[12.5px] bg-amber-50 border border-amber-100 text-amber-700">
                    {cotError}
                  </div>
                )}

                {cotizacion && !cotLoading && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['compra', 'venta']).map((tipo) => {
                      const valor   = tipo === 'compra' ? cotizacion.valor_compra : cotizacion.valor_venta
                      const activo  = form.cotizacion_tipo === tipo
                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            cotizacion_tipo:   tipo,
                            cotizacion_valor:  valor,
                            cotizacion_fecha:  cotizacion.fecha,
                            cotizacion_fuente: cotizacion.fuente,
                          }))}
                          className="rounded-lg px-3 py-2.5 text-left text-[12.5px] font-medium border transition-colors"
                          style={activo
                            ? { background: '#0F6E56', borderColor: '#0F6E56', color: '#fff' }
                            : { background: 'white', borderColor: 'rgba(15,110,86,0.2)', color: '#374151' }
                          }
                        >
                          <div className="text-[10.5px] font-normal mb-0.5"
                            style={{ color: activo ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>
                            {tipo === 'compra' ? 'Dólar compra' : 'Dólar venta'}
                          </div>
                          {fmt(valor)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha ingreso</Label>
                <input type="date" value={form.fecha_ingreso || ''} onChange={e => set('fecha_ingreso')(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </div>
              <SelectField label="Estado" value={form.estado} onChange={set('estado')} options={ESTADO_EMP} />
            </div>
            {error && <p className="text-[12.5px] text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
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
        </Modal>
      )}
    </>
  )
}

// ── TAB: Movimientos salariales ───────────────────────────────────────────────

const MOV_VACIO = { empleado_id: '', categoria_id: '', monto: '', fecha: '', descripcion: '', cantidad: '' }

function TabMovimientos() {
  const [movs, setMovs]               = useState([])
  const [empleados, setEmpleados]     = useState([])
  const [categorias, setCategorias]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false) // false | 'nuevo' | movimiento-object
  const [form, setForm]               = useState(MOV_VACIO)
  const [empInfo, setEmpInfo]         = useState(null)  // { tipo_salario, monto_base, moneda }
  const [cotizacion, setCotizacion]   = useState(null)  // { valor, fuente, descripcion }
  const [cotLoading, setCotLoading]   = useState(false)
  const [cotError, setCotError]       = useState(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2, r3] = await Promise.allSettled([
        api.getMovimientosSalario(),
        api.getEmpleados(),
        api.getCategoriasSalario(),
      ])
      if (r1.status === 'fulfilled') setMovs(r1.value.data)
      if (r2.status === 'fulfilled') setEmpleados(r2.value.data)
      if (r3.status === 'fulfilled') setCategorias(r3.value.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Obtiene la cotización y la guarda en el estado local
  const fetchCotizacion = useCallback(async () => {
    setCotLoading(true)
    setCotError(null)
    setCotizacion(null)
    try {
      const cot = await obtenerCotizacion()
      setCotizacion(cot)
    } catch (err) {
      setCotError('No se pudo obtener la cotización del dólar. ' + err.message)
    } finally {
      setCotLoading(false)
    }
  }, [])

  // Auto-calcula el monto ARS cuando llega la cotización para empleado USD mensual
  useEffect(() => {
    if (
      empInfo?.moneda === 'USD' &&
      empInfo?.tipo_salario === 'mensual' &&
      cotizacion
    ) {
      const monto_ars = empInfo.monto_base * cotizacion.valor
      setForm(f => ({ ...f, monto: String(Math.round(monto_ars)) }))
    }
  }, [cotizacion, empInfo])

  const cargarInfoEmpleado = useCallback((empleado_id, lista) => {
    const emp = lista.find(e => String(e.id) === String(empleado_id))
    if (emp && emp.tipo_salario) {
      const moneda = emp.moneda || 'ARS'
      setEmpInfo({ tipo_salario: emp.tipo_salario, monto_base: Number(emp.monto_base) || 0, moneda })
      setForm(f => ({
        ...f,
        empleado_id,
        // ARS mensual: pre-fill monto; USD mensual: esperar cotizacion; hora/turno: esperar cantidad
        monto: (moneda === 'ARS' && emp.tipo_salario === 'mensual') ? String(emp.monto_base || '') : '',
        cantidad: '',
      }))
      if (moneda === 'USD') {
        fetchCotizacion()
      } else {
        setCotizacion(null)
        setCotError(null)
      }
    } else {
      setEmpInfo(null)
      setCotizacion(null)
      setCotError(null)
      setForm(f => ({ ...f, empleado_id, monto: '', cantidad: '' }))
    }
  }, [fetchCotizacion])

  const onCantidadChange = (val) => {
    setForm(f => {
      if (!empInfo) return { ...f, cantidad: val }
      if (empInfo.moneda === 'USD' && cotizacion) {
        const monto_usd = empInfo.monto_base * Number(val)
        const monto_ars = monto_usd * cotizacion.valor
        return { ...f, cantidad: val, monto: String(Math.round(monto_ars)) }
      }
      // ARS: cálculo existente
      const monto = empInfo.tipo_salario !== 'mensual'
        ? String(empInfo.monto_base * Number(val))
        : f.monto
      return { ...f, cantidad: val, monto }
    })
  }

  const abrirNuevo = () => {
    const hoy = new Date().toISOString().split('T')[0]
    const primerEmp = empleados[0]
    setForm({ ...MOV_VACIO, fecha: hoy, categoria_id: categorias[0]?.id || '' })
    setEmpInfo(null)
    setCotizacion(null)
    setCotError(null)
    setError(null)
    setModal('nuevo')
    if (primerEmp) cargarInfoEmpleado(primerEmp.id, empleados)
  }

  const abrirEditar = (mov) => {
    setForm({
      empleado_id:  mov.empleado_id,
      categoria_id: mov.categoria_id,
      monto:        String(mov.monto),
      fecha:        mov.fecha,
      descripcion:  mov.descripcion || '',
      cantidad:     '',
    })
    const emp = empleados.find(e => String(e.id) === String(mov.empleado_id))
    if (emp?.tipo_salario) {
      const moneda = emp.moneda || 'ARS'
      setEmpInfo({ tipo_salario: emp.tipo_salario, monto_base: Number(emp.monto_base) || 0, moneda })
      if (moneda === 'USD') {
        fetchCotizacion()
      } else {
        setCotizacion(null)
        setCotError(null)
      }
    } else {
      setEmpInfo(null)
      setCotizacion(null)
      setCotError(null)
    }
    setError(null)
    setModal(mov)
  }

  const cerrarModal = () => setModal(false)

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)

    try {
      // Bloquear registro nuevo de movimiento USD sin cotización
      if (modal === 'nuevo' && empInfo?.moneda === 'USD' && !cotizacion) {
        throw new Error('No hay cotización disponible. No se puede registrar el movimiento en dólares.')
      }

      const payload = {
        empleado_id:  form.empleado_id,
        categoria_id: form.categoria_id,
        fecha:        form.fecha,
        descripcion:  form.descripcion,
      }

      if (modal === 'nuevo' && empInfo?.moneda === 'USD') {
        // Movimiento USD: enviamos monto en ARS + datos de trazabilidad
        const monto_origen = empInfo.tipo_salario === 'mensual'
          ? empInfo.monto_base
          : empInfo.monto_base * Number(form.cantidad)
        payload.monto            = Number(form.monto)
        payload.moneda_origen    = 'USD'
        payload.monto_origen     = monto_origen
        payload.cotizacion_usada = cotizacion.valor
        payload.monto_ars        = Number(form.monto)
      } else if (modal === 'nuevo' && empInfo && empInfo.tipo_salario !== 'mensual' && form.cantidad) {
        // Movimiento ARS hora/turno: el backend recalcula desde cantidad
        payload.cantidad = Number(form.cantidad)
      } else {
        payload.monto = Number(form.monto)
      }

      if (modal === 'nuevo') {
        await api.crearMovimientoSalario(payload)
      } else {
        await api.editarMovimientoSalario(modal.id, payload)
      }
      cerrarModal()
      cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    try { await api.eliminarMovimientoSalario(id); cargar() }
    catch (err) { alert(err.message) }
  }

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  const esEdicion = modal && modal !== 'nuevo'

  // Monto USD derivado para mostrar en el formulario
  const montoUSD = (() => {
    if (!empInfo || empInfo.moneda !== 'USD') return null
    if (empInfo.tipo_salario === 'mensual') return empInfo.monto_base
    return empInfo.monto_base * (Number(form.cantidad) || 0)
  })()

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">{movs.length} movimientos registrados</p>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-medium shadow-sm"
          style={{ background: '#0F6E56' }}
        >
          <Plus size={14} /> Registrar movimiento
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                {['Empleado', 'Categoría', 'Monto', 'Fecha', 'Descripción', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-[13px]">Cargando…</td></tr>
              ) : movs.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-[13px]">Sin movimientos registrados</td></tr>
              ) : movs.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50/50 transition-colors group" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                  <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                    {m.empleados ? `${m.empleados.nombre} ${m.empleados.apellido}` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge label={m.categorias_salariales?.nombre || '—'} />
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                    {fmt(m.monto)}
                  </td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{m.fecha}</td>
                  <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">{m.descripcion || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => abrirEditar(m)}
                        className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => eliminar(m.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={esEdicion ? 'Editar movimiento salarial' : 'Registrar movimiento salarial'} onClose={cerrarModal}>
          <form onSubmit={guardar} className="space-y-3">

            {/* Empleado */}
            <div>
              <Label>Empleado *</Label>
              <div className="relative">
                <select
                  value={form.empleado_id}
                  onChange={e => cargarInfoEmpleado(e.target.value, empleados)}
                  required className={inputCls + ' appearance-none pr-8'} style={inputStyle}
                >
                  <option value="">Seleccionar empleado</option>
                  {empleados.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Info salarial */}
            {empInfo && (
              <div
                className="rounded-xl px-3 py-2.5 text-[12.5px]"
                style={{ background: '#E1F5EE', color: '#0F6E56' }}
              >
                {empInfo.moneda === 'USD' ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{TIPO_SALARIO_LABEL[empInfo.tipo_salario]}</span>
                    <span>·</span>
                    <span>
                      USD {fmtUSD(empInfo.monto_base)}
                      {empInfo.tipo_salario === 'hora' ? ' / hora' : empInfo.tipo_salario === 'turno' ? ' / turno' : ' / mes'}
                    </span>
                    {cotLoading && <span className="opacity-60">· Obteniendo cotización…</span>}
                    {cotizacion && !cotLoading && (
                      <>
                        <span>·</span>
                        <span>Cotización: {fmt(cotizacion.valor)} ARS</span>
                        <span>·</span>
                        <span>
                          Equiv: {fmt(empInfo.monto_base * cotizacion.valor)}
                          {empInfo.tipo_salario === 'hora' ? ' / hora' : empInfo.tipo_salario === 'turno' ? ' / turno' : ' / mes'}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{TIPO_SALARIO_LABEL[empInfo.tipo_salario]}</span>
                    <span>·</span>
                    <span>
                      {fmt(empInfo.monto_base)}
                      {empInfo.tipo_salario === 'hora' ? ' / hora' : empInfo.tipo_salario === 'turno' ? ' / turno' : ' / mes'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Error cotización */}
            {empInfo?.moneda === 'USD' && cotError && (
              <div className="p-3 rounded-xl text-[12.5px] bg-amber-50 border border-amber-100 text-amber-700">
                {cotError}
              </div>
            )}

            {/* Cantidad (solo para hora/turno en modo nuevo) */}
            {!esEdicion && empInfo && empInfo.tipo_salario !== 'mensual' && (
              <div>
                <Label>{empInfo.tipo_salario === 'hora' ? 'Cantidad de horas *' : 'Cantidad de turnos *'}</Label>
                <input
                  type="number" step="1" min="1"
                  value={form.cantidad}
                  onChange={e => onCantidadChange(e.target.value)}
                  required
                  disabled={empInfo.moneda === 'USD' && cotLoading}
                  className={inputCls} style={inputStyle} placeholder="0"
                />
              </div>
            )}

            {/* Categoría */}
            <div>
              <Label>Categoría *</Label>
              <div className="relative">
                <select value={form.categoria_id} onChange={e => set('categoria_id')(e.target.value)}
                  required className={inputCls + ' appearance-none pr-8'} style={inputStyle}>
                  <option value="">Seleccionar categoría</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Monto */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  {empInfo?.moneda === 'USD' ? 'Monto total (ARS) *' : 'Monto total *'}
                </Label>
                <input
                  type="text" inputMode="decimal"
                  value={form.monto}
                  onChange={e => set('monto')(e.target.value.replace(/[^0-9.]/g, ''))}
                  required className={inputCls} style={inputStyle}
                  placeholder="0.00"
                />
                {/* Detalle de conversión USD */}
                {empInfo?.moneda === 'USD' && cotizacion && montoUSD > 0 && form.monto && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    USD {fmtUSD(montoUSD)} × {fmt(cotizacion.valor)} = {fmt(Number(form.monto))}
                  </p>
                )}
              </div>
              <div>
                <Label>Fecha *</Label>
                <input type="date" value={form.fecha} onChange={e => set('fecha')(e.target.value)}
                  required className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div>
              <Label>Descripción</Label>
              <input value={form.descripcion} onChange={e => set('descripcion')(e.target.value)}
                className={inputCls} style={inputStyle} placeholder="Opcional" />
            </div>

            {error && <p className="text-[12.5px] text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={cerrarModal}
                className="flex-1 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 hover:bg-gray-50"
                style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || (modal === 'nuevo' && empInfo?.moneda === 'USD' && (cotLoading || !!cotError))}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm disabled:opacity-60"
                style={{ background: '#0F6E56' }}
              >
                {saving ? 'Guardando…' : cotLoading ? 'Obteniendo cotización…' : esEdicion ? 'Guardar cambios' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ── TAB: Categorías ───────────────────────────────────────────────────────────

function TabCategorias() {
  const [cats, setCats]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState({ nombre: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.getCategoriasSalario(); setCats(data) }
    catch { /* leave empty */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await api.crearCategoriaSalario(form)
      setModal(false)
      setForm({ nombre: '', descripcion: '' })
      cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    try { await api.eliminarCategoriaSalario(id); cargar() }
    catch (err) { alert(err.message) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">{cats.length} categorías registradas</p>
        <button
          onClick={() => { setForm({ nombre: '', descripcion: '' }); setError(null); setModal(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-medium shadow-sm"
          style={{ background: '#0F6E56' }}
        >
          <Plus size={14} /> Nueva categoría
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
              {['Nombre', 'Descripción', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-10 text-center text-gray-400 text-[13px]">Cargando…</td></tr>
            ) : cats.length === 0 ? (
              <tr><td colSpan={3} className="py-10 text-center text-gray-400 text-[13px]">Sin categorías</td></tr>
            ) : cats.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50/50 transition-colors group" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{c.nombre}</td>
                <td className="py-3 px-4 text-gray-500">{c.descripcion || '—'}</td>
                <td className="py-3 px-4">
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => eliminar(c.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Nueva categoría salarial" onClose={() => setModal(false)}>
          <form onSubmit={guardar} className="space-y-3">
            <div>
              <Label>Nombre *</Label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                required className={inputCls} style={inputStyle} />
            </div>
            <div>
              <Label>Descripción</Label>
              <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
            {error && <p className="text-[12.5px] text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 hover:bg-gray-50"
                style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm disabled:opacity-60"
                style={{ background: '#0F6E56' }}>
                {saving ? 'Guardando…' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const SUBTABS = [
  { id: 'empleados',   label: 'Empleados',   icon: Users      },
  { id: 'movimientos', label: 'Movimientos', icon: DollarSign },
  { id: 'categorias',  label: 'Categorías',  icon: Tag        },
]

export default function Salarios({ user }) {
  const [tab, setTab] = useState('empleados')

  if (user?.role === 'Operativo') return <AccesoDenegado />

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[20px] font-semibold text-gray-900">Sueldos</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Gestión de empleados, movimientos y categorías</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div
        className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border w-fit"
        style={{ borderColor: 'rgba(15,110,86,0.1)' }}
      >
        {SUBTABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
              style={active ? { background: '#0F6E56', color: '#fff' } : { color: '#6b7280' }}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'empleados'   && <TabEmpleados />}
      {tab === 'movimientos' && <TabMovimientos />}
      {tab === 'categorias'  && <TabCategorias />}
    </div>
  )
}
