import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    cors: true,
    hmr: {
      host: '127.0.0.1',
      port: 5173,
      protocol: 'ws'
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
