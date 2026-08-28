import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardPlus, History, Settings2, ShieldCheck, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Badge, Boton, Card, PageHeader, Spinner } from '../components/ui/ui'

// Página comparativa de 3 rediseños del Dashboard (pedido 2026-08-28),
// inspirados en el video de referencia del cliente: anillos de progreso,
// franja de KPI y lista con barra de tendencia. Vive en /dashboard-opciones,
// aparte del Dashboard real (/) — no lo reemplaza hasta que el cliente elija.

type Fila = {
  id: string
  fecha: string
  estado: 'borrador' | 'finalizada'
  habilitada: boolean
  servicio: string
  sede: string
  usuario: string
  cumple: number
  noCumple: number
  noAplica: number
  total: number
}
type SedeStat = { nombre: string; total: number; habilitadas: number }
type EstandarStat = { estandar: string; cumple: number; noCumple: number; noAplica: number; total: number }
type Conteo = { cumple: number; no_cumple: number; no_aplica: number; total: number }
type Resumen = {
  total: number
  borradores: number
  finalizadas: number
  habilitadas: number
  finalizadasSinHabilitar: number
  cumple: number
  noCumple: number
  noAplica: number
  total_resp: number
}

const OPCIONES = [
  { valor: 'a' as const, letra: 'A', nombre: 'Anillo de Cumplimiento' },
  { valor: 'b' as const, letra: 'B', nombre: 'Centro de Mando' },
  { valor: 'c' as const, letra: 'C', nombre: 'Lista Viva' },
]
type OpcionValor = (typeof OPCIONES)[number]['valor']

function conteoVacio(): Conteo {
  return { cumple: 0, no_cumple: 0, no_aplica: 0, total: 0 }
}
function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

