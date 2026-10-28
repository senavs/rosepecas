import { suportaArquivoLocal } from '../fileAccess'
import type { Controle } from '../useControle'

const BOTAO = 'rounded-lg px-4 py-2.5 font-semibold transition-colors'

export function AberturaBase({ controle }: { controle: Controle }) {
  const local = suportaArquivoLocal()
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-bold">Abra a sua base</h2>
        <p className="mt-2 text-muted">
          Os dados do controle ficam num arquivo no seu computador (<code>controle-ncc.json</code>). Nada é enviado para a
          internet. Na primeira vez, crie uma base nova; depois, abra o mesmo arquivo para continuar de onde parou.
        </p>
      </div>
      {!local && (
        <p className="rounded-lg bg-warn-soft px-4 py-2.5 text-sm text-warn">
          Neste navegador as alterações não são salvas sozinhas: use Baixar base atualizada sempre que terminar.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => controle.abrirNovo()} className={`${BOTAO} bg-action text-white hover:bg-action-hover`}>
          Criar nova base
        </button>
        {local ? (
          <button
            type="button"
            onClick={() => controle.abrirExistente()}
            className={`${BOTAO} border border-line bg-surface hover:border-action/60`}
          >
            Abrir base existente
          </button>
        ) : (
          <label className={`${BOTAO} cursor-pointer border border-line bg-surface hover:border-action/60 focus-within:outline focus-within:outline-2 focus-within:outline-action`}>
            Abrir base existente
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) controle.abrirDeArquivo(f)
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
      {controle.erroAbrir && (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {controle.erroAbrir}
        </p>
      )}
    </div>
  )
}
