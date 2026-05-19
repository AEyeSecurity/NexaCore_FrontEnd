import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Faltan variables de entorno de Supabase. Revisá tu archivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
