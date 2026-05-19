import { useState, useRef } from 'react'
import { Upload, CheckCircle, XCircle, AlertCircle, Download, RefreshCw, FileSpreadsheet } from 'lucide-react'
import { api } from '../lib/api'

const COLUMNAS = ['fecha', 'descripcion', 'categoria', 'tipo', 'monto', 'proveedor_cliente (opcional)', 'notas (opcional)']

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function ImportarExcel() {
  const [fase, setFase] = useState('idle') // idle | validando | validado | importando | success | error
  const [archivo, setArchivo] = useState(null)
  const [validacion, setValidacion] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [errMsg, setErrMsg] = useState(null)
  const fileRef = useRef()

  const handleArchivo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setArchivo(file)
    setFase('validando')
    setValidacion(null)
    setErrMsg(null)
    try {
      const fd = new FormData()
      fd.append('archivo', file)
      const res = await api.validarExcel(fd)
      setValidacion(res)
      setFase('validado')
    } catch (err) {
      setErrMsg(err.message)
      setFase('error')
    }
  }

  const handleImportar = async () => {
    if (!archivo) return
    setFase('importando')
    try {
      const fd = new FormData()
      fd.append('archivo', archivo)
      const res = await api.importarExcel(fd)
      setResultado(res)
      setFase('success')
    } catch (err) {
      setErrMsg(err.message)
      setFase('error')
    }
  }

  const reset = () => {
    setFase('idle')
    setArchivo(null)
    setValidacion(null)
    setResultado(null)
    setErrMsg(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const descargarPlantilla = () => {
    const hoy = new Date()
    const f = (d) => d.toISOString().split('T')[0]
    const d1 = f(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
    const d2 = f(new Date(hoy.getFullYear(), hoy.getMonth(), 5))
    const d3 = f(new Date(hoy.getFullYear(), hoy.getMonth(), 10))
    const csvContent = `fecha,descripcion,categoria,tipo,monto,proveedor_cliente,notas
${d1},Ejemplo — Pago de servicio,Servicios,Gasto,50000,Proveedor ejemplo,Nota opcional
${d2},Ejemplo — Cobro a cliente,Servicios,Ingreso,100000,Cliente ejemplo,
${d3},Ejemplo — Licencia software,Tecnología,Gasto,20000,Proveedor Tech,`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'plantilla_nexacore.csv'
    link.click()
  }

  return (
    <div className="animate-fadeIn max-w-3xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Importar Excel</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cargá registros financieros masivamente desde un archivo Excel o CSV.
        </p>
      </div>

      {/* Instrucciones */}
      <div className="card p-5 mb-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={20} className="text-primary-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">Estructura del archivo</h3>
            <p className="text-sm text-gray-600 mb-3">
              El archivo debe tener las siguientes columnas en la primera fila (encabezados en minúscula):
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {COLUMNAS.map(c => (
                <span key={c} className={`text-xs px-2.5 py-1 rounded-full font-mono ${
                  c.includes('opcional') ? 'bg-gray-100 text-gray-500' : 'bg-primary-100 text-primary-800 font-medium'
                }`}>
                  {c}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
              <div>
                <p className="font-medium mb-1">Tipos válidos:</p>
                <p>Ingreso · Gasto</p>
              </div>
              <div>
                <p className="font-medium mb-1">Categorías válidas:</p>
                <p>Tecnología · RRHH · Insumos · Servicios · Inversión · Otros</p>
              </div>
              <div>
                <p className="font-medium mb-1">Formato de fecha:</p>
                <p>YYYY-MM-DD o DD/MM/YYYY</p>
              </div>
            </div>
            <button onClick={descargarPlantilla} className="btn-secondary text-xs">
              <Download size={14} /> Descargar plantilla CSV de ejemplo
            </button>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      {(fase === 'idle' || fase === 'error') && (
        <div className="card p-8">
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
              <Upload size={24} className="text-primary-700" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Arrastrá o hacé click para seleccionar</p>
              <p className="text-sm text-gray-500 mt-1">Archivos .xlsx, .xls o .csv — máximo 5MB</p>
            </div>
            <input ref={fileRef} type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleArchivo} className="hidden" />
          </label>
          {errMsg && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <XCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Validando */}
      {fase === 'validando' && (
        <div className="card p-10 flex flex-col items-center gap-3 text-gray-500">
          <RefreshCw size={28} className="animate-spin text-primary-600" />
          <p className="font-medium">Validando archivo...</p>
          <p className="text-sm">{archivo?.name}</p>
        </div>
      )}

      {/* Resultado de validación */}
      {fase === 'validado' && validacion && (
        <div className="card p-6 animate-fadeIn">
          <div className={`flex items-start gap-3 mb-5 p-4 rounded-xl ${
            validacion.valido ? 'bg-green-50' : 'bg-red-50'
          }`}>
            {validacion.valido
              ? <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              : <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            }
            <div>
              <p className={`font-medium ${validacion.valido ? 'text-green-800' : 'text-red-700'}`}>
                {validacion.valido
                  ? `Archivo válido — ${validacion.totalFilas} registros listos para importar`
                  : `El archivo tiene ${validacion.errores?.length} errores`
                }
              </p>
              <p className="text-sm text-gray-600 mt-0.5">{archivo?.name}</p>
            </div>
          </div>

          {/* Errores */}
          {!validacion.valido && validacion.errores?.length > 0 && (
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                <AlertCircle size={14} /> Errores encontrados
              </h4>
              <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                {validacion.errores.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">• {e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {validacion.preview?.length > 0 && (
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Vista previa (primeras filas)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto'].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validacion.preview.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 px-3 text-gray-600">{row.fecha}</td>
                        <td className="py-2 px-3 font-medium text-gray-800 truncate max-w-[160px]">{row.descripcion}</td>
                        <td className="py-2 px-3 text-gray-600">{row.categoria}</td>
                        <td className="py-2 px-3">
                          <span className={row.tipo === 'Ingreso' ? 'badge-ingreso' : 'badge-gasto'}>{row.tipo}</span>
                        </td>
                        <td className={`py-2 px-3 font-medium ${row.tipo === 'Ingreso' ? 'text-green-700' : 'text-red-600'}`}>
                          {fmt(row.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={reset} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            {validacion.valido && (
              <button onClick={handleImportar} className="btn-primary flex-1 justify-center">
                <Upload size={16} /> Importar {validacion.totalFilas} registros
              </button>
            )}
            {!validacion.valido && (
              <button onClick={reset} className="btn-primary flex-1 justify-center">
                Corregir y reintentar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Importando */}
      {fase === 'importando' && (
        <div className="card p-10 flex flex-col items-center gap-3 text-gray-500">
          <RefreshCw size={28} className="animate-spin text-primary-600" />
          <p className="font-medium">Importando registros...</p>
          <p className="text-sm text-gray-400">Esto puede tardar unos segundos</p>
        </div>
      )}

      {/* Éxito */}
      {fase === 'success' && resultado && (
        <div className="card p-8 animate-fadeIn">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">¡Importación exitosa!</h3>
              <p className="text-gray-600">
                Se importaron <span className="font-bold text-primary-700">{resultado.insertados} registros</span> correctamente.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={reset} className="btn-secondary">
                Importar otro archivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
