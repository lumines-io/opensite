# Build Process

## Overview

The build process compiles the Next.js application with Payload CMS integration, optimizes assets, and prepares the application for production deployment.

## Build Command

```bash
npm run build
```

This runs `next build` which:
1. Compiles TypeScript
2. Builds Next.js pages and routes
3. Generates Payload CMS types
4. Optimizes static assets
5. Creates production bundles

## Build Pipeline

```
┌─────────────────┐
│ Source Code     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TypeScript      │  ← Compiles .ts/.tsx files
│ Compilation     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Next.js Build   │  ← Pages, API routes, middleware
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Payload CMS     │  ← Admin UI, type generation
│ Integration     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Asset           │  ← Images, fonts, CSS
│ Optimization    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Bundle          │  ← Code splitting, tree shaking
│ Optimization    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Output          │  ← .next/ directory
│                 │
└─────────────────┘
```

## Build Configuration

### next.config.ts

```typescript
import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.example.com',
      },
    ],
  },

  // Experimental features
  experimental: {
    // React compiler disabled
    reactCompiler: false,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Disable build worker for Jest compatibility
    config.experiments = {
      ...config.experiments,
      buildWorker: false,
    };

    return config;
  },
};

export default withPayload(nextConfig);
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      { "name": "next" }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          // ... color scale
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

## Build Output

### Directory Structure

```
.next/
├── cache/                # Build cache
├── server/               # Server bundles
│   ├── app/             # App router pages
│   ├── pages/           # Pages router (if any)
│   └── chunks/          # Server chunks
├── static/               # Static assets
│   ├── chunks/          # Client chunks
│   ├── css/             # Compiled CSS
│   └── media/           # Optimized images
├── types/                # Generated types
├── build-manifest.json   # Build manifest
├── prerender-manifest.json
└── routes-manifest.json
```

### Bundle Analysis

To analyze bundle size:

```bash
# Install bundle analyzer
npm install @next/bundle-analyzer

# Add to next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

## Build Optimization

### Code Splitting

Next.js automatically splits code by:
- Route (each page is a separate bundle)
- Component (dynamic imports)
- Shared dependencies (vendor chunks)

```typescript
// Dynamic import example
import dynamic from 'next/dynamic';

const MapComponent = dynamic(
  () => import('@/components/map/ConstructionMap'),
  { ssr: false }
);
```

### Tree Shaking

Unused exports are automatically removed. Ensure:
- Use ES6 imports/exports
- Avoid side effects in modules
- Mark packages as side-effect-free

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/construction.jpg"
  alt="Construction site"
  width={800}
  height={600}
  priority={false}  // Lazy load by default
  placeholder="blur"
  blurDataURL="data:..."
/>
```

### Font Optimization

```typescript
// src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export default function Layout({ children }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

## Static Generation

### Static Pages

Pages without dynamic data are statically generated:

```typescript
// Statically generated at build time
export default function AboutPage() {
  return <div>About Us</div>;
}
```

### Dynamic Pages

Pages with dynamic routes use ISR or SSR:

```typescript
// src/app/(frontend)/details/[slug]/page.tsx

// Generate static params at build time
export async function generateStaticParams() {
  const constructions = await getAllConstructions();
  return constructions.map((c) => ({
    slug: c.slug,
  }));
}

// Revalidate every 60 seconds
export const revalidate = 60;
```

## Build Environment Variables

Variables available at build time:

```env
# Public (exposed to browser)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
NEXT_PUBLIC_SERVER_URL=https://example.com

# Private (server-only)
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=...
```

## Build Caching

### Incremental Builds

Next.js caches build artifacts:
- Page renders
- Data fetches
- Webpack compilations

### Cache Location

- Development: `.next/cache`
- Production: Determined by deployment platform

### Clearing Cache

```bash
# Remove build cache
rm -rf .next

# Fresh build
npm run build
```

## Build Errors

### Common Issues

**Type Errors:**
```
Type error: Property 'x' does not exist on type 'Y'
```
Fix: Resolve TypeScript errors before building.

**Module Not Found:**
```
Module not found: Can't resolve '@/lib/...'
```
Fix: Check path aliases in tsconfig.json.

**Build Memory Issues:**
```
FATAL ERROR: Heap out of memory
```
Fix: Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

### Debugging Build

```bash
# Verbose build output
DEBUG=* npm run build

# Check build performance
npm run build 2>&1 | tee build.log
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/build.yml
name: Build

on: [push, pull_request]

jobs:
  build:
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

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          PAYLOAD_SECRET: ${{ secrets.PAYLOAD_SECRET }}
```

### Vercel Build

Vercel automatically:
- Detects Next.js
- Installs dependencies
- Runs build
- Deploys output

Build settings are in `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

## Build Performance

### Optimization Tips

1. **Use SWC** (default in Next.js 12+)
2. **Enable incremental builds**
3. **Minimize dependencies**
4. **Use dynamic imports**
5. **Optimize images at build time**

### Build Time Targets

- Development build: < 30 seconds
- Production build: < 3 minutes
- Incremental rebuild: < 10 seconds

## Post-Build Verification

### Verify Build Success

```bash
# Check build output
npm run build

# Start production server
npm run start

# Verify pages load
curl http://localhost:3000/
```

### Build Artifacts

Key files to verify:
- `.next/BUILD_ID` - Build identifier
- `.next/build-manifest.json` - Page bundles
- `.next/prerender-manifest.json` - Pre-rendered pages

## Related Documentation

- [Development Workflow](./development.md)
- [Deployment](./deployment.md)
- [Testing](./testing.md)
