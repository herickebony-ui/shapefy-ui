import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://beta.shapefy.online',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
      },
      '/files': {
        target: 'https://beta.shapefy.online',
        changeOrigin: true,
        secure: true,
      },
      '/private/files': {
        target: 'https://beta.shapefy.online',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})