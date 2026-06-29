import { detectTable } from './detectTable'
import { profileColumns } from './profile'
import { buildDashboard } from './suggestCharts'
import { detectCrosstab, unpivotCrosstab, deriveMeasureName } from './unpivot'

/**
 * Orquestra a análise de um conjunto de linhas cruas em um painel completo.
 * Função PURA (sem React, sem DOM): roda igual na UI thread, num Web Worker ou em teste.
 *
 * @param {any[][]} rows  Matriz crua de células (uma aba).
 * @param {{ headerRow?: number|null, types?: Record<string,string>, excluded?: string[], primary?: string|null, unpivot?: 'auto'|'off' }} [overrides]
 * @returns {{ table: object, allProfiles: object[], profiles: object[], dash: object, preview: any[][], crosstab: object }}
 */
export function analyzeDataset(rows, overrides = {}) {
  let table = detectTable(rows, overrides.headerRow)

  // Fase B: tabela cruzada (períodos nas colunas) -> "desempilha" para formato longo.
  // Detecta sempre (para oferecer o controle), mas só aplica se o usuário não desligou.
  const detected = detectCrosstab(table)
  const apply = detected && overrides.unpivot !== 'off'
  let crosstab = { available: !!detected, applied: false }
  if (apply) {
    const valueName = deriveMeasureName(rows, table.headerRow)
    table = unpivotCrosstab(table, detected, { valueName })
    crosstab = {
      available: true,
      applied: true,
      periods: detected.periodCols.length,
      dimensions: detected.idCols.map((c) => c.name),
      dateName: table.dateName,
      valueName: table.valueName,
    }
  }

  const allProfiles = profileColumns(table.columns, table.data, overrides.types)
  const excluded = new Set(overrides.excluded || [])
  const profiles = allProfiles.filter((p) => !excluded.has(p.name))
  const dash = buildDashboard(profiles, table.data, { primaryMeasure: overrides.primary })
  // Prévia leve das primeiras linhas CRUAS (para o seletor de cabeçalho na correção
  // manual) — evita manter as linhas cruas inteiras na UI thread.
  const preview = rows.slice(0, 30)
  return { table, allProfiles, profiles, dash, preview, crosstab }
}
