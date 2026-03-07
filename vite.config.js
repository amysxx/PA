import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: false
  },
  build: {
    outDir: 'dist'
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
});
