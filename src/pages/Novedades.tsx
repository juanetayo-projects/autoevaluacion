import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  X,
  MinusCircle,
  Loader2,
  Paperclip,
  ChevronRight,
  Building2,
  BedDouble,
  Armchair,
  ClipboardList,
  Ambulance,
  Car,
  Trash2,
  FileText,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Badge, Boton, Card, PageHeader, Spinner, VisorArchivo, type ArchivoVisor } from '../components/ui/ui'
import { RESOLUCIONES, type ResolucionKey } from '../domain/resoluciones'

// Checklist del módulo "Novedades" (Res.3100, cap. 10.5 Trámite de
// Novedades) para UNA habilitación concreta (creada al hacer clic en
// "Habilitar" desde Auto-Evaluaciones). Muestra el catálogo sembrado en
// novedades_res3100_catalogo (Tablas No. 3 a 6): primero se elige una
// sección (por novedad del servicio o por numeral de tabla) en un tablero
// de tarjetas, y solo entonces se listan sus requisitos con
// cumple/no_cumple/no_aplica + comentario + evidencia documental propia,
// con un panel de detalle lateral para el requisito activo (pedido
// 2026-09-03, sobre referencia visual del cliente).

type Respuesta = 'cumple' | 'no_cumple' | 'no_aplica'
type ModoVisualizacion = 'item' | 'novedad'
type Orden = 'numeral' | 'alfabetico'

type CatalogoItem = {
  id: number
  tabla_no: number
  tabla_descripcion: string
  novedad_orden: number
  novedad: string
  item_no: number
  requisito: string
  nota: string | null
  pagina: number | null
  orden: number
}

type RespuestaLocal = { respuesta: Respuesta | null; comentario: string | null }

type Adjunto = { id: number; nombre_archivo: string; ruta: string; url?: string }

type Evidencia = { id: number; catalogo_id: number; nombre_archivo: string; ruta: string; tamano_bytes: number | null; url?: string }

type Habilitacion = {
  id: string
  autoevaluacion_id: string
  fecha_inicio: string
  fecha_final: string
  auditores: string[]
  evaluados: string[]
  observaciones: string | null
  modo_visualizacion: ModoVisualizacion
  autoevaluacion: {
    fecha: string
    resolucion: ResolucionKey
    servicio_res1732: { nombre: string } | null
    servicio_res3100: { nombre: string } | null
    servicio_iso9001: { nombre: string } | null
    sede: { nombre: string } | null
    usuario: { nombre: string } | null
  } | null
}

// Grupo por novedad (una tarjeta por novedad del servicio, ej. "Cierre de sede").
type GrupoNovedad = {
  key: string
  tabla_no: number
  tabla_descripcion: string
  novedad: string
  items: CatalogoItem[]
}

// Grupo por tabla (una tarjeta por Tabla No. 3-6, con todas sus novedades adentro).
type GrupoTabla = {
  tabla_no: number
  tabla_descripcion: string
  novedades: GrupoNovedad[]
  items: CatalogoItem[]
}

const ICONOS_SECCION = [Building2, BedDouble, Armchair, ClipboardList, Ambulance, Car]
const COLORES_SECCION = [
  { fondo: 'bg-violet-100', texto: 'text-violet-600', anillo: '#7c3aed' },
  { fondo: 'bg-emerald-100', texto: 'text-emerald-600', anillo: '#059669' },
  { fondo: 'bg-amber-100', texto: 'text-amber-600', anillo: '#d97706' },
  { fondo: 'bg-sky-100', texto: 'text-sky-600', anillo: '#0284c7' },
]

function nombreServicio(h: Habilitacion) {
  const a = h.autoevaluacion
  if (!a) return '—'
  const servicio =
    a.resolucion === 'res3100' ? a.servicio_res3100 : a.resolucion === 'iso9001' ? a.servicio_iso9001 : a.servicio_res1732
  return servicio?.nombre ?? '—'
}

