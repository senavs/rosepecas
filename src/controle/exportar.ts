import { MARCA_LABEL, STATUS_CARRO_LABEL, STATUS_LINHA_LABEL } from './labels'
import type { CarroView } from './types'

const COLUNAS = [
  { header: 'Data faturamento', key: 'dataFat', width: 14, fmt: 'dd/mm/yyyy' },
  { header: 'Conc Venda', key: 'concVenda', width: 11 },
  { header: 'Conc Entrega', key: 'concEntrega', width: 12 },
  { header: 'Cliente', key: 'cliente', width: 40 },
  { header: 'NF', key: 'nf', width: 12 },
  { header: 'Chassi', key: 'chassi', width: 20 },
  { header: 'Valor', key: 'valor', width: 14, fmt: '#,##0.00' },
  { header: 'Valor Comissão', key: 'valorComissao', width: 15, fmt: '#,##0.00' },
  { header: 'Status do carro', key: 'statusCarro', width: 22 },
  { header: 'Ajuste do carro', key: 'ajusteCarro', width: 15 },
  { header: 'NCC', key: 'ncc', width: 12 },
  { header: 'Cód NCC', key: 'cod', width: 9 },
  { header: 'Data NCC', key: 'dataNcc', width: 12, fmt: 'dd/mm/yyyy' },
  { header: 'Comissão Líquida', key: 'comissaoLiquida', width: 16, fmt: '#,##0.00' },
  { header: 'Status da NCC', key: 'statusNcc', width: 13 },
  { header: 'Ajuste da NCC', key: 'ajusteNcc', width: 14 },
  { header: 'Data pagamento', key: 'dataPagamento', width: 15, fmt: 'dd/mm/yyyy' },
] as const

/** 'aaaa-mm-dd' → Date em UTC meia-noite (o Excel não tem fuso; assim o dia não muda). */
const data = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00.000Z`) : null)

/** Uma linha por NCC do carro; carro sem NCC ocupa uma linha só. */
export async function buildVisaoBuffer(carros: CarroView[]): Promise<ArrayBuffer> {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Controle NCC')
  ws.columns = COLUNAS.map((c) => ({ header: c.header, key: c.key, width: c.width, style: 'fmt' in c ? { numFmt: c.fmt } : {} }))
  ws.getRow(1).font = { bold: true }

  for (const c of carros) {
    const carro = {
      dataFat: data(c.fat.data),
      concVenda: c.fat.concVenda,
      concEntrega: c.fat.concEntrega,
      cliente: c.fat.cliente,
      nf: c.fat.nf,
      chassi: c.fat.chassi,
      valor: c.fat.valor,
      valorComissao: c.fat.valorComissao,
      statusCarro: STATUS_CARRO_LABEL[c.exibido],
      ajusteCarro: MARCA_LABEL[c.marca],
    }
    if (c.linhas.length === 0) ws.addRow(carro)
    for (const l of c.linhas) {
      ws.addRow({
        ...carro,
        ncc: l.ncc,
        cod: l.cod,
        dataNcc: data(l.data),
        comissaoLiquida: l.comissaoLiquida,
        statusNcc: STATUS_LINHA_LABEL[l.exibido],
        ajusteNcc: MARCA_LABEL[l.marca],
        dataPagamento: data(l.dataPagamento),
      })
    }
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

export function nomeExportacao(hoje: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Controle-NCC-${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}.xlsx`
}

export async function downloadVisao(carros: CarroView[]): Promise<void> {
  const buffer = await buildVisaoBuffer(carros)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeExportacao(new Date())
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
