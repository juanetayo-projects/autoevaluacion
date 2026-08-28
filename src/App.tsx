import type { ReactElement } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import DashboardOpciones from './pages/DashboardOpciones'
import NuevaAutoevaluacion from './pages/NuevaAutoevaluacion'
import Historial from './pages/Historial'
import Catalogos from './pages/admin/Catalogos'
import Usuarios from './pages/admin/Usuarios'

function SoloInvitados({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return children
}

function Protegido({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-8 text-slate-500">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <SoloInvitados>
                <Login />
              </SoloInvitados>
            }
          />
          <Route path="/reset" element={<ResetPassword />} />

          <Route
            path="/"
            element={
              <Protegido>
                <Dashboard />
              </Protegido>
            }
          />
          <Route
            path="/dashboard-opciones"
            element={
              <Protegido>
                <DashboardOpciones />
              </Protegido>
            }
          />
          <Route
            path="/nueva"
            element={
              <Protegido>
                <NuevaAutoevaluacion />
              </Protegido>
            }
          />
          <Route
            path="/nueva/:id"
            element={
              <Protegido>
                <NuevaAutoevaluacion />
              </Protegido>
            }
          />
          <Route
            path="/historial"
            element={
              <Protegido>
                <Historial />
              </Protegido>
            }
          />
          <Route
            path="/admin/catalogos"
            element={
              <Protegido>
                <Catalogos />
              </Protegido>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <Protegido>
                <Usuarios />
              </Protegido>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
