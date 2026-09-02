import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Badge, Boton, Card, FilterBar, Modal, PageHeader, Spinner } from '../components/ui/ui'
import { RESOLUCIONES, RESOLUCION_KEYS, type ResolucionKey } from '../domain/resoluciones'

type Fila = {
  id: string
  fecha: string
  estado: 'borrador' | 'finalizada'
  habilitada: boolean
  lugar: string | null
  resolucion: ResolucionKey
  servicio_res1732: { nombre: string } | null
  servicio_res3100: { nombre: string } | null
  servicio_iso9001: { nombre: string } | null
  usuario: { nombre: string } | null
  sede: { nombre: string } | null
}

function nombreServicio(f: Fila) {
  const servicio =
    f.resolucion === 'res3100' ? f.servicio_res3100 : f.resolucion === 'iso9001' ? f.servicio_iso9001 : f.servicio_res1732
  return servicio?.nombre ?? '—'
}

export default function Historial() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'borrador' | 'finalizada'>('todos')
  const [filtroResolucion, setFiltroResolucion] = useState<'todas' | ResolucionKey>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [eliminando, setEliminando] = useState<Fila | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [habilitando, setHabilitando] = useState<Fila | null>(null)
  const [guardandoHabilitar, setGuardandoHabilitar] = useState(false)
  const [fechaFinal, setFechaFinal] = useState(() => new Date().toISOString().slice(0, 10))
  const [personasEvaluadas, setPersonasEvaluadas] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [requierePlanAccion, setRequierePlanAccion] = useState(false)
  const [planAccionTitulo, setPlanAccionTitulo] = useState('')
  const [planAccionDescripcion, setPlanAccionDescripcion] = useState('')
  const [errorHabilitar, setErrorHabilitar] = useState('')

  const esAdmin = perfil?.role === 'admin'
  // Habilitar es una aprobación de calidad/cumplimiento, igual de sensible
  // que Eliminar — mismo criterio de rol (admin/coordinador) que el resto de
  // acciones administrativas de esta pantalla.
  const puedeHabilitar = perfil?.role === 'admin' || perfil?.role === 'coordinador'

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('autoevaluaciones')
      .select(
        'id, fecha, estado, habilitada, lugar, resolucion, servicio_res1732:servicios_res1732(nombre), servicio_res3100:servicios_res3100(nombre), servicio_iso9001:servicios_iso9001(nombre), usuario:profiles(nombre), sede:sedes(nombre)',
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

  function abrirHabilitar(fila: Fila) {
    setErrorHabilitar('')
    setFechaFinal(new Date().toISOString().slice(0, 10))
    setPersonasEvaluadas('')
    setComentarios('')
    setRequierePlanAccion(false)
    setPlanAccionTitulo('')
    setPlanAccionDescripcion('')
    setHabilitando(fila)
  }

  // Solo se puede habilitar una auto-evaluación "finalizada" — ese estado ya
  // garantiza que no quedó ningún criterio pendiente (Finalizar la bloquea
  // mientras avance.pendientes > 0). Reforzado también en BD (constraint
  // autoevaluaciones_habilitada_requiere_finalizada). Fecha final es
  // obligatoria (cierra el período evaluado); si se marca que requiere Plan
  // de Acción, Título y Descripción también lo son.
  async function habilitar() {
    if (!habilitando) return
    if (!fechaFinal) {
      setErrorHabilitar('La fecha final es obligatoria.')
      return
    }
    if (requierePlanAccion && (!planAccionTitulo.trim() || !planAccionDescripcion.trim())) {
      setErrorHabilitar('Título y descripción del Plan de Acción son obligatorios.')
      return
    }
    setErrorHabilitar('')
    setGuardandoHabilitar(true)
    const { error } = await supabase
      .from('autoevaluaciones')
      .update({
        habilitada: true,
        fecha_final: fechaFinal,
        personas_evaluadas: personasEvaluadas ? Number(personasEvaluadas) : null,
        comentarios_habilitacion: comentarios || null,
        requiere_plan_accion: requierePlanAccion,
        plan_accion_titulo: requierePlanAccion ? planAccionTitulo : null,
        plan_accion_descripcion: requierePlanAccion ? planAccionDescripcion : null,
      })
      .eq('id', habilitando.id)
    setGuardandoHabilitar(false)
    if (error) {
      setErrorHabilitar(error.message)
      return
    }
    setHabilitando(null)
    cargar()
  }

  async function deshabilitar(fila: Fila) {
    await supabase.from('autoevaluaciones').update({ habilitada: false }).eq('id', fila.id)
    cargar()
  }

  const filtradas = filas.filter((f) => {
    if (filtroEstado !== 'todos' && f.estado !== filtroEstado) return false
    if (filtroResolucion !== 'todas' && f.resolucion !== filtroResolucion) return false
    if (busqueda && !nombreServicio(f).toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <PageHeader titulo="Auto-Evaluaciones" />

      <FilterBar sticky className="top-0">
        <label className="text-xs">
          <span className="mb-1 block font-medium text-slate-600">Buscar servicio</span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo" />
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-medium text-slate-600">Resolución</span>
          <select
            value={filtroResolucion}
            onChange={(e) => setFiltroResolucion(e.target.value as typeof filtroResolucion)}
            className="campo"
          >
            <option value="todas">Todas</option>
            {RESOLUCION_KEYS.map((k) => (
              <option key={k} value={k}>
                {RESOLUCIONES[k].labelCorto}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
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
          <p className="py-6 text-center text-xs text-slate-400">No hay auto-evaluaciones para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-azul text-left text-white">
                  <th className="py-1 pr-3">Fecha</th>
                  <th className="py-1 pr-3">Resolución</th>
                  <th className="py-1 pr-3">Servicio</th>
                  <th className="py-1 pr-3">Sede</th>
                  <th className="py-1 pr-3">Usuario</th>
                  <th className="py-1 pr-3">Estado</th>
                  <th className="py-1 pr-3">Habilitada</th>
                  <th className="py-1 pr-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="cursor-pointer py-1 pr-3" onClick={() => navigate(`/nueva/${f.id}`)}>
                      {f.fecha}
                    </td>
                    <td className="cursor-pointer py-1 pr-3" onClick={() => navigate(`/nueva/${f.id}`)}>
                      <Badge tono="info">{RESOLUCIONES[f.resolucion].labelCorto}</Badge>
                    </td>
                    <td
                      className="cursor-pointer py-1 pr-3 font-medium text-slate-700"
                      onClick={() => navigate(`/nueva/${f.id}`)}
                    >
                      {nombreServicio(f)}
                    </td>
                    <td className="cursor-pointer py-1 pr-3" onClick={() => navigate(`/nueva/${f.id}`)}>
                      {f.sede?.nombre ?? '—'}
                    </td>
                    <td className="cursor-pointer py-1 pr-3" onClick={() => navigate(`/nueva/${f.id}`)}>
                      {f.usuario?.nombre ?? '—'}
                    </td>
                    <td className="cursor-pointer py-1 pr-3" onClick={() => navigate(`/nueva/${f.id}`)}>
                      <Badge tono={f.estado === 'finalizada' ? 'exito' : 'advertencia'}>
                        {f.estado === 'finalizada' ? 'Finalizada' : 'Borrador'}
                      </Badge>
                    </td>
                    <td className="py-1 pr-3">
                      {f.habilitada ? (
                        <Badge tono="info">Habilitada</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-1 pr-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => navigate(`/nueva/${f.id}`)}
                          className="text-xs font-medium text-azul2 hover:underline"
                        >
                          {f.estado === 'finalizada' ? 'Ver' : 'Continuar'}
                        </button>
                        {puedeHabilitar &&
                          (f.habilitada ? (
                            <button
                              onClick={() => deshabilitar(f)}
                              className="text-xs font-medium text-slate-500 hover:underline"
                            >
                              Deshabilitar
                            </button>
                          ) : (
                            <button
                              onClick={() => abrirHabilitar(f)}
                              disabled={f.estado !== 'finalizada'}
                              title={
                                f.estado !== 'finalizada'
                                  ? 'Debes finalizar la auto-evaluación (todas las preguntas diligenciadas) antes de habilitarla'
                                  : 'Habilitar'
                              }
                              className="text-sky-600 hover:text-sky-800 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                              <ShieldCheck size={15} />
                            </button>
                          ))}
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

      <Modal open={!!habilitando} onClose={() => setHabilitando(null)} titulo="Habilitar auto-evaluación" ancho="max-w-lg">
        <p className="mb-4 text-xs text-slate-600">
          Auto-evaluación de <strong>{habilitando && nombreServicio(habilitando)}</strong> del {habilitando?.fecha}. Todas
          sus preguntas ya están diligenciadas (auto-evaluación finalizada).
        </p>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="mb-1 block font-medium text-slate-600">Fecha final</span>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="campo"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium text-slate-600">Personas evaluadas</span>
              <input
                type="number"
                min={0}
                value={personasEvaluadas}
                onChange={(e) => setPersonasEvaluadas(e.target.value)}
                className="campo"
              />
            </label>
          </div>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-slate-600">Comentarios</span>
            <textarea value={comentarios} onChange={(e) => setComentarios(e.target.value)} className="campo" rows={2} />
          </label>
          <div className="text-xs">
            <span className="mb-1 block font-medium text-slate-600">¿Requiere crear un Plan de Acción?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRequierePlanAccion(true)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${requierePlanAccion ? 'border-azul bg-azul text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setRequierePlanAccion(false)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${!requierePlanAccion ? 'border-azul bg-azul text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                No
              </button>
            </div>
          </div>
          {requierePlanAccion && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-600">Título del Plan de Acción</span>
                <input
                  value={planAccionTitulo}
                  onChange={(e) => setPlanAccionTitulo(e.target.value)}
                  className="campo"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-600">Descripción</span>
                <textarea
                  value={planAccionDescripcion}
                  onChange={(e) => setPlanAccionDescripcion(e.target.value)}
                  className="campo"
                  rows={3}
                />
              </label>
            </div>
          )}
          {errorHabilitar && <p className="text-xs text-red-600">{errorHabilitar}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <Boton variante="secundario" onClick={() => setHabilitando(null)} className="flex-1">
            Cancelar
          </Boton>
          <Boton onClick={habilitar} disabled={guardandoHabilitar} className="flex-1">
            {guardandoHabilitar ? 'Guardando…' : 'Habilitar'}
          </Boton>
        </div>
      </Modal>

      <Modal open={!!eliminando} onClose={() => setEliminando(null)} titulo="Eliminar auto-evaluación">
        <p className="mb-4 text-xs text-slate-600">
          ¿Eliminar la auto-evaluación de <strong>{eliminando && nombreServicio(eliminando)}</strong> del{' '}
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
