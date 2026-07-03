import { HelpCircle } from 'lucide-react'

/**
 * Tooltip simples com ícone "?".
 * Uso: <Tooltip text="Explicação aqui">Conteúdo</Tooltip>
 */
export default function Tooltip({ text, children, className = '' }) {
  return (
    <span className={`tooltip-wrapper ${className}`} title={text}>
      {children}
      <HelpCircle size={14} className="tooltip-icon" aria-label={text} />
    </span>
  )
}
