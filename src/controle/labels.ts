import type { Marca, StatusCarro, StatusLinha } from './types'

export const STATUS_CARRO_LABEL: Record<StatusCarro, string> = {
  sem_comissao: 'Sem comissão',
  sem_ncc: 'Sem NCC',
  ncc_nao_paga: 'NCC recebida, não paga',
  parcial: 'Parcialmente pago',
  pago: 'Pago',
}

export const STATUS_LINHA_LABEL: Record<StatusLinha, string> = { paga: 'Paga', nao_paga: 'Não paga' }

export const MARCA_LABEL: Record<Marca, string> = { planilha: '', manual: 'manual', confirmado: 'confirmado', conflito: 'conflito' }

/** 'aaaa-mm-dd' → 'dd/mm/aaaa'; vazio para null. */
export function formatarData(iso: string | null): string {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** Ordem de exibição dos status nos contadores e filtros. */
export const ORDEM_STATUS: StatusCarro[] = ['ncc_nao_paga', 'parcial', 'sem_ncc', 'pago', 'sem_comissao']
