import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Boton, Card, FilterBar, Modal, SelectorDesplegable, Spinner } from '../../components/ui/ui'
import { exportarCriteriosExcel, exportarServiciosExcel } from '../../lib/exportarCatalogo'
import { RESOLUCIONES, type ResolucionKey } from '../../domain/resoluciones'

const LOGO_URL = `${import.meta.env.BASE_URL}images/logo_cacsb2.png`

type Tab = 'servicios1732' | 'criterios1732' | 'servicios3100' | 'criterios3100' | 'empresas' | 'sedes' | 'periodicidades'

export default function Catalogos() {
  const [tab, setTab] = useState<Tab>('servicios1732')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <h1 className="text-lg font-semibold text-azul">Catálogos</h1>
        <div className="flex flex-wrap gap-1">
          <BotonTab activo={tab === 'servicios1732'} onClick={() => setTab('servicios1732')}>
            Servicios Res.1732
          </BotonTab>
          <BotonTab activo={tab === 'criterios1732'} onClick={() => setTab('criterios1732')}>
            Criterios Res.1732
          </BotonTab>
          <BotonTab activo={tab === 'servicios3100'} onClick={() => setTab('servicios3100')}>
            Servicios Res.3100
          </BotonTab>
          <BotonTab activo={tab === 'criterios3100'} onClick={() => setTab('criterios3100')}>
            Criterios Res.3100
          </BotonTab>
          <BotonTab activo={tab === 'empresas'} onClick={() => setTab('empresas')}>
            Empresas
          </BotonTab>
          <BotonTab activo={tab === 'sedes'} onClick={() => setTab('sedes')}>
            Sedes
          </BotonTab>
          <BotonTab activo={tab === 'periodicidades'} onClick={() => setTab('periodicidades')}>
            Periodicidad
          </BotonTab>
        </div>
      </div>

      {tab === 'servicios1732' && <ServiciosCatalogoTab resolucion="res1732" />}
      {tab === 'criterios1732' && <CriteriosCatalogoTab resolucion="res1732" />}
      {tab === 'servicios3100' && <ServiciosCatalogoTab resolucion="res3100" />}
      {tab === 'criterios3100' && <CriteriosCatalogoTab resolucion="res3100" />}
      {tab === 'empresas' && <EmpresasTab />}
      {tab === 'sedes' && <SedesTab />}
      {tab === 'periodicidades' && <PeriodicidadesTab />}
    </div>
  )
}

