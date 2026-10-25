// @vitest-environment node
import ExcelJS from 'exceljs'
import { describe, expect, test } from 'vitest'
import { COLUMNS, buildWorkbookBuffer, exportFilename } from './xlsx'
import type { NccRow } from './types'

const rows: NccRow[] = [
  { cod: 'T01', notificacao: '900001', data: '23/10/2026', nf: '000.000.001', cliente: 'CLIENTE TESTE UM', chassi: 'TESTE000000000001', valorNf: 123456.78, comissaoBruta: 1234.56, impostoRenda: 18.52, comissaoLiquida: 1216.04 },
  { cod: 'T02', notificacao: '900002', data: '24/10/2026', nf: '000.000.002', cliente: 'CLIENTE TESTE DOIS', chassi: 'TESTE000000000002', valorNf: 200000, comissaoBruta: 10000, impostoRenda: 150, comissaoLiquida: 9850 },
  { cod: 'T02', notificacao: '900002', data: '24/10/2026', nf: '000.000.003', cliente: 'CLIENTE TESTE TRES', chassi: 'TESTE000000000003', valorNf: 80000, comissaoBruta: 4000, impostoRenda: 60, comissaoLiquida: 3940 },
]

async function load(r: NccRow[]) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildWorkbookBuffer(r))
  const ws = wb.getWorksheet('NCC')
  if (!ws) throw new Error('aba NCC não encontrada')
  return ws
}

describe('buildWorkbookBuffer', () => {
  test('writes bold header with the 10 columns', async () => {
    const ws = await load(rows)
    const header = ws.getRow(1)
    expect(COLUMNS.map((_, i) => header.getCell(i + 1).value)).toEqual([
      'Cód', 'Notificação de Crédito', 'Data', 'Núm. NF', 'Cliente', 'Chassi',
      'Valor NF', 'Comissão Bruta', 'Imposto de Renda', 'Comissão Líquida',
    ])
    expect(header.getCell(1).font?.bold).toBe(true)
  })

  test('keeps text columns as text and values as formatted numbers', async () => {
    const ws = await load(rows)
    expect(ws.getCell('A2').value).toBe('T01')
    expect(ws.getCell('B2').value).toBe('900001')
    expect(ws.getCell('D2').value).toBe('000.000.001')
    expect(ws.getCell('F2').value).toBe('TESTE000000000001')
    expect(ws.getCell('G2').value).toBe(123456.78)
    expect(ws.getCell('G2').numFmt).toBe('#,##0.00')
    expect(ws.getCell('J4').value).toBe(3940)
  })

  test('writes date without timezone shift', async () => {
    const ws = await load(rows)
    const d = ws.getCell('C2').value as Date
    expect(d).toBeInstanceOf(Date)
    expect([d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]).toEqual([2026, 9, 23])
    expect(ws.getCell('C2').numFmt).toBe('dd/mm/yyyy')
  })

  test('appends TOTAL row with SUM formulas', async () => {
    const ws = await load(rows)
    expect(ws.getCell('A5').value).toBe('TOTAL')
    expect(ws.getCell('A5').font?.bold).toBe(true)
    const expected: Record<string, number> = { G: 403456.78, H: 15234.56, I: 228.52, J: 15006.04 }
    for (const [col, result] of Object.entries(expected)) {
      expect(ws.getCell(`${col}5`).value).toEqual({ formula: `SUM(${col}2:${col}4)`, result })
    }
  })
})

test('exportFilename uses local date', () => {
  expect(exportFilename(new Date(2026, 9, 25))).toBe('NCC-consolidado-2026-10-25.xlsx')
  expect(exportFilename(new Date(2026, 0, 5, 23, 59))).toBe('NCC-consolidado-2026-01-05.xlsx')
})
