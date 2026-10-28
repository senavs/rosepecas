import type { ReactNode } from 'react'
import { DropZone } from '../../components/DropZone'
import type { Controle } from '../useControle'
import { ResumoImportacao } from './ResumoImportacao'

type Props = {
  controle: Controle
  pulados: { pagas: boolean; ncc: boolean }
  onPular: (passo: 'pagas' | 'ncc') => void
  onConcluir: () => void
}

function Passo({ n, titulo, feito, ativo, children }: { n: number; titulo: string; feito: boolean; ativo: boolean; children: ReactNode }) {
  return (
    <li className={`flex gap-4 rounded-xl border border-line bg-surface p-4 ${ativo ? '' : 'opacity-70'}`}>
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${feito ? 'bg-action text-white' : 'bg-paper text-ink'}`}
      >
        {feito ? '✓' : n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h3 className="font-semibold">{titulo}</h3>
        {children}
      </div>
    </li>
  )
}

const PULAR = 'self-start rounded-md px-2 py-1 text-sm text-muted hover:bg-paper hover:text-ink disabled:opacity-50'

export function PrimeirosPassos({ controle, pulados, onPular, onConcluir }: Props) {
  const base = controle.state.base!
  const temFat = Object.keys(base.faturamento).length > 0
  const temPagas = Object.keys(base.pagas).length > 0
  const temNcc = Object.keys(base.ncc).length > 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Primeiros passos</h2>
        <p className="mt-1 text-muted">Carregue os dados que quer acompanhar. Depois você pode adicionar mais a qualquer momento.</p>
      </div>
      <ol className="flex flex-col gap-3">
        <Passo n={1} titulo="Faturamento" feito={temFat} ativo>
          <DropZone
            label="Adicionar faturamento"
            hint="Planilha .xlsx com os carros faturados"
            accept=".xlsx"
            multiple={false}
            compact
            onFiles={([f]) => controle.importarFaturamentoArquivo(f)}
          />
        </Passo>
        <Passo n={2} titulo="NCC pagas" feito={temPagas} ativo={temFat}>
          <DropZone
            label="Adicionar NCC pagas"
            hint="Planilha .xlsx com as NCCs recebidas na conta"
            accept=".xlsx"
            multiple={false}
            compact
            disabled={!temFat}
            onFiles={([f]) => controle.importarPagasArquivo(f)}
          />
          {!temPagas && !pulados.pagas && (
            <button type="button" disabled={!temFat} onClick={() => onPular('pagas')} className={PULAR} aria-label="Pular NCC pagas">
              Pular
            </button>
          )}
        </Passo>
        <Passo n={3} titulo="PDFs de NCC" feito={temNcc} ativo={temFat}>
          <DropZone
            label="Adicionar PDFs de NCC"
            hint="Pode enviar vários de uma vez"
            accept=".pdf,application/pdf"
            multiple
            compact
            disabled={!temFat}
            onFiles={(fs) => controle.importarPdfs(fs)}
          />
          {!temNcc && !pulados.ncc && (
            <button type="button" disabled={!temFat} onClick={() => onPular('ncc')} className={PULAR} aria-label="Pular PDFs de NCC">
              Pular
            </button>
          )}
        </Passo>
      </ol>
      <ResumoImportacao itens={controle.state.importacoes} />
      <button
        type="button"
        disabled={!temFat}
        onClick={onConcluir}
        className="self-end rounded-lg bg-action px-4 py-2.5 font-semibold text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Ver tabela
      </button>
    </div>
  )
}
