import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, X, MinusCircle, Loader2, ArrowLeft, FileDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { calcularAvance, type Avance, type Respuesta } from '../lib/calculos'
import { Boton, Card, Modal, PageHeader, Spinner } from '../components/ui/ui'

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
  item: string | null
  criterio: string
  estandar: string
  complejidad: string
  modalidad: string | null
  // Numeral oficial del Servicio/Grupo en la Res.1732 (columna I del Excel,
  // ej. "5" para criterios universales, "6.2.17" para el propio de un
  // servicio) — es el número que se antepone al Item al mostrar el criterio.
  numeral_servicio: string
}

// La numeración de "Item" se reinicia dentro de cada Estándar (ej. hay un
// "1." en Talento Humano y OTRO "1." distinto en Infraestructura) — agrupar
// solo por el número de item colisiona entre estándares. Se agrupa por
// Estándar (7 categorías reales, sin colisión); el número de item se sigue
// mostrando por fila (FilaCriterio).
const COLORES_ESTANDAR: Record<string, { borde: string; fondo: string; texto: string; badge: string }> = {
  'Estándar de Talento Humano': { borde: 'border-blue-500', fondo: 'bg-blue-50', texto: 'text-blue-700', badge: 'bg-blue-600' },
  'Estándar de Infraestructura': { borde: 'border-amber-500', fondo: 'bg-amber-50', texto: 'text-amber-700', badge: 'bg-amber-600' },
  'Estándar de Dotación': { borde: 'border-emerald-500', fondo: 'bg-emerald-50', texto: 'text-emerald-700', badge: 'bg-emerald-600' },
  'Estándar de Medicamentos, Dispositivos Médicos, Insumos y Otras Tecnologías en Salud': { borde: 'border-purple-500', fondo: 'bg-purple-50', texto: 'text-purple-700', badge: 'bg-purple-600' },
  'Estándar de Procesos Prioritarios': { borde: 'border-rose-500', fondo: 'bg-rose-50', texto: 'text-rose-700', badge: 'bg-rose-600' },
  'Estándar de Historia Clínica y Registros': { borde: 'border-cyan-500', fondo: 'bg-cyan-50', texto: 'text-cyan-700', badge: 'bg-cyan-600' },
  'Estándar de Interdependencia': { borde: 'border-orange-500', fondo: 'bg-orange-50', texto: 'text-orange-700', badge: 'bg-orange-600' },
}
const COLOR_ESTANDAR_DEFECTO = { borde: 'border-slate-400', fondo: 'bg-slate-50', texto: 'text-slate-700', badge: 'bg-slate-600' }
function colorDeEstandar(estandar: string) {
  return COLORES_ESTANDAR[estandar] ?? COLOR_ESTANDAR_DEFECTO
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
  const [exportando, setExportando] = useState(false)
  const [confirmarSalir, setConfirmarSalir] = useState(false)
  const [duplicado, setDuplicado] = useState<{ id: string; estado: 'borrador' | 'finalizada'; fecha: string } | null>(
    null,
  )
  const [verificandoDuplicado, setVerificandoDuplicado] = useState(false)

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

    // Las opciones del filtro salen SOLO de los criterios propios del
    // servicio elegido (no de los universales "Todo los servicios") — los
    // universales igual se incluyen siempre al listar criterios (ver
    // buscarCriterios), pero no deben inflar las opciones del desplegable.
    const { data } = await supabase
      .from('criterios_res1732')
      .select('modalidad, complejidad')
      .eq('servicio_res1732_id', servicioId)
    const mods = Array.from(new Set((data ?? []).map((r) => r.modalidad).filter(Boolean))) as string[]
    const comps = Array.from(new Set((data ?? []).map((r) => r.complejidad).filter(Boolean))) as string[]
    setModalidades(mods.sort())
    setComplejidades(comps.sort())
  }

  async function buscarCriterios(servicioId: number, modalidad: string, complejidad: string) {
    setCargandoCriterios(true)
    const universalId = await obtenerServicioUniversalId()
    const columnas = 'id, numero, item, criterio, estandar, complejidad, modalidad, numeral_servicio'

    // Propios del servicio: el filtro de Modalidad/Complejidad aplica, con
    // "Todas"/"No aplica"/vacío como comodín (confirmado con el cliente).
    let propios = supabase.from('criterios_res1732').select(columnas).eq('servicio_res1732_id', servicioId)
    if (modalidad !== TODAS) {
      propios = propios.or(`modalidad.eq.${modalidad},modalidad.is.null`)
    }
    if (complejidad !== TODAS) {
      propios = propios.or(`complejidad.eq.${complejidad},complejidad.eq.Todas,complejidad.eq.No aplica`)
    }

    // Universales ("Todo los servicios"): se incluyen SIEMPRE completos,
    // sin filtrar por Modalidad/Complejidad (confirmado con el cliente).
    const universales = universalId
      ? supabase.from('criterios_res1732').select(columnas).eq('servicio_res1732_id', universalId)
      : null

    const [{ data: dataPropios }, universalesResp] = await Promise.all([
      propios,
      universales ?? Promise.resolve({ data: [] as Criterio[] }),
    ])
    const dataUniversales = (universalesResp as { data: Criterio[] | null }).data ?? []

    const todos = [...(dataPropios ?? []), ...dataUniversales].sort((a, b) => a.numero - b.numero)
    setCriterios(todos)
    setCargandoCriterios(false)
  }

  async function iniciar() {
    if (!empresaId || !sedeId || !servicioResId || !perfil) return
    if (autoevaluacionId) {
      await buscarCriterios(servicioResId, modalidadFiltro, complejidadFiltro)
      setPaso('responder')
      return
    }

    // Antes de crear una nueva, verificar si ya existe una auto-evaluación
    // con la misma Empresa+Sede+Servicio (borrador o finalizada).
    setVerificandoDuplicado(true)
    const { data: existente } = await supabase
      .from('autoevaluaciones')
      .select('id, estado, fecha')
      .eq('empresa_id', empresaId)
      .eq('sede_id', sedeId)
      .eq('servicio_res1732_id', servicioResId)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
    setVerificandoDuplicado(false)

    if (existente) {
      setDuplicado(existente as { id: string; estado: 'borrador' | 'finalizada'; fecha: string })
      return
    }

    await crearAutoevaluacion()
  }

  async function crearAutoevaluacion() {
    if (!empresaId || !sedeId || !servicioResId || !perfil) return
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

  async function eliminarDuplicadoYCrearNueva() {
    if (!duplicado) return
    await supabase.from('autoevaluaciones').delete().eq('id', duplicado.id)
    setDuplicado(null)
    await crearAutoevaluacion()
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

  const grupos = useMemo(() => {
    const mapa = new Map<string, Criterio[]>()
    for (const c of criterios) {
      if (!mapa.has(c.estandar)) mapa.set(c.estandar, [])
      mapa.get(c.estandar)!.push(c)
    }
    return Array.from(mapa.entries()).map(([clave, items], i) => ({ clave, items, numero: i + 1 }))
  }, [criterios])

  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})

  // Al entrar (o cambiar de servicio) los grupos arrancan contraídos — el
  // usuario los expande a demanda con los chips o "Expandir todo".
  useEffect(() => {
    const todos: Record<string, boolean> = {}
    for (const g of grupos) todos[g.clave] = true
    setGruposColapsados(todos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterios])

  function alternarGrupo(clave: string) {
    setGruposColapsados((prev) => ({ ...prev, [clave]: !prev[clave] }))
  }

  function expandirTodo() {
    setGruposColapsados({})
  }

  function contraerTodo() {
    const todos: Record<string, boolean> = {}
    for (const g of grupos) todos[g.clave] = true
    setGruposColapsados(todos)
  }

  function irAGrupo(clave: string, numero: number) {
    setGruposColapsados((prev) => ({ ...prev, [clave]: false }))
    document.getElementById(`grupo-${numero}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  async function exportarExcel() {
    setExportando(true)
    try {
      const { exportarAutoevaluacionExcel } = await import('../lib/exportarAutoevaluacion')
      await exportarAutoevaluacionExcel({
        empresa: empresas.find((e) => e.id === empresaId)?.nombre ?? '—',
        sede: sedes.find((s) => s.id === sedeId)?.nombre ?? '—',
        lugar,
        fecha,
        servicio: servicioSeleccionado?.nombre ?? '—',
        modalidad: modalidadFiltro,
        complejidad: complejidadFiltro,
        estado,
        pctCumple: avance.pctCumple,
        pctNoCumple: avance.pctNoCumple,
        pctNoAplica: avance.pctNoAplica,
        diligenciados: avance.diligenciados,
        total: avance.total,
        grupos: grupos.map((g) => ({
          estandar: g.clave,
          items: g.items.map((c) => ({
            numeroMostrado: `${c.numeral_servicio}.${c.item ?? c.numero}`,
            criterio: c.criterio,
            respuesta: respuestas[c.id]?.respuesta ?? null,
            observacion: respuestas[c.id]?.observacion ?? '',
          })),
        })),
        logoUrl: `${import.meta.env.BASE_URL}images/logo_cacsb2.png`,
      })
    } finally {
      setExportando(false)
    }
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
          <div className="mt-6 flex gap-2">
            <Boton variante="secundario" onClick={() => navigate('/')} className="flex-1">
              Cancelar
            </Boton>
            <Boton
              onClick={iniciar}
              disabled={!empresaId || !sedeId || !servicioResId || verificandoDuplicado}
              className="flex-1"
            >
              {verificandoDuplicado ? 'Verificando…' : 'Continuar'}
            </Boton>
          </div>
        </Card>

        <Modal
          open={!!duplicado}
          onClose={() => setDuplicado(null)}
          titulo={duplicado?.estado === 'borrador' ? 'Ya existe un borrador' : 'Ya existe una auto-evaluación finalizada'}
        >
          {duplicado?.estado === 'borrador' ? (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Ya hay un borrador (del {duplicado.fecha}) para este mismo Servicio, Sede y Empresa. ¿Deseas
                continuarlo, o eliminarlo y empezar uno nuevo?
              </p>
              <div className="flex flex-col gap-2">
                <Boton onClick={() => navigate(`/nueva/${duplicado.id}`)} className="w-full">
                  Continuar el borrador existente
                </Boton>
                <Boton variante="peligro" onClick={eliminarDuplicadoYCrearNueva} className="w-full">
                  Eliminarlo y crear una nueva
                </Boton>
                <Boton variante="secundario" onClick={() => setDuplicado(null)} className="w-full">
                  Cancelar
                </Boton>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Ya existe una auto-evaluación finalizada (del {duplicado?.fecha}) para este mismo Servicio, Sede y
                Empresa.
              </p>
              <div className="flex flex-col gap-2">
                <Boton onClick={() => navigate(`/nueva/${duplicado?.id}`)} className="w-full">
                  Ver la existente
                </Boton>
                <Boton onClick={crearAutoevaluacion} className="w-full">
                  Crear una nueva de todas formas
                </Boton>
                <Boton
                  variante="peligro"
                  onClick={() => duplicado && eliminarDuplicadoYCrearNueva()}
                  className="w-full"
                >
                  Eliminarla y crear una nueva
                </Boton>
                <Boton variante="secundario" onClick={() => setDuplicado(null)} className="w-full">
                  Cancelar
                </Boton>
              </div>
            </>
          )}
        </Modal>
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          onClick={() => (estado === 'borrador' ? setConfirmarSalir(true) : navigate('/'))}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-azul"
        >
          <ArrowLeft size={16} /> {estado === 'borrador' ? 'Salir' : 'Volver al dashboard'}
        </button>
        <button
          onClick={exportarExcel}
          disabled={exportando || criterios.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown size={15} />
          {exportando ? 'Exportando…' : 'Exportar Excel'}
        </button>
      </div>

      <Modal open={confirmarSalir} onClose={() => setConfirmarSalir(false)} titulo="Salir de la auto-evaluación">
        <p className="mb-4 text-sm text-slate-600">
          Tu progreso ({avance.diligenciados}/{avance.total} criterios) ya está guardado como{' '}
          <strong>borrador</strong>. Puedes continuarlo más tarde desde el Dashboard o Auto-Evaluaciones.
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setConfirmarSalir(false)} className="flex-1">
            Seguir diligenciando
          </Boton>
          <Boton onClick={() => navigate('/')} className="flex-1">
            Salir y guardar borrador
          </Boton>
        </div>
      </Modal>

      <div className="sticky top-0 z-10 mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-azul">{servicioSeleccionado?.nombre}</div>
            <div className="truncate text-xs text-slate-500">
              {empresas.find((e) => e.id === empresaId)?.nombre ?? '—'} · {sedes.find((s) => s.id === sedeId)?.nombre ?? '—'} ·{' '}
              {lugar || 'Sin lugar'} · {fecha} · Modalidad: {modalidadFiltro} · Complejidad: {complejidadFiltro}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <AnilloAvance avance={avance} />
            <div className="text-xs leading-tight">
              <div className="font-medium text-slate-600">
                {avance.diligenciados}/{avance.total}
              </div>
              <div className="text-emerald-600">✔ {avance.pctCumple}%</div>
              <div className="text-red-600">✘ {avance.pctNoCumple}%</div>
              <div className="text-slate-500">⊘ {avance.pctNoAplica}%</div>
            </div>
            {estado === 'finalizada' && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Finalizada
              </span>
            )}
          </div>
        </div>
        {(servicioSeleccionado?.descripcion || servicioSeleccionado?.estructura) && (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-medium text-azul2">Ver descripción del servicio</summary>
            {servicioSeleccionado?.descripcion && (
              <p className="mt-1 text-xs text-slate-600">{servicioSeleccionado.descripcion}</p>
            )}
            {servicioSeleccionado?.estructura && (
              <p className="mt-1 text-xs text-slate-500">{servicioSeleccionado.estructura}</p>
            )}
          </details>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {grupos.map((g) => {
            const color = colorDeEstandar(g.clave)
            return (
              <button
                key={g.clave}
                onClick={() => irAGrupo(g.clave, g.numero)}
                className={`rounded-md px-2 py-1 text-xs font-medium ${color.fondo} ${color.texto} hover:opacity-75`}
                title={g.clave}
              >
                {g.numero}. {g.clave.replace('Estándar de ', '')}
              </button>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-slate-200 pl-2">
          <button onClick={expandirTodo} className="rounded-md px-2 py-1 text-xs font-medium text-azul2 hover:bg-slate-100">
            Expandir todo
          </button>
          <button onClick={contraerTodo} className="rounded-md px-2 py-1 text-xs font-medium text-azul2 hover:bg-slate-100">
            Contraer todo
          </button>
        </div>
      </div>

      {cargandoCriterios ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((g) => {
            const colapsado = !!gruposColapsados[g.clave]
            const color = colorDeEstandar(g.clave)
            const diligenciados = g.items.filter((c) => !!respuestas[c.id]?.respuesta).length
            const pendientes = g.items.length - diligenciados
            return (
              <div key={g.clave} id={`grupo-${g.numero}`} className="scroll-mt-24">
                <button
                  onClick={() => alternarGrupo(g.clave)}
                  className={`flex w-full items-center gap-2 rounded-lg border-l-4 ${color.borde} ${color.fondo} px-3 py-2 text-left`}
                >
                  <span className={`rounded ${color.badge} px-2 py-0.5 text-xs font-bold text-white`}>
                    {g.numero}
                  </span>
                  <span className={`flex-1 truncate text-sm font-medium ${color.texto}`}>{g.clave}</span>
                  <span className="hidden shrink-0 items-center gap-2 text-xs text-slate-500 sm:flex">
                    <span title="Total de preguntas">{g.items.length} preguntas</span>
                    <span className="text-emerald-600" title="Diligenciadas">
                      {diligenciados} diligenciadas
                    </span>
                    <span className="text-amber-600" title="Pendientes">
                      {pendientes} pendientes
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {colapsado ? 'Expandir' : 'Contraer'}
                  </span>
                </button>
                {!colapsado && (
                  <div className="mt-2 flex flex-col gap-2 pl-2">
                    {g.items.map((c) => (
                      <FilaCriterio
                        key={c.id}
                        criterio={c}
                        color={color}
                        respuesta={respuestas[c.id]}
                        soloLectura={estado === 'finalizada'}
                        guardando={guardando === c.id}
                        onResponder={(r) => responder(c.id, r)}
                        onObservacion={(obs) => guardarObservacion(c.id, obs)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
  color,
  respuesta,
  soloLectura,
  guardando,
  onResponder,
  onObservacion,
}: {
  criterio: Criterio
  color: { borde: string; fondo: string; texto: string; badge: string }
  respuesta?: RespuestaLocal
  soloLectura: boolean
  guardando: boolean
  onResponder: (r: Respuesta) => void
  onObservacion: (obs: string) => void
}) {
  const botones: { valor: Respuesta; icono: ReactNode; activo: string; label: string }[] = [
    { valor: 'cumple', icono: <Check size={14} />, activo: 'border-emerald-600 bg-emerald-600 text-white', label: 'Cumple' },
    { valor: 'no_cumple', icono: <X size={14} />, activo: 'border-red-600 bg-red-600 text-white', label: 'No Cumple' },
    { valor: 'no_aplica', icono: <MinusCircle size={14} />, activo: 'border-slate-500 bg-slate-500 text-white', label: 'No Aplica' },
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
    <div className={`rounded-xl border border-slate-200 ${tintFondo} p-3.5 shadow-sm transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 shrink-0 items-center justify-center rounded-md px-2 text-xs font-bold tabular-nums text-white ${color.badge}`}
        >
          {criterio.numeral_servicio}.{criterio.item ?? criterio.numero}
        </span>
        <div className="flex-1 text-sm leading-relaxed text-slate-700">{criterio.criterio}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {guardando && <Loader2 size={14} className="animate-spin text-slate-400" />}
        <div className="flex shrink-0 items-center gap-1.5">
          {botones.map((b) => (
            <button
              key={b.valor}
              disabled={soloLectura}
              onClick={() => onResponder(b.valor)}
              title={b.label}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                respuesta?.respuesta === b.valor
                  ? b.activo
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {b.icono}
              {b.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Observación (opcional)"
          disabled={soloLectura}
          defaultValue={respuesta?.observacion ?? ''}
          onBlur={(e) => onObservacion(e.target.value)}
          className="campo min-w-[180px] flex-1 text-xs"
        />
      </div>
    </div>
  )
}

// Anillo de progreso: un segmento por cada tipo de respuesta, proporcional
// al % sobre el total de criterios (el resto del aro queda gris = pendiente).
function AnilloAvance({ avance }: { avance: Avance }) {
  const size = 56
  const grosor = 7
  const radio = (size - grosor) / 2
  const circunferencia = 2 * Math.PI * radio
  const segmentos = [
    { pct: avance.pctCumple, color: '#059669' },
    { pct: avance.pctNoCumple, color: '#dc2626' },
    { pct: avance.pctNoAplica, color: '#64748b' },
  ]
  let acumulado = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radio} stroke="#e2e8f0" strokeWidth={grosor} fill="none" />
        {segmentos.map((s, i) => {
          if (s.pct <= 0) return null
          const largo = (s.pct / 100) * circunferencia
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radio}
              stroke={s.color}
              strokeWidth={grosor}
              fill="none"
              strokeDasharray={`${largo} ${circunferencia - largo}`}
              strokeDashoffset={-acumulado}
            />
          )
          acumulado += largo
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-azul">
        {avance.pctCumple}%
      </div>
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
