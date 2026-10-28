import type { Row, Worksheet } from 'exceljs'
import { parseBrNumber } from '../ncc/number'
import { normChassi, normDigits, normText, semAcento, toIsoDate } from './normalize'
import type { Faturamento, Leitura, Paga } from './types'

export class PlanilhaInvalidaError extends Error {}

/** Colunas por campo, com o nome como aparece na planilha. As obrigatórias vêm marcadas. */
type Colunas<K extends string> = Record<K, { nome: string; obrigatoria?: boolean }>

const COLUNAS_FATURAMENTO: Colunas<keyof Faturamento> = {
  nf: { nome: 'Número NF', obrigatoria: true },
  chassi: { nome: 'Chassi', obrigatoria: true },
  data: { nome: 'Data de faturamento' },
  regiao: { nome: 'Região' },
  concVenda: { nome: 'Conc Venda' },
  concEntrega: { nome: 'Conc Entrega' },
  clienteDoc: { nome: 'Cliente' },
  cliente: { nome: 'Nome do Cliente' },
  processo: { nome: 'Número do Processo' },
  pedido: { nome: 'Código Pedido' },
  formaPagamento: { nome: 'Forma de pagamento' },
  statusPedido: { nome: 'Status pedido' },
  valor: { nome: 'Valor' },
  percComissao: { nome: '% Comissão Item Fornec' },
  valorComissao: { nome: 'Valor Comissão' },
}

const COLUNAS_PAGAS: Colunas<keyof Paga> = {
  ncc: { nome: 'NCC', obrigatoria: true },
  nf: { nome: 'NF', obrigatoria: true },
  conc: { nome: 'CONC' },
  dataRecebimento: { nome: 'Data do recebimento na conta' },
}

/** Desembrulha fórmula, rich text e hyperlink do ExcelJS. */
function valorCelula(v: unknown): unknown {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) return valorCelula(v.result)
    if ('richText' in v && Array.isArray(v.richText)) return v.richText.map((p: { text: string }) => p.text).join('')
    if ('text' in v) return v.text
    return null
  }
  return v
}

function numero(v: unknown): number | null {
  if (typeof v === 'number') return v
  const s = normText(v)
  if (!s) return null
  try {
    return parseBrNumber(s)
  } catch {
    return null
  }
}

function textoCelulas(row: Row): string[] {
  const out: string[] = []
  row.eachCell((cell, col) => (out[col] = semAcento(normText(valorCelula(cell.value)))))
  return out
}

/** Acha a linha de cabeçalho nas 10 primeiras e devolve o número da coluna de cada campo encontrado. */
function mapearColunas<K extends string>(ws: Worksheet, colunas: Colunas<K>): { linha: number; indice: Partial<Record<K, number>> } {
  const obrigatorias = (Object.keys(colunas) as K[]).filter((k) => colunas[k].obrigatoria)
  for (let n = 1; n <= Math.min(10, ws.rowCount); n++) {
    const textos = textoCelulas(ws.getRow(n))
    const indice: Partial<Record<K, number>> = {}
    for (const k of Object.keys(colunas) as K[]) {
      const col = textos.indexOf(semAcento(colunas[k].nome))
      if (col > 0) indice[k] = col
    }
    if (obrigatorias.every((k) => indice[k] !== undefined)) return { linha: n, indice }
  }
  // Nomeia a primeira obrigatória que não aparece em nenhuma das linhas candidatas.
  const vistas = new Set(Array.from({ length: Math.min(10, ws.rowCount) }, (_, i) => textoCelulas(ws.getRow(i + 1))).flat())
  const faltando = obrigatorias.find((k) => !vistas.has(semAcento(colunas[k].nome))) ?? obrigatorias[0]
  throw new PlanilhaInvalidaError(`Coluna "${colunas[faltando].nome}" não encontrada`)
}

async function lerPlanilha<K extends string, T>(
  buf: ArrayBuffer,
  colunas: Colunas<K>,
  montar: (get: (k: K) => unknown) => T,
  valida: (t: T) => string | null,
): Promise<Leitura<T>> {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buf)
  } catch {
    throw new PlanilhaInvalidaError('Não foi possível ler a planilha')
  }
  const ws = wb.worksheets[0]
  if (!ws) throw new PlanilhaInvalidaError('A planilha está vazia')
  const { linha, indice } = mapearColunas(ws, colunas)

  const linhas: T[] = []
  const ignorados: string[] = []
  ws.eachRow((row, n) => {
    if (n <= linha) return
    const get = (k: K) => (indice[k] ? valorCelula(row.getCell(indice[k]).value) : null)
    if ((Object.keys(indice) as K[]).every((k) => normText(get(k)) === '')) return
    const item = montar(get)
    const motivo = valida(item)
    if (motivo) ignorados.push(`Linha ${n}: ${motivo}`)
    else linhas.push(item)
  })
  return { linhas, ignorados }
}

export function lerFaturamento(buf: ArrayBuffer): Promise<Leitura<Faturamento>> {
  return lerPlanilha(
    buf,
    COLUNAS_FATURAMENTO,
    (get) => ({
      nf: normDigits(get('nf')),
      chassi: normChassi(get('chassi')),
      data: toIsoDate(get('data')),
      regiao: normText(get('regiao')),
      concVenda: normText(get('concVenda')).toUpperCase(),
      concEntrega: normText(get('concEntrega')).toUpperCase(),
      clienteDoc: normText(get('clienteDoc')),
      cliente: normText(get('cliente')),
      processo: normText(get('processo')),
      pedido: normText(get('pedido')),
      formaPagamento: normText(get('formaPagamento')),
      statusPedido: normText(get('statusPedido')),
      valor: numero(get('valor')),
      percComissao: numero(get('percComissao')),
      valorComissao: numero(get('valorComissao')),
    }),
    (f) => (f.nf ? null : 'sem NF'),
  )
}

export function lerPagas(buf: ArrayBuffer): Promise<Leitura<Paga>> {
  return lerPlanilha(
    buf,
    COLUNAS_PAGAS,
    (get) => ({
      ncc: normDigits(get('ncc')),
      nf: normDigits(get('nf')),
      conc: normText(get('conc')).toUpperCase(),
      dataRecebimento: toIsoDate(get('dataRecebimento')),
    }),
    (p) => (p.ncc && p.nf ? null : 'sem NCC ou NF'),
  )
}
