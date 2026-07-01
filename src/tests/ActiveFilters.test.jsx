// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ActiveFilters from '../components/ActiveFilters'

const base = {
  dimFilters: {}, dateFrom: null, dateTo: null, dateCol: 'Competência',
  onClearValue: () => {}, onClearDate: () => {}, onClearAll: () => {},
}

describe('ActiveFilters', () => {
  it('não renderiza nada sem filtros', () => {
    const { container } = render(<ActiveFilters {...base} />)
    expect(container.firstChild).toBeNull()
  })

  it('mostra um chip por valor selecionado', () => {
    render(<ActiveFilters {...base} dimFilters={{ Convênio: new Set(['Unimed', 'Amil']) }} />)
    expect(screen.getByText('Convênio: Unimed')).toBeInTheDocument()
    expect(screen.getByText('Convênio: Amil')).toBeInTheDocument()
  })

  it('clicar no chip remove aquele valor', () => {
    const onClearValue = vi.fn()
    render(<ActiveFilters {...base} dimFilters={{ Convênio: new Set(['Unimed']) }} onClearValue={onClearValue} />)
    fireEvent.click(screen.getByText('Convênio: Unimed'))
    expect(onClearValue).toHaveBeenCalledWith('Convênio', 'Unimed')
  })

  it('"Limpar tudo" chama onClearAll', () => {
    const onClearAll = vi.fn()
    render(<ActiveFilters {...base} dimFilters={{ Convênio: new Set(['Unimed']) }} onClearAll={onClearAll} />)
    fireEvent.click(screen.getByText('Limpar tudo'))
    expect(onClearAll).toHaveBeenCalled()
  })

  it('mostra chip de intervalo de datas', () => {
    render(<ActiveFilters {...base} dateFrom={new Date(2025, 0, 1)} dateTo={new Date(2025, 2, 31)} />)
    expect(screen.getByText(/Competência:/)).toBeInTheDocument()
  })
})
