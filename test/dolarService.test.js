// Tests de la integración con las APIs de cotización del dólar
// (src/lib/dolarService.js). El backend no consulta ninguna API externa
// (hallazgo H-24): la cotización la obtiene el frontend desde BCRA y DolarAPI.
// Las APIs se simulan reemplazando fetch; no se hace ninguna llamada real.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  obtenerCotizacion,
  obtenerCotizacionDetalle,
  convertirUSDaARS,
} from '../src/lib/dolarService.js';

const BCRA = 'api.bcra.gob.ar';
const OFICIAL = 'dolarapi.com/v1/dolares/oficial';
const BLUE = 'dolarapi.com/v1/dolares/blue';
const TTL_CACHE_MS = 5 * 60 * 1000;

// El servicio guarda la cotización en memoria 5 minutos. Cada test arranca
// 10 minutos después del anterior para que la caché de un test no afecte al otro.
let reloj = Date.UTC(2026, 9, 19, 12, 0, 0);
function nuevoInstante(t) {
  reloj += 2 * TTL_CACHE_MS;
  t.mock.method(Date, 'now', () => reloj);
}

const ok = (json) => ({ ok: true, status: 200, json: async () => json });
const httpError = (status) => ({ ok: false, status, json: async () => ({}) });

// Simula fetch: responde según la URL y registra cada consulta.
function simularApis(t, respuestas) {
  const consultas = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    consultas.push(url);
    for (const [fragmento, respuesta] of Object.entries(respuestas)) {
      if (url.includes(fragmento)) {
        if (respuesta instanceof Error) throw respuesta;
        return typeof respuesta === 'function' ? respuesta() : respuesta;
      }
    }
    throw new Error(`URL no simulada: ${url}`);
  });
  return consultas;
}

const variableDolarBCRA = { descripcion: 'Tipo de cambio mayorista ($ por USD)', valor: 1050.25 };

// ── Respuesta válida ─────────────────────────────────────────────────────────

test('dólar: respuesta válida del BCRA → devuelve su valor como número', async (t) => {
  // Arrange
  nuevoInstante(t);
  simularApis(t, { [BCRA]: ok({ results: [{ descripcion: 'Base monetaria', valor: 9 }, variableDolarBCRA] }) });

  // Act
  const cotizacion = await obtenerCotizacion();

  // Assert
  assert.equal(cotizacion.valor, 1050.25);
  assert.equal(cotizacion.fuente, 'BCRA');
});

test('dólar detalle: respuesta válida de DolarAPI oficial → compra, venta y fecha', async (t) => {
  // Arrange
  nuevoInstante(t);
  simularApis(t, { [OFICIAL]: ok({ compra: 1000, venta: 1040, fecha: '2026-10-19T14:00:00.000Z' }) });

  // Act
  const detalle = await obtenerCotizacionDetalle();

  // Assert
  assert.equal(detalle.valor_compra, 1000);
  assert.equal(detalle.valor_venta, 1040);
  assert.equal(detalle.fecha, '2026-10-19');
  assert.equal(detalle.fuente, 'DolarAPI Oficial');
});

// ── Error HTTP ───────────────────────────────────────────────────────────────

test('dólar: BCRA responde HTTP 500 → usa DolarAPI oficial (venta)', async (t) => {
  // Arrange
  nuevoInstante(t);
  simularApis(t, { [BCRA]: httpError(500), [OFICIAL]: ok({ compra: 1000, venta: 1040 }) });

  // Act
  const cotizacion = await obtenerCotizacion();

  // Assert
  assert.equal(cotizacion.valor, 1040);
  assert.equal(cotizacion.fuente, 'DolarAPI Oficial');
});

test('dólar: BCRA y DolarAPI oficial con error HTTP → usa DolarAPI blue', async (t) => {
  // Arrange
  nuevoInstante(t);
  simularApis(t, { [BCRA]: httpError(503), [OFICIAL]: httpError(429), [BLUE]: ok({ compra: 1180, venta: 1200 }) });

  // Act
  const cotizacion = await obtenerCotizacion();

  // Assert
  assert.equal(cotizacion.valor, 1200);
  assert.equal(cotizacion.fuente, 'DolarAPI Blue');
});

// ── Caída de red y timeout ───────────────────────────────────────────────────

test('dólar: sin conexión en las tres fuentes → error con mensaje para el usuario', async (t) => {
  // Arrange
  nuevoInstante(t);
  const sinRed = new TypeError('fetch failed');
  const consultas = simularApis(t, { [BCRA]: sinRed, [OFICIAL]: sinRed, [BLUE]: sinRed });

  // Act y Assert
  await assert.rejects(obtenerCotizacion(), /No se pudo obtener la cotizaci/);
  assert.equal(consultas.length, 3);
});

