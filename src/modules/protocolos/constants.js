export const CATEGORIAS = [
  { value: 'robot', label: 'Robots' },
  { value: 'instalacion', label: 'Instalaciones' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'rrhh', label: 'RR.HH.' },
]

export const CATEGORIA_LABELS = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.label]))

export const CATEGORIA_BADGE = {
  robot:       { background: '#EAF0FC', color: '#3B6FD6' },
  instalacion: { background: '#FDF2E3', color: '#E08A2C' },
  hardware:    { background: '#ECE8FB', color: '#6A52D6' },
  rrhh:        { background: '#E1F5EE', color: '#0F6E56' },
}

export const ESTADOS_ITEM = [
  { value: 'ok', label: 'Cumple' },
  { value: 'fail', label: 'No cumple' },
  { value: 'na', label: 'N/A' },
]

export const ESTADO_ITEM_LABELS = Object.fromEntries(ESTADOS_ITEM.map(e => [e.value, e.label]))

export const ESTADO_ITEM_STYLE = {
  ok:   { background: '#E1F5EE', color: '#0F6E56' },
  fail: { background: '#FEE2E2', color: '#B91C1C' },
  na:   { background: '#F3F4F6', color: '#6B7280' },
}
