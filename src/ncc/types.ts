export type TextItem = { str: string; x: number }

/** Uma linha visual do PDF: itens na mesma altura, ordenados por x. */
export type TextLine = { text: string; items: TextItem[] }

/** Dados do cabeçalho do relatório. `data` em 'dd/mm/aaaa'. */
export type NccHeader = { cod: string; notificacao: string; data: string }

export type NccRow = NccHeader & {
  nf: string
  cliente: string
  chassi: string
  valorNf: number
  comissaoBruta: number
  impostoRenda: number
  comissaoLiquida: number
}

/** `warnings` traz o texto bruto das linhas com NF que não foram reconhecidas. */
export type ParseResult = { header: NccHeader; rows: NccRow[]; warnings: string[] }
