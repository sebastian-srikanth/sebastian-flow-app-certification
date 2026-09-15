import path from 'node:path';

import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['vitest.setup.ts'],
    exclude: configDefaults.exclude,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', 'vitest.setup.ts', '**/*.config.ts', '**/*.d.ts'],
      // Certification hard gate: >=80% lines AND >=80% branches. Enforced here so the gate fails
      // the build on regression instead of being re-checked by hand.
      thresholds: {
        lines: 80,
        branches: 80,
        statements: 80,
        functions: 80,
      },
    },
  },
});
