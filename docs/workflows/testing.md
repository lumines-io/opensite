# Testing Workflow

## Overview

The project uses Vitest as the test framework with Testing Library for component testing. This document covers the testing strategy, patterns, and best practices.

## Testing Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner and assertion library |
| **Testing Library** | Component testing utilities |
| **jsdom** | DOM environment for tests |
| **MSW** | API mocking (optional) |

## Running Tests

### Commands

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run specific file
npm run test -- src/lib/utils.test.ts

# Run tests matching pattern
npm run test -- --grep "search"
```

### Watch Mode

```bash
npm run test
# Press 'a' to run all tests
# Press 'f' to run failed tests
# Press 'p' to filter by file name
# Press 't' to filter by test name
# Press 'q' to quit
```

## Test Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'test-token');

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
```

## Test Structure

### File Organization

```
src/
├── lib/
│   ├── utils.ts
│   └── utils.test.ts       # Co-located with source
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx     # Co-located with component
└── hooks/
    ├── useSearch.ts
    └── useSearch.test.ts   # Co-located with hook

tests/
├── setup.ts               # Global test setup
├── mocks/                 # Mock data and handlers
│   ├── handlers.ts
│   └── data.ts
└── e2e/                   # End-to-end tests (if any)
```

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

## Testing Patterns

### Unit Tests

Testing pure functions and utilities:

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, calculateProgress } from './utils';

describe('formatDate', () => {
  it('formats date in Vietnamese locale', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date, 'vi')).toBe('15/01/2024');
  });

  it('formats date in English locale', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date, 'en')).toBe('01/15/2024');
  });

  it('returns empty string for null date', () => {
    expect(formatDate(null, 'vi')).toBe('');
  });
});

describe('calculateProgress', () => {
  it('calculates percentage correctly', () => {
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(75, 100)).toBe(75);
  });

  it('returns 0 for zero total', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('caps at 100%', () => {
    expect(calculateProgress(150, 100)).toBe(100);
  });
});
```

### Component Tests

Testing React components:

```typescript
// src/components/StatusBadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders status text', () => {
    render(<StatusBadge status="in-progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('applies correct styling for each status', () => {
    const { rerender } = render(<StatusBadge status="completed" />);
    expect(screen.getByRole('status')).toHaveClass('bg-green-100');

    rerender(<StatusBadge status="paused" />);
    expect(screen.getByRole('status')).toHaveClass('bg-yellow-100');
  });

  it('is accessible', () => {
    render(<StatusBadge status="in-progress" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

### Hook Tests

Testing custom hooks:

```typescript
// src/hooks/useSearch.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSearch } from './useSearch';

describe('useSearch', () => {
  it('returns empty results initially', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('searches when query changes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ results: [{ id: 1, title: 'Test' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test');
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('query=test')
    );
  });

  it('debounces search requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ results: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('t');
      result.current.setQuery('te');
      result.current.setQuery('test');
    });

    await waitFor(() => {
      // Should only call once due to debouncing
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
```

### API Route Tests

Testing Next.js API routes:

```typescript
// src/app/api/constructions/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock Payload
vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn().mockResolvedValue({
    find: vi.fn().mockResolvedValue({
      docs: [{ id: '1', title: 'Test Construction' }],
      totalDocs: 1,
    }),
  }),
}));

describe('GET /api/constructions', () => {
  it('returns constructions list', async () => {
    const request = new NextRequest('http://localhost/api/constructions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.docs).toHaveLength(1);
    expect(data.docs[0].title).toBe('Test Construction');
  });

  it('handles query parameters', async () => {
    const request = new NextRequest(
      'http://localhost/api/constructions?status=in-progress'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

### Integration Tests

Testing multiple components together:

```typescript
// tests/integration/suggestion-form.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuggestionPage } from '@/app/(frontend)/suggest/page';

describe('Suggestion Submission Flow', () => {
  it('submits suggestion successfully', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn().mockResolvedValue({ success: true });

    render(<SuggestionPage onSubmit={mockSubmit} />);

    // Fill form
    await user.type(screen.getByLabelText('Title'), 'New Road Project');
    await user.selectOptions(screen.getByLabelText('Type'), 'create');
    await user.type(
      screen.getByLabelText('Description'),
      'Description of the project'
    );

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Road Project',
          suggestionType: 'create',
        })
      );
    });
  });

  it('shows validation errors', async () => {
    const user = userEvent.setup();
    render(<SuggestionPage />);

    // Submit without filling required fields
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });
});
```

## Mocking

### Mocking Modules

```typescript
// Mock entire module
vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlag: vi.fn().mockResolvedValue(true),
}));

// Mock specific export
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils');
  return {
    ...actual,
    fetchData: vi.fn().mockResolvedValue({ data: [] }),
  };
});
```

### Mocking API Responses

```typescript
// Using MSW (Mock Service Worker)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  rest.get('/api/constructions', (req, res, ctx) => {
    return res(
      ctx.json({
        docs: [{ id: '1', title: 'Test' }],
        totalDocs: 1,
      })
    );
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Mocking Next.js Features

```typescript
// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams('?query=test'),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
```

## Test Coverage

### Coverage Report

```bash
npm run test:coverage
```

Output:
```
File                 | % Stmts | % Branch | % Funcs | % Lines
---------------------|---------|----------|---------|--------
All files            |   78.5  |   72.3   |   81.2  |   79.1
 src/lib/utils.ts    |  100.0  |  100.0   |  100.0  |  100.0
 src/components/...  |   85.2  |   78.4   |   90.0  |   86.1
 src/hooks/...       |   75.0  |   68.2   |   80.0  |   74.5
```

### Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 70,
        statements: 70,
      },
    },
  },
});
```

## Best Practices

### Test Organization

- Group related tests with `describe`
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- One assertion concept per test

### Testing Guidelines

1. **Test behavior, not implementation**
2. **Test user interactions, not internals**
3. **Prefer integration tests over unit tests for UI**
4. **Mock external dependencies, not internal modules**
5. **Keep tests independent and isolated**

### Common Patterns

```typescript
// Good: Testing behavior
it('shows error message when login fails', async () => {
  // Arrange
  mockLoginApi.mockRejectedValue(new Error('Invalid credentials'));

  // Act
  await user.type(screen.getByLabelText('Email'), 'test@test.com');
  await user.type(screen.getByLabelText('Password'), 'wrong');
  await user.click(screen.getByRole('button', { name: /login/i }));

  // Assert
  expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
});

// Bad: Testing implementation
it('calls setError with message', () => {
  // Don't test internal state changes
});
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Debugging Tests

### Verbose Output

```bash
npm run test -- --reporter=verbose
```

### Debug Single Test

```typescript
it.only('specific test to debug', () => {
  // Only this test runs
});
```

### Console Output

```typescript
it('logs data for debugging', () => {
  const result = calculateSomething();
  console.log('Result:', result);  // Visible in test output
  expect(result).toBe(expected);
});
```

## Related Documentation

- [Development Workflow](./development.md)
- [Build Process](./build.md)
- [Deployment](./deployment.md)
