import { useState } from 'react'
import { formatBr } from '../../ncc/number'
import { STATUS_LINHA_LABEL } from '../labels'
import type { Ajuste, AlvoAjuste, MotivoOrfao, OrfaoView } from '../types'
import { AjusteModal } from './AjusteModal'
import { MarcaBadge } from './Badges'

const MOTIVO: Record<MotivoOrfao, string> = {
  sem_faturamento: 'Sem faturamento carregado',
  chassi_divergente: 'Chassi diferente do faturamento',
}

const TH = 'whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted'
const TD = 'px-3 py-3 align-top'

type Props = { orfaos: OrfaoView[]; onAjustar: (ajuste: Ajuste) => void; onDesfazer: (alvo: AlvoAjuste) => void }

export function OrfaosTable({ orfaos, onAjustar, onDesfazer }: Props) {
  const [ajustando, setAjustando] = useState<OrfaoView | null>(null)
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <p className="border-b border-line px-4 py-2.5 text-sm text-muted">
        NCCs e pagamentos que não se ligam a nenhum carro do faturamento carregado. Normalmente somem quando você adiciona o
        faturamento do período certo.
      </p>
      <table className="w-full text-sm">
        <thead className="border-b border-line">
          <tr>
            <th className={`${TH} pl-4`}>NCC</th>
            <th className={TH}>NF e chassi</th>
            <th className={TH}>Cliente</th>
            <th className={`${TH} text-right`}>Comissão líquida</th>
            <th className={TH}>Status</th>
            <th className={TH}>Motivo</th>
            <th className={`${TH} pr-4 text-right`}>Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orfaos.map((o) => (
            <tr key={o.chave} className="hover:bg-paper/50">
              <td className={`${TD} pl-4`}>
                <p className="num font-medium">{o.ncc}</p>
                <p className="text-xs text-muted">{o.cod}</p>
              </td>
              <td className={TD}>
                <p className="num">NF {o.nf}</p>
                <p className="num text-xs text-muted">{o.chassi}</p>
              </td>
              <td className={TD}>{o.cliente}</td>
              <td className={`${TD} num text-right`}>{o.temPdf ? (o.comissaoLiquida === null ? '' : formatBr(o.comissaoLiquida)) : <span className="italic text-muted">sem PDF</span>}</td>
              <td className={TD}>
                <span className="flex items-center gap-1">
                  <span className={o.exibido === 'paga' ? 'text-action' : 'text-danger'}>{STATUS_LINHA_LABEL[o.exibido]}</span>
                  <MarcaBadge marca={o.marca} />
                </span>
              </td>
              <td className={`${TD} text-muted`}>{MOTIVO[o.motivo]}</td>
              <td className={`${TD} pr-4 text-right`}>
                <button
                  type="button"
                  aria-label={`Ajustar NCC ${o.ncc}`}
                  onClick={() => setAjustando(o)}
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
      {orfaos.length === 0 && <p className="px-4 py-8 text-center text-muted">Nenhum órfão.</p>}
      {ajustando && (
        <AjusteModal
          subtitulo={`NCC ${ajustando.ncc}, NF ${ajustando.nf}`}
          linhas={[ajustando]}
          onAjustar={onAjustar}
          onDesfazer={onDesfazer}
          onFechar={() => setAjustando(null)}
        />
      )}
    </div>
  )
}
