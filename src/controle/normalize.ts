import type { AlvoAjuste } from './types'

/** Só dígitos, sem zeros à esquerda: '000.168.707' e 168707 viram '168707'. Usado para NF e nº de NCC. */
export function normDigits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '').replace(/^0+/, '')
}

export function normChassi(v: unknown): string {
  return String(v ?? '').replace(/\s/g, '').toUpperCase()
}

export function normText(v: unknown): string {
  return String(v ?? '').trim()
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Date (componentes UTC, como o ExcelJS entrega), 'dd/mm/aaaa', 'dd.mm.aaaa' ou 'aaaa-mm-dd…' → 'aaaa-mm-dd'. */
export function toIsoDate(v: unknown): string | null {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  }
  if (typeof v !== 'string') return null
  const br = /^(\d{2})[/.](\d{2})[/.](\d{4})$/.exec(v.trim())
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim())
  return iso ? iso[1] : null
}

export function linhaKey(ncc: string, nf: string): string {
  return `${ncc}|${nf}`
}

export function ajusteKey(alvo: AlvoAjuste): string {
  return alvo.tipo === 'carro' ? `carro:${alvo.nf}` : `linha:${linhaKey(alvo.ncc, alvo.nf)}`
}

/** Minúsculas, sem diacríticos e com espaços (inclusive quebras de linha e NBSP) unificados, para busca e cabeçalhos. */
export function semAcento(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').toLowerCase().trim()
}
