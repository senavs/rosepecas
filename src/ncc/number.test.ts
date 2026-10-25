import { describe, expect, test } from 'vitest'
import { formatBr, parseBrNumber, sumCents } from './number'

describe('parseBrNumber', () => {
  test('parses thousands and decimals', () => {
    expect(parseBrNumber('123.456,78')).toBe(123456.78)
  })
  test('parses small values', () => {
    expect(parseBrNumber('18,52')).toBe(18.52)
  })
  test('parses SAP trailing minus', () => {
    expect(parseBrNumber('500,00-')).toBe(-500)
  })
  test('parses leading minus', () => {
    expect(parseBrNumber('-7,50')).toBe(-7.5)
  })
  test('throws on invalid input', () => {
    expect(() => parseBrNumber('abc')).toThrow()
    expect(() => parseBrNumber('')).toThrow()
  })
})

test('formatBr uses pt-BR with 2 decimals', () => {
  expect(formatBr(1234.5)).toBe('1.234,50')
  expect(formatBr(-7.5)).toBe('-7,50')
})

test('sumCents avoids floating point drift', () => {
  expect(sumCents([0.1, 0.2])).toBe(0.3)
  expect(sumCents([])).toBe(0)
})
