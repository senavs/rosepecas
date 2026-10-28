import { DropZone } from '../../components/DropZone'
import { Modal } from '../../components/Modal'
import type { UltimaImportacao } from '../state'
import type { TipoImportacao } from '../types'
import type { Controle } from '../useControle'

const CONFIG: Record<TipoImportacao, { titulo: string; explica: string; hint: string; accept: string; multiple: boolean; zona: string }> = {
  faturamento: {
    titulo: 'Adicionar faturamento',
    explica: 'Planilha com os carros faturados. Pode reenviar períodos que já estão na base: nada é duplicado.',
    zona: 'Clique ou solte a planilha aqui',
    hint: 'Arquivo .xlsx',
    accept: '.xlsx',
    multiple: false,
  },
  pagas: {
    titulo: 'Adicionar NCC pagas',
    explica: 'Planilha com as NCCs que caíram na conta. Pagamentos repetidos são ignorados.',
    zona: 'Clique ou solte a planilha aqui',
    hint: 'Arquivo .xlsx',
    accept: '.xlsx',
    multiple: false,
  },
  ncc: {
    titulo: 'Adicionar PDFs de NCC',
    explica: 'Os relatórios de NCC recebidos por e-mail. Pode enviar vários de uma vez.',
    zona: 'Clique ou solte os PDFs aqui',
    hint: 'Um ou mais arquivos .pdf',
    accept: '.pdf,application/pdf',
    multiple: true,
  },
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Uma linha só, com o resultado do envio mais recente: o suficiente para saber se deu certo. */
function textoUltimo(i: UltimaImportacao): string {
  if ('erro' in i) return `${i.arquivo}: ${i.erro}`
  const r = i.resumo
  const partes = [plural(r.novos, 'novo', 'novos'), plural(r.atualizados, 'atualizado', 'atualizados'), plural(r.inalterados, 'inalterado', 'inalterados')]
  if (r.ignorados.length) partes.push(plural(r.ignorados.length, 'linha ignorada', 'linhas ignoradas'))
  return `${i.arquivo}: ${partes.join(', ')}`
}

export function ImportarModal({ tipo, controle, onFechar }: { tipo: TipoImportacao; controle: Controle; onFechar: () => void }) {
  const c = CONFIG[tipo]
  const ultimo = controle.state.importacoes.find((i) => i.tipo === tipo)

  const enviar = (files: File[]) => {
    if (tipo === 'faturamento') controle.importarFaturamentoArquivo(files[0])
    else if (tipo === 'pagas') controle.importarPagasArquivo(files[0])
    else controle.importarPdfs(files)
  }

  return (
    <Modal titulo={c.titulo} subtitulo={c.explica} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <DropZone label={c.zona} hint={c.hint} accept={c.accept} multiple={c.multiple} onFiles={enviar} />
        {ultimo && (
          <p
            role="status"
            className={`truncate rounded-lg px-3 py-2 text-sm ${'erro' in ultimo ? 'bg-danger-soft text-danger' : 'bg-action-soft text-ink'}`}
            title={textoUltimo(ultimo)}
          >
            {textoUltimo(ultimo)}
          </p>
        )}
      </div>
    </Modal>
  )
}
