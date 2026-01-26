/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [], // We can add setup files later if needed
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/reference repos/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Add other aliases from tsconfig if necessary
    },
    coverage: {
      provider: 'v8', 
      reporter: ['text', 'json', 'html'],
    },
  },
});
