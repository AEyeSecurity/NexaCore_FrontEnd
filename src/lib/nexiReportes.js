import { api } from './api'

// Descarga de reportes generados por Nexi. Compartido entre el chat (ReportCard)
// y la vista Reportes.

export function reporteErrorMessage(err) {
  if (err instanceof TypeError || err?.message === 'Failed to fetch') {
    return 'No se pudo conectar con el servidor para descargar el reporte. Intentá nuevamente.'
  }
  switch (err?.status) {
    case 401: return 'Tu sesión expiró. Volvé a iniciar sesión para descargar el reporte.'
    case 403: return 'No tenés permisos para descargar este reporte.'
    case 404: return 'El reporte ya no está disponible.'
    case 409: return 'El reporte no tiene un archivo disponible para descargar.'
    default:  return 'No se pudo descargar el reporte. Intentá nuevamente.'
  }
}

// Nombre de archivo a partir del título: solo se quitan caracteres inválidos en
// nombres de archivo de Windows/macOS.
function nombreArchivoReporte({ titulo, formato }) {
  const base = String(titulo || 'reporte').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'reporte'
  return `${base}.${formato || 'pdf'}`
}

// El endpoint exige Bearer: se baja como blob y se dispara la descarga con una
// URL temporal. Lanza un Error con mensaje para el usuario si falla.
export async function descargarReporteNexi(reporte) {
  try {
    const blob = await api.downloadNexiReporte(reporte.descargaUrl)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivoReporte(reporte)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch (err) {
    const e = new Error(reporteErrorMessage(err))
    e.status = err?.status
    throw e
  }
}
