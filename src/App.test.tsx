import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import type { FileResult } from './ncc/process'
import type { NccRow } from './ncc/types'
import { downloadXlsx } from './ncc/xlsx'

const r = (cod: string, nf: string, valorNf: number, comissaoBruta: number, impostoRenda: number): NccRow => ({
  cod, notificacao: `90000${cod.slice(-1)}`, data: '23/10/2026', nf, cliente: `CLIENTE TESTE ${nf.slice(-1)}`,
  chassi: `TESTE00000000000${nf.slice(-1)}`, valorNf, comissaoBruta, impostoRenda,
  comissaoLiquida: Math.round((comissaoBruta - impostoRenda) * 100) / 100,
})

const RESULTS: Record<string, FileResult> = {
  'a.pdf': { status: 'ok', header: { cod: 'T01', notificacao: '900001', data: '23/10/2026' }, rows: [r('T01', '000.000.001', 123456.78, 1234.56, 18.52)], warnings: [] },
  'b.pdf': {
    status: 'ok', header: { cod: 'T02', notificacao: '900002', data: '23/10/2026' },
    rows: [r('T02', '000.000.002', 200000, 10000, 150), r('T02', '000.000.003', 80000, 4000, 60)], warnings: [],
  },
  'bad.pdf': { status: 'error', message: 'Não foi possível ler o PDF' },
  'warn.pdf': {
    status: 'ok', header: { cod: 'T04', notificacao: '900004', data: '23/10/2026' },
    rows: [r('T04', '000.000.004', 1000, 10, 1)], warnings: ['000.000.009 LINHA ESTRANHA'],
  },
}

vi.mock('./ncc/process', () => ({
  processPdf: vi.fn(async (file: File) => RESULTS[file.name]),
}))
vi.mock('./ncc/xlsx', () => ({ downloadXlsx: vi.fn(async () => {}) }))

const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' })

async function upload(...names: string[]) {
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText(/adicionar pdfs/i), names.map(pdf))
  return user
}

const dataRows = () => screen.queryAllByRole('row').filter((row) => row.closest('tbody'))
const totalRow = () => screen.getByRole('row', { name: /total/i })

beforeEach(() => vi.mocked(downloadXlsx).mockClear())

test('renders the app title', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /consolidador de ncc/i })).toBeInTheDocument()
})

test('empty state explains what to do and export is disabled', () => {
  render(<App />)
  expect(screen.getByText(/arraste os pdfs/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /exportar excel/i })).toBeDisabled()
})

test('file input accepts multiple pdfs', () => {
  render(<App />)
  const input = screen.getByLabelText(/adicionar pdfs/i) as HTMLInputElement
  expect(input.multiple).toBe(true)
  expect(input.accept).toBe('.pdf,application/pdf')
})

describe('with uploaded files', () => {
  test('merges rows of all files and shows totals', async () => {
    render(<App />)
    await upload('a.pdf', 'b.pdf')
    await waitFor(() => expect(dataRows()).toHaveLength(3))
    const total = within(totalRow())
    for (const v of ['403.456,78', '15.234,56', '228,52', '15.006,04']) expect(total.getByText(v)).toBeInTheDocument()
    expect(total.getByText(/3 linhas/)).toBeInTheDocument()
    const sidebar = within(screen.getByRole('list'))
    expect(sidebar.getByText('NCC 900002')).toBeInTheDocument()
    expect(sidebar.getByText('2 linhas')).toBeInTheDocument()
  })

  test('error file shows message without affecting rows', async () => {
    render(<App />)
    await upload('a.pdf', 'bad.pdf')
    await waitFor(() => expect(screen.getByText('Não foi possível ler o PDF')).toBeInTheDocument())
    expect(dataRows()).toHaveLength(1)
  })

  test('warning file shows label and unrecognized line', async () => {
    render(<App />)
    const user = await upload('warn.pdf')
    await waitFor(() => expect(screen.getByText('1 linha lida, 1 não reconhecida')).toBeInTheDocument())
    await user.click(screen.getByText(/ver linha não reconhecida/i))
    expect(screen.getByText('000.000.009 LINHA ESTRANHA')).toBeInTheDocument()
    expect(dataRows()).toHaveLength(1)
  })

  test('dedupe filters table, totals and export', async () => {
    render(<App />)
    const user = await upload('a.pdf', 'b.pdf')
    await waitFor(() => expect(dataRows()).toHaveLength(3))
    await upload('b.pdf')
    await waitFor(() => expect(dataRows()).toHaveLength(5))

    await user.click(screen.getByLabelText(/excluir duplicados/i))
    expect(dataRows()).toHaveLength(3)
    expect(screen.getByText('2 duplicadas ocultas')).toBeInTheDocument()
    expect(within(totalRow()).getByText('403.456,78')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /exportar excel/i }))
    expect(downloadXlsx).toHaveBeenCalledTimes(1)
    expect(vi.mocked(downloadXlsx).mock.calls[0][0]).toHaveLength(3)
  })

  test('export without dedupe sends all rows', async () => {
    render(<App />)
    const user = await upload('a.pdf', 'a.pdf')
    await waitFor(() => expect(dataRows()).toHaveLength(2))
    await user.click(screen.getByRole('button', { name: /exportar excel/i }))
    expect(vi.mocked(downloadXlsx).mock.calls[0][0]).toHaveLength(2)
  })

  test('remove one file and clear all', async () => {
    render(<App />)
    const user = await upload('a.pdf', 'b.pdf')
    await waitFor(() => expect(dataRows()).toHaveLength(3))
    await user.click(screen.getByRole('button', { name: 'Remover b.pdf' }))
    expect(dataRows()).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /limpar tudo/i }))
    expect(dataRows()).toHaveLength(0)
    expect(screen.getByText(/arraste os pdfs/i)).toBeInTheDocument()
  })
})
