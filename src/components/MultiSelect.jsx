import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Dropdown com busca e checkboxes. selected = Set (vazio = "todos").
export default function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? options.filter((o) => o.toLowerCase().includes(term)) : options
  }, [options, q])

  const count = selected.size
  const summary = count === 0 ? 'Todos' : `${count} selecionado${count > 1 ? 's' : ''}`

  function toggle(opt) {
    const next = new Set(selected)
    next.has(opt) ? next.delete(opt) : next.add(opt)
    onChange(next)
  }

  return (
    <div className="ms" ref={ref}>
      <button className={`ms-btn ${count ? 'active' : ''}`} onClick={() => setOpen((v) => !v)}>
        <span className="ms-label">{label}</span>
        <span className="ms-summary">{summary}</span>
        <ChevronDown size={14} className="ms-caret" />
      </button>
      {open && (
        <div className="ms-panel">
          <input
            className="ms-search"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="ms-options">
            {filtered.slice(0, 200).map((opt) => (
              <label key={opt} className="ms-opt">
                <input type="checkbox" checked={selected.has(opt)} onChange={() => toggle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="ms-empty">Nada encontrado</div>}
          </div>
          {count > 0 && (
            <button className="ms-clear" onClick={() => onChange(new Set())}>
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
