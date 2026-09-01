import { supabase } from '../lib/supabase'

// Catálogo independiente por resolución (pedido 2026-09-01): mismas tablas
// paralelas para Res.1732 y Res.3100 (grupos_res*/servicios_res*/
// criterios_res*, con columnas que comparten nombre entre ambas por
// convención — grupo_res1732_id/grupo_res3100_id, servicio_res1732_id/
// servicio_res3100_id). Config compartida entre NuevaAutoevaluacion,
// Historial, Dashboard y Catalogos para no repetir el switch en cada uno.
export type ResolucionKey = 'res1732' | 'res3100'

export type ResolucionConfig = {
  label: string
  labelCorto: string
  tablaServicios: string
  tablaCriterios: string
  tablaGrupos: string
  columnaGrupoId: string
  // Mismo nombre de columna en servicios_res*/criterios_res* (FK al
  // servicio) y en autoevaluaciones (cabecera) — coincide por convención en
  // ambas resoluciones (servicio_res1732_id / servicio_res3100_id).
  columnaServicioId: string
  // Columna en autoevaluaciones_respuestas que referencia el criterio de
  // esta resolución.
  columnaCriterioRespuesta: string
  // Numeral del "servicio" universal ("Todo los servicios" en Res.1732
  // capítulo 5; el grupo 11.1 completo en Res.3100) — se excluye del
  // desplegable de Servicio y sus criterios se incluyen siempre, sin filtrar.
  numeralUniversal: string
  // Etiqueta corta del "servicio" universal para la UI (Cap. 5 en Res.1732;
  // el grupo 11.1 completo en Res.3100, que no tiene numeración de capítulo).
  labelUniversal: string
  banner?: string
}

export const RESOLUCIONES: Record<ResolucionKey, ResolucionConfig> = {
  res1732: {
    label: 'Resolución 1732 de 2026',
    labelCorto: 'Res. 1732',
    tablaServicios: 'servicios_res1732',
    tablaCriterios: 'criterios_res1732',
    tablaGrupos: 'grupos_res1732',
    columnaGrupoId: 'grupo_res1732_id',
    columnaServicioId: 'servicio_res1732_id',
    columnaCriterioRespuesta: 'criterio_id',
    numeralUniversal: '5',
    labelUniversal: 'Cap. 5',
    banner: 'images/banner_resolucion1732.webp',
  },
  res3100: {
    label: 'Resolución 3100 de 2019',
    labelCorto: 'Res. 3100',
    tablaServicios: 'servicios_res3100',
    tablaCriterios: 'criterios_res3100',
    tablaGrupos: 'grupos_res3100',
    columnaGrupoId: 'grupo_res3100_id',
    columnaServicioId: 'servicio_res3100_id',
    columnaCriterioRespuesta: 'criterio_res3100_id',
    numeralUniversal: '11.1',
    labelUniversal: 'Grupo 11.1',
    banner: 'images/banner_resolucion3100.webp',
  },
}

export const RESOLUCION_KEYS = Object.keys(RESOLUCIONES) as ResolucionKey[]

const universalIdCache: Partial<Record<ResolucionKey, number | null>> = {}
export async function obtenerServicioUniversalId(resolucion: ResolucionKey) {
  if (universalIdCache[resolucion] != null) return universalIdCache[resolucion]!
  const cfg = RESOLUCIONES[resolucion]
  const { data } = await supabase.from(cfg.tablaServicios).select('id').eq('numeral', cfg.numeralUniversal).single()
  universalIdCache[resolucion] = data?.id ?? null
  return universalIdCache[resolucion]
}
