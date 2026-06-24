import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload, CheckCircle, XCircle, AlertCircle, RefreshCw,
  ChevronLeft, History, RotateCcw, TrendingDown, ShoppingBag,
  Users, DollarSign, BarChart2, Info, Calendar, Tag,
  FileSpreadsheet, ChevronRight, Clock, Trash2
} from 'lucide-react'
import { api } from '../lib/api'
import AppModal from './AppModal'

// ─── Metadata de tipos de migración ─────────────────────────────────────────

const TIPOS = [
  {
    id: 'gastos',
    backendId: 'GASTOS_HISTORICOS',
    label: 'Gastos históricos',
    icono: TrendingDown,
    color: '#DC2626',
    bg: '#FEF2F2',
    borde: '#FECACA',
    descripcion: 'Importá gastos mensuales históricos desde planillas tipo "Gastos Mensuales".',
    destino: 'Gastos / Movimientos financieros',
    columnas: [
      { nombre: 'Nombre',      obligatoria: true,  desc: 'Nombre del gasto o ítem' },
      { nombre: 'Cantidad',    obligatoria: true,  desc: 'Cantidad de unidades' },
      { nombre: 'Concepto',    obligatoria: true,  desc: 'Concepto o categoría' },
      { nombre: 'Descripción', obligatoria: false, desc: 'Detalle adicional' },
      { nombre: 'Total',       obligatoria: true,  desc: 'Monto total del gasto' },
      { nombre: 'Entregado',   obligatoria: false, desc: 'Monto ya entregado/pagado' },
    ],
    advertencias: [
      'Verificá que los montos estén en pesos argentinos (ARS).',
      'Los gastos se registrarán con la fecha de imputación que indiques.',
    ],
    extras: ['fecha_imputacion', 'categoria_defecto'],
  },
  {
    id: 'compras',
    backendId: 'COMPRAS_INTERNACIONALES',
    label: 'Compras internacionales',
    icono: ShoppingBag,
    color: '#7C3AED',
    bg: '#F5F3FF',
    borde: '#DDD6FE',
    descripcion: 'Importá compras internacionales o inversiones desde planillas tipo "Compras China".',
    destino: 'Inversiones',
    columnas: [
      { nombre: 'Nombre',      obligatoria: true,  desc: 'Nombre del producto o inversión' },
      { nombre: 'Cantidad',    obligatoria: true,  desc: 'Cantidad de unidades' },
      { nombre: 'Concepto',    obligatoria: true,  desc: 'Concepto de la compra' },
      { nombre: 'Total USD',   obligatoria: true,  desc: 'Monto en dólares' },
      { nombre: 'Total Pesos', obligatoria: true,  desc: 'Monto en pesos al momento de la compra' },
      { nombre: 'USD Fecha',   obligatoria: false, desc: 'Cotización del dólar usada' },
    ],
    advertencias: [
      'Se registra tanto el monto en USD como en pesos.',
      'Si el archivo no trae fecha, podés indicar una fecha global.',
    ],
    extras: ['fecha_global'],
  },
  {
    id: 'sueldos',
    backendId: 'SUELDOS_HISTORICOS',
    label: 'Sueldos históricos',
    icono: Users,
    color: '#0369A1',
    bg: '#F0F9FF',
    borde: '#BAE6FD',
    descripcion: 'Importá sueldos históricos consolidados por mes desde planillas tipo "Sueldos".',
    destino: 'Sueldos históricos / Movimientos RRHH',
    columnas: [
      { nombre: 'Mes',         obligatoria: true,  desc: 'Período (MM/YYYY o nombre del mes)' },
      { nombre: 'Fijo USD',    obligatoria: false, desc: 'Monto fijo en dólares' },
      { nombre: 'Fijo Pesos',  obligatoria: false, desc: 'Monto fijo en pesos' },
      { nombre: 'Pasantes',    obligatoria: false, desc: 'Total pagado a pasantes' },
      { nombre: 'Polo Pasan',  obligatoria: false, desc: 'Total Polo Pasante' },
      { nombre: 'Por Hora',    obligatoria: false, desc: 'Total pagado por hora' },
      { nombre: 'Total Pesos', obligatoria: true,  desc: 'Total mensual en pesos' },
      { nombre: 'Total USD',   obligatoria: false, desc: 'Total mensual en dólares' },
    ],
    advertencias: [
      'Estos datos son totales mensuales consolidados, NO empleados individuales.',
      'Cada fila representa el gasto total de sueldos de un mes completo.',
    ],
    extras: ['consolidado'],
  },
  {
    id: 'cobrar',
    backendId: 'CUENTAS_POR_COBRAR',
    label: 'Cuentas por cobrar',
    icono: DollarSign,
    color: '#D97706',
    bg: '#FFFBEB',
    borde: '#FDE68A',
    descripcion: 'Importá cuentas pendientes de cobro desde planillas tipo "Por Cobrar".',
    destino: 'Cuentas por cobrar / CRM',
    columnas: [
      { nombre: 'Nombre',      obligatoria: true,  desc: 'Nombre del cliente o deudor' },
      { nombre: 'Cantidad',    obligatoria: false, desc: 'Cantidad de ítems o cuotas' },
      { nombre: 'Costo Total', obligatoria: true,  desc: 'Importe total a cobrar' },
      { nombre: 'Concepto',    obligatoria: true,  desc: 'Concepto del cobro pendiente' },
    ],
    advertencias: [
      'Estos registros son importes PENDIENTES de cobro, no ingresos ya cobrados.',
      'El estado inicial de todas las cuentas será "Pendiente".',
    ],
    extras: [],
  },
  {
    id: 'totales',
    backendId: 'TOTALES_FINANCIEROS',
    label: 'Totales financieros',
    icono: BarChart2,
    color: '#059669',
    bg: '#ECFDF5',
    borde: '#A7F3D0',
    descripcion: 'Importá un resumen financiero histórico para conciliación y auditoría interna.',
    destino: 'Conciliación / Auditoría',
    columnas: [
      { nombre: 'Total gastos mensuales',        obligatoria: false, desc: 'Suma de todos los gastos del período' },
      { nombre: 'Total sueldos',                 obligatoria: false, desc: 'Suma de sueldos pagados' },
      { nombre: 'Total compras internacionales', obligatoria: false, desc: 'Suma de compras en USD/pesos' },
      { nombre: 'Total gastos',                  obligatoria: false, desc: 'Total general de egresos' },
      { nombre: 'Total pagos clientes',          obligatoria: false, desc: 'Ingresos recibidos de clientes' },
      { nombre: 'Total cobrables a Polo',        obligatoria: false, desc: 'Importes a cobrar a Polo' },
      { nombre: 'Total neto',                    obligatoria: false, desc: 'Resultado neto del período' },
    ],
    advertencias: [
      'Esta migración NO genera movimientos nuevos en el sistema.',
      'Se usa exclusivamente para conciliación, validación y auditoría interna.',
    ],
    extras: [],
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

// Garantiza YYYY-MM-DD sin importar cómo el browser serializa el input type=date.
// Acepta YYYY-MM-DD (pasa directo) o DD/MM/YYYY (invierte los bloques).
function normalizarFecha(valor) {
  if (!valor) return valor
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  const m = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return valor
}

const CAMPOS_FECHA = ['fecha_global', 'fecha_imputacion']

function appendParams(fd, params) {
  Object.entries(params).forEach(([k, v]) => {
    if (!v) return
    fd.append(k, CAMPOS_FECHA.includes(k) ? normalizarFecha(v) : v)
  })
}

function fmtFecha(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function fmtNum(n) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n ?? 0)
}

const inputCls = `w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10`
const labelCls = `block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5`

// ─── Componente principal ────────────────────────────────────────────────────

export default function ImportarExcel() {
  // paso: 'seleccion' | 'config' | 'previsualizando' | 'preview' | 'confirmando' | 'resultado'
  const [paso, setPaso] = useState('seleccion')
  const [tipoId, setTipoId] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [params, setParams] = useState({})
  const [previewData, setPreviewData] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [batchId, setBatchId] = useState(null)
  const [errMsg, setErrMsg] = useState(null)
  const [historial, setHistorial] = useState(null)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [modalRevertir, setModalRevertir] = useState(null) // batch a revertir
  const [revirtiendo, setRevirtiendo] = useState(false)
  const fileRef = useRef()

  const tipo = TIPOS.find(t => t.id === tipoId)

  // ── Cargar historial ───────────────────────────────────────────────────────
  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true)
    try {
      const res = await api.getMigracionBatches()
      setHistorial(res?.batches ?? res ?? [])
    } catch {
      setHistorial([])
    } finally {
      setCargandoHistorial(false)
    }
  }, [])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial])

  // ── Seleccionar tipo ───────────────────────────────────────────────────────
  const seleccionarTipo = (id) => {
    setTipoId(id)
    setArchivo(null)
    setParams({})
    setPreviewData(null)
    setResultado(null)
    setErrMsg(null)
    setBatchId(null)
    if (fileRef.current) fileRef.current.value = ''
    setPaso('config')
  }

  // ── Seleccionar archivo ────────────────────────────────────────────────────
  const handleArchivo = (e) => {
    const f = e.target.files[0]
    if (f) setArchivo(f)
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!archivo) { setErrMsg('Seleccioná un archivo antes de previsualizar.'); return }
    setPaso('previsualizando')
    setErrMsg(null)
    try {
      const fd = new FormData()
      fd.append('archivo', archivo)
      fd.append('tipo_migracion', tipo.backendId)
      appendParams(fd, params)
      console.log('[MigracionFormData] preview:', Object.fromEntries(fd.entries()))
      const res = await api.previewMigracion(fd)
      console.log('[MigracionPreview] response:', JSON.stringify(res, null, 2))
      setPreviewData(res)
      setPaso('preview')
    } catch (err) {
      setErrMsg(err.message)
      setPaso('config')
    }
  }

  // ── Confirmar ──────────────────────────────────────────────────────────────
  const handleConfirmar = async () => {
    setPaso('confirmando')
    setErrMsg(null)
    try {
      const fd = new FormData()
      fd.append('archivo', archivo)
      fd.append('tipo_migracion', tipo.backendId)
      appendParams(fd, params)
      console.log('[MigracionFormData] confirmar:', Object.fromEntries(fd.entries()))
      const res = await api.confirmarMigracion(fd)
      console.log('[MigracionConfirmar]', res)
      setResultado(res)
      setBatchId(res?.batch_id ?? res?.id ?? null)
      setPaso('resultado')
      cargarHistorial()
    } catch (err) {
      setErrMsg(err.message)
      setPaso('preview')
    }
  }

  // ── Revertir ───────────────────────────────────────────────────────────────
  const handleRevertir = async (id) => {
    setRevirtiendo(true)
    try {
      await api.revertirMigracion(id)
      setModalRevertir(null)
      cargarHistorial()
      if (batchId === id) {
        setPaso('seleccion')
        setResultado(null)
        setBatchId(null)
      }
    } catch (err) {
      setErrMsg(err.message)
    } finally {
      setRevirtiendo(false)
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setPaso('seleccion')
    setTipoId(null)
    setArchivo(null)
    setParams({})
    setPreviewData(null)
    setResultado(null)
    setBatchId(null)
    setErrMsg(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const volverAConfig = () => {
    setPaso('config')
    setPreviewData(null)
    setErrMsg(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in space-y-5 max-w-4xl">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar Excel</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Migración inicial de datos históricos desde archivos Excel o CSV
        </p>
      </div>

      {/* Breadcrumb de pasos */}
      <PasosIndicador paso={paso} tipoLabel={tipo?.label} />

      {/* ── Paso 1: Selección de tipo ── */}
      {paso === 'seleccion' && (
        <SeccionSeleccion onSeleccionar={seleccionarTipo} />
      )}

      {/* ── Paso 2: Configuración ── */}
      {paso === 'config' && tipo && (
        <SeccionConfig
          tipo={tipo}
          archivo={archivo}
          fileRef={fileRef}
          params={params}
          setParams={setParams}
          errMsg={errMsg}
          onArchivo={handleArchivo}
          onPreview={handlePreview}
          onVolver={() => {
            setPaso('seleccion')
            setTipoId(null)
            setArchivo(null)
            setParams({})
            setPreviewData(null)
            setErrMsg(null)
            if (fileRef.current) fileRef.current.value = ''
          }}
        />
      )}

      {/* ── Cargando preview ── */}
      {paso === 'previsualizando' && (
        <EstadoCargando texto="Procesando archivo..." subtexto={archivo?.name} />
      )}

      {/* ── Paso 3: Preview ── */}
      {paso === 'preview' && previewData && tipo && (
        <SeccionPreview
          tipo={tipo}
          previewData={previewData}
          errMsg={errMsg}
          onVolver={volverAConfig}
          onConfirmar={handleConfirmar}
        />
      )}

      {/* ── Confirmando ── */}
      {paso === 'confirmando' && (
        <EstadoCargando texto="Confirmando migración..." subtexto="Esto puede tardar unos segundos" />
      )}

      {/* ── Paso 4: Resultado ── */}
      {paso === 'resultado' && resultado && tipo && (
        <SeccionResultado
          tipo={tipo}
          resultado={resultado}
          batchId={batchId}
          errMsg={errMsg}
          onNueva={reset}
          onRevertir={() => setModalRevertir(batchId)}
        />
      )}

      {/* ── Historial de migraciones ── */}
      <SeccionHistorial
        historial={historial}
        cargando={cargandoHistorial}
        onRevertir={(id) => setModalRevertir(id)}
      />

      {/* ── Modal de confirmación de reversión ── */}
      {modalRevertir && (
        <ModalRevertir
          onConfirmar={() => handleRevertir(modalRevertir)}
          onCancelar={() => setModalRevertir(null)}
          cargando={revirtiendo}
        />
      )}
    </div>
  )
}

// ─── Indicador de pasos ──────────────────────────────────────────────────────

function PasosIndicador({ paso, tipoLabel }) {
  const pasos = [
    { id: 'seleccion',       label: 'Tipo' },
    { id: 'config',          label: 'Configurar' },
    { id: 'preview',         label: 'Previsualizar' },
    { id: 'resultado',       label: 'Resultado' },
  ]
  const ordenPaso = { seleccion: 0, config: 1, previsualizando: 1, preview: 2, confirmando: 2, resultado: 3 }
  const pasoActual = ordenPaso[paso] ?? 0

  return (
    <div className="flex items-center gap-1">
      {pasos.map((p, i) => {
        const completado = pasoActual > i
        const activo     = pasoActual === i
        return (
          <div key={p.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              completado ? 'bg-teal-800 text-white' :
              activo     ? 'bg-teal-100 text-teal-800 border border-teal-300' :
                           'bg-gray-100 text-gray-400'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                completado ? 'bg-white text-teal-800' :
                activo     ? 'bg-teal-800 text-white' :
                             'bg-gray-300 text-white'
              }`}>{completado ? '✓' : i + 1}</span>
              {activo && tipoLabel && p.id === 'config' ? tipoLabel : p.label}
            </div>
            {i < pasos.length - 1 && (
              <ChevronRight size={12} className={completado || activo ? 'text-teal-400' : 'text-gray-300'} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Selección de tipo ───────────────────────────────────────────────────────

function SeccionSeleccion({ onSeleccionar }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet size={18} className="text-teal-800" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">¿Qué tipo de datos querés migrar?</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Elegí el tipo de planilla que vas a importar. Cada tipo tiene su propio formato y destino en el sistema.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIPOS.map(t => {
            const Icono = t.icono
            return (
              <button
                key={t.id}
                onClick={() => onSeleccionar(t.id)}
                className="text-left p-4 rounded-xl border-2 transition-all hover:shadow-md hover:-translate-y-0.5 group"
                style={{ borderColor: t.borde, background: t.bg }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: t.color + '20' }}>
                    <Icono size={18} style={{ color: t.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13.5px] text-gray-900 group-hover:text-gray-700">{t.label}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{t.descripcion}</p>
                    <p className="text-[11px] font-medium mt-2" style={{ color: t.color }}>
                      → {t.destino}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Configuración ───────────────────────────────────────────────────────────

function SeccionConfig({ tipo, archivo, fileRef, params, setParams, errMsg, onArchivo, onPreview, onVolver }) {
  const Icono = tipo.icono
  const set = (k, v) => setParams(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">

      {/* Info del tipo seleccionado */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: tipo.color + '20' }}>
              <Icono size={18} style={{ color: tipo.color }} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{tipo.label}</h2>
              <p className="text-[12px] text-gray-500">{tipo.descripcion}</p>
            </div>
          </div>
          <button
            onClick={onVolver}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <ChevronLeft size={13} />
            Cambiar tipo
          </button>
        </div>

        {/* Columnas esperadas */}
        <div className="mb-4">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Columnas del archivo
          </p>
          <div className="flex flex-wrap gap-2">
            {tipo.columnas.map(c => (
              <div key={c.nombre} title={c.desc}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium border ${
                  c.obligatoria
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                {!c.obligatoria && <span className="opacity-50">(opc)</span>}
                <span className="font-mono">{c.nombre}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-200 mr-1 align-middle" />
            Obligatorio
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-200 ml-3 mr-1 align-middle" />
            Opcional
          </p>
        </div>

        {/* Advertencias */}
        {tipo.advertencias.length > 0 && (
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: tipo.bg, border: `1px solid ${tipo.borde}` }}>
            {tipo.advertencias.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: tipo.color }} />
                <p className="text-[12.5px]" style={{ color: tipo.color }}>{a}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parámetros adicionales */}
      {tipo.extras.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Parámetros adicionales
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tipo.extras.includes('fecha_imputacion') && (
              <div>
                <label className={labelCls}>
                  <Calendar size={11} className="inline mr-1" />
                  Fecha de imputación
                </label>
                <input type="date" className={inputCls}
                  value={params.fecha_global ?? ''}
                  onChange={e => set('fecha_global', e.target.value)} />
                <p className="text-[11px] text-gray-400 mt-1">Fecha con la que se registrarán los gastos si no viene en el archivo.</p>
              </div>
            )}
            {tipo.extras.includes('categoria_defecto') && (
              <div>
                <label className={labelCls}>
                  <Tag size={11} className="inline mr-1" />
                  Categoría por defecto
                </label>
                <select className={inputCls}
                  value={params.categoria_defecto ?? ''}
                  onChange={e => set('categoria_defecto', e.target.value)}>
                  <option value="">Sin categoría por defecto</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="RRHH">RRHH</option>
                  <option value="Insumos">Insumos</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Inversión">Inversión</option>
                  <option value="Otros">Otros</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Se aplica a filas sin categoría definida en el archivo.</p>
              </div>
            )}
            {tipo.extras.includes('fecha_global') && (
              <div>
                <label className={labelCls}>
                  <Calendar size={11} className="inline mr-1" />
                  Fecha global (opcional)
                </label>
                <input type="date" className={inputCls}
                  value={params.fecha_global ?? ''}
                  onChange={e => set('fecha_global', e.target.value)} />
                <p className="text-[11px] text-gray-400 mt-1">Se usa si el archivo no trae fecha de compra en cada fila.</p>
              </div>
            )}
            {tipo.extras.includes('consolidado') && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <input type="checkbox" id="consolidado" className="mt-0.5 accent-teal-700"
                  checked={params.consolidado === 'true'}
                  onChange={e => set('consolidado', e.target.checked ? 'true' : '')} />
                <label htmlFor="consolidado" className="text-[13px] text-gray-700 cursor-pointer">
                  <span className="font-medium">Importar como consolidado mensual</span>
                  <p className="text-[11.5px] text-gray-500 mt-0.5">Cada fila representa el total de sueldos de un mes, no un empleado individual.</p>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carga de archivo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Archivo a importar
        </p>
        <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
          archivo
            ? 'border-teal-400 bg-teal-50'
            : 'border-gray-200 hover:border-teal-400 hover:bg-teal-50'
        }`}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: archivo ? '#E1F5EE' : '#f3f4f6' }}>
            {archivo
              ? <CheckCircle size={22} className="text-teal-700" />
              : <Upload size={22} className="text-gray-400" />
            }
          </div>
          <div className="text-center">
            {archivo ? (
              <>
                <p className="font-semibold text-teal-800 text-sm">{archivo.name}</p>
                <p className="text-xs text-teal-600 mt-0.5">
                  {(archivo.size / 1024).toFixed(1)} KB — Click para cambiar
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-700 text-sm">Arrastrá o hacé click para seleccionar</p>
                <p className="text-xs text-gray-400 mt-0.5">Archivos .xlsx, .xls o .csv — máximo 10 MB</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={onArchivo} className="hidden" />
        </label>

        {errMsg && <MensajeError mensaje={errMsg} />}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={onVolver}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors">
          <ChevronLeft size={15} /> Volver
        </button>
        <button onClick={onPreview} disabled={!archivo}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: archivo ? '#0F6E56' : undefined }}>
          <FileSpreadsheet size={15} /> Previsualizar
        </button>
      </div>
    </div>
  )
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function SeccionPreview({ tipo, previewData, errMsg, onVolver, onConfirmar }) {
  // Mapeo explícito al contrato real del backend
  const filas        = previewData?.preview ?? previewData?.filas ?? previewData?.rows ?? []
  const totalFilas   = previewData?.filas_total ?? previewData?.total ?? filas.length
  const filasValidas = previewData?.registros_validos ?? previewData?.validas ?? filas.filter(f => f.valida !== false && !f.error).length
  const filasError   = previewData?.registros_rechazados ?? previewData?.errores_count ?? filas.filter(f => f.valida === false || f.error).length
  // errores: array de objetos con detalle por fila (puede ser array o número según backend)
  const erroresDetalle = Array.isArray(previewData?.errores) ? previewData.errores : []
  const puedeImportar  = filasValidas > 0

  const Icono = tipo.icono

  return (
    <div className="space-y-4">

      {/* Resumen de preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: tipo.color + '20' }}>
            <Icono size={18} style={{ color: tipo.color }} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Vista previa — {tipo.label}</h2>
            <p className="text-[12px] text-gray-500">Revisá los datos antes de confirmar la migración</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <SummaryCard label="Filas detectadas" value={fmtNum(totalFilas)} color="gray" />
          <SummaryCard label="Filas válidas"    value={fmtNum(filasValidas)} color="green" />
          <SummaryCard label="Con errores"      value={fmtNum(filasError)} color={filasError > 0 ? 'red' : 'gray'} />
        </div>

        {filasError > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
            <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-amber-800">
              {filasError} {filasError === 1 ? 'fila tiene errores' : 'filas tienen errores'} y {filasError === 1 ? 'será omitida' : 'serán omitidas'} en la importación.
              {puedeImportar ? ' Podés importar solo las válidas.' : ' No hay filas válidas para importar.'}
            </p>
          </div>
        )}

        {/* Tabla de preview */}
        {filas.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-500 w-10">#</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-500">Estado</th>
                  {Object.keys(filas[0] ?? {})
                    .filter(k => k !== 'valida' && k !== 'error' && k !== '_fila')
                    .slice(0, 6)
                    .map(k => (
                      <th key={k} className="text-left py-2.5 px-3 font-semibold text-gray-500 capitalize">{k}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 20).map((fila, i) => {
                  const esValida = fila.valida !== false && !fila.error
                  return (
                    <tr key={i} className={`border-b border-gray-50 ${esValida ? '' : 'bg-red-50'}`}>
                      <td className="py-2 px-3 text-gray-400">{fila._fila ?? i + 1}</td>
                      <td className="py-2 px-3">
                        {esValida
                          ? <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                              <CheckCircle size={11} /> Válida
                            </span>
                          : <span className="inline-flex items-center gap-1 text-red-600 font-medium" title={fila.error ?? ''}>
                              <XCircle size={11} /> Error
                            </span>
                        }
                      </td>
                      {Object.entries(fila)
                        .filter(([k]) => k !== 'valida' && k !== 'error' && k !== '_fila')
                        .slice(0, 6)
                        .map(([k, v]) => (
                          <td key={k} className="py-2 px-3 text-gray-700 truncate max-w-[140px]">
                            {v ?? <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filas.length > 20 && (
              <p className="text-center text-[11px] text-gray-400 py-2 border-t border-gray-100">
                Mostrando 20 de {fmtNum(filas.length)} filas
              </p>
            )}
          </div>
        )}

        {/* Errores detallados — usa el array errores del backend si existe,
            o cae a las filas con campo error embebido */}
        {(erroresDetalle.length > 0 || filas.filter(f => f.error).length > 0) && (
          <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 max-h-36 overflow-y-auto space-y-1">
            <p className="text-[11.5px] font-semibold text-red-700 mb-1">
              <AlertCircle size={11} className="inline mr-1" /> Detalle de errores
            </p>
            {erroresDetalle.length > 0
              ? erroresDetalle.map((e, i) => (
                  <p key={i} className="text-[11.5px] text-red-600">
                    • {e.fila != null ? `Fila ${e.fila}: ` : ''}{e.mensaje ?? e.error ?? e.message ?? JSON.stringify(e)}
                  </p>
                ))
              : filas.filter(f => f.error).map((f, i) => (
                  <p key={i} className="text-[11.5px] text-red-600">
                    • Fila {f._fila ?? f.fila ?? '?'}: {f.error}
                  </p>
                ))
            }
          </div>
        )}

        {errMsg && <MensajeError mensaje={errMsg} />}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={onVolver}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors">
          <ChevronLeft size={15} /> Volver
        </button>
        <button onClick={onConfirmar} disabled={!puedeImportar}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: puedeImportar ? '#0F6E56' : undefined }}>
          <CheckCircle size={15} />
          Confirmar migración
          {filasValidas > 0 && ` (${fmtNum(filasValidas)} registros)`}
        </button>
      </div>
    </div>
  )
}

// ─── Resultado ───────────────────────────────────────────────────────────────

function SeccionResultado({ tipo, resultado, batchId, errMsg, onNueva, onRevertir }) {
  const Icono = tipo.icono
  const procesados = resultado?.registros_detectados ?? resultado?.procesados  ?? resultado?.total      ?? 0
  const creados    = resultado?.registros_creados    ?? resultado?.creados     ?? resultado?.insertados  ?? 0
  const rechazados = resultado?.registros_rechazados ?? resultado?.rechazados  ?? resultado?.omitidos    ?? 0
  const errores    = Array.isArray(resultado?.errores)
    ? resultado.errores.length
    : (resultado?.errores_count ?? resultado?.errores ?? 0)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col items-center gap-4 text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">¡Migración completada!</h3>
            <p className="text-gray-500 text-sm mt-0.5 flex items-center justify-center gap-1.5">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: tipo.color + '20' }}>
                <Icono size={13} style={{ color: tipo.color }} />
              </span>
              {tipo.label}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <SummaryCard label="Procesados" value={fmtNum(procesados)} color="gray" />
          <SummaryCard label="Creados"    value={fmtNum(creados)}    color="green" />
          <SummaryCard label="Rechazados" value={fmtNum(rechazados)} color={rechazados > 0 ? 'amber' : 'gray'} />
          <SummaryCard label="Errores"    value={fmtNum(errores)}    color={errores > 0 ? 'red' : 'gray'} />
        </div>

        {batchId && (
          <p className="text-center text-[11.5px] text-gray-400 mb-4">
            ID de migración: <span className="font-mono">{batchId}</span>
          </p>
        )}

        {errMsg && <MensajeError mensaje={errMsg} />}

        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={onNueva}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors">
            <Upload size={14} /> Nueva migración
          </button>
          {batchId && (
            <button onClick={onRevertir}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-[13px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
              <RotateCcw size={14} /> Revertir esta migración
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Historial ───────────────────────────────────────────────────────────────

function SeccionHistorial({ historial, cargando, onRevertir }) {
  const [expandido, setExpandido] = useState(false)

  if (!historial && !cargando) return null

  const items = historial ?? []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
          <History size={15} className="text-teal-700" />
          Historial de migraciones
          {items.length > 0 && (
            <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        <ChevronRight size={15} className={`text-gray-400 transition-transform ${expandido ? 'rotate-90' : ''}`} />
      </button>

      {expandido && (
        <div className="border-t border-gray-100">
          {cargando ? (
            <div className="flex items-center gap-3 px-5 py-6 text-gray-400 text-[13px]">
              <RefreshCw size={15} className="animate-spin" /> Cargando historial...
            </div>
          ) : items.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-gray-400">No hay migraciones registradas.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((b, i) => {
                const tipoMeta = TIPOS.find(t => t.id === (b.tipo ?? b.type))
                const Icono = tipoMeta?.icono ?? FileSpreadsheet
                return (
                  <div key={b.id ?? i} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: (tipoMeta?.color ?? '#0F6E56') + '15' }}>
                        <Icono size={15} style={{ color: tipoMeta?.color ?? '#0F6E56' }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-800">
                          {tipoMeta?.label ?? b.tipo ?? 'Migración'}
                        </p>
                        <p className="text-[11.5px] text-gray-400 flex items-center gap-2">
                          <Clock size={10} />
                          {fmtFecha(b.fecha ?? b.created_at)}
                          {b.creados != null && (
                            <span className="text-green-600 font-medium">{fmtNum(b.creados)} creados</span>
                          )}
                          {b.rechazados > 0 && (
                            <span className="text-amber-600">{fmtNum(b.rechazados)} rechazados</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        b.estado === 'completado' || b.estado === 'success'
                          ? 'bg-green-100 text-green-700'
                          : b.estado === 'revertido'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.estado ?? 'completado'}
                      </span>
                      {(b.estado === 'completado' || b.estado === 'success') && (
                        <button onClick={() => onRevertir(b.id)}
                          title="Revertir migración"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal de reversión ──────────────────────────────────────────────────────

function ModalRevertir({ onConfirmar, onCancelar, cargando }) {
  return (
    <AppModal onClose={onCancelar} maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex flex-col items-center gap-3 text-center mb-5">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <RotateCcw size={24} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Revertir migración</h3>
            <p className="text-sm text-gray-500 mt-1">
              Esta acción eliminará todos los registros creados por esta migración.
              <strong className="text-red-700 block mt-1">Esta operación no se puede deshacer.</strong>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancelar} disabled={cargando}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={cargando}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
            {cargando
              ? <><RefreshCw size={13} className="animate-spin" /> Revirtiendo...</>
              : <><RotateCcw size={13} /> Confirmar reversión</>
            }
          </button>
        </div>
      </div>
    </AppModal>
  )
}

// ─── Utilidades de UI ────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }) {
  const styles = {
    gray:  { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151', label: '#9CA3AF' },
    green: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: '#4ADE80' },
    red:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: '#F87171' },
    amber: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: '#FBBF24' },
  }
  const s = styles[color] ?? styles.gray
  return (
    <div className="rounded-xl p-3 text-center border" style={{ background: s.bg, borderColor: s.border }}>
      <p className="text-xl font-bold" style={{ color: s.text }}>{value}</p>
      <p className="text-[11.5px] font-medium mt-0.5" style={{ color: s.label }}>{label}</p>
    </div>
  )
}

function MensajeError({ mensaje }) {
  return (
    <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
      <XCircle size={15} className="flex-shrink-0 mt-0.5" />
      <span>{mensaje}</span>
    </div>
  )
}

function EstadoCargando({ texto, subtexto }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center gap-3 text-gray-500">
      <RefreshCw size={28} className="animate-spin text-teal-700" />
      <p className="font-semibold text-gray-700">{texto}</p>
      {subtexto && <p className="text-sm text-gray-400">{subtexto}</p>}
    </div>
  )
}
