// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Listen on all interfaces
    port: 5173        // Optional: set a fixed port
  },
  esbuild: {
    sourcemap: false // Disable source maps for esbuild to avoid corrupted source map errors
  },
  build: {
    sourcemap: false // Disable source maps in production builds
  }
})
