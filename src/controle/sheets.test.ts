// @vitest-environment node
import ExcelJS from 'exceljs'
import { expect, test } from 'vitest'
import { lerFaturamento, lerPagas } from './sheets'

async function planilha(linhas: unknown[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Plan1')
  for (const l of linhas) ws.addRow(l)
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

const CAB_FAT = ['Chassi', 'Data de faturamento', 'Conc Venda', 'Conc Entrega', 'Nome do Cliente', 'Número NF', 'Valor', 'Valor Comissão']

test('lê faturamento com NF numérica, cabeçalho na linha 3 e colunas em outra ordem', async () => {
  const buf = await planilha([
    ['FATURAMENTO 2026'],
    [],
    CAB_FAT,
    ['teste0000000000001', new Date(Date.UTC(2026, 0, 15)), 'T68', 'T48', 'CLIENTE TESTE UM', 168707, 1000.5, 0],
  ])
  const { linhas, ignorados } = await lerFaturamento(buf)
  expect(ignorados).toEqual([])
  expect(linhas).toHaveLength(1)
  expect(linhas[0]).toMatchObject({
    nf: '168707',
    chassi: 'TESTE0000000000001',
    data: '2026-01-15',
    concVenda: 'T68',
    concEntrega: 'T48',
    cliente: 'CLIENTE TESTE UM',
    valor: 1000.5,
    valorComissao: 0,
    regiao: '',
    percComissao: null,
  })
})

test('cabeçalho com acento e maiúsculas diferentes', async () => {
  const buf = await planilha([['NUMERO NF', 'chassi'], ['000.000.001', 'TESTE01']])
  const { linhas } = await lerFaturamento(buf)
  expect(linhas[0]).toMatchObject({ nf: '1', chassi: 'TESTE01', data: null })
})

test('linha sem NF vai para ignorados e linha vazia é pulada', async () => {
  const buf = await planilha([['Número NF', 'Chassi'], ['', 'TESTE01'], [], ['2', 'TESTE02']])
  const { linhas, ignorados } = await lerFaturamento(buf)
  expect(ignorados).toEqual(['Linha 2: sem NF'])
  expect(linhas.map((l) => l.nf)).toEqual(['2'])
})

test('faturamento sem coluna Chassi', async () => {
  const buf = await planilha([['Número NF', 'Valor'], [1, 2]])
  await expect(lerFaturamento(buf)).rejects.toThrow('Coluna "Chassi" não encontrada')
})

test('valor em texto pt-BR é convertido; texto inválido vira null', async () => {
  const buf = await planilha([['Número NF', 'Chassi', 'Valor', 'Valor Comissão'], [1, 'TESTE01', '1.234,56', 'abc']])
  const { linhas } = await lerFaturamento(buf)
  expect(linhas[0].valor).toBe(1234.56)
  expect(linhas[0].valorComissao).toBeNull()
})

test('lê pagas', async () => {
  const buf = await planilha([
    ['CONC', 'NCC', 'Data do recebimento na conta', 'NF'],
    ['T48', 808284, new Date(Date.UTC(2026, 4, 18)), 168707],
    ['T48', '', null, 168707],
  ])
  const { linhas, ignorados } = await lerPagas(buf)
  expect(linhas).toEqual([{ ncc: '808284', nf: '168707', conc: 'T48', dataRecebimento: '2026-05-18' }])
  expect(ignorados).toEqual(['Linha 3: sem NCC ou NF'])
})

test('pagas sem coluna NF', async () => {
  const buf = await planilha([['CONC', 'NCC'], ['T48', 1]])
  await expect(lerPagas(buf)).rejects.toThrow('Coluna "NF" não encontrada')
})

test('célula de fórmula usa o resultado e rich text é concatenado', async () => {
  const buf = await planilha([
    ['Número NF', 'Chassi'],
    [{ formula: '100000+68707', result: 168707 }, { richText: [{ text: 'TESTE' }, { text: '01' }] }],
  ])
  const { linhas } = await lerFaturamento(buf)
  expect(linhas[0]).toMatchObject({ nf: '168707', chassi: 'TESTE01' })
})
