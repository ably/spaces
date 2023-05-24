import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import buildcommonjs from '@rollup/plugin-commonjs';

// https://vitejs.dev/config/
export default defineConfig({
  root: 'app',
  server: {
    port: 8080,
    strictPort: true,
    host: true,
    proxy: {
      '/.netlify': 'http://localhost:9999/.netlify',
    },
  },
  build: {
    outDir: '../dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [commonjs(), buildcommonjs()],
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.cjs'],
  },
});
