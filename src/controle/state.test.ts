import { expect, test } from 'vitest'
import { controleReducer, ESTADO_INICIAL, type ControleAction, type ControleState } from './state'
import { baseVazia } from './storage'

const run = (...acoes: ControleAction[]): ControleState => acoes.reduce(controleReducer, ESTADO_INICIAL)
const aberta: ControleAction = { type: 'aberta', base: baseVazia(), handle: null, salva: true }

test('estado inicial sem base', () => {
  expect(ESTADO_INICIAL).toMatchObject({ base: null, handle: null, revisao: 0, salvamento: 'salvo', importacoes: [] })
})

test('aberta sem salva → pendente; com salva → salvo', () => {
  expect(run({ ...aberta, salva: false }).salvamento).toBe('pendente')
  expect(run(aberta)).toMatchObject({ salvamento: 'salvo', revisao: 0 })
})

test('alterada marca pendente e incrementa revisão', () => {
  const s = run(aberta, { type: 'alterada', base: baseVazia() })
  expect(s).toMatchObject({ salvamento: 'pendente', revisao: 1 })
})

test('alterada com importação põe no topo da lista da sessão', () => {
  const imp = (arquivo: string) => ({ tipo: 'faturamento' as const, arquivo, resumo: { novos: 1, atualizados: 0, inalterados: 0, ignorados: [] } })
  const s = run(aberta, { type: 'alterada', base: baseVazia(), importacao: imp('a') }, { type: 'alterada', base: baseVazia(), importacao: imp('b') })
  expect(s.importacoes.map((i) => i.arquivo)).toEqual(['b', 'a'])
})

test('salvou com revisão antiga mantém pendente', () => {
  const s = run(aberta, { type: 'alterada', base: baseVazia() }, { type: 'salvando' }, { type: 'alterada', base: baseVazia() }, { type: 'salvou', revisao: 1 })
  expect(s.salvamento).toBe('pendente')
})

test('salvou com revisão atual → salvo', () => {
  const s = run(aberta, { type: 'alterada', base: baseVazia() }, { type: 'salvando' }, { type: 'salvou', revisao: 1 })
  expect(s).toMatchObject({ salvamento: 'salvo', erroSalvar: null })
})

test('falhouSalvar mantém a base e guarda a mensagem', () => {
  const base = baseVazia()
  const s = run(aberta, { type: 'alterada', base }, { type: 'salvando' }, { type: 'falhouSalvar', mensagem: 'Sem permissão para gravar no arquivo' })
  expect(s).toMatchObject({ salvamento: 'erro', erroSalvar: 'Sem permissão para gravar no arquivo' })
  expect(s.base).toBe(base)
})

test('tentar de novo: pendente limpa o erro', () => {
  const s = run(aberta, { type: 'alterada', base: baseVazia() }, { type: 'falhouSalvar', mensagem: 'x' }, { type: 'tentarDeNovo' })
  expect(s).toMatchObject({ salvamento: 'pendente', erroSalvar: null })
})

test('baixou → salvo', () => {
  expect(run({ ...aberta, salva: false }, { type: 'baixou' }).salvamento).toBe('salvo')
})

test('falhaImportacao não altera base nem revisão e entra no topo', () => {
  const antes = run(aberta)
  const s = controleReducer(antes, { type: 'falhaImportacao', importacao: { tipo: 'pagas', arquivo: 'p.xlsx', erro: 'Coluna "NF" não encontrada' } })
  expect(s.base).toBe(antes.base)
  expect(s.revisao).toBe(0)
  expect(s.importacoes[0]).toEqual({ tipo: 'pagas', arquivo: 'p.xlsx', erro: 'Coluna "NF" não encontrada' })
})

test('fechada volta ao inicial', () => {
  expect(run(aberta, { type: 'fechada' })).toEqual(ESTADO_INICIAL)
})
