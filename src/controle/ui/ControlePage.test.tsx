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
    pagas: { '808285|168707': paga('808285', '168707', 'T68'), '900001|2': paga('900001', '2', 'T68'), '805048|2': paga('805048', '2', 'T28') },
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

  test('filtro de pagas sem PDF da NCC mostra só os carros com pagamento cujo PDF não foi enviado', async () => {
    render(<ControlePage />)
    const caixa = screen.getByRole('checkbox', { name: /pagas sem pdf da ncc \(1\)/i })
    await userEvent.click(caixa)
    expect(corpo()).toHaveLength(1)
    expect(within(corpo()[0]).getByText(CH('2'))).toBeInTheDocument()
    expect(within(corpo()[0]).getByText('sem PDF')).toBeInTheDocument()
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

  test('a tabela tem a coluna Ação por último, com um botão Ajustar por carro', () => {
    render(<ControlePage />)
    const cabecalhos = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(cabecalhos.at(-1)).toBe('Ação')
    expect(screen.getAllByRole('button', { name: /^Ajustar NF/ })).toHaveLength(3)
  })

  test('marcar uma NCC como paga pela janela de ajuste chama ajustar com alvo linha', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar NF 168707' }))
    const janela = within(screen.getByRole('dialog', { name: /ajuste manual/i }))
    await userEvent.type(janela.getByLabelText(/observação/i), 'conferido no extrato')
    await userEvent.click(janela.getByRole('button', { name: 'Marcar NCC 808284 como paga' }))
    expect(controle.ajustar).toHaveBeenCalledWith(
      expect.objectContaining({ alvo: { tipo: 'linha', ncc: '808284', nf: '168707' }, status: 'pago', obs: 'conferido no extrato' }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('marcar o carro como não pago pela janela de ajuste', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar NF 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Marcar carro como não pago' }))
    expect(controle.ajustar).toHaveBeenCalledWith(expect.objectContaining({ alvo: { tipo: 'carro', nf: '2' }, status: 'nao_pago' }))
  })

  test('desfazer ajuste do carro mostra a observação e chama desfazerAjuste', async () => {
    const alvo = { tipo: 'carro' as const, nf: '3' }
    controle = mockControle({
      base: { ...BASE, ajustes: { 'carro:3': { alvo, status: 'pago', em: '2026-10-28T12:00:00.000Z', obs: 'pago em dinheiro' } } },
    })
    render(<ControlePage />)
    expect(screen.getAllByText('manual').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar NF 3' }))
    expect(screen.getByText('“pago em dinheiro”')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer ajuste do carro' }))
    expect(controle.desfazerAjuste).toHaveBeenCalledWith(alvo)
  })

  test('Esc fecha a janela de ajuste sem ajustar', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar NF 168707' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(controle.ajustar).not.toHaveBeenCalled()
  })

  test('órfão também tem botão Ajustar na coluna Ação', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('tab', { name: /órfãos \(1\)/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar NCC 777' }))
    await userEvent.click(screen.getByRole('button', { name: 'Marcar NCC 777 como paga' }))
    expect(controle.ajustar).toHaveBeenCalledWith(expect.objectContaining({ alvo: { tipo: 'linha', ncc: '777', nf: '999' }, status: 'pago' }))
  })

  test('erro ao salvar mostra alerta e Tentar de novo', async () => {
    controle = mockControle({ base: BASE, salvamento: 'erro', erroSalvar: 'Sem permissão para gravar no arquivo' })
    render(<ControlePage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão para gravar no arquivo')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(controle.tentarSalvarDeNovo).toHaveBeenCalled()
  })

  test('a lateral não mostra áreas de upload até o usuário escolher o que adicionar', () => {
    render(<ControlePage />)
    expect(screen.queryByLabelText(/clique ou solte/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar dados/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /faturamento\s*3 carros/i })).toBeInTheDocument()
  })

  test('o acordeão recolhe e expande os itens', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: /adicionar dados/i }))
    expect(screen.queryByRole('button', { name: /faturamento\s*3 carros/i })).not.toBeInTheDocument()
  })

  test('Faturamento abre a janela só com a área de upload; soltar chama importarFaturamentoArquivo', async () => {
    controle = mockControle({
      base: {
        ...BASE,
        importacoes: [{ tipo: 'faturamento', arquivo: 'fat-jan.xlsx', em: '2026-02-01T10:00:00.000Z', novos: 3, atualizados: 0, inalterados: 0, ignorados: 0 }],
      },
    })
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: /faturamento\s*3 carros/i }))
    const janela = within(screen.getByRole('dialog', { name: 'Adicionar faturamento' }))
    expect(janela.queryByText('fat-jan.xlsx')).not.toBeInTheDocument()
    expect(janela.queryByRole('list')).not.toBeInTheDocument()
    const f = xlsx('fat-out.xlsx')
    await userEvent.upload(janela.getByLabelText(/clique ou solte/i), f)
    expect(controle.importarFaturamentoArquivo).toHaveBeenCalledWith(f)
  })

  test('a janela mostra só uma linha com o resultado do último envio daquele tipo', async () => {
    controle = mockControle({
      base: BASE,
      importacoes: [
        { tipo: 'pagas', arquivo: 'pagas-ruim.xlsx', erro: 'Coluna "NF" não encontrada' },
        { tipo: 'faturamento', arquivo: 'fat-2.xlsx', resumo: { novos: 2, atualizados: 1, inalterados: 5, ignorados: ['Linha 9: sem NF'] } },
        { tipo: 'faturamento', arquivo: 'fat-1.xlsx', resumo: { novos: 7, atualizados: 0, inalterados: 0, ignorados: [] } },
      ],
    })
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: /faturamento\s*3 carros/i }))
    const janela = screen.getByRole('dialog', { name: 'Adicionar faturamento' })
    expect(within(janela).getByRole('status')).toHaveTextContent('fat-2.xlsx: 2 novos, 1 atualizado, 5 inalterados, 1 linha ignorada')
    expect(within(janela).queryByText(/fat-1\.xlsx/)).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: /ncc pagas/i }))
    expect(within(screen.getByRole('dialog', { name: 'Adicionar NCC pagas' })).getByRole('status')).toHaveTextContent(
      'pagas-ruim.xlsx: Coluna "NF" não encontrada',
    )
  })

  test('PDFs de NCC abre a janela que aceita vários arquivos', async () => {
    render(<ControlePage />)
    await userEvent.click(screen.getByRole('button', { name: /pdfs de ncc/i }))
    const input = within(screen.getByRole('dialog', { name: 'Adicionar PDFs de NCC' })).getByLabelText(/clique ou solte/i) as HTMLInputElement
    expect(input.multiple).toBe(true)
  })
})
