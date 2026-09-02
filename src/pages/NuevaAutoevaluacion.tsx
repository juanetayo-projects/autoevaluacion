import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, X, MinusCircle, Loader2, ArrowLeft, FileDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { calcularAvance, type Avance, type Respuesta } from '../lib/calculos'
import { Boton, Card, Modal, PageHeader, SelectorMultiple, Spinner } from '../components/ui/ui'
import { RESOLUCIONES, RESOLUCION_KEYS, obtenerServicioUniversalId, type ResolucionKey } from '../domain/resoluciones'

type Empresa = { id: number; nombre: string }
type Sede = { id: number; nombre: string; empresa_id: number }
type Periodicidad = { id: number; nombre: string }
// Catálogo de Servicios, normalizado entre resoluciones: cada resolución
// vive en sus propias tablas (servicios_res1732/servicios_res3100, con sus
// columnas grupo_res1732_id/grupo_res3100_id) — se seleccionan con alias
// (`grupo_id:...`, `grupo:...(nombre)`) para que el resto del componente no
// necesite saber en cuál resolución está trabajando.
type ServicioCatalogo = {
  id: number
  nombre: string
  descripcion: string | null
  estructura: string | null
  grupo_id: number
  grupo: { nombre: string } | null
}
type Criterio = {
  id: number
  numero: number
  item: string | null
  criterio: string
  estandar: string
  complejidad: string
  modalidad: string | null
  // Numeral oficial del Servicio/Grupo en la Res.1732 (columna I del Excel,
  // ej. "5" para criterios universales, "6.2.17" para el propio de un
  // servicio) — es el número que se antepone al Item al mostrar el criterio.
  numeral_servicio: string
  // true = criterio del capítulo 5 "Todo los servicios" (se responde
  // siempre, sin importar el Servicio elegido); false = propio del
  // Servicio elegido en la pantalla inicial. Viene de qué consulta lo trajo
  // (buscarCriterios), no se infiere del numeral por robustez.
  esUniversal: boolean
}

// La numeración de "Item" se reinicia dentro de cada Estándar (ej. hay un
// "1." en Talento Humano y OTRO "1." distinto en Infraestructura) — agrupar
// solo por el número de item colisiona entre estándares. Se agrupa por
// Estándar (7 categorías reales, sin colisión); el número de item se sigue
// mostrando por fila (FilaCriterio).
const COLORES_ESTANDAR: Record<string, { borde: string; fondo: string; texto: string; badge: string }> = {
  'Estándar de Talento Humano': { borde: 'border-blue-500', fondo: 'bg-blue-50', texto: 'text-blue-700', badge: 'bg-blue-600' },
  'Estándar de Infraestructura': { borde: 'border-amber-500', fondo: 'bg-amber-50', texto: 'text-amber-700', badge: 'bg-amber-600' },
  'Estándar de Dotación': { borde: 'border-emerald-500', fondo: 'bg-emerald-50', texto: 'text-emerald-700', badge: 'bg-emerald-600' },
  'Estándar de Medicamentos, Dispositivos Médicos, Insumos y Otras Tecnologías en Salud': { borde: 'border-purple-500', fondo: 'bg-purple-50', texto: 'text-purple-700', badge: 'bg-purple-600' },
  'Estándar de Procesos Prioritarios': { borde: 'border-rose-500', fondo: 'bg-rose-50', texto: 'text-rose-700', badge: 'bg-rose-600' },
  'Estándar de Historia Clínica y Registros': { borde: 'border-cyan-500', fondo: 'bg-cyan-50', texto: 'text-cyan-700', badge: 'bg-cyan-600' },
  'Estándar de Interdependencia': { borde: 'border-orange-500', fondo: 'bg-orange-50', texto: 'text-orange-700', badge: 'bg-orange-600' },
}
const COLOR_ESTANDAR_DEFECTO = { borde: 'border-slate-400', fondo: 'bg-slate-50', texto: 'text-slate-700', badge: 'bg-slate-600' }
function colorDeEstandar(estandar: string) {
  return COLORES_ESTANDAR[estandar] ?? COLOR_ESTANDAR_DEFECTO
}

// Distinción visual universal (Cap. 5, "Todo los servicios") vs. propio del
// Servicio elegido — independiente del color de cada Estándar, para que se
// note de un vistazo cuál criterio aplica siempre y cuál es específico.
const COLOR_UNIVERSAL = { badge: 'bg-slate-500', texto: 'text-slate-600', fondo: 'bg-slate-100', fondoItem: 'bg-slate-50' }
const COLOR_PROPIO = { badge: 'bg-teal-600', texto: 'text-teal-700', fondo: 'bg-teal-50', fondoItem: 'bg-teal-50/50' }
type FiltroRespuestaValor = Respuesta | 'todos' | 'pendiente'
type FiltroServicioValor = 'todos' | 'universal' | 'propio'
type RespuestaLocal = { respuesta: Respuesta; observacion: string; respuestaId?: number }
type Compromiso = {
  respuestaId: number
  descripcion_actividad: string
  responsable: string
  fecha_compromiso: string
  archivo?: File
  guardado: boolean
}

// Construye un filtro `columna.in.(...)` para PostgREST citando cada valor
// entre comillas dobles — necesario porque valores reales de Complejidad
// traen comas (ej. "Baja, Mediana y Alta"), que .in.() interpreta como
// separador si no van citados.
function filtroIn(columna: string, valores: string[]) {
  const citados = valores.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(',')
  return `${columna}.in.(${citados})`
}

