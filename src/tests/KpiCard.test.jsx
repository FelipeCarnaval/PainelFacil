// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import KpiCard from '../components/KpiCard'

describe('KpiCard', () => {
  it('mostra a variação positiva com classe "up"', () => {
    render(<KpiCard label="Total" value={1000} kind="num" agg="sum" measure="Valor" trend={0.123} spark={[1, 2, 3]} />)
    const badge = screen.getByText('12,3%')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('kpi-trend', 'up')
  })

  it('mostra a variação negativa com classe "down"', () => {
    render(<KpiCard label="Glosa" value={500} kind="num" agg="sum" measure="Glosa" trend={-0.2} />)
    expect(screen.getByText('20,0%')).toHaveClass('down')
  })

  it('renderiza sparkline quando há série', () => {
    const { container } = render(<KpiCard label="X" value={9} kind="int" agg="count" spark={[3, 5, 4, 8]} />)
    expect(container.querySelector('svg.spark')).toBeInTheDocument()
  })

  it('sem trend não renderiza o selo de variação', () => {
    const { container } = render(<KpiCard label="X" value={9} kind="int" agg="count" />)
    expect(container.querySelector('.kpi-trend')).toBeNull()
  })
})
