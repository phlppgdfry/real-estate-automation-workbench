import { defineConfig } from 'vite';
export default defineConfig({
  base: '/real-estate-automation-workbench/',
  build: { outDir: 'dist' },
  server: { port: 5187, strictPort: true },
});
