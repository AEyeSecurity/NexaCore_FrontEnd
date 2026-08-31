import { useNexi } from '../../context/NexiContext'

export default function NexiModuleSelector() {
  const { allowedModules, selectedModule, selectModule } = useNexi()

  if (allowedModules.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(15,110,86,0.13)' }}>
      {allowedModules.map(({ id, label, icon: Icon }) => {
        const active = id === selectedModule
        return (
          <button
            key={id}
            onClick={() => selectModule(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer"
            style={{
              background: active ? '#0F6E56' : '#F1F5F3',
              color: active ? '#ffffff' : '#4B5A55',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
