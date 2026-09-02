import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

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
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-azul to-azul2 p-3 text-white shadow-lg shadow-azul/20">
      <div className="flex items-center justify-between">
        <span className="text-xs opacity-80">{titulo}</span>
        {icono}
      </div>
      <div className="mt-1 text-xl font-bold">{valor}</div>
      {sub && <div className="mt-0.5 text-[11px] opacity-75">{sub}</div>}
    </div>
  )
}

// --- Encabezado de página ---
export function PageHeader({ titulo, acciones }: { titulo: string; acciones?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-semibold text-azul">{titulo}</h1>
      <div className="flex flex-wrap gap-2">{acciones}</div>
    </div>
  )
}

// --- Barra de filtros reutilizable ---
export function FilterBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-300 bg-white p-3 shadow-md ${className}`}>
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
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${estilos} ${className}`}
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${estilos}`}>
      {children}
    </span>
  )
}

// --- Card contenedora simple ---
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    // Borde slate-300 (en vez de 200) + sombra mas marcada (pedido
    // 2026-09-02, punto 5): el fondo de pagina ahora tiene mas contraste,
    // pero las tarjetas necesitan su propio borde definido para no
    // "flotar" sin límite claro encima de ese fondo.
    <div className={`rounded-xl border border-slate-300 bg-white p-4 shadow-md ${className}`}>
      {children}
    </div>
  )
}

// --- Selector de opción múltiple por chips (punto 8 del pedido 2026-08-28) —
// reemplaza el <select multiple> nativo (feo y poco usable) para filtros de
// Modalidad/Complejidad y similares. Sin selección = "Todas". ---
export function SelectorMultiple({
  opciones,
  seleccionados,
  onCambiar,
}: {
  opciones: string[]
  seleccionados: string[]
  onCambiar: (valores: string[]) => void
}) {
  function alternar(valor: string) {
    onCambiar(seleccionados.includes(valor) ? seleccionados.filter((v) => v !== valor) : [...seleccionados, valor])
  }
  return (
    <div className="campo flex min-h-[2.25rem] flex-wrap items-center gap-1.5 py-1.5">
      {opciones.length === 0 ? (
        <span className="text-slate-400">Todas</span>
      ) : (
        opciones.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => alternar(o)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              seleccionados.includes(o)
                ? 'border-azul bg-azul text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {o}
          </button>
        ))
      )}
    </div>
  )
}

// --- Selector de opción múltiple como lista desplegable (pedido 2026-09-01):
// un botón tipo <select> que abre un panel con checkboxes al hacer clic —
// más compacto que SelectorMultiple (chips) para filtros con muchas
// opciones de texto largo (ej. Complejidad/Modalidad en Catálogos), donde
// los chips se desbordaban en varias líneas. Sin selección = "Todas". ---
export function SelectorDesplegable({
  opciones,
  seleccionados,
  onCambiar,
  placeholder = 'Todas',
}: {
  opciones: string[]
  seleccionados: string[]
  onCambiar: (valores: string[]) => void
  placeholder?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function alClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [abierto])

  function alternar(valor: string) {
    onCambiar(seleccionados.includes(valor) ? seleccionados.filter((v) => v !== valor) : [...seleccionados, valor])
  }

  const etiqueta =
    seleccionados.length === 0
      ? placeholder
      : seleccionados.length === 1
        ? seleccionados[0]
        : `${seleccionados.length} seleccionadas`

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="campo flex w-full items-center justify-between gap-1.5 py-1.5 text-left"
      >
        <span className={`truncate ${seleccionados.length === 0 ? 'text-slate-400' : 'text-slate-700'}`}>{etiqueta}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="absolute z-20 mt-1 max-h-56 w-max min-w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {opciones.length === 0 ? (
            <div className="whitespace-nowrap px-3 py-1.5 text-sm text-slate-400">Sin opciones</div>
          ) : (
            opciones.map((o) => (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={seleccionados.includes(o)}
                  onChange={() => alternar(o)}
                  className="rounded border-slate-300 text-azul focus:ring-azul"
                />
                <span className="text-slate-700">{o}</span>
              </label>
            ))
          )}
        </div>
      )}
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
