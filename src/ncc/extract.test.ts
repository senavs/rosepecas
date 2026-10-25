// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { describe, expect, test, vi } from 'vitest'
import { extractTextLines, groupTextItems } from './extract'
import { parseNccLines } from './parse'

vi.mock('./pdfjs', () => import('pdfjs-dist/legacy/build/pdf.mjs'))

const fixture = async (name: string) => {
  const buf = await readFile(new URL(`../../tests/fixtures/${name}`, import.meta.url))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('groupTextItems', () => {
  test('merges same-y items and orders by x', () => {
    const lines = groupTextItems([
      { str: 'B', transform: [1, 0, 0, 1, 50, 100] },
      { str: 'A', transform: [1, 0, 0, 1, 10, 101] },
      { str: '  ', transform: [1, 0, 0, 1, 30, 100] },
      { str: 'C', transform: [1, 0, 0, 1, 10, 80] },
    ])
    expect(lines.map((l) => l.text)).toEqual(['A B', 'C'])
    expect(lines[0].items).toEqual([
      { str: 'A', x: 10 },
      { str: 'B', x: 50 },
    ])
  })
})

test('extracts lines from mock pdf', async () => {
  const lines = await extractTextLines(await fixture('ncc-teste-2.pdf'))
  const { header, rows } = parseNccLines(lines)
  expect(header).toEqual({ cod: 'T02', notificacao: '900002', data: '24/10/2026' })
  expect(rows.map((r) => r.cliente)).toEqual(['CLIENTE TESTE DOIS', 'CLIENTE TESTE TRES'])
})
