import { COLUMNS } from './columns'
import { sumCents } from './number'
import type { NccRow } from './types'

/** Remove linhas com as 10 colunas idênticas, mantendo a primeira ocorrência. */
export function dedupeRows(rows: NccRow[]): { rows: NccRow[]; removed: number } {
  const seen = new Set<string>()
  const unique = rows.filter((row) => {
    const key = JSON.stringify(COLUMNS.map((c) => row[c.key]))
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { rows: unique, removed: rows.length - unique.length }
}

export type Totals = {
  count: number
  valorNf: number
  comissaoBruta: number
  impostoRenda: number
  comissaoLiquida: number
}

export function computeTotals(rows: NccRow[]): Totals {
  return {
    count: rows.length,
    valorNf: sumCents(rows.map((r) => r.valorNf)),
    comissaoBruta: sumCents(rows.map((r) => r.comissaoBruta)),
    impostoRenda: sumCents(rows.map((r) => r.impostoRenda)),
    comissaoLiquida: sumCents(rows.map((r) => r.comissaoLiquida)),
  }
}
