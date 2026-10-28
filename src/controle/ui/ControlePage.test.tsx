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

describe('tela principal', () => {
  const CH = (nf: string) => `TESTE000000000${nf}`
  const linha = (ncc: string, nf: string, cod: string) => ({
    ncc, nf, cod, data: '2026-05-08', cliente: 'CLIENTE TESTE', chassi: CH(nf), valorNf: 1000, comissaoBruta: 10, impostoRenda: 0, comissaoLiquida: 10,
  })
  const paga = (ncc: string, nf: string, conc: string) => ({ ncc, nf, conc, dataRecebimento: '2026-05-18' })
  const BASE: Base = {
    ...baseVazia(),
    faturamento: { '168707': fat('168707'), '2': fat('2', { data: '2026-03-01' }), '3': fat('3', { data: '2026-01-01' }) },
    ncc: {
      '808285|168707': linha('808285', '168707', 'T68'),
      '808284|168707': linha('808284', '168707', 'T48'),
      '900001|2': linha('900001', '2', 'T68'),
      '777|999': linha('777', '999', 'T08'),
    },
    pagas: { '808285|168707': paga('808285', '168707', 'T68'), '900001|2': paga('900001', '2', 'T68') },
  }
  const corpo = () => screen.getAllByRole('row').filter((r) => r.closest('tbody'))
  const contadores = () => within(screen.getByRole('group', { name: /contadores/i }))

  beforeEach(() => {
    controle = mockControle({ base: BASE })
  })

  test('contadores mostram 1 Parcialmente pago, 1 Pago, 1 Sem NCC', () => {
    render(<ControlePage />)
    expect(contadores().getByRole('button', { name: /parcialmente pago\s*1/i })).toBeInTheDocument()
    expect(contadores().getByRole('button', { name: /^pago\s*1/i })).toBeInTheDocument()
    expect(contadores().getByRole('button', { name: /sem ncc\s*1/i })).toBeInTheDocument()
  })

  test('carro parcial mostra Faltam: 808284 (T48)', () => {
    render(<ControlePage />)
    expect(screen.getByText('Faltam: 808284 (T48)')).toBeInTheDocument()
  })

  test('clicar no contador Pago filtra a tabela para 1 linha', async () => {
    render(<ControlePage />)
    expect(corpo()).toHaveLength(3)
    await userEvent.click(contadores().getByRole('button', { name: /^pago/i }))
    expect(corpo()).toHaveLength(1)
    expect(within(corpo()[0]).getByText(CH('2'))).toBeInTheDocument()
  })

  test('filtro de texto por chassi', async () => {
    render(<ControlePage />)
    await userEvent.type(screen.getByLabelText(/chassi, nf ou cliente/i), 'teste0000000003')
    expect(corpo()).toHaveLength(1)
  })

  test('aba Órfãos lista o órfão com motivo', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('tab', { name: /órfãos \(1\)/i }))
    expect(screen.getByText('Sem faturamento carregado')).toBeInTheDocument()
    expect(screen.getByText('777')).toBeInTheDocument()
  })

  test('Marcar como pago no menu da NCC chama ajustar com alvo linha', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar NCC 808284' }))
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como pago' }))
    expect(controle.ajustar).toHaveBeenCalledWith(
      expect.objectContaining({ alvo: { tipo: 'linha', ncc: '808284', nf: '168707' }, status: 'pago', obs: '' }),
    )
  })

  test('Desfazer ajuste aparece quando há ajuste e chama desfazerAjuste', async () => {
    const alvo = { tipo: 'carro' as const, nf: '3' }
    controle = mockControle({
      base: { ...BASE, ajustes: { 'carro:3': { alvo, status: 'pago', em: '2026-10-28T12:00:00.000Z', obs: 'pago em dinheiro' } } },
    })
    render(<ControlePage />)
    expect(screen.getAllByText('manual').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar carro NF 3' }))
    expect(screen.getByText('“pago em dinheiro”')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer ajuste' }))
    expect(controle.desfazerAjuste).toHaveBeenCalledWith(alvo)
  })

  test('erro ao salvar mostra alerta e Tentar de novo', async () => {
    controle = mockControle({ base: BASE, salvamento: 'erro', erroSalvar: 'Sem permissão para gravar no arquivo' })
    render(<ControlePage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão para gravar no arquivo')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(controle.tentarSalvarDeNovo).toHaveBeenCalled()
  })

  test('soltar planilha em Adicionar faturamento chama importarFaturamentoArquivo', async () => {
    render(<ControlePage />)
    const f = xlsx('fat-out.xlsx')
    await userEvent.upload(screen.getByLabelText(/adicionar faturamento/i), f)
    expect(controle.importarFaturamentoArquivo).toHaveBeenCalledWith(f)
  })
})
