import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Trash2, RefreshCw, ChevronDown, BookOpen, X, Download, ChevronLeft, Activity } from 'lucide-react'
import { api } from '../lib/api'
import FormMovimiento from './FormMovimiento'
import AppModal from './AppModal'
import jsPDF from 'jspdf'

const CATEGORIAS = ['Todos', 'Tecnología', 'RRHH', 'Insumos', 'Servicios', 'Inversión', 'Otros']

const OPCIONES_MODALIDAD = [
  'Caja',
  'Banco',
  'Transferencia bancaria',
  'Efectivo',
  'Cuenta corriente',
  'Mercado Pago',
  'Tarjeta',
  'Otra',
]

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const inputCls = `
  w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors
  focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10
`.trim()

const btnPrimary = `
  flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium
  shadow-sm transition-colors cursor-pointer
`

const btnSecondary = `
  flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium
  text-gray-600 bg-white hover:bg-gray-50 transition-colors cursor-pointer
`

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const CATEGORIA_BADGE = {
  'Tecnología': { background: '#DBEAFE', color: '#1E40AF' },
  'RRHH':       { background: '#E0E7FF', color: '#3730A3' },
  'Insumos':    { background: '#FEF3C7', color: '#92400E' },
  'Servicios':  { background: '#CFFAFE', color: '#0E7490' },
  'Inversión':   { background: '#EDE9FE', color: '#5B21B6' },
  'Otros':       { background: '#F3F4F6', color: '#4B5563' },
  'Suscripción': { background: '#DCFCE7', color: '#15803D' },
}

