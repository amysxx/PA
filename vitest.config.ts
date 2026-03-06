import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,js}'],
    exclude: ['tests/**', 'test-results/**', 'playwright-report/**', 'node_modules/**'],
    environment: 'happy-dom',
  },
});

