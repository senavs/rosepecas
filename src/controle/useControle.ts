import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { processPdf } from '../ncc/process'
import { abrirArquivo, baixarBase, criarArquivo, gravarArquivo, suportaArquivoLocal } from './fileAccess'
import { definirAjuste, importarFaturamento, importarNcc, importarPagas, removerAjuste } from './merge'
import { lerFaturamento, lerPagas, PlanilhaInvalidaError } from './sheets'
import { controleReducer, ESTADO_INICIAL, type ControleState, type UltimaImportacao } from './state'
import { baseVazia, BaseInvalidaError, lerBase } from './storage'
import type { Ajuste, AlvoAjuste, Base, Leitura, Resumo } from './types'

export type Controle = {
  state: ControleState
  /** Mensagem de erro ao abrir/criar a base (ex.: arquivo que não é base). */
  erroAbrir: string | null
  abrirNovo: () => Promise<void>
  abrirExistente: () => Promise<void>
  abrirDeArquivo: (file: File) => Promise<void>
  importarFaturamentoArquivo: (file: File) => Promise<void>
  importarPagasArquivo: (file: File) => Promise<void>
  importarPdfs: (files: File[]) => Promise<void>
  ajustar: (ajuste: Ajuste) => void
  desfazerAjuste: (alvo: AlvoAjuste) => void
  baixar: () => void
  tentarSalvarDeNovo: () => void
}

const cancelado = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

export function useControle(): Controle {
  const [state, dispatch] = useReducer(controleReducer, ESTADO_INICIAL)
  const [erroAbrir, setErroAbrir] = useState<string | null>(null)
  // As importações são assíncronas: cada uma parte da base mais recente, não da que estava no render.
  const baseRef = useRef<Base | null>(null)
  baseRef.current = state.base

  const alterar = useCallback((base: Base, importacao?: UltimaImportacao) => {
    baseRef.current = base
    dispatch({ type: 'alterada', base, importacao })
  }, [])

  // Gravação automática quando há arquivo aberto.
  useEffect(() => {
    if (!state.handle || !state.base || state.salvamento !== 'pendente') return
    const { handle, base, revisao } = state
    dispatch({ type: 'salvando' })
    gravarArquivo(handle, base).then(
      () => dispatch({ type: 'salvou', revisao }),
      (e: unknown) => dispatch({ type: 'falhouSalvar', mensagem: e instanceof Error ? e.message : 'Não foi possível salvar o arquivo' }),
    )
  }, [state])

  // Avisa antes de fechar a aba com alterações não salvas.
  useEffect(() => {
    if (state.salvamento !== 'pendente' && state.salvamento !== 'erro') return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [state.salvamento])

  const abrirNovo = async () => {
    setErroAbrir(null)
    const base = baseVazia()
    if (!suportaArquivoLocal()) {
      dispatch({ type: 'aberta', base, handle: null, salva: false })
      return
    }
    try {
      dispatch({ type: 'aberta', base, handle: await criarArquivo(base), salva: true })
    } catch (e) {
      if (!cancelado(e)) setErroAbrir('Não foi possível criar o arquivo')
    }
  }

  const abrirExistente = async () => {
    setErroAbrir(null)
    try {
      const { handle, base } = await abrirArquivo()
      dispatch({ type: 'aberta', base, handle, salva: true })
    } catch (e) {
      if (cancelado(e)) return
      setErroAbrir(e instanceof BaseInvalidaError ? e.message : 'Não foi possível abrir o arquivo')
    }
  }

  const abrirDeArquivo = async (file: File) => {
    setErroAbrir(null)
    try {
      dispatch({ type: 'aberta', base: lerBase(await file.text()), handle: null, salva: true })
    } catch (e) {
      setErroAbrir(e instanceof BaseInvalidaError ? e.message : 'Não foi possível abrir o arquivo')
    }
  }

  const importarPlanilha = async <T,>(
    file: File,
    tipo: 'faturamento' | 'pagas',
    ler: (buf: ArrayBuffer) => Promise<Leitura<T>>,
    importar: (base: Base, l: Leitura<T>, arquivo: string, agora: Date) => { base: Base; resumo: Resumo },
  ) => {
    try {
      const leitura = await ler(await file.arrayBuffer())
      if (!baseRef.current) return
      const { base, resumo } = importar(baseRef.current, leitura, file.name, new Date())
      alterar(base, { tipo, arquivo: file.name, resumo })
    } catch (e) {
      const erro = e instanceof PlanilhaInvalidaError ? e.message : 'Não foi possível ler a planilha'
      dispatch({ type: 'falhaImportacao', importacao: { tipo, arquivo: file.name, erro } })
    }
  }

  const importarPdfs = async (files: File[]) => {
    await Promise.all(
      files.map(async (file) => {
        const result = await processPdf(file)
        if (result.status === 'error') {
          dispatch({ type: 'falhaImportacao', importacao: { tipo: 'ncc', arquivo: file.name, erro: result.message } })
          return
        }
        if (!baseRef.current) return
        const { base, resumo } = importarNcc(baseRef.current, result.rows, file.name, new Date())
        alterar(base, { tipo: 'ncc', arquivo: file.name, resumo })
      }),
    )
  }

  return {
    state,
    erroAbrir,
    abrirNovo,
    abrirExistente,
    abrirDeArquivo,
    importarFaturamentoArquivo: (file) => importarPlanilha(file, 'faturamento', lerFaturamento, importarFaturamento),
    importarPagasArquivo: (file) => importarPlanilha(file, 'pagas', lerPagas, importarPagas),
    importarPdfs,
    ajustar: (ajuste) => baseRef.current && alterar(definirAjuste(baseRef.current, ajuste)),
    desfazerAjuste: (alvo) => baseRef.current && alterar(removerAjuste(baseRef.current, alvo)),
    baixar: () => {
      if (!state.base) return
      baixarBase(state.base, new Date())
      dispatch({ type: 'baixou' })
    },
    tentarSalvarDeNovo: () => dispatch({ type: 'tentarDeNovo' }),
  }
}
