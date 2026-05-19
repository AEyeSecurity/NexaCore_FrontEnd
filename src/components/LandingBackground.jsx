import { TrendingUp, CheckSquare, Layers } from 'lucide-react'

const BAR_HEIGHTS = [30, 55, 42, 70, 48, 65, 38]

function GlassCard({ title, icon, style, animStyle, children }) {
  return (
    <div
      className="landing-card absolute"
      style={{
        background: 'rgba(29,158,117,0.06)',
        border: '1px solid rgba(29,158,117,0.16)',
        borderRadius: 18,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        padding: '18px 20px',
        ...style,
        ...animStyle,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color: '#5DCAA5' }}>{icon}</span>
        <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.05em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

export default function LandingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true" style={{ pointerEvents: 'none' }}>

      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(29,158,117,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(29,158,117,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orb — center */}
      <div
        className="absolute rounded-full"
        style={{
          width: 720, height: 720,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(29,158,117,0.16) 0%, transparent 65%)',
          animation: 'orb-breathe 9s ease-in-out infinite',
        }}
      />

      {/* Glow orb — top right */}
      <div
        className="absolute rounded-full"
        style={{
          width: 520, height: 520,
          top: -90, right: -90,
          background: 'radial-gradient(circle, rgba(15,110,86,0.13) 0%, transparent 65%)',
          animation: 'orb-breathe 13s ease-in-out infinite 2.5s',
        }}
      />

      {/* Glow orb — bottom left */}
      <div
        className="absolute rounded-full"
        style={{
          width: 400, height: 400,
          bottom: -70, left: -70,
          background: 'radial-gradient(circle, rgba(29,158,117,0.1) 0%, transparent 65%)',
          animation: 'orb-breathe 11s ease-in-out infinite 4.5s',
        }}
      />

      {/* Card 1 — Finanzas (top-left) */}
      <GlassCard
        title="Finanzas"
        icon={<TrendingUp size={13} />}
        style={{ top: '15%', left: '6%', width: 188 }}
        animStyle={{ animation: 'landing-float 9s ease-in-out infinite' }}
      >
        {/* Mini bar chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36, marginBottom: 12 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: 3,
                background: i === 5 ? 'rgba(29,158,117,0.75)' : 'rgba(29,158,117,0.28)',
              }}
            />
          ))}
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5' }} />
          <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10.5 }}>Balance activo</span>
        </div>
      </GlassCard>

      {/* Card 2 — Operaciones (top-right) */}
      <GlassCard
        title="Operaciones"
        icon={<CheckSquare size={13} />}
        style={{ top: '12%', right: '6%', width: 182 }}
        animStyle={{ animation: 'landing-float-alt 11s ease-in-out infinite 1.8s' }}
      >
        {[88, 62, 76].map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(29,158,117,0.55)', flexShrink: 0 }} />
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
              <div style={{ width: `${w}%`, height: '100%', borderRadius: 3, background: 'rgba(29,158,117,0.38)' }} />
            </div>
          </div>
        ))}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0 8px' }} />
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10.5 }}>Tareas en curso</span>
      </GlassCard>

      {/* Card 3 — Planificación (bottom-right) */}
      <GlassCard
        title="Planificación"
        icon={<Layers size={13} />}
        style={{ bottom: '17%', right: '7%', width: 176 }}
        animStyle={{ animation: 'landing-float 12s ease-in-out infinite 3.5s' }}
      >
        <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }}>
          <div style={{
            width: '72%', height: '100%', borderRadius: 4,
            background: 'linear-gradient(90deg, rgba(29,158,117,0.7), rgba(93,202,165,0.5))',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10.5 }}>Progreso</span>
          <span style={{ color: '#5DCAA5', fontSize: 11, fontWeight: 600 }}>72%</span>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(93,202,165,0.65)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10.5 }}>Proyectos activos</span>
        </div>
      </GlassCard>

    </div>
  )
}
