import { TrendingUp, Briefcase, Users, ClipboardCheck } from 'lucide-react'
import { getAllowedPages } from './permissions'

// Los únicos contextos que Nexi puede ofrecer, en el orden en que deben mostrarse.
// Los ids coinciden con los page-ids del sidebar (Layout.jsx / permissions.js).
export const NEXI_MODULES = [
  { id: 'finance',    label: 'Finanzas',  icon: TrendingUp },
  { id: 'operations', label: 'Operativo', icon: Briefcase  },
  { id: 'crm',        label: 'CRM',       icon: Users      },
  { id: 'protocolos', label: 'Protocolos', icon: ClipboardCheck },
]

// Deriva los módulos de Nexi habilitados para un rol reutilizando la misma
// fuente de verdad de permisos que ya filtra el menú lateral (ROLE_PAGES).
// No agrega ni modifica reglas de acceso: solo interseca NEXI_MODULES con
// las páginas que ese rol ya puede ver.
export function getAllowedNexiModules(role) {
  const allowedPages = getAllowedPages(role)
  if (!allowedPages) return NEXI_MODULES
  return NEXI_MODULES.filter(m => allowedPages.includes(m.id))
}
