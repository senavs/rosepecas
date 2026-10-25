import { useState, type DragEvent } from 'react'
import { type FileEntry, fileStatusLabel } from '../state/files'

type Props = {
  files: FileEntry[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
}

const STATUS_STYLE: Record<FileEntry['status'], { icon: string; tone: string }> = {
  reading: { icon: '…', tone: 'text-muted' },
  ok: { icon: '✓', tone: 'text-action' },
  error: { icon: '✕', tone: 'text-danger' },
}

function statusOf(e: FileEntry) {
  if (e.status === 'ok' && e.warnings.length > 0) return { icon: '!', tone: 'text-warn' }
  return STATUS_STYLE[e.status]
}

export function FileSidebar({ files, onAdd, onRemove }: Props) {
  const [dragging, setDragging] = useState(false)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) onAdd([...e.dataTransfer.files])
  }

  return (
    <aside className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action ${
          dragging ? 'border-action bg-action-soft' : 'border-line bg-surface hover:border-action/60'
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="mb-1 h-7 w-7 text-action" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M12 17v-6M9 14l3-3 3 3" />
        </svg>
        <span className="font-semibold">Adicionar PDFs</span>
        <span className="text-sm text-muted">Clique ou solte os relatórios NCC aqui</span>
        <input
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) onAdd([...e.target.files])
            e.target.value = ''
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {files.map((f) => {
            const s = statusOf(f)
            return (
              <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                <span aria-hidden="true" className={`mt-0.5 w-4 text-center font-bold ${s.tone}`}>
                  {s.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={f.name}>
                    {f.status === 'ok' ? `${f.header.cod} — ` : ''}
                    {f.status === 'ok' ? <span>NCC {f.header.notificacao}</span> : f.name}
                  </p>
                  <p className={`text-sm ${f.status === 'error' ? 'text-danger' : f.status === 'ok' && f.warnings.length ? 'text-warn' : 'text-muted'}`}>
                    {fileStatusLabel(f)}
                  </p>
                  {f.status === 'ok' && f.warnings.length > 0 && (
                    <details className="mt-1 text-sm">
                      <summary className="cursor-pointer text-warn underline-offset-2 hover:underline">
                        Ver {f.warnings.length === 1 ? 'linha não reconhecida' : 'linhas não reconhecidas'}
                      </summary>
                      <ul className="mt-1 space-y-1 rounded-md bg-warn-soft p-2 text-xs">
                        {f.warnings.map((w, i) => (
                          <li key={i} className="break-all">{w}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remover ${f.name}`}
                  title="Remover"
                  onClick={() => onRemove(f.id)}
                  className="rounded-md px-1.5 text-lg leading-none text-muted hover:bg-paper hover:text-ink"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
