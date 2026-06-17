import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      stream: path.resolve(__dirname, 'src/shims/stream.js'),
      fs: path.resolve(__dirname, 'src/shims/fs.js'),
    },
  },
  optimizeDeps: {
    include: ['xlsx', 'xlsx-js-style'],
  },
  ssr: {
    noExternal: ['xlsx', 'xlsx-js-style'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
