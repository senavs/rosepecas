import type { Filtros } from '../filter'

type Aba = 'carros' | 'orfaos'

type Props = {
  filtros: Filtros
  onChange: (f: Filtros) => void
  onLimpar: () => void
  aba: Aba
  onAba: (a: Aba) => void
  totalCarros: number
  totalOrfaos: number
  totalSemPdf: number
  exportando: boolean
  onExportar: () => void
}

const CAMPO = 'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm'
const ROTULO = 'text-xs font-semibold text-muted'

export function FiltrosBar({ filtros, onChange, onLimpar, aba, onAba, totalCarros, totalOrfaos, totalSemPdf, exportando, onExportar }: Props) {
  const set = (k: keyof Filtros) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...filtros, [k]: e.target.value })
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <label className={`${ROTULO} col-span-2`}>
          Chassi, NF ou cliente
          <input value={filtros.texto} onChange={set('texto')} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          NCC
          <input value={filtros.ncc} onChange={set('ncc')} inputMode="numeric" className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Concessionária
          <input value={filtros.conc} onChange={set('conc')} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Faturado de
          <input type="date" value={filtros.dataDe} onChange={set('dataDe')} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          até
          <input type="date" value={filtros.dataAte} onChange={set('dataAte')} className={CAMPO} />
        </label>
      </div>
      <label
        title="Carros com NCC que consta na planilha de pagas, mas cujo PDF ainda não foi enviado"
        className={`flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
          filtros.semPdf ? 'border-action bg-action-soft' : 'border-line bg-surface hover:border-action/60'
        }`}
      >
        <input
          type="checkbox"
          checked={filtros.semPdf}
          onChange={(e) => onChange({ ...filtros, semPdf: e.target.checked })}
          className="h-4 w-4 accent-action"
        />
        Pagas sem PDF da NCC <span className="num text-muted">({totalSemPdf})</span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" className="flex gap-1 rounded-lg bg-paper p-1">
          {(
            [
              ['carros', `Carros (${totalCarros})`],
              ['orfaos', `Órfãos (${totalOrfaos})`],
            ] as const
          ).map(([a, rotulo]) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => onAba(a)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${aba === a ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onLimpar} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-paper hover:text-ink">
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={onExportar}
            disabled={exportando || totalCarros === 0}
            className="rounded-lg bg-action px-3 py-1.5 text-sm font-semibold text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportando ? 'Gerando…' : 'Exportar Excel'}
          </button>
        </div>
      </div>
    </div>
  )
}
