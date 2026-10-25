import { extractTextLines } from './extract'
import { NccParseError, parseNccLines } from './parse'
import type { NccHeader, NccRow } from './types'

export type FileResult =
  | { status: 'ok'; header: NccHeader; rows: NccRow[]; warnings: string[] }
  | { status: 'error'; message: string }

export async function processPdf(file: Blob): Promise<FileResult> {
  let lines
  try {
    lines = await extractTextLines(await file.arrayBuffer())
  } catch {
    return { status: 'error', message: 'Não foi possível ler o PDF' }
  }
  try {
    return { status: 'ok', ...parseNccLines(lines) }
  } catch (e) {
    if (e instanceof NccParseError) return { status: 'error', message: e.message }
    return { status: 'error', message: 'Não foi possível ler o PDF' }
  }
}
