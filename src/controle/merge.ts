import type { NccRow } from '../ncc/types'
import { ajusteKey, linhaKey, normChassi, normDigits, normText, toIsoDate } from './normalize'
import type { Ajuste, AlvoAjuste, Base, Faturamento, Leitura, NccLinha, Paga, Resumo, TipoImportacao } from './types'

const vazio = (v: unknown) => v === null || v === undefined || v === ''

/** Campo novo não vazio substitui; campo novo vazio mantém o existente. */
function mesclar<T extends object>(atual: T | undefined, novo: T): T {
  if (!atual) return novo
  const out = { ...atual }
  for (const k of Object.keys(novo) as (keyof T)[]) {
    if (!vazio(novo[k])) out[k] = novo[k]
  }
  return out
}

function iguais<T extends object>(a: T, b: T): boolean {
  return (Object.keys(b) as (keyof T)[]).every((k) => a[k] === b[k])
}

/** Junta as duplicatas do próprio upload, depois mescla na tabela e conta novos/atualizados/inalterados. */
function upsertTodos<T extends object>(
  tabela: Record<string, T>,
  itens: T[],
  chave: (t: T) => string,
): { tabela: Record<string, T>; contagem: Omit<Resumo, 'ignorados'> } {
  const doUpload = new Map<string, T>()
  for (const item of itens) {
    const k = chave(item)
    doUpload.set(k, mesclar(doUpload.get(k), item))
  }
  const out = { ...tabela }
  const contagem = { novos: 0, atualizados: 0, inalterados: 0 }
  for (const [k, item] of doUpload) {
    const atual = tabela[k]
    const mesclado = mesclar(atual, item)
    if (!atual) contagem.novos++
    else if (iguais(atual, mesclado)) contagem.inalterados++
    else contagem.atualizados++
    out[k] = mesclado
  }
  return { tabela: out, contagem }
}

function registrar(base: Base, tipo: TipoImportacao, arquivo: string, agora: Date, resumo: Resumo): Base {
  const { ignorados, ...contagem } = resumo
  return {
    ...base,
    importacoes: [...base.importacoes, { tipo, arquivo, em: agora.toISOString(), ...contagem, ignorados: ignorados.length }],
  }
}

export function importarFaturamento(
  base: Base,
  leitura: Leitura<Faturamento>,
  arquivo: string,
  agora: Date,
): { base: Base; resumo: Resumo } {
  const { tabela, contagem } = upsertTodos(base.faturamento, leitura.linhas, (f) => f.nf)
  const resumo = { ...contagem, ignorados: leitura.ignorados }
  return { base: registrar({ ...base, faturamento: tabela }, 'faturamento', arquivo, agora, resumo), resumo }
}

export function importarPagas(base: Base, leitura: Leitura<Paga>, arquivo: string, agora: Date): { base: Base; resumo: Resumo } {
  const { tabela, contagem } = upsertTodos(base.pagas, leitura.linhas, (p) => linhaKey(p.ncc, p.nf))
  const resumo = { ...contagem, ignorados: leitura.ignorados }
  return { base: registrar({ ...base, pagas: tabela }, 'pagas', arquivo, agora, resumo), resumo }
}

function paraLinha(r: NccRow): NccLinha {
  return {
    ncc: normDigits(r.notificacao),
    nf: normDigits(r.nf),
    cod: normText(r.cod).toUpperCase(),
    data: toIsoDate(r.data),
    cliente: normText(r.cliente),
    chassi: normChassi(r.chassi),
    valorNf: r.valorNf,
    comissaoBruta: r.comissaoBruta,
    impostoRenda: r.impostoRenda,
    comissaoLiquida: r.comissaoLiquida,
  }
}

export function importarNcc(base: Base, rows: NccRow[], arquivo: string, agora: Date): { base: Base; resumo: Resumo } {
  const linhas = rows.map(paraLinha)
  const validas = linhas.filter((l) => l.ncc && l.nf)
  const ignorados = linhas.filter((l) => !(l.ncc && l.nf)).map((l) => `NF "${l.nf}" sem número de NCC ou NF`)
  const { tabela, contagem } = upsertTodos(base.ncc, validas, (l) => linhaKey(l.ncc, l.nf))
  const resumo = { ...contagem, ignorados }
  return { base: registrar({ ...base, ncc: tabela }, 'ncc', arquivo, agora, resumo), resumo }
}

export function definirAjuste(base: Base, ajuste: Ajuste): Base {
  return { ...base, ajustes: { ...base.ajustes, [ajusteKey(ajuste.alvo)]: ajuste } }
}

export function removerAjuste(base: Base, alvo: AlvoAjuste): Base {
  const ajustes = { ...base.ajustes }
  delete ajustes[ajusteKey(alvo)]
  return { ...base, ajustes }
}
