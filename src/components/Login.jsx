import { useState } from 'react'
import { X, Eye, EyeOff, LogIn } from 'lucide-react'
import { login } from '../lib/auth'
import { supabase } from '../lib/supabase'
import logoUrl from '../../resources/logo.png'
import LandingBackground from './LandingBackground'

const inputCls =
  'w-full border rounded-xl px-3 py-2.5 text-[13.5px] outline-none bg-white transition-colors focus:ring-2 focus:ring-teal-700/10'
const inputStyle = { borderColor: 'rgba(15,110,86,0.25)' }

export default function Login({ onLogin }) {
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  const openModal = () => { setShowModal(true); setError(null) }
  const closeModal = () => { setShowModal(false); setError(null) }

  const handleGoogleLogin = async () => {
    setError(null)
    setLoadingGoogle(true)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (oauthError) throw oauthError
      // La redirección a Google ocurre automáticamente.
      // No hay código después de esta línea en el flujo exitoso.
    } catch {
      setError('No se pudo iniciar sesión con Google. Intentá de nuevo.')
      setLoadingGoogle(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await login(email, password)
      onLogin(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #040d08 0%, #061510 45%, #0b1f16 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <LandingBackground />

      {/* Center glass panel */}
      <div
        className="relative z-10 flex flex-col items-center landing-fade-up"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 28,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 56px rgba(0,0,0,0.5), 0 0 100px rgba(29,158,117,0.07)',
          padding: '48px 60px',
          textAlign: 'center',
        }}
      >
        <img
          src={logoUrl}
          alt="NexaCore"
          className="w-80 h-56 object-contain mb-1"
          style={{ filter: 'drop-shadow(0 0 22px rgba(29,158,117,0.45))' }}
        />

        {/* <div
          className="font-serif font-bold leading-none tracking-tight mb-3"
          style={{ fontSize: 48, color: '#edfaf4' }}
        >
          Nexa<span style={{ color: '#1D9E75' }}>Core</span>
        </div> */}

        <p
          className="uppercase mb-9"
          style={{ fontSize: 10.5, color: 'rgba(93,202,165,0.55)', letterSpacing: '0.24em' }}
        >
          Sistema de Gestión Integral
        </p>

        {/* Thin accent divider */}
        <div style={{
          width: 52, height: 1, marginBottom: 36,
          background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.5), transparent)',
        }} />

        <button
          onClick={openModal}
          className="flex items-center gap-2.5 px-10 py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-all hover:scale-[1.03] active:scale-[0.98] landing-glow-btn"
          style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)' }}
        >
          <LogIn size={18} />
          Ingresar
        </button>
      </div>

      {/* Footer */}
      <p
        className="absolute bottom-6 z-10 text-[11px] tracking-wide"
        style={{ color: 'rgba(255,255,255,0.18)' }}
      >
        NexaCore
      </p>

      {/* Login modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={closeModal}
          />
          <div
            className="relative rounded-2xl shadow-2xl w-full max-w-sm fade-in overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
          >
            {/* Top accent strip */}
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg,#1D9E75,#5DCAA5)' }} />

            {/* Close button — top right */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100/80 text-gray-400 hover:text-gray-500 transition-colors z-10"
            >
              <X size={15} />
            </button>

            <div className="px-7 pt-7 pb-7">
              <h2 className="font-serif font-semibold text-[20px] text-gray-900 mb-1">
                Bienvenido
              </h2>
              <p className="text-[13px] text-gray-400 mb-6">
                Ingresá tus credenciales para continuar.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">
                    Usuario
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    autoFocus
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="text-[11.5px] font-medium text-gray-500 mb-1.5 block">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className={inputCls + ' pr-10'}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-[12.5px] text-red-600 bg-red-50 border border-red-100">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl border text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'rgba(15,110,86,0.2)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm transition-colors disabled:opacity-60"
                    style={{ background: '#0F6E56' }}
                  >
                    {loading ? 'Verificando...' : 'Confirmar'}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'rgba(15,110,86,0.12)' }} />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-[11.5px] text-gray-400">o</span>
                </div>
              </div>

              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loadingGoogle || loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border text-[13px] font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
                style={{ borderColor: 'rgba(15,110,86,0.2)' }}
              >
                {loadingGoogle ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="#0F6E56" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {loadingGoogle ? 'Redirigiendo a Google...' : 'Continuar con Google'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
