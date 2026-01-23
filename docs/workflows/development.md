# Development Workflow

## Overview

This document describes the development workflow for the HCMC Road Construction Tracker, including setup, local development, testing, and code organization.

## Prerequisites

### Required Software

- **Node.js** - v20 or higher (LTS recommended)
- **npm** - v9 or higher (comes with Node.js)
- **PostgreSQL** - v14 or higher
- **Git** - Latest version

### Optional Tools

- **Docker** - For containerized PostgreSQL
- **Redis** - For local caching (or use Upstash)
- **VSCode** - Recommended editor with extensions

### Recommended VSCode Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- Payload CMS (if available)

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/project-site-map.git
cd project-site-map
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure required variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sitemap

# Payload CMS
PAYLOAD_SECRET=your-secret-key-min-32-chars

# Server URL (for emails and redirects)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx

# Email (development - Ethereal)
ETHEREAL_USER=test@ethereal.email
ETHEREAL_PASS=password

# Cron Secret
CRON_SECRET=your-cron-secret
```

### 4. Database Setup

**Option A: Local PostgreSQL**

```bash
# Create database
createdb sitemap

# Run migrations
npm run migrate
```

**Option B: Docker**

```bash
# Start PostgreSQL container
docker run --name sitemap-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sitemap \
  -p 5432:5432 \
  -d postgres:14

# Run migrations
npm run migrate
```

### 5. Seed Data (Optional)

```bash
npm run seed
```

Seeds initial data:
- Districts
- Sample constructions
- Admin user
- Feature flags

### 6. Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

## NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Generate coverage report |
| `npm run migrate` | Run database migrations |
| `npm run migrate:create` | Create new migration |
| `npm run migrate:fresh` | Fresh migration (drop & recreate) |
| `npm run migrate:reset` | Reset to initial state |
| `npm run migrate:status` | Check migration status |
| `npm run seed` | Seed database |
| `npm run generate:types` | Generate Payload CMS types |

## Project Structure

```
project-site-map/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (frontend)/        # Public pages
│   │   │   ├── page.tsx       # Home page
│   │   │   ├── login/         # Auth pages
│   │   │   ├── register/
│   │   │   ├── details/       # Construction details
│   │   │   ├── suggest/       # Suggestion form
│   │   │   ├── suggestions/   # User suggestions
│   │   │   ├── profile/       # User profile
│   │   │   └── moderator/     # Moderator pages
│   │   ├── (payload)/         # Payload admin
│   │   │   └── admin/         # Admin dashboard
│   │   └── api/               # API routes
│   │       ├── auth/          # Authentication
│   │       ├── constructions/ # Construction CRUD
│   │       ├── suggestions/   # Suggestion handling
│   │       ├── search/        # Search endpoints
│   │       ├── route/         # Routing endpoints
│   │       ├── admin/         # Admin endpoints
│   │       └── cron/          # Cron job endpoints
│   ├── collections/           # Payload CMS collections
│   ├── globals/               # Payload CMS globals
│   ├── components/            # React components
│   │   ├── layout/           # Layout components
│   │   ├── map/              # Map components
│   │   ├── suggestions/      # Suggestion components
│   │   └── ui/               # UI primitives
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Shared utilities
│   │   ├── analytics/        # Analytics functions
│   │   ├── feature-flags/    # Feature flag logic
│   │   ├── scrapers/         # Scraper implementations
│   │   └── utils/            # Utility functions
│   ├── i18n/                  # Internationalization
│   ├── messages/              # Translation files
│   ├── styles/                # Global styles
│   ├── types/                 # TypeScript types
│   └── blocks/                # Payload content blocks
├── migrations/                # Database migrations
├── public/                    # Static assets
├── tests/                     # Test files
├── .env.example              # Environment template
├── next.config.ts            # Next.js config
├── payload.config.ts         # Payload CMS config
├── tailwind.config.ts        # Tailwind config
├── tsconfig.json             # TypeScript config
├── vitest.config.ts          # Vitest config
└── package.json              # Dependencies
```

## Development Guidelines

### Code Style

**ESLint Configuration:**
- Extends Next.js recommended rules
- TypeScript strict mode
- Import sorting

**Formatting:**
- 2-space indentation
- Single quotes
- Trailing commas
- Max line length: 100

### TypeScript

- Strict mode enabled
- Explicit return types encouraged
- Interface over type where possible
- No `any` without justification

### Component Patterns

**Server Components (default):**
```typescript
// src/app/(frontend)/details/[slug]/page.tsx
export default async function ConstructionPage({ params }) {
  const construction = await getConstruction(params.slug);
  return <ConstructionDetail construction={construction} />;
}
```

**Client Components:**
```typescript
// src/components/map/ConstructionMap.tsx
'use client';

import { useState } from 'react';

export function ConstructionMap() {
  const [viewport, setViewport] = useState(initialViewport);
  // ...
}
```

### API Route Patterns

```typescript
// src/app/api/constructions/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const constructions = await getConstructions();
    return NextResponse.json(constructions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch constructions' },
      { status: 500 }
    );
  }
}
```

### Database Operations

Use Payload CMS local API:

```typescript
import { getPayloadClient } from '@/lib/payload';

export async function getConstructions() {
  const payload = await getPayloadClient();

  const { docs } = await payload.find({
    collection: 'constructions',
    where: { status: { equals: 'in-progress' } },
    limit: 50
  });

  return docs;
}
```

## Hot Reloading

Development server supports hot reloading for:
- React components
- API routes
- Styles (Tailwind)
- Payload collections (restart may be needed)

## Debugging

### VS Code Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Console Logging

```typescript
// Server-side logging (appears in terminal)
console.log('Server log:', data);

// Client-side logging (appears in browser)
console.log('Client log:', data);

// Using Pino logger
import { logger } from '@/lib/logger';
logger.info({ data }, 'Descriptive message');
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create route file in `src/app/api/`
2. Export HTTP method handlers
3. Add types if needed
4. Update API documentation

### Adding a New Page

1. Create page file in `src/app/(frontend)/`
2. Create components in `src/components/`
3. Add translations to `src/messages/`
4. Update navigation if needed

### Adding a New Collection

1. Create collection in `src/collections/`
2. Add to `payload.config.ts`
3. Generate types: `npm run generate:types`
4. Create migration: `npm run migrate:create`
5. Run migration: `npm run migrate`

### Modifying Database Schema

1. Update collection definition
2. Create migration: `npm run migrate:create`
3. Review generated migration
4. Run migration: `npm run migrate`

## Environment-Specific Configuration

### Development
- Detailed error messages
- Hot reloading
- Ethereal email (no real emails sent)
- Debug logging

### Production
- Error pages instead of stack traces
- Optimized bundles
- Real email service
- Info-level logging

## Related Documentation

- [Build Process](./build.md)
- [Deployment](./deployment.md)
- [Testing](./testing.md)
