import type { Base, Resumo, TipoImportacao } from './types'

export type Salvamento = 'salvo' | 'pendente' | 'salvando' | 'erro'

export type UltimaImportacao =
  | { tipo: TipoImportacao; arquivo: string; resumo: Resumo }
  | { tipo: TipoImportacao; arquivo: string; erro: string }

export type ControleState = {
  base: Base | null
  handle: FileSystemFileHandle | null
  /** Incrementa a cada alteração; a gravação só conta como "salvo" se terminou na revisão atual. */
  revisao: number
  salvamento: Salvamento
  erroSalvar: string | null
  /** Importações desta sessão, mais recente primeiro. */
  importacoes: UltimaImportacao[]
}

export type ControleAction =
  | { type: 'aberta'; base: Base; handle: FileSystemFileHandle | null; salva: boolean }
  | { type: 'alterada'; base: Base; importacao?: UltimaImportacao }
  | { type: 'falhaImportacao'; importacao: UltimaImportacao }
  | { type: 'salvando' }
  | { type: 'salvou'; revisao: number }
  | { type: 'falhouSalvar'; mensagem: string }
  | { type: 'tentarDeNovo' }
  | { type: 'baixou' }
  | { type: 'fechada' }

export const ESTADO_INICIAL: ControleState = {
  base: null,
  handle: null,
  revisao: 0,
  salvamento: 'salvo',
  erroSalvar: null,
  importacoes: [],
}

export function controleReducer(s: ControleState, a: ControleAction): ControleState {
  switch (a.type) {
    case 'aberta':
      return { ...ESTADO_INICIAL, base: a.base, handle: a.handle, salvamento: a.salva ? 'salvo' : 'pendente' }
    case 'alterada':
      return {
        ...s,
        base: a.base,
        revisao: s.revisao + 1,
        salvamento: 'pendente',
        importacoes: a.importacao ? [a.importacao, ...s.importacoes] : s.importacoes,
      }
    case 'falhaImportacao':
      return { ...s, importacoes: [a.importacao, ...s.importacoes] }
    case 'salvando':
      return { ...s, salvamento: 'salvando' }
    case 'salvou':
      return { ...s, salvamento: a.revisao === s.revisao ? 'salvo' : 'pendente', erroSalvar: null }
    case 'falhouSalvar':
      return { ...s, salvamento: 'erro', erroSalvar: a.mensagem }
    case 'tentarDeNovo':
      return { ...s, salvamento: 'pendente', erroSalvar: null }
    case 'baixou':
      return { ...s, salvamento: 'salvo', erroSalvar: null }
    case 'fechada':
      return ESTADO_INICIAL
  }
}
