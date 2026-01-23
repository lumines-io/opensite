# Database Workflow

## Overview

The application uses PostgreSQL as the primary database with Drizzle ORM for schema management and Payload CMS for data operations.

## Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐    ┌─────────────────┐               │
│   │   Payload CMS   │    │   Drizzle ORM   │               │
│   │   (CRUD Ops)    │    │   (Migrations)  │               │
│   └────────┬────────┘    └────────┬────────┘               │
│            │                      │                         │
│            └──────────┬───────────┘                         │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   PostgreSQL    │
              │    Database     │
              └─────────────────┘
```

## Database Schema

### Collections (Tables)

| Collection | Purpose |
|------------|---------|
| `users` | User accounts and authentication |
| `constructions` | Construction project data |
| `construction_changelog` | Version history for constructions |
| `suggestions` | Community-submitted suggestions |
| `districts` | HCMC district data |
| `media` | Uploaded files and images |
| `cron_jobs` | Scheduled job configurations |
| `cron_job_logs` | Cron execution logs |
| `analytics_events` | Custom analytics events |

### Payload CMS Globals

| Global | Purpose |
|--------|---------|
| `feature-flags` | Feature toggle settings |

## Local Development

### PostgreSQL Setup

**Option 1: Local Installation**

```bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb sitemap
```

**Option 2: Docker**

```bash
# Start container
docker run --name sitemap-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sitemap \
  -p 5432:5432 \
  -d postgres:14

# Connection string
DATABASE_URL=postgresql://postgres:password@localhost:5432/sitemap
```

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=[mode]

# Examples:
# Local
DATABASE_URL=postgresql://postgres:password@localhost:5432/sitemap

# Production (with SSL)
DATABASE_URL=postgresql://user:pass@host.com:5432/db?sslmode=require
```

## Migrations

### Creating Migrations

```bash
# Generate migration from schema changes
npm run migrate:create migration-name
```

Creates file in `migrations/`:
```
migrations/
├── 001_initial_schema.ts
├── 002_add_suggestions.ts
└── 003_add_analytics.ts
```

### Running Migrations

```bash
# Apply pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback (reset)
npm run migrate:reset

# Fresh migration (drop all, recreate)
npm run migrate:fresh
```

### Migration File Structure

```typescript
// migrations/001_initial_schema.ts
import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres';

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'contributor',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DROP TABLE IF EXISTS users;
  `);
}
```

## Seeding Data

### Seed Script

```bash
npm run seed
```

### Seed File Structure

```typescript
// src/lib/seed/index.ts
import { getPayloadClient } from '@/lib/payload';

export async function seed() {
  const payload = await getPayloadClient();

  // Seed districts
  await seedDistricts(payload);

  // Seed admin user
  await seedAdminUser(payload);

  // Seed sample constructions
  await seedConstructions(payload);

  // Seed feature flags
  await seedFeatureFlags(payload);
}

async function seedDistricts(payload: Payload) {
  const districts = [
    { name: 'Quận 1', nameEnglish: 'District 1', code: 'quan-1' },
    { name: 'Quận 2', nameEnglish: 'District 2', code: 'quan-2' },
    // ...
  ];

  for (const district of districts) {
    await payload.create({
      collection: 'districts',
      data: district,
    });
  }
}
```

## Payload CMS Operations

### Reading Data

```typescript
import { getPayloadClient } from '@/lib/payload';

// Find all
const { docs } = await payload.find({
  collection: 'constructions',
  limit: 50,
});

// Find with filters
const { docs } = await payload.find({
  collection: 'constructions',
  where: {
    status: { equals: 'in-progress' },
    district: { equals: districtId },
  },
  sort: '-createdAt',
  limit: 10,
  page: 1,
});

// Find one by ID
const construction = await payload.findByID({
  collection: 'constructions',
  id: constructionId,
});

// Find one by slug
const { docs } = await payload.find({
  collection: 'constructions',
  where: {
    slug: { equals: slug },
  },
  limit: 1,
});
```

### Creating Data

```typescript
const construction = await payload.create({
  collection: 'constructions',
  data: {
    title: 'New Road Project',
    slug: 'new-road-project',
    type: 'road',
    status: 'planned',
    description: { root: { children: [...] } },
    geometry: { type: 'Point', coordinates: [106.7, 10.8] },
    district: districtId,
  },
});
```

### Updating Data

```typescript
const updated = await payload.update({
  collection: 'constructions',
  id: constructionId,
  data: {
    status: 'in-progress',
    progress: 25,
  },
});