export default function NuevaAutoevaluacion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()

  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [paso, setPaso] = useState<'resolucion' | 'cabecera' | 'responder' | 'cierre'>('resolucion')
  const [resolucion, setResolucion] = useState<ResolucionKey | null>(null)

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [periodicidades, setPeriodicidades] = useState<Periodicidad[]>([])
  // Servicio = columna G/columna "Servicios" del Excel de cada resolución.
  const [serviciosRes, setServiciosRes] = useState<ServicioCatalogo[]>([])

  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [sedeId, setSedeId] = useState<number | null>(null)
  const [periodicidadId, setPeriodicidadId] = useState<number | null>(null)
  const [lugar, setLugar] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [servicioResId, setServicioResId] = useState<number | null>(null)

  const [modalidades, setModalidades] = useState<string[]>([])
  const [complejidades, setComplejidades] = useState<string[]>([])
  // Multi-selección (pedido 2026-08-28, punto 8): arrays vacíos = "Todas".
  const [modalidadFiltro, setModalidadFiltro] = useState<string[]>([])
  const [complejidadFiltro, setComplejidadFiltro] = useState<string[]>([])

  const [autoevaluacionId, setAutoevaluacionId] = useState<string | null>(id ?? null)
  const [estado, setEstado] = useState<'borrador' | 'finalizada'>('borrador')
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaLocal>>({})
  const [guardando, setGuardando] = useState<number | null>(null)
  const [cargandoCriterios, setCargandoCriterios] = useState(false)

  const [compromisos, setCompromisos] = useState<Record<number, Compromiso>>({})
  const [enviandoCierre, setEnviandoCierre] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [confirmarSalir, setConfirmarSalir] = useState(false)
  const [duplicado, setDuplicado] = useState<{ id: string; estado: 'borrador' | 'finalizada'; fecha: string } | null>(
    null,
  )
  const [verificandoDuplicado, setVerificandoDuplicado] = useState(false)

  const servicioSeleccionado = serviciosRes.find((s) => s.id === servicioResId)

  useEffect(() => {
    cargarCatalogosBase()
  }, [])

  useEffect(() => {
    if (resolucion) cargarServicios(resolucion)
  }, [resolucion])

  useEffect(() => {
    if (id) cargarDraftExistente(id)
    else setCargandoInicial(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function cargarCatalogosBase() {
    const [{ data: emp }, { data: sed }, { data: per }] = await Promise.all([
      supabase.from('empresas').select('*').order('nombre'),
      supabase.from('sedes').select('*').order('nombre'),
      supabase.from('periodicidades').select('id, nombre').order('nombre'),
    ])
    setEmpresas((emp as Empresa[]) ?? [])
    setSedes((sed as Sede[]) ?? [])
    setPeriodicidades((per as Periodicidad[]) ?? [])
    if (emp && emp.length > 0) setEmpresaId(emp[0].id)
  }

  async function cargarServicios(res: ResolucionKey) {
    const cfg = RESOLUCIONES[res]
    const { data: sr } = await supabase
      .from(cfg.tablaServicios)
      .select(`id, nombre, descripcion, estructura, grupo_id:${cfg.columnaGrupoId}, grupo:${cfg.tablaGrupos}(nombre)`)
      .neq('numeral', cfg.numeralUniversal)
      .order('nombre')
    setServiciosRes((sr as unknown as ServicioCatalogo[]) ?? [])
  }

  function seleccionarResolucion(res: ResolucionKey) {
    setResolucion(res)
    setServicioResId(null)
    setModalidadFiltro([])
    setComplejidadFiltro([])
    setPaso('cabecera')
  }

  async function cargarDraftExistente(autoevalId: string) {
    const { data: cab } = await supabase.from('autoevaluaciones').select('*').eq('id', autoevalId).single()
    if (!cab) {
      setCargandoInicial(false)
      return
    }
    const res = (cab.resolucion ?? 'res1732') as ResolucionKey
    const cfg = RESOLUCIONES[res]
    setResolucion(res)
    setAutoevaluacionId(cab.id)
    setEmpresaId(cab.empresa_id)
    setSedeId(cab.sede_id)
    setPeriodicidadId(cab.periodicidad_id)
    setLugar(cab.lugar ?? '')
    setFecha(cab.fecha)
    setServicioResId(cab[cfg.columnaServicioId])
    setModalidadFiltro(cab.modalidad_filtro ?? [])
    setComplejidadFiltro(cab.complejidad_filtro ?? [])
    setEstado(cab.estado)

    await cargarServicios(res)

    const columnasResp: string = `id, ${cfg.columnaCriterioRespuesta}, respuesta, observacion`
    const respQuery = await supabase
      .from('autoevaluaciones_respuestas')
      .select(columnasResp)
      .eq('autoevaluacion_id', autoevalId)
    const resp = (
      respQuery as unknown as {
        data: ({ id: number; respuesta: Respuesta; observacion: string | null } & Record<string, unknown>)[] | null
      }
    ).data
    const mapa: Record<number, RespuestaLocal> = {}
    for (const r of resp ?? []) {
      const critId = (r as Record<string, unknown>)[cfg.columnaCriterioRespuesta] as number | null
      if (critId == null) continue
      mapa[critId] = { respuesta: r.respuesta, observacion: r.observacion ?? '', respuestaId: r.id }
    }
    setRespuestas(mapa)

    await buscarCriterios(res, cab[cfg.columnaServicioId], cab.modalidad_filtro ?? [], cab.complejidad_filtro ?? [])
    setPaso('responder')
    setCargandoInicial(false)
  }

  async function alSeleccionarServicio(servicioId: number) {
    if (!resolucion) return
    setServicioResId(servicioId)
    setModalidadFiltro([])
    setComplejidadFiltro([])

    // Las opciones del filtro salen SOLO de los criterios propios del
    // servicio elegido (no de los universales "Todo los servicios") — los
    // universales igual se incluyen siempre al listar criterios (ver
    // buscarCriterios), pero no deben inflar las opciones del desplegable.
    const cfg = RESOLUCIONES[resolucion]
    const { data } = await supabase
      .from(cfg.tablaCriterios)
      .select('modalidad, complejidad')
      .eq(cfg.columnaServicioId, servicioId)
    const mods = Array.from(new Set((data ?? []).map((r) => r.modalidad).filter(Boolean))) as string[]
    const comps = Array.from(new Set((data ?? []).map((r) => r.complejidad).filter(Boolean))) as string[]
    setModalidades(mods.sort())
    setComplejidades(comps.sort())
  }

  async function buscarCriterios(res: ResolucionKey, servicioId: number, modalidad: string[], complejidad: string[]) {
    setCargandoCriterios(true)
    const cfg = RESOLUCIONES[res]
    const universalId = await obtenerServicioUniversalId(res)
    const columnas = 'id, numero, item, criterio, estandar, complejidad, modalidad, numeral_servicio'

    // Propios del servicio: el filtro de Modalidad/Complejidad aplica (ahora
    // multi-selección, punto 8), con "Todas"/"No aplica"/vacío como comodín
    // (confirmado con el cliente). Los valores se citan entre comillas
    // porque varios de Complejidad traen comas propias (ej. "Baja, Mediana
    // y Alta"), que romperían el separador de in.(...) sin comillas.
    let propios = supabase.from(cfg.tablaCriterios).select(columnas).eq(cfg.columnaServicioId, servicioId)
    if (modalidad.length > 0) {
      propios = propios.or(`${filtroIn('modalidad', modalidad)},modalidad.is.null`)
    }
    if (complejidad.length > 0) {
      propios = propios.or(`${filtroIn('complejidad', complejidad)},complejidad.eq.Todas,complejidad.eq.No aplica`)
    }

    // Universales ("Todo los servicios"): se incluyen SIEMPRE completos,
    // sin filtrar por Modalidad/Complejidad (confirmado con el cliente).
    const universales = universalId
      ? supabase.from(cfg.tablaCriterios).select(columnas).eq(cfg.columnaServicioId, universalId)
      : null

    const [{ data: dataPropios }, universalesResp] = await Promise.all([
      propios,
      universales ?? Promise.resolve({ data: [] as Criterio[] }),
    ])
    const dataUniversales = (universalesResp as { data: Criterio[] | null }).data ?? []

    const todos = [
      ...(dataPropios ?? []).map((c) => ({ ...c, esUniversal: false })),
      ...dataUniversales.map((c) => ({ ...c, esUniversal: true })),
    ].sort((a, b) => a.numero - b.numero)
    setCriterios(todos)
    setCargandoCriterios(false)
  }

  async function iniciar() {
    if (!resolucion || !empresaId || !sedeId || !periodicidadId || !servicioResId || !perfil) return
    if (autoevaluacionId) {
      await buscarCriterios(resolucion, servicioResId, modalidadFiltro, complejidadFiltro)
      setPaso('responder')
      return
    }

    // Antes de crear una nueva, verificar si ya existe una auto-evaluación
    // con la misma Empresa+Sede+Servicio+Resolución (borrador o finalizada).
    // Se filtra también por resolución porque los IDs de servicio son
    // secuencias independientes por tabla (un mismo número puede existir en
    // servicios_res1732 y en servicios_res3100 sin ser el mismo servicio).
    const cfg = RESOLUCIONES[resolucion]
    setVerificandoDuplicado(true)
    const { data: existente } = await supabase
      .from('autoevaluaciones')
      .select('id, estado, fecha')
      .eq('empresa_id', empresaId)
      .eq('sede_id', sedeId)
      .eq('resolucion', resolucion)
      .eq(cfg.columnaServicioId, servicioResId)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
    setVerificandoDuplicado(false)

    if (existente) {
      setDuplicado(existente as { id: string; estado: 'borrador' | 'finalizada'; fecha: string })
      return
    }

    await crearAutoevaluacion()
  }

  async function crearAutoevaluacion() {
    if (!resolucion || !empresaId || !sedeId || !periodicidadId || !servicioResId || !perfil) return
    const cfg = RESOLUCIONES[resolucion]
    const { data, error } = await supabase
      .from('autoevaluaciones')
      .insert({
        empresa_id: empresaId,
        sede_id: sedeId,
        periodicidad_id: periodicidadId,
        lugar,
        fecha,
        usuario_id: perfil.id,
        resolucion,
        [cfg.columnaServicioId]: servicioResId,
        modalidad_filtro: modalidadFiltro.length ? modalidadFiltro : null,
        complejidad_filtro: complejidadFiltro.length ? complejidadFiltro : null,
        estado: 'borrador',
      })
      .select()
      .single()
    if (error || !data) return
    setAutoevaluacionId(data.id)
    await buscarCriterios(resolucion, servicioResId, modalidadFiltro, complejidadFiltro)
    setPaso('responder')
  }

  async function eliminarDuplicadoYCrearNueva() {
    if (!duplicado) return
    await supabase.from('autoevaluaciones').delete().eq('id', duplicado.id)
    setDuplicado(null)
    await crearAutoevaluacion()
  }

  async function responder(criterioId: number, respuesta: Respuesta) {
    if (!autoevaluacionId || !resolucion) return
    const cfg = RESOLUCIONES[resolucion]
    setGuardando(criterioId)
    const observacion = respuestas[criterioId]?.observacion ?? ''
    const { data, error } = await supabase
      .from('autoevaluaciones_respuestas')
      .upsert(
        { autoevaluacion_id: autoevaluacionId, [cfg.columnaCriterioRespuesta]: criterioId, respuesta, observacion },
        { onConflict: `autoevaluacion_id,${cfg.columnaCriterioRespuesta}` },
      )
      .select()
      .single()
    setGuardando(null)
    if (error || !data) return
    setRespuestas((prev) => ({
      ...prev,
      [criterioId]: { respuesta, observacion, respuestaId: data.id },
    }))

    await replicarRespuestaEnEstandar(criterioId, respuesta)
  }

  // Al responder la PRIMERA pregunta de un Estándar, replica esa misma
  // respuesta a las demás preguntas del mismo Estándar que sigan pendientes
  // (punto 6 del pedido 2026-08-28) — el encuestador puede cambiar cualquiera
  // de las autocompletadas después, así que solo toca las que aún no tienen
  // respuesta propia (nunca sobrescribe una respuesta ya dada a mano).
  async function replicarRespuestaEnEstandar(criterioId: number, respuesta: Respuesta) {
    const criterio = criterios.find((c) => c.id === criterioId)
    if (!criterio || !autoevaluacionId || !resolucion) return
    const cfg = RESOLUCIONES[resolucion]
    const grupo = grupos.find((g) => g.clave === criterio.estandar)
    if (!grupo || grupo.items[0]?.id !== criterioId) return

    const pendientes = grupo.items.filter((c) => c.id !== criterioId && !respuestas[c.id]?.respuesta)
    if (pendientes.length === 0) return

    const filas = pendientes.map((c) => ({
      autoevaluacion_id: autoevaluacionId,
      [cfg.columnaCriterioRespuesta]: c.id,
      respuesta,
      observacion: '',
    }))
    const { data, error } = await supabase
      .from('autoevaluaciones_respuestas')
      .upsert(filas, { onConflict: `autoevaluacion_id,${cfg.columnaCriterioRespuesta}` })
      .select()
    if (error || !data) return
    setRespuestas((prev) => {
      const siguiente = { ...prev }
      for (const fila of data) {
        const critId = (fila as Record<string, unknown>)[cfg.columnaCriterioRespuesta] as number
        siguiente[critId] = { respuesta: fila.respuesta, observacion: fila.observacion ?? '', respuestaId: fila.id }
      }
      return siguiente
    })
  }

  async function guardarObservacion(criterioId: number, observacion: string) {
    setRespuestas((prev) => ({
      ...prev,
      [criterioId]: { ...prev[criterioId], observacion, respuesta: prev[criterioId]?.respuesta },
    }))
    if (!autoevaluacionId || !resolucion || !respuestas[criterioId]?.respuesta) return
    const cfg = RESOLUCIONES[resolucion]
    await supabase
      .from('autoevaluaciones_respuestas')
      .update({ observacion })
      .eq('autoevaluacion_id', autoevaluacionId)
      .eq(cfg.columnaCriterioRespuesta, criterioId)
  }

  const avance = useMemo(() => {
    const respMap: Record<number, Respuesta> = {}
    for (const [k, v] of Object.entries(respuestas)) respMap[Number(k)] = v.respuesta
    return calcularAvance(criterios.length, respMap)
  }, [criterios, respuestas])

  const grupos = useMemo(() => {
    const mapa = new Map<string, Criterio[]>()
    for (const c of criterios) {
      if (!mapa.has(c.estandar)) mapa.set(c.estandar, [])
      mapa.get(c.estandar)!.push(c)
    }
    return Array.from(mapa.entries()).map(([clave, items], i) => {
      // Subdivisión dentro de cada Estándar por Numeral Servicio (columna I):
      // agrupa juntos los criterios universales (numeral "5") y los propios
      // de cada servicio (ej. "6.2.17"), cuyo numeral siempre empieza con el
      // Numeral Grupo del mismo criterio (derivado 1 a 1 al guardar en
      // Catálogos, ver Catalogos.tsx) — así el subgrupo mostrado siempre
      // coincide con su Numeral Grupo real.
      const mapaSub = new Map<string, Criterio[]>()
      for (const c of items) {
        if (!mapaSub.has(c.numeral_servicio)) mapaSub.set(c.numeral_servicio, [])
        mapaSub.get(c.numeral_servicio)!.push(c)
      }
      const subgrupos = Array.from(mapaSub.entries())
        .map(([numeral, sitems]) => ({ numeral, items: sitems, esUniversal: sitems[0].esUniversal }))
        .sort((a, b) => a.numeral.localeCompare(b.numeral, undefined, { numeric: true }))
      return { clave, items, numero: i + 1, subgrupos }
    })
  }, [criterios])

  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})
  const [filtroGrupo, setFiltroGrupo] = useState<Record<string, FiltroRespuestaValor>>({})
  const [filtroServicioGrupo, setFiltroServicioGrupo] = useState<Record<string, FiltroServicioValor>>({})

  // Al entrar (o cambiar de servicio) los grupos arrancan contraídos — el
  // usuario los expande a demanda con los chips o "Expandir todo".
  useEffect(() => {
    const todos: Record<string, boolean> = {}
    for (const g of grupos) todos[g.clave] = true
    setGruposColapsados(todos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterios])

  function alternarGrupo(clave: string) {
    setGruposColapsados((prev) => ({ ...prev, [clave]: !prev[clave] }))
  }

  function expandirTodo() {
    setGruposColapsados({})
  }

  function contraerTodo() {
    const todos: Record<string, boolean> = {}
    for (const g of grupos) todos[g.clave] = true
    setGruposColapsados(todos)
  }

  function irAGrupo(clave: string, numero: number) {
    setGruposColapsados((prev) => ({ ...prev, [clave]: false }))
    document.getElementById(`grupo-${numero}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function filtrarItems(items: Criterio[], filtroRespuesta: FiltroRespuestaValor) {
    if (filtroRespuesta === 'todos') return items
    if (filtroRespuesta === 'pendiente') return items.filter((c) => !respuestas[c.id]?.respuesta)
    return items.filter((c) => respuestas[c.id]?.respuesta === filtroRespuesta)
  }

  const noCumpleSinCompromiso = useMemo(() => {
    return Object.entries(respuestas)
      .filter(([, r]) => r.respuesta === 'no_cumple' && r.respuestaId)
      .map(([criterioId, r]) => ({
        criterioId: Number(criterioId),
        respuestaId: r.respuestaId!,
        criterio: criterios.find((c) => c.id === Number(criterioId)),
      }))
  }, [respuestas, criterios])

  function alIntentarFinalizar() {
    if (avance.pendientes > 0) {
      alert(`Faltan ${avance.pendientes} criterios por responder.`)
      return
    }
    if (noCumpleSinCompromiso.length > 0) {
      const inicial: Record<number, Compromiso> = {}
      for (const nc of noCumpleSinCompromiso) {
        inicial[nc.respuestaId] = {
          respuestaId: nc.respuestaId,
          descripcion_actividad: '',
          responsable: '',
          fecha_compromiso: new Date().toISOString().slice(0, 10),
          guardado: false,
        }
      }
      setCompromisos(inicial)
      setPaso('cierre')
      return
    }
    finalizar()
  }

  async function finalizar() {
    if (!autoevaluacionId) return
    await supabase.from('autoevaluaciones').update({ estado: 'finalizada' }).eq('id', autoevaluacionId)
    navigate('/historial')
  }

  async function guardarCompromisosYFinalizar() {
    if (!autoevaluacionId) return
    setEnviandoCierre(true)
    for (const c of Object.values(compromisos)) {
      if (!c.descripcion_actividad || !c.responsable || !c.fecha_compromiso) {
        setEnviandoCierre(false)
        alert('Completa descripción, responsable y fecha de cada actividad.')
        return
      }
      let evidenciaUrl: string | null = null
      if (c.archivo) {
        const ruta = `${autoevaluacionId}/${c.respuestaId}-${c.archivo.name}`
        const { error: errorUpload } = await supabase.storage
          .from('compromisos-evidencias')
          .upload(ruta, c.archivo, { upsert: true })
        if (!errorUpload) evidenciaUrl = ruta
      }
      await supabase.from('autoevaluaciones_compromisos').upsert(
        {
          autoevaluacion_id: autoevaluacionId,
          respuesta_id: c.respuestaId,
          descripcion_actividad: c.descripcion_actividad,
          responsable: c.responsable,
          fecha_compromiso: c.fecha_compromiso,
          evidencia_pdf_url: evidenciaUrl,
        },
        { onConflict: 'respuesta_id' },
      )
    }
    await finalizar()
    setEnviandoCierre(false)
  }

  async function exportarExcel() {
    setExportando(true)
    try {
      const { exportarAutoevaluacionExcel } = await import('../lib/exportarAutoevaluacion')
      await exportarAutoevaluacionExcel({
        empresa: empresas.find((e) => e.id === empresaId)?.nombre ?? '—',
        sede: sedes.find((s) => s.id === sedeId)?.nombre ?? '—',
        periodicidad: periodicidades.find((p) => p.id === periodicidadId)?.nombre ?? '—',
        lugar,
        fecha,
        servicio: servicioSeleccionado?.nombre ?? '—',
        modalidad: modalidadFiltro.length ? modalidadFiltro.join(', ') : 'Todas',
        complejidad: complejidadFiltro.length ? complejidadFiltro.join(', ') : 'Todas',
        estado,
        pctCumple: avance.pctCumple,
        pctNoCumple: avance.pctNoCumple,
        pctNoAplica: avance.pctNoAplica,
        diligenciados: avance.diligenciados,
        total: avance.total,
        grupos: grupos.map((g) => ({
          estandar: g.clave,
          items: g.items.map((c) => ({
            numeroMostrado: `${c.numeral_servicio}.${c.item ?? c.numero}`,
            criterio: c.criterio,
            respuesta: respuestas[c.id]?.respuesta ?? null,
            observacion: respuestas[c.id]?.observacion ?? '',
          })),
        })),
        logoUrl: `${import.meta.env.BASE_URL}images/logo_cacsb2.png`,
      })
    } finally {
      setExportando(false)
    }
  }

  if (cargandoInicial) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (paso === 'resolucion') {
    return (
      <div>
        <PageHeader titulo="Nueva auto-evaluación" />
        <Card className="mx-auto max-w-3xl p-4">
          <p className="mb-3 text-xs text-slate-600">¿Con cuál resolución deseas trabajar esta auto-evaluación?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RESOLUCION_KEYS.map((key) => {
              const cfg = RESOLUCIONES[key]
              return (
                <button
                  key={key}
                  onClick={() => seleccionarResolucion(key)}
                  className="group relative flex h-48 flex-col justify-end overflow-hidden rounded-xl border-2 border-slate-200 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-azul hover:shadow-lg"
                >
                  {cfg.banner && (
                    <img
                      src={`${import.meta.env.BASE_URL}${cfg.banner}`}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-left transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-azul via-azul/25 to-transparent" />
                  <div className="relative p-4">
                    <span className="block text-lg font-bold text-white drop-shadow-sm">{cfg.labelCorto}</span>
                    <span className="block text-xs text-white/85 drop-shadow-sm">{cfg.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Boton variante="secundario" onClick={() => navigate('/')}>
              Cancelar
            </Boton>
          </div>
        </Card>
      </div>
    )
  }

  if (paso === 'cabecera') {
    const cfgSeleccionada = resolucion ? RESOLUCIONES[resolucion] : null
    return (
      <div>
        <PageHeader titulo={`Nueva auto-evaluación — ${cfgSeleccionada?.labelCorto ?? ''}`} />
        <Card className="mx-auto max-w-2xl p-4">
          {/* En la pantalla de selección de resolución las imágenes ya
              cumplieron su función (identificar visualmente cada
              resolución) — acá, antes del formulario, se reemplazan por un
              encabezado compacto con el nombre de la resolución en texto
              (pedido 2026-09-02), para no ocupar tanto espacio vertical
              antes de los campos. */}
          <div className="mb-3 rounded-xl bg-gradient-to-r from-azul to-azul2 px-5 py-4 shadow-md">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              CAC Santa Bárbara · Auto-evaluación
            </div>
            <div className="text-xl font-extrabold uppercase tracking-tight text-white">
              {cfgSeleccionada?.label}
            </div>
          </div>
          <button
            onClick={() => setPaso('resolucion')}
            className="mb-2 text-xs font-medium text-azul2 hover:underline"
          >
            ‹ Cambiar resolución
          </button>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Campo label="Empresa">
              <select
                value={empresaId ?? ''}
                onChange={(e) => setEmpresaId(Number(e.target.value))}
                className="campo py-1.5"
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Sede">
              <select value={sedeId ?? ''} onChange={(e) => setSedeId(Number(e.target.value))} className="campo py-1.5">
                <option value="">Selecciona…</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Periodicidad">
              <select
                value={periodicidadId ?? ''}
                onChange={(e) => setPeriodicidadId(Number(e.target.value))}
                className="campo py-1.5"
              >
                <option value="">Selecciona…</option>
                {periodicidades.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Lugar">
              <input value={lugar} onChange={(e) => setLugar(e.target.value)} className="campo py-1.5" />
            </Campo>
            <Campo label="Fecha inicio">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="campo py-1.5" />
            </Campo>
            {/* Servicio al lado de Fecha inicio (pedido 2026-09-02, punto 1) en
                vez de fila propia a ancho completo — evita scroll vertical
                extra en el formulario de cabecera. */}
            <Campo label="Servicio">
              <select
                value={servicioResId ?? ''}
                onChange={(e) => alSeleccionarServicio(Number(e.target.value))}
                className="campo py-1.5"
              >
                <option value="">Selecciona…</option>
                {serviciosRes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            {servicioSeleccionado && (
              <Campo label="Grupo" className="sm:col-span-2">
                <div className="campo bg-slate-50 py-1.5 text-slate-500">
                  {servicioSeleccionado.grupo?.nombre ?? '—'}
                </div>
              </Campo>
            )}
            <Campo label="Modalidad" className="sm:col-span-2">
              <SelectorMultiple opciones={modalidades} seleccionados={modalidadFiltro} onCambiar={setModalidadFiltro} />
            </Campo>
            <Campo label="Complejidad" className="sm:col-span-2">
              <SelectorMultiple opciones={complejidades} seleccionados={complejidadFiltro} onCambiar={setComplejidadFiltro} />
            </Campo>
          </div>
          <div className="mt-4 flex gap-2">
            <Boton variante="secundario" onClick={() => navigate('/')} className="flex-1">
              Cancelar
            </Boton>
            <Boton
              onClick={iniciar}
              disabled={!empresaId || !sedeId || !periodicidadId || !servicioResId || verificandoDuplicado}
              className="flex-1"
            >
              {verificandoDuplicado ? 'Verificando…' : 'Continuar'}
            </Boton>
          </div>
        </Card>

        <Modal
          open={!!duplicado}
          onClose={() => setDuplicado(null)}
          titulo={duplicado?.estado === 'borrador' ? 'Ya existe un borrador' : 'Ya existe una auto-evaluación finalizada'}
        >
          {duplicado?.estado === 'borrador' ? (
            <>
              <p className="mb-4 text-xs text-slate-600">
                Ya hay un borrador (del {duplicado.fecha}) para este mismo Servicio, Sede y Empresa. ¿Deseas
                continuarlo, o eliminarlo y empezar uno nuevo?
              </p>
              <div className="flex flex-col gap-2">
                <Boton onClick={() => navigate(`/nueva/${duplicado.id}`)} className="w-full">
                  Continuar el borrador existente
                </Boton>
                <Boton variante="peligro" onClick={eliminarDuplicadoYCrearNueva} className="w-full">
                  Eliminarlo y crear una nueva
                </Boton>
                <Boton variante="secundario" onClick={() => setDuplicado(null)} className="w-full">
                  Cancelar
                </Boton>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-xs text-slate-600">
                Ya existe una auto-evaluación finalizada (del {duplicado?.fecha}) para este mismo Servicio, Sede y
                Empresa.
              </p>
              <div className="flex flex-col gap-2">
                <Boton onClick={() => navigate(`/nueva/${duplicado?.id}`)} className="w-full">
                  Ver la existente
                </Boton>
                <Boton onClick={crearAutoevaluacion} className="w-full">
                  Crear una nueva de todas formas
                </Boton>
                <Boton
                  variante="peligro"
                  onClick={() => duplicado && eliminarDuplicadoYCrearNueva()}
                  className="w-full"
                >
                  Eliminarla y crear una nueva
                </Boton>
                <Boton variante="secundario" onClick={() => setDuplicado(null)} className="w-full">
                  Cancelar
                </Boton>
              </div>
            </>
          )}
        </Modal>
      </div>
    )
  }

  if (paso === 'cierre') {
    return (
      <div>
        <PageHeader titulo={`Plan de acción — ${servicioSeleccionado?.nombre ?? ''}`} />
        <Card className="mx-auto max-w-2xl">
          <p className="mb-4 text-xs text-slate-600">
            Se encontraron {noCumpleSinCompromiso.length} criterios "No Cumple". Registra una actividad por cada uno
            para poder finalizar.
          </p>
          <div className="flex flex-col gap-5">
            {noCumpleSinCompromiso.map((nc) => {
              const c = compromisos[nc.respuestaId]
              return (
                <div key={nc.respuestaId} className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                  <div className="mb-2 text-xs font-medium text-slate-700">
                    {nc.criterio?.numero}. {nc.criterio?.criterio.slice(0, 160)}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Campo label="Actividad" className="sm:col-span-2">
                      <textarea
                        value={c?.descripcion_actividad ?? ''}
                        onChange={(e) =>
                          setCompromisos((prev) => ({
                            ...prev,
                            [nc.respuestaId]: { ...prev[nc.respuestaId], descripcion_actividad: e.target.value },
                          }))
                        }
                        className="campo"
                        rows={2}
                      />
                    </Campo>
                    <Campo label="Responsable">
                      <input
                        value={c?.responsable ?? ''}
                        onChange={(e) =>
                          setCompromisos((prev) => ({
                            ...prev,
                            [nc.respuestaId]: { ...prev[nc.respuestaId], responsable: e.target.value },
                          }))
                        }
                        className="campo"
                      />
                    </Campo>
                    <Campo label="Fecha compromiso">
                      <input
                        type="date"
                        value={c?.fecha_compromiso ?? ''}
                        onChange={(e) =>
                          setCompromisos((prev) => ({
                            ...prev,
                            [nc.respuestaId]: { ...prev[nc.respuestaId], fecha_compromiso: e.target.value },
                          }))
                        }
                        className="campo"
                      />
                    </Campo>
                    <Campo label="Soporte PDF (opcional)" className="sm:col-span-2">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) =>
                          setCompromisos((prev) => ({
                            ...prev,
                            [nc.respuestaId]: { ...prev[nc.respuestaId], archivo: e.target.files?.[0] },
                          }))
                        }
                        className="campo"
                      />
                    </Campo>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 flex gap-2">
            <Boton variante="secundario" onClick={() => setPaso('responder')}>
              Volver
            </Boton>
            <Boton onClick={guardarCompromisosYFinalizar} disabled={enviandoCierre} className="flex-1">
              {enviandoCierre ? 'Guardando…' : 'Finalizar auto-evaluación'}
            </Boton>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Título de la resolución que se está gestionando (pedido
          2026-09-02, punto 1) — antes, al entrar a diligenciar, no había
          ninguna indicación de con cuál de las 3 resoluciones se estaba
          trabajando. */}
      <PageHeader titulo={resolucion ? RESOLUCIONES[resolucion].label : 'Auto-evaluación'} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          onClick={() => (estado === 'borrador' ? setConfirmarSalir(true) : navigate('/'))}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-azul"
        >
          <ArrowLeft size={16} /> {estado === 'borrador' ? 'Salir' : 'Volver al dashboard'}
        </button>
        <button
          onClick={exportarExcel}
          disabled={exportando || criterios.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown size={15} />
          {exportando ? 'Exportando…' : 'Exportar Excel'}
        </button>
      </div>

      <Modal open={confirmarSalir} onClose={() => setConfirmarSalir(false)} titulo="Salir de la auto-evaluación">
        <p className="mb-4 text-xs text-slate-600">
          Tu progreso ({avance.diligenciados}/{avance.total} criterios) ya está guardado como{' '}
          <strong>borrador</strong>. Puedes continuarlo más tarde desde el Dashboard o Auto-Evaluaciones.
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setConfirmarSalir(false)} className="flex-1">
            Seguir diligenciando
          </Boton>
          <Boton onClick={() => navigate('/')} className="flex-1">
            Salir y guardar borrador
          </Boton>
        </div>
      </Modal>

      {/* Layout de 2 columnas (pedido 2026-09-02, punto 1): antes este panel
          era una barra horizontal sticky que tapaba las preguntas al hacer
          scroll. Ahora es una barra lateral DERECHA (sticky por posición, no
          por superposición) — el listado de preguntas nunca queda debajo. */}
      <div className="flex flex-col items-start gap-3 lg:flex-row">
        <div className="min-w-0 flex-1">
          {cargandoCriterios ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {grupos.map((g) => {
            const colapsado = !!gruposColapsados[g.clave]
            const color = colorDeEstandar(g.clave)
            const diligenciados = g.items.filter((c) => !!respuestas[c.id]?.respuesta).length
            const pendientes = g.items.length - diligenciados
            const filtro = filtroGrupo[g.clave] ?? 'todos'
            const filtroServicio = filtroServicioGrupo[g.clave] ?? 'todos'
            return (
              <div key={g.clave} id={`grupo-${g.numero}`} className="scroll-mt-24">
                <div
                  className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border-l-4 ${color.borde} ${color.fondo} px-2.5 py-1.5`}
                >
                  <button onClick={() => alternarGrupo(g.clave)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className={`rounded ${color.badge} px-2 py-0.5 text-xs font-bold text-white`}>
                      {g.numero}
                    </span>
                    <span className={`truncate text-xs font-semibold ${color.texto}`}>{g.clave}</span>
                    <span className="hidden shrink-0 items-center gap-2 text-xs text-slate-500 sm:flex">
                      <span title="Total de preguntas">{g.items.length} preguntas</span>
                      <span className="text-emerald-600" title="Diligenciadas">
                        {diligenciados} diligenciadas
                      </span>
                      <span className="text-amber-600" title="Pendientes">
                        {pendientes} pendientes
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{colapsado ? 'Expandir' : 'Contraer'}</span>
                  </button>
                  {!colapsado && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {/* Sin concepto de "universal" (ej. ISO 9001) todos los
                          criterios son siempre "propio" — el filtro no
                          aportaría nada, se omite en vez de mostrar un chip
                          que nunca trae resultados. */}
                      {resolucion && RESOLUCIONES[resolucion].tieneUniversal !== false && (
                        <FiltroServicio
                          valor={filtroServicio}
                          labelUniversal={RESOLUCIONES[resolucion].labelUniversal}
                          onCambiar={(f) => setFiltroServicioGrupo((prev) => ({ ...prev, [g.clave]: f }))}
                        />
                      )}
                      <FiltroRespuestas
                        valor={filtro}
                        onCambiar={(f) => setFiltroGrupo((prev) => ({ ...prev, [g.clave]: f }))}
                      />
                    </div>
                  )}
                </div>
                {!colapsado && (
                  <div className="mx-auto mt-1.5 flex max-w-4xl flex-col gap-2 pl-2">
                    {g.subgrupos.map((sub) => {
                      if (filtroServicio === 'universal' && !sub.esUniversal) return null
                      if (filtroServicio === 'propio' && sub.esUniversal) return null
                      const itemsFiltrados = filtrarItems(sub.items, filtro)
                      if (itemsFiltrados.length === 0) return null
                      const colorSub = sub.esUniversal ? COLOR_UNIVERSAL : COLOR_PROPIO
                      return (
                        <div key={sub.numeral} className={`flex flex-col gap-2 rounded-lg p-2 ${colorSub.fondo}`}>
                          <div className="flex items-center gap-2 pl-1">
                            <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white ${colorSub.badge}`}>
                              {sub.numeral}
                            </span>
                            <span className={`text-[11px] font-semibold ${colorSub.texto}`}>
                              {sub.esUniversal
                                ? `${resolucion ? RESOLUCIONES[resolucion].labelUniversal : ''} · Todo los servicios`
                                : `Propio de ${servicioSeleccionado?.nombre ?? 'este servicio'}`}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              {itemsFiltrados.length} de {sub.items.length}
                            </span>
                          </div>
                          {itemsFiltrados.map((c) => (
                            <FilaCriterio
                              key={c.id}
                              criterio={c}
                              color={color}
                              colorOrigen={colorSub}
                              respuesta={respuestas[c.id]}
                              soloLectura={estado === 'finalizada'}
                              guardando={guardando === c.id}
                              onResponder={(r) => responder(c.id, r)}
                              onObservacion={(obs) => guardarObservacion(c.id, obs)}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
                )
              })}
            </div>
          )}

          {estado !== 'finalizada' && (
            <div className="mt-6 flex justify-end">
              <Boton onClick={alIntentarFinalizar}>Finalizar auto-evaluación</Boton>
            </div>
          )}
        </div>

        {/* Barra lateral: Servicio/filtros, Descripción, Avance y
            Agrupadores apilados — sticky por posición (no se superpone al
            listado, solo se queda fija dentro de su propia columna). */}
        <aside className="w-full shrink-0 lg:sticky lg:top-3 lg:w-72">
          <div className="rounded-xl border-2 border-azul/15 bg-gradient-to-br from-sky-50 to-blue-50 p-3 shadow-lg shadow-azul/10">
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-azul">{servicioSeleccionado?.nombre}</div>
              {estado === 'finalizada' && (
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  Finalizada
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-3 border-t border-azul/10 pt-3">
              <AnilloAvance avance={avance} />
              <div className="text-xs leading-tight">
                <div className="font-medium text-slate-600">
                  {avance.diligenciados}/{avance.total}
                </div>
                <div className="text-emerald-600">✔ {avance.pctCumple}%</div>
                <div className="text-red-600">✘ {avance.pctNoCumple}%</div>
                <div className="text-slate-500">⊘ {avance.pctNoAplica}%</div>
              </div>
            </div>

            {/* Filtros seleccionados: dónde se hizo (Empresa/Sede/Lugar) y
                cuándo/criterios (Fecha inicio/Periodicidad/Modalidad/
                Complejidad) — siempre las mismas 7 filas cortas, sin scroll. */}
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 text-[11px]">
              <FilaEtiqueta etiqueta="Empresa" valor={empresas.find((e) => e.id === empresaId)?.nombre ?? '—'} tono="bg-sky-50" />
              <FilaEtiqueta etiqueta="Sede" valor={sedes.find((s) => s.id === sedeId)?.nombre ?? '—'} tono="bg-sky-50/60" />
              <FilaEtiqueta etiqueta="Lugar" valor={lugar || 'Sin lugar'} tono="bg-sky-50" />
              <FilaEtiqueta etiqueta="Fecha inicio" valor={fecha} tono="bg-amber-50" />
              <FilaEtiqueta
                etiqueta="Periodicidad"
                valor={periodicidades.find((p) => p.id === periodicidadId)?.nombre ?? '—'}
                tono="bg-amber-50/60"
              />
              <FilaEtiqueta etiqueta="Modalidad" valor={modalidadFiltro.length ? modalidadFiltro.join(', ') : 'Todas'} tono="bg-amber-50" />
              <FilaEtiqueta etiqueta="Complejidad" valor={complejidadFiltro.length ? complejidadFiltro.join(', ') : 'Todas'} tono="bg-amber-50/60" />
            </div>

            <div className="mt-3 border-t border-azul/10 pt-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Descripción del servicio
              </span>
              {servicioSeleccionado?.descripcion || servicioSeleccionado?.estructura ? (
                <div className="max-h-60 overflow-y-auto rounded-lg bg-white/60 p-1.5 pr-2 text-xs leading-relaxed text-slate-600">
                  {servicioSeleccionado?.descripcion && <p>{servicioSeleccionado.descripcion}</p>}
                  {servicioSeleccionado?.estructura && <p className="mt-1 text-slate-500">{servicioSeleccionado.estructura}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sin descripción.</p>
              )}
            </div>

            <div className="mt-3 border-t border-azul/10 pt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agrupadores</span>
                <div className="flex gap-2">
                  <button onClick={expandirTodo} title="Expandir todo" className="text-[11px] font-medium text-azul2 hover:underline">
                    Expandir
                  </button>
                  <button onClick={contraerTodo} title="Contraer todo" className="text-[11px] font-medium text-azul2 hover:underline">
                    Contraer
                  </button>
                </div>
              </div>
              <div className="grid max-h-60 grid-cols-1 gap-1 overflow-y-auto pr-1">
                {grupos.map((g) => {
                  const color = colorDeEstandar(g.clave)
                  return (
                    <button
                      key={g.clave}
                      onClick={() => irAGrupo(g.clave, g.numero)}
                      className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-medium ${color.fondo} ${color.texto} hover:opacity-75`}
                      title={g.clave}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${color.badge} text-[9px] font-bold text-white`}>
                        {g.numero}
                      </span>
                      <span className="truncate">{g.clave.replace('Estándar de ', '')}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function FiltroServicio({
  valor,
  labelUniversal,
  onCambiar,
}: {
  valor: FiltroServicioValor
  labelUniversal: string
  onCambiar: (f: FiltroServicioValor) => void
}) {
  const opciones: { valor: FiltroServicioValor; label: string; activo: string }[] = [
    { valor: 'todos', label: 'Todos', activo: 'bg-slate-700 text-white' },
    { valor: 'universal', label: `${labelUniversal} · Todo los servicios`, activo: COLOR_UNIVERSAL.badge + ' text-white' },
    { valor: 'propio', label: 'Propio del servicio', activo: COLOR_PROPIO.badge + ' text-white' },
  ]
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-slate-500">Servicio:</span>
      {opciones.map((o) => (
        <button
          key={o.valor}
          onClick={(e) => {
            e.stopPropagation()
            onCambiar(o.valor)
          }}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            valor === o.valor ? o.activo : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function FiltroRespuestas({
  valor,
  onCambiar,
}: {
  valor: FiltroRespuestaValor
  onCambiar: (f: FiltroRespuestaValor) => void
}) {
  const opciones: { valor: FiltroRespuestaValor; label: string; activo: string }[] = [
    { valor: 'todos', label: 'Todos', activo: 'bg-slate-700 text-white' },
    { valor: 'cumple', label: 'Cumple', activo: 'bg-emerald-600 text-white' },
    { valor: 'no_cumple', label: 'No Cumple', activo: 'bg-red-600 text-white' },
    { valor: 'no_aplica', label: 'No Aplica', activo: 'bg-slate-500 text-white' },
    { valor: 'pendiente', label: 'Pendiente', activo: 'bg-amber-500 text-white' },
  ]
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-slate-500">Ver:</span>
      {opciones.map((o) => (
        <button
          key={o.valor}
          onClick={(e) => {
            e.stopPropagation()
            onCambiar(o.valor)
          }}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            valor === o.valor ? o.activo : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Algunos criterios (p. ej. ISO 9001) traen el texto principal seguido de
// "NOTA:" y varias "[NOTA n]" pegadas en el mismo párrafo. Se separan en
// párrafos propios para que el evaluador las distinga de un vistazo.
function renderCriterioTexto(texto: string) {
  const partes = texto
    .split(/(?=NOTA:)|(?=\[NOTA\s*\d+\])/)
    .map((parte) => parte.trim())
    .filter(Boolean)

  if (partes.length <= 1) return <p>{texto}</p>

  return partes.map((parte, i) => <p key={i}>{parte}</p>)
}

function FilaCriterio({
  criterio,
  color,
  colorOrigen,
  respuesta,
  soloLectura,
  guardando,
  onResponder,
  onObservacion,
}: {
  criterio: Criterio
  color: { borde: string; fondo: string; texto: string; badge: string }
  colorOrigen: { badge: string; texto: string; fondo: string; fondoItem: string }
  respuesta?: RespuestaLocal
  soloLectura: boolean
  guardando: boolean
  onResponder: (r: Respuesta) => void
  onObservacion: (obs: string) => void
}) {
  const botones: { valor: Respuesta; icono: ReactNode; activo: string; label: string }[] = [
    { valor: 'cumple', icono: <Check size={14} />, activo: 'border-emerald-600 bg-emerald-600 text-white', label: 'Cumple' },
    { valor: 'no_cumple', icono: <X size={14} />, activo: 'border-red-600 bg-red-600 text-white', label: 'No Cumple' },
    { valor: 'no_aplica', icono: <MinusCircle size={14} />, activo: 'border-slate-500 bg-slate-500 text-white', label: 'No Aplica' },
  ]
  // Sin responder: se tiñe con el color de origen (universal/propio) para que
  // se note incluso antes de contestar. Ya respondido: el color de la
  // respuesta manda (más útil para revisar el avance).
  const tintFondo =
    respuesta?.respuesta === 'cumple'
      ? 'bg-emerald-50/60'
      : respuesta?.respuesta === 'no_cumple'
        ? 'bg-red-50/50'
        : respuesta?.respuesta === 'no_aplica'
          ? 'bg-slate-50'
          : colorOrigen.fondoItem

  return (
    <div className={`rounded-xl border border-slate-300 ${tintFondo} p-2.5 shadow-sm transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-5 shrink-0 items-center justify-center rounded-md px-1.5 text-[11px] font-bold tabular-nums text-white ${color.badge}`}
        >
          {/* Si el Item ya trae el Numeral Servicio como prefijo (caso
              ISO 9001, ej. "8.2.1 a)"), no se repite (evitar "8.8.2.1 a)"). */}
          {criterio.item && criterio.item.startsWith(`${criterio.numeral_servicio}.`)
            ? criterio.item
            : `${criterio.numeral_servicio}.${criterio.item ?? criterio.numero}`}
        </span>
        <div className="flex-1 space-y-2 text-xs leading-relaxed text-slate-700">{renderCriterioTexto(criterio.criterio)}</div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        {guardando && <Loader2 size={14} className="animate-spin text-slate-400" />}
        <div className="flex shrink-0 items-center gap-1.5">
          {botones.map((b) => (
            <button
              key={b.valor}
              disabled={soloLectura}
              onClick={() => onResponder(b.valor)}
              title={b.label}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                respuesta?.respuesta === b.valor
                  ? b.activo
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {b.icono}
              {b.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Observación (opcional)"
          disabled={soloLectura}
          defaultValue={respuesta?.observacion ?? ''}
          onBlur={(e) => onObservacion(e.target.value)}
          className="campo min-w-[180px] flex-1"
        />
      </div>
    </div>
  )
}

// Anillo de progreso: un segmento por cada tipo de respuesta, proporcional
// al % sobre el total de criterios (el resto del aro queda gris = pendiente).
function AnilloAvance({ avance }: { avance: Avance }) {
  const size = 56
  const grosor = 7
  const radio = (size - grosor) / 2
  const circunferencia = 2 * Math.PI * radio
  const segmentos = [
    { pct: avance.pctCumple, color: '#059669' },
    { pct: avance.pctNoCumple, color: '#dc2626' },
    { pct: avance.pctNoAplica, color: '#64748b' },
  ]
  let acumulado = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radio} stroke="#e2e8f0" strokeWidth={grosor} fill="none" />
        {segmentos.map((s, i) => {
          if (s.pct <= 0) return null
          const largo = (s.pct / 100) * circunferencia
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radio}
              stroke={s.color}
              strokeWidth={grosor}
              fill="none"
              strokeDasharray={`${largo} ${circunferencia - largo}`}
              strokeDashoffset={-acumulado}
            />
          )
          acumulado += largo
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-azul">
        {avance.pctCumple}%
      </div>
    </div>
  )
}

// Fila etiqueta:valor para los filtros seleccionados en la cabecera —
// patrón de fila con fondo de color tomado de PanelResumen (permisos_tthh).
function FilaEtiqueta({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono: string }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-2.5 py-1 ${tono}`}>
      <span className="shrink-0 text-slate-500">{etiqueta}</span>
      <span className="min-w-0 truncate font-medium text-slate-700" title={valor}>
        {valor}
      </span>
    </div>
  )
}

function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-xs ${className}`}>
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

