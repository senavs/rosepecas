import { formatBr } from '../../ncc/number'
import { STATUS_LINHA_LABEL } from '../labels'
import type { Ajuste, AlvoAjuste, MotivoOrfao, OrfaoView } from '../types'
import { AjusteMenu } from './AjusteMenu'
import { MarcaBadge } from './Badges'

const MOTIVO: Record<MotivoOrfao, string> = {
  sem_faturamento: 'Sem faturamento carregado',
  chassi_divergente: 'Chassi diferente do faturamento',
}

const TH = 'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted'
const TD = 'px-3 py-2 align-top'

type Props = { orfaos: OrfaoView[]; onAjustar: (ajuste: Ajuste) => void; onDesfazer: (alvo: AlvoAjuste) => void }

export function OrfaosTable({ orfaos, onAjustar, onDesfazer }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <p className="border-b border-line px-4 py-2.5 text-sm text-muted">
        NCCs e pagamentos que não se ligam a nenhum carro do faturamento carregado. Normalmente somem quando você adiciona o
        faturamento do período certo.
      </p>
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-paper/60">
          <tr>
            <th className={TH}>Motivo</th>
            <th className={TH}>NCC</th>
            <th className={TH}>Cód</th>
            <th className={TH}>NF</th>
            <th className={TH}>Chassi</th>
            <th className={TH}>Cliente</th>
            <th className={`${TH} text-right`}>Comissão líquida</th>
            <th className={TH}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orfaos.map((o) => (
            <tr key={o.chave}>
              <td className={TD}>{MOTIVO[o.motivo]}</td>
              <td className={`${TD} num`}>{o.ncc}</td>
              <td className={TD}>{o.cod}</td>
              <td className={`${TD} num`}>{o.nf}</td>
              <td className={`${TD} num`}>{o.chassi}</td>
              <td className={TD}>{o.cliente}</td>
              <td className={`${TD} num text-right`}>{o.temPdf ? (o.comissaoLiquida === null ? '' : formatBr(o.comissaoLiquida)) : 'sem PDF'}</td>
              <td className={TD}>
                <div className="flex items-center gap-1">
                  <span className={o.exibido === 'paga' ? 'text-action' : 'text-danger'}>{STATUS_LINHA_LABEL[o.exibido]}</span>
                  <MarcaBadge marca={o.marca} />
                  <AjusteMenu
                    alvo={{ tipo: 'linha', ncc: o.ncc, nf: o.nf }}
                    ajuste={o.ajuste}
                    rotulo={`Ajustar NCC ${o.ncc}`}
                    onAjustar={onAjustar}
                    onDesfazer={onDesfazer}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orfaos.length === 0 && <p className="px-4 py-8 text-center text-muted">Nenhum órfão.</p>}
    </div>
  )
}
