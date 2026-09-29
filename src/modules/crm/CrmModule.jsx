import { Users, Plus, UserCheck, UserPlus, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import ContactosTable from './ContactosTable'
import ContactoFormModal from './ContactoFormModal'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-5 border shadow-sm" style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '18' }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-[12.5px] text-gray-500">{label}</p>
      <p className="text-[22px] font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default function CrmModule({ user }) {
  const [metricas, setMetricas]   = useState(null)
  const [modal, setModal]         = useState(null)   // null | 'nuevo' | contacto-object
  const [refreshKey, setRefreshKey] = useState(0)

  const cargarMetricas = () => {
    api.getMetricasCrm().then(setMetricas).catch(() => {})
  }

  useEffect(() => {
    cargarMetricas()
  }, [])

  const handleSaved = () => {
    setModal(null)
    setRefreshKey(k => k + 1)
    cargarMetricas()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este contacto?')) return
    try {
      await api.eliminarContacto(id)
      setRefreshKey(k => k + 1)
      cargarMetricas()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-[20px] font-semibold text-gray-900">CRM</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Contactos, clientes y prospectos</p>
        </div>
        <button
          onClick={() => setModal('nuevo')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-medium shadow-sm"
          style={{ background: '#0F6E56' }}
        >
          <Plus size={15} /> Nuevo Contacto
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total contactos" value={metricas?.total      ?? '—'} icon={Users}     color="#F59E0B" />
        <StatCard label="Clientes"        value={metricas?.clientes   ?? '—'} icon={UserCheck} color="#1D9E75" />
        <StatCard label="Prospectos"      value={metricas?.prospectos ?? '—'} icon={UserPlus}  color="#6366F1" />
        <StatCard label="Proveedores"     value={metricas?.proveedores ?? '—'} icon={Truck}    color="#0EA5E9" />
      </div>

      <ContactosTable
        onEdit={setModal}
        onDelete={handleDelete}
        refreshKey={refreshKey}
      />

      {modal && (
        <ContactoFormModal
          contacto={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
