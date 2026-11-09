import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw, Square } from 'lucide-react'
import { api } from '../../lib/api'
import {
  describirSuperposicion, esErrorDeAcceso, fechaLocal, formatoDuracion, mensajeActualizaciones,
  prepararRegistroTiempo, rangoRegistro, valoresIniciales,
} from './actualizaciones'

// Carga manual y corrección de un registro de tiempo propio (contrato r2 §1).
//   - `registro` null: alta manual (POST …/registros-tiempo).
//   - `registro`: corrección (PATCH …/:registroId con `version`). El
//     componente se monta con key id:version: una versión nueva lo reinicia.
// Flujo (r2 §1.8): validación local → POST …/validar → si hay superposiciones,
// confirmación dentro del panel (Cancelar / Guardar igualmente) → guardar. Las
// superposiciones nunca bloquean. `ejecutar` es el del panel: comparte el
// bloqueo de escrituras y la resincronización posterior.

const CAMPO = 'w-full h-10 rounded-lg border border-gray-300 bg-white px-2.5 text-[13.5px] text-gray-800 outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/15 disabled:bg-gray-50 disabled:text-gray-500'
const ETIQUETA = 'block text-[12px] font-medium text-gray-600 mb-1'
const FOCO = 'outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-1'
export const BOTON_PRIMARIO = `inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-[13.5px] font-semibold text-white bg-[#0F6E56] hover:bg-[#085541] active:bg-[#04342C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`
export const BOTON_SECUNDARIO = `inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-[13.5px] font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`

const CAMPO_POR_CODIGO = { FIN_FUTURO: 'fin', INTERVALO_INVALIDO: 'fin' }

