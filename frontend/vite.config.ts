import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Carrega `.env` de `frontend/src/` (onde está o BACKEND_URL / VITE_* do projeto).
  envDir: path.resolve(__dirname, 'src'),
  plugins: [react(), tailwindcss()],
  server: {
    // Host permitido quando o dev server é acessado via domínio (proxy reverso / DNS).
    allowedHosts: ['www.heykiki.com.br', 'heykiki.com.br'],
    // Não processar ficheiros de build/deploy na raiz (evita erro "invalid JS" no Dockerfile, etc.)
    watch: {
      ignored: ['**/Dockerfile', '**/caddy.txt', '**/.dockerignore'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
