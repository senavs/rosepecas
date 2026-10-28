import { DropZone } from '../../components/DropZone'
import type { Controle } from '../useControle'
import { ResumoImportacao } from './ResumoImportacao'

export function EnriquecerSidebar({ controle }: { controle: Controle }) {
  return (
    <aside className="flex flex-col gap-3 lg:w-72 lg:shrink-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Adicionar dados</h2>
      <DropZone
        label="Adicionar faturamento"
        hint="Planilha .xlsx; períodos repetidos não duplicam"
        accept=".xlsx"
        multiple={false}
        compact
        onFiles={([f]) => controle.importarFaturamentoArquivo(f)}
      />
      <DropZone
        label="Adicionar NCC pagas"
        hint="Planilha .xlsx"
        accept=".xlsx"
        multiple={false}
        compact
        onFiles={([f]) => controle.importarPagasArquivo(f)}
      />
      <DropZone
        label="Adicionar PDFs de NCC"
        hint="Pode enviar vários de uma vez"
        accept=".pdf,application/pdf"
        multiple
        compact
        onFiles={(fs) => controle.importarPdfs(fs)}
      />
      <ResumoImportacao itens={controle.state.importacoes} />
    </aside>
  )
}
