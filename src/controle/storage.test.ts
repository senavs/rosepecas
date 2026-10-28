import { expect, test } from 'vitest'
import { baseVazia, lerBase, serializarBase } from './storage'

test('ida e volta', () => {
  const b = baseVazia()
  b.faturamento['1'] = {
    nf: '1', chassi: 'TESTE', data: '2026-01-01', regiao: '', concVenda: '', concEntrega: '', clienteDoc: '', cliente: 'CLIENTE TESTE',
    processo: '', pedido: '', formaPagamento: '', statusPedido: '', valor: 1, percComissao: null, valorComissao: 0,
  }
  expect(lerBase(serializarBase(b))).toEqual(b)
})

test('baseVazia', () => {
  expect(baseVazia()).toEqual({ versao: 1, faturamento: {}, ncc: {}, pagas: {}, ajustes: {}, importacoes: [] })
})

test.each(['{}', 'não é json', '[]', 'null', '{"versao":1,"faturamento":{}}'])('arquivo que não é base: %s', (texto) => {
  expect(() => lerBase(texto)).toThrow('Este arquivo não é uma base do Controle de NCC')
})

test('versão futura', () => {
  const texto = JSON.stringify({ ...baseVazia(), versao: 2 })
  expect(() => lerBase(texto)).toThrow('Versão da base não suportada: 2')
})
