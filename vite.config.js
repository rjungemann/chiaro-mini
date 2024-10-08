import path from "path"
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const base = mode === 'development' ? '/' : '/chiaro-mini/'
  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        "src": "/src",
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
