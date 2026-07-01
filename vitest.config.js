import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Ambiente 'node' por padrão (motor); testes de componente usam
    // `// @vitest-environment jsdom` no topo do arquivo.
    environment: 'node',
    globals: true, // habilita o auto-cleanup do Testing Library entre os testes
    include: ['src/tests/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.js'],
      // Excluídos: gerador de exemplo (dados fictícios) e worker (precisa de ambiente DOM/Worker).
      exclude: ['src/lib/sampleData.js', 'src/lib/workers/**'],
      reporter: ['text-summary', 'text'],
      reportsDirectory: 'node_modules/.cache/coverage',
      // Trava o nível atual (linhas ~97%, branches ~83%) para evitar regressão.
      thresholds: { statements: 90, branches: 80, functions: 95, lines: 95 },
    },
  },
})
