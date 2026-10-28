import { useMemo, useState } from 'react'
import { contarPorStatus, filtrarCarros, FILTROS_VAZIOS, type Filtros } from '../filter'
import type { Base } from '../types'
import { useControle, type Controle } from '../useControle'
import { calcularVisao } from '../view'
import { AberturaBase } from './AberturaBase'
import { BarraSalvamento } from './BarraSalvamento'
import { CarrosTable } from './CarrosTable'
import { Contadores } from './Contadores'
import { EnriquecerSidebar } from './EnriquecerSidebar'
import { FiltrosBar } from './FiltrosBar'
import { OrfaosTable } from './OrfaosTable'
import { PrimeirosPassos } from './PrimeirosPassos'

/** Acima disso a tabela fica pesada sem virtualização; o usuário refina os filtros. */
const LIMITE_LINHAS = 500

function TelaPrincipal({ controle, base }: { controle: Controle; base: Base }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [aba, setAba] = useState<'carros' | 'orfaos'>('carros')
  const visao = useMemo(() => calcularVisao(base), [base])
  const filtrados = useMemo(() => filtrarCarros(visao.carros, filtros), [visao, filtros])
  // Os contadores refletem os demais filtros, mas não o próprio filtro de status.
  const contagem = useMemo(() => contarPorStatus(filtrarCarros(visao.carros, { ...filtros, status: [] })), [visao, filtros])

  const alternarStatus = (s: Filtros['status'][number]) =>
    setFiltros((f) => ({ ...f, status: f.status.includes(s) ? f.status.filter((x) => x !== s) : [...f.status, s] }))

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <EnriquecerSidebar controle={controle} />
      <main className="flex min-w-0 flex-1 flex-col gap-4">
        <BarraSalvamento state={controle.state} onBaixar={controle.baixar} onTentarDeNovo={controle.tentarSalvarDeNovo} />
        <Contadores contagem={contagem} ativos={filtros.status} onAlternar={alternarStatus} />
        <FiltrosBar
          filtros={filtros}
          onChange={setFiltros}
          onLimpar={() => setFiltros(FILTROS_VAZIOS)}
          aba={aba}
          onAba={setAba}
          totalCarros={filtrados.length}
          totalOrfaos={visao.orfaos.length}
        />
        {aba === 'carros' ? (
          <CarrosTable
            carros={filtrados.slice(0, LIMITE_LINHAS)}
            total={filtrados.length}
            onAjustar={controle.ajustar}
            onDesfazer={controle.desfazerAjuste}
          />
        ) : (
          <OrfaosTable orfaos={visao.orfaos} onAjustar={controle.ajustar} onDesfazer={controle.desfazerAjuste} />
        )}
      </main>
    </div>
  )
}

export function ControlePage() {
  const controle = useControle()
  const [pulados, setPulados] = useState({ pagas: false, ncc: false })
  const [concluido, setConcluido] = useState(false)
  const { base } = controle.state

  if (!base) return <AberturaBase controle={controle} />

  const vazio = (t: object) => Object.keys(t).length === 0
  const emPassos =
    vazio(base.faturamento) || (!concluido && ((vazio(base.pagas) && !pulados.pagas) || (vazio(base.ncc) && !pulados.ncc)))
  if (emPassos) {
    return (
      <PrimeirosPassos
        controle={controle}
        pulados={pulados}
        onPular={(p) => setPulados((s) => ({ ...s, [p]: true }))}
        onConcluir={() => setConcluido(true)}
      />
    )
  }

  return <TelaPrincipal controle={controle} base={base} />
}
