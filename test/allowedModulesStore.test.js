// Tests del estado compartido de módulos habilitados (src/lib/allowedModulesStore.js),
// que usa useAllowedModules para la tarjeta Indicadores de Inicio, el sidebar y Nexi.
// GET /api/dashboard/config se simula con un fetcher controlado; el reloj también.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearStoreModulos, leerModulos, TTL_MODULOS_MS } from '../src/lib/allowedModulesStore.js';

// Fetcher controlado: cada llamada queda pendiente hasta resolverla o rechazarla.
function prepararStore() {
  const pedidos = [];
  let reloj = Date.UTC(2026, 10, 3, 12, 0, 0);
  const store = crearStoreModulos(() => new Promise((resolve, reject) => pedidos.push({ resolve, reject })), { ahora: () => reloj });
  let avisos = 0;
  store.subscribe(() => { avisos++; });
  const leer = (key) => leerModulos(store.snapshot(key), key);
  // Deja correr los .then/.finally del store.
  const asentar = () => new Promise(r => setTimeout(r, 0));
  return { store, pedidos, leer, asentar, avanzar: (ms) => { reloj += ms; }, avisos: () => avisos };
}

const ANA = 'ana@x.com';
const BETO = 'beto@x.com';

test('primer ingreso: "cargando" hasta la respuesta; Inicio, sidebar, Nexi y el prefetch comparten un solo pedido', async () => {
  const { store, pedidos, leer, asentar } = prepararStore();
  assert.deepEqual(leer(ANA), [[], true, 'loading'], 'antes de pedir: se reserva el lugar');

  store.asegurar(ANA); // prefetch en App.jsx
  store.asegurar(ANA); // Inicio
  store.asegurar(ANA); // sidebar
  store.asegurar(ANA); // Nexi
  await asentar();
  assert.equal(pedidos.length, 1);
  assert.deepEqual(leer(ANA), [[], true, 'loading']);

  pedidos[0].resolve(['finance', 'indicadores']);
  await asentar();
  assert.deepEqual(leer(ANA), [['finance', 'indicadores'], false, 'success']);
});

test('volver a Inicio: la respuesta confirmada se lee al instante (sin cargando) y no se vuelve a pedir', async () => {
  const { store, pedidos, leer, asentar, avanzar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].resolve(['indicadores']);
  await asentar();

  avanzar(TTL_MODULOS_MS - 1);
  // Lo que ve el primer render de Inicio al remontarse, antes de cualquier efecto
  assert.deepEqual(leer(ANA), [['indicadores'], false, 'success']);
  assert.equal(store.asegurar(ANA), null);
  await asentar();
  assert.equal(pedidos.length, 1);
});

test('usuario sin acceso a Indicadores: deja de "cargar" y no la incluye', async () => {
  const { store, pedidos, leer, asentar } = prepararStore();
  store.asegurar(BETO);
  await asentar();
  pedidos[0].resolve(['operations']);
  await asentar();
  const [modulos, loading] = leer(BETO);
  assert.equal(loading, false);
  assert.equal(modulos.includes('indicadores'), false);
});

test('error en /api/dashboard/config: no muestra Indicadores ni queda "cargando"; el próximo montaje reintenta', async () => {
  const { store, pedidos, leer, asentar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].reject(new Error('500'));
  await asentar();
  assert.deepEqual(leer(ANA), [[], false, 'error']);

  store.asegurar(ANA);
  await asentar();
  assert.equal(pedidos.length, 2, 'reintenta');
  assert.deepEqual(leer(ANA), [[], true, 'loading']);
  pedidos[1].resolve(['indicadores']);
  await asentar();
  assert.deepEqual(leer(ANA), [['indicadores'], false, 'success']);
});

test('cambio de permisos en la sesión: pasado el TTL se revalida en segundo plano sin volver a "cargando"', async () => {
  const { store, pedidos, leer, asentar, avanzar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].resolve(['indicadores', 'finance']);
  await asentar();

  avanzar(TTL_MODULOS_MS);
  store.asegurar(ANA);
  store.asegurar(ANA);
  await asentar();
  assert.equal(pedidos.length, 2, 'una sola revalidación');
  assert.deepEqual(leer(ANA), [['indicadores', 'finance'], false, 'success'], 'mientras revalida sigue mostrando lo confirmado');

  pedidos[1].resolve(['finance']); // le quitaron Indicadores
  await asentar();
  assert.deepEqual(leer(ANA), [['finance'], false, 'success']);
});

test('si falla una revalidación se conserva la última respuesta confirmada', async () => {
  const { store, pedidos, leer, asentar, avanzar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].resolve(['indicadores']);
  await asentar();
  avanzar(TTL_MODULOS_MS);
  store.asegurar(ANA);
  await asentar();
  pedidos[1].reject(new Error('timeout'));
  await asentar();
  assert.deepEqual(leer(ANA), [['indicadores'], false, 'success']);
});

test('cerrar sesión y entrar con otra cuenta: no se reutilizan permisos y se ignora la respuesta tardía de la sesión anterior', async () => {
  const { store, pedidos, leer, asentar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  pedidos[0].resolve(['indicadores']);
  await asentar();

  // Revalidación de Ana en vuelo cuando cierra sesión
  store.limpiar();
  assert.deepEqual(leer(ANA), [[], true, 'loading']);

  store.asegurar(BETO);
  await asentar();
  assert.equal(pedidos.length, 2);
  assert.deepEqual(leer(BETO), [[], true, 'loading'], 'Beto no ve los módulos de Ana');
  assert.deepEqual(leer(ANA), [[], true, 'loading'], 'el estado de Ana ya no es de la sesión actual');

  pedidos[1].resolve(['operations']);
  await asentar();
  assert.deepEqual(leer(BETO), [['operations'], false, 'success']);
});

test('misma cuenta tras logout/login: vuelve a pedir; una respuesta en vuelo de la sesión cerrada no se aplica', async () => {
  const { store, pedidos, leer, asentar } = prepararStore();
  store.asegurar(ANA);
  await asentar();
  store.limpiar(); // logout con el primer pedido todavía en vuelo
  store.asegurar(ANA); // login de nuevo
  await asentar();
  assert.equal(pedidos.length, 2, 'no reutiliza el pedido de la sesión cerrada');

  pedidos[0].resolve(['indicadores']); // respuesta vieja
  await asentar();
  assert.deepEqual(leer(ANA), [[], true, 'loading']);
  pedidos[1].resolve(['finance']);
  await asentar();
  assert.deepEqual(leer(ANA), [['finance'], false, 'success']);
});

test('snapshot estable para useSyncExternalStore y sin usuario no pide nada', async () => {
  const { store, pedidos, leer, asentar, avisos } = prepararStore();
  assert.equal(store.asegurar(undefined), null);
  assert.deepEqual(leer(undefined), [[], false, 'idle']);
  await asentar();
  assert.equal(pedidos.length, 0);

  store.asegurar(ANA);
  await asentar();
  pedidos[0].resolve(['indicadores']);
  await asentar();
  assert.equal(store.snapshot(ANA), store.snapshot(ANA), 'mismo objeto mientras no cambie');
  const antes = avisos();
  store.asegurar(ANA);
  assert.equal(avisos(), antes, 'una lectura vigente no notifica');
});