// Campo de filtro con ancho fijo (en vez de w-full) para que varios quepan
// en una sola línea de la FilterBar sin ocupar el ancho completo cada uno.
function CampoFiltro({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`shrink-0 text-sm ${className}`}>
      <span className="mb-1 block truncate font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function BotonTab({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        activo ? 'bg-azul text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

// ============================================================
// Servicios — catálogo genérico de la resolución (39 valores reales de la
// columna G en Res.1732; catálogo equivalente de servicios en Res.3100).
// Parametrizado por `resolucion` (pedido 2026-09-01, punto 3) en vez de
// duplicar el componente por cada resolución.
// ============================================================

type Grupo = { id: number; nombre: string }
type ServicioCatalogo = {
  id: number
  numeral: string
  nombre: string
  descripcion: string | null
  estructura: string | null
  grupo_id: number
  grupo: { nombre: string } | null
}

function ServiciosCatalogoTab({ resolucion }: { resolucion: ResolucionKey }) {
  const cfg = RESOLUCIONES[resolucion]
  const [servicios, setServicios] = useState<ServicioCatalogo[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<ServicioCatalogo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState<number | ''>('')
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolucion])

  async function cargar() {
    setCargando(true)
    const [{ data: sr }, { data: gr }] = await Promise.all([
      supabase
        .from(cfg.tablaServicios)
        .select(`id, numeral, nombre, descripcion, estructura, grupo_id:${cfg.columnaGrupoId}, grupo:${cfg.tablaGrupos}(nombre)`)
        .neq('numeral', cfg.numeralUniversal)
        .order('nombre'),
      supabase.from(cfg.tablaGrupos).select('id, nombre').neq('numeral', cfg.numeralUniversal).order('nombre'),
    ])
    setServicios((sr as unknown as ServicioCatalogo[]) ?? [])
    setGrupos((gr as Grupo[]) ?? [])
    setCargando(false)
  }

  const filtrados = servicios.filter((s) => {
    if (grupoFiltro && s.grupo_id !== grupoFiltro) return false
    if (busqueda && !s.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  async function exportarExcel() {
    setExportando(true)
    try {
      await exportarServiciosExcel({
        filtros: [
          ['Buscar servicio', busqueda || 'Todos'],
          ['Grupo', grupos.find((g) => g.id === grupoFiltro)?.nombre ?? 'Todos'],
        ],
        servicios: filtrados.map((s) => ({
          nombre: s.nombre,
          grupo: s.grupo?.nombre ?? '—',
          descripcion: s.descripcion ?? '',
          estructura: s.estructura ?? '',
        })),
        logoUrl: LOGO_URL,
        resolucionLabel: cfg.labelCorto,
      })
    } finally {
      setExportando(false)
    }
  }

  return (
    <Card>
      <p className="mb-4 text-xs text-slate-500">
        Catálogo de servicios de la {cfg.label} (tabla {cfg.tablaServicios}). Este es el catálogo que alimenta el
        selector "Servicio" al crear una auto-evaluación con esta resolución — no tiene Sede asociada, la Sede solo
        se captura al iniciar la auto-evaluación.
      </p>

      <FilterBar>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Buscar servicio</span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Grupo</span>
          <select
            value={grupoFiltro}
            onChange={(e) => setGrupoFiltro(e.target.value ? Number(e.target.value) : '')}
            className="campo"
          >
            <option value="">Todos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <Boton
          variante="secundario"
          onClick={() => {
            setBusqueda('')
            setGrupoFiltro('')
          }}
          disabled={!busqueda && !grupoFiltro}
        >
          Limpiar filtros
        </Boton>
        <Boton variante="secundario" onClick={exportarExcel} disabled={exportando} className="ml-auto">
          {exportando ? 'Exportando…' : 'Exportar Excel'}
        </Boton>
      </FilterBar>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Servicio</th>
                <th className="py-2 pr-4">Grupo</th>
                <th className="py-2 pr-4">Descripción</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-4 font-medium text-slate-700">{s.nombre}</td>
                  <td className="py-2 pr-4">{s.grupo?.nombre ?? '—'}</td>
                  <td className="max-w-md truncate py-2 pr-4 text-slate-500">{s.descripcion ?? '—'}</td>
                  <td className="py-2 pr-4 text-right">
                    <button onClick={() => setEditando(s)} className="text-xs font-medium text-azul2 hover:underline">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalEditarServicioCatalogo
        resolucion={resolucion}
        registro={editando}
        grupos={grupos}
        onClose={() => setEditando(null)}
        onGuardado={cargar}
      />
    </Card>
  )
}

function ModalEditarServicioCatalogo({
  resolucion,
  registro,
  grupos,
  onClose,
  onGuardado,
}: {
  resolucion: ResolucionKey
  registro: ServicioCatalogo | null
  grupos: Grupo[]
  onClose: () => void
  onGuardado: () => void
}) {
  const cfg = RESOLUCIONES[resolucion]
  const [nombre, setNombre] = useState('')
  const [grupoId, setGrupoId] = useState<number | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [estructura, setEstructura] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (registro) {
      setNombre(registro.nombre)
      setGrupoId(registro.grupo_id)
      setDescripcion(registro.descripcion ?? '')
      setEstructura(registro.estructura ?? '')
    }
  }, [registro])

  async function guardar() {
    if (!registro || !nombre || !grupoId) return
    setGuardando(true)
    await supabase
      .from(cfg.tablaServicios)
      .update({ nombre, [cfg.columnaGrupoId]: grupoId, descripcion: descripcion || null, estructura: estructura || null })
      .eq('id', registro.id)
    setGuardando(false)
    onGuardado()
    onClose()
  }

  return (
    <Modal open={!!registro} onClose={onClose} titulo={`Editar servicio (${cfg.labelCorto})`}>
      <div className="flex flex-col gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Servicio</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Grupo</span>
          <select value={grupoId ?? ''} onChange={(e) => setGrupoId(Number(e.target.value))} className="campo">
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Descripción</span>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="campo" rows={4} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Estructura</span>
          <textarea value={estructura} onChange={(e) => setEstructura(e.target.value)} className="campo" rows={3} />
        </label>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={onClose} className="flex-1">
            Cancelar
          </Boton>
          <Boton onClick={guardar} disabled={guardando} className="flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </div>
      </div>
    </Modal>
  )
}

// ============================================================
// Criterios — tabla maestra de criterios de la resolución (3.557 filas en
// Res.1732, columnas C:L del Excel; 3.814 filas en Res.3100). Parametrizado
// por `resolucion` (pedido 2026-09-01, punto 3), igual que ServiciosCatalogoTab.
// El filtro de Complejidad/Modalidad usa SelectorDesplegable (lista
// desplegable con checkboxes) en vez del <select multiple> nativo — el
// nativo se veía roto/truncado (punto 2 del mismo pedido).
// ============================================================

type CriterioCatalogo = {
  id: number
  llave: string
  numero: number
  item: string | null
  pagina: string | null
  criterio: string
  grupo_id: number
  servicio_id: number
  numeral_grupo: string
  numeral_servicio: string
  estandar: string
  complejidad: string
  modalidad: string | null
  grupo: { nombre: string } | null
  servicio: { nombre: string } | null
}

const POR_PAGINA = 25

function CriteriosCatalogoTab({ resolucion }: { resolucion: ResolucionKey }) {
  const cfg = RESOLUCIONES[resolucion]
  const [criterios, setCriterios] = useState<CriterioCatalogo[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [servicioFiltro, setServicioFiltro] = useState<number | ''>('')
  const [grupoFiltro, setGrupoFiltro] = useState<number | ''>('')
  const [estandarFiltro, setEstandarFiltro] = useState('')
  // Multi-selección (pedido 2026-08-28, punto 8): arrays vacíos = "Todas".
  const [complejidadFiltro, setComplejidadFiltro] = useState<string[]>([])
  const [modalidadFiltro, setModalidadFiltro] = useState<string[]>([])
  const [serviciosFull, setServiciosFull] = useState<{ id: number; nombre: string; grupo_id: number }[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  // Globales, sin filtrar — alimentan el modal de edición (ahí sí se puede
  // asignar cualquier Estándar/Complejidad/Modalidad a un criterio nuevo).
  const [opcionesEstandar, setOpcionesEstandar] = useState<string[]>([])
  const [opcionesComplejidad, setOpcionesComplejidad] = useState<string[]>([])
  const [opcionesModalidad, setOpcionesModalidad] = useState<string[]>([])
  // Filtros en cascada, igual que en "Nueva auto-evaluación": Grupo acota
  // el desplegable de Servicio, y Grupo/Servicio acotan las opciones reales
  // de Estándar/Complejidad/Modalidad de la barra de filtros.
  const [opcionesEstandarFiltro, setOpcionesEstandarFiltro] = useState<string[]>([])
  const [opcionesComplejidadFiltro, setOpcionesComplejidadFiltro] = useState<string[]>([])
  const [opcionesModalidadFiltro, setOpcionesModalidadFiltro] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [editando, setEditando] = useState<CriterioCatalogo | 'nuevo' | null>(null)
  const [eliminando, setEliminando] = useState<CriterioCatalogo | null>(null)

  const servicios = grupoFiltro ? serviciosFull.filter((s) => s.grupo_id === grupoFiltro) : serviciosFull

  useEffect(() => {
    const columnasServiciosFull: string = `id, nombre, grupo_id:${cfg.columnaGrupoId}`
    supabase
      .from(cfg.tablaServicios)
      .select(columnasServiciosFull)
      .order('nombre')
      .then(({ data }) => setServiciosFull((data as unknown as { id: number; nombre: string; grupo_id: number }[]) ?? []))
    supabase
      .from(cfg.tablaGrupos)
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => setGrupos((data as Grupo[]) ?? []))
    // Opciones globales (modal): valores reales ya existentes en la tabla,
    // para no permitir texto libre suelto.
    supabase
      .from(cfg.tablaCriterios)
      .select('estandar, complejidad, modalidad')
      .then(({ data }) => {
        const filas = data ?? []
        setOpcionesEstandar(Array.from(new Set(filas.map((f) => f.estandar).filter(Boolean))).sort())
        setOpcionesComplejidad(Array.from(new Set(filas.map((f) => f.complejidad).filter(Boolean))).sort())
        setOpcionesModalidad(Array.from(new Set(filas.map((f) => f.modalidad).filter(Boolean))).sort() as string[])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolucion])

  // Si el Grupo cambia y el Servicio elegido ya no pertenece a él, se limpia
  // (mismo comportamiento que el selector de servicio de la auto-evaluación).
  useEffect(() => {
    if (servicioFiltro && !serviciosFull.some((s) => s.id === servicioFiltro && s.grupo_id === grupoFiltro)) {
      setServicioFiltro('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoFiltro])

  // Opciones de Estándar/Complejidad/Modalidad de la barra de filtros,
  // acotadas al Grupo/Servicio elegidos — si el valor actual deja de existir
  // en la nueva lista, se limpia también.
  useEffect(() => {
    let cancelado = false
    async function cargarOpcionesFiltro() {
      let q = supabase.from(cfg.tablaCriterios).select('estandar, complejidad, modalidad')
      if (grupoFiltro) q = q.eq(cfg.columnaGrupoId, grupoFiltro)
      if (servicioFiltro) q = q.eq(cfg.columnaServicioId, servicioFiltro)
      const { data } = await q
      if (cancelado) return
      const filas = data ?? []
      const estandares = Array.from(new Set(filas.map((f) => f.estandar).filter(Boolean))).sort()
      const complejidades = Array.from(new Set(filas.map((f) => f.complejidad).filter(Boolean))).sort()
      const modalidades = Array.from(new Set(filas.map((f) => f.modalidad).filter(Boolean))).sort() as string[]
      setOpcionesEstandarFiltro(estandares)
      setOpcionesComplejidadFiltro(complejidades)
      setOpcionesModalidadFiltro(modalidades)
      if (estandarFiltro && !estandares.includes(estandarFiltro)) setEstandarFiltro('')
      setComplejidadFiltro((prev) => prev.filter((v) => complejidades.includes(v)))
      setModalidadFiltro((prev) => prev.filter((v) => modalidades.includes(v)))
    }
    cargarOpcionesFiltro()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoFiltro, servicioFiltro])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, busqueda, servicioFiltro, grupoFiltro, estandarFiltro, complejidadFiltro, modalidadFiltro])

  // Reusado por cargar() (paginado) y exportarExcel() (sin paginar) para que
  // el Excel siempre coincida exactamente con los filtros activos en pantalla.
  function construirQuery(columnas: string, conteo: boolean) {
    let query = supabase
      .from(cfg.tablaCriterios)
      .select(columnas, conteo ? { count: 'exact' } : undefined)
      .order('numero')

    if (busqueda) query = query.ilike('criterio', `%${busqueda}%`)
    if (servicioFiltro) query = query.eq(cfg.columnaServicioId, servicioFiltro)
    if (grupoFiltro) query = query.eq(cfg.columnaGrupoId, grupoFiltro)
    if (estandarFiltro) query = query.eq('estandar', estandarFiltro)
    if (complejidadFiltro.length > 0) query = query.in('complejidad', complejidadFiltro)
    if (modalidadFiltro.length > 0) query = query.in('modalidad', modalidadFiltro)
    return query
  }

  async function cargar() {
    setCargando(true)
    const columnas = `id, llave, numero, item, pagina, criterio, grupo_id:${cfg.columnaGrupoId}, servicio_id:${cfg.columnaServicioId}, numeral_grupo, numeral_servicio, estandar, complejidad, modalidad, grupo:${cfg.tablaGrupos}(nombre), servicio:${cfg.tablaServicios}(nombre)`
    const query = construirQuery(columnas, true).range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1)
    const { data, count } = await query
    setCriterios((data as unknown as CriterioCatalogo[]) ?? [])
    setTotal(count ?? 0)
    setCargando(false)
  }

  async function exportarExcel() {
    setExportando(true)
    try {
      const columnas = `numero, item, pagina, criterio, numeral_grupo, numeral_servicio, estandar, complejidad, modalidad, grupo:${cfg.tablaGrupos}(nombre), servicio:${cfg.tablaServicios}(nombre)`
      const { data } = await construirQuery(columnas, false)
      const filas = (data ?? []) as unknown as (Omit<CriterioCatalogo, 'id' | 'llave' | 'grupo_id' | 'servicio_id'>)[]
      await exportarCriteriosExcel({
        filtros: [
          ['Buscar en criterio', busqueda || 'Todos'],
          ['Grupo', grupos.find((g) => g.id === grupoFiltro)?.nombre ?? 'Todos'],
          ['Servicio', servicios.find((s) => s.id === servicioFiltro)?.nombre ?? 'Todos'],
          ['Estándar', estandarFiltro || 'Todos'],
          ['Complejidad', complejidadFiltro.length ? complejidadFiltro.join(', ') : 'Todas'],
          ['Modalidad', modalidadFiltro.length ? modalidadFiltro.join(', ') : 'Todas'],
        ],
        criterios: filas.map((c) => ({
          numero: c.numero,
          item: c.item ?? '',
          pagina: c.pagina ?? '',
          criterio: c.criterio,
          numeralGrupo: c.numeral_grupo,
          numeralServicio: c.numeral_servicio,
          grupo: c.grupo?.nombre ?? '—',
          servicio: c.servicio?.nombre ?? '—',
          estandar: c.estandar,
          complejidad: c.complejidad,
          modalidad: c.modalidad ?? '',
        })),
        logoUrl: LOGO_URL,
        resolucionLabel: cfg.labelCorto,
      })
    } finally {
      setExportando(false)
    }
  }

  async function eliminar() {
    if (!eliminando) return
    await supabase.from(cfg.tablaCriterios).delete().eq('id', eliminando.id)
    setEliminando(null)
    cargar()
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Tabla maestra de criterios de la {cfg.label} (tabla {cfg.tablaCriterios}) — {total.toLocaleString()}{' '}
          registros.
        </p>
        <Boton onClick={() => setEditando('nuevo')}>Nuevo criterio</Boton>
      </div>

      {/* Filtros en cascada (Grupo acota Servicio; Grupo/Servicio acotan
          Estándar/Complejidad/Modalidad a los valores que realmente existen
          para esa combinación) — mismo patrón que Nueva auto-evaluación.
          Ancho fijo por campo para que quepan los 6 filtros + Exportar en
          una sola línea. */}
      <FilterBar>
        <CampoFiltro label="Buscar en criterio" className="w-24">
          <input
            value={busqueda}
            onChange={(e) => {
              setPagina(0)
              setBusqueda(e.target.value)
            }}
            className="campo"
          />
        </CampoFiltro>
        <CampoFiltro label="Grupo" className="w-24">
          <select
            value={grupoFiltro}
            onChange={(e) => {
              setPagina(0)
              setGrupoFiltro(e.target.value ? Number(e.target.value) : '')
            }}
            className="campo"
          >
            <option value="">Todos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </CampoFiltro>
        <CampoFiltro label="Servicio" className="w-24">
          <select
            value={servicioFiltro}
            onChange={(e) => {
              setPagina(0)
              setServicioFiltro(e.target.value ? Number(e.target.value) : '')
            }}
            className="campo"
          >
            <option value="">Todos</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </CampoFiltro>
        <CampoFiltro label="Estándar" className="w-28">
          <select
            value={estandarFiltro}
            onChange={(e) => {
              setPagina(0)
              setEstandarFiltro(e.target.value)
            }}
            className="campo"
          >
            <option value="">Todos</option>
            {opcionesEstandarFiltro.map((o) => (
              <option key={o} value={o}>
                {o.replace('Estándar de ', '')}
              </option>
            ))}
          </select>
        </CampoFiltro>
        {/* Lista desplegable (SelectorDesplegable) en vez del <select
            multiple> nativo — el nativo se veía roto/truncado con las
            opciones reales de Complejidad/Modalidad, que traen comas y
            frases largas (punto 2 del pedido 2026-09-01). Sin selección =
            "Todas". */}
        <CampoFiltro label="Complejidad" className="w-40">
          <SelectorDesplegable
            opciones={opcionesComplejidadFiltro}
            seleccionados={complejidadFiltro}
            onCambiar={(v) => {
              setPagina(0)
              setComplejidadFiltro(v)
            }}
          />
        </CampoFiltro>
        <CampoFiltro label="Modalidad" className="w-40">
          <SelectorDesplegable
            opciones={opcionesModalidadFiltro}
            seleccionados={modalidadFiltro}
            onCambiar={(v) => {
              setPagina(0)
              setModalidadFiltro(v)
            }}
          />
        </CampoFiltro>
        <Boton
          variante="secundario"
          className="shrink-0 px-3"
          onClick={() => {
            setPagina(0)
            setBusqueda('')
            setServicioFiltro('')
            setGrupoFiltro('')
            setEstandarFiltro('')
            setComplejidadFiltro([])
            setModalidadFiltro([])
          }}
          disabled={!busqueda && !servicioFiltro && !grupoFiltro && !estandarFiltro && complejidadFiltro.length === 0 && modalidadFiltro.length === 0}
        >
          Limpiar
        </Boton>
        <Boton variante="secundario" onClick={exportarExcel} disabled={exportando} className="shrink-0 px-3">
          {exportando ? 'Exportando…' : 'Exportar'}
        </Boton>
      </FilterBar>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4">No.</th>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Página</th>
                  <th className="py-2 pr-4">Criterio</th>
                  <th className="py-2 pr-4">Grupo</th>
                  <th className="py-2 pr-4">Servicio</th>
                  <th className="py-2 pr-4">Numeral Grupo</th>
                  <th className="py-2 pr-4">Numeral Servicio</th>
                  <th className="py-2 pr-4">Estándar</th>
                  <th className="py-2 pr-4">Complejidad</th>
                  <th className="py-2 pr-4">Modalidad</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {criterios.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-4 text-slate-500">{c.numero}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.item ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.pagina ?? '—'}</td>
                    <td className="max-w-lg py-2 pr-4">
                      <span className="line-clamp-2">{c.criterio}</span>
                    </td>
                    <td className="py-2 pr-4">{c.grupo?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4">{c.servicio?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.numeral_grupo}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.numeral_servicio}</td>
                    <td className="py-2 pr-4">{c.estandar}</td>
                    <td className="py-2 pr-4">{c.complejidad}</td>
                    <td className="py-2 pr-4">{c.modalidad ?? '—'}</td>
                    <td className="flex gap-3 py-2 pr-4 text-right text-xs">
                      <button onClick={() => setEditando(c)} className="font-medium text-azul2 hover:underline">
                        Editar
                      </button>
                      <button
                        onClick={() => setEliminando(c)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Página {pagina + 1} de {totalPaginas} — {total.toLocaleString()} registros
            </span>
            <div className="flex gap-2">
              <Boton variante="secundario" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
                Anterior
              </Boton>
              <Boton
                variante="secundario"
                disabled={pagina + 1 >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </Boton>
            </div>
          </div>
        </>
      )}

      <ModalEditarCriterioCatalogo
        resolucion={resolucion}
        registro={editando}
        grupos={grupos}
        servicios={serviciosFull}
        opcionesEstandar={opcionesEstandar}
        opcionesComplejidad={opcionesComplejidad}
        opcionesModalidad={opcionesModalidad}
        onClose={() => setEditando(null)}
        onGuardado={cargar}
      />

      <Modal open={!!eliminando} onClose={() => setEliminando(null)} titulo="Eliminar criterio">
        <p className="mb-4 text-sm text-slate-600">
          ¿Eliminar el criterio {eliminando?.numero}? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setEliminando(null)} className="flex-1">
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={eliminar} className="flex-1">
            Eliminar
          </Boton>
        </div>
      </Modal>
    </Card>
  )
}

function ModalEditarCriterioCatalogo({
  resolucion,
  registro,
  grupos,
  servicios,
  opcionesEstandar,
  opcionesComplejidad,
  opcionesModalidad,
  onClose,
  onGuardado,
}: {
  resolucion: ResolucionKey
  registro: CriterioCatalogo | 'nuevo' | null
  grupos: Grupo[]
  servicios: { id: number; nombre: string }[]
  opcionesEstandar: string[]
  opcionesComplejidad: string[]
  opcionesModalidad: string[]
  onClose: () => void
  onGuardado: () => void
}) {
  const cfg = RESOLUCIONES[resolucion]
  const esNuevo = registro === 'nuevo'
  const [llave, setLlave] = useState('')
  const [numero, setNumero] = useState('')
  const [item, setItem] = useState('')
  const [pagina, setPagina] = useState('')
  const [criterio, setCriterio] = useState('')
  const [grupoId, setGrupoId] = useState<number | null>(null)
  const [servicioId, setServicioId] = useState<number | null>(null)
  const [estandar, setEstandar] = useState('')
  const [complejidad, setComplejidad] = useState('')
  const [modalidad, setModalidad] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (registro && registro !== 'nuevo') {
      setLlave(registro.llave)
      setNumero(String(registro.numero))
      setItem(registro.item ?? '')
      setPagina(registro.pagina ?? '')
      setCriterio(registro.criterio)
      setGrupoId(registro.grupo_id)
      setServicioId(registro.servicio_id)
      setEstandar(registro.estandar)
      setComplejidad(registro.complejidad)
      setModalidad(registro.modalidad ?? '')
    } else if (registro === 'nuevo') {
      setLlave('')
      setNumero('')
      setItem('')
      setPagina('')
      setCriterio('')
      setGrupoId(grupos[0]?.id ?? null)
      setServicioId(servicios[0]?.id ?? null)
      setEstandar('')
      setComplejidad('')
      setModalidad('')
    }
  }, [registro, grupos, servicios])

  async function guardar() {
    if (!criterio || !grupoId || !servicioId || !estandar || !complejidad) return
    setGuardando(true)

    // numeral_grupo/numeral_servicio se derivan del Grupo/Servicio elegidos,
    // para que no queden inconsistentes con las FKs reales.
    const { data: g } = await supabase.from(cfg.tablaGrupos).select('numeral').eq('id', grupoId).single()
    const { data: s } = await supabase.from(cfg.tablaServicios).select('numeral').eq('id', servicioId).single()

    const payload = {
      llave: llave || `manual-${Date.now()}`,
      numero: numero ? Number(numero) : 0,
      item: item || null,
      pagina: pagina || null,
      criterio,
      [cfg.columnaGrupoId]: grupoId,
      [cfg.columnaServicioId]: servicioId,
      numeral_grupo: g?.numeral ?? '',
      numeral_servicio: s?.numeral ?? '',
      estandar,
      complejidad,
      modalidad: modalidad || null,
    }

    if (esNuevo) {
      await supabase.from(cfg.tablaCriterios).insert(payload)
    } else if (registro) {
      await supabase.from(cfg.tablaCriterios).update(payload).eq('id', registro.id)
    }
    setGuardando(false)
    onGuardado()
    onClose()
  }

  return (
    <Modal
      open={!!registro}
      onClose={onClose}
      titulo={esNuevo ? 'Nuevo criterio' : `Editar criterio ${numero}`}
      ancho="max-w-2xl"
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">No. (numero)</span>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} className="campo" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Página</span>
            <input value={pagina} onChange={(e) => setPagina(e.target.value)} className="campo" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Item</span>
            <input value={item} onChange={(e) => setItem(e.target.value)} className="campo" />
          </label>
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Criterio</span>
          <textarea value={criterio} onChange={(e) => setCriterio(e.target.value)} className="campo" rows={3} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Grupo</span>
            <select value={grupoId ?? ''} onChange={(e) => setGrupoId(Number(e.target.value))} className="campo">
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Servicio</span>
            <select value={servicioId ?? ''} onChange={(e) => setServicioId(Number(e.target.value))} className="campo">
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        {registro && registro !== 'nuevo' && (
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div>Numeral Grupo: {registro.numeral_grupo} (se recalcula al guardar)</div>
            <div>Numeral Servicio: {registro.numeral_servicio} (se recalcula al guardar)</div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Estándar</span>
            <select value={estandar} onChange={(e) => setEstandar(e.target.value)} className="campo">
              <option value="">Selecciona…</option>
              {opcionesEstandar.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Complejidad</span>
            <select value={complejidad} onChange={(e) => setComplejidad(e.target.value)} className="campo">
              <option value="">Selecciona…</option>
              {opcionesComplejidad.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Modalidad</span>
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className="campo">
              <option value="">Selecciona…</option>
              {opcionesModalidad.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-1 flex gap-2">
          <Boton variante="secundario" onClick={onClose} className="flex-1">
            Cancelar
          </Boton>
          <Boton onClick={guardar} disabled={guardando} className="flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </div>
      </div>
    </Modal>
  )
}

// ============================================================
// Empresas / Sedes / Periodicidad — catálogos simples (tabla independiente
// cada uno). Empresas y Periodicidad son listas planas {id, nombre}; Sedes
// agrega el desplegable de Empresa.
// ============================================================

type RegistroSimple = { id: number; nombre: string }

// Mensaje de error de Postgres cuando el registro está referenciado por FK
// (ej. una autoevaluación ya usa esa Sede) — se traduce a un texto legible
// en vez de mostrar el detalle crudo de Postgres.
function mensajeErrorEliminar(error: { code?: string; message?: string } | null, etiqueta: string) {
  if (error?.code === '23503') {
    return `No se puede eliminar: ${etiqueta} está en uso por una o más auto-evaluaciones.`
  }
  return error?.message ?? 'No se pudo eliminar el registro.'
}

function EmpresasTab() {
  return (
    <CatalogoSimpleTab
      tabla="empresas"
      etiquetaSingular="empresa"
      etiquetaPlural="Empresas"
      descripcion="Empresas del grupo — hoy solo CACSB. Catálogo independiente usado por la cabecera de Nueva auto-evaluación."
    />
  )
}

function PeriodicidadesTab() {
  return (
    <CatalogoSimpleTab
      tabla="periodicidades"
      etiquetaSingular="periodicidad"
      etiquetaPlural="Periodicidad"
      descripcion="Motivo/frecuencia de la auto-evaluación (Anual, Nuevo Servicio, Extraordinario). Catálogo independiente usado por la cabecera de Nueva auto-evaluación."
    />
  )
}

// Componente genérico reusado por Empresas y Periodicidad: ambas son tablas
// {id, nombre} con el mismo patrón de listar/crear/editar/eliminar.
function CatalogoSimpleTab({
  tabla,
  etiquetaSingular,
  etiquetaPlural,
  descripcion,
}: {
  tabla: 'empresas' | 'periodicidades'
  etiquetaSingular: string
  etiquetaPlural: string
  descripcion: string
}) {
  const [registros, setRegistros] = useState<RegistroSimple[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<RegistroSimple | 'nuevo' | null>(null)
  const [eliminando, setEliminando] = useState<RegistroSimple | null>(null)
  const [errorEliminar, setErrorEliminar] = useState('')

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from(tabla).select('id, nombre').order('nombre')
    setRegistros((data as RegistroSimple[]) ?? [])
    setCargando(false)
  }

  async function eliminar() {
    if (!eliminando) return
    setErrorEliminar('')
    const { error } = await supabase.from(tabla).delete().eq('id', eliminando.id)
    if (error) {
      setErrorEliminar(mensajeErrorEliminar(error, eliminando.nombre))
      return
    }
    setEliminando(null)
    cargar()
  }

  const filtrados = registros.filter((r) => !busqueda || r.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{descripcion}</p>
        <Boton onClick={() => setEditando('nuevo')}>Nueva {etiquetaSingular}</Boton>
      </div>

      <FilterBar>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Buscar</span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo" />
        </label>
      </FilterBar>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filtrados.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No hay registros para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">{etiquetaPlural}</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-4 font-medium text-slate-700">{r.nombre}</td>
                  <td className="flex gap-3 py-2 pr-4 text-right text-xs">
                    <button onClick={() => setEditando(r)} className="font-medium text-azul2 hover:underline">
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar('')
                        setEliminando(r)
                      }}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalEditarSimple
        tabla={tabla}
        etiquetaSingular={etiquetaSingular}
        registro={editando}
        onClose={() => setEditando(null)}
        onGuardado={cargar}
      />

      <Modal open={!!eliminando} onClose={() => setEliminando(null)} titulo={`Eliminar ${etiquetaSingular}`}>
        <p className="mb-4 text-sm text-slate-600">
          ¿Eliminar <strong>{eliminando?.nombre}</strong>? Esta acción no se puede deshacer.
        </p>
        {errorEliminar && <p className="mb-4 text-sm text-red-600">{errorEliminar}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setEliminando(null)} className="flex-1">
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={eliminar} className="flex-1">
            Eliminar
          </Boton>
        </div>
      </Modal>
    </Card>
  )
}

function ModalEditarSimple({
  tabla,
  etiquetaSingular,
  registro,
  onClose,
  onGuardado,
}: {
  tabla: 'empresas' | 'periodicidades'
  etiquetaSingular: string
  registro: RegistroSimple | 'nuevo' | null
  onClose: () => void
  onGuardado: () => void
}) {
  const esNuevo = registro === 'nuevo'
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    if (registro && registro !== 'nuevo') setNombre(registro.nombre)
    else if (registro === 'nuevo') setNombre('')
  }, [registro])

  async function guardar() {
    if (!nombre.trim()) return
    setGuardando(true)
    setError('')
    const { error: err } = esNuevo
      ? await supabase.from(tabla).insert({ nombre: nombre.trim() })
      : await supabase.from(tabla).update({ nombre: nombre.trim() }).eq('id', (registro as RegistroSimple).id)
    setGuardando(false)
    if (err) {
      setError(err.code === '23505' ? 'Ya existe un registro con ese nombre.' : err.message)
      return
    }
    onGuardado()
    onClose()
  }

  return (
    <Modal open={!!registro} onClose={onClose} titulo={esNuevo ? `Nueva ${etiquetaSingular}` : `Editar ${etiquetaSingular}`}>
      <div className="flex flex-col gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" autoFocus />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={onClose} className="flex-1">
            Cancelar
          </Boton>
          <Boton onClick={guardar} disabled={guardando || !nombre.trim()} className="flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </div>
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------
// Sedes — igual patrón que Empresas/Periodicidad pero con FK a Empresa.
// ------------------------------------------------------------

type SedeRegistro = { id: number; nombre: string; empresa_id: number; empresa: { nombre: string } | null }

function SedesTab() {
  const [sedes, setSedes] = useState<SedeRegistro[]>([])
  const [empresas, setEmpresas] = useState<RegistroSimple[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<SedeRegistro | 'nuevo' | null>(null)
  const [eliminando, setEliminando] = useState<SedeRegistro | null>(null)
  const [errorEliminar, setErrorEliminar] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: sd }, { data: emp }] = await Promise.all([
      supabase.from('sedes').select('id, nombre, empresa_id, empresa:empresas(nombre)').order('nombre'),
      supabase.from('empresas').select('id, nombre').order('nombre'),
    ])
    setSedes((sd as unknown as SedeRegistro[]) ?? [])
    setEmpresas((emp as RegistroSimple[]) ?? [])
    setCargando(false)
  }

  async function eliminar() {
    if (!eliminando) return
    setErrorEliminar('')
    const { error } = await supabase.from('sedes').delete().eq('id', eliminando.id)
    if (error) {
      setErrorEliminar(mensajeErrorEliminar(error, eliminando.nombre))
      return
    }
    setEliminando(null)
    cargar()
  }

  const filtradas = sedes.filter((s) => !busqueda || s.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Sedes de la Empresa (Torre, Urgencias, Centro de Especialistas). Catálogo independiente usado por la
          cabecera de Nueva auto-evaluación.
        </p>
        <Boton onClick={() => setEditando('nuevo')} disabled={empresas.length === 0}>
          Nueva sede
        </Boton>
      </div>

      <FilterBar>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Buscar</span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo" />
        </label>
      </FilterBar>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filtradas.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No hay registros para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Sede</th>
                <th className="py-2 pr-4">Empresa</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-4 font-medium text-slate-700">{s.nombre}</td>
                  <td className="py-2 pr-4 text-slate-500">{s.empresa?.nombre ?? '—'}</td>
                  <td className="flex gap-3 py-2 pr-4 text-right text-xs">
                    <button onClick={() => setEditando(s)} className="font-medium text-azul2 hover:underline">
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar('')
                        setEliminando(s)
                      }}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalEditarSede
        registro={editando}
        empresas={empresas}
        onClose={() => setEditando(null)}
        onGuardado={cargar}
      />

      <Modal open={!!eliminando} onClose={() => setEliminando(null)} titulo="Eliminar sede">
        <p className="mb-4 text-sm text-slate-600">
          ¿Eliminar <strong>{eliminando?.nombre}</strong>? Esta acción no se puede deshacer.
        </p>
        {errorEliminar && <p className="mb-4 text-sm text-red-600">{errorEliminar}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setEliminando(null)} className="flex-1">
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={eliminar} className="flex-1">
            Eliminar
          </Boton>
        </div>
      </Modal>
    </Card>
  )
}

function ModalEditarSede({
  registro,
  empresas,
  onClose,
  onGuardado,
}: {
  registro: SedeRegistro | 'nuevo' | null
  empresas: RegistroSimple[]
  onClose: () => void
  onGuardado: () => void
}) {
  const esNuevo = registro === 'nuevo'
  const [nombre, setNombre] = useState('')
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    if (registro && registro !== 'nuevo') {
      setNombre(registro.nombre)
      setEmpresaId(registro.empresa_id)
    } else if (registro === 'nuevo') {
      setNombre('')
      setEmpresaId(empresas[0]?.id ?? null)
    }
  }, [registro, empresas])

  async function guardar() {
    if (!nombre.trim() || !empresaId) return
    setGuardando(true)
    setError('')
    const payload = { nombre: nombre.trim(), empresa_id: empresaId }
    const { error: err } = esNuevo
      ? await supabase.from('sedes').insert(payload)
      : await supabase.from('sedes').update(payload).eq('id', (registro as SedeRegistro).id)
    setGuardando(false)
    if (err) {
      setError(err.message)
      return
    }
    onGuardado()
    onClose()
  }

  return (
    <Modal open={!!registro} onClose={onClose} titulo={esNuevo ? 'Nueva sede' : 'Editar sede'}>
      <div className="flex flex-col gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" autoFocus />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Empresa</span>
          <select value={empresaId ?? ''} onChange={(e) => setEmpresaId(Number(e.target.value))} className="campo">
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={onClose} className="flex-1">
            Cancelar
          </Boton>
          <Boton onClick={guardar} disabled={guardando || !nombre.trim() || !empresaId} className="flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </div>
      </div>
    </Modal>
  )
}
