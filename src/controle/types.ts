/** Datas em ISO 'aaaa-mm-dd'. NF e nº de NCC só com dígitos, sem zeros à esquerda. */

export type Faturamento = {
  nf: string
  chassi: string
  data: string | null
  regiao: string
  concVenda: string
  concEntrega: string
  clienteDoc: string
  cliente: string
  processo: string
  pedido: string
  formaPagamento: string
  statusPedido: string
  valor: number | null
  percComissao: number | null
  valorComissao: number | null
}

export type NccLinha = {
  ncc: string
  nf: string
  cod: string
  data: string | null
  cliente: string
  chassi: string
  valorNf: number | null
  comissaoBruta: number | null
  impostoRenda: number | null
  comissaoLiquida: number | null
}

export type Paga = { ncc: string; nf: string; conc: string; dataRecebimento: string | null }

export type AlvoAjuste = { tipo: 'carro'; nf: string } | { tipo: 'linha'; ncc: string; nf: string }

/** Ajuste manual: camada por cima dos dados importados, que nunca são alterados. `em` em ISO datetime. */
export type Ajuste = { alvo: AlvoAjuste; status: 'pago' | 'nao_pago'; em: string; obs: string }

export type TipoImportacao = 'faturamento' | 'pagas' | 'ncc'

export type Resumo = { novos: number; atualizados: number; inalterados: number; ignorados: string[] }

export type Importacao = { tipo: TipoImportacao; arquivo: string; em: string } & Omit<Resumo, 'ignorados'> & {
    ignorados: number
  }

export type Base = {
  versao: 1
  /** chave: nf */
  faturamento: Record<string, Faturamento>
  /** chave: linhaKey(ncc, nf) */
  ncc: Record<string, NccLinha>
  /** chave: linhaKey(ncc, nf) */
  pagas: Record<string, Paga>
  /** chave: ajusteKey(alvo) */
  ajustes: Record<string, Ajuste>
  importacoes: Importacao[]
}

/** Resultado da leitura de uma planilha: linhas válidas + motivos das ignoradas. */
export type Leitura<T> = { linhas: T[]; ignorados: string[] }

export type StatusLinha = 'paga' | 'nao_paga'

export type StatusCarro = 'sem_comissao' | 'sem_ncc' | 'ncc_nao_paga' | 'parcial' | 'pago'

/**
 * planilha = só dados importados; manual = um ajuste decidiu; confirmado = ajuste "pago" e a planilha concorda;
 * conflito = ajuste "não pago", mas a planilha de pagas confirma o pagamento (a planilha vence).
 */
export type Marca = 'planilha' | 'manual' | 'confirmado' | 'conflito'

export type LinhaView = {
  chave: string
  ncc: string
  nf: string
  cod: string
  data: string | null
  chassi: string
  cliente: string
  comissaoLiquida: number | null
  /** false = pagamento sem o PDF da NCC carregado */
  temPdf: boolean
  dataPagamento: string | null
  calculado: StatusLinha
  exibido: StatusLinha
  marca: Marca
  ajuste: Ajuste | null
}

export type CarroView = {
  fat: Faturamento
  linhas: LinhaView[]
  /** linhas com exibido 'nao_paga' */
  faltando: LinhaView[]
  /** a partir do status exibido das linhas */
  calculado: StatusCarro
  exibido: StatusCarro
  marca: Marca
  ajuste: Ajuste | null
}

export type MotivoOrfao = 'sem_faturamento' | 'chassi_divergente'

export type OrfaoView = LinhaView & { motivo: MotivoOrfao }

export type Visao = { carros: CarroView[]; orfaos: OrfaoView[] }
