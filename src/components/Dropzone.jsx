import { useRef, useState } from 'react'
import { UploadCloud, Sparkles, AlertTriangle } from 'lucide-react'

const MAX_MB = 100
const ACCEPT_RX = /\.(xlsx|xls|csv)$/i

function validate(file) {
  if (!ACCEPT_RX.test(file.name || '')) {
    return 'Formato não suportado. Envie um arquivo Excel (.xlsx, .xls) ou CSV.'
  }
  if (file.size === 0) return 'O arquivo está vazio.'
  if (file.size > MAX_MB * 1024 * 1024) {
    const mb = (file.size / (1024 * 1024)).toFixed(0)
    return `Arquivo muito grande (${mb} MB). O limite é ${MAX_MB} MB — exporte um período menor.`
  }
  return null
}

export default function Dropzone({ onFile, onExample }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')

  function pick(files) {
    const file = files && files[0]
    if (!file) return
    const problem = validate(file)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    onFile(file)
  }

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone ${drag ? 'drag' : ''} ${error ? 'has-error' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          pick(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="dz-icon"><UploadCloud size={40} strokeWidth={1.6} /></div>
        <p className="dz-title">Arraste o arquivo aqui ou clique para escolher</p>
        <p className="dz-sub">Excel (.xlsx, .xls) ou CSV · até {MAX_MB} MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          hidden
          onChange={(e) => pick(e.target.files)}
        />
      </div>
      {error && (
        <p className="dz-error" role="alert">
          <AlertTriangle size={15} /> {error}
        </p>
      )}
      <button className="btn link-example" onClick={onExample}>
        <Sparkles size={15} /> Usar exemplo (relatório fictício do Benner)
      </button>
    </div>
  )
}
