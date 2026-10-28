import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { processPdf } from '../ncc/process'
import { abrirArquivo, gravarArquivo } from './fileAccess'
import { baseVazia } from './storage'
import type { Ajuste } from './types'
import { useControle } from './useControle'

vi.mock('./fileAccess', () => ({
  suportaArquivoLocal: () => true,
  abrirArquivo: vi.fn(),
  criarArquivo: vi.fn(),
  gravarArquivo: vi.fn(),
  baixarBase: vi.fn(),
}))
vi.mock('../ncc/process', () => ({ processPdf: vi.fn() }))

const handle = { name: 'controle-ncc.json' } as FileSystemFileHandle
const ajuste = (nf: string): Ajuste => ({ alvo: { tipo: 'carro', nf }, status: 'pago', em: '2026-10-28T12:00:00.000Z', obs: '' })

/** Gravações controladas pelo teste: cada chamada fica pendente até `terminar(i)`. */
let gravacoes: { base: unknown; terminar: () => void }[]

beforeEach(() => {
  gravacoes = []
  vi.mocked(gravarArquivo).mockReset()
  vi.mocked(gravarArquivo).mockImplementation(
    (_h, base) => new Promise<void>((resolve) => gravacoes.push({ base, terminar: resolve })),
  )
  vi.mocked(abrirArquivo).mockResolvedValue({ handle, base: baseVazia() })
})

async function abrir() {
  const hook = renderHook(() => useControle())
  await act(() => hook.result.current.abrirExistente())
  return hook
}

test('uma gravação por vez: alterações durante a gravação viram uma única gravação seguinte, com a base mais recente', async () => {
  const { result } = await abrir()
  act(() => void result.current.ajustar(ajuste('1')))
  await waitFor(() => expect(gravacoes).toHaveLength(1))
  act(() => void result.current.ajustar(ajuste('2')))
  act(() => void result.current.ajustar(ajuste('3')))
  // A primeira ainda não terminou: nenhuma escrita concorrente.
  expect(gravacoes).toHaveLength(1)
  await act(async () => gravacoes[0].terminar())
  await waitFor(() => expect(gravacoes).toHaveLength(2))
  expect(Object.keys((gravacoes[1].base as ReturnType<typeof baseVazia>).ajustes).sort()).toEqual(['carro:1', 'carro:2', 'carro:3'])
  await act(async () => gravacoes[1].terminar())
  await waitFor(() => expect(result.current.state.salvamento).toBe('salvo'))
  expect(gravacoes).toHaveLength(2)
})

test('fechar a aba durante "Salvando…" pede confirmação', async () => {
  const { result } = await abrir()
  act(() => void result.current.ajustar(ajuste('1')))
  await waitFor(() => expect(result.current.state.salvamento).toBe('salvando'))
  const ev = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(ev)
  expect(ev.defaultPrevented).toBe(true)
})

test('linhas do PDF não reconhecidas entram nos ignorados do resumo', async () => {
  vi.mocked(processPdf).mockResolvedValue({
    status: 'ok',
    header: { cod: 'T01', notificacao: '900001', data: '23/10/2026' },
    rows: [],
    warnings: ['000.000.009 LINHA ESTRANHA'],
  })
  const { result } = await abrir()
  await act(() => result.current.importarPdfs([new File(['%PDF'], 'a.pdf')]))
  const imp = result.current.state.importacoes[0]
  expect('resumo' in imp && imp.resumo.ignorados).toEqual(['Linha não reconhecida: 000.000.009 LINHA ESTRANHA'])
  expect(result.current.state.base!.importacoes[0].ignorados).toBe(1)
})
