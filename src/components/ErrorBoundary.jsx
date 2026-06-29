import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

// Captura erros de renderização de qualquer componente filho para que uma falha
// pontual (ex.: um gráfico com dado inesperado) NÃO derrube o app inteiro (tela branca).
// `resetKey` muda => o boundary se recupera sozinho (ex.: ao trocar de arquivo).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback || (
          <div className="state-center">
            <p className="error-msg">
              <AlertTriangle size={18} /> Algo deu errado ao montar esta parte do painel.
            </p>
            <p className="sub">
              Os seus dados continuam no navegador — nada foi enviado a lugar nenhum. Tente recarregar
              esta seção ou abrir o arquivo novamente.
            </p>
            <button className="btn" onClick={() => this.setState({ error: null })}>
              <RotateCcw size={15} /> Tentar de novo
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
