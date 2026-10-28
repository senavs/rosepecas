import { expect, test } from 'vitest'
import { contarPorStatus, contarSemPdf, filtrarCarros, FILTROS_VAZIOS, type Filtros } from './filter'
import type { CarroView, Faturamento, LinhaView, StatusCarro } from './types'

const linha = (ncc: string, cod: string, temPdf = true): LinhaView => ({
  chave: `${ncc}|1`, ncc, nf: '1', cod, data: null, chassi: '', cliente: '', comissaoLiquida: null, temPdf,
  dataPagamento: null, calculado: 'nao_paga', exibido: 'nao_paga', marca: 'planilha', ajuste: null,
})

const carro = (nf: string, cliente: string, data: string | null, exibido: StatusCarro, linhas: LinhaView[] = []): CarroView => ({
  fat: {
    nf, chassi: `9BGTESTE${nf}`, data, cliente, regiao: '', concVenda: 'T68', concEntrega: 'T68', clienteDoc: '', processo: '',
    pedido: '', formaPagamento: '', statusPedido: '', valor: null, percComissao: null, valorComissao: null,
  } satisfies Faturamento,
  linhas, faltando: [], calculado: exibido, exibido, marca: 'planilha', ajuste: null,
})

const CARROS = [
  carro('168707', 'JOÃO TESTE', '2026-05-04', 'parcial', [linha('808284', 'T48')]),
  carro('163134', 'MARIA TESTE', '2026-02-10', 'pago', [linha('805048', 'T28', false)]),
  carro('200001', 'ANA TESTE', null, 'sem_ncc'),
]

const filtrar = (f: Partial<Filtros>) => filtrarCarros(CARROS, { ...FILTROS_VAZIOS, ...f }).map((c) => c.fat.nf)

test('filtros vazios não restringem', () => expect(filtrar({})).toEqual(['168707', '163134', '200001']))
test('status', () => expect(filtrar({ status: ['pago', 'sem_ncc'] })).toEqual(['163134', '200001']))
test('ncc com pontuação', () => expect(filtrar({ ncc: '808.284' })).toEqual(['168707']))
test('intervalo de datas inclusivo; sem data sai', () => {
  expect(filtrar({ dataDe: '2026-02-10', dataAte: '2026-05-04' })).toEqual(['168707', '163134'])
  expect(filtrar({ dataDe: '2026-03-01' })).toEqual(['168707'])
})
test('texto sem acento encontra cliente', () => expect(filtrar({ texto: 'joao' })).toEqual(['168707']))
test('texto encontra chassi e NF', () => {
  expect(filtrar({ texto: '9bgteste163' })).toEqual(['163134'])
  expect(filtrar({ texto: '000.200.001' })).toEqual(['200001'])
})
test('conc pela linha de NCC', () => expect(filtrar({ conc: 't48' })).toEqual(['168707']))
test('conc pelo faturamento', () => expect(filtrar({ conc: 'T68' })).toHaveLength(3))

test('pagas sem PDF: só carros com NCC paga cujo PDF não foi enviado', () => {
  expect(filtrar({ semPdf: true })).toEqual(['163134'])
  expect(contarSemPdf(CARROS)).toBe(1)
})

test('contadores trazem todas as chaves', () => {
  expect(contarPorStatus(CARROS)).toEqual({ sem_comissao: 0, sem_ncc: 1, ncc_nao_paga: 0, parcial: 1, pago: 1 })
})
