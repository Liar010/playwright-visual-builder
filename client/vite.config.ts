import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true
      },
      '/templates': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
})