import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Boton } from '../components/ui/ui'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)

  // Con HashRouter, redirectTo ya trae un "#/reset" propio y Supabase le pega
  // sus tokens al mismo fragmento (".../#/reset#access_token=...&type=recovery"),
  // así que detectSessionInUrl no siempre arma la sesión sola. Extraemos los
  // tokens a mano y llamamos setSession antes de habilitar el formulario.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) return setListo(true)
      const href = window.location.href
      const at = href.match(/[#&?]access_token=([^&]+)/)?.[1]
      const rt = href.match(/[#&?]refresh_token=([^&]+)/)?.[1]
      if (!at || !rt) {
        setError('El enlace expiró o no es válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".')
        return
      }
      supabase.auth
        .setSession({ access_token: decodeURIComponent(at), refresh_token: decodeURIComponent(rt) })
        .then(({ error }) =>
          error
            ? setError('El enlace expiró o no es válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".')
            : setListo(true)
        )
    })
  }, [])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setEnviando(false)
    if (error) {
      setError('No se pudo actualizar la contraseña. El enlace pudo haber expirado.')
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
          <h1 className="mb-6 text-center text-lg font-semibold text-azul">
            Nueva contraseña
          </h1>
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-azul focus:outline-none focus:ring-1 focus:ring-azul"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-azul focus:outline-none focus:ring-1 focus:ring-azul"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <Boton type="submit" disabled={enviando || !listo} className="w-full">
              {enviando ? 'Guardando…' : 'Guardar contraseña'}
            </Boton>
          </form>
        </div>
      </div>
    </div>
  )
}
