import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Badge, Card, FilterBar, PageHeader, Spinner } from '../components/ui/ui'

type Fila = {
  id: string
  fecha: string
  estado: 'borrador' | 'finalizada'
  lugar: string | null
  servicio_habilitado: { nombre: string } | null
  usuario: { nombre: string } | null
  sede: { nombre: string } | null
}

export default function Historial() {
  const navigate = useNavigate()
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'borrador' | 'finalizada'>('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('autoevaluaciones')
      .select(
        'id, fecha, estado, lugar, servicio_habilitado:servicios_habilitados(nombre), usuario:profiles(nombre), sede:sedes(nombre)',
      )
      .order('creado_en', { ascending: false })
    setFilas((data as unknown as Fila[]) ?? [])
    setCargando(false)
  }

  const filtradas = filas.filter((f) => {
    if (filtroEstado !== 'todos' && f.estado !== filtroEstado) return false
    if (busqueda && !f.servicio_habilitado?.nombre?.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <PageHeader titulo="Historial y reportes" />

      <FilterBar>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Buscar servicio</span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Estado</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
            className="campo"
          >
            <option value="todos">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="finalizada">Finalizada</option>
          </select>
        </label>
      </FilterBar>

      <Card>
        {cargando ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : filtradas.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No hay auto-evaluaciones para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Servicio</th>
                  <th className="py-2 pr-4">Sede</th>
                  <th className="py-2 pr-4">Usuario</th>
                  <th className="py-2 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => navigate(`/nueva/${f.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="py-2 pr-4">{f.fecha}</td>
                    <td className="py-2 pr-4 font-medium text-slate-700">{f.servicio_habilitado?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4">{f.sede?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4">{f.usuario?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4">
                      <Badge tono={f.estado === 'finalizada' ? 'exito' : 'advertencia'}>
                        {f.estado === 'finalizada' ? 'Finalizada' : 'Borrador'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
