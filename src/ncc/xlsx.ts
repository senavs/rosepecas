import { COLUMNS } from './columns'
import { computeTotals } from './rows'
import type { NccRow } from './types'

export { COLUMNS }

const MONEY_KEYS = ['valorNf', 'comissaoBruta', 'impostoRenda', 'comissaoLiquida'] as const
const WIDTHS: Partial<Record<keyof NccRow, number>> = { notificacao: 22, nf: 14, cliente: 40, chassi: 20, data: 12 }

/** 'dd/mm/aaaa' → Date em UTC meia-noite (o Excel não tem fuso; assim o dia não muda). */
function toExcelDate(data: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data)
  return m ? new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))) : null
}

export async function buildWorkbookBuffer(rows: NccRow[]): Promise<ArrayBuffer> {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('NCC')

  ws.columns = COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: WIDTHS[c.key] ?? 16,
    style: (MONEY_KEYS as readonly string[]).includes(c.key)
      ? { numFmt: '#,##0.00' }
      : c.key === 'data'
        ? { numFmt: 'dd/mm/yyyy' }
        : {},
  }))
  ws.getRow(1).font = { bold: true }

  for (const row of rows) ws.addRow({ ...row, data: toExcelDate(row.data) })

  const totals = computeTotals(rows)
  const first = 2
  const last = rows.length + 1
  const totalRow = ws.addRow({ cod: 'TOTAL' })
  for (const key of MONEY_KEYS) {
    const col = ws.getColumn(key).letter
    totalRow.getCell(key).value = { formula: `SUM(${col}${first}:${col}${last})`, result: totals[key] }
  }
  totalRow.font = { bold: true }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

export function exportFilename(today: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `NCC-consolidado-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}.xlsx`
}

export async function downloadXlsx(rows: NccRow[]): Promise<void> {
  const buffer = await buildWorkbookBuffer(rows)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFilename(new Date())
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