export default function RegistroTiempoForm({
  tareaId, registro = null, aviso = null, listo, ocupado, ejecutar, autoFocus = false,
  temporizadorActivo = false, onDetenerTemporizador, onGuardado, onCancelarCorreccion,
  onVersionDesactualizada, registrarEscape,
}) {
  const [valores, setValores] = useState(() => valoresIniciales(registro))
  const [fase, setFase] = useState('editar') // 'editar' | 'confirmar'
  const [superposiciones, setSuperposiciones] = useState([])
  const [error, setError] = useState(null)   // { mensaje, campo?, codigo? }
  const primero = useRef(null)
  const confirmacion = useRef(null)
  const uid = useId()
  const hoy = fechaLocal(new Date())

  const prep = useMemo(() => prepararRegistroTiempo(valores, registro), [valores, registro])
  const deshabilitado = !listo || !!ocupado

  useEffect(() => { if (autoFocus) primero.current?.focus() }, [autoFocus])
  useEffect(() => { if (fase === 'confirmar') confirmacion.current?.focus() }, [fase])
  // Escape con la confirmación abierta vuelve al formulario (no cierra el panel).
  useEffect(() => {
    registrarEscape?.(fase === 'confirmar' ? () => { setFase('editar'); primero.current?.focus() } : null)
    return () => registrarEscape?.(null)
  }, [fase, registrarEscape])

  const cambiar = (campo) => (e) => {
    const valor = e.target.value
    setValores(v => ({
      ...v,
      [campo]: valor,
      // Mientras ambas fechas coinciden, cambiar la de inicio mueve también la de fin.
      ...(campo === 'fechaInicio' && v.fechaFin === v.fechaInicio ? { fechaFin: valor } : {}),
    }))
    setFase('editar'); setError(null)
  }

  function manejarError(err, resultado) {
    if (err?.codigo === 'VERSION_DESACTUALIZADA' && registro) {
      onVersionDesactualizada?.(registro.id, resultado?.eventos)
      return
    }
    // Sin acceso o sesión vencida: el panel ya muestra el aviso general.
    if (esErrorDeAcceso(err)) { setError(null); return }
    setError({ mensaje: mensajeActualizaciones(err), campo: CAMPO_POR_CODIGO[err?.codigo] ?? null, codigo: err?.codigo })
  }

  async function guardar() {
    const r = await ejecutar('guardar-tiempo', () => (registro
      ? api.corregirRegistroTiempo(tareaId, registro.id, prep.guardar)
      : api.crearRegistroTiempo(tareaId, prep.guardar)))
    if (r.ocupado || r.desmontado) return
    setFase('editar'); setSuperposiciones([])
    if (!r.ok) return manejarError(r.error, r)
    if (!registro) setValores(valoresIniciales(null))
    onGuardado?.(r.resultado, { correccion: !!registro })
  }

  async function enviar(e) {
    e.preventDefault()
    if (deshabilitado) return
    if (prep.error) { setError({ mensaje: mensajeActualizaciones(prep.error), campo: prep.campo }); return }
    if (prep.sinCambios) { setError({ mensaje: mensajeActualizaciones('SIN_CAMBIOS') }); return }
    setError(null)
    const r = await ejecutar('validar-tiempo', () => api.validarRegistroTiempo(tareaId, prep.validar), { sincronizar: false })
    if (r.ocupado || r.desmontado) return
    if (!r.ok) return manejarError(r.error, r)
    const lista = r.resultado?.advertencias?.superposicion ? (r.resultado.advertencias.superposiciones ?? []) : []
    if (lista.length) { setSuperposiciones(lista); setFase('confirmar'); return }
    await guardar()
  }

  const idError = `${uid}-error`
  const conError = (campo) => error?.campo === campo
  const cruzaDia = valores.fechaInicio && valores.fechaFin && valores.fechaFin !== valores.fechaInicio
  const duracionTexto = prep.duracion > 0 ? formatoDuracion(prep.duracion) : '—'

  return (
    <form onSubmit={enviar} noValidate aria-label={registro ? 'Corregir registro de tiempo' : 'Registrar tiempo manualmente'}>
      {registro && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
          <p className="font-semibold">Corrigiendo tu registro</p>
          <p className="tabular-nums">{rangoRegistro(registro.inicio, registro.fin)} · {formatoDuracion(registro.duracion_segundos)} · versión {registro.version}</p>
        </div>
      )}
      {aviso && <p role="status" className="mb-3 rounded-xl bg-[#E1F5EE] px-3 py-2 text-[12.5px] text-[#085041]">{aviso}</p>}

      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3" disabled={fase === 'confirmar'}>
        <legend className="sr-only">Horario trabajado</legend>
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <div>
            <label htmlFor={`${uid}-fi`} className={ETIQUETA}>Fecha de inicio</label>
            <input ref={primero} id={`${uid}-fi`} type="date" className={CAMPO} max={hoy} value={valores.fechaInicio}
              onChange={cambiar('fechaInicio')} disabled={deshabilitado} required
              aria-invalid={conError('inicio') || undefined} aria-describedby={conError('inicio') ? idError : undefined} />
          </div>
          <div>
            <label htmlFor={`${uid}-hi`} className={ETIQUETA}>Hora de inicio</label>
            <input id={`${uid}-hi`} type="time" className={CAMPO} value={valores.horaInicio}
              onChange={cambiar('horaInicio')} disabled={deshabilitado} required
              aria-invalid={conError('inicio') || undefined} aria-describedby={conError('inicio') ? idError : undefined} />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <div>
            <label htmlFor={`${uid}-ff`} className={ETIQUETA}>Fecha de finalización</label>
            <input id={`${uid}-ff`} type="date" className={CAMPO} max={hoy} min={valores.fechaInicio || undefined} value={valores.fechaFin}
              onChange={cambiar('fechaFin')} disabled={deshabilitado} required
              aria-invalid={conError('fin') || undefined} aria-describedby={conError('fin') ? idError : undefined} />
          </div>
          <div>
            <label htmlFor={`${uid}-hf`} className={ETIQUETA}>Hora de finalización</label>
            <input id={`${uid}-hf`} type="time" className={CAMPO} value={valores.horaFin}
              onChange={cambiar('horaFin')} disabled={deshabilitado} required
              aria-invalid={conError('fin') || undefined} aria-describedby={conError('fin') ? idError : undefined} />
          </div>
        </div>
      </fieldset>

      <p className="mt-3 text-[13px] text-gray-700" aria-live="polite">
        Duración: <strong className="tabular-nums text-[#085041]">{duracionTexto}</strong>
        {cruzaDia && <span className="text-gray-500"> · termina otro día</span>}
      </p>

      {error && (
        <div id={idError} role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          <p>{error.mensaje}</p>
          {error.codigo === 'REGISTRO_TIEMPO_ACTIVO' && temporizadorActivo && onDetenerTemporizador && (
            <button type="button" onClick={onDetenerTemporizador} disabled={!!ocupado}
              className={`mt-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-red-200 font-medium text-red-700 hover:bg-red-100 ${FOCO}`}>
              <Square size={14} aria-hidden="true" /> Detener temporizador
            </button>
          )}
        </div>
      )}

      {fase === 'confirmar' ? (
        <div ref={confirmacion} tabIndex={-1} role="group" aria-labelledby={`${uid}-sup`}
          className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-900 outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
          <p id={`${uid}-sup`} className="flex items-start gap-2 font-semibold">
            <AlertTriangle size={15} className="shrink-0 mt-px" aria-hidden="true" />
            Este horario se superpone con {superposiciones.length === 1 ? 'otro registro tuyo' : `${superposiciones.length} registros tuyos`}.
          </p>
          <ul className="mt-2 space-y-1 pl-6 list-disc">
            {superposiciones.map(s => <li key={s.registro_id}>{describirSuperposicion(s)}</li>)}
          </ul>
          <p className="mt-2">Podés guardarlo igualmente: la superposición no impide registrar el tiempo.</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" className={BOTON_SECUNDARIO} disabled={!!ocupado}
              onClick={() => { setFase('editar'); primero.current?.focus() }}>Cancelar</button>
            <button type="button" className={BOTON_PRIMARIO} disabled={deshabilitado} onClick={guardar}>
              {ocupado === 'guardar-tiempo' && <RefreshCw size={14} className="animate-spin" aria-hidden="true" />}
              {ocupado === 'guardar-tiempo' ? 'Guardando…' : 'Guardar igualmente'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {registro && (
            <button type="button" className={BOTON_SECUNDARIO} disabled={!!ocupado} onClick={onCancelarCorreccion}>
              Cancelar corrección
            </button>
          )}
          <button type="submit" className={BOTON_PRIMARIO} disabled={deshabilitado}>
            {['validar-tiempo', 'guardar-tiempo'].includes(ocupado) && <RefreshCw size={14} className="animate-spin" aria-hidden="true" />}
            {ocupado === 'validar-tiempo' ? 'Verificando…' : ocupado === 'guardar-tiempo' ? 'Guardando…' : registro ? 'Guardar cambios' : 'Registrar'}
          </button>
        </div>
      )}
    </form>
  )
}
