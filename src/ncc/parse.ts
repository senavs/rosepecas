import { parseBrNumber } from './number'
import type { NccHeader, NccRow, ParseResult, TextLine } from './types'

export class NccParseError extends Error {
  constructor(public code: 'not-ncc' | 'no-rows') {
    super(code === 'not-ncc' ? 'Não parece um relatório NCC' : 'Nenhuma linha encontrada')
    this.name = 'NccParseError'
  }
}

const NOTIFICACAO = /Notificação de Crédito:\s*(\d+)/
const COD = /Cód\s*:\s*(\S+)/
const DATA = /(\d{2})\.(\d{2})\.(\d{4})/
const NF_START = /^\d{3}\.\d{3}\.\d{3}\b/
const VALUE = String.raw`(-?[\d.]+,\d{2}-?)`
const ROW = new RegExp(
  String.raw`^(\d{3}\.\d{3}\.\d{3})\s+(.+?)\s+([A-Z0-9]{17})\s+${VALUE}\s+${VALUE}\s+${VALUE}\s+${VALUE}$`,
)
// Nomes no SAP vêm em maiúsculas; razões sociais podem ter dígitos e símbolos ("& CIA 2000 LTDA").
const NAME_CONTINUATION = /^[A-ZÀ-Ü0-9&][A-ZÀ-Ü0-9 .,'&/ªº()-]*$/
/** Quanto uma linha precisa estar recuada em relação à NF para ser continuação do nome. */
const CONTINUATION_INDENT = 20

function parseHeader(lines: TextLine[]): NccHeader {
  let cod: string | undefined
  let notificacao: string | undefined
  let data: string | undefined
  for (const { text } of lines) {
    notificacao ??= NOTIFICACAO.exec(text)?.[1]
    cod ??= COD.exec(text)?.[1]
    if (!data) {
      const m = DATA.exec(text)
      if (m) data = `${m[1]}/${m[2]}/${m[3]}`
    }
  }
  if (!cod || !notificacao) throw new NccParseError('not-ncc')
  return { cod, notificacao, data: data ?? '' }
}

export function parseNccLines(lines: TextLine[]): ParseResult {
  const header = parseHeader(lines)
  const rows: NccRow[] = []
  const warnings: string[] = []
  // Última linha de dados válida, enquanto ainda pode receber continuação de nome.
  // A continuação precisa começar recuada (depois da NF) e antes da coluna do chassi.
  let open: { row: NccRow; minX: number; maxX: number } | null = null

  for (const line of lines) {
    const text = line.text
    if (NF_START.test(text)) {
      const m = ROW.exec(text)
      if (!m) {
        warnings.push(text)
        open = null
        continue
      }
      let row: NccRow
      try {
        row = {
          ...header,
          nf: m[1],
          cliente: m[2],
          chassi: m[3],
          valorNf: parseBrNumber(m[4]),
          comissaoBruta: parseBrNumber(m[5]),
          impostoRenda: parseBrNumber(m[6]),
          comissaoLiquida: parseBrNumber(m[7]),
        }
      } catch {
        warnings.push(text)
        open = null
        continue
      }
      rows.push(row)
      const chassiX = line.items.length > 1 ? line.items.find((i) => i.str.includes(m[3]))?.x : undefined
      open = { row, minX: (line.items[0]?.x ?? 0) + CONTINUATION_INDENT, maxX: chassiX ?? Infinity }
      continue
    }
    const x = line.items[0]?.x ?? 0
    if (open && x > open.minX && x < open.maxX && NAME_CONTINUATION.test(text)) {
      open.row.cliente = `${open.row.cliente} ${text}`
      continue
    }
    open = null
  }

  if (rows.length === 0) throw new NccParseError('no-rows')
  return { header, rows, warnings }
}
