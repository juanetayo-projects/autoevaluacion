import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileWarning } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Badge, Card, FilterBar, PageHeader, Spinner } from '../components/ui/ui'
import { RESOLUCIONES, type ResolucionKey } from '../domain/resoluciones'

// Vista histórica del módulo "Novedades" (pedido 2026-09-03, punto 8): lista
// todas las habilitaciones de Novedades, con filtros sobre los campos
// capturados al habilitar (fechas, auditor, evaluado) para poder consultar
// el histórico. El detalle/checklist de cada una vive en Novedades.tsx.

type Fila = {
  id: string
  fecha_inicio: string
  fecha_final: string
  auditores: string[]
  evaluados: string[]
  creado_en: string
  autoevaluacion: {
    resolucion: ResolucionKey
    servicio_res1732: { nombre: string } | null
    servicio_res3100: { nombre: string } | null
    servicio_iso9001: { nombre: string } | null
    sede: { nombre: string } | null
  } | null
}

function nombreServicio(f: Fila) {
  const a = f.autoevaluacion
  if (!a) return '—'
  const servicio = a.resolucion === 'res3100' ? a.servicio_res3100 : a.resolucion === 'iso9001' ? a.servicio_iso9001 : a.servicio_res1732
  return servicio?.nombre ?? '—'
}

export default function NovedadesHistorial() {
  const navigate = useNavigate()
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [busquedaPersona, setBusquedaPersona] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('habilitaciones_novedades')
      .select(
        'id, fecha_inicio, fecha_final, auditores, evaluados, creado_en, autoevaluacion:autoevaluaciones(resolucion, servicio_res1732:servicios_res1732(nombre), servicio_res3100:servicios_res3100(nombre), servicio_iso9001:servicios_iso9001(nombre), sede:sedes(nombre))',
      )
      .order('creado_en', { ascending: false })
    setFilas((data as unknown as Fila[]) ?? [])
    setCargando(false)
  }

  const filtradas = filas.filter((f) => {
    if (desde && f.fecha_inicio < desde) return false
    if (hasta && f.fecha_final > hasta) return false
    if (busquedaPersona) {
      const q = busquedaPersona.toLowerCase()
      const enAuditores = f.auditores.some((a) => a.toLowerCase().includes(q))
      const enEvaluados = f.evaluados.some((e) => e.toLowerCase().includes(q))
      if (!enAuditores && !enEvaluados) return false
    }
    return true
  })

  return (
    <div>
      <PageHeader titulo="Novedades — Histórico de habilitaciones" />

      <FilterBar sticky className="top-0">
        <label className="text-xs">
          <span className="mb-1 block font-medium text-slate-600">Auditor o evaluado</span>
          <input value={busquedaPersona} onChange={(e) => setBusquedaPersona(e.target.value)} className="campo" />
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-medium text-slate-600">Fecha inicio desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="campo" />
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-medium text-slate-600">Fecha final hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="campo" />
        </label>
      </FilterBar>

      <Card>
        {cargando ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : filtradas.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            No hay habilitaciones de Novedades para mostrar. Se crean al hacer clic en "Habilitar" desde
            Auto-Evaluaciones.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-azul text-left text-white">
                  <th className="py-1 pr-3">Fecha inicio</th>
                  <th className="py-1 pr-3">Fecha final</th>
                  <th className="py-1 pr-3">Resolución</th>
                  <th className="py-1 pr-3">Servicio</th>
                  <th className="py-1 pr-3">Sede</th>
                  <th className="py-1 pr-3">Auditor(es)</th>
                  <th className="py-1 pr-3">Evaluado(s)</th>
                  <th className="py-1 pr-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((f) => (
                  <tr key={f.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/novedades/${f.id}`)}>
                    <td className="py-1 pr-3">{f.fecha_inicio}</td>
                    <td className="py-1 pr-3">{f.fecha_final}</td>
                    <td className="py-1 pr-3">
                      {f.autoevaluacion && <Badge tono="info">{RESOLUCIONES[f.autoevaluacion.resolucion].labelCorto}</Badge>}
                    </td>
                    <td className="py-1 pr-3 font-medium text-slate-700">{nombreServicio(f)}</td>
                    <td className="py-1 pr-3">{f.autoevaluacion?.sede?.nombre ?? '—'}</td>
                    <td className="py-1 pr-3">{f.auditores.join(', ') || '—'}</td>
                    <td className="py-1 pr-3">{f.evaluados.join(', ') || '—'}</td>
                    <td className="py-1 pr-3 text-right">
                      <button className="text-amber-600 hover:text-amber-800" title="Ver checklist de Novedades">
                        <FileWarning size={15} />
                      </button>
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
