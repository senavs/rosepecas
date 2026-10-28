import { useEffect, useId, useRef, type ReactNode } from 'react'

type Props = {
  titulo: string
  subtitulo?: ReactNode
  onFechar: () => void
  largura?: 'md' | 'lg'
  children: ReactNode
}

/** Janela sobre a página: fecha com Esc, com o botão Fechar ou clicando fora; devolve o foco a quem a abriu. */
export function Modal({ titulo, subtitulo, onFechar, largura = 'md', children }: Props) {
  const tituloId = useId()
  const painel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    painel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      anterior?.focus()
    }
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`modal-in w-full rounded-2xl bg-surface shadow-[0_20px_60px_-15px_rgba(22,34,46,0.45)] outline-none ${largura === 'lg' ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 id={tituloId} className="text-lg font-bold">
              {titulo}
            </h2>
            {subtitulo && <div className="mt-0.5 text-sm text-muted">{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="-mr-2 rounded-md px-2 text-2xl leading-none text-muted hover:bg-paper hover:text-ink"
          >
            ×
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
