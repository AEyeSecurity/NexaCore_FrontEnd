import { useId } from 'react'

// Ilustraciones decorativas de la pantalla de Inicio. Solo SVG, en la gama de
// verdes de la marca; todas aria-hidden (no aportan información).

const C = {
  950: '#04342C',
  900: '#085041',
  800: '#0F6E56',
  700: '#1D9E75',
  400: '#5DCAA5',
  100: '#E1F5EE',
}

// Ids únicos por instancia para gradientes y máscaras (useId trae ":" que
// rompe algunas referencias url(#…)).
function useSvgIds(...names) {
  const base = useId().replace(/:/g, '')
  return Object.fromEntries(names.map(n => [n, `${base}-${n}`]))
}

function Grad({ id, from, to, fromOpacity = 1, toOpacity = 1, vertical = true }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? 0 : 1} y2={vertical ? 1 : 0}>
      <stop offset="0" stopColor={from} stopOpacity={fromOpacity} />
      <stop offset="1" stopColor={to} stopOpacity={toOpacity} />
    </linearGradient>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export function HeroOndas({ className = '', style }) {
  const id = useSvgIds('fadeX', 'fadeY', 'maskX', 'maskY', 'g1', 'g2', 'g3', 'g4', 'glow')
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
      viewBox="0 80 800 360"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Fundidos a transparente en los bordes izquierdo e inferior: ninguna
            capa debe dejar un canto recto visible contra el fondo. */}
        <linearGradient id={id.fadeX} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={id.fadeY} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.97" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={id.maskX} maskUnits="userSpaceOnUse" x="0" y="80" width="800" height="360">
          <rect y="80" width="800" height="360" fill={`url(#${id.fadeX})`} />
        </mask>
        <mask id={id.maskY} maskUnits="userSpaceOnUse" x="0" y="80" width="800" height="360">
          <rect y="80" width="800" height="360" fill={`url(#${id.fadeY})`} />
        </mask>
        <radialGradient id={id.glow} cx="0.85" cy="0.15" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <Grad id={id.g1} from={C[100]} to={C[100]} fromOpacity={0.95} toOpacity={0.25} />
        <Grad id={id.g2} from={C[400]} to={C[100]} fromOpacity={0.75} toOpacity={0.3} />
        <Grad id={id.g3} from={C[800]} to={C[700]} fromOpacity={0.85} toOpacity={0.4} />
        <Grad id={id.g4} from={C[950]} to={C[800]} fromOpacity={0.9} toOpacity={0.45} />
      </defs>

      <g mask={`url(#${id.maskX})`}>
        <g mask={`url(#${id.maskY})`}>
          <ellipse cx="700" cy="110" rx="230" ry="170" fill={C[100]} opacity="0.55" />
          {/* Cada capa nace y cierra sobre la línea de base (y=440): sin lados verticales. */}
          <path d="M100 440 C 230 400, 320 200, 470 170 S 650 90, 800 105 L800 440 Z" fill={`url(#${id.g1})`} />
          <path d="M220 440 C 320 390, 440 250, 560 275 S 700 200, 800 220 L800 440 Z" fill={`url(#${id.g2})`} />
          <path d="M350 440 C 450 385, 560 325, 645 348 S 750 292, 800 300 L800 440 Z" fill={`url(#${id.g3})`} />
          <path d="M500 440 C 590 400, 690 372, 800 352 L800 440 Z" fill={`url(#${id.g4})`} />

          <path d="M280 80 C 440 150, 560 260, 800 292" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.9" vectorEffect="non-scaling-stroke" />
          <path d="M420 80 C 520 160, 650 230, 800 240" fill="none" stroke={C[400]} strokeWidth="1" opacity="0.55" vectorEffect="non-scaling-stroke" />
          <path d="M200 150 C 380 215, 590 330, 800 380" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.65" vectorEffect="non-scaling-stroke" />

          <rect y="80" width="800" height="360" fill={`url(#${id.glow})`} />
        </g>
      </g>
    </svg>
  )
}

// ─── Tarjetas de módulo ───────────────────────────────────────────────────────
// Lienzo común 220×200 anclado abajo a la derecha, con fundido hacia la izquierda.

function CardSvg({ children, defs }) {
  const id = useSvgIds('fade', 'mask')
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="absolute inset-y-0 right-0 h-full w-[58%] pointer-events-none"
      viewBox="0 0 220 200"
      preserveAspectRatio="xMaxYMax slice"
    >
      <defs>
        <linearGradient id={id.fade} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={id.mask}><rect width="220" height="200" fill={`url(#${id.fade})`} /></mask>
        {defs}
      </defs>
      <g mask={`url(#${id.mask})`}>{children}</g>
    </svg>
  )
}

function IlusDashboard() {
  const id = useSvgIds('bg', 'panel', 'bar')
  return (
    <CardSvg defs={<>
      <Grad id={id.bg} from={C[100]} to={C[400]} fromOpacity={0.9} toOpacity={0.35} />
      <Grad id={id.panel} from={C[400]} to={C[800]} fromOpacity={0.55} toOpacity={0.85} />
      <Grad id={id.bar} from={C[400]} to={C[100]} fromOpacity={0.85} toOpacity={0.3} />
    </>}>
      <path d="M110 0 C 80 70, 150 120, 105 200 L220 200 L220 0 Z" fill={`url(#${id.bg})`} />
      <path d="M182 0 Q 158 100, 196 200 L220 200 L220 0 Z" fill={`url(#${id.panel})`} />
      {[[92, 44], [116, 66], [140, 90], [164, 114]].map(([x, h]) => (
        <rect key={x} x={x} y={190 - h} width="13" height={h} rx="2" fill={`url(#${id.bar})`} />
      ))}
    </CardSvg>
  )
}

