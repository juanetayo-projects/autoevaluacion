import type { Respuesta } from './calculos'

// Mismos colores (versión hex, 600) que COLORES_ESTANDAR en NuevaAutoevaluacion.tsx —
// mantener sincronizados si se agrega/cambia un Estándar.
const COLORES_ESTANDAR_HEX: Record<string, string> = {
  'Estándar de Talento Humano': '2563EB',
  'Estándar de Infraestructura': 'D97706',
  'Estándar de Dotación': '059669',
  'Estándar de Medicamentos, Dispositivos Médicos, Insumos y Otras Tecnologías en Salud': '9333EA',
  'Estándar de Procesos Prioritarios': 'E11D48',
  'Estándar de Historia Clínica y Registros': '0891B2',
  'Estándar de Interdependencia': 'EA580C',
}
const COLOR_ESTANDAR_DEFECTO = '475569'
const AZUL = '0D2D6B'

const ETIQUETA_RESPUESTA: Record<Respuesta, string> = {
  cumple: 'Cumple',
  no_cumple: 'No Cumple',
  no_aplica: 'No Aplica',
}
const FILL_RESPUESTA: Record<Respuesta, string> = {
  cumple: 'FFD1FAE5',
  no_cumple: 'FFFEE2E2',
  no_aplica: 'FFE2E8F0',
}
const FONT_RESPUESTA: Record<Respuesta, string> = {
  cumple: 'FF047857',
  no_cumple: 'FFB91C1C',
  no_aplica: 'FF475569',
}

export type CriterioExport = {
  numeroMostrado: string
  criterio: string
  respuesta: Respuesta | null
  observacion: string
}
export type GrupoExport = { estandar: string; items: CriterioExport[] }

export async function exportarAutoevaluacionExcel(params: {
  empresa: string
  sede: string
  periodicidad: string
  lugar: string
  fecha: string
  servicio: string
  modalidad: string
  complejidad: string
  estado: 'borrador' | 'finalizada'
  pctCumple: number
  pctNoCumple: number
  pctNoAplica: number
  diligenciados: number
  total: number
  grupos: GrupoExport[]
  logoUrl?: string
}) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Auto-evaluación', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  })
  // Agrupación nativa de filas de Excel (los +/- del margen izquierdo): la
  // cabecera de cada Estándar queda en outlineLevel 0 y sirve de resumen;
  // las filas de criterios van en nivel 1. summaryBelow:false porque la
  // cabecera está ARRIBA del grupo, no abajo.
  ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false }

  ws.columns = [
    { key: 'no', width: 14 },
    { key: 'criterio', width: 95 },
    { key: 'respuesta', width: 16 },
    { key: 'observacion', width: 45 },
  ]

  if (params.logoUrl) {
    try {
      const resp = await fetch(params.logoUrl)
      const buffer = await resp.arrayBuffer()
      const imgId = wb.addImage({ buffer, extension: 'png' })
      ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 130, height: 46 } })
    } catch {
      // el logo es decorativo — si falla la descarga, se exporta igual sin él
    }
  }

  ws.getRow(1).height = 22
  ws.getRow(2).height = 22
  ws.mergeCells('B1:D2')
  const titulo = ws.getCell('B1')
  titulo.value = 'Auto-evaluación Habilitación — Resolución 1732'
  titulo.font = { size: 15, bold: true, color: { argb: `FF${AZUL}` } }
  titulo.alignment = { vertical: 'middle' }

  ws.mergeCells('B3:D3')
  const subtitulo = ws.getCell('B3')
  subtitulo.value = params.servicio
  subtitulo.font = { size: 12, bold: true, color: { argb: 'FF334155' } }

  // Filtros y datos de cabecera usados en esta auto-evaluación.
  const infoFilas: [string, string][] = [
    ['Empresa', params.empresa],
    ['Sede', params.sede],
    ['Periodicidad', params.periodicidad],
    ['Lugar', params.lugar || '—'],
    ['Fecha', params.fecha],
    ['Modalidad (filtro)', params.modalidad],
    ['Complejidad (filtro)', params.complejidad],
    ['Estado', params.estado === 'finalizada' ? 'Finalizada' : 'Borrador'],
    [
      'Avance',
      `${params.diligenciados}/${params.total} — Cumple ${params.pctCumple}% · No Cumple ${params.pctNoCumple}% · No Aplica ${params.pctNoAplica}%`,
    ],
  ]
  let fila = 5
  for (const [etiqueta, valor] of infoFilas) {
    const c1 = ws.getCell(`B${fila}`)
    c1.value = etiqueta
    c1.font = { bold: true, color: { argb: 'FF64748B' }, size: 9 }
    const c2 = ws.getCell(`C${fila}`)
    c2.value = valor
    c2.font = { size: 10 }
    ws.mergeCells(`C${fila}:D${fila}`)
    fila++
  }
  fila++

  for (const grupo of params.grupos) {
    const colorHex = COLORES_ESTANDAR_HEX[grupo.estandar] ?? COLOR_ESTANDAR_DEFECTO
    ws.mergeCells(`A${fila}:D${fila}`)
    const cabecera = ws.getCell(`A${fila}`)
    cabecera.value = `${grupo.estandar}  (${grupo.items.length} criterios)`
    cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${colorHex}` } }
    cabecera.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
    cabecera.alignment = { vertical: 'middle' }
    ws.getRow(fila).height = 20
    fila++

    const filaEncabezados = ws.getRow(fila)
    filaEncabezados.values = ['No.', 'Criterio', 'Respuesta', 'Observación']
    filaEncabezados.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF334155' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    })
    fila++

    for (const item of grupo.items) {
      const row = ws.getRow(fila)
      row.outlineLevel = 1
      row.getCell(1).value = item.numeroMostrado
      row.getCell(2).value = item.criterio
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(4).value = item.observacion || ''
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' }

      const celdaRespuesta = row.getCell(3)
      if (item.respuesta) {
        celdaRespuesta.value = ETIQUETA_RESPUESTA[item.respuesta]
        celdaRespuesta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_RESPUESTA[item.respuesta] } }
        celdaRespuesta.font = { bold: true, color: { argb: FONT_RESPUESTA[item.respuesta] } }
      } else {
        celdaRespuesta.value = 'Pendiente'
        celdaRespuesta.font = { italic: true, color: { argb: 'FF94A3B8' } }
      }
      celdaRespuesta.alignment = { vertical: 'top' }
      row.getCell(1).alignment = { vertical: 'top' }
      fila++
    }
    fila++
  }

  const buf = await wb.xlsx.writeBuffer()
  const nombreArchivo = `Autoevaluacion_${params.servicio.replace(/[^\w]+/g, '_')}_${params.fecha}.xlsx`
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}
