# Deployment Process

## Overview

The HCMC Road Construction Tracker is designed for deployment on Vercel with PostgreSQL database, Redis caching, and scheduled cron jobs.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐    ┌─────────────────┐               │
│   │  Next.js App    │    │   Cron Jobs     │               │
│   │  (Serverless)   │    │   (Scheduled)   │               │
│   └────────┬────────┘    └────────┬────────┘               │
│            │                      │                         │
└────────────┼──────────────────────┼─────────────────────────┘
             │                      │
             ▼                      ▼
     ┌───────────────┐      ┌───────────────┐
     │  PostgreSQL   │      │    Redis      │
     │  (Database)   │      │  (Upstash)    │
     └───────────────┘      └───────────────┘
             │
             ▼
     ┌───────────────┐
     │   Mapbox      │
     │   (Maps)      │
     └───────────────┘
```

## Prerequisites

### Accounts Required

1. **Vercel** - Hosting platform
2. **PostgreSQL Provider** - Vercel Postgres, Supabase, or Neon
3. **Upstash** - Redis for caching and rate limiting
4. **Mapbox** - Map services

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Payload CMS
PAYLOAD_SECRET=min-32-character-secret-key

# Server URL
NEXT_PUBLIC_SERVER_URL=https://your-domain.vercel.app

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Email (Production SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

# Cron Jobs
CRON_SECRET=your-secure-cron-secret

# Environment
NODE_ENV=production
```

## Vercel Deployment

### Initial Setup

1. **Connect Repository**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link
```

2. **Configure Project**

In Vercel dashboard:
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

3. **Add Environment Variables**

In Vercel dashboard → Settings → Environment Variables:
- Add all required variables
- Set for Production, Preview, and Development as needed

### Deployment Methods

**Automatic (Git Push):**

```bash
git push origin main  # Triggers production deployment
git push origin feature-branch  # Triggers preview deployment
```

**Manual (CLI):**

```bash
# Production deployment
vercel --prod

# Preview deployment
vercel
```

### vercel.json Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/scraper",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/translate",
      "schedule": "0 3 * * *"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

## Database Setup

### Option 1: Vercel Postgres

```bash
# Create database in Vercel dashboard
# Connection string automatically added to environment
```

### Option 2: Supabase

1. Create project in Supabase
2. Get connection string from Settings → Database
3. Add to Vercel environment variables

### Option 3: Neon

1. Create project in Neon console
2. Get connection string
3. Add to Vercel environment variables

### Running Migrations

**Pre-deployment (recommended):**

```bash
# Run migrations locally against production DB
DATABASE_URL=production_url npm run migrate
```

**Post-deployment:**

```bash
# Via Vercel CLI
vercel env pull .env.production.local
npm run migrate
```

## Redis Setup (Upstash)

1. Create database in Upstash Console
2. Select "REST API" for serverless compatibility
3. Copy REST URL and Token
4. Add to Vercel environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## Cron Jobs

### Configuration

Cron jobs defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scraper",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/translate",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Security

Cron endpoints validate `CRON_SECRET`:

```typescript
// src/app/api/cron/scraper/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run scraper...
}
```

### Vercel Cron Headers

Vercel automatically includes headers:
- `Authorization: Bearer CRON_SECRET`

## Domain Configuration

### Custom Domain

1. Go to Vercel dashboard → Settings → Domains
2. Add custom domain
3. Configure DNS records:
   - A record: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`
4. Wait for SSL certificate (automatic)

### Environment URLs

| Environment | URL |
|-------------|-----|
| Production | `https://your-domain.com` |
| Preview | `https://branch-name-your-project.vercel.app` |
| Development | `http://localhost:3000` |

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] Feature flags set appropriately
- [ ] Email service configured
- [ ] Mapbox token has correct restrictions
- [ ] Build passes locally

### Post-Deployment

- [ ] Home page loads
- [ ] Authentication works
- [ ] Map displays correctly
- [ ] Search returns results
- [ ] Cron jobs scheduled
- [ ] Admin panel accessible
- [ ] Email sending works

## Monitoring

### Vercel Analytics

Automatically tracks:
- Page views
- Web Vitals
- Real-time visitors

### Function Logs

View in Vercel dashboard:
- Real-time logs
- Function invocations
- Error tracking

### Cron Job Monitoring

```
Vercel Dashboard → Cron Jobs → View Logs
```

## Rollback

### Via Dashboard

1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Via CLI

```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote [deployment-url]
```

## Environment-Specific Behavior

### Production

- Real email sending
- Full caching enabled
- Rate limiting active
- Info-level logging
- Error tracking enabled

### Preview (PRs)

- Ethereal email (captured, not sent)
- Cache disabled
- Relaxed rate limits
- Debug logging
- Full error messages

## Scaling

### Serverless Scaling

Vercel automatically scales:
- Functions: 0 to ∞ instances
- Bandwidth: Unlimited (Pro plan)
- Build: Parallel builds

### Database Scaling

Monitor and scale database as needed:
- Connection pooling (PgBouncer)
- Read replicas (if available)
- Vertical scaling

### Redis Scaling

Upstash auto-scales:
- Pay-per-request
- No connection limits
- Global replication (optional)

## Troubleshooting

### Build Failures

```bash
# Check build logs in Vercel dashboard
# Or run locally:
npm run build
```

### Function Errors

```bash
# Check function logs
vercel logs --filter function
```

### Database Connection Issues

- Verify DATABASE_URL format
- Check SSL mode (`?sslmode=require`)
- Verify IP allowlisting (if applicable)

### Cron Not Running

- Verify cron schedule in vercel.json
- Check CRON_SECRET matches
- View cron logs in dashboard

## Security Considerations

### Environment Variables

- Never commit secrets
- Use Vercel's encrypted storage
- Rotate secrets periodically

### API Protection

- Rate limiting enabled
- Authentication required for sensitive endpoints
- CORS configured

### Admin Access

- Restrict Payload admin to authorized users
- Use strong admin passwords
- Enable 2FA where possible

## Related Documentation

- [Development Workflow](./development.md)
- [Build Process](./build.md)
- [Testing](./testing.md)
