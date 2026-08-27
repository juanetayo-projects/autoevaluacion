import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, ClipboardX, CircleSlash, FileClock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Boton, Card, MetricCard, PageHeader, Spinner } from '../components/ui/ui'

type ResumenAutoevaluacion = {
  id: string
  fecha: string
  estado: 'borrador' | 'finalizada'
  servicio_habilitado: { nombre: string } | null
  usuario: { nombre: string } | null
}

type Resumen = {
  totalCumple: number
  totalNoCumple: number
  totalNoAplica: number
  borradores: number
  recientes: ResumenAutoevaluacion[]
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const [{ count: cumple }, { count: noCumple }, { count: noAplica }, { count: borradores }, { data: recientes }] =
        await Promise.all([
          supabase.from('autoevaluaciones_respuestas').select('*', { count: 'exact', head: true }).eq('respuesta', 'cumple'),
          supabase.from('autoevaluaciones_respuestas').select('*', { count: 'exact', head: true }).eq('respuesta', 'no_cumple'),
          supabase.from('autoevaluaciones_respuestas').select('*', { count: 'exact', head: true }).eq('respuesta', 'no_aplica'),
          supabase.from('autoevaluaciones').select('*', { count: 'exact', head: true }).eq('estado', 'borrador'),
          supabase
            .from('autoevaluaciones')
            .select('id, fecha, estado, servicio_habilitado:servicios_habilitados(nombre), usuario:profiles(nombre)')
            .order('creado_en', { ascending: false })
            .limit(6),
        ])
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

  return (
    <div>
      <PageHeader
        titulo="Dashboard"
        acciones={<Boton onClick={() => navigate('/nueva')}>Nueva auto-evaluación</Boton>}
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Últimas auto-evaluaciones</h2>
            {!resumen?.recientes.length ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Todavía no hay auto-evaluaciones registradas.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {resumen.recientes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/nueva/${r.id}`)}
                    className="flex w-full items-center justify-between py-3 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-700">
                      {r.servicio_habilitado?.nombre ?? 'Servicio sin definir'}
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
        </>
      )}
    </div>
  )
}
