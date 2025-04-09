import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://10.0.0.11:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  }
}) 