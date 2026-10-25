import { describe, expect, test } from 'vitest'
import { computeTotals, dedupeRows } from './rows'
import type { NccRow } from './types'

const row = (over: Partial<NccRow>): NccRow => ({
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
  ...over,
})

const r1 = row({})
const r2 = row({ cod: 'T02', notificacao: '900002', data: '24/10/2026', nf: '000.000.002', cliente: 'CLIENTE TESTE DOIS', chassi: 'TESTE000000000002', valorNf: 200000, comissaoBruta: 10000, impostoRenda: 150, comissaoLiquida: 9850 })
const r3 = row({ cod: 'T02', notificacao: '900002', data: '24/10/2026', nf: '000.000.003', cliente: 'CLIENTE TESTE TRES', chassi: 'TESTE000000000003', valorNf: 80000, comissaoBruta: 4000, impostoRenda: 60, comissaoLiquida: 3940 })

describe('dedupeRows', () => {
  test('removes fully identical rows keeping the first', () => {
    const first = row({})
    const copy = row({})
    const result = dedupeRows([first, r2, copy])
    expect(result.rows).toEqual([first, r2])
    expect(result.rows[0]).toBe(first)
    expect(result.removed).toBe(1)
  })

  test('keeps rows that differ in any column', () => {
    const result = dedupeRows([r1, row({ cod: 'T09' }), row({ comissaoLiquida: 1216.05 })])
    expect(result.rows).toHaveLength(3)
    expect(result.removed).toBe(0)
  })
})

describe('computeTotals', () => {
  test('sums the mock rows', () => {
    expect(computeTotals([r1, r2, r3])).toEqual({
      count: 3,
      valorNf: 403456.78,
      comissaoBruta: 15234.56,
      impostoRenda: 228.52,
      comissaoLiquida: 15006.04,
    })
  })

  test('sums cents exactly', () => {
    const t = computeTotals([row({ valorNf: 0.1 }), row({ valorNf: 0.2 })])
    expect(t.valorNf).toBe(0.3)
  })

  test('empty list gives zeros', () => {
    expect(computeTotals([])).toEqual({ count: 0, valorNf: 0, comissaoBruta: 0, impostoRenda: 0, comissaoLiquida: 0 })
  })
})
