import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock environment variables
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
});

// Mock process.env for feature flags
vi.stubGlobal('process', {
  ...process,
  env: {
    ...process.env,
    NODE_ENV: 'test',
  },
});
