import path from "path"
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname);
  const nodeEnv = env.NODE_ENV ?? 'production'
  const isDevelopment = nodeEnv === 'development'
  return {
    ...(isDevelopment ? {} : { base: '/chiaro-mini/' }),
    plugins: [react()],
    resolve: {
      alias: {
        "src": "/src",
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
