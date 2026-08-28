// Exportación a Excel de los catálogos de Res.1732 (Servicios y Criterios),
// con logo institucional, título, filtros aplicados y agrupación coloreada
// (por Estándar en Criterios, por Grupo en Servicios) — mismo patrón que
// exportarAutoevaluacion.ts. Ver esa nota sobre por qué el anclaje de la
// imagen usa fila entera (row: 0, sin fracciones) y no se configuran
// `views` de la hoja: ambas cosas produjeron archivos .xlsx corruptos que
// Excel reparaba al abrir.

const AZUL = '0D2D6B'
const PALETA_GRUPOS = ['2563EB', 'D97706', '059669', '9333EA', 'E11D48', '0891B2', 'EA580C', '475569']

function colorPorIndice(paleta: string[], indice: number) {
  return paleta[indice % paleta.length]
}

async function crearLibro(titulo: string, subtitulo: string, filtros: [string, string][], logoUrl?: string) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Datos', { pageSetup: { orientation: 'landscape', fitToPage: true } })
  // Agrupación nativa de filas de Excel (los +/- del margen izquierdo): la
  // fila de cabecera de cada grupo (color) queda en outlineLevel 0 y sirve
  // de resumen; las filas de datos van en nivel 1. summaryBelow:false
  // porque la cabecera está ARRIBA del grupo, no abajo.
  ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false }

  if (logoUrl) {
    try {
      const resp = await fetch(logoUrl)
      const buffer = await resp.arrayBuffer()
      const imgId = wb.addImage({ buffer, extension: 'png' })
      ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 130, height: 46 } })
    } catch {
      // el logo es decorativo — si falla la descarga, se exporta igual sin él
    }
  }

  ws.getRow(1).height = 22
  ws.getRow(2).height = 22
  ws.mergeCells('B1:E2')
  const tituloCell = ws.getCell('B1')
  tituloCell.value = titulo
  tituloCell.font = { size: 15, bold: true, color: { argb: `FF${AZUL}` } }
  tituloCell.alignment = { vertical: 'middle' }

  ws.mergeCells('B3:E3')
  const subCell = ws.getCell('B3')
  subCell.value = subtitulo
  subCell.font = { size: 11, color: { argb: 'FF64748B' } }

  let fila = 5
  for (const [etiqueta, valor] of filtros) {
    ws.getCell(`B${fila}`).value = `${etiqueta}:`
    ws.getCell(`B${fila}`).font = { bold: true, color: { argb: 'FF64748B' }, size: 9 }
    ws.getCell(`C${fila}`).value = valor
    ws.getCell(`C${fila}`).font = { size: 10 }
    fila++
  }
  fila += 1

  return { wb, ws, fila }
}

