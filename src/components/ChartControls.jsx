// Controles globais dos gráficos como "pills" (um clique, sem dropdown):
// quantos itens mostrar nos rankings (Top N) e a granularidade da série temporal.
// Recalculam a visão (no worker) ao mudar.
import HelpHint from './HelpHint'

const TOPS = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 25, label: '25' },
  { value: 999, label: 'Todos' },
]
const GRANS = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Ano' },
]

function PillGroup({ label, options, value, onChange }) {
  return (
    <div className="cc-item" role="group" aria-label={label}>
      <span className="cc-label">{label}</span>
      <div className="pills">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`pill${value === o.value ? ' active' : ''}`}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ChartControls({ opts, setOpts, showTopN, hasDate }) {
  if (!showTopN && !hasDate) return null
  return (
    <div className="chart-controls no-print">
      {showTopN && (
        <PillGroup
          label="Mostrar top"
          options={TOPS}
          value={opts.topN}
          onChange={(topN) => setOpts((o) => ({ ...o, topN }))}
        />
      )}
      {hasDate && (
        <div className="cc-item" role="group" aria-label="Período">
          <HelpHint text="Auto detecta a melhor granularidade de tempo. Dados diários? Mostra por Dia. Mensais? Mostra por Mês.">
            <span className="cc-label">Período</span>
          </HelpHint>
          <div className="pills">
            {GRANS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`pill${opts.gran === o.value ? ' active' : ''}`}
                aria-pressed={opts.gran === o.value}
                onClick={() => setOpts((x) => ({ ...x, gran: o.value }))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
