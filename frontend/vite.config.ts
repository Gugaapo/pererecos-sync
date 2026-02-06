import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/sync/',
  server: {
    proxy: {
      '/sync/api': {
        target: 'http://127.0.0.1:8001',
        rewrite: (path) => path.replace(/^\/sync/, ''),
      },
      '/sync/ws': {
        target: 'ws://127.0.0.1:8001',
        ws: true,
        rewrite: (path) => path.replace(/^\/sync/, ''),
      },
    },
  },
})
