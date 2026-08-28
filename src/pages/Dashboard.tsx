import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, ClipboardX, CircleSlash, FileClock } from 'lucide-react'
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
import { Boton, Card, MetricCard, PageHeader, Spinner } from '../components/ui/ui'

type ResumenAutoevaluacion = {
  id: string
  fecha: string
  estado: 'borrador' | 'finalizada'
  servicio_res1732: { nombre: string } | null
  usuario: { nombre: string } | null
}

type Resumen = {
  totalCumple: number
  totalNoCumple: number
  totalNoAplica: number
  borradores: number
  recientes: ResumenAutoevaluacion[]
}

type Sede = { id: number; nombre: string }
type GrupoLite = { id: number; nombre: string }
type CriterioLite = { estandar: string; complejidad: string; grupo_res1732_id: number }
type ServicioPorGrupo = { grupo: string; cantidad: number; color: string }

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

  useEffect(() => {
    supabase
      .from('sedes')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => setSedes((data as Sede[]) ?? []))
    cargarGraficas()
  }, [])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeFiltro])

  // El proyecto de Supabase tiene un tope de 1.000 filas por consulta
  // (db-max-rows), que un Range header del cliente no puede superar — hay
  // que paginar en varias vueltas para traer los 3.557 criterios completos.
  async function traerTodosLosCriterios() {
    const TAMANO_PAGINA = 1000
    const todas: CriterioLite[] = []
    for (let desde = 0; ; desde += TAMANO_PAGINA) {
      const { data } = await supabase
        .from('criterios_res1732')
        .select('estandar, complejidad, grupo_res1732_id')
        .range(desde, desde + TAMANO_PAGINA - 1)
      const filas = (data as CriterioLite[]) ?? []
      todas.push(...filas)
      if (filas.length < TAMANO_PAGINA) break
    }
    return todas
  }

  async function cargarGraficas() {
    setCargandoGraficas(true)
    const [{ data: serviciosData }, { data: gruposData }, criteriosData] = await Promise.all([
      supabase
        .from('servicios_res1732')
        .select('grupo_res1732:grupos_res1732(nombre)')
        .neq('numeral', '5'),
      supabase.from('grupos_res1732').select('id, nombre').neq('numeral', '5').order('nombre'),
      traerTodosLosCriterios(),
    ])

    const conteoGrupo = new Map<string, number>()
    for (const s of (serviciosData as unknown as { grupo_res1732: { nombre: string } | null }[]) ?? []) {
      const nombre = s.grupo_res1732?.nombre ?? 'Sin grupo'
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
      // Las respuestas no traen sede_id directo — se filtra a través del
      // join a autoevaluaciones (!inner obliga la coincidencia y habilita
      // filtrar por autoevaluaciones.sede_id desde acá).
      const conteoRespuesta = (respuesta: string) => {
        let q = supabase
          .from('autoevaluaciones_respuestas')
          .select('id, autoevaluaciones!inner(sede_id)', { count: 'exact', head: true })
          .eq('respuesta', respuesta)
        if (sedeFiltro) q = q.eq('autoevaluaciones.sede_id', sedeFiltro)
        return q
      }
      let borradoresQuery = supabase
        .from('autoevaluaciones')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'borrador')
      if (sedeFiltro) borradoresQuery = borradoresQuery.eq('sede_id', sedeFiltro)

      let recientesQuery = supabase
        .from('autoevaluaciones')
        .select('id, fecha, estado, servicio_res1732:servicios_res1732(nombre), usuario:profiles(nombre)')
        .order('creado_en', { ascending: false })
        .limit(6)
      if (sedeFiltro) recientesQuery = recientesQuery.eq('sede_id', sedeFiltro)

      const [{ count: cumple }, { count: noCumple }, { count: noAplica }, { count: borradores }, { data: recientes }] =
        await Promise.all([conteoRespuesta('cumple'), conteoRespuesta('no_cumple'), conteoRespuesta('no_aplica'), borradoresQuery, recientesQuery])

      setResumen({
        totalCumple: cumple ?? 0,
        totalNoCumple: noCumple ?? 0,
        totalNoAplica: noAplica ?? 0,
        borradores: borradores ?? 0,
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
    () => (grupoFiltroChart ? criteriosLite.filter((c) => c.grupo_res1732_id === grupoFiltroChart) : criteriosLite),
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
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          <Card className="mb-4 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Últimas auto-evaluaciones</h2>
            {!resumen?.recientes.length ? (
              <p className="py-4 text-center text-sm text-slate-400">
                Todavía no hay auto-evaluaciones registradas{sedeFiltro ? ' para esta sede' : ''}.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {resumen.recientes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/nueva/${r.id}`)}
                    className="flex w-full items-center justify-between py-1.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-700">
                      {r.servicio_res1732?.nombre ?? 'Servicio sin definir'}
                    </span>
                    <span className="text-slate-500">{r.usuario?.nombre ?? '—'}</span>
                    <span className={r.estado === 'borrador' ? 'text-amber-600' : 'text-emerald-600'}>
                      {r.estado === 'borrador' ? 'Borrador' : 'Finalizada'}
                    </span>
                    <span className="text-slate-400">{r.fecha}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Gráficas del catálogo Res.1732 — independientes de la Sede (son
              metadatos del catálogo, no datos de auto-evaluaciones). El
              filtro de Grupo acota Estándar/Complejidad en vivo. */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-azul">Catálogo Res.1732 en cifras</h2>
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
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-x-0 top-[68px] flex flex-col items-center">
                    <span className="text-xl font-bold text-azul">{criteriosFiltrados.length}</span>
                    <span className="text-[10px] text-slate-400">criterios</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
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
