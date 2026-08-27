export type Respuesta = 'cumple' | 'no_cumple' | 'no_aplica'

export type Avance = {
  total: number
  diligenciados: number
  pendientes: number
  cumple: number
  noCumple: number
  noAplica: number
  pctCumple: number
  pctNoCumple: number
  pctNoAplica: number
}

// % Cumple = Cumple / Total de preguntas (incluye "No Aplica" en el
// denominador — confirmado con el cliente, sección 5.3 del doc).
export function calcularAvance(totalCriterios: number, respuestas: Record<number, Respuesta>): Avance {
  const valores = Object.values(respuestas)
  const cumple = valores.filter((r) => r === 'cumple').length
  const noCumple = valores.filter((r) => r === 'no_cumple').length
  const noAplica = valores.filter((r) => r === 'no_aplica').length
  const diligenciados = cumple + noCumple + noAplica
  const total = totalCriterios
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  return {
    total,
    diligenciados,
    pendientes: total - diligenciados,
    cumple,
    noCumple,
    noAplica,
    pctCumple: pct(cumple),
    pctNoCumple: pct(noCumple),
    pctNoAplica: pct(noAplica),
  }
}
