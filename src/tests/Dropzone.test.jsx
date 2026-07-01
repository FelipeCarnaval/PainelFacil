// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Dropzone from '../components/Dropzone'

const input = (c) => c.querySelector('input[type="file"]')

describe('Dropzone', () => {
  it('aceita CSV válido e chama onFile', () => {
    const onFile = vi.fn()
    const { container } = render(<Dropzone onFile={onFile} onExample={() => {}} />)
    const file = new File(['a,b\n1,2'], 'dados.csv', { type: 'text/csv' })
    fireEvent.change(input(container), { target: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('rejeita extensão não suportada e mostra erro', () => {
    const onFile = vi.fn()
    const { container } = render(<Dropzone onFile={onFile} onExample={() => {}} />)
    const file = new File(['x'], 'documento.pdf', { type: 'application/pdf' })
    fireEvent.change(input(container), { target: { files: [file] } })
    expect(onFile).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/Formato não suportado/)
  })

  it('rejeita arquivo vazio', () => {
    const onFile = vi.fn()
    const { container } = render(<Dropzone onFile={onFile} onExample={() => {}} />)
    const file = new File([], 'vazio.csv', { type: 'text/csv' })
    fireEvent.change(input(container), { target: { files: [file] } })
    expect(onFile).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/vazio/)
  })

  it('"Usar exemplo" chama onExample', () => {
    const onExample = vi.fn()
    render(<Dropzone onFile={() => {}} onExample={onExample} />)
    fireEvent.click(screen.getByText(/Usar exemplo/))
    expect(onExample).toHaveBeenCalled()
  })
})
