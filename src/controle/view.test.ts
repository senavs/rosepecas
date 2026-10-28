import { describe, expect, test } from 'vitest'
import { ajusteKey, linhaKey } from './normalize'
import type { Ajuste, AlvoAjuste, Base, Faturamento, NccLinha, Paga } from './types'
import { calcularVisao } from './view'

const fat = (nf: string, chassi: string, extra: Partial<Faturamento> = {}): Faturamento => ({
  nf, chassi, data: '2026-05-04', regiao: '', concVenda: 'T68', concEntrega: 'T48', clienteDoc: '', cliente: 'CLIENTE TESTE',
  processo: '', pedido: '', formaPagamento: '', statusPedido: '', valor: 1000, percComissao: 5, valorComissao: 50, ...extra,
})
const linha = (ncc: string, nf: string, chassi: string, cod: string, comissaoLiquida = 10): NccLinha => ({
  ncc, nf, cod, data: '2026-05-08', cliente: 'CLIENTE TESTE', chassi, valorNf: 1000, comissaoBruta: comissaoLiquida, impostoRenda: 0, comissaoLiquida,
})
const paga = (ncc: string, nf: string, conc: string): Paga => ({ ncc, nf, conc, dataRecebimento: '2026-05-18' })
const ajuste = (alvo: AlvoAjuste, status: Ajuste['status']): Ajuste => ({ alvo, status, em: '2026-10-28T12:00:00.000Z', obs: '' })

function base(p: { fat?: Faturamento[]; ncc?: NccLinha[]; pagas?: Paga[]; ajustes?: Ajuste[] }): Base {
  return {
    versao: 1,
    faturamento: Object.fromEntries((p.fat ?? []).map((f) => [f.nf, f])),
    ncc: Object.fromEntries((p.ncc ?? []).map((l) => [linhaKey(l.ncc, l.nf), l])),
    pagas: Object.fromEntries((p.pagas ?? []).map((x) => [linhaKey(x.ncc, x.nf), x])),
    ajustes: Object.fromEntries((p.ajustes ?? []).map((a) => [ajusteKey(a.alvo), a])),
    importacoes: [],
  }
}

const CH = 'TESTE0000000000001'
const PARCIAL = {
  fat: [fat('168707', CH)],
  ncc: [linha('808285', '168707', CH, 'T68', 17265.3), linha('808284', '168707', CH, 'T48', 178.24)],
  pagas: [paga('808285', '168707', 'T68')],
}

describe('status do carro', () => {
  test('carro com duas NCCs e só uma paga é parcial e lista a que falta', () => {
    const [c] = calcularVisao(base(PARCIAL)).carros
    expect(c.exibido).toBe('parcial')
    expect(c.marca).toBe('planilha')
    expect(c.faltando.map((l) => l.ncc)).toEqual(['808284'])
    expect(c.linhas.find((l) => l.ncc === '808285')).toMatchObject({ calculado: 'paga', dataPagamento: '2026-05-18', temPdf: true })
  })

  test('todas pagas → pago', () => {
    const [c] = calcularVisao(base({ ...PARCIAL, pagas: [...PARCIAL.pagas, paga('808284', '168707', 'T48')] })).carros
    expect(c.exibido).toBe('pago')
  })

  test('nenhuma paga → ncc_nao_paga', () => {
    expect(calcularVisao(base({ ...PARCIAL, pagas: [] })).carros[0].exibido).toBe('ncc_nao_paga')
  })

  test('sem linhas → sem_ncc', () => {
    expect(calcularVisao(base({ fat: [fat('1', CH)] })).carros[0].exibido).toBe('sem_ncc')
  })

  test('valorComissao 0 sem linhas → sem_comissao', () => {
    expect(calcularVisao(base({ fat: [fat('1', CH, { valorComissao: 0 })] })).carros[0].exibido).toBe('sem_comissao')
  })
})

describe('pagamento sem PDF', () => {
  test('vira linha temPdf false e liga pela NF', () => {
    const v = calcularVisao(base({ fat: [fat('165842', CH)], pagas: [paga('805048', '165842', 'T28')] }))
    expect(v.carros[0].linhas).toHaveLength(1)
    expect(v.carros[0].linhas[0]).toMatchObject({ temPdf: false, cod: 'T28', calculado: 'paga', comissaoLiquida: null })
    expect(v.carros[0].exibido).toBe('pago')
    expect(v.orfaos).toEqual([])
  })

  test('PDF que chega depois funde com a linha sem PDF', () => {
    const v = calcularVisao(
      base({ fat: [fat('165842', CH)], ncc: [linha('805048', '165842', CH, 'T28')], pagas: [paga('805048', '165842', 'T28')] }),
    )
    expect(v.carros[0].linhas).toHaveLength(1)
    expect(v.carros[0].linhas[0].temPdf).toBe(true)
  })
})

