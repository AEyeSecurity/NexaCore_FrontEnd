import { supabase } from './supabase'

// nexacore_session persiste { email, name, role } en localStorage.
// Solo se usa como caché de perfil para evitar consultas repetidas a DB
// y para que api.js pueda leer el rol sin depender del estado React.
// La fuente de verdad de autenticación es Supabase (JWT + refresh token).
const SESSION_KEY = 'nexacore_session'

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw new Error('Email o contraseña incorrectos')

  const profile = await fetchProfile(data.user.email)
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
  return profile
}

// Valida un usuario autenticado via OAuth contra la tabla interna.
// A diferencia de login(), aquí Supabase ya estableció la sesión.
// Solo verificamos que el email esté en la tabla usuarios y esté Activo.
export async function loginWithOAuth(email) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('nombre, estado, roles(nombre)')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (error || !data)
    throw new Error('Tu cuenta no está autorizada para acceder al sistema.')

  if (data.estado !== 'Activo')
    throw new Error('Tu usuario se encuentra inactivo. Contactá al administrador.')

  const profile = {
    email: email.trim().toLowerCase(),
    name: data.nombre,
    role: data.roles?.nombre ?? null,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
  return profile
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY)
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }

  // Devolver caché si existe (evita una consulta a DB en cada recarga)
  const cached = readCache()
  if (cached) return cached

  // Reconstruir caché si fue borrado (ej: otra pestaña hizo logout y volvió a login)
  const profile = await fetchProfile(session.user.email)
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
  return profile
}

async function fetchProfile(email) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('nombre, roles(nombre)')
    .eq('email', email)
    .eq('estado', 'Activo')
    .single()

  if (error || !data) throw new Error('Usuario no encontrado o inactivo en el sistema')

  return {
    email,
    name: data.nombre,
    role: data.roles?.nombre ?? null,
  }
}

function readCache() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.email && parsed?.name ? parsed : null
  } catch {
    return null
  }
}
