import { defineConfig } from 'vitest/config';

// Scope the backend test run to this package. Without this, the root `vitest`
// also picks up `web-ui/**` tests, which fail because the `@/` alias is only
// defined in web-ui/vitest.config.ts.
export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'web-ui/**'],
  },
});
