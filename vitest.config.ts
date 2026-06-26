import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom gives us a browser-like environment (window, localStorage, etc.)
    environment: 'jsdom',
    // Expose describe/it/expect globally so tests don't need explicit imports
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/logger.ts'], // trivial wrapper, not worth mocking console
    },
  },
});
