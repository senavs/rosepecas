import { useState } from 'react'
import { formatBr } from '../../ncc/number'
import { formatarData } from '../labels'
import type { Ajuste, AlvoAjuste, CarroView, LinhaView, StatusCarro } from '../types'
import { AjusteModal } from './AjusteModal'
import { MarcaBadge, StatusBadge } from './Badges'

type Props = {
  carros: CarroView[]
  total: number
  onAjustar: (ajuste: Ajuste) => void
  onDesfazer: (alvo: AlvoAjuste) => void
}

const money = (n: number | null) => (n === null ? '' : formatBr(n))
const TH = 'whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted'
const TD = 'px-3 py-3 align-top'

/** Faixa à esquerda de cada linha: a cor do status, para varrer a tabela com os olhos. */
const FAIXA: Record<StatusCarro, string> = {
  pago: 'border-l-action',
  parcial: 'border-l-warn',
  ncc_nao_paga: 'border-l-danger',
  sem_ncc: 'border-l-muted/40',
  sem_comissao: 'border-l-transparent',
}

function Ncc({ l }: { l: LinhaView }) {
  const paga = l.exibido === 'paga'
  return (
    <li className="flex items-center gap-2 text-xs" title={paga ? 'Paga' : 'Não paga'}>
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          paga ? 'bg-action text-white' : 'border-[1.5px] border-danger'
        }`}
      >
        {paga ? '✓' : ''}
      </span>
      <span className="num font-medium">{l.ncc}</span>
      <span className="text-muted">{l.cod}</span>
      <span className={`num ml-auto pl-2 ${l.temPdf ? '' : 'italic text-muted'}`}>{l.temPdf ? money(l.comissaoLiquida) : 'sem PDF'}</span>
      <span className="sr-only">{paga ? 'paga' : 'não paga'}</span>
      <MarcaBadge marca={l.marca} />
    </li>
  )
}

export function CarrosTable({ carros, total, onAjustar, onDesfazer }: Props) {
  const [ajustando, setAjustando] = useState<CarroView | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className={`${TH} pl-4`}>Carro</th>
              <th className={TH}>Faturado</th>
              <th className={`${TH} text-right`}>Valores</th>
              <th className={TH}>Status</th>
              <th className={TH}>NCCs</th>
              <th className={`${TH} pr-4 text-right`}>Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {carros.map((c) => (
              <tr key={c.fat.nf} className="hover:bg-paper/50">
                <td className={`${TD} border-l-[3px] pl-4 ${FAIXA[c.exibido]}`}>
                  <p className="max-w-[18rem] truncate font-medium" title={c.fat.cliente}>
                    {c.fat.cliente || 'Cliente não informado'}
                  </p>
                  <p className="num mt-0.5 text-xs text-muted">NF {c.fat.nf}</p>
                  <p className="num text-xs text-muted">{c.fat.chassi}</p>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <p className="num">{formatarData(c.fat.data)}</p>
                  <p className="mt-0.5 text-xs text-muted" title="Concessionária de venda / de entrega">
                    {c.fat.concVenda}
                    {c.fat.concEntrega && c.fat.concEntrega !== c.fat.concVenda && ` / ${c.fat.concEntrega}`}
                  </p>
                </td>
                <td className={`${TD} whitespace-nowrap text-right`}>
                  <p className="num">{money(c.fat.valor)}</p>
                  <p className="num mt-0.5 text-xs text-muted">comissão {money(c.fat.valorComissao)}</p>
                </td>
                <td className={TD}>
                  <div className="flex flex-wrap items-center gap-1">
                    <StatusBadge status={c.exibido} />
                    <MarcaBadge marca={c.marca} />
                  </div>
                  {c.faltando.length > 0 && (c.exibido === 'parcial' || c.ajuste) && (
                    <p className="mt-1 text-xs text-danger">Faltam: {c.faltando.map((l) => `${l.ncc} (${l.cod})`).join(', ')}</p>
                  )}
                </td>
                <td className={`${TD} min-w-[13rem]`}>
                  {c.linhas.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {c.linhas.map((l) => (
                        <Ncc key={l.chave} l={l} />
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-muted">Nenhuma recebida</span>
                  )}
                </td>
                <td className={`${TD} pr-4 text-right`}>
                  <button
                    type="button"
                    aria-label={`Ajustar NF ${c.fat.nf}`}
                    onClick={() => setAjustando(c)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium hover:border-action hover:text-action"
                  >
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="m13.5 3.5 3 3L7 16H4v-3z" />
                    </svg>
                    Ajustar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {carros.length === 0 && <p className="px-4 py-8 text-center text-muted">Nenhum carro com esses filtros.</p>}
      </div>
      {total > carros.length && (
        <p className="text-sm text-muted">
          Mostrando {carros.length} de {total}; refine os filtros.
        </p>
      )}
      {ajustando && (
        <AjusteModal
          subtitulo={`${ajustando.fat.cliente || 'Cliente não informado'}, NF ${ajustando.fat.nf}`}
          carro={ajustando}
          linhas={ajustando.linhas}
          onAjustar={onAjustar}
          onDesfazer={onDesfazer}
          onFechar={() => setAjustando(null)}
        />
      )}
    </div>
  )
}
