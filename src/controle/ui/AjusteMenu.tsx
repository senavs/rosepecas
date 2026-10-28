import { useState } from 'react'
import { formatarData } from '../labels'
import type { Ajuste, AlvoAjuste } from '../types'

type Props = {
  alvo: AlvoAjuste
  ajuste: Ajuste | null
  rotulo: string
  onAjustar: (ajuste: Ajuste) => void
  onDesfazer: (alvo: AlvoAjuste) => void
}

const OPCAO = 'w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-paper'

/** Menu "⋯" para marcar manualmente um carro ou uma NCC como pago/não pago. */
export function AjusteMenu({ alvo, ajuste, rotulo, onAjustar, onDesfazer }: Props) {
  const [aberto, setAberto] = useState(false)
  const [obs, setObs] = useState(ajuste?.obs ?? '')

  const marcar = (status: Ajuste['status']) => {
    onAjustar({ alvo, status, em: new Date().toISOString(), obs: obs.trim() })
    setAberto(false)
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        title="Ajuste manual"
        onClick={() => setAberto((a) => !a)}
        className="rounded-md px-1.5 leading-none text-muted hover:bg-paper hover:text-ink"
      >
        ⋯
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label={rotulo}
          onKeyDown={(e) => e.key === 'Escape' && setAberto(false)}
          className="absolute right-0 z-20 mt-1 flex w-64 flex-col gap-1 rounded-lg border border-line bg-surface p-2 text-left shadow-lg"
        >
          {ajuste && (
            <p className="px-3 py-1 text-xs text-muted">
              Ajustado manualmente em {formatarData(ajuste.em)} como {ajuste.status === 'pago' ? 'pago' : 'não pago'}
              {ajuste.obs && <span className="block italic">“{ajuste.obs}”</span>}
            </p>
          )}
          <button type="button" className={OPCAO} onClick={() => marcar('pago')}>
            Marcar como pago
          </button>
          <button type="button" className={OPCAO} onClick={() => marcar('nao_pago')}>
            Marcar como não pago
          </button>
          <label className="px-3 pt-1 text-xs text-muted">
            Observação (opcional)
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-line px-2 py-1 text-sm text-ink"
            />
          </label>
          {ajuste && (
            <button
              type="button"
              className={`${OPCAO} text-danger`}
              onClick={() => {
                onDesfazer(alvo)
                setAberto(false)
              }}
            >
              Desfazer ajuste
            </button>
          )}
        </div>
      )}
    </span>
  )
}
