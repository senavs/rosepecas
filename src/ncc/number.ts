const BR_NUMBER = /^(-)?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})(-)?$/

/** Converte '123.456,78' em 123456.78. Aceita sinal negativo no início ou no fim (padrão SAP). */
export function parseBrNumber(s: string): number {
  const m = BR_NUMBER.exec(s.trim())
  if (!m || (m[1] && m[4])) throw new Error(`Número inválido: "${s}"`)
  const value = Number(`${m[2].replace(/\./g, '')}.${m[3]}`)
  return m[1] || m[4] ? -value : value
}

const formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatBr(n: number): string {
  return formatter.format(n)
}

/** Soma em centavos inteiros para não acumular erro de ponto flutuante. */
export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100
}