export default function DashboardOpciones() {
  const navigate = useNavigate()
  const [opcion, setOpcion] = useState<OpcionValor>('a')
  const [cargando, setCargando] = useState(true)
  const [filas, setFilas] = useState<Fila[]>([])
  const [sedeStats, setSedeStats] = useState<SedeStat[]>([])
  const [estandarStats, setEstandarStats] = useState<EstandarStat[]>([])

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data: cabeceras } = await supabase
      .from('autoevaluaciones')
      .select(
        'id, fecha, estado, habilitada, servicio_res1732:servicios_res1732(nombre), sede:sedes(nombre), usuario:profiles(nombre)',
      )
      .order('fecha', { ascending: false })

    type Cabecera = {
      id: string
      fecha: string
      estado: 'borrador' | 'finalizada'
      habilitada: boolean
      servicio_res1732: { nombre: string } | null
      sede: { nombre: string } | null
      usuario: { nombre: string } | null
    }
    const cabs = (cabeceras as unknown as Cabecera[]) ?? []

    // Respuestas de TODAS las auto-evaluaciones, paginadas por el tope de
    // 1.000 filas del proyecto Supabase (igual que en Dashboard.tsx), con el
    // Estándar de su criterio para poder totalizar por Estándar también.
    const TAMANO_PAGINA = 1000
    const respuestas: { autoevaluacion_id: string; respuesta: string; criterio: { estandar: string } | null }[] = []
    for (let desde = 0; ; desde += TAMANO_PAGINA) {
      const { data } = await supabase
        .from('autoevaluaciones_respuestas')
        .select('autoevaluacion_id, respuesta, criterio:criterios_res1732(estandar)')
        .range(desde, desde + TAMANO_PAGINA - 1)
      const pagina = (data as unknown as typeof respuestas) ?? []
      respuestas.push(...pagina)
      if (pagina.length < TAMANO_PAGINA) break
    }

    const porFila: Record<string, Conteo> = {}
    const porEstandar: Record<string, Conteo> = {}
    for (const r of respuestas) {
      if (!porFila[r.autoevaluacion_id]) porFila[r.autoevaluacion_id] = conteoVacio()
      sumar(porFila[r.autoevaluacion_id], r.respuesta)

      const estandar = r.criterio?.estandar ?? 'Sin estándar'
      if (!porEstandar[estandar]) porEstandar[estandar] = conteoVacio()
      sumar(porEstandar[estandar], r.respuesta)
    }

    const filasCalc: Fila[] = cabs.map((c) => {
      const conteo = porFila[c.id] ?? conteoVacio()
      return {
        id: c.id,
        fecha: c.fecha,
        estado: c.estado,
        habilitada: c.habilitada,
        servicio: c.servicio_res1732?.nombre ?? '—',
        sede: c.sede?.nombre ?? '—',
        usuario: c.usuario?.nombre ?? '—',
        cumple: conteo.cumple,
        noCumple: conteo.no_cumple,
        noAplica: conteo.no_aplica,
        total: conteo.total,
      }
    })
    setFilas(filasCalc)

    const sedeMapa = new Map<string, SedeStat>()
    for (const f of filasCalc) {
      if (!sedeMapa.has(f.sede)) sedeMapa.set(f.sede, { nombre: f.sede, total: 0, habilitadas: 0 })
      const s = sedeMapa.get(f.sede)!
      s.total++
      if (f.habilitada) s.habilitadas++
    }
    setSedeStats(Array.from(sedeMapa.values()).sort((a, b) => b.total - a.total))

    setEstandarStats(
      Object.entries(porEstandar)
        .map(([estandar, c]) => ({ estandar, cumple: c.cumple, noCumple: c.no_cumple, noAplica: c.no_aplica, total: c.total }))
        .sort((a, b) => a.estandar.localeCompare(b.estandar)),
    )

    setCargando(false)
  }

  function sumar(c: Conteo, r: string) {
    if (r === 'cumple') c.cumple++
    else if (r === 'no_cumple') c.no_cumple++
    else if (r === 'no_aplica') c.no_aplica++
    c.total++
  }

  const resumen = useMemo(() => {
    const cumple = filas.reduce((a, f) => a + f.cumple, 0)
    const noCumple = filas.reduce((a, f) => a + f.noCumple, 0)
    const noAplica = filas.reduce((a, f) => a + f.noAplica, 0)
    const total = cumple + noCumple + noAplica
    return {
      total: filas.length,
      borradores: filas.filter((f) => f.estado === 'borrador').length,
      finalizadas: filas.filter((f) => f.estado === 'finalizada').length,
      habilitadas: filas.filter((f) => f.habilitada).length,
      finalizadasSinHabilitar: filas.filter((f) => f.estado === 'finalizada' && !f.habilitada).length,
      cumple,
      noCumple,
      noAplica,
      total_resp: total,
    }
  }, [filas])

  return (
    <div>
      <PageHeader
        titulo="Dashboard (opciones)"
        acciones={<Boton variante="secundario" onClick={() => navigate('/')}>Volver al Dashboard actual</Boton>}
      />

      <p className="mb-4 max-w-3xl text-sm text-slate-500">
        Tres direcciones para el Dashboard, inspiradas en el video de referencia (anillos de progreso, franja de
        KPI, lista con tendencia). Usan los mismos datos reales de la app — cambia de pestaña para comparar.
      </p>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {OPCIONES.map((o) => (
          <button
            key={o.valor}
            onClick={() => setOpcion(o.valor)}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              opcion === o.valor ? 'border-azul text-azul' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${
                opcion === o.valor ? 'border-azul text-azul' : 'border-slate-300 text-slate-400'
              }`}
            >
              {o.letra}
            </span>
            {o.nombre}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          {opcion === 'a' && <OpcionAnillo resumen={resumen} sedeStats={sedeStats} estandarStats={estandarStats} />}
          {opcion === 'b' && <OpcionMando resumen={resumen} filas={filas} navigate={navigate} />}
          {opcion === 'c' && <OpcionLista resumen={resumen} filas={filas} />}
        </>
      )}
    </div>
  )
}

// ============================================================
// Opción A — Anillo de Cumplimiento
// ============================================================

function OpcionAnillo({
  resumen,
  sedeStats,
  estandarStats,
}: {
  resumen: Resumen
  sedeStats: SedeStat[]
  estandarStats: EstandarStat[]
}) {
  const pctGlobal = pct(resumen.cumple, resumen.total_resp)
  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">
        <strong className="text-slate-700">Cada número clave es un anillo, no una tarjeta plana</strong> — el
        color y el arco comunican el estado antes que el texto.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnilloCard pct={pctGlobal} color="#059669" centro={`${pctGlobal}%`} titulo="Cumplimiento global" sub={`${resumen.cumple} de ${resumen.total_resp} respondidas`} />
        <AnilloCard pct={pct(resumen.habilitadas, resumen.total)} color="#0284c7" centro={String(resumen.habilitadas)} titulo="Habilitadas" sub={`de ${resumen.total} auto-evaluaciones`} />
        <AnilloCard pct={pct(resumen.finalizadas, resumen.total)} color="#16468e" centro={String(resumen.finalizadas)} titulo="Finalizadas" sub={`de ${resumen.total} auto-evaluaciones`} />
        <AnilloCard pct={pct(resumen.borradores, resumen.total)} color="#d97706" centro={String(resumen.borradores)} titulo="Borradores" sub="pendientes de continuar" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-0.5 text-sm font-bold text-slate-700">Habilitación por Sede</h3>
          <p className="mb-3 text-xs text-slate-400">Auto-evaluaciones habilitadas sobre el total de cada sede</p>
          {sedeStats.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Sin datos todavía.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {sedeStats.map((s) => (
                <div key={s.nombre} className="grid grid-cols-[130px_1fr_50px] items-center gap-3 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{s.nombre}</div>
                    <div className="text-[11px] text-slate-400">{s.habilitadas} de {s.total} habilitadas</div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-sky-600" style={{ width: `${pct(s.habilitadas, s.total)}%` }} />
                  </div>
                  <div className="text-right font-mono text-sm font-semibold text-slate-600">{pct(s.habilitadas, s.total)}%</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-0.5 text-sm font-bold text-slate-700">Cumplimiento por Estándar</h3>
          <p className="mb-3 text-xs text-slate-400">% Cumple sobre respondidas, todas las auto-evaluaciones</p>
          {estandarStats.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Sin respuestas todavía.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {estandarStats.map((e) => (
                <div key={e.estandar}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{e.estandar.replace('Estándar de ', '')}</span>
                    <span className="font-mono font-semibold text-slate-500">{pct(e.cumple, e.total)}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-azul2" style={{ width: `${pct(e.cumple, e.total)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function AnilloCard({ pct: valor, color, centro, titulo, sub }: { pct: number; color: string; centro: string; titulo: string; sub: string }) {
  const size = 88
  const grosor = 8
  const radio = (size - grosor) / 2
  const circ = 2 * Math.PI * radio
  const offset = circ * (1 - valor / 100)
  return (
    <Card className="flex flex-col items-center gap-2 p-4 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radio} stroke="#e2e8f0" strokeWidth={grosor} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radio}
            stroke={color}
            strokeWidth={grosor}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-lg font-semibold text-slate-700">{centro}</div>
      </div>
      <div className="text-xs font-semibold text-slate-600">{titulo}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </Card>
  )
}

// ============================================================
// Opción B — Centro de Mando
// ============================================================

function OpcionMando({
  resumen,
  filas,
  navigate,
}: {
  resumen: Resumen
  filas: Fila[]
  navigate: (ruta: string) => void
}) {
  const recientes = filas.slice(0, 6)
  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">
        <strong className="text-slate-700">Franja de mando en azul institucional</strong> con los tres totales
        que más se preguntan (Cumple / No Cumple / No Aplica), el botón de acción principal integrado, y accesos
        directos a los módulos.
      </p>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-5 rounded-2xl bg-gradient-to-br from-azul to-azul2 p-6 text-white shadow-lg shadow-azul/25">
        <div className="flex flex-wrap gap-8">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">Cumple</div>
            <div className="font-mono text-3xl font-semibold">
              {resumen.cumple} <span className="text-base font-medium opacity-75">· {pct(resumen.cumple, resumen.total_resp)}%</span>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">No cumple</div>
            <div className="font-mono text-3xl font-semibold">
              {resumen.noCumple} <span className="text-base font-medium opacity-75">· {pct(resumen.noCumple, resumen.total_resp)}%</span>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">No aplica</div>
            <div className="font-mono text-3xl font-semibold">
              {resumen.noAplica} <span className="text-base font-medium opacity-75">· {pct(resumen.noAplica, resumen.total_resp)}%</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/nueva')}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-azul shadow-lg transition-transform hover:scale-[1.02]"
        >
          <ClipboardPlus size={16} />
          Nueva auto-evaluación
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickLink icono={<History size={18} />} titulo="Auto-Evaluaciones" sub="Ver historial completo" onClick={() => navigate('/historial')} />
        <QuickLink icono={<Users size={18} />} titulo="Usuarios" sub="Roles y accesos" onClick={() => navigate('/admin/usuarios')} />
        <QuickLink icono={<Settings2 size={18} />} titulo="Catálogos" sub="Servicios y criterios" onClick={() => navigate('/admin/catalogos')} />
        <QuickLink
          icono={<ShieldCheck size={18} />}
          titulo="Por Habilitar"
          sub={`${resumen.finalizadasSinHabilitar} finalizada${resumen.finalizadasSinHabilitar === 1 ? '' : 's'} sin habilitar`}
          onClick={() => navigate('/historial')}
        />
      </div>

      <Card className="p-0">
        <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
          <h3 className="text-sm font-bold text-slate-700">Últimas auto-evaluaciones</h3>
          <span className="text-xs text-slate-400">{filas.length} en total</span>
        </div>
        {recientes.length === 0 ? (
          <p className="px-5 pb-5 pt-2 text-center text-sm text-slate-400">Todavía no hay auto-evaluaciones.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-slate-200 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2">Servicio</th>
                <th className="px-5 py-2">Sede</th>
                <th className="px-5 py-2">Estado</th>
                <th className="px-5 py-2 text-right">Cumple</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recientes.map((f) => (
                <tr key={f.id} className="last:[&>td]:pb-4">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{f.servicio}</td>
                  <td className="px-5 py-2.5 text-slate-500">{f.sede}</td>
                  <td className="px-5 py-2.5">
                    {f.habilitada ? (
                      <Badge tono="info">Habilitada</Badge>
                    ) : (
                      <Badge tono={f.estado === 'finalizada' ? 'exito' : 'advertencia'}>{f.estado === 'finalizada' ? 'Finalizada' : 'Borrador'}</Badge>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">{f.total > 0 ? `${pct(f.cumple, f.total)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function QuickLink({ icono, titulo, sub, onClick }: { icono: React.ReactNode; titulo: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-lg">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-azul/10 text-azul2">{icono}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-700">{titulo}</div>
          <div className="truncate text-[11px] text-slate-400">{sub}</div>
        </div>
      </Card>
    </button>
  )
}

// ============================================================
// Opción C — Lista Viva
// ============================================================

function OpcionLista({ resumen, filas }: { resumen: Resumen; filas: Fila[] }) {
  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">
        <strong className="text-slate-700">El dashboard es la lista misma.</strong> Cada auto-evaluación es una
        fila con su propia barra de tendencia — mejor para escanear muchos registros rápido en vez de mirar
        tarjetas grandes.
      </p>

      <Card className="mb-4 flex flex-wrap items-center gap-6 p-4">
        <Stat etiqueta="Total" valor={resumen.total} />
        <div className="h-5 w-px bg-slate-200" />
        <Stat etiqueta="Habilitadas" valor={resumen.habilitadas} color="text-sky-600" />
        <div className="h-5 w-px bg-slate-200" />
        <Stat etiqueta="Finalizadas" valor={resumen.finalizadas} />
        <div className="h-5 w-px bg-slate-200" />
        <Stat etiqueta="Borradores" valor={resumen.borradores} color="text-amber-600" />
        <div className="h-5 w-px bg-slate-200" />
        <Stat etiqueta="Cumplimiento global" valor={`${pct(resumen.cumple, resumen.total_resp)}%`} color="text-emerald-600" />
      </Card>

      <Card className="p-1">
        <div className="flex gap-4 px-4 py-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-sm bg-emerald-600" />Cumple</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-sm bg-red-600" />No cumple</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-sm bg-slate-400" />No aplica</span>
        </div>
        {filas.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Todavía no hay auto-evaluaciones.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filas.map((f) => (
              <div key={f.id} className="grid grid-cols-1 items-center gap-2 px-4 py-3 sm:grid-cols-[1.5fr_110px_1fr_70px_86px] sm:gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-700">{f.servicio}</div>
                  <div className="text-[11px] text-slate-400">{f.sede}</div>
                </div>
                <div>
                  {f.habilitada ? (
                    <Badge tono="info">Habilitada</Badge>
                  ) : f.total === 0 ? (
                    <Badge tono="neutro">Sin iniciar</Badge>
                  ) : (
                    <Badge tono={f.estado === 'finalizada' ? 'exito' : 'advertencia'}>{f.estado === 'finalizada' ? 'Finalizada' : 'Borrador'}</Badge>
                  )}
                </div>
                <div>
                  {f.total === 0 ? (
                    <div className="h-4 rounded bg-slate-100" />
                  ) : (
                    <div className="flex h-4 overflow-hidden rounded">
                      <div className="bg-emerald-600" style={{ width: `${(f.cumple / f.total) * 100}%` }} />
                      <div className="bg-red-600" style={{ width: `${(f.noCumple / f.total) * 100}%` }} />
                      <div className="bg-slate-400" style={{ width: `${(f.noAplica / f.total) * 100}%` }} />
                    </div>
                  )}
                  <div className="mt-1 font-mono text-[10px] text-slate-400">{f.total} respondidas</div>
                </div>
                <div className={`text-right font-mono text-sm font-semibold ${f.total === 0 ? 'text-slate-300' : pct(f.cumple, f.total) >= 70 ? 'text-emerald-600' : pct(f.cumple, f.total) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {f.total > 0 ? `${pct(f.cumple, f.total)}%` : '—'}
                </div>
                <div className="text-right font-mono text-[11px] text-slate-400">{f.fecha}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Stat({ etiqueta, valor, color = 'text-slate-700' }: { etiqueta: string; valor: string | number; color?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-slate-400">{etiqueta}</span>
      <span className={`font-mono text-base font-semibold ${color}`}>{valor}</span>
    </div>
  )
}
