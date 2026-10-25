import { describe, expect, test } from 'vitest'
import type { FileResult } from '../ncc/process'
import type { NccRow } from '../ncc/types'
import { type FileEntry, allRows, fileStatusLabel, filesReducer } from './files'

const header = { cod: 'T01', notificacao: '900001', data: '23/10/2026' }
const row = (nf: string): NccRow => ({ ...header, nf, cliente: 'CLIENTE TESTE', chassi: 'TESTE000000000001', valorNf: 1, comissaoBruta: 1, impostoRenda: 0, comissaoLiquida: 1 })
const ok = (rows: NccRow[], warnings: string[] = []): FileResult => ({ status: 'ok', header, rows, warnings })

const add = (state: FileEntry[], ...ids: string[]) =>
  filesReducer(state, { type: 'added', entries: ids.map((id) => ({ id, name: `${id}.pdf` })) })

describe('filesReducer', () => {
  test('added appends entries as reading', () => {
    const s = add(add([], 'a'), 'b', 'c')
    expect(s.map((e) => [e.id, e.status])).toEqual([['a', 'reading'], ['b', 'reading'], ['c', 'reading']])
  })

  test('processed replaces only the matching entry', () => {
    const s = filesReducer(add([], 'a', 'b'), { type: 'processed', id: 'b', result: ok([row('1')]) })
    expect(s[0].status).toBe('reading')
    expect(s[1]).toMatchObject({ id: 'b', name: 'b.pdf', status: 'ok' })
  })

  test('processed for removed entry is ignored', () => {
    const s = filesReducer(add([], 'a'), { type: 'removed', id: 'a' })
    expect(filesReducer(s, { type: 'processed', id: 'a', result: ok([row('1')]) })).toEqual([])
  })

  test('removed and cleared', () => {
    const s = add([], 'a', 'b')
    expect(filesReducer(s, { type: 'removed', id: 'a' }).map((e) => e.id)).toEqual(['b'])
    expect(filesReducer(s, { type: 'cleared' })).toEqual([])
  })

  test('same file name twice keeps independent entries', () => {
    let s = filesReducer([], { type: 'added', entries: [{ id: 'x1', name: 'mesmo.pdf' }, { id: 'x2', name: 'mesmo.pdf' }] })
    s = filesReducer(s, { type: 'processed', id: 'x1', result: ok([row('1')]) })
    s = filesReducer(s, { type: 'processed', id: 'x2', result: ok([row('2')]) })
    s = filesReducer(s, { type: 'removed', id: 'x1' })
    expect(s.map((e) => e.id)).toEqual(['x2'])
    expect(allRows(s).map((r) => r.nf)).toEqual(['2'])
  })
})

test('allRows concatenates ok entries in file order', () => {
  let s = add([], 'a', 'b', 'c')
  s = filesReducer(s, { type: 'processed', id: 'c', result: ok([row('3')]) })
  s = filesReducer(s, { type: 'processed', id: 'a', result: ok([row('1'), row('2')]) })
  s = filesReducer(s, { type: 'processed', id: 'b', result: { status: 'error', message: 'Nenhuma linha encontrada' } })
  expect(allRows(s).map((r) => r.nf)).toEqual(['1', '2', '3'])
})

describe('fileStatusLabel', () => {
  const entry = (r: FileResult | { status: 'reading' }): FileEntry => ({ id: 'a', name: 'a.pdf', ...r }) as FileEntry
  test('reading', () => expect(fileStatusLabel(entry({ status: 'reading' }))).toBe('Lendo…'))
  test('ok singular and plural', () => {
    expect(fileStatusLabel(entry(ok([row('1')])))).toBe('1 linha')
    expect(fileStatusLabel(entry(ok([row('1'), row('2')])))).toBe('2 linhas')
  })
  test('ok with warnings', () => {
    expect(fileStatusLabel(entry(ok([row('1'), row('2')], ['x'])))).toBe('2 linhas lidas, 1 não reconhecida')
    expect(fileStatusLabel(entry(ok([row('1')], ['x', 'y'])))).toBe('1 linha lida, 2 não reconhecidas')
  })
  test('error shows message', () => {
    expect(fileStatusLabel(entry({ status: 'error', message: 'Não foi possível ler o PDF' }))).toBe('Não foi possível ler o PDF')
  })
})