function pctRespondido(items: CatalogoItem[], respuestas: Record<number, RespuestaLocal>) {
  if (items.length === 0) return 0
  const respondidos = items.filter((it) => respuestas[it.id]?.respuesta).length
  return Math.round((respondidos / items.length) * 100)
}

function formatoTamano(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ESTADO_BADGE: Record<'pendiente' | Respuesta, { label: string; tono: 'neutro' | 'exito' | 'peligro' | 'advertencia' }> = {
  pendiente: { label: 'Pendiente', tono: 'advertencia' },
  cumple: { label: 'Cumple', tono: 'exito' },
  no_cumple: { label: 'No cumple', tono: 'peligro' },
  no_aplica: { label: 'N/A', tono: 'neutro' },
}

export default function Novedades() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [habilitacion, setHabilitacion] = useState<Habilitacion | null>(null)
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaLocal>>({})
  const [guardandoIds, setGuardandoIds] = useState<Set<number>>(new Set())
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [evidencias, setEvidencias] = useState<Record<number, Evidencia[]>>({})
  const [modo, setModo] = useState<ModoVisualizacion>('novedad')
  const [seccion, setSeccion] = useState<string | null>(null)
  const [orden, setOrden] = useState<Orden>('numeral')
  const [itemActivo, setItemActivo] = useState<number | null>(null)
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false)
  const [archivoVisor, setArchivoVisor] = useState<ArchivoVisor | null>(null)

  useEffect(() => {
    if (id) cargar(id)
  }, [id])

  useEffect(() => {
    setSeccion(null)
    setItemActivo(null)
  }, [modo])

  async function cargar(habilitacionId: string) {
    setCargando(true)

    const { data: hab } = await supabase
      .from('habilitaciones_novedades')
      .select(
        'id, autoevaluacion_id, fecha_inicio, fecha_final, auditores, evaluados, observaciones, modo_visualizacion, autoevaluacion:autoevaluaciones(fecha, resolucion, servicio_res1732:servicios_res1732(nombre), servicio_res3100:servicios_res3100(nombre), servicio_iso9001:servicios_iso9001(nombre), sede:sedes(nombre), usuario:profiles(nombre))',
      )
      .eq('id', habilitacionId)
      .single()
    setHabilitacion((hab as unknown as Habilitacion) ?? null)
    if (hab) setModo((hab as unknown as Habilitacion).modo_visualizacion)

    const { data: cat } = await supabase.from('novedades_res3100_catalogo').select('*').eq('activo', true).order('orden')
    setCatalogo((cat as CatalogoItem[]) ?? [])

    const { data: resp } = await supabase
      .from('novedades_respuestas')
      .select('catalogo_id, respuesta, comentario')
      .eq('habilitacion_id', habilitacionId)
    const mapa: Record<number, RespuestaLocal> = {}
    for (const r of (resp as { catalogo_id: number; respuesta: Respuesta | null; comentario: string | null }[]) ?? []) {
      mapa[r.catalogo_id] = { respuesta: r.respuesta, comentario: r.comentario }
    }
    setRespuestas(mapa)

    const { data: adj } = await supabase
      .from('habilitaciones_novedades_adjuntos')
      .select('id, nombre_archivo, ruta')
      .eq('habilitacion_id', habilitacionId)
    const listaAdj = (adj as Adjunto[]) ?? []
    const adjConUrl = await Promise.all(
      listaAdj.map(async (a) => {
        const { data } = await supabase.storage.from('novedades-adjuntos').createSignedUrl(a.ruta, 3600)
        return { ...a, url: data?.signedUrl }
      }),
    )
    setAdjuntos(adjConUrl)

    const { data: evid } = await supabase
      .from('novedades_respuestas_evidencias')
      .select('id, catalogo_id, nombre_archivo, ruta, tamano_bytes')
      .eq('habilitacion_id', habilitacionId)
    const listaEvid = (evid as Evidencia[]) ?? []
    const evidConUrl = await Promise.all(
      listaEvid.map(async (e) => {
        const { data } = await supabase.storage.from('novedades-adjuntos').createSignedUrl(e.ruta, 3600)
        return { ...e, url: data?.signedUrl }
      }),
    )
    const evidPorItem: Record<number, Evidencia[]> = {}
    for (const e of evidConUrl) {
      if (!evidPorItem[e.catalogo_id]) evidPorItem[e.catalogo_id] = []
      evidPorItem[e.catalogo_id].push(e)
    }
    setEvidencias(evidPorItem)

    setCargando(false)
  }

  async function cambiarModo(nuevo: ModoVisualizacion) {
    setModo(nuevo)
    if (habilitacion) await supabase.from('habilitaciones_novedades').update({ modo_visualizacion: nuevo }).eq('id', habilitacion.id)
  }

  async function guardarRespuesta(catalogoId: number, cambios: Partial<RespuestaLocal>) {
    if (!habilitacion) return
    const actual = respuestas[catalogoId] ?? { respuesta: null, comentario: null }
    const nueva = { ...actual, ...cambios }
    setRespuestas((prev) => ({ ...prev, [catalogoId]: nueva }))
    setGuardandoIds((prev) => new Set(prev).add(catalogoId))
    await supabase
      .from('novedades_respuestas')
      .upsert(
        { habilitacion_id: habilitacion.id, catalogo_id: catalogoId, respuesta: nueva.respuesta, comentario: nueva.comentario },
        { onConflict: 'habilitacion_id,catalogo_id' },
      )
    setGuardandoIds((prev) => {
      const s = new Set(prev)
      s.delete(catalogoId)
      return s
    })
  }

  async function subirEvidencias(catalogoId: number, archivos: FileList) {
    if (!habilitacion) return
    setSubiendoEvidencia(true)
    for (const archivo of Array.from(archivos)) {
      const ruta = `${habilitacion.id}/items/${catalogoId}/${Date.now()}-${archivo.name}`
      const { error } = await supabase.storage.from('novedades-adjuntos').upload(ruta, archivo)
      if (error) continue
      const { data: fila } = await supabase
        .from('novedades_respuestas_evidencias')
        .insert({ habilitacion_id: habilitacion.id, catalogo_id: catalogoId, nombre_archivo: archivo.name, ruta, tamano_bytes: archivo.size })
        .select('id, catalogo_id, nombre_archivo, ruta, tamano_bytes')
        .single()
      if (fila) {
        const { data: firmada } = await supabase.storage.from('novedades-adjuntos').createSignedUrl(ruta, 3600)
        setEvidencias((prev) => ({
          ...prev,
          [catalogoId]: [...(prev[catalogoId] ?? []), { ...(fila as Evidencia), url: firmada?.signedUrl }],
        }))
      }
    }
    setSubiendoEvidencia(false)
  }

  async function eliminarEvidencia(evidencia: Evidencia) {
    await supabase.storage.from('novedades-adjuntos').remove([evidencia.ruta])
    await supabase.from('novedades_respuestas_evidencias').delete().eq('id', evidencia.id)
    setEvidencias((prev) => ({
      ...prev,
      [evidencia.catalogo_id]: (prev[evidencia.catalogo_id] ?? []).filter((e) => e.id !== evidencia.id),
    }))
  }

  const gruposNovedad = useMemo<GrupoNovedad[]>(() => {
    const mapa = new Map<string, GrupoNovedad>()
    for (const it of catalogo) {
      const key = `${it.tabla_no}-${it.novedad_orden}`
      if (!mapa.has(key)) {
        mapa.set(key, { key, tabla_no: it.tabla_no, tabla_descripcion: it.tabla_descripcion, novedad: it.novedad, items: [] })
      }
      mapa.get(key)!.items.push(it)
    }
    for (const g of mapa.values()) g.items.sort((a, b) => a.item_no - b.item_no)
    return [...mapa.values()].sort((a, b) => a.novedad.localeCompare(b.novedad, 'es'))
  }, [catalogo])

  const gruposTabla = useMemo<GrupoTabla[]>(() => {
    const mapa = new Map<number, GrupoTabla>()
    for (const g of gruposNovedad) {
      if (!mapa.has(g.tabla_no)) mapa.set(g.tabla_no, { tabla_no: g.tabla_no, tabla_descripcion: g.tabla_descripcion, novedades: [], items: [] })
      const t = mapa.get(g.tabla_no)!
      t.novedades.push(g)
      t.items.push(...g.items)
    }
    return [...mapa.values()].sort((a, b) => a.tabla_no - b.tabla_no)
  }, [gruposNovedad])

  const avance = useMemo(() => {
    let cumple = 0,
      noCumple = 0,
      noAplica = 0
    for (const it of catalogo) {
      const r = respuestas[it.id]?.respuesta
      if (r === 'cumple') cumple++
      else if (r === 'no_cumple') noCumple++
      else if (r === 'no_aplica') noAplica++
    }
    const total = catalogo.length
    return { total, cumple, noCumple, noAplica, pendientes: total - cumple - noCumple - noAplica }
  }, [catalogo, respuestas])

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!habilitacion) {
    return <p className="py-6 text-center text-xs text-slate-400">No se encontró esta habilitación de Novedades.</p>
  }

  const grupoNovedadActivo = modo === 'novedad' ? gruposNovedad.find((g) => g.key === seccion) : undefined
  const grupoTablaActivo = modo === 'item' ? gruposTabla.find((g) => String(g.tabla_no) === seccion) : undefined
  const itemsSeccionActiva = grupoNovedadActivo?.items ?? grupoTablaActivo?.items
  const itemActivoData = itemActivo != null ? catalogo.find((c) => c.id === itemActivo) : undefined

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3">
      <PageHeader
        titulo="Novedades — Resolución 3100, Capítulo 10.5"
        acciones={
          <button
            onClick={() => navigate('/novedades')}
            className="flex items-center gap-1.5 text-xs font-medium text-azul2 hover:underline"
          >
            <ArrowLeft size={14} />
            Volver al histórico
          </button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <Card className="flex-1">
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <Campo etiqueta="Servicio / Sede">
              {nombreServicio(habilitacion)} — {habilitacion.autoevaluacion?.sede?.nombre ?? '—'}
            </Campo>
            <Campo etiqueta="Fechas">
              {habilitacion.fecha_inicio} — {habilitacion.fecha_final}
            </Campo>
            <Campo etiqueta="Resolución">
              {habilitacion.autoevaluacion && <Badge tono="info">{RESOLUCIONES[habilitacion.autoevaluacion.resolucion].labelCorto}</Badge>}
            </Campo>
            <Campo etiqueta="Auditor(es)">{habilitacion.auditores.join(', ') || '—'}</Campo>
            <Campo etiqueta="Persona(s) evaluada(s)">{habilitacion.evaluados.join(', ') || '—'}</Campo>
            <Campo etiqueta="Observaciones">{habilitacion.observaciones || '—'}</Campo>
            <Campo etiqueta="Adjuntos generales">
              {adjuntos.length === 0 ? (
                '—'
              ) : (
                <div className="flex flex-col gap-1">
                  {adjuntos.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setArchivoVisor({ nombre: a.nombre_archivo, url: a.url })}
                      className="flex items-center gap-1 text-left text-azul2 hover:underline"
                    >
                      <Paperclip size={11} className="shrink-0" />
                      <span className="truncate">{a.nombre_archivo}</span>
                    </button>
                  ))}
                </div>
              )}
            </Campo>
          </div>
        </Card>

        <Card className="lg:w-72 lg:shrink-0">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado general</div>
          <div className="flex items-center gap-4">
            <AnilloMultiSegmento
              size={72}
              segmentos={[
                { pct: (avance.cumple / (avance.total || 1)) * 100, color: '#059669' },
                { pct: (avance.noCumple / (avance.total || 1)) * 100, color: '#dc2626' },
                { pct: (avance.noAplica / (avance.total || 1)) * 100, color: '#94a3b8' },
              ]}
              centro={<span className="text-sm font-bold text-slate-700">{Math.round(((avance.total - avance.pendientes) / (avance.total || 1)) * 100)}%</span>}
            />
            <div className="flex flex-col gap-1 text-xs">
              <Leyenda color="#059669" label="Cumple" valor={avance.cumple} />
              <Leyenda color="#dc2626" label="No cumple" valor={avance.noCumple} />
              <Leyenda color="#94a3b8" label="No aplica" valor={avance.noAplica} />
              <Leyenda color="#d97706" label="Pendientes" valor={avance.pendientes} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <label className="text-xs">
          <span className="mb-1 block font-medium text-slate-600">Buscar por</span>
          <select value={modo} onChange={(e) => cambiarModo(e.target.value as ModoVisualizacion)} className="campo max-w-xs">
            <option value="novedad">Novedad del servicio</option>
            <option value="item">Numeral de la tabla</option>
          </select>
        </label>
      </Card>

      {modo === 'novedad' && !grupoNovedadActivo && (
        <>
          <h2 className="text-sm font-semibold text-azul">Secciones del trámite</h2>
          <TableroSecciones
            items={gruposNovedad.map((g, i) => ({
              key: g.key,
              titulo: g.novedad,
              subtitulo: `Tabla No. ${g.tabla_no}`,
              detalle: `${g.items.length} requisito${g.items.length === 1 ? '' : 's'}`,
              pct: pctRespondido(g.items, respuestas),
              icono: ICONOS_SECCION[i % ICONOS_SECCION.length],
              color: COLORES_SECCION[i % COLORES_SECCION.length],
            }))}
            onSeleccionar={setSeccion}
          />
        </>
      )}

      {modo === 'item' && !grupoTablaActivo && (
        <>
          <h2 className="text-sm font-semibold text-azul">Secciones del trámite</h2>
          <TableroSecciones
            items={gruposTabla.map((g, i) => ({
              key: String(g.tabla_no),
              titulo: `Tabla No. ${g.tabla_no}`,
              subtitulo: g.tabla_descripcion,
              detalle: `${g.novedades.length} novedades · ${g.items.length} requisitos`,
              pct: pctRespondido(g.items, respuestas),
              icono: ICONOS_SECCION[i % ICONOS_SECCION.length],
              color: COLORES_SECCION[i % COLORES_SECCION.length],
            }))}
            onSeleccionar={setSeccion}
          />
        </>
      )}

      {(grupoNovedadActivo || grupoTablaActivo) && itemsSeccionActiva && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <button
              onClick={() => {
                setSeccion(null)
                setItemActivo(null)
              }}
              className="flex w-fit items-center gap-1.5 text-xs font-medium text-azul2 hover:underline"
            >
              <ArrowLeft size={14} />
              Volver a secciones
            </button>

            {grupoTablaActivo && (
              <h2 className="text-sm font-semibold text-azul">
                Tabla No. {grupoTablaActivo.tabla_no}. {grupoTablaActivo.tabla_descripcion}
              </h2>
            )}

            {grupoNovedadActivo && (
              <SeccionBloque
                titulo={grupoNovedadActivo.novedad}
                badge={`Tabla No. ${grupoNovedadActivo.tabla_no}`}
                items={grupoNovedadActivo.items}
                orden={orden}
                onOrden={setOrden}
                respuestas={respuestas}
                evidencias={evidencias}
                guardandoIds={guardandoIds}
                itemActivo={itemActivo}
                onSeleccionarItem={setItemActivo}
                onResponder={(cid, r) => guardarRespuesta(cid, { respuesta: r })}
                onComentario={(cid, c) => guardarRespuesta(cid, { comentario: c })}
              />
            )}

            {grupoTablaActivo &&
              grupoTablaActivo.novedades.map((g) => (
                <SeccionBloque
                  key={g.key}
                  titulo={g.novedad}
                  items={g.items}
                  orden={orden}
                  onOrden={setOrden}
                  respuestas={respuestas}
                  evidencias={evidencias}
                  guardandoIds={guardandoIds}
                  itemActivo={itemActivo}
                  onSeleccionarItem={setItemActivo}
                  onResponder={(cid, r) => guardarRespuesta(cid, { respuesta: r })}
                  onComentario={(cid, c) => guardarRespuesta(cid, { comentario: c })}
                />
              ))}
          </div>

          {itemActivoData && (
            <PanelDetalle
              item={itemActivoData}
              respuesta={respuestas[itemActivoData.id]}
              evidencias={evidencias[itemActivoData.id] ?? []}
              subiendo={subiendoEvidencia}
              onCerrar={() => setItemActivo(null)}
              onComentario={(c) => guardarRespuesta(itemActivoData.id, { comentario: c })}
              onSubirEvidencia={(archivos) => subirEvidencias(itemActivoData.id, archivos)}
              onEliminarEvidencia={eliminarEvidencia}
              onVerArchivo={setArchivoVisor}
            />
          )}
        </div>
      )}

      <VisorArchivo archivo={archivoVisor} onClose={() => setArchivoVisor(null)} />
    </div>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 font-medium text-slate-500">{etiqueta}</div>
      <div className="text-slate-700">{children}</div>
    </div>
  )
}

