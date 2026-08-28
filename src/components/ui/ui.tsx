import type { ButtonHTMLAttributes, ReactNode } from 'react'

// --- Card de métrica con degradado institucional ---
export function MetricCard({
  titulo,
  valor,
  icono,
  sub,
}: {
  titulo: string
  valor: ReactNode
  icono?: ReactNode
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-azul to-azul2 p-5 text-white shadow-lg shadow-azul/20">
      <div className="flex items-center justify-between">
        <span className="text-sm/5 opacity-80">{titulo}</span>
        {icono}
      </div>
      <div className="mt-2 text-3xl font-bold">{valor}</div>
      {sub && <div className="mt-1 text-xs opacity-75">{sub}</div>}
    </div>
  )
}

// --- Encabezado de página ---
export function PageHeader({ titulo, acciones }: { titulo: string; acciones?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-azul">{titulo}</h1>
      <div className="flex flex-wrap gap-2">{acciones}</div>
    </div>
  )
}

// --- Barra de filtros reutilizable ---
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      {children}
    </div>
  )
}

// --- Modal reutilizable ---
export function Modal({
  open,
  onClose,
  titulo,
  children,
  ancho = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  titulo?: string
  children: ReactNode
  ancho?: string
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${ancho} overflow-y-auto rounded-2xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {titulo && (
          <div className="rounded-t-2xl bg-azul px-5 py-3 font-medium text-white">{titulo}</div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// --- Botón primario institucional ---
export function Boton({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'peligro' }) {
  const estilos = {
    primario: 'bg-azul text-white hover:bg-azul2',
    secundario: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    peligro: 'bg-red-600 text-white hover:bg-red-700',
  }[variante]
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${estilos} ${className}`}
    />
  )
}

// --- Badge de estado ---
export function Badge({
  children,
  tono = 'neutro',
}: {
  children: ReactNode
  tono?: 'neutro' | 'exito' | 'peligro' | 'advertencia' | 'info'
}) {
  const estilos = {
    neutro: 'bg-slate-100 text-slate-700',
    exito: 'bg-emerald-100 text-emerald-700',
    peligro: 'bg-red-100 text-red-700',
    advertencia: 'bg-amber-100 text-amber-800',
    info: 'bg-sky-100 text-sky-700',
  }[tono]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estilos}`}>
      {children}
    </span>
  )
}

// --- Card contenedora simple ---
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-md ${className}`}>
      {children}
    </div>
  )
}

// --- Spinner de carga ---
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-azul ${className}`}
    />
  )
}
