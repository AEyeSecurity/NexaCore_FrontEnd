import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { loginWithOAuth } from '../lib/auth'
import LandingBackground from './LandingBackground'

export default function AuthCallback({ onLogin, onDeny }) {
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    let settled = false

    async function process(session) {
      if (settled) return
      settled = true

      const email = session.user.email
      try {
        const profile = await loginWithOAuth(email)
        window.history.replaceState({}, '', '/')
        onLogin(profile)
      } catch (err) {
        await supabase.auth.signOut()
        localStorage.removeItem('nexacore_session')
        setError(err.message)

        // Mostrar acceso denegado 3 segundos y luego delegar a App.jsx
        let t = 3
        const interval = setInterval(() => {
          t -= 1
          setCountdown(t)
          if (t <= 0) {
            clearInterval(interval)
            window.history.replaceState({}, '', '/')
            onDeny() // App.jsx setIsOAuthCallback(false) → re-render garantizado
          }
        }, 1000)
      }
    }

    // Intentar sesión ya establecida (Supabase procesó el hash/code automáticamente)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        process(session)
      }
    })

    // También escuchar el evento en caso de que el procesamiento sea async
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        process(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [onLogin, onDeny])

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #040d08 0%, #061510 45%, #0b1f16 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  }

  const cardStyle = {
    position: 'relative',
    zIndex: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: '0 8px 56px rgba(0,0,0,0.5), 0 0 100px rgba(29,158,117,0.07)',
    padding: '48px 56px',
    textAlign: 'center',
    minWidth: 320,
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <LandingBackground />
        <div style={cardStyle}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-semibold text-white text-[16px] mb-2">Acceso denegado</p>
          <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 260 }}>
            {error}
          </p>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Volviendo al inicio en {countdown}s…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <LandingBackground />
      <div style={cardStyle}>
        <div className="flex items-center justify-center mb-5">
          <svg
            className="animate-spin"
            width="32" height="32" viewBox="0 0 24 24" fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="rgba(29,158,117,0.2)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0110 10" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="font-semibold text-white text-[15px] mb-1.5">Verificando acceso…</p>
        <p className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Validando credenciales con el sistema
        </p>
      </div>
    </div>
  )
}
