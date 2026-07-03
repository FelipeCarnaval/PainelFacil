import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base '/PainelFacil/' só na build (para o GitHub Pages servir os assets do subdiretório);
// em dev continua em '/'. O PWA torna o app instalável e utilizável offline.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'PainelFácil — Dashboards automáticos',
        short_name: 'PainelFácil',
        description: 'Dashboards automáticos a partir de qualquer planilha (Excel/CSV) — 100% local.',
        lang: 'pt-BR',
        theme_color: '#1d4ed8',
        background_color: '#eef1f8',
        display: 'standalone',
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Acomoda o chunk do xlsx (~488 KB) e o worker (~382 KB) no cache offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  base: command === 'build' ? '/PainelFacil/' : '/',
  server: { port: 5176 },
}))