describe('órfãos', () => {
  test('NCC de NF desconhecida é órfã sem_faturamento', () => {
    const v = calcularVisao(base({ ncc: [linha('1', '999', CH, 'T68')] }))
    expect(v.orfaos).toHaveLength(1)
    expect(v.orfaos[0]).toMatchObject({ motivo: 'sem_faturamento', ncc: '1', calculado: 'nao_paga' })
  })

  test('NF conhecida com chassi diferente é órfã chassi_divergente', () => {
    const v = calcularVisao(base({ fat: [fat('1', CH)], ncc: [linha('5', '1', 'OUTROCHASSI', 'T68')] }))
    expect(v.orfaos[0].motivo).toBe('chassi_divergente')
    expect(v.carros[0].linhas).toEqual([])
  })

  test('paga sem NCC e sem faturamento é órfã', () => {
    const v = calcularVisao(base({ pagas: [paga('7', '8', 'T08')] }))
    expect(v.orfaos[0]).toMatchObject({ motivo: 'sem_faturamento', temPdf: false, calculado: 'paga' })
  })
})

describe('ajuste de linha', () => {
  const alvo: AlvoAjuste = { tipo: 'linha', ncc: '808284', nf: '168707' }
  const pagaAlvo = paga('808284', '168707', 'T48')

  test.each([
    ['pago', true, 'paga', 'confirmado'],
    ['pago', false, 'paga', 'manual'],
    ['nao_pago', true, 'paga', 'conflito'],
    ['nao_pago', false, 'nao_paga', 'manual'],
  ] as const)('ajuste %s com planilha paga=%s → %s/%s', (status, pagaNaPlanilha, exibido, marca) => {
    const v = calcularVisao(base({ ...PARCIAL, pagas: pagaNaPlanilha ? [pagaAlvo] : [], ajustes: [ajuste(alvo, status)] }))
    const l = v.carros[0].linhas.find((x) => x.ncc === '808284')!
    expect(l).toMatchObject({ exibido, marca })
    expect(l.ajuste?.status).toBe(status)
  })

  test('ajuste de linha entra no cálculo do carro', () => {
    const [c] = calcularVisao(base({ ...PARCIAL, ajustes: [ajuste(alvo, 'pago')] })).carros
    expect(c).toMatchObject({ exibido: 'pago', marca: 'manual' })
    expect(c.faltando).toEqual([])
  })

  test('linha em conflito marca o carro como conflito', () => {
    const v = calcularVisao(base({ ...PARCIAL, pagas: [...PARCIAL.pagas, pagaAlvo], ajustes: [ajuste(alvo, 'nao_pago')] }))
    expect(v.carros[0]).toMatchObject({ exibido: 'pago', marca: 'conflito' })
  })

  test('órfão pode receber ajuste', () => {
    const v = calcularVisao(base({ ncc: [linha('1', '999', CH, 'T68')], ajustes: [ajuste({ tipo: 'linha', ncc: '1', nf: '999' }, 'pago')] }))
    expect(v.orfaos[0]).toMatchObject({ exibido: 'paga', marca: 'manual' })
  })
})

describe('ajuste de carro', () => {
  const alvo: AlvoAjuste = { tipo: 'carro', nf: '168707' }

  test('pago não altera as linhas', () => {
    const v = calcularVisao(base({ fat: [fat('168707', CH)], ajustes: [ajuste(alvo, 'pago')] }))
    expect(v.carros[0]).toMatchObject({ calculado: 'sem_ncc', exibido: 'pago', marca: 'manual', linhas: [] })
  })

  test('pago em carro parcial mantém as NCCs faltantes listadas', () => {
    const [c] = calcularVisao(base({ ...PARCIAL, ajustes: [ajuste(alvo, 'pago')] })).carros
    expect(c).toMatchObject({ exibido: 'pago', marca: 'manual' })
    expect(c.faltando.map((l) => l.ncc)).toEqual(['808284'])
  })

  test('pago quando a planilha já diz pago → confirmado', () => {
    const v = calcularVisao(base({ ...PARCIAL, pagas: [...PARCIAL.pagas, paga('808284', '168707', 'T48')], ajustes: [ajuste(alvo, 'pago')] }))
    expect(v.carros[0]).toMatchObject({ exibido: 'pago', marca: 'confirmado' })
  })

  test('não pago com linha confirmada pela planilha é conflito', () => {
    const [c] = calcularVisao(base({ ...PARCIAL, ajustes: [ajuste(alvo, 'nao_pago')] })).carros
    expect(c).toMatchObject({ exibido: 'parcial', marca: 'conflito' })
  })

  test('não pago sem confirmação da planilha → manual', () => {
    const v = calcularVisao(base({ fat: [fat('168707', CH, { valorComissao: 0 })], ajustes: [ajuste(alvo, 'nao_pago')] }))
    expect(v.carros[0]).toMatchObject({ exibido: 'sem_ncc', marca: 'manual' })
  })
})

test('carros ordenados por data decrescente, sem data por último', () => {
  const v = calcularVisao(
    base({ fat: [fat('1', 'A', { data: '2026-01-01' }), fat('2', 'B', { data: null }), fat('3', 'C', { data: '2026-03-01' })] }),
  )
  expect(v.carros.map((c) => c.fat.nf)).toEqual(['3', '1', '2'])
})
