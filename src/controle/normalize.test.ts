import { expect, test } from 'vitest'
import { ajusteKey, linhaKey, normChassi, normDigits, normText, semAcento, toIsoDate } from './normalize'

test('normDigits iguala formatos de NF', () => {
  expect(normDigits('000.168.707')).toBe('168707')
  expect(normDigits(168707)).toBe('168707')
  expect(normDigits('0168707')).toBe('168707')
  expect(normDigits(null)).toBe('')
  expect(normDigits('sem número')).toBe('')
})

test('normChassi', () => {
  expect(normChassi(' 9bg148mk0 tc440293 ')).toBe('9BG148MK0TC440293')
  expect(normChassi(undefined)).toBe('')
})

test('normText', () => {
  expect(normText('  T68 ')).toBe('T68')
  expect(normText(null)).toBe('')
  expect(normText(16)).toBe('16')
})

test('toIsoDate', () => {
  expect(toIsoDate(new Date(Date.UTC(2026, 0, 15)))).toBe('2026-01-15')
  expect(toIsoDate('23/10/2026')).toBe('2026-10-23')
  expect(toIsoDate('23.10.2026')).toBe('2026-10-23')
  expect(toIsoDate('2026-10-23T00:00:00.000Z')).toBe('2026-10-23')
  expect(toIsoDate('')).toBeNull()
  expect(toIsoDate(42)).toBeNull()
  expect(toIsoDate(new Date('inválida'))).toBeNull()
})

test('chaves', () => {
  expect(linhaKey('808285', '168707')).toBe('808285|168707')
  expect(ajusteKey({ tipo: 'carro', nf: '168707' })).toBe('carro:168707')
  expect(ajusteKey({ tipo: 'linha', ncc: '808285', nf: '168707' })).toBe('linha:808285|168707')
})

test('semAcento', () => {
  expect(semAcento('Número NF')).toBe('numero nf')
  expect(semAcento('  JOÃO ')).toBe('joao')
})
