import { lerBase, serializarBase } from './storage'
import type { Base } from './types'

const TIPOS = [{ description: 'Base do Controle de NCC', accept: { 'application/json': ['.json'] } }]

export function suportaArquivoLocal(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

export async function gravarArquivo(handle: FileSystemFileHandle, base: Base): Promise<void> {
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
      throw new Error('Sem permissão para gravar no arquivo')
    }
  }
  const w = await handle.createWritable()
  await w.write(serializarBase(base))
  await w.close()
}

/** Pergunta onde salvar e grava a base. Cancelar o seletor lança AbortError. */
export async function criarArquivo(base: Base): Promise<FileSystemFileHandle> {
  const handle = await window.showSaveFilePicker!({ suggestedName: 'controle-ncc.json', types: TIPOS })
  await gravarArquivo(handle, base)
  return handle
}

/** Valida o conteúdo antes de pedir permissão de escrita: um arquivo que não é base nunca é sobrescrito. */
export async function abrirArquivo(): Promise<{ handle: FileSystemFileHandle; base: Base }> {
  const [handle] = await window.showOpenFilePicker!({ types: TIPOS })
  const base = lerBase(await (await handle.getFile()).text())
  await handle.requestPermission({ mode: 'readwrite' })
  return { handle, base }
}

export function nomeDownload(agora: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `controle-ncc-${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}.json`
}

export function baixarBase(base: Base, agora: Date): void {
  const blob = new Blob([serializarBase(base)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeDownload(agora)
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
