import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to all interfaces. Vite's default (localhost) is only reachable from
    // inside the container, so the published port would look dead from the host.
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      // Filesystem events don't propagate across a Windows/macOS bind mount, so
      // hot reload silently stops working without polling. Costs some CPU, so
      // it's opt-in via the env var — compose sets it for the dev container only.
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
      interval: 300,
    },
  },
})
