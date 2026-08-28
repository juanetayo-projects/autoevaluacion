import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Badge, Boton, Card, FilterBar, Modal, PageHeader, Spinner } from '../components/ui/ui'

type Fila = {
  id: string
  fecha: string
  estado: 'borrador' | 'finalizada'
  lugar: string | null
  servicio_res1732: { nombre: string } | null
  usuario: { nombre: string } | null
  sede: { nombre: string } | null
}

export default function Historial() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'borrador' | 'finalizada'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [eliminando, setEliminando] = useState<Fila | null>(null)
  const [borrando, setBorrando] = useState(false)

  const esAdmin = perfil?.role === 'admin'

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('autoevaluaciones')
      .select(
        'id, fecha, estado, lugar, servicio_res1732:servicios_res1732(nombre), usuario:profiles(nombre), sede:sedes(nombre)',
      )
      .order('creado_en', { ascending: false })
    setFilas((data as unknown as Fila[]) ?? [])
    setCargando(false)
  }

  async function eliminar() {
    if (!eliminando) return
    setBorrando(true)
    await supabase.from('autoevaluaciones').delete().eq('id', eliminando.id)
    setBorrando(false)
    setEliminando(null)
    cargar()
  }

  const filtradas = filas.filter((f) => {
    if (filtroEstado !== 'todos' && f.estado !== filtroEstado) return false
    if (busqueda && !f.servicio_res1732?.nombre?.toLowerCase().includes(busqueda.toLowerCase())) return false
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
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="cursor-pointer py-2 pr-4" onClick={() => navigate(`/nueva/${f.id}`)}>
                      {f.fecha}
                    </td>
                    <td
                      className="cursor-pointer py-2 pr-4 font-medium text-slate-700"
                      onClick={() => navigate(`/nueva/${f.id}`)}
                    >
                      {f.servicio_res1732?.nombre ?? '—'}
                    </td>
                    <td className="cursor-pointer py-2 pr-4" onClick={() => navigate(`/nueva/${f.id}`)}>
                      {f.sede?.nombre ?? '—'}
                    </td>
                    <td className="cursor-pointer py-2 pr-4" onClick={() => navigate(`/nueva/${f.id}`)}>
                      {f.usuario?.nombre ?? '—'}
                    </td>
                    <td className="cursor-pointer py-2 pr-4" onClick={() => navigate(`/nueva/${f.id}`)}>
                      <Badge tono={f.estado === 'finalizada' ? 'exito' : 'advertencia'}>
                        {f.estado === 'finalizada' ? 'Finalizada' : 'Borrador'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => navigate(`/nueva/${f.id}`)}
                          className="text-xs font-medium text-azul2 hover:underline"
                        >
                          {f.estado === 'finalizada' ? 'Ver' : 'Continuar'}
                        </button>
                        {esAdmin && (
                          <button
                            onClick={() => setEliminando(f)}
                            title="Eliminar"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!eliminando} onClose={() => setEliminando(null)} titulo="Eliminar auto-evaluación">
        <p className="mb-4 text-sm text-slate-600">
          ¿Eliminar la auto-evaluación de <strong>{eliminando?.servicio_res1732?.nombre}</strong> del{' '}
          {eliminando?.fecha}? Se borrarán también sus respuestas y compromisos de plan de acción. Esta acción no se
          puede deshacer.
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setEliminando(null)} className="flex-1">
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={eliminar} disabled={borrando} className="flex-1">
            {borrando ? 'Eliminando…' : 'Eliminar'}
          </Boton>
        </div>
      </Modal>
    </div>
  )
}
