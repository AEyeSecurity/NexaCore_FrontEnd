import { api } from '../../lib/api'

export const protocolosApi = {
  listar:          (params)      => api.getProtocolos(params),
  metricas:        ()            => api.getMetricasProtocolos(),
  obtener:         (id)          => api.getProtocolo(id),
  crear:           (body)        => api.crearProtocolo(body),
  editar:          (id, body)    => api.editarProtocolo(id, body),
  guardarItems:    (id, items)   => api.guardarItemsProtocolo(id, items),
  registrarPrueba: (id, body)    => api.registrarPruebaProtocolo(id, body),
  listarPruebas:   (id)          => api.getPruebasProtocolo(id),
  obtenerPrueba:   (pruebaId)    => api.getPrueba(pruebaId),
}
