import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@shared': path.resolve(__dirname, '../../packages/shared-types/src') } },
  server: { proxy: { '/api': 'http://localhost:3000' } },
  test: { environment: 'jsdom' },
});
