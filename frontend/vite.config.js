import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      stream: path.resolve(__dirname, 'src/shims/stream.js'),
    },
  },
  optimizeDeps: {
    include: ['xlsx', 'xlsx-js-style'],
  },
})
