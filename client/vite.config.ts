import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    host: process.env.CLIENT_HOST || '0.0.0.0',
    port: parseInt(process.env.CLIENT_PORT || '5173'),
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true
      },
      '/socket.io': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        ws: true
      },
      '/templates': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: process.env.CLIENT_HOST || '0.0.0.0',
    port: parseInt(process.env.CLIENT_PORT || '5173')
  }
})