test('dólar: BCRA no responde → se corta a los 7 segundos y usa DolarAPI oficial', async (t) => {
  // Arrange
  nuevoInstante(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', (url, opciones) => {
    if (url.includes(BCRA)) {
      // Nunca responde: solo termina si el servicio aborta la consulta.
      return new Promise((_, rechazar) => {
        opciones.signal.addEventListener('abort', () => rechazar(new Error('aborted')));
      });
    }
    return Promise.resolve(ok({ compra: 1000, venta: 1040 }));
  });

  // Act
  const pendiente = obtenerCotizacion();
  t.mock.timers.tick(7000);
  const cotizacion = await pendiente;

  // Assert
  assert.equal(cotizacion.fuente, 'DolarAPI Oficial');
  assert.equal(cotizacion.valor, 1040);
});

// ── Datos malformados ────────────────────────────────────────────────────────

test('dólar: BCRA responde sin la variable del dólar → usa DolarAPI oficial', async (t) => {
  // Arrange
  nuevoInstante(t);
  simularApis(t, {
    [BCRA]: ok({ results: [{ descripcion: 'Base monetaria', valor: 9 }] }),
    [OFICIAL]: ok({ compra: 1000, venta: 1040 }),
  });

  // Act
  const cotizacion = await obtenerCotizacion();

  // Assert
  assert.equal(cotizacion.fuente, 'DolarAPI Oficial');
});

test('dólar: BCRA responde con un formato inesperado (sin results) → usa DolarAPI oficial', async (t) => {
  // Arrange
  nuevoInstante(t);
  simularApis(t, { [BCRA]: ok({ error: 'formato nuevo' }), [OFICIAL]: ok({ compra: 1000, venta: 1040 }) });

  // Act
  const cotizacion = await obtenerCotizacion();

  // Assert
  assert.equal(cotizacion.fuente, 'DolarAPI Oficial');
});

test('dólar: una cotización no numérica no se acepta → usa la fuente siguiente', async (t) => {
  // Arrange
  nuevoInstante(t);
  simularApis(t, {
    [BCRA]: httpError(500),
    [OFICIAL]: ok({ compra: 'sin datos', venta: 'sin datos' }),
    [BLUE]: ok({ compra: 1180, venta: 1200 }),
  });

  // Act
  const cotizacion = await obtenerCotizacion();

  // Assert
  assert.ok(Number.isFinite(cotizacion.valor) && cotizacion.valor > 0, `valor obtenido: ${cotizacion.valor}`);
  assert.equal(cotizacion.fuente, 'DolarAPI Blue');
});

test('dólar detalle: DolarAPI oficial sin compra ni venta → usa DolarAPI blue', async (t) => {
  // Arrange
  nuevoInstante(t);
  simularApis(t, { [OFICIAL]: ok({ fecha: '2026-10-19T14:00:00.000Z' }), [BLUE]: ok({ compra: 1180, venta: 1200 }) });

  // Act
  const detalle = await obtenerCotizacionDetalle();

  // Assert
  assert.equal(detalle.fuente, 'DolarAPI Blue');
  assert.equal(detalle.valor_venta, 1200);
});

// ── Caché de 5 minutos (valores límite) ──────────────────────────────────────

test('dólar: dentro de los 5 minutos reutiliza la cotización; al cumplirse consulta de nuevo', async (t) => {
  // Arrange
  nuevoInstante(t);
  const inicio = reloj;
  const consultas = simularApis(t, { [BCRA]: ok({ results: [variableDolarBCRA] }) });

  // Act
  await obtenerCotizacion();
  reloj = inicio + TTL_CACHE_MS - 1;
  await obtenerCotizacion();
  const consultasAntesDelLimite = consultas.length;
  reloj = inicio + TTL_CACHE_MS;
  await obtenerCotizacion();

  // Assert
  assert.equal(consultasAntesDelLimite, 1);
  assert.equal(consultas.length, 2);
});

// ── Conversión ───────────────────────────────────────────────────────────────

test('dólar: convertirUSDaARS multiplica el monto por la cotización', () => {
  // Arrange
  const montoUSD = '100';
  const cotizacion = 1250.5;

  // Act
  const ars = convertirUSDaARS(montoUSD, cotizacion);

  // Assert
  assert.equal(ars, 125050);
});
