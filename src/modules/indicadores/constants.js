// Catálogos cerrados del módulo Indicadores. Los valores (claves) son exactamente
// los que acepta el backend (indicators/config/indicadores.js); acá solo se
// agregan labels y colores de presentación.

export const PERSPECTIVAS = [
  { value: 'CLIENTE',                 label: 'Cliente' },
  { value: 'PROCESOS_INTERNOS',       label: 'Procesos Internos' },
  { value: 'APRENDIZAJE_CRECIMIENTO', label: 'Aprendizaje y Crecimiento' },
  { value: 'FINANZAS',                label: 'Finanzas' },
]
export const PERSPECTIVA_LABELS = Object.fromEntries(PERSPECTIVAS.map(p => [p.value, p.label]))

// Tonos tomados de la paleta existente (mismos que las categorías de Protocolos).
export const PERSPECTIVA_STYLE = {
  CLIENTE:                 { background: '#EAF0FC', color: '#3B6FD6' },
  PROCESOS_INTERNOS:       { background: '#FDF2E3', color: '#C2721C' },
  APRENDIZAJE_CRECIMIENTO: { background: '#ECE8FB', color: '#6A52D6' },
  FINANZAS:                { background: '#E1F5EE', color: '#0F6E56' },
}
const PERSPECTIVA_FALLBACK = { background: '#F3F4F6', color: '#6B7280' }
export const perspectivaStyle = (p) => PERSPECTIVA_STYLE[p] || PERSPECTIVA_FALLBACK

export const FRECUENCIAS = [
  { value: 'MENSUAL',    label: 'Mensual' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL',  label: 'Semestral' },
  { value: 'ANUAL',      label: 'Anual' },
]
export const FRECUENCIA_LABELS = Object.fromEntries(FRECUENCIAS.map(f => [f.value, f.label]))

// Ventanas del Dashboard compatibles con cada frecuencia: la ventana debe
// abarcar al menos un período completo del indicador.
export const PERIODOS_POR_FRECUENCIA = {
  MENSUAL:    ['month', '3m', '6m', '12m'],
  TRIMESTRAL: ['3m', '6m', '12m'],
  SEMESTRAL:  ['6m', '12m'],
  ANUAL:      ['12m'],
}
export function periodosCompatibles(frecuencia) {
  return PERIODOS_POR_FRECUENCIA[frecuencia] || []
}

export const UNIDADES = [
  { value: 'PORCENTAJE', label: 'Porcentaje', simbolo: '%' },
  { value: 'MONEDA',     label: 'Moneda',     simbolo: '$' },
  { value: 'NUMERO',     label: 'Número',     simbolo: 'número' },
  { value: 'HORAS',      label: 'Horas',      simbolo: 'horas' },
  { value: 'DIAS',       label: 'Días',       simbolo: 'días' },
  { value: 'CANTIDAD',   label: 'Cantidad',   simbolo: 'cantidad' },
]
export const UNIDAD_LABELS = Object.fromEntries(UNIDADES.map(u => [u.value, u.label]))

export const SENTIDOS = [
  { value: 'MAYOR_ES_MEJOR', label: 'Mayor es mejor', hint: 'El indicador mejora cuando el valor aumenta.' },
  { value: 'MENOR_ES_MEJOR', label: 'Menor es mejor', hint: 'El indicador mejora cuando el valor disminuye.' },
]
export const SENTIDO_LABELS = Object.fromEntries(SENTIDOS.map(s => [s.value, s.label]))
export const SENTIDO_HINTS = Object.fromEntries(SENTIDOS.map(s => [s.value, s.hint]))

// Estados calculados por el backend. `null` = sin datos (nunca se asume crítico).
export const ESTADO_META = {
  EN_OBJETIVO: { label: 'En objetivo', color: '#0F6E56', background: '#E1F5EE', chart: '#1D9E75' },
  EN_RIESGO:   { label: 'En riesgo',   color: '#B45309', background: '#FEF3C7', chart: '#E08A2C' },
  CRITICO:     { label: 'Crítico',     color: '#B91C1C', background: '#FEE2E2', chart: '#E24B4A' },
}
export const SIN_DATOS_META = { label: 'Sin datos', color: '#6B7280', background: '#F3F4F6', chart: '#C3C2B7' }
export const estadoMeta = (estado) => ESTADO_META[estado] || SIN_DATOS_META

// Visualizaciones admitidas por el backend para indicador_kpi.
export const VISUALIZACIONES = [
  { id: 'kpi',   label: 'Número' },
  { id: 'line',  label: 'Línea' },
  { id: 'bar',   label: 'Barra' },
  { id: 'area',  label: 'Área' },
  { id: 'gauge', label: 'Medidor' },
]

// Operadores del constructor de fórmulas: símbolo visual → operador técnico.
export const OPERADORES = [
  { value: '+', display: '+' },
  { value: '-', display: '−' },
  { value: '*', display: '×' },
  { value: '/', display: '÷' },
  { value: '(', display: '(' },
  { value: ')', display: ')' },
]
export const OPERADOR_DISPLAY = Object.fromEntries(OPERADORES.map(o => [o.value, o.display]))

// ── Formato de valores ──────────────────────────────────────────────────
// Solo representación: la unidad NO transforma el valor (un porcentaje ya
// viene multiplicado por 100 desde la fórmula).
function num(n, maxDecimals = 2) {
  return Number(n).toLocaleString('es-AR', { maximumFractionDigits: maxDecimals })
}

function compactMoneda(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${num(abs / 1_000_000, 1)}M`
  if (abs >= 10_000)    return `${sign}$${num(abs / 1_000, 0)}K`
  return `${sign}$${num(abs, 2)}`
}

export function formatValor(valor, unidad, { compact = false } = {}) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return null
  const n = Number(valor)
  switch (unidad) {
    case 'PORCENTAJE': return `${num(n, 2)}%`
    case 'MONEDA':     return compact ? compactMoneda(n) : `${n < 0 ? '-' : ''}$${num(Math.abs(n), 2)}`
    case 'HORAS':      return `${num(n, 2)} h`
    case 'DIAS':       return `${num(n, 2)} días`
    default:           return num(n, 2)
  }
}

// Mensajes de error de cálculo que el backend devuelve por punto
// ({ codigo, mensaje }). DIVISION_POR_CERO se explica en lenguaje simple.
export function mensajeErrorCalculo(error) {
  if (!error) return null
  if (error.codigo === 'DIVISION_POR_CERO') {
    return 'No se pudo calcular: el divisor de la fórmula es cero en este período (por ejemplo, no hubo movimientos).'
  }
  return error.mensaje || 'No se pudo calcular el indicador en este período.'
}

// Mensaje comprensible según el código HTTP que devolvió el backend.
export function mensajeErrorHttp(err, contexto = 'datos') {
  if (!err) return null
  if (err instanceof TypeError || err.message === 'Failed to fetch') {
    return 'No se pudo conectar con el servidor. Verificá que el backend esté activo.'
  }
  switch (err.status) {
    case 403:
      return contexto === 'datos'
        ? 'No tienes permiso para acceder a los datos financieros requeridos.'
        : (err.message || 'No tenés permisos suficientes para realizar esta acción.')
    case 404:
      return 'El indicador no existe o fue eliminado.'
    case 409:
      return err.message || 'La fórmula usa una variable que ya no existe.'
    default:
      return err.message || 'Ocurrió un error inesperado.'
  }
}
