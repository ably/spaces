import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  root: "app",
  server: {
    port: 8080,
    strictPort: true,
    host: true,
    proxy: {
      '/.netlify': 'http://localhost:9999/.netlify'
    }
  },
  build: {
    outDir: "../dist",
    sourcemap: true,
    emptyOutDir: true
  },
  plugins: []
})
