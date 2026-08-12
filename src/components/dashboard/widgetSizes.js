// Tamaños de mosaico disponibles en modo "Editar mosaicos". Se guardan en
// el backend junto con cada widget (savedWidgets: [{ id, size }]).
export const DEFAULT_TILE_SIZE = 'sm'

export const TILE_SIZE_OPTIONS = [
  { key: 'sm', label: 'S', title: 'Chico' },
  { key: 'md', label: 'M', title: 'Mediano' },
  { key: 'lg', label: 'L', title: 'Grande' },
]

// Clases de grid-column: span aplicadas al contenedor de cada mosaico.
// Al cambiar, CSS Grid reacomoda el resto de los mosaicos solo.
export const TILE_SIZE_SPAN_CLASS = {
  sm: '',
  md: 'sm:col-span-2',
  lg: 'sm:col-span-2 lg:col-span-3',
}
