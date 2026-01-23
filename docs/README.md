# HCMC Road Construction Tracker Documentation

Welcome to the comprehensive documentation for the HCMC Road Construction Tracker. This platform provides real-time tracking of construction projects across Ho Chi Minh City with community contributions and automated data collection.

## Quick Navigation

- [Features](#features) - What the platform can do
- [Workflows](#workflows) - Development and operational processes
- [User Flows](#user-flows) - How different users interact with the system

---

## Project Overview

**HCMC Road Construction Tracker** is a web-based platform that:

- **Tracks Construction Projects** - Interactive map showing 50+ construction projects across HCMC
- **Enables Community Contributions** - Verified users can submit updates and corrections
- **Automates Data Collection** - Scrapers gather construction news from Vietnamese sources
- **Provides Route Planning** - A-to-B navigation with construction alerts
- **Supports Multiple Languages** - Vietnamese and English interfaces

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Next.js 15, TailwindCSS |
| Backend | Next.js API Routes, Payload CMS |
| Database | PostgreSQL (Drizzle ORM) |
| Cache | Redis (Upstash) |
| Maps | Mapbox GL |
| Hosting | Vercel |

---

## Features

Complete documentation for each platform feature:

### Core Features

| Feature | Description |
|---------|-------------|
| [Construction Management](./features/construction-management.md) | Track and display construction project data |
| [Community Contributions](./features/community-contributions.md) | User-submitted suggestions and updates |
| [Moderation](./features/moderation.md) | Review and approval workflow |
| [Search & Discovery](./features/search.md) | Find construction projects |
| [Routing](./features/routing.md) | Route planning with construction alerts |

### System Features

| Feature | Description |
|---------|-------------|
| [Authentication](./features/authentication.md) | User registration, login, verification |
| [Automated Scraping](./features/scraper.md) | News source data collection |
| [Internationalization](./features/internationalization.md) | Multi-language support (vi/en) |
| [Feature Flags](./features/feature-flags.md) | Runtime feature control |
| [Analytics](./features/analytics.md) | Usage tracking and monitoring |

---

## Workflows

Documentation for development and operational processes:

### Development

| Workflow | Description |
|----------|-------------|
| [Development](./workflows/development.md) | Local setup and development workflow |
| [Build Process](./workflows/build.md) | Building the application |
| [Testing](./workflows/testing.md) | Testing strategy and patterns |
| [Database](./workflows/database.md) | Database management and migrations |

### Operations

| Workflow | Description |
|----------|-------------|
| [Deployment](./workflows/deployment.md) | Deploying to production |

---

## User Flows

Documentation for how different users interact with the platform:

### By User Type

| User Type | Description |
|-----------|-------------|
| [Anonymous User](./user-flows/anonymous-user.md) | Visitors not logged in |
| [Registration](./user-flows/registration.md) | Creating a new account |
| [Contributor](./user-flows/contributor.md) | Authenticated users submitting suggestions |
| [Moderator](./user-flows/moderator.md) | Users reviewing and approving suggestions |
| [Admin](./user-flows/admin.md) | System administrators |

---

## Quick Start

### For Developers

```bash
# Clone and install
git clone https://github.com/your-org/project-site-map.git
cd project-site-map
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Setup database
npm run migrate
npm run seed

# Start development
npm run dev
```

See [Development Workflow](./workflows/development.md) for detailed instructions.

### For Users

1. Visit the platform at your deployment URL
2. Explore the map to view construction projects
3. Search for specific projects or areas
4. Create an account to contribute updates
5. Submit suggestions for review

---

## API Reference

### Authentication

```
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login
POST /api/auth/logout      # Logout
GET  /api/auth/me          # Get current user
```

### Constructions

```
GET  /api/constructions              # List constructions
GET  /api/constructions/[slug]       # Get construction details
GET  /api/constructions/[slug]/changelog  # Get version history
GET  /api/map/constructions          # Get map data (GeoJSON)
```

### Search

```
GET  /api/search              # Full-text search
GET  /api/search/nearby       # Location-based search
```

### Suggestions

```
POST /api/suggestions         # Create suggestion
GET  /api/suggestions         # List user's suggestions
GET  /api/suggestions/[id]    # Get suggestion details
```

### Routing

```
GET  /api/route/constructions # Get route with alerts
GET  /api/route/alerts        # Get alerts for route
```

See individual feature documentation for complete API details.

---

## Configuration

### Environment Variables

Required environment variables for deployment:

```env
# Database
DATABASE_URL=postgresql://...

# Payload CMS
PAYLOAD_SECRET=your-32-char-secret

# Server URL
NEXT_PUBLIC_SERVER_URL=https://your-domain.com

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password

# Cron
CRON_SECRET=your-secret
```

### Feature Flags

Control features at runtime:

| Flag | Default | Description |
|------|---------|-------------|
| `FEATURE_USER_REGISTRATION` | true | User signup |
| `FEATURE_COMMUNITY_SUGGESTIONS` | true | Suggestion system |
| `FEATURE_ROUTING` | true | Route planning |
| `FEATURE_SCRAPER` | true | Data scraping |
| `FEATURE_ADVANCED_SEARCH` | true | Filter search |
| `FEATURE_I18N` | true | Multi-language |

See [Feature Flags](./features/feature-flags.md) for complete list.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                   │
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│   │  Web App    │   │  Admin UI   │   │  Mobile     │              │
│   │  (Next.js)  │   │  (Payload)  │   │  (Future)   │              │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘              │
└──────────┼─────────────────┼─────────────────┼──────────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP                                 │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      API Routes                              │   │
│   │  /api/auth  /api/constructions  /api/suggestions  /api/...  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     Payload CMS                              │   │
│   │  Collections • Globals • Auth • Media • Versions            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  PostgreSQL   │      │    Redis      │      │    Mapbox     │
│  (Database)   │      │   (Cache)     │      │   (Maps)      │
└───────────────┘      └───────────────┘      └───────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Scrapers   │ ──► │  Suggestions │ ──► │ Moderation   │
│ (Automated)  │     │   Queue      │     │   Review     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
┌──────────────┐                                  │
│  Community   │ ──► │  Suggestions │ ──────────►│
│ (Manual)     │     │   Queue      │             │
└──────────────┘     └──────────────┘             │
                                                  ▼
                                         ┌──────────────┐
                                         │ Construction │
                                         │   Database   │
                                         └──────────────┘
```

---

## Contributing

### Reporting Issues

Please report issues at: [GitHub Issues](https://github.com/your-org/project-site-map/issues)

### Development Guidelines

1. Follow the [Development Workflow](./workflows/development.md)
2. Write tests for new features
3. Update documentation as needed
4. Follow code style guidelines

---

## License

This project is licensed under [Your License] - see LICENSE file for details.

---

## Support

For questions and support:
- Documentation: This documentation
- Issues: GitHub Issues
- Email: support@example.com
