import { Sheet } from 'lucide-react'

export default function SheetPicker({ sheets, fileName, onPick, onCancel }) {
  return (
    <div className="sheet-picker">
      <h2><Sheet size={20} className="chart-ic" /> Qual aba você quer analisar?</h2>
      <p className="sub">O arquivo <b>{fileName}</b> tem {sheets.length} abas.</p>
      <div className="sheet-grid">
        {sheets.map((s, i) => (
          <button key={i} className="sheet-card" onClick={() => onPick(i)}>
            <span className="sheet-name">{s.name}</span>
            <span className="sheet-rows">{s.rows.length} linhas</span>
          </button>
        ))}
      </div>
      <button className="btn ghost" onClick={onCancel}>Cancelar</button>
    </div>
  )
}
