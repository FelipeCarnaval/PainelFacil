import { HelpCircle } from 'lucide-react'

/**
 * Componente para mostrar dica de ajuda com ícone "?".
 * Uso: <HelpHint text="Explicação aqui">Conteúdo</HelpHint>
 */
export default function HelpHint({ text, children, className = '' }) {
  return (
    <span className={`tooltip-wrapper ${className}`} title={text}>
      {children}
      <HelpCircle size={14} className="tooltip-icon" aria-label={text} />
    </span>
  )
}
