import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, X, MinusCircle, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { calcularAvance, type Respuesta } from '../lib/calculos'
import { Boton, Card, PageHeader, Spinner } from '../components/ui/ui'

type Empresa = { id: number; nombre: string }
type Sede = { id: number; nombre: string; empresa_id: number }
type ServicioRes1732 = {
  id: number
  nombre: string
  descripcion: string | null
  estructura: string | null
  grupo_res1732_id: number
  grupo_res1732: { nombre: string } | null
}
type Criterio = {
  id: number
  numero: number
  criterio: string
  estandar: string
  complejidad: string
  modalidad: string | null
}
type RespuestaLocal = { respuesta: Respuesta; observacion: string; respuestaId?: number }
type Compromiso = {
  respuestaId: number
  descripcion_actividad: string
  responsable: string
  fecha_compromiso: string
  archivo?: File
  guardado: boolean
}

const TODAS = 'Todas'

let universalIdCache: number | null = null
async function obtenerServicioUniversalId() {
  if (universalIdCache) return universalIdCache
  const { data } = await supabase.from('servicios_res1732').select('id').eq('numeral', '5').single()
  universalIdCache = data?.id ?? null
  return universalIdCache
}

export default function NuevaAutoevaluacion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()

  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [paso, setPaso] = useState<'cabecera' | 'responder' | 'cierre'>('cabecera')

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  // Servicio = columna G del Excel (39 valores reales, tabla servicios_res1732).
  const [serviciosRes, setServiciosRes] = useState<ServicioRes1732[]>([])

  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [sedeId, setSedeId] = useState<number | null>(null)
  const [lugar, setLugar] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [servicioResId, setServicioResId] = useState<number | null>(null)

  const [modalidades, setModalidades] = useState<string[]>([])
  const [complejidades, setComplejidades] = useState<string[]>([])
  const [modalidadFiltro, setModalidadFiltro] = useState(TODAS)
  const [complejidadFiltro, setComplejidadFiltro] = useState(TODAS)

  const [autoevaluacionId, setAutoevaluacionId] = useState<string | null>(id ?? null)
  const [estado, setEstado] = useState<'borrador' | 'finalizada'>('borrador')
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaLocal>>({})
  const [guardando, setGuardando] = useState<number | null>(null)
  const [cargandoCriterios, setCargandoCriterios] = useState(false)

  const [compromisos, setCompromisos] = useState<Record<number, Compromiso>>({})
  const [enviandoCierre, setEnviandoCierre] = useState(false)

  const servicioSeleccionado = serviciosRes.find((s) => s.id === servicioResId)

  useEffect(() => {
    cargarCatalogos()
  }, [])

  useEffect(() => {
    if (id) cargarDraftExistente(id)
    else setCargandoInicial(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function cargarCatalogos() {
    const [{ data: emp }, { data: sed }, { data: sr }] = await Promise.all([
      supabase.from('empresas').select('*').order('nombre'),
      supabase.from('sedes').select('*').order('nombre'),
      supabase
        .from('servicios_res1732')
        .select('id, nombre, descripcion, estructura, grupo_res1732_id, grupo_res1732:grupos_res1732(nombre)')
        .neq('numeral', '5')
        .order('nombre'),
    ])
    setEmpresas((emp as Empresa[]) ?? [])
    setSedes((sed as Sede[]) ?? [])
    setServiciosRes((sr as unknown as ServicioRes1732[]) ?? [])
    if (emp && emp.length > 0) setEmpresaId(emp[0].id)
  }

  async function cargarDraftExistente(autoevalId: string) {
    const { data: cab } = await supabase.from('autoevaluaciones').select('*').eq('id', autoevalId).single()
    if (!cab) {
      setCargandoInicial(false)
      return
    }
    setAutoevaluacionId(cab.id)
    setEmpresaId(cab.empresa_id)
    setSedeId(cab.sede_id)
    setLugar(cab.lugar ?? '')
    setFecha(cab.fecha)
    setServicioResId(cab.servicio_res1732_id)
    setModalidadFiltro(cab.modalidad_filtro ?? TODAS)
    setComplejidadFiltro(cab.complejidad_filtro ?? TODAS)
    setEstado(cab.estado)

    const { data: resp } = await supabase
      .from('autoevaluaciones_respuestas')
      .select('id, criterio_id, respuesta, observacion')
      .eq('autoevaluacion_id', autoevalId)
    const mapa: Record<number, RespuestaLocal> = {}
    for (const r of resp ?? []) {
      mapa[r.criterio_id] = { respuesta: r.respuesta, observacion: r.observacion ?? '', respuestaId: r.id }
    }
    setRespuestas(mapa)

    await buscarCriterios(cab.servicio_res1732_id, cab.modalidad_filtro ?? TODAS, cab.complejidad_filtro ?? TODAS)
    setPaso('responder')
    setCargandoInicial(false)
  }

  async function alSeleccionarServicio(servicioId: number) {
    setServicioResId(servicioId)
    setModalidadFiltro(TODAS)
    setComplejidadFiltro(TODAS)

    const universalId = await obtenerServicioUniversalId()
    const { data } = await supabase
      .from('criterios_res1732')
      .select('modalidad, complejidad')
      .in('servicio_res1732_id', [servicioId, universalId].filter(Boolean) as number[])
    const mods = Array.from(new Set((data ?? []).map((r) => r.modalidad).filter(Boolean))) as string[]
    const comps = Array.from(new Set((data ?? []).map((r) => r.complejidad).filter(Boolean))) as string[]
    setModalidades(mods.sort())
    setComplejidades(comps.sort())
  }

  async function buscarCriterios(servicioId: number, modalidad: string, complejidad: string) {
    setCargandoCriterios(true)
    const universalId = await obtenerServicioUniversalId()
    const idsServicio = [servicioId, universalId].filter(Boolean) as number[]

    let query = supabase
      .from('criterios_res1732')
      .select('id, numero, criterio, estandar, complejidad, modalidad')
      .in('servicio_res1732_id', idsServicio)
      .order('numero')

    if (modalidad !== TODAS) {
      query = query.or(`modalidad.eq.${modalidad},modalidad.is.null`)
    }
    if (complejidad !== TODAS) {
      query = query.or(`complejidad.eq.${complejidad},complejidad.eq.Todas,complejidad.eq.No aplica`)
    }

    const { data } = await query
    setCriterios((data as Criterio[]) ?? [])
    setCargandoCriterios(false)
  }

  async function iniciar() {
    if (!empresaId || !sedeId || !servicioResId || !perfil) return
    if (autoevaluacionId) {
      await buscarCriterios(servicioResId, modalidadFiltro, complejidadFiltro)
      setPaso('responder')
      return
    }
    const { data, error } = await supabase
      .from('autoevaluaciones')
      .insert({
        empresa_id: empresaId,
        sede_id: sedeId,
        lugar,
        fecha,
        usuario_id: perfil.id,
        servicio_res1732_id: servicioResId,
        modalidad_filtro: modalidadFiltro === TODAS ? null : modalidadFiltro,
        complejidad_filtro: complejidadFiltro === TODAS ? null : complejidadFiltro,
        estado: 'borrador',
      })
      .select()
      .single()
    if (error || !data) return
    setAutoevaluacionId(data.id)
    await buscarCriterios(servicioResId, modalidadFiltro, complejidadFiltro)
    setPaso('responder')
  }

  async function responder(criterioId: number, respuesta: Respuesta) {
    if (!autoevaluacionId) return
    setGuardando(criterioId)
    const observacion = respuestas[criterioId]?.observacion ?? ''
    const { data, error } = await supabase
      .from('autoevaluaciones_respuestas')
      .upsert(
        { autoevaluacion_id: autoevaluacionId, criterio_id: criterioId, respuesta, observacion },
        { onConflict: 'autoevaluacion_id,criterio_id' },
      )
      .select()
      .single()
    setGuardando(null)
    if (error || !data) return
    setRespuestas((prev) => ({
      ...prev,
      [criterioId]: { respuesta, observacion, respuestaId: data.id },
    }))
  }

  async function guardarObservacion(criterioId: number, observacion: string) {
    setRespuestas((prev) => ({
      ...prev,
      [criterioId]: { ...prev[criterioId], observacion, respuesta: prev[criterioId]?.respuesta },
    }))
    if (!autoevaluacionId || !respuestas[criterioId]?.respuesta) return
    await supabase
      .from('autoevaluaciones_respuestas')
      .update({ observacion })
      .eq('autoevaluacion_id', autoevaluacionId)
      .eq('criterio_id', criterioId)
  }

  const avance = useMemo(() => {
    const respMap: Record<number, Respuesta> = {}
    for (const [k, v] of Object.entries(respuestas)) respMap[Number(k)] = v.respuesta
    return calcularAvance(criterios.length, respMap)
  }, [criterios, respuestas])

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

  if (cargandoInicial) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (paso === 'cabecera') {
    return (
      <div>
        <PageHeader titulo="Nueva auto-evaluación" />
        <Card className="mx-auto max-w-2xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Empresa">
              <select
                value={empresaId ?? ''}
                onChange={(e) => setEmpresaId(Number(e.target.value))}
                className="campo"
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Sede">
              <select value={sedeId ?? ''} onChange={(e) => setSedeId(Number(e.target.value))} className="campo">
                <option value="">Selecciona…</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Lugar">
              <input value={lugar} onChange={(e) => setLugar(e.target.value)} className="campo" />
            </Campo>
            <Campo label="Fecha">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="campo" />
            </Campo>
            <Campo label="Servicio" className="sm:col-span-2">
              <select
                value={servicioResId ?? ''}
                onChange={(e) => alSeleccionarServicio(Number(e.target.value))}
                className="campo"
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
                <div className="campo bg-slate-50 text-slate-500">
                  {servicioSeleccionado.grupo_res1732?.nombre ?? '—'}
                </div>
              </Campo>
            )}
            <Campo label="Modalidad">
              <select value={modalidadFiltro} onChange={(e) => setModalidadFiltro(e.target.value)} className="campo">
                <option value={TODAS}>Todas</option>
                {modalidades.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Complejidad">
              <select
                value={complejidadFiltro}
                onChange={(e) => setComplejidadFiltro(e.target.value)}
                className="campo"
              >
                <option value={TODAS}>Todas</option>
                {complejidades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Boton onClick={iniciar} disabled={!empresaId || !sedeId || !servicioResId} className="mt-6 w-full">
            Continuar
          </Boton>
        </Card>
      </div>
    )
  }

  if (paso === 'cierre') {
    return (
      <div>
        <PageHeader titulo={`Plan de acción — ${servicioSeleccionado?.nombre ?? ''}`} />
        <Card className="mx-auto max-w-2xl">
          <p className="mb-4 text-sm text-slate-600">
            Se encontraron {noCumpleSinCompromiso.length} criterios "No Cumple". Registra una actividad por cada uno
            para poder finalizar.
          </p>
          <div className="flex flex-col gap-5">
            {noCumpleSinCompromiso.map((nc) => {
              const c = compromisos[nc.respuestaId]
              return (
                <div key={nc.respuestaId} className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                  <div className="mb-2 text-sm font-medium text-slate-700">
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
      <button
        onClick={() => navigate('/')}
        className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-azul"
      >
        <ArrowLeft size={16} /> Volver al dashboard
      </button>

      <Card className="mb-4">
        <div className="text-lg font-bold text-azul">{servicioSeleccionado?.nombre}</div>
        {servicioSeleccionado?.descripcion && (
          <p className="mt-1 text-sm text-slate-600">{servicioSeleccionado.descripcion}</p>
        )}
        {servicioSeleccionado?.estructura && (
          <p className="mt-2 text-xs text-slate-500">{servicioSeleccionado.estructura}</p>
        )}
      </Card>

      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-slate-600">
          Avance: {avance.diligenciados}/{avance.total}
        </span>
        <span className="text-sm text-emerald-600">✔ {avance.pctCumple}%</span>
        <span className="text-sm text-red-600">✘ {avance.pctNoCumple}%</span>
        <span className="text-sm text-slate-500">⊘ {avance.pctNoAplica}%</span>
        {estado === 'finalizada' && (
          <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Finalizada
          </span>
        )}
      </div>

      {cargandoCriterios ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {criterios.map((c) => (
            <FilaCriterio
              key={c.id}
              criterio={c}
              respuesta={respuestas[c.id]}
              soloLectura={estado === 'finalizada'}
              guardando={guardando === c.id}
              onResponder={(r) => responder(c.id, r)}
              onObservacion={(obs) => guardarObservacion(c.id, obs)}
            />
          ))}
        </div>
      )}

      {estado !== 'finalizada' && (
        <div className="mt-6 flex justify-end">
          <Boton onClick={alIntentarFinalizar}>Finalizar auto-evaluación</Boton>
        </div>
      )}
    </div>
  )
}

function FilaCriterio({
  criterio,
  respuesta,
  soloLectura,
  guardando,
  onResponder,
  onObservacion,
}: {
  criterio: Criterio
  respuesta?: RespuestaLocal
  soloLectura: boolean
  guardando: boolean
  onResponder: (r: Respuesta) => void
  onObservacion: (obs: string) => void
}) {
  const botones: { valor: Respuesta; icono: ReactNode; activo: string; label: string }[] = [
    { valor: 'cumple', icono: <Check size={16} />, activo: 'bg-emerald-600 text-white', label: 'Cumple' },
    { valor: 'no_cumple', icono: <X size={16} />, activo: 'bg-red-600 text-white', label: 'No Cumple' },
    { valor: 'no_aplica', icono: <MinusCircle size={16} />, activo: 'bg-slate-500 text-white', label: 'No Aplica' },
  ]
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 text-sm text-slate-700">
          <span className="font-medium">{criterio.numero}.</span> {criterio.criterio}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {guardando && <Loader2 size={16} className="animate-spin text-slate-400" />}
          {botones.map((b) => (
            <button
              key={b.valor}
              disabled={soloLectura}
              onClick={() => onResponder(b.valor)}
              title={b.label}
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed ${
                respuesta?.respuesta === b.valor
                  ? b.activo
                  : 'border-slate-300 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {b.icono}
            </button>
          ))}
        </div>
      </div>
      <input
        placeholder="Observación (opcional)"
        disabled={soloLectura}
        defaultValue={respuesta?.observacion ?? ''}
        onBlur={(e) => onObservacion(e.target.value)}
        className="campo mt-2 text-xs"
      />
    </div>
  )
}

function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
