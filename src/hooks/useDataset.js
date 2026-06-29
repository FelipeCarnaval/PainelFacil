import { useEffect, useRef, useState } from 'react'
import * as engine from '../services/analysisClient'
import { sampleSheet } from '../lib/sampleData'
import { configKey, loadOverrides, saveOverrides } from '../lib/configStore'

export const initialOverrides = () => ({ headerRow: null, types: {}, excluded: [], primary: null })

/**
 * Orquestra o ciclo de vida do dataset de forma ASSÍNCRONA (parse + análise rodam no
 * Web Worker). Expõe uma pequena máquina de estados e mantém a UI responsiva mesmo com
 * centenas de milhares de linhas. Resultados obsoletos (de análises antigas) são descartados.
 */
export function useDataset() {
  const [stage, setStage] = useState('idle') // idle | loading | pick | analyzing | error | ready
  const [error, setError] = useState('')
  const [fileBase, setFileBase] = useState('')
  const [sheets, setSheets] = useState([])
  const [token, setToken] = useState(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [overrides, setOverrides] = useState(initialOverrides())
  const [meta, setMeta] = useState(null)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(false)
  const [fileMeta, setFileMeta] = useState(null) // { name, size } do arquivo real (null no exemplo)
  const [fileKey, setFileKey] = useState(null) // chave de persistência da config
  const seq = useRef(0)

  // (Re)analisa quando aba ou overrides mudam — fora da UI thread.
  useEffect(() => {
    if (!active || token == null) return
    const my = ++seq.current
    let cancelled = false
    setBusy(true)
    engine
      .analyze(token, sheetIndex, overrides)
      .then((res) => {
        if (cancelled || my !== seq.current) return
        setMeta(res)
        setStage('ready')
      })
      .catch((e) => {
        if (cancelled || my !== seq.current) return
        setError('Erro ao analisar os dados: ' + (e?.message || e))
        setStage('error')
      })
      .finally(() => {
        if (!cancelled && my === seq.current) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [active, token, sheetIndex, overrides])

  // Persiste a CONFIGURAÇÃO (apenas overrides; nunca dados) ao concluir cada análise —
  // assim, reabrir o mesmo relatório já traz os ajustes manuais aplicados.
  useEffect(() => {
    if (fileKey && stage === 'ready') saveOverrides(fileKey, overrides)
  }, [fileKey, stage, overrides])

  function start(tk, sheetMeta, base, fMeta = null) {
    setToken(tk)
    setSheets(sheetMeta)
    setFileBase(base)
    setFileMeta(fMeta)
    if (sheetMeta.length === 1) {
      const key = fMeta ? configKey(fMeta.name, fMeta.size, 0) : null
      setFileKey(key)
      setSheetIndex(0)
      setOverrides((key && loadOverrides(key)) || initialOverrides())
      setMeta(null)
      setActive(true)
      setStage('analyzing')
    } else {
      setFileKey(null)
      setActive(false)
      setStage('pick')
    }
  }

  async function handleFile(file) {
    setStage('loading')
    setError('')
    try {
      const { token: tk, sheets: meta } = await engine.parseFile(file)
      if (!meta.length) {
        setError('Arquivo vazio ou em formato não reconhecido.')
        setStage('error')
        return
      }
      start(tk, meta, file.name, { name: file.name, size: file.size })
    } catch (e) {
      setError('Erro ao ler o arquivo: ' + (e?.message || e))
      setStage('error')
    }
  }

  async function useExample() {
    setStage('loading')
    setError('')
    try {
      const s = sampleSheet()
      const { token: tk } = await engine.loadRows(s.rows)
      start(tk, [{ name: s.name, rowCount: s.rows.length }], 'Exemplo')
    } catch (e) {
      setError('Erro ao gerar o exemplo: ' + (e?.message || e))
      setStage('error')
    }
  }

  function pickSheet(i) {
    const key = fileMeta ? configKey(fileMeta.name, fileMeta.size, i) : null
    setFileKey(key)
    setSheetIndex(i)
    setOverrides((key && loadOverrides(key)) || initialOverrides())
    setMeta(null)
    setActive(true)
    setStage('analyzing')
  }

  function reset() {
    engine.release(token)
    setStage('idle')
    setError('')
    setFileBase('')
    setSheets([])
    setToken(null)
    setSheetIndex(0)
    setOverrides(initialOverrides())
    setMeta(null)
    setActive(false)
    setBusy(false)
    setFileMeta(null)
    setFileKey(null)
  }

  const fileName =
    stage === 'pick'
      ? fileBase
      : `${fileBase}${sheets[sheetIndex] ? ' · ' + sheets[sheetIndex].name : ''}`

  return {
    stage, error, fileName, fileBase, sheets,
    overrides, setOverrides, meta, busy, token, sheetIndex,
    handleFile, useExample, pickSheet, reset,
  }
}
