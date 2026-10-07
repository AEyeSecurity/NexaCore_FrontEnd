import { api } from '../../lib/api'

export const protocolosApi = {
  listar:          (params)      => api.getProtocolos(params),
  metricas:        ()            => api.getMetricasProtocolos(),
  obtener:         (id)          => api.getProtocolo(id),
  crear:           (body)        => api.crearProtocolo(body),
  editar:          (id, body)    => api.editarProtocolo(id, body),
  guardarItems:    (id, items)   => api.guardarItemsProtocolo(id, items),
  eliminar:        (id)          => api.eliminarProtocolo(id),
  crearRegistro:    (id, body)            => api.crearRegistroProtocolo(id, body),
  editarRegistro:   (id, pruebaId, body)  => api.editarRegistroProtocolo(id, pruebaId, body),
  eliminarRegistro: (id, pruebaId)        => api.eliminarRegistroProtocolo(id, pruebaId),
  listarPruebas:   (id)          => api.getPruebasProtocolo(id),
  obtenerPrueba:   (pruebaId)    => api.getPrueba(pruebaId),
}
