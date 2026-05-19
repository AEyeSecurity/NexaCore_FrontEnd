import { useState, useEffect } from 'react'
import { logout, getSession } from './lib/auth'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Home from './components/Home'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import FinanceModule from './modules/finance/FinanceModule'
import OperationsModule from './modules/operations/OperationsModule'
import CrmModule from './modules/crm/CrmModule'
import PlanificationModule from './modules/planification/PlanificationModule'
import Usuarios from './components/Usuarios'
import AuthCallback from './components/AuthCallback'

function ComingSoon({ title }) {
  return (
    <div className="fade-in flex items-center justify-center h-64">
      <div className="text-center">
        <p className="font-serif text-[20px] font-semibold text-gray-700">{title}</p>
        <p className="text-[13.5px] text-gray-400 mt-2">Módulo en construcción</p>
      </div>
    </div>
  )
}

const ROLE_DEFAULT_PAGE = {
  'Operativo': 'operations',
  'Contable':  'finance',
  'Comercial': 'crm',
}

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('home')
  const [financeInitialTab, setFinanceInitialTab] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  // Estado dedicado para el flujo OAuth callback.
  // Necesario porque cuando el acceso es denegado, user y page ya tienen
  // sus valores iniciales (null / 'home'), por lo que setUser(null)/setPage('home')
  // son no-ops de React y nunca dispararían un re-render.
  // Este estado sí cambia (true → false) y garantiza que React salga del callback.
  const [isOAuthCallback, setIsOAuthCallback] = useState(
    () => window.location.pathname === '/auth/callback'
  )

  useEffect(() => {
    // No iniciar el flujo normal si estamos procesando un callback OAuth
    if (isOAuthCallback) {
      setAuthLoading(false)
      return
    }
    // Restaurar sesión al recargar la página
    getSession()
      .then(session => { if (session) setUser(session) })
      .catch(() => {})
      .finally(() => setAuthLoading(false))

    // Reaccionar a cambios de estado de auth (expiración, logout desde otra pestaña)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setPage('home')
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (targetPage, opts = {}) => {
    if (targetPage === 'dashboard' && user?.role && ROLE_DEFAULT_PAGE[user.role]) {
      setPage(ROLE_DEFAULT_PAGE[user.role])
      return
    }
    // Al navegar a Finance, registrar el tab inicial si se indica; limpiar si no
    if (targetPage === 'finance') {
      setFinanceInitialTab(opts?.tab ?? null)
    }
    setPage(targetPage)
  }

  const handleLogin  = (session) => { setUser(session); setPage('home') }
  const handleLogout = async () => { await logout(); setUser(null); setPage('home') }

  // Manejar retorno de OAuth antes que cualquier otra lógica de renderizado
  if (isOAuthCallback) {
    return (
      <AuthCallback
        onLogin={(profile) => {
          setIsOAuthCallback(false)
          handleLogin(profile)
        }}
        onDeny={() => {
          setIsOAuthCallback(false)
          setUser(null)
        }}
      />
    )
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-400 text-[13.5px]">Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (page === 'home') {
    return <Home user={user} onNavigate={navigate} onLogout={handleLogout} />
  }

  return (
    <Layout page={page} onNavigate={navigate} user={user} onLogout={handleLogout}>
      {page === 'dashboard'     && <Dashboard onNavigate={navigate} />}
      {page === 'finance'       && <FinanceModule user={user} initialTab={financeInitialTab} />}
      {page === 'operations'    && <OperationsModule user={user} />}
      {page === 'crm'           && <CrmModule />}
      {page === 'planification' && <PlanificationModule />}
      {page === 'reportes'      && <ComingSoon title="Reportes" />}
      {page === 'usuarios'      && <Usuarios user={user} />}
      {page === 'settings'      && <ComingSoon title="Configuración" />}
    </Layout>
  )
}
