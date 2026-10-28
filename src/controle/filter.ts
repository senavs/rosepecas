import { normChassi, normDigits, semAcento } from './normalize'
import type { CarroView, StatusCarro } from './types'

/**
 * Datas em 'aaaa-mm-dd'; campos vazios não restringem.
 * `semPdf`: só carros com alguma NCC paga (consta na planilha de pagas) cujo PDF ainda não foi enviado.
 */
export type Filtros = {
  status: StatusCarro[]
  ncc: string
  dataDe: string
  dataAte: string
  texto: string
  conc: string
  semPdf: boolean
}

export const FILTROS_VAZIOS: Filtros = { status: [], ncc: '', dataDe: '', dataAte: '', texto: '', conc: '', semPdf: false }

const temPagaSemPdf = (c: CarroView) => c.linhas.some((l) => !l.temPdf)

export function filtrarCarros(carros: CarroView[], f: Filtros): CarroView[] {
  const ncc = normDigits(f.ncc)
  const conc = f.conc.trim().toUpperCase()
  const chassi = normChassi(f.texto)
  const nf = normDigits(f.texto)
  const nome = semAcento(f.texto)
  return carros.filter((c) => {
    if (f.status.length && !f.status.includes(c.exibido)) return false
    if (f.semPdf && !temPagaSemPdf(c)) return false
    if (ncc && !c.linhas.some((l) => l.ncc.includes(ncc))) return false
    if ((f.dataDe || f.dataAte) && !c.fat.data) return false
    if (f.dataDe && c.fat.data! < f.dataDe) return false
    if (f.dataAte && c.fat.data! > f.dataAte) return false
    if (conc && c.fat.concVenda !== conc && c.fat.concEntrega !== conc && !c.linhas.some((l) => l.cod === conc)) return false
    if (nome) {
      const bate = c.fat.chassi.includes(chassi) || (nf !== '' && c.fat.nf.includes(nf)) || semAcento(c.fat.cliente).includes(nome)
      if (!bate) return false
    }
    return true
  })
}

export function contarSemPdf(carros: CarroView[]): number {
  return carros.filter(temPagaSemPdf).length
}

export function contarPorStatus(carros: CarroView[]): Record<StatusCarro, number> {
  const out: Record<StatusCarro, number> = { sem_comissao: 0, sem_ncc: 0, ncc_nao_paga: 0, parcial: 0, pago: 0 }
  for (const c of carros) out[c.exibido]++
  return out
}
