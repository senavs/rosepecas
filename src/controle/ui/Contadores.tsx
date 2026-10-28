import { ORDEM_STATUS, STATUS_CARRO_LABEL } from '../labels'
import type { StatusCarro } from '../types'

type Props = { contagem: Record<StatusCarro, number>; ativos: StatusCarro[]; onAlternar: (s: StatusCarro) => void }

export function Contadores({ contagem, ativos, onAlternar }: Props) {
  return (
    <div role="group" aria-label="Contadores por status" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {ORDEM_STATUS.map((s) => {
        const ativo = ativos.includes(s)
        return (
          <button
            key={s}
            type="button"
            aria-pressed={ativo}
            aria-label={`${STATUS_CARRO_LABEL[s]} ${contagem[s]}`}
            onClick={() => onAlternar(s)}
            className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors ${
              ativo ? 'border-action bg-action-soft' : 'border-line bg-surface hover:border-action/60'
            }`}
          >
            <span className="text-sm text-muted">{STATUS_CARRO_LABEL[s]}</span>
            <span className="num text-2xl font-bold">{contagem[s]}</span>
          </button>
        )
      })}
    </div>
  )
}