function Leyenda({ color, label, valor }: { color: string; label: string; valor: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700">{valor}</span>
    </div>
  )
}

// --- Tablero de tarjetas de sección: el usuario primero elige por qué
// novedad o tabla quiere entrar, y solo entonces se cargan sus filas. ---
function TableroSecciones({
  items,
  onSeleccionar,
}: {
  items: { key: string; titulo: string; subtitulo: string; detalle: string; pct: number; icono: typeof Building2; color: { fondo: string; texto: string; anillo: string } }[]
  onSeleccionar: (key: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((it) => {
        const Icono = it.icono
        return (
          <button
            key={it.key}
            onClick={() => onSeleccionar(it.key)}
            className="flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${it.color.fondo} ${it.color.texto}`}>
              <Icono size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-slate-400">{it.subtitulo}</div>
              <div className="text-sm font-semibold leading-snug text-slate-800">{it.titulo}</div>
              <div className="text-[11px] text-slate-400">{it.detalle}</div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <AnilloMultiSegmento size={40} grosor={4} segmentos={[{ pct: it.pct, color: it.color.anillo }]} centro={<span className="text-[10px] font-bold text-slate-600">{it.pct}%</span>} />
              <ChevronRight size={14} className="text-slate-300" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Anillo SVG multi-segmento (Cumple/No cumple/No aplica en el resumen
// general, o un único segmento de % respondido en cada tarjeta de sección).
function AnilloMultiSegmento({
  segmentos,
  size = 64,
  grosor = 8,
  centro,
}: {
  segmentos: { pct: number; color: string }[]
  size?: number
  grosor?: number
  centro?: ReactNode
}) {
  const radio = (size - grosor) / 2
  const circunferencia = 2 * Math.PI * radio
  let acumulado = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radio} fill="none" stroke="#e2e8f0" strokeWidth={grosor} />
        {segmentos.map((s, i) => {
          const largo = (s.pct / 100) * circunferencia
          const dashoffset = -((acumulado / 100) * circunferencia)
          acumulado += s.pct
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radio}
              fill="none"
              stroke={s.color}
              strokeWidth={grosor}
              strokeDasharray={`${largo} ${circunferencia - largo}`}
              strokeDashoffset={dashoffset}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{centro}</div>
    </div>
  )
}

// Un bloque de novedad completo: encabezado con "Ordenar por" + barra de
// progreso de la sección, y la lista de sus filas.
function SeccionBloque({
  titulo,
  badge,
  items,
  orden,
  onOrden,
  respuestas,
  evidencias,
  guardandoIds,
  itemActivo,
  onSeleccionarItem,
  onResponder,
  onComentario,
}: {
  titulo: string
  badge?: string
  items: CatalogoItem[]
  orden: Orden
  onOrden: (o: Orden) => void
  respuestas: Record<number, RespuestaLocal>
  evidencias: Record<number, Evidencia[]>
  guardandoIds: Set<number>
  itemActivo: number | null
  onSeleccionarItem: (id: number) => void
  onResponder: (catalogoId: number, r: Respuesta) => void
  onComentario: (catalogoId: number, c: string) => void
}) {
  const ordenados = useMemo(() => {
    const copia = [...items]
    if (orden === 'alfabetico') copia.sort((a, b) => a.requisito.localeCompare(b.requisito, 'es'))
    else copia.sort((a, b) => a.item_no - b.item_no)
    return copia
  }, [items, orden])

  const pct = pctRespondido(items, respuestas)

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{titulo}</h3>
          {badge && <Badge tono="neutro">{badge}</Badge>}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <label className="flex items-center gap-1.5 text-slate-500">
            Ordenar por
            <select value={orden} onChange={(e) => onOrden(e.target.value as Orden)} className="campo py-0.5 text-[11px]">
              <option value="numeral">Numeral</option>
              <option value="alfabetico">Alfabético</option>
            </select>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Progreso sección</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-azul" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-semibold text-slate-600">{pct}%</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {ordenados.map((it) => (
          <FilaRequisito
            key={it.id}
            item={it}
            respuesta={respuestas[it.id]}
            numEvidencias={(evidencias[it.id] ?? []).length}
            guardando={guardandoIds.has(it.id)}
            activo={itemActivo === it.id}
            onSeleccionar={() => onSeleccionarItem(it.id)}
            onResponder={(r) => onResponder(it.id, r)}
            onComentario={(c) => onComentario(it.id, c)}
          />
        ))}
      </div>
    </Card>
  )
}

function FilaRequisito({
  item,
  respuesta,
  numEvidencias,
  guardando,
  activo,
  onSeleccionar,
  onResponder,
  onComentario,
}: {
  item: CatalogoItem
  respuesta?: RespuestaLocal
  numEvidencias: number
  guardando: boolean
  activo: boolean
  onSeleccionar: () => void
  onResponder: (r: Respuesta) => void
  onComentario: (c: string) => void
}) {
  const botones: { valor: Respuesta; icono: ReactNode; activo: string; label: string }[] = [
    { valor: 'cumple', icono: <Check size={14} />, activo: 'border-emerald-600 bg-emerald-600 text-white', label: 'Cumple' },
    { valor: 'no_cumple', icono: <X size={14} />, activo: 'border-red-600 bg-red-600 text-white', label: 'No Cumple' },
    { valor: 'no_aplica', icono: <MinusCircle size={14} />, activo: 'border-slate-500 bg-slate-500 text-white', label: 'N/A' },
  ]
  const estado = ESTADO_BADGE[respuesta?.respuesta ?? 'pendiente']
  const tintFondo =
    respuesta?.respuesta === 'cumple'
      ? 'bg-emerald-50/60'
      : respuesta?.respuesta === 'no_cumple'
        ? 'bg-red-50/50'
        : respuesta?.respuesta === 'no_aplica'
          ? 'bg-slate-50'
          : 'bg-white'

  return (
    <div
      className={`rounded-xl border p-2.5 shadow-sm transition-shadow hover:shadow-md ${tintFondo} ${activo ? 'border-azul ring-1 ring-azul/30' : 'border-slate-300'}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 shrink-0 items-center justify-center rounded-md bg-azul px-1.5 text-[11px] font-bold tabular-nums text-white">
          {item.item_no}
        </span>
        <div className="flex-1 text-xs leading-relaxed text-slate-700">
          <p>{item.requisito}</p>
          {item.nota && <p className="mt-1 border-t border-dashed border-slate-200 pt-1 text-[11px] italic text-slate-400">{item.nota}</p>}
        </div>
        <Badge tono={estado.tono}>{estado.label}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        {guardando && <Loader2 size={14} className="animate-spin text-slate-400" />}
        <div className="flex shrink-0 items-center gap-1.5">
          {botones.map((b) => (
            <button
              key={b.valor}
              onClick={() => onResponder(b.valor)}
              title={b.label}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                respuesta?.respuesta === b.valor ? b.activo : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {b.icono}
              {b.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Comentario (opcional)"
          defaultValue={respuesta?.comentario ?? ''}
          onBlur={(e) => onComentario(e.target.value)}
          className="campo min-w-[140px] flex-1"
        />
        <button
          onClick={onSeleccionar}
          className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            activo ? 'border-azul bg-azul text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <FileText size={13} />
          Ver evidencia{numEvidencias > 0 ? ` (${numEvidencias})` : ''}
        </button>
      </div>
    </div>
  )
}

// Panel lateral del requisito activo: descripción completa, estado, un
// comentario más amplio, y sus evidencias documentales propias.
function PanelDetalle({
  item,
  respuesta,
  evidencias,
  subiendo,
  onCerrar,
  onComentario,
  onSubirEvidencia,
  onEliminarEvidencia,
  onVerArchivo,
}: {
  item: CatalogoItem
  respuesta?: RespuestaLocal
  evidencias: Evidencia[]
  subiendo: boolean
  onCerrar: () => void
  onComentario: (c: string) => void
  onSubirEvidencia: (archivos: FileList) => void
  onEliminarEvidencia: (evidencia: Evidencia) => void
  onVerArchivo: (archivo: ArchivoVisor) => void
}) {
  const [comentario, setComentario] = useState(respuesta?.comentario ?? '')
  useEffect(() => setComentario(respuesta?.comentario ?? ''), [item.id, respuesta?.comentario])
  const estado = ESTADO_BADGE[respuesta?.respuesta ?? 'pendiente']

  return (
    <Card className="lg:w-80 lg:shrink-0">
      <div className="mb-2 flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Detalle del requisito</h3>
        <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-3 text-xs">
        <p className="font-medium text-slate-700">
          {item.item_no}. {item.requisito}
        </p>
        {item.nota && <p className="italic text-slate-400">{item.nota}</p>}

        <div>
          <div className="mb-1 font-medium text-slate-500">Estado actual</div>
          <Badge tono={estado.tono}>{estado.label}</Badge>
        </div>

        <label className="block">
          <span className="mb-1 block font-medium text-slate-500">Comentario</span>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            onBlur={(e) => onComentario(e.target.value)}
            className="campo w-full"
            rows={3}
          />
        </label>

        <div>
          <div className="mb-1 font-medium text-slate-500">Evidencias adjuntas ({evidencias.length})</div>
          <div className="flex flex-col gap-1.5">
            {evidencias.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-1.5">
                <button
                  onClick={() => onVerArchivo({ nombre: e.nombre_archivo, url: e.url })}
                  className="flex min-w-0 items-center gap-1.5 text-left text-azul2 hover:underline"
                >
                  <Paperclip size={12} className="shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate">{e.nombre_archivo}</span>
                    <span className="block text-[10px] text-slate-400">{formatoTamano(e.tamano_bytes)}</span>
                  </span>
                </button>
                <button onClick={() => onEliminarEvidencia(e)} className="shrink-0 text-slate-400 hover:text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <input
            type="file"
            multiple
            disabled={subiendo}
            onChange={(e) => e.target.files && onSubirEvidencia(e.target.files)}
            className="campo mt-2 w-full"
          />
        </div>

        <Boton onClick={() => onComentario(comentario)} className="mt-1">
          Guardar cambios
        </Boton>
      </div>
    </Card>
  )
}
