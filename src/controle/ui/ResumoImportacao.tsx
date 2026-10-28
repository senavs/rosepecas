import type { UltimaImportacao } from '../state'

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

const TIPO_LABEL = { faturamento: 'Faturamento', pagas: 'NCC pagas', ncc: 'NCC' } as const

export function ResumoImportacao({ itens }: { itens: UltimaImportacao[] }) {
  if (itens.length === 0) return null
  return (
    <ul aria-label="Importações desta sessão" className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface text-sm">
      {itens.map((i, n) => (
        <li key={n} className="px-4 py-3">
          <p className="truncate font-medium" title={i.arquivo}>
            <span className="text-muted">{TIPO_LABEL[i.tipo]} · </span>
            {i.arquivo}
          </p>
          {'erro' in i ? (
            <p className="text-danger">{i.erro}</p>
          ) : (
            <>
              <p className="text-muted">
                {`${plural(i.resumo.novos, 'novo', 'novos')}, ${plural(i.resumo.atualizados, 'atualizado', 'atualizados')}, ${plural(i.resumo.inalterados, 'inalterado', 'inalterados')}`}
              </p>
              {i.resumo.ignorados.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-warn">{plural(i.resumo.ignorados.length, 'linha ignorada', 'linhas ignoradas')}</summary>
                  <ul className="mt-1 space-y-1 rounded-md bg-warn-soft p-2 text-xs">
                    {i.resumo.ignorados.map((m, k) => (
                      <li key={k}>{m}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
