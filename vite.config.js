import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Le greffon Base44 est retiré : il servait l'atelier visuel et les imports hérités du SDK,
// qui n'ont plus d'objet une fois l'application branchée sur son propre back.
export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