function IlusIndicadores() {
  const id = useSvgIds('area', 'hill')
  const curva = 'M10 188 C 70 180, 110 150, 138 112 S 190 50, 220 38'
  return (
    <CardSvg defs={<>
      <Grad id={id.area} from={C[100]} to={C[100]} fromOpacity={1} toOpacity={0.1} />
      <Grad id={id.hill} from={C[400]} to={C[400]} fromOpacity={0.45} toOpacity={0.05} />
    </>}>
      <path d={`${curva} L220 200 L10 200 Z`} fill={`url(#${id.area})`} />
      <path d="M90 200 C 140 150, 180 135, 220 98 L220 200 Z" fill={`url(#${id.hill})`} />
      <path d={curva} fill="none" stroke={C[800]} strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      <circle cx="148" cy="99" r="12" fill={C[400]} opacity="0.3" />
      <circle cx="148" cy="99" r="5.5" fill={C[800]} />
    </CardSvg>
  )
}

function IlusFinanzas() {
  const id = useSvgIds('bg', 'cylA', 'cylB')
  const cilindros = [[108, 130, id.cylA], [148, 96, id.cylA], [188, 56, id.cylB]]
  return (
    <CardSvg defs={<>
      <Grad id={id.bg} from={C[100]} to={C[100]} fromOpacity={0.2} toOpacity={0.9} />
      <Grad id={id.cylA} from="#fff" to={C[400]} fromOpacity={1} toOpacity={0.55} vertical={false} />
      <Grad id={id.cylB} from={C[400]} to={C[800]} fromOpacity={0.7} toOpacity={0.9} vertical={false} />
    </>}>
      <path d="M140 0 C 120 80, 180 90, 170 200 L220 200 L220 0 Z" fill={`url(#${id.bg})`} />
      {cilindros.map(([x, top, grad]) => (
        <g key={x}>
          <rect x={x} y={top} width="32" height={200 - top} fill={`url(#${grad})`} />
          <ellipse cx={x + 16} cy={top} rx="16" ry="5" fill={C[100]} />
        </g>
      ))}
    </CardSvg>
  )
}

function IlusOperativo() {
  return (
    <CardSvg>
      <path d="M0 118 C 60 88, 110 150, 170 108 S 222 80, 240 88 L240 200 L0 200 Z" fill={C[100]} opacity="0.95" />
      <path d="M0 118 C 60 88, 110 150, 170 108 S 222 80, 240 88" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M20 150 C 80 120, 122 172, 182 140 S 230 120, 240 124 L240 200 L20 200 Z" fill={C[400]} opacity="0.5" />
      <path d="M60 178 C 110 156, 150 196, 200 170 S 236 158, 240 158 L240 200 L60 200 Z" fill={C[800]} opacity="0.55" />
    </CardSvg>
  )
}

function Persona({ cx, cy, r, color, opacity = 1 }) {
  const base = cy + r * 3.4
  return (
    <g fill={color} opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} />
      <path d={`M${cx - 2 * r} ${base} A ${2 * r} ${2 * r} 0 0 1 ${cx + 2 * r} ${base} V 200 H ${cx - 2 * r} Z`} />
    </g>
  )
}

function IlusCrm() {
  return (
    <CardSvg>
      <path d="M50 200 C 90 128, 170 116, 220 136 L220 200 Z" fill={C[100]} />
      <Persona cx={110} cy={122} r={9} color={C[400]} opacity={0.7} />
      <Persona cx={192} cy={108} r={11} color={C[700]} opacity={0.55} />
      <Persona cx={150} cy={92} r={14} color={C[800]} opacity={0.85} />
      <path d="M0 200 C 60 176, 150 182, 220 166 L220 200 Z" fill="#fff" opacity="0.55" />
    </CardSvg>
  )
}

function IlusProtocolos() {
  return (
    <CardSvg>
      <g transform="rotate(-20 165 130)">
        <rect x="98" y="72" width="112" height="150" rx="6" fill={C[800]} opacity="0.55" />
        <rect x="104" y="66" width="112" height="150" rx="6" fill={C[400]} opacity="0.55" />
        <rect x="110" y="60" width="112" height="150" rx="6" fill="#fff" stroke={C[400]} strokeOpacity="0.6" />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={i} x1="124" x2={i % 2 ? 190 : 205} y1={82 + i * 15} y2={82 + i * 15} stroke={C[400]} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        ))}
      </g>
    </CardSvg>
  )
}

const ILUSTRACIONES = {
  dashboard:   IlusDashboard,
  indicadores: IlusIndicadores,
  finance:     IlusFinanzas,
  operations:  IlusOperativo,
  crm:         IlusCrm,
  protocolos:  IlusProtocolos,
}

export function ModuloIlustracion({ id }) {
  const Ilus = ILUSTRACIONES[id]
  return Ilus ? <Ilus /> : null
}
