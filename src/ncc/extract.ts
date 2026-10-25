import { getDocument } from './pdfjs'
import type { TextLine } from './types'

type RawItem = { str: string; transform: number[] }

/** Itens com diferença de y até esse valor ficam na mesma linha. */
const Y_TOLERANCE = 2

/** Agrupa os itens de texto de uma página em linhas, de cima para baixo e da esquerda para a direita. */
export function groupTextItems(items: RawItem[]): TextLine[] {
  const groups: { y: number; items: { str: string; x: number }[] }[] = []
  for (const item of items) {
    const str = item.str.trim()
    if (!str) continue
    const x = item.transform[4]
    const y = item.transform[5]
    const group = groups.find((g) => Math.abs(g.y - y) <= Y_TOLERANCE)
    if (group) group.items.push({ str, x })
    else groups.push({ y, items: [{ str, x }] })
  }
  return groups
    .sort((a, b) => b.y - a.y)
    .map((g) => {
      const sorted = g.items.sort((a, b) => a.x - b.x)
      return { text: sorted.map((i) => i.str).join(' ').replace(/\s+/g, ' '), items: sorted }
    })
}

/** Extrai as linhas de texto de todas as páginas do PDF, em ordem. */
export async function extractTextLines(data: ArrayBuffer): Promise<TextLine[]> {
  // verbosity 0: só erros (os relatórios usam fontes padrão não embutidas, o que gera avisos inofensivos)
  const task = getDocument({ data: new Uint8Array(data), verbosity: 0 })
  try {
    const pdf = await task.promise
    const lines: TextLine[] = []
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const content = await page.getTextContent()
      lines.push(...groupTextItems(content.items.flatMap((i) => ('str' in i ? [i] : []))))
    }
    return lines
  } finally {
    await task.destroy()
  }
}
