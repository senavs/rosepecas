// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { expect, test, vi } from 'vitest'
import { processPdf } from './process'

vi.mock('./pdfjs', () => import('pdfjs-dist/legacy/build/pdf.mjs'))

const fixture = async (name: string) =>
  new Blob([await readFile(new URL(`../../tests/fixtures/${name}`, import.meta.url))])

test('ok for mock 1', async () => {
  const result = await processPdf(await fixture('ncc-teste-1.pdf'))
  expect(result.status).toBe('ok')
  if (result.status !== 'ok') return
  expect(result.header.cod).toBe('T01')
  expect(result.rows).toHaveLength(1)
  expect(result.rows[0].valorNf).toBe(123456.78)
})

test('handles wrapped name and negatives in mock 3', async () => {
  const result = await processPdf(await fixture('ncc-teste-3.pdf'))
  if (result.status !== 'ok') throw new Error(`esperado ok, veio ${JSON.stringify(result)}`)
  expect(result.rows[0].comissaoBruta).toBe(-500)
  expect(result.rows[1].cliente).toBe('CLIENTE TESTE CINCO SOBRENOME LONGO')
  expect(result.warnings).toEqual([])
})

test('error for non-pdf bytes', async () => {
  expect(await processPdf(new Blob(['isso não é pdf']))).toEqual({
    status: 'error',
    message: 'Não foi possível ler o PDF',
  })
})

test('error for pdf without NCC header', async () => {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  doc.addPage().drawText('Outro documento', { x: 50, y: 700, font, size: 12 })
  expect(await processPdf(new Blob([new Uint8Array(await doc.save())]))).toEqual({
    status: 'error',
    message: 'Não parece um relatório NCC',
  })
})
