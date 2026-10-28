import { ORDEM_STATUS, STATUS_CARRO_LABEL } from '../labels'
import type { StatusCarro } from '../types'

type Props = {
  contagem: Record<StatusCarro, number>
  ativos: StatusCarro[]
  onAlternar: (s: StatusCarro) => void
  /** Carros com NCC paga cujo PDF ainda não foi enviado; o card fica logo depois de "Pago". */
  semPdf: { total: number; ativo: boolean; onAlternar: () => void }
}

function Card({ rotulo, total, ativo, onClick }: { rotulo: string; total: number; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-label={`${rotulo} ${total}`}
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors ${
        ativo ? 'border-action bg-action-soft' : 'border-line bg-surface hover:border-action/60'
      }`}
    >
      <span className="text-sm text-muted">{rotulo}</span>
      <span className="num text-2xl font-bold">{total}</span>
    </button>
  )
}

export function Contadores({ contagem, ativos, onAlternar, semPdf }: Props) {
  return (
    <div role="group" aria-label="Contadores por status" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {ORDEM_STATUS.flatMap((s) => {
        const card = <Card key={s} rotulo={STATUS_CARRO_LABEL[s]} total={contagem[s]} ativo={ativos.includes(s)} onClick={() => onAlternar(s)} />
        if (s !== 'pago') return [card]
        return [card, <Card key="sem-pdf" rotulo="Pagas sem PDF da NCC" total={semPdf.total} ativo={semPdf.ativo} onClick={semPdf.onAlternar} />]
      })}
    </div>
  )
}
