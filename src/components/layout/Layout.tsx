import { type ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardPlus,
  History,
  Settings2,
  Users,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { ROLES_APP } from '../../domain/modulosApp'

const itemBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
const itemActivo = 'bg-white/15 text-white'
const itemInactivo = 'text-white/75 hover:bg-white/10 hover:text-white'

export default function Layout({ children }: { children: ReactNode }) {
  const [adminAbierto, setAdminAbierto] = useState(true)

  return (
    <div className="flex min-h-full">
      <aside className="flex w-64 flex-shrink-0 flex-col bg-gradient-to-b from-azul to-azul2 px-3 py-5">
        <div className="mb-6 flex items-center justify-center px-2">
          <img
            src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`}
            alt="CAC Santa Bárbara"
            className="h-10"
          />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink
            to="/nueva"
            className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}
          >
            <ClipboardPlus size={18} />
            Nueva auto-evaluación
          </NavLink>
          <NavLink
            to="/historial"
            className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}
          >
            <History size={18} />
            Auto-Evaluaciones
          </NavLink>

          <div className="mt-4 border-t border-white/15 pt-3">
            <button
              onClick={() => setAdminAbierto((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/60"
            >
              Administración
              <ChevronDown
                size={14}
                className={`transition-transform ${adminAbierto ? 'rotate-180' : ''}`}
              />
            </button>
            {adminAbierto && (
              <div className="mt-1 flex flex-col gap-1">
                <NavLink
                  to="/admin/catalogos"
                  className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}
                >
                  <Settings2 size={18} />
                  Catálogos
                </NavLink>
                <NavLink
                  to="/admin/usuarios"
                  className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}
                >
                  <Users size={18} />
                  Usuarios
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderUsuario />
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6">{children}</main>
      </div>
    </div>
  )
}

function HeaderUsuario() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  async function salir() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const etiquetaRol = ROLES_APP.find((r) => r.valor === perfil?.role)?.etiqueta ?? perfil?.role
  const iniciales = (perfil?.nombre || perfil?.email || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <header className="sticky top-0 z-20 flex items-center justify-end gap-3 bg-gradient-to-r from-azul to-azul2 px-6 py-2.5 shadow-sm">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-semibold text-white ring-1 ring-white/30">
        {iniciales}
      </div>
      <div className="text-right leading-tight">
        <div className="text-sm font-medium text-white">{perfil?.nombre ?? perfil?.email ?? '—'}</div>
        {perfil && <div className="text-xs text-white/70">{etiquetaRol}</div>}
      </div>
      <button
        onClick={salir}
        title="Cerrar sesión"
        className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        <LogOut size={18} />
      </button>
    </header>
  )
}
