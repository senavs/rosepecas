import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import Root from './Root'

vi.mock('./controle/ui/ControlePage', () => ({
  ControlePage: function ControlePageFake() {
    const [n, setN] = useState(0)
    return (
      <>
        <p>PÁGINA CONTROLE</p>
        <button type="button" onClick={() => setN(n + 1)}>
          alterações {n}
        </button>
      </>
    )
  },
}))

const irPara = async (hash: string) =>
  act(async () => {
    window.location.hash = hash
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })

test('trocar de aba e voltar mantém o estado do controle (base aberta não se perde)', async () => {
  render(<Root />)
  await userEvent.click(screen.getByRole('button', { name: 'alterações 0' }))
  await irPara('#/consolidador')
  expect(screen.getByText('PÁGINA CONTROLE')).not.toBeVisible()
  await irPara('#/')
  expect(screen.getByRole('button', { name: 'alterações 1' })).toBeVisible()
})

afterEach(() => {
  window.location.hash = ''
})

test('hash vazio mostra o Controle de NCC', () => {
  render(<Root />)
  expect(screen.getByText('PÁGINA CONTROLE')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Controle de NCC' })).toHaveAttribute('aria-current', 'page')
})

test('#/consolidador mostra o consolidador e troca ao mudar o hash', async () => {
  window.location.hash = '#/consolidador'
  render(<Root />)
  expect(screen.getByRole('heading', { name: /consolidador de ncc/i })).toBeInTheDocument()
  await act(async () => {
    window.location.hash = '#/'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(screen.getByText('PÁGINA CONTROLE')).toBeInTheDocument()
})
