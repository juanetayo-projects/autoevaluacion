import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Trash2, X, FileWarning, Paperclip } from 'lucide-react'
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
  habilitacion_novedades: { id: string }[] | null
}

function nombreServicio(f: Fila) {
  const servicio =
    f.resolucion === 'res3100' ? f.servicio_res3100 : f.resolucion === 'iso9001' ? f.servicio_iso9001 : f.servicio_res1732
  return servicio?.nombre ?? '—'
}

// --- Lista editable de nombres (auditor(es) / evaluado(s)): chip + input,
// porque pueden participar uno o varios en la misma habilitación y no
// siempre tienen usuario en la app (personal externo o del prestador). ---
function ListaNombres({
  etiqueta,
  valores,
  onCambiar,
}: {
  etiqueta: string
  valores: string[]
  onCambiar: (valores: string[]) => void
}) {
  const [nuevo, setNuevo] = useState('')

  function agregar() {
    const v = nuevo.trim()
    if (!v) return
    onCambiar([...valores, v])
    setNuevo('')
  }

  return (
    <div className="text-xs">
      <span className="mb-1 block font-medium text-slate-600">{etiqueta}</span>
      <div className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
          placeholder="Nombre y presiona Enter"
          className="campo flex-1"
        />
        <Boton type="button" variante="secundario" onClick={agregar}>
          Agregar
        </Boton>
      </div>
      {valores.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {valores.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
            >
              {v}
              <button
                type="button"
                onClick={() => onCambiar(valores.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-red-600"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
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
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFinal, setFechaFinal] = useState(() => new Date().toISOString().slice(0, 10))
  const [auditores, setAuditores] = useState<string[]>([])
  const [evaluados, setEvaluados] = useState<string[]>([])
  const [comentarios, setComentarios] = useState('')
  const [adjuntos, setAdjuntos] = useState<File[]>([])
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
        'id, fecha, estado, habilitada, lugar, resolucion, servicio_res1732:servicios_res1732(nombre), servicio_res3100:servicios_res3100(nombre), servicio_iso9001:servicios_iso9001(nombre), usuario:profiles(nombre), sede:sedes(nombre), habilitacion_novedades:habilitaciones_novedades(id)',
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
    setFechaInicio(fila.fecha)
    setFechaFinal(new Date().toISOString().slice(0, 10))
    setAuditores([])
    setEvaluados([])
    setComentarios('')
    setAdjuntos([])
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
  //
  // Al habilitar también se abre el módulo "Novedades" (Res.3100, cap.
  // 10.5): se crea/actualiza un registro habilitaciones_novedades con el
  // contexto de la revisión (fechas, auditor(es), evaluado(s), observaciones
  // y adjuntos) y se navega directo al checklist de esa habilitación.
  async function habilitar() {
    if (!habilitando) return
    if (!fechaInicio || !fechaFinal) {
      setErrorHabilitar('La fecha de inicio y la fecha final son obligatorias.')
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
        comentarios_habilitacion: comentarios || null,
        requiere_plan_accion: requierePlanAccion,
        plan_accion_titulo: requierePlanAccion ? planAccionTitulo : null,
        plan_accion_descripcion: requierePlanAccion ? planAccionDescripcion : null,
      })
      .eq('id', habilitando.id)
    if (error) {
      setGuardandoHabilitar(false)
      setErrorHabilitar(error.message)
      return
    }

    const { data: habilitacion, error: errorHab } = await supabase
      .from('habilitaciones_novedades')
      .upsert(
        {
          autoevaluacion_id: habilitando.id,
          fecha_inicio: fechaInicio,
          fecha_final: fechaFinal,
          auditores,
          evaluados,
          observaciones: comentarios || null,
          creado_por: perfil?.id,
        },
        { onConflict: 'autoevaluacion_id' },
      )
      .select('id')
      .single()
    if (errorHab || !habilitacion) {
      setGuardandoHabilitar(false)
      setErrorHabilitar(errorHab?.message ?? 'No se pudo crear el registro de Novedades.')
      return
    }

    for (const archivo of adjuntos) {
      const ruta = `${habilitacion.id}/${Date.now()}-${archivo.name}`
      const { error: errorSubida } = await supabase.storage.from('novedades-adjuntos').upload(ruta, archivo)
      if (!errorSubida) {
        await supabase
          .from('habilitaciones_novedades_adjuntos')
          .insert({ habilitacion_id: habilitacion.id, nombre_archivo: archivo.name, ruta, subido_por: perfil?.id })
      }
    }

    setGuardandoHabilitar(false)
    setHabilitando(null)
    navigate(`/novedades/${habilitacion.id}`)
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
                        {f.habilitada && f.habilitacion_novedades?.[0] && (
                          <button
                            onClick={() => navigate(`/novedades/${f.habilitacion_novedades![0].id}`)}
                            title="Ir a Novedades"
                            className="text-amber-600 hover:text-amber-800"
                          >
                            <FileWarning size={15} />
                          </button>
                        )}
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
                              // TEMPORAL (pedido 2026-09-03, punto 4): se deja el ícono
                              // siempre activo para poder probar el módulo de Novedades
                              // sin tener que finalizar una auto-evaluación completa.
                              // Restaurar luego: disabled={f.estado !== 'finalizada'}
                              title="Habilitar"
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

      <Modal open={!!habilitando} onClose={() => setHabilitando(null)} titulo="Habilitar auto-evaluación" ancho="max-w-2xl">
        <p className="mb-4 text-xs text-slate-600">
          Auto-evaluación de <strong>{habilitando && nombreServicio(habilitando)}</strong> del {habilitando?.fecha}. Al
          habilitar se abre el módulo de <strong>Novedades</strong> para esta auto-evaluación.
        </p>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="mb-1 block font-medium text-slate-600">Fecha de inicio de la auto-evaluación</span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="campo"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium text-slate-600">Fecha final de la auto-evaluación</span>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="campo"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ListaNombres etiqueta="Auditor(es)" valores={auditores} onCambiar={setAuditores} />
            <ListaNombres etiqueta="Persona(s) evaluada(s)" valores={evaluados} onCambiar={setEvaluados} />
          </div>

          <label className="text-xs">
            <span className="mb-1 block font-medium text-slate-600">Observaciones</span>
            <textarea value={comentarios} onChange={(e) => setComentarios(e.target.value)} className="campo" rows={2} />
          </label>

          <label className="text-xs">
            <span className="mb-1 block font-medium text-slate-600">Adjuntos</span>
            <input
              type="file"
              multiple
              onChange={(e) => setAdjuntos((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              className="campo"
            />
            {adjuntos.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {adjuntos.map((a, i) => (
                  <li key={`${a.name}-${i}`} className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1 truncate">
                      <Paperclip size={11} className="shrink-0" />
                      {a.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdjuntos((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-slate-400 hover:text-red-600"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
