import { describe, expect, test } from 'vitest'
import type { NccRow } from '../ncc/types'
import { definirAjuste, importarFaturamento, importarNcc, importarPagas, removerAjuste } from './merge'
import type { Ajuste, Base, Faturamento } from './types'

const AGORA = new Date('2026-10-28T12:00:00.000Z')

const vazia = (): Base => ({ versao: 1, faturamento: {}, ncc: {}, pagas: {}, ajustes: {}, importacoes: [] })

const fat = (nf: string, extra: Partial<Faturamento> = {}): Faturamento => ({
  nf, chassi: `TESTE${nf}`, data: '2026-02-10', regiao: '16', concVenda: 'T68', concEntrega: 'T68',
  clienteDoc: '1', cliente: 'CLIENTE TESTE', processo: '', pedido: '', formaPagamento: '', statusPedido: '',
  valor: 1000, percComissao: 5, valorComissao: 50, ...extra,
})

const nccRow = (notificacao: string, nf: string): NccRow => ({
  cod: 'T68', notificacao, data: '08/05/2026', nf, cliente: 'CLIENTE TESTE', chassi: 'teste1',
  valorNf: 1000, comissaoBruta: 50, impostoRenda: 1, comissaoLiquida: 49,
})

function congelar<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(congelar)
    Object.freeze(o)
  }
  return o
}

describe('importarFaturamento', () => {
  const a = fat('163134', { regiao: '', concEntrega: '' })
  const b = fat('163134')

  test.each([
    ['A,B', [a, b]],
    ['B,A', [b, a]],
  ])('duplicata no mesmo arquivo vira um registro preenchido (%s)', (_, linhas) => {
    const { base, resumo } = importarFaturamento(vazia(), { linhas, ignorados: [] }, 'f.xlsx', AGORA)
    expect(Object.keys(base.faturamento)).toEqual(['163134'])
    expect(base.faturamento['163134']).toMatchObject({ regiao: '16', concEntrega: 'T68' })
    expect(resumo).toEqual({ novos: 1, atualizados: 0, inalterados: 0, ignorados: [] })
  })

  test('re-upload sobreposto não duplica e não apaga', () => {
    const r1 = importarFaturamento(vazia(), { linhas: [fat('1'), fat('2')], ignorados: [] }, 'f1.xlsx', AGORA)
    const r2 = importarFaturamento(
      r1.base,
      { linhas: [fat('2', { regiao: '', valor: 2000 }), fat('3')], ignorados: [] },
      'f2.xlsx',
      AGORA,
    )
    expect(Object.keys(r2.base.faturamento).sort()).toEqual(['1', '2', '3'])
    expect(r2.base.faturamento['2']).toMatchObject({ regiao: '16', valor: 2000 })
    expect(r2.resumo).toEqual({ novos: 1, atualizados: 1, inalterados: 0, ignorados: [] })
  })

  test('re-upload idêntico conta como inalterado', () => {
    const r1 = importarFaturamento(vazia(), { linhas: [fat('1')], ignorados: [] }, 'f.xlsx', AGORA)
    const r2 = importarFaturamento(r1.base, { linhas: [fat('1')], ignorados: [] }, 'f.xlsx', AGORA)
    expect(r2.resumo).toEqual({ novos: 0, atualizados: 0, inalterados: 1, ignorados: [] })
  })

  test('ignorados da leitura passam para o resumo e a importação registra a contagem', () => {
    const { base, resumo } = importarFaturamento(vazia(), { linhas: [fat('1')], ignorados: ['Linha 3: sem NF'] }, 'f.xlsx', AGORA)
    expect(resumo.ignorados).toEqual(['Linha 3: sem NF'])
    expect(base.importacoes).toEqual([
      { tipo: 'faturamento', arquivo: 'f.xlsx', em: '2026-10-28T12:00:00.000Z', novos: 1, atualizados: 0, inalterados: 0, ignorados: 1 },
    ])
  })

  test('não muta a base de entrada', () => {
    const r1 = importarFaturamento(vazia(), { linhas: [fat('1')], ignorados: [] }, 'f.xlsx', AGORA)
    const congelada = congelar(r1.base)
    expect(() => importarFaturamento(congelada, { linhas: [fat('1', { valor: 5 }), fat('2')], ignorados: [] }, 'f.xlsx', AGORA)).not.toThrow()
    expect(congelada.faturamento['1'].valor).toBe(1000)
  })
})

describe('importarNcc', () => {
  test('normaliza chave, chassi e data', () => {
    const { base, resumo } = importarNcc(vazia(), [nccRow('808285', '000.168.707')], 'ncc.pdf', AGORA)
    expect(Object.keys(base.ncc)).toEqual(['808285|168707'])
    expect(base.ncc['808285|168707']).toMatchObject({ ncc: '808285', nf: '168707', chassi: 'TESTE1', data: '2026-05-08', comissaoLiquida: 49 })
    expect(resumo.novos).toBe(1)
    expect(base.importacoes[0]).toMatchObject({ tipo: 'ncc', arquivo: 'ncc.pdf' })
  })
})

describe('importarPagas', () => {
  test('pagas idênticas viram uma só', () => {
    const p = { ncc: '808618', nf: '1478557', conc: 'T28', dataRecebimento: '2026-05-25' }
    const { base, resumo } = importarPagas(vazia(), { linhas: [p, { ...p }], ignorados: [] }, 'p.xlsx', AGORA)
    expect(Object.keys(base.pagas)).toEqual(['808618|1478557'])
    expect(resumo.novos).toBe(1)
  })
})

describe('ajustes', () => {
  const ajuste = (status: Ajuste['status']): Ajuste => ({
    alvo: { tipo: 'linha', ncc: '808285', nf: '168707' }, status, em: '2026-10-28T12:00:00.000Z', obs: '',
  })

  test('definirAjuste substitui o anterior do mesmo alvo; removerAjuste apaga', () => {
    const b1 = definirAjuste(vazia(), ajuste('pago'))
    const b2 = definirAjuste(b1, ajuste('nao_pago'))
    expect(Object.keys(b2.ajustes)).toEqual(['linha:808285|168707'])
    expect(b2.ajustes['linha:808285|168707'].status).toBe('nao_pago')
    expect(b1.ajustes['linha:808285|168707'].status).toBe('pago')
    expect(removerAjuste(b2, { tipo: 'linha', ncc: '808285', nf: '168707' }).ajustes).toEqual({})
  })
})
