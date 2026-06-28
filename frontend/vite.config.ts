import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    transformer: 'postcss',
  },
  build: {
    // CSS NO se minifica con lightningcss: el proyecto usa Tailwind v4 y su
    // sintaxis `--spacing(4)` revienta el minificador (lightningcss/esbuild).
    // Vercel ya sirve el CSS con compresión brotli, así que el costo real es bajo.
    cssMinify: false,
    rollupOptions: {
      output: {
        // Función (no objeto) para evitar el choque de overloads de tipos de
        // Rollup en `output`. Agrupa las libs pesadas en chunks cacheables
        // separados del código de la app.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-react';
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '/api/v1'),
      },
    },
  },
})
