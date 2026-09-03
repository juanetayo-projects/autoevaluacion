import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, X, MinusCircle, Loader2, Paperclip, Download, ChevronRight, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Badge, Card, PageHeader, Spinner } from '../components/ui/ui'
import { RESOLUCIONES, type ResolucionKey } from '../domain/resoluciones'

// Checklist del módulo "Novedades" (Res.3100, cap. 10.5 Trámite de
// Novedades) para UNA habilitación concreta (creada al hacer clic en
// "Habilitar" desde Auto-Evaluaciones). Muestra el catálogo sembrado en
// novedades_res3100_catalogo (Tablas No. 3 a 6): primero se elige una
// sección (por novedad del servicio o por numeral de tabla, pedido
// 2026-09-03) en un tablero de tarjetas, y solo entonces se listan sus
// requisitos con cumple/no_cumple/no_aplica + comentario — mismo patrón de
// FilaCriterio en NuevaAutoevaluacion.tsx.

type Respuesta = 'cumple' | 'no_cumple' | 'no_aplica'
type ModoVisualizacion = 'item' | 'novedad'

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

const COLOR_TABLA: Record<number, string> = {
  3: '#4f46e5',
  4: '#059669',
  5: '#d97706',
  6: '#0284c7',
}

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

export default function Novedades() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [habilitacion, setHabilitacion] = useState<Habilitacion | null>(null)
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaLocal>>({})
  const [guardandoIds, setGuardandoIds] = useState<Set<number>>(new Set())
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [modo, setModo] = useState<ModoVisualizacion>('novedad')
  const [seccion, setSeccion] = useState<string | null>(null)

  useEffect(() => {
    if (id) cargar(id)
  }, [id])

  useEffect(() => {
    setSeccion(null)
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
    const lista = (adj as Adjunto[]) ?? []
    const conUrl = await Promise.all(
      lista.map(async (a) => {
        const { data } = await supabase.storage.from('novedades-adjuntos').createSignedUrl(a.ruta, 3600)
        return { ...a, url: data?.signedUrl }
      }),
    )
    setAdjuntos(conUrl)

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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
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

      <Card>
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <Campo etiqueta="Servicio / Sede">
            {nombreServicio(habilitacion)} — {habilitacion.autoevaluacion?.sede?.nombre ?? '—'}
          </Campo>
          <Campo etiqueta="Fecha de inicio">{habilitacion.fecha_inicio}</Campo>
          <Campo etiqueta="Fecha final">{habilitacion.fecha_final}</Campo>
          <Campo etiqueta="Resolución">
            {habilitacion.autoevaluacion && <Badge tono="info">{RESOLUCIONES[habilitacion.autoevaluacion.resolucion].labelCorto}</Badge>}
          </Campo>
          <Campo etiqueta="Auditor(es)">{habilitacion.auditores.join(', ') || '—'}</Campo>
          <Campo etiqueta="Persona(s) evaluada(s)">{habilitacion.evaluados.join(', ') || '—'}</Campo>
          <Campo etiqueta="Observaciones">{habilitacion.observaciones || '—'}</Campo>
          <Campo etiqueta="Adjuntos">
            {adjuntos.length === 0 ? (
              '—'
            ) : (
              <div className="flex flex-col gap-1">
                {adjuntos.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-azul2 hover:underline"
                  >
                    <Paperclip size={11} />
                    <span className="truncate">{a.nombre_archivo}</span>
                    <Download size={11} />
                  </a>
                ))}
              </div>
            )}
          </Campo>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <AnilloMultiSegmento
            size={72}
            segmentos={[
              { pct: (avance.cumple / (avance.total || 1)) * 100, color: '#059669' },
              { pct: (avance.noCumple / (avance.total || 1)) * 100, color: '#dc2626' },
              { pct: (avance.noAplica / (avance.total || 1)) * 100, color: '#94a3b8' },
            ]}
            centro={<span className="text-sm font-bold text-slate-700">{avance.total - avance.pendientes}/{avance.total}</span>}
          />
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <span className="text-emerald-600">✔ Cumple: {avance.cumple}</span>
            <span className="text-red-600">✘ No cumple: {avance.noCumple}</span>
            <span className="text-slate-500">— No aplica: {avance.noAplica}</span>
            <span className="text-amber-600">Pendientes: {avance.pendientes}</span>
          </div>
        </div>
      </Card>

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
        <TableroSecciones
          items={gruposNovedad.map((g) => ({
            key: g.key,
            titulo: g.novedad,
            subtitulo: `Tabla No. ${g.tabla_no}`,
            detalle: `${g.items.length} requisito${g.items.length === 1 ? '' : 's'}`,
            color: COLOR_TABLA[g.tabla_no] ?? '#0D2D6B',
            pct: pctRespondido(g.items, respuestas),
          }))}
          onSeleccionar={setSeccion}
        />
      )}

      {modo === 'item' && !grupoTablaActivo && (
        <TableroSecciones
          items={gruposTabla.map((g) => ({
            key: String(g.tabla_no),
            titulo: `Tabla No. ${g.tabla_no}`,
            subtitulo: g.tabla_descripcion,
            detalle: `${g.novedades.length} novedades · ${g.items.length} requisitos`,
            color: COLOR_TABLA[g.tabla_no] ?? '#0D2D6B',
            pct: pctRespondido(g.items, respuestas),
          }))}
          onSeleccionar={setSeccion}
        />
      )}

      {grupoNovedadActivo && (
        <div className="flex flex-col gap-3">
          <BotonVolverSeccion onClick={() => setSeccion(null)} />
          <SeccionDetalle titulo={grupoNovedadActivo.novedad} badge={`Tabla No. ${grupoNovedadActivo.tabla_no}`}>
            {grupoNovedadActivo.items.map((it) => (
              <FilaRequisito
                key={it.id}
                item={it}
                respuesta={respuestas[it.id]}
                guardando={guardandoIds.has(it.id)}
                onResponder={(r) => guardarRespuesta(it.id, { respuesta: r })}
                onComentario={(c) => guardarRespuesta(it.id, { comentario: c })}
              />
            ))}
          </SeccionDetalle>
        </div>
      )}

      {grupoTablaActivo && (
        <div className="flex flex-col gap-4">
          <BotonVolverSeccion onClick={() => setSeccion(null)} />
          <h2 className="text-sm font-semibold text-azul">
            Tabla No. {grupoTablaActivo.tabla_no}. {grupoTablaActivo.tabla_descripcion}
          </h2>
          {grupoTablaActivo.novedades.map((g) => (
            <SeccionDetalle key={g.key} titulo={g.novedad}>
              {g.items.map((it) => (
                <FilaRequisito
                  key={it.id}
                  item={it}
                  respuesta={respuestas[it.id]}
                  guardando={guardandoIds.has(it.id)}
                  onResponder={(r) => guardarRespuesta(it.id, { respuesta: r })}
                  onComentario={(c) => guardarRespuesta(it.id, { comentario: c })}
                />
              ))}
            </SeccionDetalle>
          ))}
        </div>
      )}
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

