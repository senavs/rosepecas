import { useEffect, useState } from 'react'
import App from './App'
import { ControlePage } from './controle/ui/ControlePage'

type Secao = 'controle' | 'consolidador'

const secaoDoHash = (): Secao => (window.location.hash === '#/consolidador' ? 'consolidador' : 'controle')

const ABAS: { secao: Secao; href: string; rotulo: string }[] = [
  { secao: 'controle', href: '#/', rotulo: 'Controle de NCC' },
  { secao: 'consolidador', href: '#/consolidador', rotulo: 'Consolidador de PDFs' },
]

export default function Root() {
  const [secao, setSecao] = useState<Secao>(secaoDoHash)

  useEffect(() => {
    const onHash = () => setSecao(secaoDoHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <>
      <nav className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1600px] gap-1 px-4 sm:px-6">
          {ABAS.map((a) => (
            <a
              key={a.secao}
              href={a.href}
              aria-current={secao === a.secao ? 'page' : undefined}
              className={`border-b-2 px-3 py-3 text-sm font-semibold ${
                secao === a.secao ? 'border-action text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {a.rotulo}
            </a>
          ))}
        </div>
      </nav>
      {/* As duas seções ficam montadas: trocar de aba não pode descartar a base aberta nem os PDFs do consolidador. */}
      <div hidden={secao !== 'consolidador'}>
        <App />
      </div>
      <div hidden={secao !== 'controle'}>
        <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
          <header>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Controle de NCC</h1>
            <p className="mt-1 max-w-2xl text-muted">
              Cruze faturamento, NCCs recebidas e NCCs pagas para ver o que já foi pago e o que falta. Os dados ficam num
              arquivo no seu computador.
            </p>
          </header>
          <ControlePage />
        </div>
      </div>
    </>
  )
}
