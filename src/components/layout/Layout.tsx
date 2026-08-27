import { type ReactNode } from 'react'
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
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { ROLES_APP } from '../../domain/modulosApp'

const itemBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
const itemActivo = 'bg-white/15 text-white'
const itemInactivo = 'text-white/75 hover:bg-white/10 hover:text-white'

export default function Layout({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [adminAbierto, setAdminAbierto] = useState(true)

  async function salir() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const etiquetaRol = ROLES_APP.find((r) => r.valor === perfil?.role)?.etiqueta ?? perfil?.role

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
            Historial y reportes
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

        <div className="mt-4 border-t border-white/15 pt-3">
          <div className="px-3 text-xs text-white/60">Sesión activa</div>
          <div className="truncate px-3 text-sm font-medium text-white">
            {perfil?.nombre ?? perfil?.email ?? '—'}
          </div>
          {perfil && <div className="px-3 text-xs text-white/60">{etiquetaRol}</div>}
          <button
            onClick={salir}
            className={`${itemBase} ${itemInactivo} mt-2 w-full`}
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-100 p-6">{children}</main>
    </div>
  )
}
