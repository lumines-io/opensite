import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/validation.ts',
        'src/lib/construction-utils.ts',
        'src/lib/cache.ts',
        'src/lib/rate-limit.ts',
        'src/lib/feature-flags/*.ts',
        'src/lib/workflow/suggestion-state-machine.ts',
        'src/lib/scraper/hash.ts',
        'src/components/layout/**/*.tsx',
        'src/lib/universal-analytics/*.ts',
        'src/lib/universal-analytics/**/*.ts',
        'src/app/api/analytics/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'node_modules/**',
      ],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@payload-config': path.resolve(__dirname, './src/payload.config.ts'),
    },
  },
});
