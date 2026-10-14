import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local development proxies browser API requests to the Node.js backend.
// Production is served by the backend from frontend/dist (same-origin).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3001', changeOrigin: true }
    }
  }
})
