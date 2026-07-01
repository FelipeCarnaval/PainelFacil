// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import Sparkline from '../components/Sparkline'

describe('Sparkline', () => {
  it('desenha um svg com linha e área para >= 2 pontos', () => {
    const { container } = render(<Sparkline data={[1, 4, 2, 8, 5]} />)
    const svg = container.querySelector('svg.spark')
    expect(svg).toBeInTheDocument()
    expect(svg.querySelectorAll('path').length).toBe(2) // área + linha
  })

  it('não renderiza com menos de 2 pontos', () => {
    const { container } = render(<Sparkline data={[5]} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
