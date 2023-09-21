import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // Silence Vite warnings about node packages loaded by postcss
      // See https://github.com/vitejs/vite/issues/9200
      path: './noop.js',
      fs: './noop.js',
      url: './noop.js',
      'source-map-js': './noop.js',
    },
  },
  plugins: [react()],
  server: {
    port: 8080,
    strictPort: true,
    host: true,
    proxy: {
      '/.netlify': 'http://localhost:9999/.netlify',
    },
  },
});
