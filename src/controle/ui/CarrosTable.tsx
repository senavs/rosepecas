import { formatBr } from '../../ncc/number'
import { formatarData, STATUS_LINHA_LABEL } from '../labels'
import type { Ajuste, AlvoAjuste, CarroView, LinhaView } from '../types'
import { AjusteMenu } from './AjusteMenu'
import { MarcaBadge, StatusBadge } from './Badges'

type Props = {
  carros: CarroView[]
  total: number
  onAjustar: (ajuste: Ajuste) => void
  onDesfazer: (alvo: AlvoAjuste) => void
}

const money = (n: number | null) => (n === null ? '' : formatBr(n))
const TH = 'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted'
const TD = 'px-3 py-2 align-top'

function Chip({ l, onAjustar, onDesfazer }: { l: LinhaView } & Pick<Props, 'onAjustar' | 'onDesfazer'>) {
  const paga = l.exibido === 'paga'
  return (
    <li
      className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs ${
        paga ? 'border-line bg-surface' : 'border-danger/40 bg-danger-soft'
      }`}
    >
      <span className="num font-medium">{l.ncc}</span>
      <span className="text-muted">{l.cod}</span>
      <span className="num">{l.temPdf ? money(l.comissaoLiquida) : 'sem PDF'}</span>
      <span className={paga ? 'text-action' : 'text-danger'}>{STATUS_LINHA_LABEL[l.exibido]}</span>
      <MarcaBadge marca={l.marca} />
      <AjusteMenu
        alvo={{ tipo: 'linha', ncc: l.ncc, nf: l.nf }}
        ajuste={l.ajuste}
        rotulo={`Ajustar NCC ${l.ncc}`}
        onAjustar={onAjustar}
        onDesfazer={onDesfazer}
      />
    </li>
  )
}

export function CarrosTable({ carros, total, onAjustar, onDesfazer }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-paper/60">
            <tr>
              <th className={TH}>Data fat.</th>
              <th className={TH}>Conc venda / entrega</th>
              <th className={TH}>Cliente</th>
              <th className={TH}>NF</th>
              <th className={TH}>Chassi</th>
              <th className={`${TH} text-right`}>Valor</th>
              <th className={`${TH} text-right`}>Valor comissão</th>
              <th className={TH}>Status</th>
              <th className={TH}>NCCs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {carros.map((c) => (
              <tr key={c.fat.nf}>
                <td className={`${TD} num whitespace-nowrap`}>{formatarData(c.fat.data)}</td>
                <td className={`${TD} whitespace-nowrap`}>
                  {c.fat.concVenda}
                  {c.fat.concEntrega && c.fat.concEntrega !== c.fat.concVenda && <span className="text-muted"> / {c.fat.concEntrega}</span>}
                </td>
                <td className={`${TD} min-w-[12rem]`}>{c.fat.cliente}</td>
                <td className={`${TD} num`}>{c.fat.nf}</td>
                <td className={`${TD} num whitespace-nowrap`}>{c.fat.chassi}</td>
                <td className={`${TD} num text-right`}>{money(c.fat.valor)}</td>
                <td className={`${TD} num text-right`}>{money(c.fat.valorComissao)}</td>
                <td className={TD}>
                  <div className="flex flex-wrap items-center gap-1">
                    <StatusBadge status={c.exibido} />
                    <MarcaBadge marca={c.marca} />
                    <AjusteMenu
                      alvo={{ tipo: 'carro', nf: c.fat.nf }}
                      ajuste={c.ajuste}
                      rotulo={`Ajustar carro NF ${c.fat.nf}`}
                      onAjustar={onAjustar}
                      onDesfazer={onDesfazer}
                    />
                  </div>
                  {c.faltando.length > 0 && (c.exibido === 'parcial' || c.ajuste) && (
                    <p className="mt-1 text-xs text-danger">Faltam: {c.faltando.map((l) => `${l.ncc} (${l.cod})`).join(', ')}</p>
                  )}
                </td>
                <td className={TD}>
                  {c.linhas.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {c.linhas.map((l) => (
                        <Chip key={l.chave} l={l} onAjustar={onAjustar} onDesfazer={onDesfazer} />
                      ))}
                    </ul>
                  )}
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
    </div>
  )
}
