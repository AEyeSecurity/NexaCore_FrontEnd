import { useState } from 'react'
import { TrendingUp, TrendingDown, FileText, Upload, CreditCard, BarChart2, Wallet, ArrowLeftRight, Repeat } from 'lucide-react'
import Movimientos from '../../components/Movimientos'
import Deudas from '../../components/Deudas'
import Comprobantes from '../../components/Comprobantes'
import ImportarExcel from '../../components/ImportarExcel'
import Salarios from '../../components/Salarios'
import Suscripciones from '../../components/Suscripciones'

const TABS = [
  { id: 'ingresos',      label: 'Ingresos',       icon: TrendingUp  },
  { id: 'inversiones',   label: 'Inversiones',    icon: BarChart2   },
  { id: 'gastos',        label: 'Gastos',          icon: TrendingDown},
  { id: 'deudas',        label: 'Deudas',          icon: CreditCard  },
  { id: 'sueldos',       label: 'Sueldos',         icon: Wallet      },
  { id: 'suscripciones', label: 'Suscripciones',   icon: Repeat      },
  { id: 'comprobantes',  label: 'Comprobantes',    icon: FileText    },
  { id: 'excel',         label: 'Importar Excel',  icon: Upload      },
]

export default function FinanceModule({ user, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'ingresos')
  const [openForm, setOpenForm] = useState(null)
  const [vistaMovimientos, setVistaMovimientos] = useState(false)

  const activarTab = (id) => {
    setVistaMovimientos(false)
    setTab(id)
  }

  return (
    <div className="fade-in space-y-4">
      {/* Botón Movimientos — por encima de los sub-tabs */}
      <div>
        <button
          onClick={() => setVistaMovimientos(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm transition-all duration-150"
          style={{
            background: vistaMovimientos ? '#063D2B' : '#0A5240',
            boxShadow: vistaMovimientos ? '0 0 0 2px #5DCAA5' : undefined,
          }}
        >
          <ArrowLeftRight size={15} />
          Ver Movimientos
        </button>
      </div>

      {/* Sub-tabs */}
      {!vistaMovimientos && (
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border w-fit"
          style={{ borderColor: 'rgba(15,110,86,0.1)' }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => activarTab(id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
                style={active
                  ? { background: '#0F6E56', color: '#fff' }
                  : { color: '#6b7280' }}>
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {vistaMovimientos && (
        <Movimientos todos={true} titulo="Movimientos" user={user} />
      )}
      {!vistaMovimientos && tab === 'ingresos' && (
        <Movimientos tipo="Ingreso" openForm={openForm} onFormClose={() => setOpenForm(null)} />
      )}
      {!vistaMovimientos && tab === 'gastos' && (
        <Movimientos tipo="Gasto" incluirSalarios={true} openForm={openForm} onFormClose={() => setOpenForm(null)} />
      )}
      {!vistaMovimientos && tab === 'deudas' && <Deudas />}
      {!vistaMovimientos && tab === 'inversiones' && (
        <Movimientos tipo="Ingreso" titulo="Inversiones" tituloSingular="Inversión" categoriaFija="Inversión"
          openForm={openForm} onFormClose={() => setOpenForm(null)} />
      )}
      {!vistaMovimientos && tab === 'sueldos'        && <Salarios user={user} />}
      {!vistaMovimientos && tab === 'suscripciones' && <Suscripciones user={user} />}
      {!vistaMovimientos && tab === 'comprobantes'  && <Comprobantes />}
      {!vistaMovimientos && tab === 'excel'        && <ImportarExcel />}
    </div>
  )
}
