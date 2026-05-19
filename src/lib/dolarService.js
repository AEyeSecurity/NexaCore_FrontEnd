// Servicio de cotización USD/ARS para NexaCore
//
// Estrategia de fuentes (en orden):
//   1. BCRA estadísticas v4.0 — endpoint oficial del Banco Central
//   2. DolarAPI oficial       — fallback
//   3. DolarAPI blue          — fallback final

const BCRA_MONETARIAS  = 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias'
const DOLAR_OFICIAL_URL = 'https://dolarapi.com/v1/dolares/oficial'
const DOLAR_BLUE_URL    = 'https://dolarapi.com/v1/dolares/blue'

const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutos
let _cache        = null             // { valor, fuente, descripcion, timestamp }
let _cacheDetalle = null             // { valor_compra, valor_venta, fuente, descripcion, fecha, timestamp }

// ── Helpers de formato ──────────────────────────────────────────────────────

export function formatearARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

export function formatearUSD(n) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

export function convertirUSDaARS(montoUSD, cotizacion) {
  return Number(montoUSD) * Number(cotizacion)
}

// ── Fetch con timeout manual (compatible con todos los browsers modernos) ───

function fetchConTimeout(url, timeoutMs = 7000) {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timerId))
}

// ── Fuentes individuales ────────────────────────────────────────────────────

async function fetchBCRA() {
  const res = await fetchConTimeout(BCRA_MONETARIAS)
  if (!res.ok) throw new Error(`BCRA HTTP ${res.status}`)
  const json = await res.json()
  const variables = Array.isArray(json?.results) ? json.results : []
  // Buscar variable relacionada con tipo de cambio / dólar
  const dolarVar = variables.find(v => {
    const d = (v.descripcion ?? '').toLowerCase()
    return (
      d.includes('cambio') ||
      d.includes('dólar') ||
      d.includes('dollar') ||
      d.includes('usd')
    )
  })
  if (!dolarVar?.valor) throw new Error('Variable dólar no encontrada en BCRA monetarias')
  return {
    valor:       Number(dolarVar.valor),
    fuente:      'BCRA',
    descripcion: dolarVar.descripcion,
  }
}

async function fetchDolarAPI(tipo) {
  const url = tipo === 'oficial' ? DOLAR_OFICIAL_URL : DOLAR_BLUE_URL
  const res = await fetchConTimeout(url)
  if (!res.ok) throw new Error(`DolarAPI ${tipo} HTTP ${res.status}`)
  const json = await res.json()
  const valor = json.venta ?? json.compra
  if (!valor) throw new Error(`DolarAPI ${tipo}: sin valor disponible`)
  return {
    valor:       Number(valor),
    fuente:      tipo === 'oficial' ? 'DolarAPI Oficial' : 'DolarAPI Blue',
    descripcion: `Dólar ${tipo} (venta)`,
  }
}

async function fetchDolarAPIDetallado(tipo) {
  const url = tipo === 'oficial' ? DOLAR_OFICIAL_URL : DOLAR_BLUE_URL
  const res = await fetchConTimeout(url)
  if (!res.ok) throw new Error(`DolarAPI ${tipo} HTTP ${res.status}`)
  const json = await res.json()
  if (!json.compra && !json.venta) throw new Error(`DolarAPI ${tipo}: sin valores disponibles`)
  const fecha = json.fecha ? json.fecha.split('T')[0] : new Date().toISOString().split('T')[0]
  return {
    valor_compra: Number(json.compra) || null,
    valor_venta:  Number(json.venta)  || null,
    fuente:       tipo === 'oficial' ? 'DolarAPI Oficial' : 'DolarAPI Blue',
    descripcion:  `Dólar ${tipo}`,
    fecha,
  }
}

async function fetchBCRADetallado() {
  const base = await fetchBCRA()
  return {
    valor_compra: Number(base.valor),
    valor_venta:  Number(base.valor),
    fuente:       'BCRA',
    descripcion:  base.descripcion,
    fecha:        new Date().toISOString().split('T')[0],
  }
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Obtiene la cotización vigente USD/ARS.
 * Intenta BCRA → DolarAPI oficial → DolarAPI blue.
 * Cachea el resultado 5 minutos para evitar llamadas repetidas.
 *
 * @returns {{ valor: number, fuente: string, descripcion: string }}
 * @throws {Error} si todas las fuentes fallan
 */
export async function obtenerCotizacion() {
  if (_cache && Date.now() - _cache.timestamp < CACHE_TTL_MS) {
    return _cache
  }

  const fuentes = [
    fetchBCRA,
    () => fetchDolarAPI('oficial'),
    () => fetchDolarAPI('blue'),
  ]

  const errores = []
  for (const fuente of fuentes) {
    try {
      const resultado = await fuente()
      _cache = { ...resultado, timestamp: Date.now() }
      return _cache
    } catch (err) {
      errores.push(err.message)
    }
  }

  throw new Error(
    'No se pudo obtener la cotización del dólar. ' +
    'Verificá tu conexión a internet o intentá más tarde.'
  )
}

/**
 * Obtiene la cotización con compra y venta separados.
 * Intenta DolarAPI oficial → DolarAPI blue → BCRA (fallback con compra=venta).
 * Cachea el resultado 5 minutos.
 *
 * @returns {{ valor_compra: number, valor_venta: number, fuente: string, descripcion: string, fecha: string }}
 * @throws {Error} si todas las fuentes fallan
 */
export async function obtenerCotizacionDetalle() {
  if (_cacheDetalle && Date.now() - _cacheDetalle.timestamp < CACHE_TTL_MS) {
    return _cacheDetalle
  }

  const fuentes = [
    () => fetchDolarAPIDetallado('oficial'),
    () => fetchDolarAPIDetallado('blue'),
    fetchBCRADetallado,
  ]

  const errores = []
  for (const fuente of fuentes) {
    try {
      const resultado = await fuente()
      _cacheDetalle = { ...resultado, timestamp: Date.now() }
      return _cacheDetalle
    } catch (err) {
      errores.push(err.message)
    }
  }

  throw new Error(
    'No se pudo obtener la cotización del dólar. ' +
    'Verificá tu conexión a internet o intentá más tarde.'
  )
}
