// Render estático (react-dom/server) de componentes JSX para node --test, sin
// dependencias nuevas: usa el esbuild que ya instala Vite. Si no está
// disponible, las pruebas de componentes se omiten (no fallan por el entorno).
// El cliente de Supabase se reemplaza por un stub: no hay red ni sesión.
import { mkdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const raiz = fileURLToPath(new URL('../..', import.meta.url))

export async function cargarComponentes(componentes) {
  let esbuild
  try { esbuild = await import('esbuild') } catch { return null }
  const salida = path.join(raiz, 'node_modules', '.cache', 'nexacore-tests')
  await mkdir(salida, { recursive: true })
  const nombre = `componentes-${process.pid}-${Date.now()}.mjs`
  const entrada = [
    "import { renderToStaticMarkup } from 'react-dom/server'",
    "import { createElement } from 'react'",
    ...componentes.map(([alias, archivo, exportado = 'default']) =>
      `import { ${exportado} as ${alias} } from ${JSON.stringify(path.join(raiz, archivo))}`),
    `export const render = (C, props) => renderToStaticMarkup(createElement(C, props))`,
    `export { ${componentes.map(([alias]) => alias).join(', ')} }`,
  ].join('\n')
  await esbuild.build({
    stdin: { contents: entrada, resolveDir: raiz, loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', loader: { '.js': 'jsx', '.jsx': 'jsx' },
    outfile: path.join(salida, nombre), logLevel: 'silent',
    external: ['react', 'react-dom', 'react-dom/*', 'lucide-react'],
    plugins: [{
      name: 'supabase-stub',
      setup(b) {
        b.onResolve({ filter: /\/supabase$/ }, args => (args.path.endsWith('lib/supabase') || args.path === './supabase'
          ? { path: 'supabase-stub', namespace: 'stub' } : undefined))
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: "export const supabase = { auth: { getSession: async () => ({ data: { session: null } }) } }; export const API_URL = 'https://api.test'",
          loader: 'js',
        }))
      },
    }],
  })
  return import(pathToFileURL(path.join(salida, nombre)).href)
}
