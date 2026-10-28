import type { ControleState } from '../state'

type Props = { state: ControleState; onBaixar: () => void; onTentarDeNovo: () => void }

function mensagem({ salvamento, handle }: ControleState): { texto: string; tom: string } {
  switch (salvamento) {
    case 'salvo':
      return { texto: handle ? `Salvo em ${handle.name}` : 'Tudo salvo', tom: 'text-action' }
    case 'salvando':
      return { texto: 'Salvando…', tom: 'text-muted' }
    case 'pendente':
      return handle ? { texto: 'Salvando…', tom: 'text-muted' } : { texto: 'Alterações não salvas', tom: 'text-warn' }
    case 'erro':
      return { texto: '', tom: '' }
  }
}

export function BarraSalvamento({ state, onBaixar, onTentarDeNovo }: Props) {
  const m = mensagem(state)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
      {state.salvamento === 'erro' ? (
        <p role="alert" className="text-danger">
          {state.erroSalvar}
        </p>
      ) : (
        <p className={m.tom}>{m.texto}</p>
      )}
      <div className="flex gap-2">
        {state.salvamento === 'erro' && (
          <button type="button" onClick={onTentarDeNovo} className="rounded-md px-3 py-1.5 font-medium text-action hover:bg-action-soft">
            Tentar de novo
          </button>
        )}
        <button type="button" onClick={onBaixar} className="rounded-md border border-line px-3 py-1.5 font-medium hover:border-action/60">
          Baixar base atualizada
        </button>
      </div>
    </div>
  )
}
