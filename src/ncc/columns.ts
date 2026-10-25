import type { NccRow } from './types'

/** As 10 colunas, na ordem da tela e do Excel. */
export const COLUMNS: { key: keyof NccRow; header: string }[] = [
  { key: 'cod', header: 'Cód' },
  { key: 'notificacao', header: 'Notificação de Crédito' },
  { key: 'data', header: 'Data' },
  { key: 'nf', header: 'Núm. NF' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'chassi', header: 'Chassi' },
  { key: 'valorNf', header: 'Valor NF' },
  { key: 'comissaoBruta', header: 'Comissão Bruta' },
  { key: 'impostoRenda', header: 'Imposto de Renda' },
  { key: 'comissaoLiquida', header: 'Comissão Líquida' },
]
