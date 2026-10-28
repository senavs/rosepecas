import type { Base } from './types'

export class BaseInvalidaError extends Error {}

export function baseVazia(): Base {
  return { versao: 1, faturamento: {}, ncc: {}, pagas: {}, ajustes: {}, importacoes: [] }
}

export function serializarBase(base: Base): string {
  return JSON.stringify(base)
}

const TABELAS = ['faturamento', 'ncc', 'pagas', 'ajustes'] as const

export function lerBase(texto: string): Base {
  const invalida = () => new BaseInvalidaError('Este arquivo não é uma base do Controle de NCC')
  let obj: unknown
  try {
    obj = JSON.parse(texto)
  } catch {
    throw invalida()
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw invalida()
  const o = obj as Record<string, unknown>
  const forma =
    typeof o.versao === 'number' &&
    TABELAS.every((t) => o[t] && typeof o[t] === 'object' && !Array.isArray(o[t])) &&
    Array.isArray(o.importacoes)
  if (!forma) throw invalida()
  if (o.versao !== 1) throw new BaseInvalidaError(`Versão da base não suportada: ${o.versao}`)
  return o as unknown as Base
}
