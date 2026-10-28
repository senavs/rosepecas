import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ESTADO_INICIAL, type ControleState } from '../state'
import { baseVazia } from '../storage'
import type { Base, Faturamento } from '../types'
import type { Controle } from '../useControle'
import { ControlePage } from './ControlePage'

let controle: Controle

vi.mock('../useControle', () => ({ useControle: () => controle }))
vi.mock('../fileAccess', () => ({ suportaArquivoLocal: () => true }))

function mockControle(state: Partial<ControleState> = {}, extra: Partial<Controle> = {}): Controle {
  return {
    state: { ...ESTADO_INICIAL, ...state },
    erroAbrir: null,
    abrirNovo: vi.fn(async () => {}),
    abrirExistente: vi.fn(async () => {}),
    abrirDeArquivo: vi.fn(async () => {}),
    importarFaturamentoArquivo: vi.fn(async () => {}),
    importarPagasArquivo: vi.fn(async () => {}),
    importarPdfs: vi.fn(async () => {}),
    ajustar: vi.fn(),
    desfazerAjuste: vi.fn(),
    baixar: vi.fn(),
    tentarSalvarDeNovo: vi.fn(),
    ...extra,
  }
}

const fat =(nf: string, extra: Partial<Faturamento> = {}): Faturamento => ({
  nf, chassi: `TESTE000000000${nf}`, data: '2026-05-04', regiao: '', concVenda: 'T68', concEntrega: 'T48', clienteDoc: '',
  cliente: `CLIENTE TESTE ${nf}`, processo: '', pedido: '', formaPagamento: '', statusPedido: '', valor: 1000, percComissao: 5,
  valorComissao: 50, ...extra,
})

const comFaturamento = (): Base => ({ ...baseVazia(), faturamento: { '1': fat('1') } })
const xlsx = (name: string) => new File(['x'], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

beforeEach(() => {
  controle = mockControle()
})

describe('abertura', () => {
  test('sem base mostra Criar nova base e Abrir base existente', () => {
    render(<ControlePage />)
    expect(screen.getByRole('button', { name: 'Criar nova base' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir base existente' })).toBeInTheDocument()
  })

  test('clicar em Criar nova base chama abrirNovo', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: 'Criar nova base' }))
    expect(controle.abrirNovo).toHaveBeenCalled()
  })

  test('erro ao abrir aparece como alerta', () => {
    controle = mockControle({}, { erroAbrir: 'Este arquivo não é uma base do Controle de NCC' })
    render(<ControlePage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Este arquivo não é uma base do Controle de NCC')
  })
})

describe('primeiros passos', () => {
  test('base vazia mostra passo 1 ativo e passos 2 e 3 desabilitados', () => {
    controle = mockControle({ base: baseVazia() })
    render(<ControlePage />)
    expect(screen.getByLabelText(/adicionar faturamento/i)).toBeEnabled()
    expect(screen.getByLabelText(/adicionar ncc pagas/i)).toBeDisabled()
    expect(screen.getByLabelText(/adicionar pdfs de ncc/i)).toBeDisabled()
  })

  test('soltar planilha no passo 1 chama importarFaturamentoArquivo', async () => {
    controle = mockControle({ base: baseVazia() })
    render(<ControlePage />)
    const f = xlsx('fat.xlsx')
    await userEvent.upload(screen.getByLabelText(/adicionar faturamento/i), f)
    expect(controle.importarFaturamentoArquivo).toHaveBeenCalledWith(f)
  })

  test('com faturamento carregado, Pular nos passos 2 e 3 leva à tabela', async () => {
    controle = mockControle({ base: comFaturamento() })
    render(<ControlePage />)
    expect(screen.getByLabelText(/adicionar ncc pagas/i)).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Pular NCC pagas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pular PDFs de NCC' }))
    expect(screen.queryByText(/primeiros passos/i)).not.toBeInTheDocument()
  })

  test('Ver tabela sai dos primeiros passos', async () => {
    controle = mockControle({ base: comFaturamento() })
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver tabela' }))
    expect(screen.queryByText(/primeiros passos/i)).not.toBeInTheDocument()
  })

  test('resumo mostra contagens e erro de planilha', () => {
    controle = mockControle({
      base: baseVazia(),
      importacoes: [
        { tipo: 'faturamento', arquivo: 'ruim.xlsx', erro: 'Coluna "Chassi" não encontrada' },
        { tipo: 'faturamento', arquivo: 'fat.xlsx', resumo: { novos: 3, atualizados: 1, inalterados: 0, ignorados: ['Linha 5: sem NF'] } },
      ],
    })
    render(<ControlePage />)
    const resumo = within(screen.getByRole('list', { name: /importações/i }))
    expect(resumo.getByText('Coluna "Chassi" não encontrada')).toBeInTheDocument()
    expect(resumo.getByText('3 novos, 1 atualizado, 0 inalterados')).toBeInTheDocument()
    expect(resumo.getByText('1 linha ignorada')).toBeInTheDocument()
  })
})
