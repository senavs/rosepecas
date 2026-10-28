import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Root from './Root'

vi.mock('./controle/ui/ControlePage', () => ({ ControlePage: () => <p>PÁGINA CONTROLE</p> }))

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
