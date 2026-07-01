import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/PainelFacil/' só na build (para o GitHub Pages servir os assets do subdiretório);
// em dev continua em '/'.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/PainelFacil/' : '/',
  server: { port: 5176 },
}))
