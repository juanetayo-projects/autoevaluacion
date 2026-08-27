import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Boton, Card, FilterBar, Modal, PageHeader, Spinner } from '../../components/ui/ui'

type Tab = 'servicios' | 'criterios'

export default function Catalogos() {
  const [tab, setTab] = useState<Tab>('servicios')

  return (
    <div>
      <PageHeader titulo="Catálogos" />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        <BotonTab activo={tab === 'servicios'} onClick={() => setTab('servicios')}>
          Servicios (columna G)
        </BotonTab>
        <BotonTab activo={tab === 'criterios'} onClick={() => setTab('criterios')}>
          Criterios Res.1732
        </BotonTab>
      </div>

      {tab === 'servicios' ? <ServiciosRes1732Tab /> : <CriteriosTab />}
    </div>
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
      className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        activo ? 'border-azul text-azul' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

// ============================================================
// Servicios Res.1732 — los 39 valores reales de la columna G
// ============================================================

type Grupo = { id: number; nombre: string }
type ServicioRes1732 = {
  id: number
  numeral: string
  nombre: string
  descripcion: string | null
  estructura: string | null
  grupo_res1732_id: number
  grupo_res1732: { nombre: string } | null
}

function ServiciosRes1732Tab() {
  const [servicios, setServicios] = useState<ServicioRes1732[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<ServicioRes1732 | null>(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: sr }, { data: gr }] = await Promise.all([
      supabase
        .from('servicios_res1732')
        .select('id, numeral, nombre, descripcion, estructura, grupo_res1732_id, grupo_res1732:grupos_res1732(nombre)')
        .neq('numeral', '5')
        .order('nombre'),
      supabase.from('grupos_res1732').select('id, nombre').neq('numeral', '5').order('nombre'),
    ])
    setServicios((sr as unknown as ServicioRes1732[]) ?? [])
    setGrupos((gr as Grupo[]) ?? [])
    setCargando(false)
  }

  return (
    <Card>
      <p className="mb-4 text-xs text-slate-500">
        Estos son los 39 servicios genéricos de la Res.1732 (columna "Servicio" del Excel, hoja "Servicios"). Este es
        el catálogo que alimenta el selector "Servicio" al crear una auto-evaluación — no tiene Sede asociada, la
        Sede solo se captura al iniciar la auto-evaluación.
      </p>
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
              {servicios.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-4 font-medium text-slate-700">{s.nombre}</td>
                  <td className="py-2 pr-4">{s.grupo_res1732?.nombre ?? '—'}</td>
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

      <ModalEditarServicioRes1732
        registro={editando}
        grupos={grupos}
        onClose={() => setEditando(null)}
        onGuardado={cargar}
      />
    </Card>
  )
}

function ModalEditarServicioRes1732({
  registro,
  grupos,
  onClose,
  onGuardado,
}: {
  registro: ServicioRes1732 | null
  grupos: Grupo[]
  onClose: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [grupoId, setGrupoId] = useState<number | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [estructura, setEstructura] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (registro) {
      setNombre(registro.nombre)
      setGrupoId(registro.grupo_res1732_id)
      setDescripcion(registro.descripcion ?? '')
      setEstructura(registro.estructura ?? '')
    }
  }, [registro])

  async function guardar() {
    if (!registro || !nombre || !grupoId) return
    setGuardando(true)
    await supabase
      .from('servicios_res1732')
      .update({ nombre, grupo_res1732_id: grupoId, descripcion: descripcion || null, estructura: estructura || null })
      .eq('id', registro.id)
    setGuardando(false)
    onGuardado()
    onClose()
  }

  return (
    <Modal open={!!registro} onClose={onClose} titulo="Editar servicio (columna G)">
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
// Criterios Res.1732 — 3,557 filas, columnas C:L del Excel
// ============================================================

type Criterio = {
  id: number
  llave: string
  numero: number
  item: string | null
  pagina: string | null
  criterio: string
  grupo_res1732_id: number
  servicio_res1732_id: number
  numeral_grupo: string
  numeral_servicio: string
  estandar: string
  complejidad: string
  modalidad: string | null
  grupo_res1732: { nombre: string } | null
  servicio_res1732: { nombre: string } | null
}

const POR_PAGINA = 25

function CriteriosTab() {
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [servicioFiltro, setServicioFiltro] = useState<number | ''>('')
  const [servicios, setServicios] = useState<{ id: number; nombre: string }[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<Criterio | 'nuevo' | null>(null)
  const [eliminando, setEliminando] = useState<Criterio | null>(null)

  useEffect(() => {
    supabase
      .from('servicios_res1732')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => setServicios(data ?? []))
    supabase
      .from('grupos_res1732')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => setGrupos((data as Grupo[]) ?? []))
  }, [])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, busqueda, servicioFiltro])

  async function cargar() {
    setCargando(true)
    let query = supabase
      .from('criterios_res1732')
      .select(
        'id, llave, numero, item, pagina, criterio, grupo_res1732_id, servicio_res1732_id, numeral_grupo, numeral_servicio, estandar, complejidad, modalidad, grupo_res1732:grupos_res1732(nombre), servicio_res1732:servicios_res1732(nombre)',
        { count: 'exact' },
      )
      .order('numero')
      .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1)

    if (busqueda) query = query.ilike('criterio', `%${busqueda}%`)
    if (servicioFiltro) query = query.eq('servicio_res1732_id', servicioFiltro)

    const { data, count } = await query
    setCriterios((data as unknown as Criterio[]) ?? [])
    setTotal(count ?? 0)
    setCargando(false)
  }

  async function eliminar() {
    if (!eliminando) return
    await supabase.from('criterios_res1732').delete().eq('id', eliminando.id)
    setEliminando(null)
    cargar()
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <Card>
      <p className="mb-4 text-xs text-slate-500">
        Tabla maestra de criterios (hoja "AUTOEVALUACION 2026" del Excel, columnas C:L) — {total.toLocaleString()}{' '}
        registros.
      </p>

      <FilterBar>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Buscar en criterio</span>
          <input
            value={busqueda}
            onChange={(e) => {
              setPagina(0)
              setBusqueda(e.target.value)
            }}
            className="campo"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Servicio</span>
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
        </label>
        <Boton onClick={() => setEditando('nuevo')} className="ml-auto">
          Nuevo criterio
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
                  <th className="py-2 pr-4">Criterio</th>
                  <th className="py-2 pr-4">Grupo</th>
                  <th className="py-2 pr-4">Servicio</th>
                  <th className="py-2 pr-4">Estándar</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {criterios.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-4 text-slate-500">{c.numero}</td>
                    <td className="max-w-lg py-2 pr-4">
                      <span className="line-clamp-2">{c.criterio}</span>
                    </td>
                    <td className="py-2 pr-4">{c.grupo_res1732?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4">{c.servicio_res1732?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4">{c.estandar}</td>
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

      <ModalEditarCriterio
        registro={editando}
        grupos={grupos}
        servicios={servicios}
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

function ModalEditarCriterio({
  registro,
  grupos,
  servicios,
  onClose,
  onGuardado,
}: {
  registro: Criterio | 'nuevo' | null
  grupos: Grupo[]
  servicios: { id: number; nombre: string }[]
  onClose: () => void
  onGuardado: () => void
}) {
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
      setGrupoId(registro.grupo_res1732_id)
      setServicioId(registro.servicio_res1732_id)
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
    const { data: g } = await supabase.from('grupos_res1732').select('numeral').eq('id', grupoId).single()
    const { data: s } = await supabase.from('servicios_res1732').select('numeral').eq('id', servicioId).single()

    const payload = {
      llave: llave || `manual-${Date.now()}`,
      numero: numero ? Number(numero) : 0,
      item: item || null,
      pagina: pagina || null,
      criterio,
      grupo_res1732_id: grupoId,
      servicio_res1732_id: servicioId,
      numeral_grupo: g?.numeral ?? '',
      numeral_servicio: s?.numeral ?? '',
      estandar,
      complejidad,
      modalidad: modalidad || null,
    }

    if (esNuevo) {
      await supabase.from('criterios_res1732').insert(payload)
    } else if (registro) {
      await supabase.from('criterios_res1732').update(payload).eq('id', registro.id)
    }
    setGuardando(false)
    onGuardado()
    onClose()
  }

  return (
    <Modal open={!!registro} onClose={onClose} titulo={esNuevo ? 'Nuevo criterio' : `Editar criterio ${numero}`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">No. (numero)</span>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} className="campo" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Página</span>
            <input value={pagina} onChange={(e) => setPagina(e.target.value)} className="campo" />
          </label>
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Item</span>
          <input value={item} onChange={(e) => setItem(e.target.value)} className="campo" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Criterio</span>
          <textarea value={criterio} onChange={(e) => setCriterio(e.target.value)} className="campo" rows={5} />
        </label>
        <div className="grid grid-cols-2 gap-4">
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
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Estándar</span>
          <input value={estandar} onChange={(e) => setEstandar(e.target.value)} className="campo" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Complejidad</span>
            <input value={complejidad} onChange={(e) => setComplejidad(e.target.value)} className="campo" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Modalidad</span>
            <input value={modalidad} onChange={(e) => setModalidad(e.target.value)} className="campo" />
          </label>
        </div>
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
