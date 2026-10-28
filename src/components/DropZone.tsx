import { useState, type DragEvent } from 'react'

type Props = {
  label: string
  hint: string
  accept: string
  multiple: boolean
  disabled?: boolean
  compact?: boolean
  onFiles: (files: File[]) => void
}

/** Área de clicar ou soltar arquivos, no mesmo visual da lateral do consolidador. */
export function DropZone({ label, hint, accept, multiple, disabled = false, compact = false, onFiles }: Props) {
  const [dragging, setDragging] = useState(false)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled && e.dataTransfer.files.length) onFiles([...e.dataTransfer.files])
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 text-center transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action ${
        compact ? 'py-4' : 'py-7'
      } ${
        disabled
          ? 'cursor-not-allowed border-line bg-paper opacity-60'
          : dragging
            ? 'cursor-pointer border-action bg-action-soft'
            : 'cursor-pointer border-line bg-surface hover:border-action/60'
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mb-1 h-6 w-6 text-action" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M12 17v-6M9 14l3-3 3 3" />
      </svg>
      <span className="font-semibold">{label}</span>
      <span className="text-sm text-muted">{hint}</span>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files])
          e.target.value = ''
        }}
      />
    </label>
  )
}
