import { defineConfig } from 'vitest/config';

// Vitest configuration. Logic/math tests run in node (no DOM needed).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