// Update many
await payload.update({
  collection: 'constructions',
  where: {
    status: { equals: 'completed' },
    progress: { less_than: 100 },
  },
  data: {
    progress: 100,
  },
});
```

### Deleting Data

```typescript
await payload.delete({
  collection: 'constructions',
  id: constructionId,
});

// Delete many
await payload.delete({
  collection: 'analytics-events',
  where: {
    createdAt: { less_than: thirtyDaysAgo },
  },
});
```

## Querying Patterns

### Full-Text Search

```typescript
const { docs } = await payload.find({
  collection: 'constructions',
  where: {
    or: [
      { title: { contains: query } },
      { description: { contains: query } },
    ],
  },
});
```

### Geospatial Queries

```typescript
// Find nearby constructions (raw SQL)
const nearby = await payload.db.drizzle.execute(sql`
  SELECT * FROM constructions
  WHERE ST_DWithin(
    geometry,
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
    ${radiusMeters}
  )
  ORDER BY ST_Distance(geometry, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
  LIMIT ${limit}
`);
```

### Aggregations

```typescript
// Count by status
const counts = await payload.db.drizzle.execute(sql`
  SELECT status, COUNT(*) as count
  FROM constructions
  GROUP BY status
`);
```

### Joins (Relations)

```typescript
const { docs } = await payload.find({
  collection: 'constructions',
  depth: 2,  // Include nested relations
  where: {
    district: { equals: districtId },
  },
});
// Returns construction with district object populated
```

## Database Indexes

### Important Indexes

```sql
-- Constructions
CREATE INDEX idx_constructions_status ON constructions(status);
CREATE INDEX idx_constructions_type ON constructions(type);
CREATE INDEX idx_constructions_district ON constructions(district_id);
CREATE INDEX idx_constructions_slug ON constructions(slug);

-- Spatial index
CREATE INDEX idx_constructions_geometry ON constructions USING GIST (geometry);

-- Full-text search
CREATE INDEX idx_constructions_search ON constructions USING GIN (
  to_tsvector('english', title || ' ' || description)
);

-- Suggestions
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_submitted_by ON suggestions(submitted_by);

-- Analytics
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp);
```

## Backup & Recovery

### Manual Backup

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20240115.sql
```

### Automated Backups

Most managed PostgreSQL services (Vercel Postgres, Supabase, Neon) provide:
- Daily automated backups
- Point-in-time recovery
- Backup retention

## Performance Optimization

### Query Optimization

1. **Use indexes** for frequently queried fields
2. **Limit depth** when fetching relations
3. **Paginate** large result sets
4. **Select only needed fields**

```typescript
// Efficient query
const { docs } = await payload.find({
  collection: 'constructions',
  select: ['title', 'slug', 'status', 'centroid'],
  depth: 0,
  limit: 20,
  page: 1,
});
```

### Connection Pooling

For serverless environments, use connection pooling:

```typescript
// With PgBouncer
DATABASE_URL=postgresql://user:pass@pooler.host.com:5432/db?pgbouncer=true
```

### Caching Strategy

- Cache frequently accessed data in Redis
- Set appropriate TTL (5-15 minutes)
- Invalidate on updates

```typescript
import { redis } from '@/lib/redis';

async function getConstruction(slug: string) {
  const cached = await redis.get(`construction:${slug}`);
  if (cached) return JSON.parse(cached);

  const construction = await payload.find({
    collection: 'constructions',
    where: { slug: { equals: slug } },
  });

  await redis.set(
    `construction:${slug}`,
    JSON.stringify(construction),
    'EX',
    300  // 5 minutes
  );

  return construction;
}
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"
```

### Slow Queries

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Find slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Migration Errors

```bash
# Check current state
npm run migrate:status

# If stuck, manually fix:
# 1. Connect to database
# 2. Check payload_migrations table
# 3. Fix or remove problematic entry
# 4. Re-run migrations
```

## Related Documentation

- [Development Workflow](./development.md)
- [Deployment](./deployment.md)
- [Testing](./testing.md)
