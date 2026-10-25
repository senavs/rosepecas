import { formatBr } from '../ncc/number'
import type { Totals } from '../ncc/rows'
import type { NccRow } from '../ncc/types'

type Props = { rows: NccRow[]; totals: Totals }

const MONEY: { key: 'valorNf' | 'comissaoBruta' | 'impostoRenda' | 'comissaoLiquida'; label: string }[] = [
  { key: 'valorNf', label: 'Valor NF' },
  { key: 'comissaoBruta', label: 'Comissão bruta' },
  { key: 'impostoRenda', label: 'IR' },
  { key: 'comissaoLiquida', label: 'Comissão líquida' },
]

const th = 'whitespace-nowrap px-2.5 py-2.5 text-left text-xs font-semibold text-muted'

export function RowsTable({ rows, totals }: Props) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-line bg-surface lg:max-h-[calc(100vh-13rem)]">
      <table className="w-full border-separate border-spacing-0 text-[13px]">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr>
            {['Relatório', 'Núm. NF', 'Cliente', 'Chassi'].map((h) => (
              <th key={h} scope="col" className={`${th} border-b border-line`}>
                {h}
              </th>
            ))}
            {MONEY.map((m) => (
              <th key={m.key} scope="col" className={`${th} border-b border-line text-right`}>
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-paper/60">
              <td className="whitespace-nowrap border-b border-line/70 px-2.5 py-2">
                <span className="font-semibold">{r.cod}</span>
                <span className="num ml-1.5 text-muted">NCC {r.notificacao}</span>
                <span className="num block text-xs text-muted">{r.data}</span>
              </td>
              <td className="num whitespace-nowrap border-b border-line/70 px-2.5 py-2">{r.nf}</td>
              <td className="min-w-[12rem] border-b border-line/70 px-2.5 py-2">{r.cliente}</td>
              <td className="num whitespace-nowrap border-b border-line/70 px-2.5 py-2 text-muted">{r.chassi}</td>
              {MONEY.map((m) => (
                <td key={m.key} className={`num whitespace-nowrap border-b border-line/70 px-2.5 py-2 text-right ${r[m.key] < 0 ? 'text-danger' : ''}`}>
                  {formatBr(r[m.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10">
          <tr className="bg-ink text-white">
            <th scope="row" colSpan={4} className="px-2.5 py-3.5 text-left font-semibold">
              Total <span className="ml-1 font-normal text-white/70">{totals.count === 1 ? '1 linha' : `${totals.count} linhas`}</span>
            </th>
            {MONEY.map((m) => (
              <td key={m.key} className="num whitespace-nowrap px-2.5 py-3.5 text-right text-base font-semibold">
                {formatBr(totals[m.key])}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
