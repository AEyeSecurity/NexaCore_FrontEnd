// Fechas tipo DATE ("YYYY-MM-DD") se formatean sin pasar por `new Date`, que las
// interpreta como medianoche UTC y en Argentina (UTC-3) las corre un día atrás.
export function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaStr)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(fechaStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Día calendario local en formato "YYYY-MM-DD" (toISOString daría el día en UTC).
export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
