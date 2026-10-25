import { describe, expect, test } from 'vitest'
import { NccParseError, parseNccLines } from './parse'
import type { TextLine } from './types'

const L = (text: string, x = 30): TextLine => ({ text, items: [{ str: text, x }] })

/** Linha de dados com um item por coluna, como o pdf.js costuma devolver. */
const ROW_COLS = (nf: string, cliente: string, chassi: string, values: string[]): TextLine => {
  const items = [
    { str: nf, x: 30 },
    { str: cliente, x: 110 },
    { str: chassi, x: 330 },
    ...values.map((str, i) => ({ str, x: 420 + i * 80 })),
  ]
  return { text: items.map((i) => i.str).join(' '), items }
}

const HEADER: TextLine[] = [
  L('Relatório NCC: ate'),
  L('General Motors do Brasil Ltda 23.10.2026', 200),
  L('Notificação de Crédito: 900001 Cód : T01'),
  L('Fábr : 08'),
  L('Núm. NF Cliente Chassi Valor NF Commiss. Bruta Imp. Renda Commis. Liq.'),
]

const ROW1 = '000.000.001 CLIENTE TESTE UM TESTE000000000001 123.456,78 1.234,56 18,52 1.216,04'
const ROW2 = '000.000.002 CLIENTE TESTE DOIS TESTE000000000002 200.000,00 10.000,00 150,00 9.850,00'
const ROW3 = '000.000.003 CLIENTE TESTE TRES TESTE000000000003 80.000,00 4.000,00 60,00 3.940,00'

describe('parseNccLines', () => {
  test('parses header and single row', () => {
    const result = parseNccLines([...HEADER, L(ROW1)])
    expect(result.header).toEqual({ cod: 'T01', notificacao: '900001', data: '23/10/2026' })
    expect(result.rows).toEqual([
      {
        cod: 'T01',
        notificacao: '900001',
        data: '23/10/2026',
        nf: '000.000.001',
        cliente: 'CLIENTE TESTE UM',
        chassi: 'TESTE000000000001',
        valorNf: 123456.78,
        comissaoBruta: 1234.56,
        impostoRenda: 18.52,
        comissaoLiquida: 1216.04,
      },
    ])
    expect(result.warnings).toEqual([])
  })

  test('parses multiple rows in order', () => {
    const { rows } = parseNccLines([...HEADER, L(ROW2), L(ROW3)])
    expect(rows.map((r) => r.nf)).toEqual(['000.000.002', '000.000.003'])
    expect(rows[1].cliente).toBe('CLIENTE TESTE TRES')
  })

  test('parses negative SAP values', () => {
    const { rows } = parseNccLines([
      ...HEADER,
      L('000.000.004 CLIENTE TESTE QUATRO TESTE000000000004 50.000,00 500,00- 7,50- 492,50-'),
    ])
    expect(rows[0].comissaoBruta).toBe(-500)
    expect(rows[0].impostoRenda).toBe(-7.5)
    expect(rows[0].comissaoLiquida).toBe(-492.5)
  })

  test('joins wrapped client name', () => {
    const { rows } = parseNccLines([
      ...HEADER,
      L('000.000.005 CLIENTE TESTE CINCO TESTE000000000005 10.000,00 100,00 1,50 98,50'),
      L('SOBRENOME LONGO', 120),
      L(ROW3),
    ])
    expect(rows[0].cliente).toBe('CLIENTE TESTE CINCO SOBRENOME LONGO')
    expect(rows[1].cliente).toBe('CLIENTE TESTE TRES')
  })

  test('does not join left-margin footer', () => {
    const result = parseNccLines([...HEADER, L(ROW1), L('TOTAL GERAL', 30)])
    expect(result.rows[0].cliente).toBe('CLIENTE TESTE UM')
    expect(result.warnings).toEqual([])
  })

  test('does not join caps line right of the client column', () => {
    const result = parseNccLines([
      ...HEADER,
      ROW_COLS('000.000.001', 'CLIENTE TESTE UM', 'TESTE000000000001', ['123.456,78', '1.234,56', '18,52', '1.216,04']),
      L('DEPARTAMENTO COMERCIAL', 400),
    ])
    expect(result.rows[0].cliente).toBe('CLIENTE TESTE UM')
  })

  test('joins wrapped company name with symbols and digits', () => {
    const { rows } = parseNccLines([
      ...HEADER,
      ROW_COLS('000.000.007', 'EMPRESA TESTE', 'TESTE000000000007', ['10.000,00', '100,00', '1,50', '98,50']),
      L('& CIA 2000 LTDA', 110),
    ])
    expect(rows[0].cliente).toBe('EMPRESA TESTE & CIA 2000 LTDA')
  })

  test('malformed value becomes a warning instead of failing the file', () => {
    const bad = '000.000.008 CLIENTE TESTE OITO TESTE000000000008 1.23,45 100,00 1,50 98,50'
    const result = parseNccLines([...HEADER, L(ROW1), L(bad)])
    expect(result.rows).toHaveLength(1)
    expect(result.warnings).toEqual([bad])
  })

  test('collects rows across pages', () => {
    const page2Header = [
      L('General Motors do Brasil Ltda 23.10.2026', 200),
      L('Notificação de Crédito: 900001 Cód : T01'),
      L('Núm. NF Cliente Chassi Valor NF Commiss. Bruta Imp. Renda Commis. Liq.'),
    ]
    const result = parseNccLines([...HEADER, L(ROW1), ...page2Header, L(ROW2)])
    expect(result.rows.map((r) => r.nf)).toEqual(['000.000.001', '000.000.002'])
    expect(result.header.notificacao).toBe('900001')
  })

  test('warns on NF-like line that does not match', () => {
    const bad = '000.000.006 CLIENTE TESTE SEIS TESTE000000000006 10.000,00 100,00 99,00'
    const result = parseNccLines([...HEADER, L(ROW1), L(bad)])
    expect(result.rows).toHaveLength(1)
    expect(result.warnings).toEqual([bad])
  })

  test('throws not-ncc without header', () => {
    expect(() => parseNccLines([L('qualquer coisa')])).toThrow(NccParseError)
    try {
      parseNccLines([L('qualquer coisa')])
    } catch (e) {
      expect((e as NccParseError).code).toBe('not-ncc')
    }
  })

  test('throws no-rows when header but no valid rows', () => {
    for (const lines of [HEADER, [...HEADER, L('000.000.009 LINHA QUEBRADA')]]) {
      try {
        parseNccLines(lines)
        expect.unreachable()
      } catch (e) {
        expect(e).toBeInstanceOf(NccParseError)
        expect((e as NccParseError).code).toBe('no-rows')
      }
    }
  })
})
