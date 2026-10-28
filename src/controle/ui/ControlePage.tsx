import { useState } from 'react'
import { useControle } from '../useControle'
import { AberturaBase } from './AberturaBase'
import { PrimeirosPassos } from './PrimeirosPassos'

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

  return <p>Tabela</p>
}
