import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.js'],
      // Excluídos: gerador de exemplo (dados fictícios) e worker (precisa de ambiente DOM/Worker).
      exclude: ['src/lib/sampleData.js', 'src/lib/workers/**'],
      reporter: ['text-summary', 'text'],
      reportsDirectory: 'node_modules/.cache/coverage',
    },
  },
})
