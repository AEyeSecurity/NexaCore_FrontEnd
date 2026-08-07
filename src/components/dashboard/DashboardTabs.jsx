import { TrendingUp, ClipboardList } from 'lucide-react'

const TABS = [
  { id: 'financial', label: 'Dashboard Financiero',  icon: TrendingUp    },
  { id: 'tasks',     label: 'Tareas y Protocolos',   icon: ClipboardList },
]

export default function DashboardTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-2">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors"
            style={
              isActive
                ? { background: '#1B7A5E', color: '#fff' }
                : {
                    background: 'transparent',
                    color: '#1B7A5E',
                    border: '1px solid rgba(27,122,94,0.3)',
                  }
            }
          >
            <Icon size={14} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
