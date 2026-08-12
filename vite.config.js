import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Le greffon Base44 est retiré : il servait l'atelier visuel et les imports hérités du SDK,
// qui n'ont plus d'objet une fois l'application branchée sur son propre back.
//
// Le niveau de journalisation reste au défaut ('info') : pendant la bascule, les
// avertissements de résolution de Vite sont précisément ce qui signale un import resté
// accroché à l'ancien SDK. Les masquer ferait passer une régression pour un écran vide.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true, // échouer franchement plutôt que glisser sur 5174 sans le dire
  },
});
