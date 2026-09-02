import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, ClipboardCheck, ClipboardX, CircleSlash, FileClock, ShieldCheck } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { Badge, Boton, Card, FilterBar, MetricCard, Modal, PageHeader, Spinner } from '../components/ui/ui'
import { RESOLUCIONES, RESOLUCION_KEYS, type ResolucionKey } from '../domain/resoluciones'

type ResumenAutoevaluacion = {
  id: string
  fecha: string
  estado: 'borrador' | 'finalizada'
  servicio: { nombre: string } | null
  usuario: { nombre: string } | null
}

type Resumen = {
  totalCumple: number
  totalNoCumple: number
  totalNoAplica: number
  borradores: number
  habilitadas: number
  recientes: ResumenAutoevaluacion[]
}

type Sede = { id: number; nombre: string }
type Empresa = { id: number; nombre: string }
type ServicioLite = { id: number; nombre: string }
type GrupoLite = { id: number; nombre: string }
type CriterioLite = { estandar: string; complejidad: string; grupo_id: number }
type ServicioPorGrupo = { grupo: string; cantidad: number; color: string }

// Fila del panel filtrable de auto-evaluaciones (sección 3 del pedido
// 2026-08-28) — alimenta a la vez la gráfica y la tabla de datos, para que
// ambas respondan siempre a los mismos filtros.
type AutoevaluacionFila = {
  id: string
  fecha: string
  estado: 'borrador' | 'finalizada'
  habilitada: boolean
  empresa_id: number
  sede_id: number
  servicio_id: number
  empresa: { nombre: string } | null
  sede: { nombre: string } | null
  servicio: { nombre: string } | null
  usuario: { nombre: string } | null
}

