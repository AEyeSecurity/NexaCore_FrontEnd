// Tests del estado de alertas dinámicas (src/lib/alertasStore.js), que usa la
// campana de Inicio y del Layout. GET /api/alertas se simula con un fetcher
// controlado; el reloj también.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearStoreAlertas, resolverDestino, agruparPorModulo } from '../src/lib/alertasStore.js';

function prepararStore() {
  const pedidos = [];
  let reloj = Date.UTC(2026, 10, 3, 12, 0, 0);
  const store = crearStoreAlertas(() => new Promise((resolve, reject) => pedidos.push({ resolve, reject })), { ahora: () => reloj });
  const asentar = () => new Promise(r => setTimeout(r, 0));
  return { store, pedidos, asentar, avanzar: (ms) => { reloj += ms; } };
}

const ANA = 'ana@x.com';
const BETO = 'beto@x.com';

const respuesta = (alertas, extra = {}) => ({ alertas, total: alertas.length, generado_en: '2026-11-03T12:00:00.000Z', parcial: false, fuentes: [], ...extra });
const DEUDAS = { id: 'finance:deudas:vencidas', modulo: 'finance', severidad: 'alta', cantidad: 5, destino: { modulo: 'finance', seccion: 'deudas' } };
const TAREAS = { id: 'operations:tareas:por_vencer', modulo: 'operations', severidad: 'media', cantidad: 3, destino: { modulo: 'operations', seccion: null } };

test('pedidos simultáneos (login, foco, campana) comparten uno solo', async () => {
  const { store, pedidos, asentar } = prepararStore();
  assert.equal(store.snapshot(ANA), null);
  store.asegurar(ANA);
  store.asegurar(ANA);
  store.refrescar(ANA);
  await asentar();
  assert.equal(pedidos.length, 1);
  assert.equal(store.snapshot(ANA).status, 'loading');

  pedidos[0].resolve(respuesta([DEUDAS, TAREAS]));
  await asentar();
  const s = store.snapshot(ANA);
  assert.equal(s.status, 'success');
  assert.equal(s.data.total, 2, 'total = condiciones activas, no la suma de `cantidad`');
  assert.equal(s.actualizando, false);
});

test('error sin respuesta previa: status error (no "sin alertas"); reintentar vuelve a pedir', async () => {
  const { store, pedidos, asentar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].reject(new Error('500'));
  await asentar();
  assert.equal(store.snapshot(ANA).status, 'error');
  assert.equal(store.snapshot(ANA).data, null);

  store.refrescar(ANA);
  await asentar();
  assert.equal(store.snapshot(ANA).status, 'loading');
  assert.equal(pedidos.length, 2);
});

test('falla una actualización con datos previos: se conservan marcados como desactualizados', async () => {
  const { store, pedidos, asentar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].resolve(respuesta([DEUDAS]));
  await asentar();

  store.refrescar(ANA);
  await asentar();
  assert.equal(store.snapshot(ANA).actualizando, true);
  pedidos[1].reject(new Error('timeout'));
  await asentar();
  const s = store.snapshot(ANA);
  assert.equal(s.status, 'success');
  assert.equal(s.fallo, true);
  assert.deepEqual(s.data.alertas.map(a => a.id), [DEUDAS.id]);
});

test('asegurar respeta la edad mínima (foco repetido) y refrescar no', async () => {
  const { store, pedidos, asentar, avanzar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].resolve(respuesta([]));
  await asentar();

  store.asegurar(ANA, 30_000);
  await asentar();
  assert.equal(pedidos.length, 1, 'respuesta reciente: no se repite');

  avanzar(31_000);
  store.asegurar(ANA, 30_000);
  await asentar();
  assert.equal(pedidos.length, 2);
  pedidos[1].resolve(respuesta([]));
  await asentar();

  store.refrescar(ANA);
  await asentar();
  assert.equal(pedidos.length, 3, 'el botón actualizar pide aunque sea reciente');
});

