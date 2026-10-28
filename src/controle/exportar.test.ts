// @vitest-environment node
import ExcelJS from 'exceljs'
import { expect, test } from 'vitest'
import { buildVisaoBuffer, nomeExportacao } from './exportar'
import { linhaKey } from './normalize'
import { baseVazia } from './storage'
import type { Base, Faturamento, NccLinha } from './types'
import { calcularVisao } from './view'

const fat = (nf: string, chassi: string): Faturamento => ({
  nf, chassi, data: '2026-05-04', regiao: '', concVenda: 'T68', concEntrega: 'T48', clienteDoc: '', cliente: 'CLIENTE TESTE',
  processo: '', pedido: '', formaPagamento: '', statusPedido: '', valor: 1000, percComissao: 5, valorComissao: 50,
})
const linha = (ncc: string, nf: string, chassi: string, cod: string): NccLinha => ({
  ncc, nf, cod, data: '2026-05-08', cliente: 'CLIENTE TESTE', chassi, valorNf: 1000, comissaoBruta: 10, impostoRenda: 0, comissaoLiquida: 10,
})

test('carro parcial com 2 NCCs gera 2 linhas; carro sem NCC gera 1', async () => {
  const base: Base = {
    ...baseVazia(),
    faturamento: { '168707': fat('168707', 'A'), '3': fat('3', 'B') },
    ncc: { [linhaKey('808285', '168707')]: linha('808285', '168707', 'A', 'T68'), [linhaKey('808284', '168707')]: linha('808284', '168707', 'A', 'T48') },
    pagas: { [linhaKey('808285', '168707')]: { ncc: '808285', nf: '168707', conc: 'T68', dataRecebimento: '2026-05-18' } },
  }
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildVisaoBuffer(calcularVisao(base).carros))
  const ws = wb.getWorksheet('Controle NCC')!
  const cab = (ws.getRow(1).values as unknown[]).slice(1)
  expect(cab).toContain('Status do carro')
  const col = (nome: string) => cab.indexOf(nome) + 1
  const linhas = [2, 3, 4].map((n) => ws.getRow(n))
  expect(ws.rowCount).toBe(4)
  // Linhas do carro em ordem de data e depois de nº da NCC.
  expect(linhas.map((r) => r.getCell(col('NCC')).value)).toEqual(['808284', '808285', null])
  expect(linhas.map((r) => r.getCell(col('Status do carro')).value)).toEqual(['Parcialmente pago', 'Parcialmente pago', 'Sem NCC'])
  expect(linhas.map((r) => r.getCell(col('Status da NCC')).value)).toEqual(['Não paga', 'Paga', null])
  expect(linhas[1].getCell(col('Data pagamento')).value).toEqual(new Date(Date.UTC(2026, 4, 18)))
})

test('nome do arquivo', () => {
  expect(nomeExportacao(new Date(2026, 9, 28))).toBe('Controle-NCC-2026-10-28.xlsx')
})
