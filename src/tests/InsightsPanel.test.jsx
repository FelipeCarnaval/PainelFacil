// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import InsightsPanel from '../components/InsightsPanel'

describe('InsightsPanel', () => {
  it('não renderiza nada sem insights', () => {
    const { container } = render(<InsightsPanel insights={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('redige a frase de tendência (alta) em português', () => {
    render(
      <InsightsPanel
        insights={[{ type: 'trend', measure: 'Valor Pago', gran: 'month', delta: 0.123, prevKey: '2025-02', lastKey: '2025-03' }]}
      />,
    )
    expect(screen.getByText('Valor Pago')).toBeInTheDocument()
    expect(screen.getByText(/subiu/)).toBeInTheDocument()
    expect(screen.getByText('12,3%')).toBeInTheDocument()
  })

  it('redige queda, pico e concentração', () => {
    render(
      <InsightsPanel
        insights={[
          { type: 'trend', measure: 'Glosa', gran: 'month', delta: -0.05, prevKey: '2025-02', lastKey: '2025-03' },
          { type: 'peak', measure: 'Valor', gran: 'month', periodKey: '2025-01', value: 1500000, share: 0.4 },
          { type: 'concentration', dim: 'Convênio', measure: 'Valor', topKey: 'Unimed', share: 0.45, groupCount: 8 },
        ]}
      />,
    )
    expect(screen.getByText(/caiu/)).toBeInTheDocument()
    expect(screen.getByText(/Melhor mês/)).toBeInTheDocument()
    expect(screen.getByText('Unimed')).toBeInTheDocument()
    expect(screen.getByText(/concentra/)).toBeInTheDocument()
  })
})
