import { DropZone } from '../../components/DropZone'
import { Modal } from '../../components/Modal'
import { formatarData } from '../labels'
import type { TipoImportacao } from '../types'
import type { Controle } from '../useControle'
import { ResumoImportacao } from './ResumoImportacao'

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

export function ImportarModal({ tipo, controle, onFechar }: { tipo: TipoImportacao; controle: Controle; onFechar: () => void }) {
  const c = CONFIG[tipo]
  const daSessao = controle.state.importacoes.filter((i) => i.tipo === tipo)
  // As importações bem-sucedidas desta sessão também estão no histórico da base; ali só entram as anteriores.
  const sucessosDaSessao = daSessao.filter((i) => 'resumo' in i).length
  const doTipo = (controle.state.base?.importacoes ?? []).filter((i) => i.tipo === tipo)
  const anteriores = doTipo.slice(0, doTipo.length - sucessosDaSessao).reverse()

  const enviar = (files: File[]) => {
    if (tipo === 'faturamento') controle.importarFaturamentoArquivo(files[0])
    else if (tipo === 'pagas') controle.importarPagasArquivo(files[0])
    else controle.importarPdfs(files)
  }

  return (
    <Modal titulo={c.titulo} subtitulo={c.explica} onFechar={onFechar}>
      <div className="flex flex-col gap-5">
        <DropZone label={c.zona} hint={c.hint} accept={c.accept} multiple={c.multiple} onFiles={enviar} />
        {daSessao.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Enviados agora</h3>
            <ResumoImportacao itens={daSessao} />
          </section>
        )}
        {anteriores.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Já na base</h3>
            <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line text-sm">
              {anteriores.map((i, n) => (
                <li key={n} className="flex items-baseline justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate" title={i.arquivo}>
                    {i.arquivo}
                  </span>
                  <span className="num shrink-0 text-xs text-muted">
                    {formatarData(i.em)}, {plural(i.novos, 'novo', 'novos')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  )
}
