import type { ControleState } from '../state'

type Props = { state: ControleState; onBaixar: () => void; onTentarDeNovo: () => void }

function mensagem({ salvamento, handle }: ControleState): { texto: string; tom: string; ponto: string } {
  switch (salvamento) {
    case 'salvo':
      return { texto: handle ? `Salvo em ${handle.name}` : 'Tudo salvo', tom: 'text-ink', ponto: 'bg-action' }
    case 'salvando':
      return { texto: 'Salvando…', tom: 'text-muted', ponto: 'bg-muted' }
    case 'pendente':
      return handle
        ? { texto: 'Salvando…', tom: 'text-muted', ponto: 'bg-muted' }
        : { texto: 'Alterações não salvas', tom: 'text-warn', ponto: 'bg-warn' }
    case 'erro':
      return { texto: '', tom: '', ponto: 'bg-danger' }
  }
}

/** Estado do arquivo da base, no pé da lateral. */
export function BarraSalvamento({ state, onBaixar, onTentarDeNovo }: Props) {
  const m = mensagem(state)
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.ponto}`} />
        {state.salvamento === 'erro' ? (
          <p role="alert" className="text-danger">
            {state.erroSalvar}
          </p>
        ) : (
          <p className={`min-w-0 break-words ${m.tom}`}>{m.texto}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {state.salvamento === 'erro' && (
          <button type="button" onClick={onTentarDeNovo} className="rounded-md bg-action px-3 py-1.5 font-medium text-white hover:bg-action-hover">
            Tentar de novo
          </button>
        )}
        <button type="button" onClick={onBaixar} className="rounded-md px-2 py-1.5 font-medium text-action hover:bg-action-soft">
          Baixar base atualizada
        </button>
      </div>
    </section>
  )
}
