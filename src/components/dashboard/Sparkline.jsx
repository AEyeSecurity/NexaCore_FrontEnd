// Sparkline liviano en SVG puro — sin librería de gráficos. Línea 2px en el
// propio acento del mosaico a opacidad reducida (de-enfatizada); el punto
// más reciente se resalta a opacidad plena con un anillo del color de la
// superficie de la tarjeta, para que se lea como "acá estamos ahora".
export default function Sparkline({ values, color, surface, height = 40 }) {
  if (!Array.isArray(values) || values.length < 2) return null

  const w = 120
  const h = height
  const pad = 5
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = (w - pad * 2) / (values.length - 1)

  const points = values.map((v, i) => [
    pad + i * stepX,
    pad + (h - pad * 2) * (1 - (v - min) / range),
  ])
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.4} />
      <circle cx={lastX} cy={lastY} r={4} fill={color} stroke={surface} strokeWidth={2} />
    </svg>
  )
}