function fmtPDF(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const BLOQUE_CFG = {
  'Ingresos Operativos':  { color: [15, 110, 86],  bg: [230, 247, 240], badge: '#0F6E56', badgeBg: '#E1F5EE' },
  'Ingresos Financieros': { color: [30, 90, 170],  bg: [230, 240, 255], badge: '#1E5AAA', badgeBg: '#E6F0FF' },
  'Egresos Operativos':   { color: [180, 60, 50],  bg: [255, 235, 233], badge: '#B43C32', badgeBg: '#FFEBE9' },
  'Egresos Financieros':  { color: [120, 50, 150], bg: [245, 235, 255], badge: '#783296', badgeBg: '#F5EBFF' },
}

const ORDEN_BLOQUES = ['Ingresos Operativos', 'Ingresos Financieros', 'Egresos Operativos', 'Egresos Financieros']

function clasificarMovimiento(m) {
  const tipo = (m.tipo || '').toLowerCase()
  const cat  = (m.categoria || '').toLowerCase()
  const desc = (m.descripcion || '').toLowerCase()

  if (tipo === 'salario') return 'Egresos Operativos'

  if (tipo === 'ingreso') {
    const kwFin = ['inversión', 'inversion', 'rendimiento', 'interés', 'interes', 'diferencia de cambio']
    if (kwFin.some(k => cat.includes(k) || desc.includes(k))) return 'Ingresos Financieros'
    return 'Ingresos Operativos'
  }

  if (tipo === 'gasto' || tipo === 'egreso') {
    const kwFin = ['comisión', 'comision', 'interés', 'interes', 'recargo', 'cuota', 'diferencia de cambio']
    if (kwFin.some(k => cat.includes(k) || desc.includes(k))) return 'Egresos Financieros'
    return 'Egresos Operativos'
  }

  if (tipo === 'inversión' || tipo === 'inversion') return 'Egresos Financieros'

  return 'Egresos Operativos'
}

function mapearConceptoDebe(m, bloque) {
  if (bloque === 'Egresos Operativos') {
    if (m.tipo === 'Salario') return 'Sueldos y jornales'
    const map = {
      'Tecnología': 'Gastos en tecnología',
      'RRHH':       'Gastos en RRHH',
      'Insumos':    'Gastos en insumos',
      'Servicios':  'Gastos en servicios',
      'Inversión':  'Bienes de uso / Inversiones',
      'Marketing':  'Gastos en marketing',
      'Impuestos':  'Cargas impositivas',
    }
    return map[m.categoria] || 'Gastos generales'
  }
  if (bloque === 'Egresos Financieros') {
    const desc = (m.descripcion || '').toLowerCase()
    if (desc.includes('comisión') || desc.includes('comision')) return 'Comisiones bancarias'
    if (desc.includes('interés')  || desc.includes('interes'))  return 'Gastos por intereses'
    if (desc.includes('recargo'))                               return 'Recargos financieros'
    if (desc.includes('cuota'))                                 return 'Gastos en cuotas'
    if (desc.includes('diferencia de cambio'))                  return 'Diferencias de cambio negativas'
    return 'Gastos financieros'
  }
  return 'Gastos generales'
}

function mapearConceptoHaber(m, bloque) {
  if (bloque === 'Ingresos Operativos') {
    const map = {
      'Tecnología': 'Ingresos por tecnología',
      'RRHH':       'Ingresos por RRHH',
      'Servicios':  'Ingresos por servicios',
      'Insumos':    'Ingresos por ventas',
      'Inversión':  'Rendimientos de inversión',
    }
    return map[m.categoria] || 'Ingresos por servicios'
  }
  if (bloque === 'Ingresos Financieros') {
    const desc = (m.descripcion || '').toLowerCase()
    if (desc.includes('rendimiento'))                          return 'Rendimientos de inversión'
    if (desc.includes('interés') || desc.includes('interes')) return 'Ingresos por intereses'
    if (desc.includes('diferencia de cambio'))                 return 'Diferencias de cambio positivas'
    return 'Ingresos financieros'
  }
  return 'Ingresos por servicios'
}

function normalizarSalario(m) {
  return {
    id:               m.id,
    fecha:            m.fecha,
    descripcion:      m.descripcion || `Sueldo — ${m.empleados?.nombre ?? ''} ${m.empleados?.apellido ?? ''}`.trim(),
    categoria:        m.categorias_salariales?.nombre || 'Sueldo',
    tipo:             'Salario',
    monto:            m.monto,
    proveedor_cliente: m.empleados ? `${m.empleados.nombre} ${m.empleados.apellido}` : '—',
    empleado_id:      m.empleado_id,
    categoria_id:     m.categoria_id,
    _source:          'salario',
  }
}

export default function Movimientos({ tipo, openForm, onFormClose, titulo, tituloSingular, categoriaFija, todos = false, incluirSalarios = false, user }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filtros, setFiltros] = useState({ search: '', categoria: categoriaFija || 'Todos', fecha_desde: '', fecha_hasta: '' })
  const [showFiltros, setShowFiltros] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [totales, setTotales] = useState({ count: 0, suma: 0 })

  const hoy = new Date()
  const [showLibroDiario, setShowLibroDiario] = useState(false)
  const [lbMes, setLbMes]   = useState(hoy.getMonth())
  const [lbAnio, setLbAnio] = useState(hoy.getFullYear())
  const [lbGenerando, setLbGenerando] = useState(false)
  const [lbStep, setLbStep] = useState('select')          // 'select' | 'review'
  const [lbMovsReview, setLbMovsReview] = useState([])    // movimientos normalizados para revisar
  const [lbModalidades, setLbModalidades] = useState({})  // { _key: { opcion, otraTexto } }
  const [lbCargando, setLbCargando] = useState(false)     // cargando movimientos para review
  const [lbTipoReporte, setLbTipoReporte] = useState('resumen')  // 'resumen' | 'libroDiario'

  const [showTrazabilidad, setShowTrazabilidad] = useState(false)
  const [trazItems, setTrazItems]               = useState([])
  const [trazLoading, setTrazLoading]           = useState(false)

  const canVerTrazabilidad = todos && (user?.role === 'Dirección' || user?.role === 'Superadmin')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      if (todos) {
        const [rFin, rSal] = await Promise.allSettled([
          api.getMovimientos({ fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta }),
          api.getMovimientosSalario({ fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta }),
        ])
        const financieros = (rFin.status === 'fulfilled' ? rFin.value.data : []).map(m => ({ ...m, _source: 'financiero' }))
        const salariales  = (rSal.status === 'fulfilled' ? rSal.value.data : []).map(normalizarSalario)

        const search = filtros.search?.toLowerCase() || ''
        const merged = [...financieros, ...salariales]
          .filter(m => !search || m.descripcion?.toLowerCase().includes(search))
          .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))

        setItems(merged)
        setTotales({ count: merged.length, suma: 0 })

      } else if (incluirSalarios) {
        const [rFin, rSal] = await Promise.allSettled([
          api.getMovimientos({ tipo, fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta }),
          api.getMovimientosSalario({ fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta }),
        ])
        const financieros = (rFin.status === 'fulfilled' ? rFin.value.data : []).map(m => ({ ...m, _source: 'financiero' }))
        const salariales  = (rSal.status === 'fulfilled' ? rSal.value.data : []).map(normalizarSalario)

        const search    = filtros.search?.toLowerCase() || ''
        const catFiltro = filtros.categoria !== 'Todos' ? filtros.categoria : null

        const merged = [...financieros, ...salariales]
          .filter(m => {
            if (search && !m.descripcion?.toLowerCase().includes(search) && !m.proveedor_cliente?.toLowerCase().includes(search)) return false
            if (catFiltro && m._source === 'financiero' && m.categoria !== catFiltro) return false
            return true
          })
          .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))

        setItems(merged)
        setTotales({ count: merged.length, suma: merged.reduce((s, m) => s + Number(m.monto), 0) })

      } else {
        const data = await api.getMovimientos({ tipo, ...filtros })
        setItems(data.data)
        setTotales({ count: data.data.length, suma: data.data.reduce((s, m) => s + Number(m.monto), 0) })
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [tipo, filtros, todos, incluirSalarios])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { if (openForm) { setShowForm(true); onFormClose?.() } }, [openForm])

  const handleDelete = async (m) => {
    try {
      if (m._source === 'salario') {
        await api.eliminarMovimientoSalario(m.id)
      } else {
        await api.eliminarMovimiento(m.id)
      }
      setConfirmDelete(null)
      cargar()
    } catch (e) { alert(e.message) }
  }

  const setFiltro = (k, v) => setFiltros(f => ({ ...f, [k]: v }))
  const limpiarFiltros = () => setFiltros({ search: '', categoria: categoriaFija || 'Todos', fecha_desde: '', fecha_hasta: '' })
  const isIngreso = tipo === 'Ingreso'
  const amountColor = isIngreso ? '#1D9E75' : '#E24B4A'
  const tituloMostrado = titulo || `${tipo}s`

  const getMontoColor = (m) => {
    if (todos) return m.tipo === 'Ingreso' ? '#1D9E75' : '#E24B4A'
    return amountColor
  }

  const esSalario = (m) => m._source === 'salario'

  // ── Libro Diario ──────────────────────────────────────────────


  const cerrarLibroDiario = () => {
    setShowLibroDiario(false)
    setLbStep('select')
    setLbMovsReview([])
    setLbModalidades({})
  }

  const setModalidad = (key, field, value) => {
    setLbModalidades(prev => ({
      ...prev,
      [key]: { opcion: '', otraTexto: '', ...prev[key], [field]: value },
    }))
  }

  const cerrarTrazabilidad = () => { setShowTrazabilidad(false); setTrazItems([]) }

  const abrirTrazabilidad = async () => {
    setShowTrazabilidad(true)
    setTrazLoading(true)
    try {
      const res = await api.getTrazabilidad()
      setTrazItems(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setTrazLoading(false)
    }
  }

  const cargarParaRevisar = async () => {
    setLbCargando(true)
    try {
      const mesStr  = String(lbMes + 1).padStart(2, '0')
      const anioStr = String(lbAnio)
      const primerDia   = `${anioStr}-${mesStr}-01`
      const ultimoDia   = new Date(lbAnio, lbMes + 1, 0)
      const ultimoDiaStr = `${anioStr}-${mesStr}-${String(ultimoDia.getDate()).padStart(2, '0')}`

      const [rFin, rSal] = await Promise.allSettled([
        api.getMovimientos({ fecha_desde: primerDia, fecha_hasta: ultimoDiaStr }),
        api.getMovimientosSalario({ fecha_desde: primerDia, fecha_hasta: ultimoDiaStr }),
      ])

      const financieros = rFin.status === 'fulfilled' ? rFin.value.data : []
      const salariales  = rSal.status === 'fulfilled' ? rSal.value.data : []

      const movs = [
        ...financieros.map(m => ({
          _key: `fin_${m.id}`,
          fecha: m.fecha,
          tipo: m.tipo,
          descripcion: m.descripcion,
          categoria: m.categoria,
          monto: Number(m.monto),
          cuenta_contrapartida: m.cuenta_contrapartida || null,
        })),
        ...salariales.map(m => ({
          _key: `sal_${m.id}`,
          fecha: m.fecha,
          tipo: 'Salario',
          descripcion: m.descripcion || `Sueldo — ${m.empleados?.nombre ?? ''} ${m.empleados?.apellido ?? ''}`.trim(),
          categoria: m.categorias_salariales?.nombre || 'Sueldo',
          monto: Number(m.monto),
          cuenta_contrapartida: m.cuenta_contrapartida || null,
        })),
      ].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))

      // Pre-poblar modalidades desde cuenta_contrapartida existente en DB
      const initModalidades = {}
      movs.forEach(m => {
        const existing = m.cuenta_contrapartida
        if (existing && OPCIONES_MODALIDAD.slice(0, -1).includes(existing)) {
          initModalidades[m._key] = { opcion: existing, otraTexto: '' }
        } else if (existing) {
          initModalidades[m._key] = { opcion: 'Otra', otraTexto: existing }
        } else {
          initModalidades[m._key] = { opcion: '', otraTexto: '' }
        }
      })

      setLbMovsReview(movs)
      setLbModalidades(initModalidades)
      setLbStep('review')
    } catch (e) {
      console.error(e)
      alert('Error al cargar los movimientos. Intentá de nuevo.')
    } finally {
      setLbCargando(false)
    }
  }

  const generarResumenFinanciero = async (movs, _modalidades) => {
    setLbGenerando(true)
    try {
      const mesStr  = String(lbMes + 1).padStart(2, '0')
      const anioStr = String(lbAnio)

      // ── Entry type visual config ───────────────────────────────
      const ENTRY_TYPE_CFG = {
        ingreso_op: {
          label: 'INGRESO', prefix: '[+]',
          accentRGB: [15, 110, 86],   bgRGB: [240, 252, 247],
          amtRGB:    [15, 110, 86],   badgeBgRGB: [209, 250, 229],  badgeTxRGB: [6, 95, 70],
          isIncome: true,
        },
        aporte: {
          label: 'APORTE / FINANCIAMIENTO', prefix: '[+]',
          accentRGB: [15, 110, 86],   bgRGB: [240, 252, 247],
          amtRGB:    [15, 110, 86],   badgeBgRGB: [209, 250, 229],  badgeTxRGB: [6, 95, 70],
          isIncome: true,
        },
        egreso_op: {
          label: 'EGRESO', prefix: '[-]',
          accentRGB: [220, 38, 38],   bgRGB: [255, 242, 242],
          amtRGB:    [180, 30, 30],   badgeBgRGB: [254, 226, 226],  badgeTxRGB: [185, 28, 28],
          isIncome: false,
        },
        revisar: {
          label: 'REVISAR / PENDIENTE', prefix: '[!]',
          accentRGB: [202, 138, 4],   bgRGB: [255, 251, 235],
          amtRGB:    [202, 138, 4],   badgeBgRGB: [254, 243, 199],  badgeTxRGB: [161, 98, 7],
          isIncome: null,
        },
      }

      const getEntryType = (bloque) => {
        if (bloque === 'Ingresos Operativos')  return 'ingreso_op'
        if (bloque === 'Ingresos Financieros') return 'aporte'
        return 'egreso_op'
      }

      // ── Group movements — REVISAR entries get their own group ──
      const gruposMap = new Map()
      movs.forEach(m => {
        const bloque = clasificarMovimiento(m)
        const key = `${m.fecha}__${bloque}`

        if (!gruposMap.has(key)) {
          gruposMap.set(key, { fecha: m.fecha, bloque, movimientos: [] })
        }
        gruposMap.get(key).movimientos.push(m)
      })

      const grupos = Array.from(gruposMap.values()).sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
        const bi = ORDEN_BLOQUES.indexOf(a.bloque) - ORDEN_BLOQUES.indexOf(b.bloque)
        return ORDEN_BLOQUES.indexOf(a.bloque) - ORDEN_BLOQUES.indexOf(b.bloque)
      })

      // ── Build typed entry objects ──────────────────────────────
      let numAsiento   = 0
      let totalIngOp   = 0
      let totalAportes = 0
      let totalEgOp    = 0
      let saldo        = 0

      const entries = grupos.map(({ fecha, bloque, movimientos }) => {
        numAsiento++
        const codigo   = `A-${String(numAsiento).padStart(3, '0')}`
        const tipo     = getEntryType(bloque)
        const cfg      = ENTRY_TYPE_CFG[tipo]
        const esIng    = bloque.startsWith('Ingreso')
        const fechaFmt = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
        const refs     = []
        const acctMap  = new Map()

        movimientos.forEach(m => {
          if (m.descripcion) refs.push(m.descripcion)
          const concept = esIng ? mapearConceptoHaber(m, bloque) : mapearConceptoDebe(m, bloque)
          const dir     = esIng ? 'ENTRADA' : 'SALIDA'
          const prev    = acctMap.get(concept)
          acctMap.set(concept, { nombre: concept, monto: (prev ? prev.monto : 0) + m.monto, dir })
        })

        const accounts = Array.from(acctMap.values())
        const total    = movimientos.reduce((s, m) => s + m.monto, 0)

        if (tipo === 'aporte') {
          totalAportes += total
          saldo += total
        } else if (tipo === 'ingreso_op') {
          totalIngOp += total
          saldo += total
        } else {
          totalEgOp += total
          saldo -= total
        }

        const refStr = refs.length <= 5
          ? refs.join(' · ')
          : refs.slice(0, 5).join(' · ') + ` (+${refs.length - 5} más)`

        return { fecha, fechaFmt, codigo, tipo, cfg, total, accounts, refStr, saldoTras: saldo }
      })

      const totalIngresos = totalIngOp + totalAportes
      const totalEgresos  = totalEgOp
      const resultadoNeto = totalIngresos - totalEgresos

      // ── PDF layout constants ───────────────────────────────────
      const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const PW        = 210
      const PH        = 297
      const ML        = 14
      const MR        = 14
      const CW        = PW - ML - MR   // 182
      const CR        = PW - MR        // 196
      const FBOT      = PH - 9
      const YBOT      = PH - 18
      const nombreMes = MESES[lbMes]
      const primerFmt = `01/${mesStr}/${String(lbAnio).slice(2)}`
      const ultimoD   = new Date(lbAnio, lbMes + 1, 0)
      const ultimoFmt = `${String(ultimoD.getDate()).padStart(2, '0')}/${mesStr}/${String(lbAnio).slice(2)}`

      let curY = 0

      const checkBreak = (needed) => {
        if (curY + needed > YBOT) { doc.addPage(); curY = 16 }
      }

      // ── Document header band ───────────────────────────────────
      doc.setFillColor(15, 28, 46)
      doc.rect(0, 0, PW, 34, 'F')
      doc.setFillColor(15, 110, 86)
      doc.rect(0, 32.5, PW, 1.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(17)
      doc.setTextColor(255, 255, 255)
      doc.text('NexaCore', ML, 13)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(140, 190, 175)
      doc.text('Libro Diario', ML, 20)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(170, 205, 198)
      doc.text(`Período: ${nombreMes} ${lbAnio}  (${primerFmt} – ${ultimoFmt})`, CR, 12, { align: 'right' })
      doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}  ·  Asientos: ${grupos.length}  ·  Movimientos: ${movs.length}`, CR, 19, { align: 'right' })

      // ── Executive summary block ────────────────────────────────
      const SB_Y = 39
      const SB_H = 26
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(215, 220, 225)
      doc.setLineWidth(0.25)
      doc.rect(ML, SB_Y, CW, SB_H, 'FD')

      const summCols = [
        { label: 'Total ingresos', val: fmtPDF(totalIngresos), rgb: [15, 110, 86]   },
        { label: 'Total egresos',  val: fmtPDF(totalEgresos),  rgb: [220, 38, 38]   },
        { label: 'Resultado neto',
          val: (resultadoNeto >= 0 ? '+' : '') + fmtPDF(resultadoNeto),
          rgb: resultadoNeto >= 0 ? [15, 110, 86] : [220, 38, 38],
          bold: true },
      ]
      summCols.forEach((s, i) => {
        const sx = ML + i * (CW / 3) + 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.text(s.label, sx, SB_Y + 8)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(s.bold ? 11 : 10)
        doc.setTextColor(...s.rgb)
        doc.text(s.val, sx, SB_Y + 17)
      })

      curY = SB_Y + SB_H + 8

      // ── Entry drawing constants ────────────────────────────────
      const AW = 2.5     // accent bar width
      const IX = ML + AW + 3.5
      const LH = 5.5     // line height
      const EP = 4       // vertical padding

      const estimateH = (entry) =>
        EP + LH + (entry.refStr ? LH : 0) + entry.accounts.length * LH + LH + EP

      const entriesParaMostrar = [...entries].sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1
        return b.codigo.localeCompare(a.codigo)
      })

      let lastDate = null

      entriesParaMostrar.forEach(entry => {
        const { fecha, fechaFmt, codigo, cfg, total, accounts, refStr, saldoTras, isRev } = entry

        // Date separator
        if (fecha !== lastDate) {
          checkBreak(11 + estimateH(entry))
          const dateLong = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
          const dateTxt  = dateLong.charAt(0).toUpperCase() + dateLong.slice(1)
          doc.setDrawColor(215, 220, 228)
          doc.setLineWidth(0.25)
          doc.line(ML, curY + 4, CR, curY + 4)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          const tw = doc.getTextWidth(dateTxt) + 4
          doc.setFillColor(255, 255, 255)
          doc.rect(ML + 4, curY + 0.5, tw, 6, 'F')
          doc.setTextColor(125, 135, 148)
          doc.text(dateTxt, ML + 6, curY + 5)
          curY += 11
          lastDate = fecha
        } else {
          checkBreak(estimateH(entry))
        }

        const bH = estimateH(entry)

        // Block background + accent bar
        doc.setFillColor(...cfg.bgRGB)
        doc.rect(ML, curY, CW, bH, 'F')
        doc.setFillColor(...cfg.accentRGB)
        doc.rect(ML, curY, AW, bH, 'F')

        let ey = curY + EP + LH - 1

        // Header: date · code  badge  amount
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(55, 60, 65)
        doc.text(`${fechaFmt}  ·  ${codigo}`, IX, ey)

        const bLabel = `${cfg.prefix} ${cfg.label}`
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.8)
        const bw = doc.getTextWidth(bLabel) + 5
        const bx = IX + 50
        doc.setFillColor(...cfg.badgeBgRGB)
        doc.rect(bx, ey - 3.8, bw, 5, 'F')
        doc.setTextColor(...cfg.badgeTxRGB)
        doc.text(bLabel, bx + 2.5, ey - 0.2)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(...cfg.amtRGB)
        doc.text(fmtPDF(total), CR - 2, ey, { align: 'right' })

        ey += LH

        // Reference line (protagonist)
        if (refStr) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(45, 50, 58)
          const maxW = CR - IX - (isRev ? 38 : 8)
          let rd = refStr
          while (rd.length > 10 && doc.getTextWidth(rd) > maxW) rd = rd.slice(0, -4) + '...'
          doc.text(rd, IX, ey)
          if (isRev) {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.setTextColor(161, 98, 7)
            doc.text('Ref. a verificar', CR - 2, ey, { align: 'right' })
          }
          ey += LH
        }

        // Account detail lines
        accounts.forEach(({ nombre, monto, dir }) => {
          const isEnt = dir === 'ENTRADA'
          const lRGB  = isEnt ? [15, 110, 86] : [180, 35, 35]
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.8)
          doc.setTextColor(75, 82, 90)
          doc.text(nombre, IX + 4, ey)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.8)
          doc.setTextColor(...lRGB)
          doc.text(fmtPDF(monto), CR - 22, ey, { align: 'right' })
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.8)
          doc.text(isEnt ? '+ ENTRADA' : '- SALIDA', CR - 2, ey, { align: 'right' })
          ey += LH
        })

        // Running balance
        doc.setDrawColor(208, 213, 220)
        doc.setLineWidth(0.15)
        doc.line(IX, ey - 0.8, CR - 2, ey - 0.8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(110, 118, 130)
        doc.text('Saldo acumulado:', IX, ey + 3)
        const pos = saldoTras >= 0
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(pos ? 15 : 200, pos ? 110 : 40, pos ? 86 : 40)
        doc.text(fmtPDF(saldoTras), CR - 2, ey + 3, { align: 'right' })

        curY += bH + 3
      })

      // ── Period summary ─────────────────────────────────────────
      // const nRev   = codsRevisar.length
      const sBoxH  = 16 + 5 * 7
      checkBreak(sBoxH + 16)
      curY += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(25, 30, 38)
      doc.text(`RESUMEN DEL PERÍODO — ${nombreMes.toUpperCase()} ${lbAnio}`, ML, curY)
      curY += 5

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(200, 206, 214)
      doc.setLineWidth(0.25)
      doc.rect(ML, curY, CW, sBoxH, 'FD')

      const RL = 7
      let sy = curY + 8

      const drawSummRow = (label, val, bold, rgb) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(bold ? 25 : 70, bold ? 30 : 76, bold ? 38 : 84)
        doc.text(label, ML + 6, sy)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...(rgb || [25, 30, 38]))
        doc.text(val, CR - 6, sy, { align: 'right' })
        sy += RL
      }

      drawSummRow('Total ingresos', fmtPDF(totalIngresos), false, [15, 110, 86])
      drawSummRow('Total egresos',  fmtPDF(totalEgresos),  false, [220, 38, 38])

      doc.setDrawColor(200, 206, 214)
      doc.setLineWidth(0.2)
      doc.line(ML + 4, sy - 2, CR - 4, sy - 2)
      sy += 2

      drawSummRow('Resultado neto',
        (resultadoNeto >= 0 ? '+' : '') + fmtPDF(resultadoNeto), true,
        resultadoNeto >= 0 ? [15, 110, 86] : [220, 38, 38])

      doc.line(ML + 4, sy - 2, CR - 4, sy - 2)
      sy += 2

      drawSummRow('Ingresos operativos',      fmtPDF(totalIngOp),   false, [15, 110, 86])
      drawSummRow('Aportes / Financiamiento', fmtPDF(totalAportes), false, [15, 110, 86])
      drawSummRow('Egresos operativos',        fmtPDF(totalEgOp),    false, [220, 38, 38])
      // if (nRev > 0) {
      //   drawSummRow(`Asientos a verificar`, `${nRev} (${codsRevisar.join(', ')})`, false, [161, 98, 7])
      // }

      // ── Page footers ───────────────────────────────────────────
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setDrawColor(215, 220, 226)
        doc.setLineWidth(0.2)
        doc.line(ML, FBOT - 5, CR, FBOT - 5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(158, 163, 170)
        doc.text(
          `Generado automáticamente por NexaCore ·  Página ${i} de ${pageCount}`,
          PW / 2, FBOT, { align: 'center' }
        )
      }

      doc.save(`resumen-financiero-${anioStr}-${mesStr}.pdf`)
      cerrarLibroDiario()
    } catch (e) {
      console.error(e)
      alert('Error al generar el PDF. Intentá de nuevo.')
    } finally {
      setLbGenerando(false)
    }
  }

  const generarLibroDiario = async (movs, modalidades) => {
    setLbGenerando(true)
    try {
      const mesStr    = String(lbMes + 1).padStart(2, '0')
      const anioStr   = String(lbAnio)
      const nombreMes = MESES[lbMes]

      const getCuentaLiquidez = (mKey) => {
        const mod = modalidades[mKey] || { opcion: '', otraTexto: '' }
        if (!mod.opcion) return 'Caja y Bancos'
        if (mod.opcion === 'Otra') return mod.otraTexto || 'Caja y Bancos'
        return mod.opcion
      }

      // Group by date + bloque
      const gruposMap = new Map()
      movs.forEach(m => {
        const bloque = clasificarMovimiento(m)
        // const key    = `${m.fecha}__${bloque}`
        // if (!gruposMap.has(key)) gruposMap.set(key, { fecha: m.fecha, bloque, movimientos: [] })
        // gruposMap.get(key).movimientos.push(m)
        const key = `${m.fecha}__${bloque}`

        if (!gruposMap.has(key)) {
          gruposMap.set(key, { fecha: m.fecha, bloque, movimientos: [] })
        }

        gruposMap.get(key).movimientos.push(m)
      })

      const grupos = Array.from(gruposMap.values()).sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
        return ORDEN_BLOQUES.indexOf(a.bloque) - ORDEN_BLOQUES.indexOf(b.bloque)
      })

      // Build accounting entries (double-entry: Debe / Haber)
      let numAsiento      = 0
      let grandTotalDebe  = 0
      let grandTotalHaber = 0

      const asientos = grupos.map(({ fecha, bloque, movimientos }) => {
        numAsiento++
        const codigo    = `A-${String(numAsiento).padStart(3, '0')}`
        const esIngreso = bloque.startsWith('Ingreso')
        const fechaFmt  = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
        const total     = movimientos.reduce((s, m) => s + m.monto, 0)
        grandTotalDebe  += total
        grandTotalHaber += total

        const debeLines  = []
        const haberLines = []

        if (esIngreso) {
          // DEBE: cash/bank account (receives the money)
          const debeMap = new Map()
          movimientos.forEach(m => {
            const c = getCuentaLiquidez(m._key)
            debeMap.set(c, (debeMap.get(c) || 0) + m.monto)
          })
          debeMap.forEach((monto, cuenta) => debeLines.push({ cuenta, monto }))
          // HABER: income account
          const haberMap = new Map()
          movimientos.forEach(m => {
            const c = mapearConceptoHaber(m, bloque)
            haberMap.set(c, (haberMap.get(c) || 0) + m.monto)
          })
          haberMap.forEach((monto, cuenta) => haberLines.push({ cuenta, monto }))
        } else {
          // DEBE: expense account
          const debeMap = new Map()
          movimientos.forEach(m => {
            const c = mapearConceptoDebe(m, bloque)
            debeMap.set(c, (debeMap.get(c) || 0) + m.monto)
          })
          debeMap.forEach((monto, cuenta) => debeLines.push({ cuenta, monto }))
          // HABER: cash/bank account (pays the expense)
          const haberMap = new Map()
          movimientos.forEach(m => {
            const c = getCuentaLiquidez(m._key)
            haberMap.set(c, (haberMap.get(c) || 0) + m.monto)
          })
          haberMap.forEach((monto, cuenta) => haberLines.push({ cuenta, monto }))
        }

        return { fecha, fechaFmt, bloque, codigo, total, debeLines, haberLines }
      })

      // ── PDF layout ────────────────────────────────────────────
      const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const PW   = 210, PH = 297
      const ML   = 12,  MR = 12
      const CR   = PW - MR          // 198
      const CW   = CR - ML          // 186
      const FBOT = PH - 9
      const YBOT = PH - 20

      // Column geometry — totals to 186 mm
      const C_FECHA_X = ML
      const C_FECHA_W = 22
      const C_COD_X   = C_FECHA_X + C_FECHA_W  // 34
      const C_COD_W   = 18
      const C_CONC_X  = C_COD_X + C_COD_W      // 52
      const C_CONC_W  = 90
      const C_DEBE_X  = C_CONC_X + C_CONC_W    // 142
      const C_DEBE_W  = 28
      const C_HABER_X = C_DEBE_X + C_DEBE_W    // 170
      const C_HABER_W = CR - C_HABER_X          // 28

      const LH = 5.2
      let curY = 0

      const drawTableHeader = (startY) => {
        doc.setFillColor(232, 245, 239)
        doc.rect(ML, startY, CW, 7, 'F')
        doc.setDrawColor(15, 110, 86)
        doc.setLineWidth(0.5)
        doc.line(ML, startY + 7, CR, startY + 7)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(15, 110, 86)
        doc.text('Fecha',    C_FECHA_X + 1,                startY + 5)
        doc.text('Código',   C_COD_X + 1,                  startY + 5)
        doc.text('Concepto', C_CONC_X + 2,                 startY + 5)
        doc.text('Debe',     C_DEBE_X + C_DEBE_W - 1,     startY + 5, { align: 'right' })
        doc.text('Haber',    C_HABER_X + C_HABER_W - 1,   startY + 5, { align: 'right' })
        return startY + 9
      }

      const newPage = () => { doc.addPage(); curY = drawTableHeader(12) }
      const checkBreak = (needed) => { if (curY + needed > YBOT) newPage() }

      // ── Page 1 header band ────────────────────────────────────
      doc.setFillColor(15, 28, 46)
      doc.rect(0, 0, PW, 30, 'F')
      doc.setFillColor(15, 110, 86)
      doc.rect(0, 28.5, PW, 1.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(255, 255, 255)
      doc.text('NexaCore', ML, 11)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(140, 190, 175)
      doc.text('Libro Diario Contable', ML, 18)

      const primerFmtLD = `01/${mesStr}/${String(lbAnio).slice(2)}`
      const ultimoDLD   = new Date(lbAnio, lbMes + 1, 0)
      const ultimoFmtLD = `${String(ultimoDLD.getDate()).padStart(2, '0')}/${mesStr}/${String(lbAnio).slice(2)}`
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(170, 205, 198)
      doc.text(`Período: ${nombreMes} ${lbAnio}  (${primerFmtLD} – ${ultimoFmtLD})`, CR, 11, { align: 'right' })
      doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}  ·  Asientos: ${grupos.length}`, CR, 18, { align: 'right' })

      curY = drawTableHeader(35)

      // ── Entries ───────────────────────────────────────────────
      let lastDate = null

      asientos.forEach(({ fecha, fechaFmt, bloque, codigo, total, debeLines, haberLines }) => {
        const totalRows  = debeLines.length + haberLines.length + 1
        const estH       = totalRows * LH + 8
        const dateSepH   = fecha !== lastDate ? 10 : 3
        checkBreak(estH + dateSepH)

        if (fecha !== lastDate) {
          const dateLong = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
          const dateTxt  = dateLong.charAt(0).toUpperCase() + dateLong.slice(1)
          doc.setFillColor(247, 252, 249)
          doc.rect(ML, curY, CW, 7.5, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          doc.setTextColor(50, 80, 65)
          doc.text(dateTxt, ML + 3, curY + 5)
          curY += 7.5
          lastDate = fecha
        } else {
          doc.setDrawColor(218, 232, 224)
          doc.setLineWidth(0.15)
          doc.line(C_CONC_X, curY, CR, curY)
          curY += 2
        }

        // Debe lines (account to debit)
        let firstRow = true
        debeLines.forEach(({ cuenta, monto }) => {
          if (firstRow) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7.5)
            doc.setTextColor(80, 90, 100)
            doc.text(fechaFmt, C_FECHA_X + 1, curY + LH)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7.5)
            doc.setTextColor(15, 110, 86)
            doc.text(codigo, C_COD_X + 1, curY + LH)
            firstRow = false
          }
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(30, 40, 50)
          doc.text(cuenta, C_CONC_X + 2, curY + LH)
          doc.text(fmtPDF(monto), C_DEBE_X + C_DEBE_W - 1, curY + LH, { align: 'right' })
          curY += LH
        })

        // Haber lines (account to credit, indented with "a")
        haberLines.forEach(({ cuenta, monto }) => {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(7.5)
          doc.setTextColor(60, 75, 68)
          doc.text(`     a  ${cuenta}`, C_CONC_X + 2, curY + LH)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(60, 75, 68)
          doc.text(fmtPDF(monto), C_HABER_X + C_HABER_W - 1, curY + LH, { align: 'right' })
          curY += LH
        })

        // Total asiento row
        curY += 1
        doc.setDrawColor(190, 210, 200)
        doc.setLineWidth(0.2)
        doc.line(C_DEBE_X, curY, CR, curY)
        curY += 2
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.8)
        doc.setTextColor(50, 70, 60)
        doc.text(`TOTAL ASIENTO — ${bloque.toUpperCase()}`, C_CONC_X + 2, curY + LH - 0.5)
        doc.setTextColor(30, 40, 50)
        doc.text(fmtPDF(total), C_DEBE_X  + C_DEBE_W  - 1, curY + LH - 0.5, { align: 'right' })
        doc.text(fmtPDF(total), C_HABER_X + C_HABER_W - 1, curY + LH - 0.5, { align: 'right' })
        curY += LH + 3
      })

      // ── TOTAL PERÍODO (green background per spec) ─────────────
      checkBreak(14)
      curY += 4

      // mismo fondo que encabezado de tabla
      doc.setFillColor(232, 245, 239)
      doc.rect(ML, curY, CW, 10, 'F')

      // línea verde igual al header
      doc.setDrawColor(15, 110, 86)
      doc.setLineWidth(0.4)
      doc.line(ML, curY, CR, curY)

      // texto igual al header
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(15, 110, 86)

      doc.text('TOTAL PERÍODO', C_CONC_X + 2, curY + 6.5)
      doc.text(fmtPDF(grandTotalDebe), C_DEBE_X + C_DEBE_W - 1, curY + 6.5, { align: 'right' })
      doc.text(fmtPDF(grandTotalHaber), C_HABER_X + C_HABER_W - 1, curY + 6.5, { align: 'right' })
      
      doc.text(fmtPDF(grandTotalDebe),  C_DEBE_X  + C_DEBE_W  - 1, curY + 6.5, { align: 'right' })
      doc.text(fmtPDF(grandTotalHaber), C_HABER_X + C_HABER_W - 1, curY + 6.5, { align: 'right' })

      // ── Page footers ──────────────────────────────────────────
      const pageCountLD = doc.getNumberOfPages()
      for (let i = 1; i <= pageCountLD; i++) {
        doc.setPage(i)
        doc.setDrawColor(215, 220, 226)
        doc.setLineWidth(0.2)
        doc.line(ML, FBOT - 5, CR, FBOT - 5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(158, 163, 170)
        doc.text(
          `Generado automáticamente por NexaCore  ·  Página ${i} de ${pageCountLD}`,
          PW / 2, FBOT, { align: 'center' }
        )
      }

      doc.save(`libro-diario-${anioStr}-${mesStr}.pdf`)
      cerrarLibroDiario()
    } catch (e) {
      console.error(e)
      alert('Error al generar el Libro Diario. Intentá de nuevo.')
    } finally {
      setLbGenerando(false)
    }
  }

  return (
    <div className="fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[20px] font-semibold text-gray-900">{tituloMostrado}</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {totales.count} registros
            {!todos && (
              <> · Total:{' '}
                <span className="font-semibold" style={{ color: amountColor }}>{fmt(totales.suma)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canVerTrazabilidad && (
            <button
              onClick={abrirTrazabilidad}
              className={btnSecondary}
              style={{ borderColor: 'rgba(15,110,86,0.3)', color: '#0F6E56' }}
            >
              <Activity size={14} /> Trazabilidad
            </button>
          )}
          {todos && (
            <>
              <button
                onClick={() => { setLbTipoReporte('resumen'); setShowLibroDiario(true) }}
                className={btnSecondary}
                style={{ borderColor: 'rgba(15,110,86,0.3)', color: '#0F6E56' }}
              >
                <BookOpen size={14} /> Resumen Financiero
              </button>
              <button
                onClick={() => { setLbTipoReporte('libroDiario'); setShowLibroDiario(true) }}
                className={btnSecondary}
                style={{ borderColor: 'rgba(15,110,86,0.3)', color: '#0F6E56' }}
              >
                <BookOpen size={14} /> Libro Diario Contable
              </button>
            </>
          )}
          {!todos && (
            <button onClick={() => { setEditItem(null); setShowForm(true) }}
              className={btnPrimary} style={{ background: '#0F6E56' }}>
              <Plus size={15} /> Registrar {tituloSingular || tituloMostrado.replace(/s$/, '')}
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={filtros.search} onChange={e => setFiltro('search', e.target.value)}
              placeholder="Buscar por descripción..." className={inputCls + ' pl-9'}
              style={{ borderColor: 'rgba(15,110,86,0.2)' }} />
          </div>
          {!categoriaFija && (
            <select value={filtros.categoria} onChange={e => setFiltro('categoria', e.target.value)}
              className={inputCls + ' w-auto'} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          )}
          <button onClick={() => setShowFiltros(v => !v)} className={btnSecondary}
            style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <Filter size={14} /> Fechas
            <ChevronDown size={13} className={`transition-transform ${showFiltros ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={cargar} className={btnSecondary} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
            <RefreshCw size={14} />
          </button>
        </div>
        {showFiltros && (
          <div className="flex gap-3 mt-3 flex-wrap items-end">
            <div>
              <label className="text-[11.5px] text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={filtros.fecha_desde} onChange={e => setFiltro('fecha_desde', e.target.value)}
                className={inputCls} style={{ borderColor: 'rgba(15,110,86,0.2)' }} />
            </div>
            <div>
              <label className="text-[11.5px] text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={filtros.fecha_hasta} onChange={e => setFiltro('fecha_hasta', e.target.value)}
                className={inputCls} style={{ borderColor: 'rgba(15,110,86,0.2)' }} />
            </div>
            <button onClick={limpiarFiltros}
              className={btnSecondary + ' text-[12px]'} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-[13.5px]">
            <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b bg-gray-50/60" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
                  {['Fecha', 'Descripción', 'Categoría', isIngreso ? 'Cliente' : 'Proveedor', 'Comprobante', 'Monto', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.id} className="border-b hover:bg-gray-50/50 transition-colors group"
                    style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-AR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 max-w-[200px] truncate">{m.descripcion}</div>
                      {m.notas && <div className="text-[11.5px] text-gray-400 truncate max-w-[200px]">{m.notas}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium"
                          style={CATEGORIA_BADGE[m.categoria] || { background: '#FFEDD5', color: '#9A3412' }}
                        >
                          {m.categoria}
                        </span>
                        {esSalario(m) && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium"
                            style={{ background: '#EDE9FE', color: '#5B21B6' }}
                          >
                            Sueldos
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 max-w-[120px] truncate">{m.proveedor_cliente || '—'}</td>
                    <td className="py-3 px-4">
                      {esSalario(m) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-gray-100 text-gray-400">—</span>
                      ) : m.comprobantes?.length > 0 ? (
                        <a href={m.comprobantes[0].url_archivo} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium"
                          style={{ background: '#E1F5EE', color: '#0F6E56' }}>
                          ✓ Ver
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-gray-100 text-gray-400">Sin comp.</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold whitespace-nowrap" style={{ color: getMontoColor(m) }}>
                      {fmt(m.monto)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditItem(m); setShowForm(true) }}
                          className="px-2 py-1 rounded-lg text-[11.5px] font-medium text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                          Editar
                        </button>
                        <button onClick={() => setConfirmDelete(m)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} className="py-16 text-center">
                    <p className="text-gray-400 text-[13.5px]">No hay {tituloMostrado.toLowerCase()} registradas</p>
                    {!todos && (
                      <button onClick={() => { setEditItem(null); setShowForm(true) }}
                        className={btnPrimary + ' mt-4 mx-auto'} style={{ background: '#0F6E56' }}>
                        <Plus size={15} /> Registrar primera {tituloMostrado.toLowerCase().replace(/s$/, '')}
                      </button>
                    )}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <FormMovimiento tipo={tipo} movimiento={editItem} categoriaInicial={categoriaFija}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); cargar() }} />
      )}

      {confirmDelete && (
        <AppModal onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <div className="p-6">
            <h3 className="font-serif font-semibold text-gray-900 mb-2 text-[16px]">¿Eliminar registro?</h3>
            <p className="text-[13px] text-gray-500 mb-5">
              Se eliminará <span className="font-medium text-gray-700">"{confirmDelete.descripcion}"</span> y sus comprobantes. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className={btnSecondary + ' flex-1 justify-center'} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-colors">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {/* ── Modal Trazabilidad ────────────────────────────────── */}
      {showTrazabilidad && (
        <AppModal onClose={cerrarTrazabilidad} maxWidth="max-w-4xl">
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <div>
              <h3 className="font-serif font-semibold text-gray-900 text-[16px] flex items-center gap-2">
                <Activity size={16} style={{ color: '#0F6E56' }} /> Trazabilidad de movimientos
              </h3>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {trazLoading ? '…' : `${trazItems.length} registros`}
              </p>
            </div>
            <button onClick={cerrarTrazabilidad} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {trazLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-[13.5px]">
                <RefreshCw size={16} className="animate-spin mr-2" /> Cargando…
              </div>
            ) : trazItems.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-[13.5px]">
                Sin movimientos registrados
              </div>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b" style={{ borderColor: 'rgba(15,110,86,0.12)' }}>
                    {['Fecha mov.', 'Descripción', 'Tipo', 'Monto', 'Creado por', 'Fecha de creación'].map(h => (
                      <th key={h} className="text-left py-2 px-2 pb-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trazItems.map(m => {
                    const tipoCfg = m.tipo === 'Ingreso' ? { bg: '#E1F5EE', color: '#0F6E56' } : { bg: '#FEE2E2', color: '#991B1B' }
                    const montoColor = m.tipo === 'Ingreso' ? '#1D9E75' : '#E24B4A'
                    return (
                      <tr key={m.id} className="border-b hover:bg-gray-50/40 transition-colors" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                        <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                        <td className="py-2.5 px-2"><div className="font-medium text-gray-800 truncate max-w-[200px]">{m.descripcion}</div></td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap" style={{ background: tipoCfg.bg, color: tipoCfg.color }}>{m.tipo}</span>
                        </td>
                        <td className="py-2.5 px-2 font-semibold whitespace-nowrap" style={{ color: montoColor }}>{fmt(m.monto)}</td>
                        <td className="py-2.5 px-2 text-gray-500 max-w-[160px] truncate">{m.created_by || 'No registrado'}</td>
                        <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <button onClick={cerrarTrazabilidad} className={btnSecondary + ' flex-1 justify-center'} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
              Cerrar
            </button>
          </div>
        </AppModal>
      )}

      {/* ── Libro Diario: Paso 1 — Seleccionar período ─────────── */}
      {showLibroDiario && lbStep === 'select' && (
        <AppModal onClose={cerrarLibroDiario} maxWidth="max-w-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-semibold text-gray-900 text-[16px] flex items-center gap-2">
                <BookOpen size={16} style={{ color: '#0F6E56' }} /> {lbTipoReporte === 'libroDiario' ? 'Libro Diario Contable' : 'Resumen Financiero'}
              </h3>
              <button onClick={cerrarLibroDiario} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Mes</label>
                <select value={lbMes} onChange={e => setLbMes(Number(e.target.value))}
                  className="w-full border rounded-xl px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:ring-2 transition-all"
                  style={{ borderColor: 'rgba(15,110,86,0.25)' }}>
                  {MESES.map((mes, i) => <option key={i} value={i}>{mes}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Año</label>
                <input type="number" value={lbAnio} onChange={e => setLbAnio(Number(e.target.value))}
                  min={2020} max={2099}
                  className="w-full border rounded-xl px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:ring-2 transition-all"
                  style={{ borderColor: 'rgba(15,110,86,0.25)' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={cerrarLibroDiario} className={btnSecondary + ' flex-1 justify-center'} style={{ borderColor: 'rgba(15,110,86,0.2)' }}>
                Cancelar
              </button>
              <button onClick={cargarParaRevisar} disabled={lbCargando}
                className="flex-1 font-medium px-4 py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-colors text-white disabled:opacity-60"
                style={{ background: lbCargando ? '#6BA897' : '#0F6E56' }}>
                {lbCargando ? <><RefreshCw size={14} className="animate-spin" /> Cargando…</> : <><BookOpen size={14} /> Revisar movimientos</>}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {/* ── Libro Diario: Paso 2 — Revisar y asignar modalidades ─ */}
      {showLibroDiario && lbStep === 'review' && (
        <AppModal onClose={cerrarLibroDiario} maxWidth="max-w-4xl">
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setLbStep('select')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Volver">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-semibold text-gray-900 text-[16px]">Revisión · {MESES[lbMes]} {lbAnio}</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {lbMovsReview.length} movimiento{lbMovsReview.length !== 1 ? 's' : ''} · Completá la fuente/modalidad donde corresponda
                </p>
              </div>
            </div>
            <button onClick={cerrarLibroDiario} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {lbMovsReview.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-[13.5px]">
                <p>No hay movimientos registrados para este período.</p>
              </div>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b" style={{ borderColor: 'rgba(15,110,86,0.12)' }}>
                    <th className="text-left py-2 px-2 pb-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider w-14">Fecha</th>
                    <th className="text-left py-2 px-2 pb-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider w-18">Tipo</th>
                    <th className="text-left py-2 px-2 pb-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">Clasificación contable</th>
                    <th className="text-left py-2 px-2 pb-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">Descripción</th>
                    <th className="text-right py-2 px-2 pb-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider w-24">Monto</th>
                    <th className="text-left py-2 px-2 pb-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">Fuente / Modalidad</th>
                  </tr>
                </thead>
                <tbody>
                  {lbMovsReview.map(m => {
                    const modal  = lbModalidades[m._key] || { opcion: '', otraTexto: '' }
                    const bloque = clasificarMovimiento(m)
                    const bCfg   = BLOQUE_CFG[bloque]
                    const tipoCfg = {
                      'Ingreso':   { bg: '#E1F5EE', color: '#0F6E56' },
                      'Gasto':     { bg: '#FEE2E2', color: '#991B1B' },
                      'Salario':   { bg: '#EDE9FE', color: '#5B21B6' },
                      'Inversión': { bg: '#FEF3C7', color: '#92400E' },
                    }[m.tipo] || { bg: '#F3F4F6', color: '#4B5563' }
                    return (
                      <tr key={m._key} className="border-b hover:bg-gray-50/40 transition-colors" style={{ borderColor: 'rgba(15,110,86,0.06)' }}>
                        <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">
                          {new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap" style={{ background: tipoCfg.bg, color: tipoCfg.color }}>{m.tipo}</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium whitespace-nowrap" style={{ background: bCfg.badgeBg, color: bCfg.badge }}>{bloque}</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="font-medium text-gray-800 truncate max-w-[160px]">{m.descripcion}</div>
                          <div className="text-[11px] text-gray-400">{m.categoria}</div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold text-gray-800 whitespace-nowrap">{fmt(m.monto)}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <select value={modal.opcion} onChange={e => setModalidad(m._key, 'opcion', e.target.value)}
                              className="border rounded-lg px-2 py-1.5 text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white transition-all"
                              style={{ borderColor: modal.opcion ? 'rgba(15,110,86,0.45)' : 'rgba(0,0,0,0.15)' }}>
                              <option value="">Caja / Banco (por defecto)</option>
                              {OPCIONES_MODALIDAD.map(op => <option key={op} value={op}>{op === 'Otra' ? 'Otra…' : op}</option>)}
                            </select>
                            {modal.opcion === 'Otra' && (
                              <input type="text" value={modal.otraTexto} onChange={e => setModalidad(m._key, 'otraTexto', e.target.value)}
                                placeholder="Escribir cuenta…"
                                className="border rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-teal-700/20 transition-all"
                                style={{ borderColor: 'rgba(15,110,86,0.4)', width: '150px' }} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex gap-2 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
            <button onClick={() => lbTipoReporte === 'libroDiario' ? generarLibroDiario(lbMovsReview, lbModalidades) : generarResumenFinanciero(lbMovsReview, lbModalidades)}
              disabled={lbGenerando || lbMovsReview.length === 0}
              className="flex-1 font-medium px-4 py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-colors text-white disabled:opacity-50"
              style={{ background: lbGenerando ? '#6BA897' : '#0F6E56' }}>
              {lbGenerando ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {lbGenerando ? 'Generando…' : 'Confirmar y generar PDF'}
            </button>
          </div>
        </AppModal>
      )}
    </div>
  )
}
