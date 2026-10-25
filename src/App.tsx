import { useMemo, useReducer, useState } from 'react'
import { FileSidebar } from './components/FileSidebar'
import { RowsTable } from './components/RowsTable'
import { Toolbar } from './components/Toolbar'
import { processPdf } from './ncc/process'
import { computeTotals, dedupeRows } from './ncc/rows'
import { downloadXlsx } from './ncc/xlsx'
import { allRows, filesReducer } from './state/files'

export default function App() {
  const [files, dispatch] = useReducer(filesReducer, [])
  const [dedupe, setDedupe] = useState(false)
  const [exporting, setExporting] = useState(false)

  const all = useMemo(() => allRows(files), [files])
  const { rows, removed } = useMemo(() => (dedupe ? dedupeRows(all) : { rows: all, removed: 0 }), [all, dedupe])
  const totals = useMemo(() => computeTotals(rows), [rows])

  const addFiles = (list: File[]) => {
    const entries = list.map((file) => ({ id: crypto.randomUUID(), name: file.name, file }))
    dispatch({ type: 'added', entries: entries.map(({ id, name }) => ({ id, name })) })
    for (const { id, file } of entries) {
      processPdf(file).then((result) => dispatch({ type: 'processed', id, result }))
    }
  }

  const exportXlsx = async () => {
    setExporting(true)
    try {
      await downloadXlsx(rows)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Consolidador de NCC</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Junte as linhas dos relatórios de comissão em uma planilha. Os arquivos são lidos no seu navegador e não são
          enviados a lugar nenhum.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <FileSidebar files={files} onAdd={addFiles} onRemove={(id) => dispatch({ type: 'removed', id })} />

        <main className="flex min-w-0 flex-1 flex-col gap-3">
          <Toolbar
            rowCount={rows.length}
            fileCount={files.length}
            dedupe={dedupe}
            removed={removed}
            exporting={exporting}
            onDedupeChange={setDedupe}
            onExport={exportXlsx}
            onClear={() => dispatch({ type: 'cleared' })}
          />
          {rows.length > 0 ? (
            <RowsTable rows={rows} totals={totals} />
          ) : (
            <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-xl border border-line bg-surface px-6 text-center">
              {files.length === 0 ? (
                <>
                  <p className="font-semibold">Arraste os PDFs de NCC para a área ao lado</p>
                  <p className="mt-1 text-sm text-muted">ou clique em Adicionar PDFs. Pode enviar vários de uma vez.</p>
                </>
              ) : files.some((f) => f.status === 'reading') ? (
                <p className="text-muted">Lendo os arquivos…</p>
              ) : (
                <p className="text-muted">Nenhuma linha foi lida. Confira as mensagens ao lado de cada arquivo.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
