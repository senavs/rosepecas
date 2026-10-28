import { useId, useState } from 'react'
import type { TipoImportacao } from '../types'
import type { Controle } from '../useControle'
import { BarraSalvamento } from './BarraSalvamento'
import { ImportarModal } from './ImportarModal'

const contagem = new Intl.NumberFormat('pt-BR')
const plural = (n: number, um: string, varios: string) => `${contagem.format(n)} ${n === 1 ? um : varios}`

function Icone({ tipo }: { tipo: TipoImportacao }) {
  const comum = { 'aria-hidden': true, viewBox: '0 0 24 24', className: 'h-5 w-5 shrink-0 text-action', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 } as const
  if (tipo === 'ncc')
    return (
      <svg {...comum}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </svg>
    )
  if (tipo === 'pagas')
    return (
      <svg {...comum}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </svg>
    )
  return (
    <svg {...comum}>
      <path d="M5 17h14M6 17l1.5-5h9L18 17M8 17v2M16 17v2" />
      <circle cx="8.5" cy="14.5" r=".6" fill="currentColor" />
      <circle cx="15.5" cy="14.5" r=".6" fill="currentColor" />
    </svg>
  )
}

export function EnriquecerSidebar({ controle }: { controle: Controle }) {
  const [aberto, setAberto] = useState(true)
  const [modal, setModal] = useState<TipoImportacao | null>(null)
  const listaId = useId()
  const base = controle.state.base!
  const n = (t: object) => Object.keys(t).length

  const itens: { tipo: TipoImportacao; rotulo: string; conteudo: string }[] = [
    { tipo: 'faturamento', rotulo: 'Faturamento', conteudo: plural(n(base.faturamento), 'carro', 'carros') },
    { tipo: 'pagas', rotulo: 'NCC pagas', conteudo: plural(n(base.pagas), 'pagamento', 'pagamentos') },
    { tipo: 'ncc', rotulo: 'PDFs de NCC', conteudo: plural(n(base.ncc), 'linha de NCC', 'linhas de NCC') },
  ]

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:w-64 lg:shrink-0">
      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={listaId}
          onClick={() => setAberto((a) => !a)}
          className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold hover:bg-paper/60"
        >
          Adicionar dados
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 text-muted transition-transform ${aberto ? 'rotate-180' : ''}`} fill="currentColor">
            <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
          </svg>
        </button>
        {aberto && (
          <ul id={listaId} className="border-t border-line">
            {itens.map((i) => (
              <li key={i.tipo}>
                <button
                  type="button"
                  onClick={() => setModal(i.tipo)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-action-soft"
                >
                  <Icone tipo={i.tipo} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{i.rotulo}</span>
                    <span className="num text-xs text-muted">{i.conteudo}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg leading-none text-muted group-hover:text-action">
                    +
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <BarraSalvamento state={controle.state} onBaixar={controle.baixar} onTentarDeNovo={controle.tentarSalvarDeNovo} />
      {modal && <ImportarModal tipo={modal} controle={controle} onFechar={() => setModal(null)} />}
    </aside>
  )
}
