import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Boton, Modal } from '../components/ui/ui'

export default function Login() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [modalRecuperar, setModalRecuperar] = useState(false)

  if (loading) return null
  if (session) return <Navigate to="/" replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setEnviando(false)
    if (error) {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-center bg-gradient-to-r from-azul to-azul2 px-6 py-6">
        <img
          src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`}
          alt="CAC Santa Bárbara"
          className="h-12"
        />
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <img
              src={`${import.meta.env.BASE_URL}images/logo_cacsb2.png`}
              alt="CAC Santa Bárbara"
              className="h-14"
            />
            <h1 className="text-lg font-semibold text-azul">Auto-evaluaciones</h1>
            <p className="text-sm text-slate-500">Habilitación Res. 1732</p>
          </div>

          <form onSubmit={entrar} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-azul focus:outline-none focus:ring-1 focus:ring-azul"
                placeholder="usuario@cacsantabarbara.co"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-azul focus:outline-none focus:ring-1 focus:ring-azul"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <Boton type="submit" disabled={enviando} className="mt-2 w-full">
              {enviando ? 'Ingresando…' : 'Iniciar sesión'}
            </Boton>
          </form>

          <button
            onClick={() => setModalRecuperar(true)}
            className="mt-4 w-full text-center text-sm text-azul2 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      <ModalRecuperar open={modalRecuperar} onClose={() => setModalRecuperar(false)} />
    </div>
  )
}

function ModalRecuperar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}#/reset`,
    })
    setEstado(error ? 'error' : 'ok')
  }

  function cerrar() {
    setEstado('idle')
    setEmail('')
    onClose()
  }

  return (
    <Modal open={open} onClose={cerrar} titulo="Recuperar contraseña">
      {estado === 'ok' ? (
        <div className="text-sm text-slate-600">
          Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña.
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Escribe tu correo institucional y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-azul focus:outline-none focus:ring-1 focus:ring-azul"
            placeholder="usuario@cacsantabarbara.co"
          />
          {estado === 'error' && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              No se pudo enviar el correo. Intenta nuevamente.
            </div>
          )}
          <Boton type="submit" disabled={estado === 'enviando'} className="w-full">
            {estado === 'enviando' ? 'Enviando…' : 'Enviar enlace'}
          </Boton>
        </form>
      )}
    </Modal>
  )
}
