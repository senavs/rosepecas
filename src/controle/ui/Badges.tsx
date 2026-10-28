import { MARCA_LABEL, STATUS_CARRO_LABEL } from '../labels'
import type { Marca, StatusCarro } from '../types'

const TOM_STATUS: Record<StatusCarro, string> = {
  pago: 'bg-action-soft text-action',
  parcial: 'bg-warn-soft text-warn',
  ncc_nao_paga: 'bg-danger-soft text-danger',
  sem_ncc: 'bg-paper text-ink',
  sem_comissao: 'bg-paper text-muted',
}

const TOM_MARCA: Record<Marca, string> = {
  planilha: '',
  confirmado: 'text-action',
  manual: 'text-muted',
  conflito: 'bg-warn-soft text-warn',
}

export function StatusBadge({ status }: { status: StatusCarro }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TOM_STATUS[status]}`}>{STATUS_CARRO_LABEL[status]}</span>
}

export function MarcaBadge({ marca }: { marca: Marca }) {
  if (marca === 'planilha') return null
  return <span className={`rounded-full border border-line px-1.5 text-[11px] ${TOM_MARCA[marca]}`}>{MARCA_LABEL[marca]}</span>
}
