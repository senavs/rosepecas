import { useState, type ReactNode } from 'react'
import { Modal } from '../../components/Modal'
import { formatBr } from '../../ncc/number'
import { formatarData, STATUS_LINHA_LABEL } from '../labels'
import type { Ajuste, AlvoAjuste, CarroView, LinhaView } from '../types'
import { MarcaBadge, StatusBadge } from './Badges'

type Props = {
  subtitulo: ReactNode
  /** Ausente para órfãos: só há a linha da NCC para ajustar. */
  carro?: CarroView
  linhas: LinhaView[]
  onAjustar: (ajuste: Ajuste) => void
  onDesfazer: (alvo: AlvoAjuste) => void
  onFechar: () => void
}

const SEG = 'px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md'
const segTom = (ativo: boolean, tom: 'pago' | 'nao') =>
  ativo
    ? tom === 'pago'
      ? 'bg-action text-white'
      : 'bg-danger text-white'
    : 'bg-surface text-ink hover:bg-paper'

function Registro({ ajuste }: { ajuste: Ajuste | null }) {
  if (!ajuste) return null
  return (
    <p className="text-xs text-muted">
      Marcado como {ajuste.status === 'pago' ? 'pago' : 'não pago'} em {formatarData(ajuste.em)}
      {ajuste.obs && <span className="block italic text-ink">“{ajuste.obs}”</span>}
    </p>
  )
}

/** Escolha Pago / Não pago de um item, com desfazer quando já houver ajuste. */
function Escolha(props: {
  ajuste: Ajuste | null
  rotuloPago: string
  rotuloNao: string
  ariaPago: string
  ariaNao: string
  ariaDesfazer: string
  onMarcar: (s: Ajuste['status']) => void
  onDesfazer: () => void
}) {
  const s = props.ajuste?.status
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex divide-x divide-line rounded-md border border-line">
        <button type="button" aria-label={props.ariaPago} aria-pressed={s === 'pago'} onClick={() => props.onMarcar('pago')} className={`${SEG} ${segTom(s === 'pago', 'pago')}`}>
          {props.rotuloPago}
        </button>
        <button type="button" aria-label={props.ariaNao} aria-pressed={s === 'nao_pago'} onClick={() => props.onMarcar('nao_pago')} className={`${SEG} ${segTom(s === 'nao_pago', 'nao')}`}>
          {props.rotuloNao}
        </button>
      </div>
      {props.ajuste && (
        <button type="button" aria-label={props.ariaDesfazer} onClick={props.onDesfazer} className="rounded-md px-2 py-1 text-sm text-muted underline-offset-2 hover:text-danger hover:underline">
          Desfazer
        </button>
      )}
    </div>
  )
}

export function AjusteModal({ subtitulo, carro, linhas, onAjustar, onDesfazer, onFechar }: Props) {
  const [obs, setObs] = useState('')
  const marcar = (alvo: AlvoAjuste, status: Ajuste['status']) => {
    onAjustar({ alvo, status, em: new Date().toISOString(), obs: obs.trim() })
    onFechar()
  }
  const desfazer = (alvo: AlvoAjuste) => {
    onDesfazer(alvo)
    onFechar()
  }

  return (
    <Modal titulo="Ajuste manual" subtitulo={subtitulo} onFechar={onFechar} largura="lg">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted">O ajuste fica registrado à parte e não altera os dados importados das planilhas e PDFs.</p>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Observação (opcional)
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
            placeholder="Ex.: conferido no extrato de 10/11"
            className="rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>

        {carro && (
          <section className="flex flex-col gap-2 rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Carro inteiro</h3>
              <span className="flex items-center gap-1">
                <StatusBadge status={carro.exibido} />
                <MarcaBadge marca={carro.marca} />
              </span>
            </div>
            <Registro ajuste={carro.ajuste} />
            <Escolha
              ajuste={carro.ajuste}
              rotuloPago="Pago"
              rotuloNao="Não pago"
              ariaPago="Marcar carro como pago"
              ariaNao="Marcar carro como não pago"
              ariaDesfazer="Desfazer ajuste do carro"
              onMarcar={(s) => marcar({ tipo: 'carro', nf: carro.fat.nf }, s)}
              onDesfazer={() => desfazer({ tipo: 'carro', nf: carro.fat.nf })}
            />
          </section>
        )}

        {linhas.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{carro ? 'Cada NCC' : 'NCC'}</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {linhas.map((l) => (
                <li key={l.chave} className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span>
                      <span className="num font-semibold">{l.ncc}</span> <span className="text-muted">{l.cod}</span>
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="num">{l.temPdf ? (l.comissaoLiquida === null ? '' : formatBr(l.comissaoLiquida)) : 'sem PDF'}</span>
                      <span className={l.exibido === 'paga' ? 'text-action' : 'text-danger'}>{STATUS_LINHA_LABEL[l.exibido]}</span>
                      <MarcaBadge marca={l.marca} />
                    </span>
                  </div>
                  <Registro ajuste={l.ajuste} />
                  <Escolha
                    ajuste={l.ajuste}
                    rotuloPago="Paga"
                    rotuloNao="Não paga"
                    ariaPago={`Marcar NCC ${l.ncc} como paga`}
                    ariaNao={`Marcar NCC ${l.ncc} como não paga`}
                    ariaDesfazer={`Desfazer ajuste da NCC ${l.ncc}`}
                    onMarcar={(s) => marcar({ tipo: 'linha', ncc: l.ncc, nf: l.nf }, s)}
                    onDesfazer={() => desfazer({ tipo: 'linha', ncc: l.ncc, nf: l.nf })}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  )
}
