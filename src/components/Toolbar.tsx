type Props = {
  rowCount: number
  fileCount: number
  dedupe: boolean
  removed: number
  exporting: boolean
  onDedupeChange: (v: boolean) => void
  onExport: () => void
  onClear: () => void
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function Toolbar({ rowCount, fileCount, dedupe, removed, exporting, onDedupeChange, onExport, onClear }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {fileCount > 0 ? (
          <>
            {plural(rowCount, 'linha', 'linhas')} de {plural(fileCount, 'arquivo', 'arquivos')}
            {dedupe && removed > 0 && (
              <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-ink">
                {plural(removed, 'duplicada oculta', 'duplicadas ocultas')}
              </span>
            )}
          </>
        ) : (
          'Nenhum arquivo carregado'
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {fileCount > 0 && (
          <button type="button" onClick={onClear} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-paper hover:text-ink">
            Limpar tudo
          </button>
        )}
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dedupe}
            onChange={(e) => onDedupeChange(e.target.checked)}
            className="h-4 w-4 accent-action"
          />
          Excluir duplicados
        </label>
        <button
          type="button"
          onClick={onExport}
          disabled={rowCount === 0 || exporting}
          className="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {exporting ? 'Gerando planilha…' : 'Exportar Excel'}
        </button>
      </div>
    </div>
  )
}
