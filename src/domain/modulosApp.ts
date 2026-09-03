// Catálogo de módulos de la app, usado por `permisos_modulo` (sección 9 del
// doc). Hoy nadie tiene filas en `permisos_modulo`, así que todos los roles
// ven todos los módulos — este catálogo deja lista la app para cuando el
// Admin quiera activar restricciones sin tocar código.
export type ModuloApp = {
  clave: string
  nombre: string
  ruta: string
}

export const MODULOS_APP: ModuloApp[] = [
  { clave: 'dashboard', nombre: 'Dashboard', ruta: '/' },
  { clave: 'nueva-autoevaluacion', nombre: 'Nueva auto-evaluación', ruta: '/nueva' },
  { clave: 'historial', nombre: 'Auto-Evaluaciones', ruta: '/historial' },
  { clave: 'novedades', nombre: 'Novedades', ruta: '/novedades' },
  { clave: 'catalogos', nombre: 'Catálogos', ruta: '/admin/catalogos' },
  { clave: 'usuarios', nombre: 'Usuarios', ruta: '/admin/usuarios' },
]

export type RolApp = 'admin' | 'coordinador' | 'auditor'

export const ROLES_APP: { valor: RolApp; etiqueta: string }[] = [
  { valor: 'admin', etiqueta: 'Administrador' },
  { valor: 'coordinador', etiqueta: 'Coordinador' },
  { valor: 'auditor', etiqueta: 'Auditor' },
]
