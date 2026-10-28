import type { Ajuste, Base, CarroView, LinhaView, Marca, OrfaoView, StatusCarro, StatusLinha, Visao } from './types'

/** Como o ajuste manual de uma linha se combina com o que a planilha de pagas diz (a planilha vence no conflito). */
function aplicarAjusteLinha(calculado: StatusLinha, ajuste: Ajuste | null): { exibido: StatusLinha; marca: Marca } {
  if (!ajuste) return { exibido: calculado, marca: 'planilha' }
  if (ajuste.status === 'pago') return { exibido: 'paga', marca: calculado === 'paga' ? 'confirmado' : 'manual' }
  return calculado === 'paga' ? { exibido: 'paga', marca: 'conflito' } : { exibido: 'nao_paga', marca: 'manual' }
}

function montarLinhas(base: Base): LinhaView[] {
  const linhas: LinhaView[] = []
  const comum = (chave: string, calculado: StatusLinha) => {
    const ajuste = base.ajustes[`linha:${chave}`] ?? null
    return { chave, calculado, ajuste, dataPagamento: base.pagas[chave]?.dataRecebimento ?? null, ...aplicarAjusteLinha(calculado, ajuste) }
  }
  for (const [chave, l] of Object.entries(base.ncc)) {
    linhas.push({
      ncc: l.ncc, nf: l.nf, cod: l.cod, data: l.data, chassi: l.chassi, cliente: l.cliente, comissaoLiquida: l.comissaoLiquida,
      temPdf: true,
      ...comum(chave, base.pagas[chave] ? 'paga' : 'nao_paga'),
    })
  }
  // Pagamento sem o PDF da NCC: vira linha própria, já paga. Quando o PDF chegar, a chave é a mesma e ela some daqui.
  for (const [chave, p] of Object.entries(base.pagas)) {
    if (base.ncc[chave]) continue
    linhas.push({
      ncc: p.ncc, nf: p.nf, cod: p.conc, data: null, chassi: '', cliente: '', comissaoLiquida: null,
      temPdf: false,
      ...comum(chave, 'paga'),
    })
  }
  return linhas
}

function statusPelasLinhas(linhas: LinhaView[], valorComissao: number | null): StatusCarro {
  if (linhas.length === 0) return valorComissao === 0 ? 'sem_comissao' : 'sem_ncc'
  const pagas = linhas.filter((l) => l.exibido === 'paga').length
  if (pagas === linhas.length) return 'pago'
  return pagas === 0 ? 'ncc_nao_paga' : 'parcial'
}

function aplicarAjusteCarro(calculado: StatusCarro, linhas: LinhaView[], ajuste: Ajuste | null): { exibido: StatusCarro; marca: Marca } {
  if (ajuste?.status === 'pago') return { exibido: 'pago', marca: calculado === 'pago' ? 'confirmado' : 'manual' }
  if (ajuste?.status === 'nao_pago') {
    if (linhas.some((l) => l.calculado === 'paga')) return { exibido: calculado, marca: 'conflito' }
    return { exibido: linhas.length ? 'ncc_nao_paga' : 'sem_ncc', marca: 'manual' }
  }
  const marca: Marca = linhas.some((l) => l.marca === 'conflito')
    ? 'conflito'
    : linhas.some((l) => l.marca === 'manual')
      ? 'manual'
      : 'planilha'
  return { exibido: calculado, marca }
}

const porDataDesc = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? 1 : -1)
const porDataAsc = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1)

export function calcularVisao(base: Base): Visao {
  const porNf = new Map<string, LinhaView[]>()
  const orfaos: OrfaoView[] = []
  for (const l of montarLinhas(base)) {
    const fat = base.faturamento[l.nf]
    if (!fat) orfaos.push({ ...l, motivo: 'sem_faturamento' })
    else if (l.chassi && l.chassi !== fat.chassi) orfaos.push({ ...l, motivo: 'chassi_divergente' })
    else porNf.set(l.nf, [...(porNf.get(l.nf) ?? []), l])
  }

  const carros: CarroView[] = Object.values(base.faturamento).map((fat) => {
    const linhas = (porNf.get(fat.nf) ?? []).sort((a, b) => porDataAsc(a.data, b.data) || a.ncc.localeCompare(b.ncc))
    const calculado = statusPelasLinhas(linhas, fat.valorComissao)
    const ajuste = base.ajustes[`carro:${fat.nf}`] ?? null
    return {
      fat,
      linhas,
      faltando: linhas.filter((l) => l.exibido === 'nao_paga'),
      calculado,
      ajuste,
      ...aplicarAjusteCarro(calculado, linhas, ajuste),
    }
  })
  carros.sort((a, b) => porDataDesc(a.fat.data, b.fat.data) || a.fat.nf.localeCompare(b.fat.nf))
  return { carros, orfaos }
}