test('cerrar sesión descarta el estado y la respuesta en vuelo; otra cuenta no ve alertas ajenas', async () => {
  const { store, pedidos, asentar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  store.limpiar();
  pedidos[0].resolve(respuesta([DEUDAS]));
  await asentar();
  assert.equal(store.snapshot(ANA), null, 'la respuesta de la sesión cerrada se descarta');

  store.asegurar(BETO);
  await asentar();
  assert.equal(store.snapshot(ANA), null, 'el snapshot es por usuario');
  pedidos[1].resolve(respuesta([TAREAS]));
  await asentar();
  assert.deepEqual(store.snapshot(BETO).data.alertas.map(a => a.id), [TAREAS.id]);
});

test('cambio de usuario con un pedido en vuelo: la respuesta vieja no pisa la nueva', async () => {
  const { store, pedidos, asentar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  store.asegurar(BETO);
  await asentar();
  assert.equal(pedidos.length, 2);
  pedidos[0].resolve(respuesta([DEUDAS])); // respuesta de Ana, tardía
  await asentar();
  assert.equal(store.snapshot(BETO).status, 'loading');
  pedidos[1].resolve(respuesta([TAREAS]));
  await asentar();
  assert.deepEqual(store.snapshot(BETO).data.alertas.map(a => a.id), [TAREAS.id]);
});

test('respuesta parcial: se conserva parcial y fuentes tal como vienen', async () => {
  const { store, pedidos, asentar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].resolve(respuesta([TAREAS], { parcial: true, fuentes: [{ fuente: 'deudas', estado: 'error', motivo: 'TIMEOUT' }, { fuente: 'tareas', estado: 'ok' }] }));
  await asentar();
  const { data } = store.snapshot(ANA);
  assert.equal(data.parcial, true);
  assert.deepEqual(data.fuentes.filter(f => f.estado === 'error').map(f => f.motivo), ['TIMEOUT']);
});

test('sin usuario no se pide nada', async () => {
  const { store, pedidos, asentar } = prepararStore();
  store.asegurar(null);
  store.refrescar(undefined);
  await asentar();
  assert.equal(pedidos.length, 0);
});

test('resolverDestino: solo destinos conocidos; el resto se ignora', () => {
  assert.deepEqual(resolverDestino({ modulo: 'finance', seccion: 'deudas' }), { page: 'finance', opts: { tab: 'deudas' } });
  assert.deepEqual(resolverDestino({ modulo: 'finance', seccion: 'comprobantes' }), { page: 'finance', opts: { tab: 'comprobantes' } });
  assert.deepEqual(resolverDestino({ modulo: 'operations', seccion: null }), { page: 'operations', opts: {} });
  assert.deepEqual(resolverDestino({ modulo: 'indicadores', seccion: null }), { page: 'indicadores', opts: {} });
  assert.equal(resolverDestino({ modulo: 'finance', seccion: 'salarios' }), null);
  assert.equal(resolverDestino({ modulo: 'crm' }), null);
  assert.equal(resolverDestino({ modulo: 'https://evil.example' }), null);
  assert.equal(resolverDestino(null), null);
});

test('agruparPorModulo: orden Finanzas, Operativo, Indicadores; respeta el orden del backend dentro del grupo', () => {
  const alertas = [
    { id: 'i1', modulo: 'indicadores' },
    { id: 'o1', modulo: 'operations' },
    { id: 'f1', modulo: 'finance' },
    { id: 'x1', modulo: 'otro' },
    { id: 'o2', modulo: 'operations' },
  ];
  assert.deepEqual(
    agruparPorModulo(alertas).map(g => [g.modulo, g.alertas.map(a => a.id)]),
    [['finance', ['f1']], ['operations', ['o1', 'o2']], ['indicadores', ['i1']], ['otro', ['x1']]],
  );
});

// ── Descartar alertas (solo en memoria, por sesión) ──────────────────────────
import { alertasVisibles } from '../src/lib/alertasStore.js';

async function storeConRespuesta(alertas, extra) {
  const ctx = prepararStore();
  ctx.store.asegurar(ANA);
  await ctx.asentar();
  ctx.pedidos[0].resolve(respuesta(alertas, extra));
  await ctx.asentar();
  return ctx;
}

test('descartar oculta solo esa alerta y baja el contador; no pide nada al backend', async () => {
  const { store, pedidos } = await storeConRespuesta([DEUDAS, TAREAS]);
  store.descartar(ANA, DEUDAS.id);
  const s = store.snapshot(ANA);
  assert.deepEqual(alertasVisibles(s).map(a => a.id), [TAREAS.id]);
  assert.equal(s.data.alertas.length, 2, 'la respuesta del backend no se modifica');
  assert.equal(pedidos.length, 1, 'descartar no genera pedidos');
  store.descartar(ANA, DEUDAS.id); // repetido: sin efecto
  assert.deepEqual(store.snapshot(ANA).descartadas, [DEUDAS.id]);
});

test('el descarte sobrevive a las actualizaciones mientras la alerta siga activa', async () => {
  const { store, pedidos, asentar } = await storeConRespuesta([DEUDAS, TAREAS]);
  store.descartar(ANA, DEUDAS.id);
  store.refrescar(ANA);
  await asentar();
  pedidos[1].resolve(respuesta([DEUDAS, TAREAS]));
  await asentar();
  assert.deepEqual(alertasVisibles(store.snapshot(ANA)).map(a => a.id), [TAREAS.id]);
});

test('condición resuelta en una respuesta completa: se borra el descarte y puede volver a notificarse', async () => {
  const { store, pedidos, asentar } = await storeConRespuesta([DEUDAS, TAREAS]);
  store.descartar(ANA, DEUDAS.id);
  store.refrescar(ANA);
  await asentar();
  pedidos[1].resolve(respuesta([TAREAS])); // completa, sin la alerta de deudas
  await asentar();
  assert.deepEqual(store.snapshot(ANA).descartadas, []);

  store.refrescar(ANA);
  await asentar();
  pedidos[2].resolve(respuesta([DEUDAS, TAREAS])); // la situación vuelve a aparecer
  await asentar();
  assert.deepEqual(alertasVisibles(store.snapshot(ANA)).map(a => a.id), [DEUDAS.id, TAREAS.id]);
});

test('respuesta parcial o fallida: no borra descartes aunque la alerta no venga', async () => {
  const { store, pedidos, asentar } = await storeConRespuesta([DEUDAS, TAREAS]);
  store.descartar(ANA, DEUDAS.id);

  store.refrescar(ANA);
  await asentar();
  pedidos[1].resolve(respuesta([TAREAS], { parcial: true, fuentes: [{ fuente: 'deudas', estado: 'error', motivo: 'TIMEOUT' }] }));
  await asentar();
  assert.deepEqual(store.snapshot(ANA).descartadas, [DEUDAS.id], 'parcial no prueba que se resolvió');

  store.refrescar(ANA);
  await asentar();
  pedidos[2].reject(new Error('500'));
  await asentar();
  assert.deepEqual(store.snapshot(ANA).descartadas, [DEUDAS.id], 'un error tampoco');

  store.refrescar(ANA);
  await asentar();
  pedidos[3].resolve(respuesta([DEUDAS, TAREAS]));
  await asentar();
  assert.deepEqual(alertasVisibles(store.snapshot(ANA)).map(a => a.id), [TAREAS.id], 'sigue descartada');
});

test('cerrar sesión borra los descartes: al volver a entrar reaparecen las alertas activas', async () => {
  const { store, pedidos, asentar } = await storeConRespuesta([DEUDAS, TAREAS]);
  store.descartar(ANA, DEUDAS.id);
  store.limpiar();
  store.asegurar(ANA);
  await asentar();
  pedidos[1].resolve(respuesta([DEUDAS, TAREAS]));
  await asentar();
  assert.deepEqual(alertasVisibles(store.snapshot(ANA)).map(a => a.id), [DEUDAS.id, TAREAS.id]);
});

test('descartar no afecta a otra sesión ni actúa sin la sesión actual', async () => {
  const { store } = await storeConRespuesta([DEUDAS]);
  store.descartar(BETO, DEUDAS.id);
  store.descartar(null, DEUDAS.id);
  assert.deepEqual(store.snapshot(ANA).descartadas, []);
});
