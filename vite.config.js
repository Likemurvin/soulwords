import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                 // expose on LAN / ngrok
    allowedHosts: true,         // accept the random ngrok hostname
    proxy: {
      // In dev, forward API calls to the Express server so the client can use
      // same-origin relative paths (no CORS, no VITE_API_URL needed).
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      // Socket.IO needs WebSocket upgrade proxying for live human matches.
      '/socket.io': { target: 'http://localhost:3001', changeOrigin: true, ws: true },
    },
  },
})
