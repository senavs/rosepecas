import type { FileResult } from '../ncc/process'
import type { NccRow } from '../ncc/types'

export type FileEntry = { id: string; name: string } & ({ status: 'reading' } | FileResult)

export type FilesAction =
  | { type: 'added'; entries: { id: string; name: string }[] }
  | { type: 'processed'; id: string; result: FileResult }
  | { type: 'removed'; id: string }
  | { type: 'cleared' }

export function filesReducer(state: FileEntry[], action: FilesAction): FileEntry[] {
  switch (action.type) {
    case 'added':
      return [...state, ...action.entries.map((e) => ({ ...e, status: 'reading' as const }))]
    case 'processed':
      // Se o arquivo foi removido enquanto era lido, o id não existe mais e nada muda.
      return state.map((e) => (e.id === action.id ? { id: e.id, name: e.name, ...action.result } : e))
    case 'removed':
      return state.filter((e) => e.id !== action.id)
    case 'cleared':
      return []
  }
}

export function allRows(state: FileEntry[]): NccRow[] {
  return state.flatMap((e) => (e.status === 'ok' ? e.rows : []))
}

export function fileStatusLabel(e: FileEntry): string {
  switch (e.status) {
    case 'reading':
      return 'Lendo…'
    case 'error':
      return e.message
    case 'ok': {
      const n = e.rows.length
      const w = e.warnings.length
      if (w === 0) return n === 1 ? '1 linha' : `${n} linhas`
      const read = n === 1 ? '1 linha lida' : `${n} linhas lidas`
      return `${read}, ${w} não ${w === 1 ? 'reconhecida' : 'reconhecidas'}`
    }
  }
}
