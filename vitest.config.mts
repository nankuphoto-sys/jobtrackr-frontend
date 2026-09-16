import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
});
