import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Badge, Boton, Card, Modal, PageHeader, Spinner } from '../../components/ui/ui'

type Sede = { id: number; nombre: string }
type ServicioRes1732 = { id: number; nombre: string }
type ServicioHabilitado = {
  id: number
  nombre: string
  sede_id: number
  servicio_res1732_id: number
  activo: boolean
  sede: { nombre: string } | null
  servicio_res1732: { nombre: string } | null
}

export default function Catalogos() {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [serviciosRes, setServiciosRes] = useState<ServicioRes1732[]>([])
  const [serviciosHabilitados, setServiciosHabilitados] = useState<ServicioHabilitado[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<ServicioHabilitado | 'nuevo' | null>(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: sed }, { data: serv }, { data: sh }] = await Promise.all([
      supabase.from('sedes').select('id, nombre').order('nombre'),
      supabase.from('servicios_res1732').select('id, nombre').order('nombre'),
      supabase
        .from('servicios_habilitados')
        .select('id, nombre, sede_id, servicio_res1732_id, activo, sede:sedes(nombre), servicio_res1732:servicios_res1732(nombre)')
        .order('nombre'),
    ])
    setSedes((sed as Sede[]) ?? [])
    setServiciosRes((serv as ServicioRes1732[]) ?? [])
    setServiciosHabilitados((sh as unknown as ServicioHabilitado[]) ?? [])
    setCargando(false)
  }

  async function alternarActivo(sh: ServicioHabilitado) {
    await supabase.from('servicios_habilitados').update({ activo: !sh.activo }).eq('id', sh.id)
    cargar()
  }

  return (
    <div>
      <PageHeader
        titulo="Catálogos"
        acciones={<Boton onClick={() => setEditando('nuevo')}>Nuevo servicio habilitado</Boton>}
      />

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Servicios Habilitados — mapeo a Servicio genérico Res.1732
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Este es el mapeo propuesto (docs/habilitacion1732.md sección 4.3). Corrige aquí cualquier servicio real o
          su mapeo genérico antes de usarlo en producción.
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
                  <th className="py-2 pr-4">Servicio real</th>
                  <th className="py-2 pr-4">Sede</th>
                  <th className="py-2 pr-4">Servicio genérico Res.1732</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviciosHabilitados.map((sh) => (
                  <tr key={sh.id}>
                    <td className="py-2 pr-4 font-medium text-slate-700">{sh.nombre}</td>
                    <td className="py-2 pr-4">{sh.sede?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4">{sh.servicio_res1732?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4">
                      <Badge tono={sh.activo ? 'exito' : 'neutro'}>{sh.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="flex gap-3 py-2 pr-4 text-right text-xs">
                      <button onClick={() => setEditando(sh)} className="font-medium text-azul2 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => alternarActivo(sh)} className="font-medium text-slate-500 hover:underline">
                        {sh.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ModalEditarServicio
        registro={editando}
        sedes={sedes}
        serviciosRes={serviciosRes}
        onClose={() => setEditando(null)}
        onGuardado={cargar}
      />
    </div>
  )
}

function ModalEditarServicio({
  registro,
  sedes,
  serviciosRes,
  onClose,
  onGuardado,
}: {
  registro: ServicioHabilitado | 'nuevo' | null
  sedes: Sede[]
  serviciosRes: ServicioRes1732[]
  onClose: () => void
  onGuardado: () => void
}) {
  const esNuevo = registro === 'nuevo'
  const [nombre, setNombre] = useState('')
  const [sedeId, setSedeId] = useState<number | null>(null)
  const [servicioResId, setServicioResId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (registro && registro !== 'nuevo') {
      setNombre(registro.nombre)
      setSedeId(registro.sede_id)
      setServicioResId(registro.servicio_res1732_id)
    } else {
      setNombre('')
      setSedeId(sedes[0]?.id ?? null)
      setServicioResId(serviciosRes[0]?.id ?? null)
    }
  }, [registro, sedes, serviciosRes])

  async function guardar() {
    if (!nombre || !sedeId || !servicioResId) return
    setGuardando(true)
    if (esNuevo) {
      await supabase
        .from('servicios_habilitados')
        .insert({ nombre, sede_id: sedeId, servicio_res1732_id: servicioResId })
    } else if (registro) {
      await supabase
        .from('servicios_habilitados')
        .update({ nombre, sede_id: sedeId, servicio_res1732_id: servicioResId })
        .eq('id', registro.id)
    }
    setGuardando(false)
    onGuardado()
    onClose()
  }

  return (
    <Modal open={!!registro} onClose={onClose} titulo={esNuevo ? 'Nuevo servicio habilitado' : 'Editar servicio habilitado'}>
      <div className="flex flex-col gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Nombre real</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Sede</span>
          <select value={sedeId ?? ''} onChange={(e) => setSedeId(Number(e.target.value))} className="campo">
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Servicio genérico Res.1732</span>
          <select
            value={servicioResId ?? ''}
            onChange={(e) => setServicioResId(Number(e.target.value))}
            className="campo"
          >
            {serviciosRes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <Boton onClick={guardar} disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
      </div>
    </Modal>
  )
}