// Conteos de Cumple/No Cumple/No Aplica — totales de la auto-evaluación y
// desglosados por Estándar (punto 10 del pedido 2026-08-28). Los % son sobre
// el total de preguntas YA RESPONDIDAS de esa fila/Estándar (no sobre el
// total de criterios aplicables, que exigiría replicar en el Dashboard toda
// la lógica de filtrado por Modalidad/Complejidad de NuevaAutoevaluacion).
type ConteoRespuestas = { cumple: number; no_cumple: number; no_aplica: number; total: number }
function conteoVacio(): ConteoRespuestas {
  return { cumple: 0, no_cumple: 0, no_aplica: 0, total: 0 }
}
function sumarRespuesta(c: ConteoRespuestas, r: string) {
  if (r === 'cumple') c.cumple++
  else if (r === 'no_cumple') c.no_cumple++
  else if (r === 'no_aplica') c.no_aplica++
  c.total++
}
function porcentaje(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

// Color de una celda del mapa de calor según % Cumple: rojo (0%) -> ámbar
// (50%) -> verde (100%), interpolando el matiz HSL. Saturación/luminosidad
// fijas para que el texto blanco siempre tenga suficiente contraste.
function colorCalor(pct: number) {
  const hue = Math.round((pct / 100) * 130)
  return `hsl(${hue}deg 68% 42%)`
}

// Encabezado corto de columna del heatmap: quita el prefijo "Estándar de "
// (Res.1732/Res.3100) y, para las secciones largas de ISO 9001 ("8.2
// Requisitos para los productos y servicios"), deja solo el numeral con el
// texto completo disponible en el title del <th>.
function nombreCortoEstandar(estandar: string) {
  const sinPrefijo = estandar.replace(/^Estándar de /, '')
  const m = sinPrefijo.match(/^(\d+(?:\.\d+)*)\s+(.+)$/)
  return m ? m[1] : sinPrefijo
}

// Mismos colores que el resto de la app (NuevaAutoevaluacion.tsx,
// exportarCatalogo.ts) — mantener sincronizados si se agrega un Estándar.
const COLORES_ESTANDAR_HEX: Record<string, string> = {
  'Estándar de Talento Humano': '#2563EB',
  'Estándar de Infraestructura': '#D97706',
  'Estándar de Dotación': '#059669',
  'Estándar de Medicamentos, Dispositivos Médicos, Insumos y Otras Tecnologías en Salud': '#9333EA',
  'Estándar de Procesos Prioritarios': '#E11D48',
  'Estándar de Historia Clínica y Registros': '#0891B2',
  'Estándar de Interdependencia': '#EA580C',
}
const PALETA_GRUPOS = ['#2563EB', '#D97706', '#059669', '#9333EA', '#E11D48', '#0891B2', '#EA580C', '#475569']

// Nombres cortos para el eje del gráfico de barras — los oficiales son
// frases largas ("GRUPO APOYO DIAGNÓSTICO Y COMPLEMENTACIÓN TERAPÉUTICA")
// que Recharts corta a la mitad de una palabra si solo se recorta por
// longitud de caracteres.
const NOMBRE_CORTO_GRUPO: Record<string, string> = {
  'GRUPO APOYO DIAGNÓSTICO Y COMPLEMENTACIÓN TERAPÉUTICA': 'Apoyo Dx. y Compl. Terap.',
  'GRUPO ATENCIÓN INMEDIATA': 'Atención Inmediata',
  'GRUPO CONSULTA EXTERNA': 'Consulta Externa',
  'GRUPO INTERNACIÓN': 'Internación',
  'GRUPO QUIRURGICO': 'Quirúrgico',
}
function nombreCortoGrupo(nombre: string) {
  return NOMBRE_CORTO_GRUPO[nombre] ?? nombre.replace(/^GRUPO /, '')
}

export default function Dashboard() {
  const navigate = useNavigate()
  // Filtro de Resolución (pedido 2026-09-01, punto 4): elige con cuál
  // resolución trabaja TODO el dashboard — métricas, panel filtrable y
  // catálogo en cifras cambian de fuente (tablas res1732 vs res3100) según
  // este valor, en vez de mezclarlas.
  const [resolucion, setResolucion] = useState<ResolucionKey>('res1732')
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeFiltro, setSedeFiltro] = useState<number | ''>('')

  const [cargandoGraficas, setCargandoGraficas] = useState(true)
  const [serviciosPorGrupo, setServiciosPorGrupo] = useState<ServicioPorGrupo[]>([])
  const [criteriosLite, setCriteriosLite] = useState<CriterioLite[]>([])
  const [grupos, setGrupos] = useState<GrupoLite[]>([])
  const [grupoFiltroChart, setGrupoFiltroChart] = useState<number | ''>('')

  // Panel filtrable de auto-evaluaciones (sección 3 del pedido 2026-08-28):
  // un único juego de filtros alimenta a la vez la gráfica y la tabla de
  // datos de abajo.
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [serviciosRes, setServiciosRes] = useState<ServicioLite[]>([])
  const [panelEmpresaFiltro, setPanelEmpresaFiltro] = useState<number | ''>('')
  const [panelSedeFiltro, setPanelSedeFiltro] = useState<number | ''>('')
  const [panelServicioFiltro, setPanelServicioFiltro] = useState<number | ''>('')
  const [panelEstadoFiltro, setPanelEstadoFiltro] = useState<'todos' | 'borrador' | 'finalizada'>('todos')
  const [panelHabilitadaFiltro, setPanelHabilitadaFiltro] = useState<'todos' | 'si' | 'no'>('todos')
  const [autoevaluacionesPanel, setAutoevaluacionesPanel] = useState<AutoevaluacionFila[]>([])
  const [cargandoPanel, setCargandoPanel] = useState(true)
  // Totales y desglose por Estándar por auto-evaluación (punto 10) — claves
  // por autoevaluacion_id. filaExpandida controla qué fila muestra el
  // desglose por Estándar (una a la vez, para no saturar la tabla).
  const [totalesPorFila, setTotalesPorFila] = useState<Record<string, ConteoRespuestas>>({})
  const [desglosePorEstandar, setDesglosePorEstandar] = useState<Record<string, Record<string, ConteoRespuestas>>>({})
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null)
  // Mapa de calor Sede × Estándar (% Cumple) sobre el mismo panel filtrado —
  // sede -> estandar -> conteo. celdaHeatmap controla el popover de detalle
  // al hacer clic en una celda (clic en vez de hover, igual que el resto de
  // gráficas con detalle de esta app).
  const [heatmapSedeEstandar, setHeatmapSedeEstandar] = useState<Record<string, Record<string, ConteoRespuestas>>>({})
  const [celdaHeatmap, setCeldaHeatmap] = useState<{ sede: string; estandar: string } | null>(null)

  useEffect(() => {
    supabase
      .from('sedes')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => setSedes((data as Sede[]) ?? []))
    supabase
      .from('empresas')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => setEmpresas((data as Empresa[]) ?? []))
  }, [])

  // Al cambiar de Resolución: recarga el catálogo de Servicios del panel y
  // las gráficas de "Catálogo en cifras", y limpia los filtros que dependen
  // de IDs específicos de la resolución anterior (Servicio del panel, Grupo
  // de la gráfica) — los IDs son secuencias independientes por tabla, así
  // que un mismo número en res1732 y res3100 no es el mismo registro.
  useEffect(() => {
    const cfg = RESOLUCIONES[resolucion]
    supabase
      .from(cfg.tablaServicios)
      .select('id, nombre')
      .neq('numeral', cfg.numeralUniversal)
      .order('nombre')
      .then(({ data }) => setServiciosRes((data as ServicioLite[]) ?? []))
    setPanelServicioFiltro('')
    setGrupoFiltroChart('')
    cargarGraficas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolucion])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeFiltro, resolucion])

  useEffect(() => {
    cargarPanel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelEmpresaFiltro, panelSedeFiltro, panelServicioFiltro, panelEstadoFiltro, panelHabilitadaFiltro, resolucion])

  async function cargarPanel() {
    setCargandoPanel(true)
    const cfg = RESOLUCIONES[resolucion]
    const columnasPanel: string = `id, fecha, estado, habilitada, empresa_id, sede_id, servicio_id:${cfg.columnaServicioId}, empresa:empresas(nombre), sede:sedes(nombre), servicio:${cfg.tablaServicios}(nombre), usuario:profiles(nombre)`
    let q = supabase
      .from('autoevaluaciones')
      .select(columnasPanel)
      .eq('resolucion', resolucion)
      .order('creado_en', { ascending: false })
    if (panelEmpresaFiltro) q = q.eq('empresa_id', panelEmpresaFiltro)
    if (panelSedeFiltro) q = q.eq('sede_id', panelSedeFiltro)
    if (panelServicioFiltro) q = q.eq(cfg.columnaServicioId, panelServicioFiltro)
    if (panelEstadoFiltro !== 'todos') q = q.eq('estado', panelEstadoFiltro)
    if (panelHabilitadaFiltro !== 'todos') q = q.eq('habilitada', panelHabilitadaFiltro === 'si')
    const { data } = await q
    const filas = (data as unknown as AutoevaluacionFila[]) ?? []
    setAutoevaluacionesPanel(filas)
    setCargandoPanel(false)
    await cargarDesglose(filas)
  }

  // Trae las respuestas de las auto-evaluaciones filtradas (con el Estándar
  // de su criterio) y las agrega en el cliente — un totalizado general por
  // fila, otro por Estándar (punto 10) y otro por Sede×Estándar (mapa de
  // calor). Paginado por el tope de 1.000 filas del proyecto Supabase, igual
  // que traerTodosLosCriterios(). Recibe las filas del panel (no solo los
  // ids) para poder ubicar la Sede de cada auto-evaluación sin otra consulta.
  async function cargarDesglose(filasPanel: AutoevaluacionFila[]) {
    const ids = filasPanel.map((f) => f.id)
    if (ids.length === 0) {
      setTotalesPorFila({})
      setDesglosePorEstandar({})
      setHeatmapSedeEstandar({})
      return
    }
    const idASede = new Map(filasPanel.map((f) => [f.id, f.sede?.nombre ?? 'Sin sede']))
    const cfg = RESOLUCIONES[resolucion]
    const columnasDesglose: string = `autoevaluacion_id, respuesta, criterio:${cfg.tablaCriterios}(estandar)`
    const TAMANO_PAGINA = 1000
    const filas: { autoevaluacion_id: string; respuesta: string; criterio: { estandar: string } | null }[] = []
    for (let desde = 0; ; desde += TAMANO_PAGINA) {
      const { data } = await supabase
        .from('autoevaluaciones_respuestas')
        .select(columnasDesglose)
        .in('autoevaluacion_id', ids)
        .range(desde, desde + TAMANO_PAGINA - 1)
      const pagina = (data as unknown as typeof filas) ?? []
      filas.push(...pagina)
      if (pagina.length < TAMANO_PAGINA) break
    }

    const totales: Record<string, ConteoRespuestas> = {}
    const porEstandar: Record<string, Record<string, ConteoRespuestas>> = {}
    const porSedeEstandar: Record<string, Record<string, ConteoRespuestas>> = {}
    for (const f of filas) {
      const estandar = f.criterio?.estandar ?? 'Sin estándar'
      if (!totales[f.autoevaluacion_id]) totales[f.autoevaluacion_id] = conteoVacio()
      sumarRespuesta(totales[f.autoevaluacion_id], f.respuesta)

      if (!porEstandar[f.autoevaluacion_id]) porEstandar[f.autoevaluacion_id] = {}
      if (!porEstandar[f.autoevaluacion_id][estandar]) porEstandar[f.autoevaluacion_id][estandar] = conteoVacio()
      sumarRespuesta(porEstandar[f.autoevaluacion_id][estandar], f.respuesta)

      const sede = idASede.get(f.autoevaluacion_id) ?? 'Sin sede'
      if (!porSedeEstandar[sede]) porSedeEstandar[sede] = {}
      if (!porSedeEstandar[sede][estandar]) porSedeEstandar[sede][estandar] = conteoVacio()
      sumarRespuesta(porSedeEstandar[sede][estandar], f.respuesta)
    }
    setTotalesPorFila(totales)
    setDesglosePorEstandar(porEstandar)
    setHeatmapSedeEstandar(porSedeEstandar)
  }

  const limpiarFiltrosPanel = () => {
    setPanelEmpresaFiltro('')
    setPanelSedeFiltro('')
    setPanelServicioFiltro('')
    setPanelEstadoFiltro('todos')
    setPanelHabilitadaFiltro('todos')
  }
  const hayFiltrosPanel =
    !!panelEmpresaFiltro || !!panelSedeFiltro || !!panelServicioFiltro || panelEstadoFiltro !== 'todos' || panelHabilitadaFiltro !== 'todos'

  // Gráfica: cuenta habilitadas/no habilitadas por Sede, sobre el mismo
  // conjunto ya filtrado que alimenta la tabla de abajo.
  const habilitadasPorSede = useMemo(() => {
    const mapa = new Map<string, { sede: string; habilitadas: number; noHabilitadas: number }>()
    for (const a of autoevaluacionesPanel) {
      const nombre = a.sede?.nombre ?? 'Sin sede'
      if (!mapa.has(nombre)) mapa.set(nombre, { sede: nombre, habilitadas: 0, noHabilitadas: 0 })
      const fila = mapa.get(nombre)!
      if (a.habilitada) fila.habilitadas += 1
      else fila.noHabilitadas += 1
    }
    return Array.from(mapa.values()).sort((a, b) => b.habilitadas + b.noHabilitadas - (a.habilitadas + a.noHabilitadas))
  }, [autoevaluacionesPanel])

  // Ejes del mapa de calor Sede × Estándar: sedes en el orden del catálogo
  // (constante entre resoluciones/filtros); estándares en el orden de
  // aparición dentro de los datos ya agregados (evita alfabetizar frases
  // largas de ISO 9001 y mantiene el orden natural del documento fuente).
  const heatmapSedes = useMemo(
    () => sedes.map((s) => s.nombre).filter((nombre) => heatmapSedeEstandar[nombre]),
    [sedes, heatmapSedeEstandar],
  )
  const heatmapEstandares = useMemo(() => {
    const vistos = new Set<string>()
    const orden: string[] = []
    for (const sede of Object.keys(heatmapSedeEstandar)) {
      for (const estandar of Object.keys(heatmapSedeEstandar[sede])) {
        if (!vistos.has(estandar)) {
          vistos.add(estandar)
          orden.push(estandar)
        }
      }
    }
    return orden.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [heatmapSedeEstandar])

  // El proyecto de Supabase tiene un tope de 1.000 filas por consulta
  // (db-max-rows), que un Range header del cliente no puede superar — hay
  // que paginar en varias vueltas para traer los 3.557 criterios completos.
  async function traerTodosLosCriterios(cfg: (typeof RESOLUCIONES)[ResolucionKey]) {
    const columnasLite: string = `estandar, complejidad, grupo_id:${cfg.columnaGrupoId}`
    const TAMANO_PAGINA = 1000
    const todas: CriterioLite[] = []
    for (let desde = 0; ; desde += TAMANO_PAGINA) {
      const { data } = await supabase
        .from(cfg.tablaCriterios)
        .select(columnasLite)
        .range(desde, desde + TAMANO_PAGINA - 1)
      const filas = (data as unknown as CriterioLite[]) ?? []
      todas.push(...filas)
      if (filas.length < TAMANO_PAGINA) break
    }
    return todas
  }

  async function cargarGraficas() {
    setCargandoGraficas(true)
    const cfg = RESOLUCIONES[resolucion]
    const columnasGrupoServicio: string = `grupo:${cfg.tablaGrupos}(nombre)`
    const [{ data: serviciosData }, { data: gruposData }, criteriosData] = await Promise.all([
      supabase
        .from(cfg.tablaServicios)
        .select(columnasGrupoServicio)
        .neq('numeral', cfg.numeralUniversal),
      supabase.from(cfg.tablaGrupos).select('id, nombre').neq('numeral', cfg.numeralUniversal).order('nombre'),
      traerTodosLosCriterios(cfg),
    ])

    const conteoGrupo = new Map<string, number>()
    for (const s of (serviciosData as unknown as { grupo: { nombre: string } | null }[]) ?? []) {
      const nombre = s.grupo?.nombre ?? 'Sin grupo'
      conteoGrupo.set(nombre, (conteoGrupo.get(nombre) ?? 0) + 1)
    }
    setServiciosPorGrupo(
      Array.from(conteoGrupo.entries())
        .map(([grupo, cantidad], i) => ({ grupo, cantidad, color: PALETA_GRUPOS[i % PALETA_GRUPOS.length] }))
        .sort((a, b) => b.cantidad - a.cantidad),
    )
    setGrupos((gruposData as GrupoLite[]) ?? [])
    setCriteriosLite(criteriosData)
    setCargandoGraficas(false)
  }

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const cfg = RESOLUCIONES[resolucion]
      // Las respuestas no traen sede_id/resolucion directo — se filtra a
      // través del join a autoevaluaciones (!inner obliga la coincidencia y
      // habilita filtrar por autoevaluaciones.sede_id/resolucion desde acá).
      const conteoRespuesta = (respuesta: string) => {
        let q = supabase
          .from('autoevaluaciones_respuestas')
          .select('id, autoevaluaciones!inner(sede_id, resolucion)', { count: 'exact', head: true })
          .eq('respuesta', respuesta)
          .eq('autoevaluaciones.resolucion', resolucion)
        if (sedeFiltro) q = q.eq('autoevaluaciones.sede_id', sedeFiltro)
        return q
      }
      let borradoresQuery = supabase
        .from('autoevaluaciones')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'borrador')
        .eq('resolucion', resolucion)
      if (sedeFiltro) borradoresQuery = borradoresQuery.eq('sede_id', sedeFiltro)

      let habilitadasQuery = supabase
        .from('autoevaluaciones')
        .select('*', { count: 'exact', head: true })
        .eq('habilitada', true)
        .eq('resolucion', resolucion)
      if (sedeFiltro) habilitadasQuery = habilitadasQuery.eq('sede_id', sedeFiltro)

      const columnasRecientes: string = `id, fecha, estado, servicio:${cfg.tablaServicios}(nombre), usuario:profiles(nombre)`
      let recientesQuery = supabase
        .from('autoevaluaciones')
        .select(columnasRecientes)
        .eq('resolucion', resolucion)
        .order('creado_en', { ascending: false })
        .limit(6)
      if (sedeFiltro) recientesQuery = recientesQuery.eq('sede_id', sedeFiltro)

      const [
        { count: cumple },
        { count: noCumple },
        { count: noAplica },
        { count: borradores },
        { count: habilitadas },
        { data: recientes },
      ] = await Promise.all([
        conteoRespuesta('cumple'),
        conteoRespuesta('no_cumple'),
        conteoRespuesta('no_aplica'),
        borradoresQuery,
        habilitadasQuery,
        recientesQuery,
      ])

      setResumen({
        totalCumple: cumple ?? 0,
        totalNoCumple: noCumple ?? 0,
        totalNoAplica: noAplica ?? 0,
        borradores: borradores ?? 0,
        habilitadas: habilitadas ?? 0,
        recientes: (recientes ?? []) as unknown as ResumenAutoevaluacion[],
      })
    } catch {
      setError('No se pudo cargar el resumen. Verifica la conexión con la base de datos.')
    } finally {
      setCargando(false)
    }
  }

  const total = resumen ? resumen.totalCumple + resumen.totalNoCumple + resumen.totalNoAplica : 0
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  // El filtro de Grupo acota en el cliente las gráficas de Estándar/
  // Complejidad — le da dinamismo sin ida y vuelta a Supabase (ya se trajo
  // la tabla completa de criterios, liviana: 3 columnas de texto).
  const criteriosFiltrados = useMemo(
    () => (grupoFiltroChart ? criteriosLite.filter((c) => c.grupo_id === grupoFiltroChart) : criteriosLite),
    [criteriosLite, grupoFiltroChart],
  )

  const criteriosPorEstandar = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const c of criteriosFiltrados) mapa.set(c.estandar, (mapa.get(c.estandar) ?? 0) + 1)
    return Array.from(mapa.entries()).map(([estandar, cantidad]) => ({
      estandar: estandar.replace('Estándar de ', ''),
      cantidad,
    }))
  }, [criteriosFiltrados])

  const criteriosPorComplejidad = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const c of criteriosFiltrados) mapa.set(c.complejidad, (mapa.get(c.complejidad) ?? 0) + 1)
    return Array.from(mapa.entries())
      .map(([nombre, valor]) => ({ nombre, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [criteriosFiltrados])

  return (
    <div>
      <PageHeader
        titulo="Dashboard"
        acciones={
          <>
            <select
              value={resolucion}
              onChange={(e) => setResolucion(e.target.value as ResolucionKey)}
              className="campo w-36"
              aria-label="Filtrar por Resolución"
            >
              {RESOLUCION_KEYS.map((k) => (
                <option key={k} value={k}>
                  {RESOLUCIONES[k].labelCorto}
                </option>
              ))}
            </select>
            <select
              value={sedeFiltro}
              onChange={(e) => setSedeFiltro(e.target.value ? Number(e.target.value) : '')}
              className="campo w-44"
              aria-label="Filtrar por Sede"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <Boton onClick={() => navigate('/nueva')}>Nueva auto-evaluación</Boton>
          </>
        }
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              titulo="Cumple"
              valor={`${pct(resumen?.totalCumple ?? 0)}%`}
              icono={<ClipboardCheck size={18} />}
              sub={`${resumen?.totalCumple ?? 0} criterios`}
            />
            <MetricCard
              titulo="No cumple"
              valor={`${pct(resumen?.totalNoCumple ?? 0)}%`}
              icono={<ClipboardX size={18} />}
              sub={`${resumen?.totalNoCumple ?? 0} criterios`}
            />
            <MetricCard
              titulo="No aplica"
              valor={`${pct(resumen?.totalNoAplica ?? 0)}%`}
              icono={<CircleSlash size={18} />}
              sub={`${resumen?.totalNoAplica ?? 0} criterios`}
            />
            <MetricCard
              titulo="Borradores"
              valor={resumen?.borradores ?? 0}
              icono={<FileClock size={18} />}
              sub="Pendientes de continuar"
            />
            <MetricCard
              titulo="Habilitadas"
              valor={resumen?.habilitadas ?? 0}
              icono={<ShieldCheck size={18} />}
              sub="Auto-evaluaciones aprobadas"
            />
          </div>

          {/* Panel filtrable de auto-evaluaciones habilitadas (sección 3 del
              pedido 2026-08-28) — un único juego de filtros alimenta a la vez
              la gráfica y la tabla de datos de abajo. */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-azul">Auto-evaluaciones por Habilitación</h2>
          </div>

          {/* flex-nowrap + overflow-x-auto: los 5 filtros quedan siempre en
              una sola línea (punto 9 del pedido 2026-08-28), con scroll
              horizontal si la pantalla es angosta en vez de bajar de línea. */}
          <FilterBar className="!flex-nowrap overflow-x-auto">
            <label className="shrink-0 text-xs">
              <span className="mb-1 block font-medium text-slate-600">Empresa</span>
              <select
                value={panelEmpresaFiltro}
                onChange={(e) => setPanelEmpresaFiltro(e.target.value ? Number(e.target.value) : '')}
                className="campo w-36"
              >
                <option value="">Todas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="shrink-0 text-xs">
              <span className="mb-1 block font-medium text-slate-600">Sede</span>
              <select
                value={panelSedeFiltro}
                onChange={(e) => setPanelSedeFiltro(e.target.value ? Number(e.target.value) : '')}
                className="campo w-36"
              >
                <option value="">Todas</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="shrink-0 text-xs">
              <span className="mb-1 block font-medium text-slate-600">Servicio</span>
              <select
                value={panelServicioFiltro}
                onChange={(e) => setPanelServicioFiltro(e.target.value ? Number(e.target.value) : '')}
                className="campo w-40"
              >
                <option value="">Todos</option>
                {serviciosRes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="shrink-0 text-xs">
              <span className="mb-1 block font-medium text-slate-600">Estado</span>
              <select
                value={panelEstadoFiltro}
                onChange={(e) => setPanelEstadoFiltro(e.target.value as typeof panelEstadoFiltro)}
                className="campo w-32"
              >
                <option value="todos">Todos</option>
                <option value="borrador">Borrador</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </label>
            <label className="shrink-0 text-xs">
              <span className="mb-1 block font-medium text-slate-600">Habilitada</span>
              <select
                value={panelHabilitadaFiltro}
                onChange={(e) => setPanelHabilitadaFiltro(e.target.value as typeof panelHabilitadaFiltro)}
                className="campo w-28"
              >
                <option value="todos">Todas</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </label>
            <Boton variante="secundario" onClick={limpiarFiltrosPanel} disabled={!hayFiltrosPanel} className="shrink-0">
              Limpiar filtros
            </Boton>
          </FilterBar>

          {cargandoPanel ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <>
              {/* Últimas auto-evaluaciones al lado de Habilitadas por Sede
                  (pedido 2026-09-02, punto 3) en vez de una fila propia
                  arriba — mismo alto de fila, aprovecha el ancho completo. */}
              <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-0.5 text-sm font-semibold text-slate-700">Habilitadas por Sede</h3>
                  <p className="mb-3 text-xs text-slate-400">
                    {autoevaluacionesPanel.length.toLocaleString()} auto-evaluaciones con los filtros activos
                  </p>
                  {habilitadasPorSede.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">
                      No hay auto-evaluaciones para los filtros seleccionados.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={habilitadasPorSede} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="sede" tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<TooltipGrafica />} cursor={{ fill: '#f1f5f9' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="habilitadas" name="Habilitadas" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                        <Bar dataKey="noHabilitadas" name="No habilitadas" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card className="p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Últimas auto-evaluaciones</h3>
                  {!resumen?.recientes.length ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      Todavía no hay auto-evaluaciones registradas{sedeFiltro ? ' para esta sede' : ''}.
                    </p>
                  ) : (
                    // Columnas de ancho fijo (grid, no flex justify-between) para
                    // que Servicio/Usuario/Estado/Fecha queden alineados entre
                    // filas sin importar cuánto texto tenga cada una — antes cada
                    // fila repartía el espacio sobrante distinto según el largo
                    // del nombre del servicio (ver imagen-1 del pedido 2026-08-28).
                    <div className="divide-y divide-slate-100">
                      {resumen.recientes.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => navigate(`/nueva/${r.id}`)}
                          className="grid w-full grid-cols-[1fr_110px_70px_70px] items-center gap-2 py-1.5 text-left text-xs hover:bg-slate-50"
                        >
                          <span className="truncate font-medium text-slate-700">
                            {r.servicio?.nombre ?? 'Servicio sin definir'}
                          </span>
                          <span className="truncate text-slate-500">{r.usuario?.nombre ?? '—'}</span>
                          <span className={r.estado === 'borrador' ? 'text-amber-600' : 'text-emerald-600'}>
                            {r.estado === 'borrador' ? 'Borrador' : 'Finalizada'}
                          </span>
                          <span className="text-slate-400">{r.fecha}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              <Card className="mb-4">
                <h3 className="mb-1 text-sm font-semibold text-slate-700">Detalle de auto-evaluaciones</h3>
                <p className="mb-3 text-xs text-slate-500">
                  % Cumple/No Cumple/No Aplica calculado sobre las preguntas ya respondidas de cada fila. Click en{' '}
                  <ChevronRight size={11} className="inline" /> para ver el desglose por Estándar.
                </p>
                {autoevaluacionesPanel.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No hay auto-evaluaciones para los filtros seleccionados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-azul text-left text-white">
                          <th className="py-1 pr-2" />
                          <th className="py-1 pr-3">Fecha</th>
                          <th className="py-1 pr-3">Empresa</th>
                          <th className="py-1 pr-3">Sede</th>
                          <th className="py-1 pr-3">Servicio</th>
                          <th className="py-1 pr-3">Usuario</th>
                          <th className="py-1 pr-3">Estado</th>
                          <th className="py-1 pr-3">Habilitada</th>
                          <th className="py-1 pr-3 text-right">Cumple</th>
                          <th className="py-1 pr-3 text-right">No Cumple</th>
                          <th className="py-1 pr-3 text-right">No Aplica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {autoevaluacionesPanel.map((a) => {
                          const t = totalesPorFila[a.id] ?? conteoVacio()
                          const expandida = filaExpandida === a.id
                          return (
                            <Fragment key={a.id}>
                              {/* Fila resaltada mientras su desglose está
                                  abierto (pedido 2026-09-02, punto 4) — antes
                                  no había forma de saber a simple vista cuál
                                  fila generó el panel expandido de abajo. */}
                              <tr
                                className={`cursor-pointer ${expandida ? 'bg-sky-50 hover:bg-sky-100' : 'hover:bg-slate-50'}`}
                                onClick={() => navigate(`/nueva/${a.id}`)}
                              >
                                <td className="py-1 pr-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setFilaExpandida(expandida ? null : a.id)
                                    }}
                                    className="flex items-center justify-center text-slate-400 hover:text-azul"
                                    title="Ver desglose por Estándar"
                                  >
                                    {expandida ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                </td>
                                <td className="py-1 pr-3">{a.fecha}</td>
                                <td className="py-1 pr-3">{a.empresa?.nombre ?? '—'}</td>
                                <td className="py-1 pr-3">{a.sede?.nombre ?? '—'}</td>
                                <td className="py-1 pr-3 font-medium text-slate-700">{a.servicio?.nombre ?? '—'}</td>
                                <td className="py-1 pr-3">{a.usuario?.nombre ?? '—'}</td>
                                <td className="py-1 pr-3">
                                  <Badge tono={a.estado === 'finalizada' ? 'exito' : 'advertencia'}>
                                    {a.estado === 'finalizada' ? 'Finalizada' : 'Borrador'}
                                  </Badge>
                                </td>
                                <td className="py-1 pr-3">
                                  {a.habilitada ? <Badge tono="info">Habilitada</Badge> : <span className="text-xs text-slate-400">—</span>}
                                </td>
                                <td className="py-1 pr-3 text-right text-emerald-600">
                                  {t.cumple} ({porcentaje(t.cumple, t.total)}%)
                                </td>
                                <td className="py-1 pr-3 text-right text-red-600">
                                  {t.no_cumple} ({porcentaje(t.no_cumple, t.total)}%)
                                </td>
                                <td className="py-1 pr-3 text-right text-slate-500">
                                  {t.no_aplica} ({porcentaje(t.no_aplica, t.total)}%)
                                </td>
                              </tr>
                              {expandida && (
                                <tr className="bg-sky-50/60">
                                  {/* Sangría hacia el interior + borde izquierdo de acento:
                                      deja claro que este bloque es "hijo" de la fila resaltada
                                      de arriba, no una fila más de la tabla. */}
                                  <td colSpan={11} className="py-2 pl-8 pr-4">
                                    <div className="border-l-2 border-azul/30 pl-3">
                                      <DesgloseEstandar datos={desglosePorEstandar[a.id] ?? {}} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Mapa de calor Sede × Estándar (pedido 2026-09-02): de un
                  vistazo detecta en qué combinación Sede/Estándar se
                  concentran los incumplimientos, sobre el mismo panel ya
                  filtrado de arriba. Clic en una celda (no hover, mismo
                  criterio que el resto de la app) abre el detalle exacto. */}
              {heatmapSedes.length > 0 && heatmapEstandares.length > 0 && (
                <Card className="mb-4">
                  <h3 className="mb-0.5 text-sm font-semibold text-slate-700">Mapa de calor — % Cumple por Sede y Estándar</h3>
                  <p className="mb-3 text-xs text-slate-500">
                    Verde = alto cumplimiento, rojo = bajo. Clic en una celda para ver el detalle.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="border-separate border-spacing-1 text-xs">
                      <thead>
                        <tr>
                          <th className="sticky left-0 bg-white px-2 py-1 text-left font-medium text-slate-500">Sede</th>
                          {heatmapEstandares.map((est) => (
                            <th
                              key={est}
                              title={est}
                              className="min-w-[52px] px-1 py-1 text-center text-[11px] font-medium text-slate-500"
                            >
                              {nombreCortoEstandar(est)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapSedes.map((sede) => (
                          <tr key={sede}>
                            <td className="sticky left-0 whitespace-nowrap bg-white pr-3 py-1 font-medium text-slate-700">
                              {sede}
                            </td>
                            {heatmapEstandares.map((est) => {
                              const c = heatmapSedeEstandar[sede]?.[est]
                              const total = c?.total ?? 0
                              const pct = c ? porcentaje(c.cumple, total) : 0
                              return (
                                <td key={est} className="p-0 text-center">
                                  <button
                                    type="button"
                                    disabled={total === 0}
                                    onClick={() => setCeldaHeatmap({ sede, estandar: est })}
                                    title={`${sede} · ${est}: ${total === 0 ? 'sin datos respondidas' : `${pct}% Cumple`}`}
                                    style={{ background: total === 0 ? '#f1f5f9' : colorCalor(pct) }}
                                    className={`flex h-8 w-[52px] items-center justify-center rounded-md text-xs font-semibold transition-transform ${
                                      total === 0 ? 'text-slate-300' : 'text-white hover:scale-105'
                                    }`}
                                  >
                                    {total === 0 ? '—' : `${pct}%`}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Gráficas del catálogo de la resolución elegida — independientes
              de la Sede (son metadatos del catálogo, no datos de
              auto-evaluaciones). El filtro de Grupo acota Estándar/
              Complejidad en vivo. */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-azul">Catálogo {RESOLUCIONES[resolucion].labelCorto} en cifras</h2>
          </div>

          {cargandoGraficas ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <Card className="p-4">
                <h3 className="mb-0.5 text-sm font-semibold text-slate-700">Servicios por Grupo</h3>
                <p className="mb-3 text-xs text-slate-400">Columna G — {serviciosPorGrupo.reduce((a, s) => a + s.cantidad, 0)} servicios</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={serviciosPorGrupo} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="grupo"
                      width={110}
                      tick={{ fontSize: 9, fill: '#334155' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={nombreCortoGrupo}
                    />
                    <Tooltip content={<TooltipGrafica />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="cantidad" name="Servicios" radius={[0, 8, 8, 0]} maxBarSize={20} isAnimationActive={false}>
                      {serviciosPorGrupo.map((s, i) => (
                        <Cell key={i} fill={s.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Criterios por Estándar</h3>
                    <p className="text-xs text-slate-400">{criteriosFiltrados.length.toLocaleString()} criterios</p>
                  </div>
                  <select
                    value={grupoFiltroChart}
                    onChange={(e) => setGrupoFiltroChart(e.target.value ? Number(e.target.value) : '')}
                    className="campo w-36 shrink-0 py-1 text-xs"
                  >
                    <option value="">Todos los grupos</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {nombreCortoGrupo(g.nombre)}
                      </option>
                    ))}
                  </select>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={criteriosPorEstandar} outerRadius="72%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="estandar" tick={{ fontSize: 9, fill: '#334155' }} />
                    <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                    <Radar
                      dataKey="cantidad"
                      name="Criterios"
                      stroke="#0D2D6B"
                      fill="#0D2D6B"
                      fillOpacity={0.35}
                      strokeWidth={2}
                      animationDuration={800}
                    />
                    <Tooltip content={<TooltipGrafica />} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="mb-0.5 text-sm font-semibold text-slate-700">Criterios por Complejidad</h3>
                <p className="mb-2 text-xs text-slate-400">
                  {grupoFiltroChart ? grupos.find((g) => g.id === grupoFiltroChart)?.nombre : 'Todos los grupos'}
                </p>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={criteriosPorComplejidad}
                        dataKey="valor"
                        nameKey="nombre"
                        innerRadius="52%"
                        outerRadius="80%"
                        paddingAngle={2}
                        animationDuration={800}
                      >
                        {criteriosPorComplejidad.map((_, i) => (
                          <Cell key={i} fill={PALETA_GRUPOS[i % PALETA_GRUPOS.length]} stroke="#fff" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip content={<TooltipGrafica />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-x-0 top-[68px] flex flex-col items-center">
                    <span className="text-xl font-bold text-azul">{criteriosFiltrados.length}</span>
                    <span className="text-[10px] text-slate-400">criterios</span>
                  </div>
                </div>
                {/* Leyenda propia en vez de <Legend> de Recharts: las frases
                    de Complejidad son largas y en varias líneas de 10px se
                    volvían ilegibles — lista vertical con scroll a 12px. */}
                <div className="mt-2 flex max-h-28 flex-col gap-1 overflow-y-auto pr-1">
                  {criteriosPorComplejidad.map((c, i) => (
                    <div key={c.nombre} className="flex items-center gap-1.5 text-xs" title={c.nombre}>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: PALETA_GRUPOS[i % PALETA_GRUPOS.length] }}
                      />
                      <span className="truncate text-slate-600">{c.nombre}</span>
                      <span className="ml-auto shrink-0 font-medium text-slate-400">{c.valor}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      <Modal
        open={!!celdaHeatmap}
        onClose={() => setCeldaHeatmap(null)}
        titulo={celdaHeatmap ? `${celdaHeatmap.sede} — ${celdaHeatmap.estandar}` : ''}
      >
        {celdaHeatmap &&
          (() => {
            const c = heatmapSedeEstandar[celdaHeatmap.sede]?.[celdaHeatmap.estandar] ?? conteoVacio()
            const filasDetalle: { etiqueta: string; valor: number; color: string }[] = [
              { etiqueta: 'Cumple', valor: c.cumple, color: 'text-emerald-600' },
              { etiqueta: 'No Cumple', valor: c.no_cumple, color: 'text-red-600' },
              { etiqueta: 'No Aplica', valor: c.no_aplica, color: 'text-slate-500' },
            ]
            return (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ background: c.total === 0 ? '#cbd5e1' : colorCalor(porcentaje(c.cumple, c.total)) }}
                  >
                    {c.total === 0 ? '—' : `${porcentaje(c.cumple, c.total)}%`}
                  </div>
                  <div className="text-xs text-slate-600">
                    {c.total.toLocaleString()} preguntas respondidas en esta combinación de Sede/Estándar.
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {filasDetalle.map((f) => (
                    <div key={f.etiqueta} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{f.etiqueta}</span>
                      <span className={`font-semibold ${f.color}`}>
                        {f.valor} ({porcentaje(f.valor, c.total)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
      </Modal>
    </div>
  )
}

// Mini tabla de desglose por Estándar de una auto-evaluación (punto 10) —
// se muestra al expandir una fila del panel "Detalle de auto-evaluaciones".
function DesgloseEstandar({ datos }: { datos: Record<string, ConteoRespuestas> }) {
  const filas = Object.entries(datos).sort((a, b) => a[0].localeCompare(b[0]))
  if (filas.length === 0) {
    return <p className="text-xs text-slate-400">Todavía no hay preguntas respondidas en esta auto-evaluación.</p>
  }
  return (
    <table className="w-full max-w-2xl text-xs">
      <thead>
        <tr className="bg-azul text-left text-white">
          <th className="py-1 pr-4">Estándar</th>
          <th className="py-1 pr-4 text-right">Cumple</th>
          <th className="py-1 pr-4 text-right">No Cumple</th>
          <th className="py-1 pr-4 text-right">No Aplica</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {filas.map(([estandar, c]) => (
          <tr key={estandar}>
            <td className="py-1 pr-4 font-medium text-slate-600">{estandar.replace('Estándar de ', '')}</td>
            <td className="py-1 pr-4 text-right text-emerald-600">
              {c.cumple} ({porcentaje(c.cumple, c.total)}%)
            </td>
            <td className="py-1 pr-4 text-right text-red-600">
              {c.no_cumple} ({porcentaje(c.no_cumple, c.total)}%)
            </td>
            <td className="py-1 pr-4 text-right text-slate-500">
              {c.no_aplica} ({porcentaje(c.no_aplica, c.total)}%)
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TooltipGrafica({ active, payload, label }: { active?: boolean; payload?: { value: number; color?: string; name?: string; payload?: { estandar?: string; grupo?: string; nombre?: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const titulo = label ?? payload[0]?.payload?.estandar ?? payload[0]?.payload?.grupo ?? payload[0]?.payload?.nombre
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {titulo && <div className="mb-1 font-semibold text-slate-700">{titulo}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? COLORES_ESTANDAR_HEX[titulo ?? ''] ?? '#0D2D6B' }} />
          <span className="font-medium text-slate-600">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
