import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronDown, Maximize2, Minimize2, Download, FileQuestion } from 'lucide-react'

// --- Card de métrica: tarjeta blanca con insignia circular de color
// (pedido 2026-09-02: adaptación clara de modelo_dashboard.png, que usa
// tarjetas blancas con ícono de color en vez del degradado azul sólido
// anterior — cada tono identifica el tipo de métrica de un vistazo). ---
export function MetricCard({
  titulo,
  valor,
  icono,
  sub,
  tono = 'azul',
}: {
  titulo: string
  valor: ReactNode
  icono?: ReactNode
  sub?: string
  tono?: 'exito' | 'peligro' | 'advertencia' | 'morado' | 'info' | 'azul'
}) {
  const insignia = {
    exito: 'bg-emerald-500',
    peligro: 'bg-red-500',
    advertencia: 'bg-amber-500',
    morado: 'bg-violet-500',
    info: 'bg-sky-500',
    azul: 'bg-azul',
  }[tono]
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-md">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${insignia}`}>
          {icono}
        </span>
        <span className="text-xs font-medium text-slate-500">{titulo}</span>
      </div>
      <div className="mt-2 text-xl font-bold text-slate-800">{valor}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
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
// `sticky` (pedido 2026-09-02, punto 4): la deja fija al hacer scroll de la
// tabla de abajo — el llamador debe incluir su propio `top-*` en `className`
// (ej. "top-0" cuando es la única barra fija, o "top-14" cuando va debajo de
// otra barra fija como las pestañas de Catálogos) porque la posición depende
// de qué más está fijo arriba en esa pantalla en particular.
export function FilterBar({
  children,
  className = '',
  sticky = false,
}: {
  children: ReactNode
  className?: string
  sticky?: boolean
}) {
  return (
    // Clase "filtros" (pedido 2026-09-04): marca cualquier barra de filtros
    // de la app para que el tema Azul + Celeste (fondo, etiquetas, bordes de
    // `.campo`) se aplique parejo en todas, sin repetir estilos página por
    // página — ver reglas en index.css. Fondo celeste marcado (no blanco),
    // según la referencia visual del cliente.
    <div
      className={`filtros mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 shadow-md ${sticky ? 'sticky z-10' : ''} ${className}`}
    >
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
  // Chip "Seleccionar todos" (pedido 2026-09-03, punto 3): antes había que
  // marcar cada opción una por una para incluirlas todas explícitamente.
  const todosSeleccionados = opciones.length > 0 && seleccionados.length === opciones.length
  function alternarTodos() {
    onCambiar(todosSeleccionados ? [] : [...opciones])
  }
  return (
    <div className="campo flex min-h-[2.25rem] flex-wrap items-center gap-1.5 py-1.5">
      {opciones.length === 0 ? (
        <span className="text-slate-400">Todas</span>
      ) : (
        <>
          <button
            type="button"
            onClick={alternarTodos}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
              todosSeleccionados
                ? 'border-azul2 bg-azul2 text-white'
                : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {todosSeleccionados ? 'Quitar todos' : 'Seleccionar todos'}
          </button>
          {opciones.map((o) => (
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
          ))}
        </>
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

// --- Visor de archivo adjunto (pedido 2026-09-03): reemplaza abrir el
// adjunto en una pestaña nueva del navegador por un modal con vista previa
// (imagen o PDF), opción de ampliar, y descarga real vía blob (evita que el
// atributo `download` sea ignorado en URLs firmadas de otro origen). ---
export type ArchivoVisor = { nombre: string; url?: string }

export function VisorArchivo({ archivo, onClose }: { archivo: ArchivoVisor | null; onClose: () => void }) {
  const [ampliado, setAmpliado] = useState(false)
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    if (!archivo) setAmpliado(false)
  }, [archivo])

  if (!archivo) return null

  const ext = archivo.nombre.split('.').pop()?.toLowerCase() ?? ''
  const esImagen = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
  const esPdf = ext === 'pdf'

  async function descargar() {
    if (!archivo?.url) return
    setDescargando(true)
    try {
      const res = await fetch(archivo.url)
      const blob = await res.blob()
      const urlLocal = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = urlLocal
      a.download = archivo.nombre
      a.click()
      URL.revokeObjectURL(urlLocal)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Modal open={!!archivo} onClose={onClose} titulo={archivo.nombre} ancho={ampliado ? 'max-w-5xl' : 'max-w-2xl'}>
      <div className="flex flex-col gap-3">
        <div
          className={`flex items-center justify-center overflow-auto rounded-lg border border-slate-200 bg-slate-50 ${
            ampliado ? 'h-[75vh]' : 'h-[50vh]'
          }`}
        >
          {esImagen && archivo.url ? (
            <img src={archivo.url} alt={archivo.nombre} className="max-h-full max-w-full object-contain" />
          ) : esPdf && archivo.url ? (
            <iframe src={archivo.url} title={archivo.nombre} className="h-full w-full" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-xs text-slate-400">
              <FileQuestion size={28} />
              Vista previa no disponible para este tipo de archivo.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {esImagen && (
            <Boton variante="secundario" className="flex items-center gap-1.5" onClick={() => setAmpliado((v) => !v)}>
              {ampliado ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {ampliado ? 'Reducir' : 'Ampliar'}
            </Boton>
          )}
          <Boton className="flex items-center gap-1.5" onClick={descargar} disabled={descargando}>
            <Download size={14} />
            {descargando ? 'Descargando…' : 'Descargar'}
          </Boton>
        </div>
      </div>
    </Modal>
  )
}
