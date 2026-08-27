import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { ROLES_APP, type RolApp } from '../../domain/modulosApp'
import { Badge, Boton, Card, Modal, PageHeader, Spinner } from '../../components/ui/ui'

type Usuario = {
  id: string
  nombre: string
  email: string
  role: RolApp
  activo: boolean
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalCrear, setModalCrear] = useState(false)
  const [modalReset, setModalReset] = useState<Usuario | null>(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('profiles').select('*').order('nombre')
    setUsuarios((data as Usuario[]) ?? [])
    setCargando(false)
  }

  async function invocarAdminUsuarios(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('admin-usuarios', { body })
    if (error) throw error
    return data
  }

  return (
    <div>
      <PageHeader titulo="Usuarios" acciones={<Boton onClick={() => setModalCrear(true)}>Nuevo usuario</Boton>} />

      <Card>
        {cargando ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 pr-4 font-medium text-slate-700">{u.nombre}</td>
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">{ROLES_APP.find((r) => r.valor === u.role)?.etiqueta ?? u.role}</td>
                    <td className="py-2 pr-4">
                      <Badge tono={u.activo ? 'exito' : 'neutro'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        onClick={() => setModalReset(u)}
                        className="text-xs font-medium text-azul2 hover:underline"
                      >
                        Restablecer contraseña
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ModalCrearUsuario
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onCreado={cargar}
        invocar={invocarAdminUsuarios}
      />
      <ModalResetPassword
        usuario={modalReset}
        onClose={() => setModalReset(null)}
        invocar={invocarAdminUsuarios}
      />
    </div>
  )
}

function ModalCrearUsuario({
  open,
  onClose,
  onCreado,
  invocar,
}: {
  open: boolean
  onClose: () => void
  onCreado: () => void
  invocar: (body: Record<string, unknown>) => Promise<unknown>
}) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RolApp>('auditor')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function crear(e: FormEvent) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await invocar({ accion: 'crear', email, password, nombre, role })
      onCreado()
      cerrar()
    } catch {
      setError('No se pudo crear el usuario. Verifica que el correo no exista ya.')
    } finally {
      setEnviando(false)
    }
  }

  function cerrar() {
    setNombre('')
    setEmail('')
    setPassword('')
    setRole('auditor')
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={cerrar} titulo="Nuevo usuario">
      <form onSubmit={crear} className="flex flex-col gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Nombre</span>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="campo"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Contraseña temporal</span>
          <input
            required
            type="text"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="campo"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Rol</span>
          <select value={role} onChange={(e) => setRole(e.target.value as RolApp)} className="campo">
            {ROLES_APP.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        </label>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Boton type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Creando…' : 'Crear usuario'}
        </Boton>
      </form>
    </Modal>
  )
}

function ModalResetPassword({
  usuario,
  onClose,
  invocar,
}: {
  usuario: Usuario | null
  onClose: () => void
  invocar: (body: Record<string, unknown>) => Promise<unknown>
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!usuario) return
    setError('')
    setEnviando(true)
    try {
      await invocar({ accion: 'reset', id: usuario.id, password })
      setOk(true)
    } catch {
      setError('No se pudo restablecer la contraseña.')
    } finally {
      setEnviando(false)
    }
  }

  function cerrar() {
    setPassword('')
    setError('')
    setOk(false)
    onClose()
  }

  return (
    <Modal open={!!usuario} onClose={cerrar} titulo={`Restablecer contraseña — ${usuario?.nombre ?? ''}`}>
      {ok ? (
        <div className="text-sm text-emerald-700">Contraseña actualizada correctamente.</div>
      ) : (
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Nueva contraseña temporal</span>
            <input
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="campo"
            />
          </label>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Boton type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </form>
      )}
    </Modal>
  )
}