function BotonVolverSeccion({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-fit items-center gap-1.5 text-xs font-medium text-azul2 hover:underline"
    >
      <ArrowLeft size={14} />
      Volver a secciones
    </button>
  )
}

function SeccionDetalle({ titulo, badge, children }: { titulo: string; badge?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{titulo}</h3>
        {badge && <Badge tono="neutro">{badge}</Badge>}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  )
}

// --- Tablero de tarjetas de sección (pedido 2026-09-03): en vez de mostrar
// los 113 requisitos de una vez, el usuario primero elige por qué novedad
// o tabla quiere entrar, y solo entonces se cargan sus filas. ---
function TableroSecciones({
  items,
  onSeleccionar,
}: {
  items: { key: string; titulo: string; subtitulo: string; detalle: string; color: string; pct: number }[]
  onSeleccionar: (key: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onSeleccionar(it.key)}
          className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <AnilloMultiSegmento size={44} grosor={5} segmentos={[{ pct: it.pct, color: it.color }]} centro={<span className="text-[10px] font-bold text-slate-600">{it.pct}%</span>} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Layers size={12} className="shrink-0 text-slate-400" />
              <span className="truncate text-[11px] font-medium text-slate-500">{it.subtitulo}</span>
            </div>
            <div className="truncate text-sm font-semibold text-slate-800">{it.titulo}</div>
            <div className="text-[11px] text-slate-400">{it.detalle}</div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>
      ))}
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

function FilaRequisito({
  item,
  respuesta,
  guardando,
  onResponder,
  onComentario,
}: {
  item: CatalogoItem
  respuesta?: RespuestaLocal
  guardando: boolean
  onResponder: (r: Respuesta) => void
  onComentario: (c: string) => void
}) {
  const botones: { valor: Respuesta; icono: ReactNode; activo: string; label: string }[] = [
    { valor: 'cumple', icono: <Check size={14} />, activo: 'border-emerald-600 bg-emerald-600 text-white', label: 'Cumple' },
    { valor: 'no_cumple', icono: <X size={14} />, activo: 'border-red-600 bg-red-600 text-white', label: 'No Cumple' },
    { valor: 'no_aplica', icono: <MinusCircle size={14} />, activo: 'border-slate-500 bg-slate-500 text-white', label: 'N/A' },
  ]
  const tintFondo =
    respuesta?.respuesta === 'cumple'
      ? 'bg-emerald-50/60'
      : respuesta?.respuesta === 'no_cumple'
        ? 'bg-red-50/50'
        : respuesta?.respuesta === 'no_aplica'
          ? 'bg-slate-50'
          : 'bg-white'

  return (
    <div className={`rounded-xl border border-slate-300 ${tintFondo} p-2.5 shadow-sm transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 shrink-0 items-center justify-center rounded-md bg-azul px-1.5 text-[11px] font-bold tabular-nums text-white">
          {item.item_no}
        </span>
        <div className="flex-1 text-xs leading-relaxed text-slate-700">
          <p>{item.requisito}</p>
          {item.nota && <p className="mt-1 border-t border-dashed border-slate-200 pt-1 text-[11px] italic text-slate-400">{item.nota}</p>}
        </div>
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
          className="campo min-w-[180px] flex-1"
        />
      </div>
    </div>
  )
}