function descargar(buf: ArrayBuffer, nombreArchivo: string) {
  const url = URL.createObjectURL(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Servicios Res.1732 (columna G) — agrupado por Grupo
// ============================================================

export type ServicioExport = { nombre: string; grupo: string; descripcion: string; estructura: string }

export async function exportarServiciosExcel(params: {
  filtros: [string, string][]
  servicios: ServicioExport[]
  logoUrl?: string
}) {
  const { wb, ws, fila: filaInicial } = await crearLibro(
    'Catálogo de Servicios Res.1732',
    'Columna G del Excel fuente — 39 servicios genéricos',
    params.filtros,
    params.logoUrl,
  )
  ws.columns = [
    { key: 'a', width: 4 },
    { key: 'servicio', width: 40 },
    { key: 'descripcion', width: 55 },
    { key: 'estructura', width: 45 },
    { key: 'e', width: 4 },
  ]

  const mapaGrupos = new Map<string, ServicioExport[]>()
  for (const s of params.servicios) {
    if (!mapaGrupos.has(s.grupo)) mapaGrupos.set(s.grupo, [])
    mapaGrupos.get(s.grupo)!.push(s)
  }

  let fila = filaInicial
  let indiceGrupo = 0
  for (const [grupo, items] of mapaGrupos) {
    const colorHex = colorPorIndice(PALETA_GRUPOS, indiceGrupo++)
    ws.mergeCells(`A${fila}:D${fila}`)
    const cabecera = ws.getCell(`A${fila}`)
    cabecera.value = `${grupo}  (${items.length} servicios)`
    cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${colorHex}` } }
    cabecera.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
    cabecera.alignment = { vertical: 'middle' }
    ws.getRow(fila).height = 20
    fila++

    const filaEncabezados = ws.getRow(fila)
    filaEncabezados.getCell(2).value = 'Servicio'
    filaEncabezados.getCell(3).value = 'Descripción'
    filaEncabezados.getCell(4).value = 'Estructura'
    for (let c = 2; c <= 4; c++) {
      const cell = filaEncabezados.getCell(c)
      cell.font = { bold: true, color: { argb: 'FF334155' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    }
    fila++

    for (const s of items) {
      const row = ws.getRow(fila)
      row.outlineLevel = 1
      row.getCell(2).value = s.nombre
      row.getCell(2).font = { bold: true }
      row.getCell(3).value = s.descripcion
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(4).value = s.estructura
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' }
      fila++
    }
    fila++
  }

  const buf = await wb.xlsx.writeBuffer()
  descargar(buf, `Servicios_Res1732_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ============================================================
// Criterios Res.1732 — agrupado por Estándar
// ============================================================

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

export type CriterioExport = {
  numero: number
  item: string
  pagina: string
  criterio: string
  grupo: string
  servicio: string
  numeralGrupo: string
  numeralServicio: string
  estandar: string
  complejidad: string
  modalidad: string
}

export async function exportarCriteriosExcel(params: {
  filtros: [string, string][]
  criterios: CriterioExport[]
  logoUrl?: string
}) {
  const { wb, ws, fila: filaInicial } = await crearLibro(
    'Catálogo de Criterios Res.1732',
    `Hoja "AUTOEVALUACION 2026" del Excel fuente — ${params.criterios.length.toLocaleString()} registros`,
    params.filtros,
    params.logoUrl,
  )
  ws.columns = [
    { key: 'a', width: 4 },
    { key: 'no', width: 10 },
    { key: 'criterio', width: 65 },
    { key: 'grupo', width: 22 },
    { key: 'servicio', width: 22 },
    { key: 'numeralGrupo', width: 12 },
    { key: 'numeralServicio', width: 14 },
    { key: 'complejidad', width: 16 },
    { key: 'modalidad', width: 30 },
  ]

  const grupos = agruparPorEstandar(params.criterios)

  let fila = filaInicial
  for (const [estandar, items] of grupos) {
    const colorHex = COLORES_ESTANDAR_HEX[estandar] ?? COLOR_ESTANDAR_DEFECTO
    ws.mergeCells(`A${fila}:I${fila}`)
    const cabecera = ws.getCell(`A${fila}`)
    cabecera.value = `${estandar}  (${items.length} criterios)`
    cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${colorHex}` } }
    cabecera.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
    cabecera.alignment = { vertical: 'middle' }
    ws.getRow(fila).height = 20
    fila++

    const filaEncabezados = ws.getRow(fila)
    const encabezados = ['', 'No.', 'Criterio', 'Grupo', 'Servicio', 'Numeral Grupo', 'Numeral Servicio', 'Complejidad', 'Modalidad']
    encabezados.forEach((texto, i) => {
      if (i === 0) return
      const cell = filaEncabezados.getCell(i + 1)
      cell.value = texto
      cell.font = { bold: true, color: { argb: 'FF334155' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    })
    fila++

    for (const c of items) {
      const row = ws.getRow(fila)
      row.outlineLevel = 1
      row.getCell(2).value = c.item ? `${c.numero} (${c.item})` : c.numero
      row.getCell(3).value = c.criterio
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(4).value = c.grupo
      row.getCell(5).value = c.servicio
      row.getCell(6).value = c.numeralGrupo
      row.getCell(7).value = c.numeralServicio
      row.getCell(8).value = c.complejidad
      row.getCell(9).value = c.modalidad
      for (let col = 2; col <= 9; col++) row.getCell(col).alignment = { ...row.getCell(col).alignment, vertical: 'top' }
      fila++
    }
    fila++
  }

  const buf = await wb.xlsx.writeBuffer()
  descargar(buf, `Criterios_Res1732_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// Agrupa preservando el orden de aparición (los criterios ya vienen
// ordenados por `numero` desde la consulta), igual que en el formulario
// de auto-evaluación — así el orden del Excel es consistente con el de
// la app en vez de alfabetizar los Estándares.
function agruparPorEstandar(criterios: CriterioExport[]): [string, CriterioExport[]][] {
  const mapa = new Map<string, CriterioExport[]>()
  for (const c of criterios) {
    if (!mapa.has(c.estandar)) mapa.set(c.estandar, [])
    mapa.get(c.estandar)!.push(c)
  }
  return Array.from(mapa.entries())
}
