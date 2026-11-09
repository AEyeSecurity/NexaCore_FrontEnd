import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { aplicarEdicion, consultaMencion, filtrarMencionables, insertarMencion, segmentarContenido } from './menciones'

// Editor de comentarios con menciones @ (contrato r2 §3). Trabaja sobre el
// modelo { texto, menciones } de menciones.js: el usuario ve `@Nombre` y el
// token `@[Nombre](uuid)` se arma recién al serializar. Sin dependencias nuevas:
// textarea nativo + patrón ARIA combobox/listbox.
//
// Teclado con el menú abierto: ↑/↓ recorren, Enter o Tab insertan, Escape
// cierra solo el menú (preventDefault: el panel no se cierra). Sin menú:
// Ctrl/⌘ + Enter envía. El menú se ancla al campo (arriba o abajo), no al
// cursor: funciona igual en pantallas táctiles.

const CAMPO = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-gray-800 outline-none resize-none placeholder:text-gray-400 focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/15 disabled:bg-gray-50 disabled:text-gray-500'
const ALTO_MAXIMO = 168

export function Iniciales({ nombre, className = 'w-8 h-8 text-[11.5px]' }) {
  const iniciales = String(nombre ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?'
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center rounded-full bg-[#E1F5EE] text-[#085041] font-semibold shrink-0 ${className}`}>
      {iniciales}
    </span>
  )
}

// Contenido guardado con chips para las menciones vigentes (nombre actual).
export function TextoConMenciones({ contenido, menciones }) {
  return segmentarContenido(contenido, menciones).map((p, i) => (p.tipo === 'mencion'
    ? <span key={i} title={p.activo ? `Mención a ${p.nombre}` : `Mención a ${p.nombre} (usuario inactivo)`}
        className={`inline rounded-md px-1 py-px font-medium ${p.activo ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-gray-100 text-gray-600'}`}>
        @{p.nombre}
      </span>
    : <span key={i}>{p.texto}</span>))
}

export default function ComposerMenciones({
  id, valor, onChange, mencionables, onSubmit, disabled, placeholder, ariaLabel, describedBy,
  rows = 2, menuArriba = true, autoFocus = false, invalido = false,
}) {
  const ref = useRef(null)
  const cursorPendiente = useRef(null)
  const cierre = useRef(null)
  const [consulta, setConsulta] = useState(null)
  const [activo, setActivo] = useState(0)
  const [descartada, setDescartada] = useState(null) // inicio del @ cerrado con Escape
  const listaId = useId()

  const lista = mencionables?.data ?? []
  const estadoLista = mencionables?.status ?? 'loading'
  const opciones = useMemo(() => (consulta ? filtrarMencionables(lista, consulta.consulta) : []), [consulta, lista])
  // Sin coincidencias y con un espacio en la consulta, el usuario está
  // escribiendo texto común ("@ todos", "@Juan dijo..."): el menú se cierra.
  const abierto = !!consulta && consulta.inicio !== descartada
    && !(estadoLista === 'success' && opciones.length === 0 && /\s/.test(consulta.consulta))

  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])
  useEffect(() => () => clearTimeout(cierre.current), [])
  useEffect(() => { if (activo >= opciones.length) setActivo(0) }, [opciones.length, activo])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, ALTO_MAXIMO)}px`
    if (cursorPendiente.current != null) {
      const c = cursorPendiente.current
      cursorPendiente.current = null
      el.setSelectionRange(c, c)
    }
  })

  // Último modelo conocido: onSelect puede llegar antes del re-render.
  const valorActual = useRef(valor)
  valorActual.current = valor

  function revisarConsulta(estado, cursor) {
    const nueva = consultaMencion(estado, cursor)
    if (!nueva) {
      if (consulta) setConsulta(null)
      setDescartada(null)
      return
    }
    if (consulta?.inicio !== nueva.inicio || consulta?.consulta !== nueva.consulta || consulta?.fin !== nueva.fin) {
      setActivo(0)
      setConsulta(nueva)
    }
  }

  function cambiar(e) {
    const { estado, cursor } = aplicarEdicion(valorActual.current, e.target.value, e.target.selectionEnd)
    if (cursor != null) cursorPendiente.current = cursor
    valorActual.current = estado
    onChange(estado)
    revisarConsulta(estado, cursor ?? e.target.selectionEnd)
  }

  function elegir(usuario) {
    if (!consulta) return
    const { estado, cursor } = insertarMencion(valorActual.current, consulta, usuario)
    cursorPendiente.current = cursor
    valorActual.current = estado
    onChange(estado)
    setConsulta(null)
    ref.current?.focus()
  }

  function teclado(e) {
    if (e.nativeEvent.isComposing) return
    if (abierto) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!opciones.length) return
        e.preventDefault()
        setActivo(i => (i + (e.key === 'ArrowDown' ? 1 : opciones.length - 1)) % opciones.length)
        return
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && opciones.length) {
        e.preventDefault()
        elegir(opciones[activo] ?? opciones[0])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setDescartada(consulta.inicio)
        return
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSubmit?.()
    }
  }

  const textoEstado = estadoLista === 'loading' ? 'Cargando personas…'
    : estadoLista === 'error' ? 'No se pudo cargar la lista de personas. Podés seguir escribiendo.'
    : !lista.length ? 'No hay otras personas para mencionar en este tablero.'
    : !opciones.length ? `Nadie del tablero coincide con “${consulta?.consulta}”.`
    : null

  return (
    <div className="relative">
      <textarea
        ref={ref} id={id} rows={rows} value={valor.texto} disabled={disabled} placeholder={placeholder}
        aria-label={ariaLabel} aria-describedby={describedBy} aria-invalid={invalido || undefined}
        role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={abierto}
        aria-controls={abierto ? listaId : undefined}
        aria-activedescendant={abierto && opciones.length ? `${listaId}-op-${activo}` : undefined}
        className={`${CAMPO} ${invalido ? 'border-red-400' : ''}`}
        onChange={cambiar} onKeyDown={teclado}
        onSelect={e => { if (e.currentTarget.value === valorActual.current.texto) revisarConsulta(valorActual.current, e.currentTarget.selectionEnd) }}
        onFocus={() => clearTimeout(cierre.current)}
        onBlur={() => { cierre.current = setTimeout(() => setConsulta(null), 150) }}
      />
      {abierto && (
        <div className={`absolute left-0 right-0 z-20 rounded-xl border bg-white shadow-xl overflow-hidden ${menuArriba ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ borderColor: 'rgba(15,110,86,0.18)' }}>
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">Mencionar a</p>
          {textoEstado && (
            <p className="flex items-center gap-2 px-3 pb-2.5 text-[12.5px] text-gray-500" role="status">
              {estadoLista === 'loading' && <RefreshCw size={12} className="animate-spin" aria-hidden="true" />}
              {textoEstado}
            </p>
          )}
          {opciones.length > 0 && (
            <ul id={listaId} role="listbox" aria-label="Personas para mencionar" className="max-h-56 overflow-y-auto pb-1">
              {opciones.map((u, i) => (
                <li key={u.id} id={`${listaId}-op-${i}`} role="option" aria-selected={i === activo}
                  onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActivo(i)} onClick={() => elegir(u)}
                  className={`flex items-center gap-2.5 px-3 min-h-[44px] cursor-pointer ${i === activo ? 'bg-[#E1F5EE]' : 'hover:bg-gray-50'}`}>
                  <Iniciales nombre={u.nombre} className="w-7 h-7 text-[11px]" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-gray-800 truncate">{u.nombre}</span>
                    {/* email: solo llega para distinguir nombres repetidos (r2 §3.3) */}
                    {u.email && <span className="block text-[11.5px] text-gray-500 truncate">{u.email}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
