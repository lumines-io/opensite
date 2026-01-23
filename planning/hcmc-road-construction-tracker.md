# HCMC Road Construction Tracker - Research & Architecture Plan

## Project Overview

Build a web application showing all current road construction projects and their progress in Ho Chi Minh City and surrounding areas.

### Core Requirements

| Requirement | Description |
|-------------|-------------|
| **Map Display** | Interactive map showing construction locations with status/progress |
| **Community Management** | Users can suggest changes and modifications to projects |
| **Automated Updates** | Scrape news sites for construction information |
| **Approval Workflow** | All changes (community & scraped) require approval before going live |
| **Versioning** | Full version history for each construction project |

### Tech Stack

- **Frontend**: NextJS 14+ (App Router)
- **CMS**: PayloadCMS 3.x
- **Database**: PostgreSQL + PostGIS
- **Map**: Mapbox GL JS
- **Hosting**: Vercel + Railway/Payload Cloud



---

## Approach Analysis

### Approach 1: PayloadCMS Native (Versions + Custom Workflow)

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NextJS App                               │
├─────────────────────────────────────────────────────────────────┤
│  Public Site          │  Suggestion Portal   │  Admin Panel     │
│  (Map + Data)         │  (Submit Changes)    │  (PayloadCMS)    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           ┌───────────────┐               ┌───────────────┐
           │  Suggestions  │               │ Constructions │
           │  Collection   │──approval────▶│  (Versioned)  │
           └───────────────┘               └───────────────┘
                    ▲                               ▲
                    │                               │
           ┌───────────────┐                        │
           │  Scraper      │────────────────────────┘
           │  (Cron Job)   │
           └───────────────┘
```

#### How It Works

**PayloadCMS Built-in Features Used:**
- **Versions**: Native version history with drafts
- **Access Control**: Role-based permissions
- **Hooks**: `beforeChange`, `afterChange` for workflow logic

**Data Flow:**
1. **Community Suggestion**: User submits → Creates `Suggestion` document → Moderator reviews → If approved, applies changes to `Construction` (creates new version)
2. **Scraper**: Cron job runs → Creates `Suggestion` with `source: 'scraper'` → Same approval flow
3. **Direct Edit**: Admin edits directly → Auto-versioned by PayloadCMS

#### Advantages

| Aspect | Benefit |
|--------|---------|
| **Native Versioning** | PayloadCMS handles version storage, UI, restore |
| **Single System** | Everything in one codebase, one admin |
| **Type Safety** | Full TypeScript across the stack |
| **Simpler Deployment** | One app to deploy and maintain |

#### Disadvantages

| Aspect | Drawback |
|--------|----------|
| **Workflow Limitations** | Basic approval flow, no complex state machines |
| **Diff UI** | Need to build custom diff visualization |
| **Scraper Coupling** | Scraper tightly coupled to PayloadCMS |
| **Scale Concerns** | Heavy moderation load in single admin |

---

### Approach 2: Decoupled Services (PayloadCMS + Dedicated Workflow Engine)

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NextJS App                                 │
├──────────────────┬──────────────────┬───────────────────────────────┤
│   Public Site    │  Contributor     │       Admin Dashboard          │
│   (Read-only)    │  Portal          │    (Review + Manage)           │
└──────────────────┴──────────────────┴───────────────────────────────┘
         │                  │                       │
         ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Layer (NextJS Routes)                     │
└─────────────────────────────────────────────────────────────────────┘
         │                  │                       │
         ▼                  ▼                       ▼
┌───────────────┐  ┌───────────────┐  ┌────────────────────────────────┐
│  PayloadCMS   │  │  Change       │  │     Scraper Service            │
│  (Published   │  │  Requests     │  │   (Separate Node Process)      │
│   Content)    │  │  Queue (DB)   │  └────────────────────────────────┘
└───────────────┘  └───────────────┘              │
         │                  │                      │
         └──────────────────┴──────────────────────┘
                            │
                            ▼
                   ┌───────────────┐
                   │  PostgreSQL   │
                   │  + PostGIS    │
                   │  + Audit Log  │
                   └───────────────┘
```

#### Key Difference: Custom Version Control

Instead of relying on PayloadCMS versions, build a custom audit system with JSON Patch-based diffing.

#### Advantages

| Aspect | Benefit |
|--------|---------|
| **Flexible Workflow** | Custom state machine, any complexity |
| **Better Diff/History** | JSON Patch for precise change tracking |
| **Scraper Independence** | Can run separately, scale independently |
| **Audit Compliance** | Full audit log with immutable history |

#### Disadvantages

| Aspect | Drawback |
|--------|----------|
| **More Code** | Custom version system, workflow engine |
| **Multiple Systems** | Scraper service + CMS + custom logic |
| **Deployment Complexity** | Multiple processes to manage |
| **Longer Development** | More to build before MVP |

---

### Approach 3: Event-Sourced Architecture (Full Audit Trail)

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NextJS App                                 │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Event Store (PostgreSQL)                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Events: ConstructionCreated, ProgressUpdated, StatusChanged │    │
│  │         SuggestionSubmitted, SuggestionApproved, ...        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────────────────┐
│  Read Model   │    │  PayloadCMS   │    │  Notification Service     │
│  (Map Data)   │    │  (Admin UI)   │    │  (Email/Push)             │
└───────────────┘    └───────────────┘    └───────────────────────────┘
         ▲
         │
┌───────────────┐
│  Projections  │ ── Rebuilds read models from events
└───────────────┘
```

#### Advantages

| Aspect | Benefit |
|--------|---------|
| **Complete History** | Every change is an immutable event |
| **Time Travel** | Reconstruct state at any point |
| **Audit Perfect** | Regulatory-grade audit trail |
| **Flexible Projections** | Build any view from events |
| **Debugging** | Replay events to understand issues |

#### Disadvantages

| Aspect | Drawback |
|--------|----------|
| **Complexity** | Event sourcing has learning curve |
| **Storage Growth** | Events accumulate forever |
| **Query Complexity** | Need projections for efficient reads |
| **Overkill?** | May be more than needed for this use case |

---

## Comparison Matrix

| Criteria | Approach 1 (Native) | Approach 2 (Decoupled) | Approach 3 (Event-Sourced) |
|----------|---------------------|------------------------|----------------------------|
| **Development Time** | Fast | Medium | Slow |
| **Versioning Quality** | Good (built-in) | Better (custom) | Best (immutable) |
| **Workflow Flexibility** | Basic | High | High |
| **Diff/History UI** | Limited | Custom | Excellent |
| **Scraper Integration** | Coupled | Independent | Independent |
| **Scalability** | Medium | High | Very High |
| **Complexity** | Low | Medium | High |
| **Future-Proofing** | Good | Better | Best |

---

## Recommendation: Approach 2 (Decoupled Services)

### Why This Approach?

Given the requirements for **community suggestions**, **scraper automation**, **approval workflow**, and **versioning**, Approach 2 offers the best balance:

1. **PayloadCMS for Content**: Use its excellent admin UI for reviewing and managing content
2. **Custom Workflow**: Build the approval state machine needed without fighting PayloadCMS limitations
3. **Proper Versioning**: JSON Patch-based diffing with full audit trail
4. **Independent Scraper**: Can scale, fail, restart without affecting main app
5. **Not Over-Engineered**: Event sourcing (Approach 3) is powerful but overkill here

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NextJS 14+ App (App Router)                       │
├──────────────────┬──────────────────┬───────────────────────────────┤
│   /map           │  /contribute     │   /admin (PayloadCMS)         │
│   Public map     │  Submit form     │   Review queue                │
│   View projects  │  Track status    │   Manage content              │
└──────────────────┴──────────────────┴───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │ /api/map   │  │ /api/      │  │ PayloadCMS │
       │ Public     │  │ suggestions│  │ API        │
       │ endpoints  │  │ Workflow   │  │            │
       └────────────┘  └────────────┘  └────────────┘
              │               │               │
              └───────────────┴───────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   PostgreSQL      │
                    │   + PostGIS       │
                    │                   │
                    │ - constructions   │
                    │ - versions        │
                    │ - suggestions     │
                    │ - users           │
                    │ - scraper_runs    │
                    └───────────────────┘
                              ▲
                              │
              ┌───────────────┴───────────────┐
              │                               │
     ┌────────────────┐            ┌────────────────┐
     │ Scraper Worker │            │ Notification   │
     │ (Node/Bun)     │            │ Worker         │
     │ Cron-triggered │            │                │
     └────────────────┘            └────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Core construction data (current state)
CREATE TABLE constructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'planned',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Geospatial
  geometry GEOMETRY(Geometry, 4326),  -- Polygon or LineString
  centroid GEOMETRY(Point, 4326),

  -- Timeline
  announced_date DATE,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,

  -- Details
  contractor VARCHAR(255),
  budget BIGINT,
  funding_source VARCHAR(255),

  -- Relations
  district_id UUID REFERENCES districts(id),

  -- Versioning
  current_version INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Version history (immutable audit log)
CREATE TABLE construction_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id UUID NOT NULL REFERENCES constructions(id),
  version INTEGER NOT NULL,

  -- Snapshot & diff
  data JSONB NOT NULL,           -- Full state at this version
  diff JSONB,                    -- JSON Patch from previous version

  -- Change tracking
  changed_by UUID REFERENCES users(id),
  change_source VARCHAR(50) NOT NULL,  -- 'admin', 'suggestion', 'scraper'
  suggestion_id UUID REFERENCES suggestions(id),
  change_summary TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(construction_id, version)
);

-- Suggestions queue (community & scraper submissions)
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What's being suggested
  construction_id UUID REFERENCES constructions(id),  -- NULL if new project
  suggestion_type VARCHAR(50) NOT NULL,  -- 'create', 'update', 'complete', 'correction'
  proposed_data JSONB NOT NULL,

  -- User-provided context
  title VARCHAR(500) NOT NULL,
  justification TEXT,
  evidence_urls TEXT[],

  -- Source tracking
  source_type VARCHAR(50) NOT NULL,  -- 'community', 'scraper', 'api'
  source_url VARCHAR(1000),
  source_confidence DECIMAL(3,2),  -- 0.00 to 1.00 for scraped data

  -- Workflow
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Review
  assigned_to UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- If merged
  merged_at TIMESTAMPTZ,
  merged_version INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review history for suggestions
CREATE TABLE suggestion_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id),

  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,

  reviewer_id UUID REFERENCES users(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Districts reference table
CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  code VARCHAR(50),
  geometry GEOMETRY(MultiPolygon, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (managed by PayloadCMS but schema shown for reference)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'contributor',  -- 'contributor', 'moderator', 'admin'
  avatar_url VARCHAR(500),
  reputation INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraper management
CREATE TABLE scraper_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(1000) NOT NULL,
  scraper_type VARCHAR(50) NOT NULL,  -- 'vnexpress', 'tuoitre', 'gov', etc.
  schedule VARCHAR(50),  -- Cron expression
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES scraper_sources(id),

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'running',

  articles_found INTEGER DEFAULT 0,
  suggestions_created INTEGER DEFAULT 0,
  errors JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media/attachments
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  file_size INTEGER,
  url VARCHAR(1000) NOT NULL,
  alt_text VARCHAR(500),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Construction media junction
CREATE TABLE construction_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id UUID NOT NULL REFERENCES constructions(id),
  media_id UUID NOT NULL REFERENCES media(id),
  caption TEXT,
  taken_at DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources/references for constructions
CREATE TABLE construction_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id UUID NOT NULL REFERENCES constructions(id),
  url VARCHAR(1000) NOT NULL,
  title VARCHAR(500),
  published_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- Geospatial indexes
CREATE INDEX idx_constructions_geometry ON constructions USING GIST (geometry);
CREATE INDEX idx_constructions_centroid ON constructions USING GIST (centroid);
CREATE INDEX idx_districts_geometry ON districts USING GIST (geometry);

-- Query optimization indexes
CREATE INDEX idx_constructions_status ON constructions(status);
CREATE INDEX idx_constructions_district ON constructions(district_id);
CREATE INDEX idx_constructions_slug ON constructions(slug);

CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_source ON suggestions(source_type);
CREATE INDEX idx_suggestions_construction ON suggestions(construction_id);
CREATE INDEX idx_suggestions_submitted_by ON suggestions(submitted_by);

CREATE INDEX idx_versions_construction ON construction_versions(construction_id, version DESC);

CREATE INDEX idx_scraper_runs_source ON scraper_runs(source_id);
CREATE INDEX idx_scraper_runs_status ON scraper_runs(status);
```

---

## PayloadCMS Collections

### Constructions Collection

```typescript
// collections/Constructions.ts
import { CollectionConfig } from 'payload/types';

export const Constructions: CollectionConfig = {
  slug: 'constructions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'progress', 'district', 'updatedAt'],
    group: 'Content',
  },
  access: {
    read: () => true,
    create: ({ req }) => ['moderator', 'admin'].includes(req.user?.role),
    update: ({ req }) => ['moderator', 'admin'].includes(req.user?.role),
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: [
        { label: 'Planned', value: 'planned' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Paused', value: 'paused' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'progress',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Completion percentage (0-100)',
      },
    },
    {
      name: 'geometry',
      type: 'json',
      admin: {
        description: 'GeoJSON geometry (Polygon or LineString)',
      },
    },
    {
      name: 'centroid',
      type: 'point',
      admin: {
        description: 'Center point for map display',
      },
    },
    {
      name: 'timeline',
      type: 'group',
      fields: [
        { name: 'announcedDate', type: 'date', label: 'Announced Date' },
        { name: 'startDate', type: 'date', label: 'Start Date' },
        { name: 'expectedEndDate', type: 'date', label: 'Expected End Date' },
        { name: 'actualEndDate', type: 'date', label: 'Actual End Date' },
      ],
    },
    {
      name: 'details',
      type: 'group',
      fields: [
        { name: 'contractor', type: 'text', label: 'Contractor' },
        { name: 'budget', type: 'number', label: 'Budget (VND)' },
        { name: 'fundingSource', type: 'text', label: 'Funding Source' },
      ],
    },
    {
      name: 'district',
      type: 'relationship',
      relationTo: 'districts',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'media',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'caption', type: 'text' },
        { name: 'takenAt', type: 'date' },
      ],
    },
    {
      name: 'sources',
      type: 'array',
      fields: [
        { name: 'url', type: 'text', required: true },
        { name: 'title', type: 'text' },
        { name: 'publishedAt', type: 'date' },
      ],
    },
    {
      name: 'currentVersion',
      type: 'number',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation }) => {
        if (operation === 'update' && originalDoc) {
          // Increment version on update
          data.currentVersion = (originalDoc.currentVersion || 0) + 1;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && previousDoc) {
          // Create version record
          await createVersionRecord(doc, previousDoc, req.user);
        }
      },
    ],
  },
};
```

### Suggestions Collection

```typescript
// collections/Suggestions.ts
import { CollectionConfig } from 'payload/types';

export const Suggestions: CollectionConfig = {
  slug: 'suggestions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'suggestionType', 'status', 'sourceType', 'createdAt'],
    group: 'Workflow',
  },
  access: {
    read: ({ req }) => {
      if (['moderator', 'admin'].includes(req.user?.role)) return true;
      return { submittedBy: { equals: req.user?.id } };
    },
    create: () => true,  // Anyone can submit
    update: ({ req }) => ['moderator', 'admin'].includes(req.user?.role),
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'suggestionType',
      type: 'select',
      required: true,
      options: [
        { label: 'New Project', value: 'create' },
        { label: 'Update Existing', value: 'update' },
        { label: 'Mark Completed', value: 'complete' },
        { label: 'Report Correction', value: 'correction' },
      ],
    },
    {
      name: 'construction',
      type: 'relationship',
      relationTo: 'constructions',
      admin: {
        condition: (data) => data.suggestionType !== 'create',
      },
    },
    {
      name: 'proposedData',
      type: 'json',
      required: true,
      admin: {
        description: 'Proposed changes in JSON format',
      },
    },
    {
      name: 'justification',
      type: 'textarea',
      admin: {
        description: 'Why are you suggesting this change?',
      },
    },
    {
      name: 'evidenceUrls',
      type: 'array',
      fields: [
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Changes Requested', value: 'changes_requested' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Merged', value: 'merged' },
        { label: 'Superseded', value: 'superseded' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      defaultValue: 'community',
      options: [
        { label: 'Community', value: 'community' },
        { label: 'News Scraper', value: 'scraper' },
        { label: 'Official API', value: 'api' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        condition: (data) => data.sourceType !== 'community',
      },
    },
    {
      name: 'sourceConfidence',
      type: 'number',
      min: 0,
      max: 1,
      admin: {
        condition: (data) => data.sourceType === 'scraper',
        description: 'Confidence score (0-1) for scraped data',
      },
    },
    {
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'reviewNotes',
      type: 'textarea',
    },
    {
      name: 'mergedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'mergedVersion',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        // Set submittedBy on create
        if (!originalDoc && req.user) {
          data.submittedBy = req.user.id;
        }
        // Set reviewedBy and reviewedAt on status change
        if (originalDoc && data.status !== originalDoc.status) {
          if (['approved', 'rejected'].includes(data.status)) {
            data.reviewedBy = req.user.id;
            data.reviewedAt = new Date();
          }
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        // If approved, trigger merge
        if (doc.status === 'approved' && previousDoc?.status !== 'approved') {
          await mergeSuggestion(doc, req);
        }
        // Record status change in review history
        if (previousDoc && doc.status !== previousDoc.status) {
          await recordStatusChange(doc.id, previousDoc.status, doc.status, req.user);
        }
      },
    ],
  },
};
```

---

## Workflow State Machine

```typescript
// lib/workflow/suggestion-states.ts

export const SUGGESTION_STATES = {
  // Initial states
  pending: {
    label: 'Pending Review',
    color: 'yellow',
    transitions: ['under_review', 'rejected'],
    allowedRoles: ['moderator', 'admin'],
  },

  // Review states
  under_review: {
    label: 'Under Review',
    color: 'blue',
    transitions: ['approved', 'changes_requested', 'rejected'],
    allowedRoles: ['moderator', 'admin'],
  },
  changes_requested: {
    label: 'Changes Requested',
    color: 'orange',
    transitions: ['pending', 'cancelled'],
    allowedRoles: ['submitter'],
  },

  // Terminal states
  approved: {
    label: 'Approved',
    color: 'green',
    transitions: ['merged'],
    allowedRoles: ['system'],  // Auto-transition after approval
  },
  merged: {
    label: 'Merged',
    color: 'green',
    transitions: [],
    final: true,
  },
  rejected: {
    label: 'Rejected',
    color: 'red',
    transitions: ['pending'],  // Can resubmit with changes
    allowedRoles: ['submitter'],
  },
  cancelled: {
    label: 'Cancelled',
    color: 'gray',
    transitions: [],
    final: true,
  },
  superseded: {
    label: 'Superseded',
    color: 'gray',
    transitions: [],
    final: true,
  },
} as const;

export type SuggestionStatus = keyof typeof SUGGESTION_STATES;

export function canTransition(
  fromStatus: SuggestionStatus,
  toStatus: SuggestionStatus,
  userRole: string
): boolean {
  const state = SUGGESTION_STATES[fromStatus];
  if (!state.transitions.includes(toStatus)) return false;
  if (state.allowedRoles.includes('system')) return true;
  return state.allowedRoles.includes(userRole);
}

export async function transitionSuggestion(
  suggestionId: string,
  toStatus: SuggestionStatus,
  userId: string,
  notes?: string
): Promise<void> {
  const suggestion = await getSuggestion(suggestionId);
  const user = await getUser(userId);

  if (!canTransition(suggestion.status, toStatus, user.role)) {
    throw new Error(`Cannot transition from ${suggestion.status} to ${toStatus}`);
  }

  await db.transaction(async (tx) => {
    // Record the transition
    await tx.insert(suggestionReviews).values({
      suggestionId,
      fromStatus: suggestion.status,
      toStatus,
      reviewerId: userId,
      notes,
    });

    // Update suggestion
    await tx.update(suggestions)
      .set({
        status: toStatus,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(suggestions.id, suggestionId));

    // If approved, trigger merge
    if (toStatus === 'approved') {
      await mergeSuggestion(tx, suggestion, userId);
    }
  });

  // Send notification
  await notifyStatusChange(suggestion, toStatus);
}
```

---

## Merge Logic

```typescript
// lib/workflow/merge.ts
import { applyPatch, createPatch } from 'rfc6902';

export async function mergeSuggestion(
  tx: Transaction,
  suggestion: Suggestion,
  userId: string
): Promise<void> {
  const isNewConstruction = suggestion.suggestionType === 'create';

  if (isNewConstruction) {
    // Create new construction
    const [newConstruction] = await tx.insert(constructions)
      .values({
        ...suggestion.proposedData,
        currentVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create initial version
    await tx.insert(constructionVersions).values({
      constructionId: newConstruction.id,
      version: 1,
      data: newConstruction,
      diff: null,  // No diff for first version
      changedBy: userId,
      changeSource: suggestion.sourceType,
      suggestionId: suggestion.id,
      changeSummary: `Created from suggestion: ${suggestion.title}`,
    });

    // Update suggestion
    await tx.update(suggestions)
      .set({
        status: 'merged',
        mergedAt: new Date(),
        mergedVersion: 1,
      })
      .where(eq(suggestions.id, suggestion.id));

  } else {
    // Update existing construction
    const construction = await tx.query.constructions.findFirst({
      where: eq(constructions.id, suggestion.constructionId),
    });

    if (!construction) {
      throw new Error('Construction not found');
    }

    const previousData = constructionToData(construction);
    const newData = {
      ...previousData,
      ...suggestion.proposedData,
    };
    const diff = createPatch(previousData, newData);
    const newVersion = construction.currentVersion + 1;

    // Update construction
    await tx.update(constructions)
      .set({
        ...newData,
        currentVersion: newVersion,
        updatedAt: new Date(),
      })
      .where(eq(constructions.id, construction.id));

    // Create version record
    await tx.insert(constructionVersions).values({
      constructionId: construction.id,
      version: newVersion,
      data: newData,
      diff: diff,
      changedBy: userId,
      changeSource: suggestion.sourceType,
      suggestionId: suggestion.id,
      changeSummary: generateChangeSummary(diff),
    });

    // Update suggestion
    await tx.update(suggestions)
      .set({
        status: 'merged',
        mergedAt: new Date(),
        mergedVersion: newVersion,
      })
      .where(eq(suggestions.id, suggestion.id));
  }
}

function generateChangeSummary(diff: Operation[]): string {
  const changes = diff.map(op => {
    const field = op.path.split('/').pop();
    switch (op.op) {
      case 'add': return `Added ${field}`;
      case 'remove': return `Removed ${field}`;
      case 'replace': return `Updated ${field}`;
      default: return `Modified ${field}`;
    }
  });
  return changes.join(', ');
}
```

---

## Scraper Service

### Scraper Architecture

```typescript
// scraper/index.ts
import { CronJob } from 'cron';
import { sources } from './sources';
import { db } from '../lib/db';

export function startScraperWorker() {
  console.log('[Scraper] Starting worker...');

  for (const source of sources) {
    if (!source.schedule || !source.isActive) continue;

    console.log(`[Scraper] Scheduling ${source.name} with "${source.schedule}"`);

    new CronJob(source.schedule, async () => {
      await runScraper(source);
    }).start();
  }
}

async function runScraper(source: ScraperSource) {
  console.log(`[Scraper] Running ${source.name}`);

  const [run] = await db.insert(scraperRuns).values({
    sourceId: source.id,
    status: 'running',
    startedAt: new Date(),
  }).returning();

  try {
    const articles = await source.scrape();
    let suggestionsCreated = 0;

    for (const article of articles) {
      try {
        const mentions = await source.extractConstructions(article);

        for (const mention of mentions) {
          // Geocode location
          const geometry = await geocodeVietnameseAddress(mention.location.raw);

          // Try to match existing construction
          const existing = await findMatchingConstruction(geometry, mention.title);

          // Check for duplicates
          const isDuplicate = await checkDuplicateSuggestion(
            existing?.id,
            mention.sourceUrl
          );

          if (isDuplicate) continue;

          // Create suggestion
          await db.insert(suggestions).values({
            constructionId: existing?.id,
            suggestionType: existing ? 'update' : 'create',
            proposedData: transformMentionToData(mention),
            title: `[Auto] ${truncate(mention.title, 100)}`,
            sourceType: 'scraper',
            sourceUrl: mention.sourceUrl,
            sourceConfidence: mention.confidence,
            status: 'pending',
          });

          suggestionsCreated++;
        }
      } catch (err) {
        console.error(`[Scraper] Error processing article: ${article.url}`, err);
      }
    }

    await db.update(scraperRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        articlesFound: articles.length,
        suggestionsCreated,
      })
      .where(eq(scraperRuns.id, run.id));

    console.log(`[Scraper] ${source.name} completed: ${articles.length} articles, ${suggestionsCreated} suggestions`);

  } catch (error) {
    console.error(`[Scraper] ${source.name} failed:`, error);

    await db.update(scraperRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errors: { message: error.message, stack: error.stack },
      })
      .where(eq(scraperRuns.id, run.id));
  }
}
```

### VnExpress Scraper

```typescript
// scraper/sources/vnexpress.ts
import * as cheerio from 'cheerio';

export const vnexpressSource: ScraperSource = {
  id: 'vnexpress',
  name: 'VnExpress',
  baseUrl: 'https://vnexpress.net',
  schedule: '0 */6 * * *',  // Every 6 hours
  isActive: true,

  async scrape(): Promise<Article[]> {
    const searchPaths = [
      '/giao-thong',
      '/search?q=thi+c%C3%B4ng+%C4%91%C6%B0%E1%BB%9Dng',
      '/search?q=d%E1%BB%B1+%C3%A1n+giao+th%C3%B4ng+TP.HCM',
    ];

    const articles: Article[] = [];
    const seenUrls = new Set<string>();

    for (const path of searchPaths) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; HCMCRoadBot/1.0)',
          },
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        $('article.item-news').each((_, el) => {
          const url = $(el).find('a.title-news').attr('href');
          if (!url || seenUrls.has(url)) return;

          seenUrls.add(url);
          articles.push({
            title: $(el).find('a.title-news').text().trim(),
            url,
            summary: $(el).find('p.description').text().trim(),
            publishedAt: $(el).find('.time-count').attr('datetime'),
          });
        });
      } catch (err) {
        console.error(`[VnExpress] Failed to fetch ${path}:`, err);
      }
    }

    // Filter to HCMC-related articles
    return articles.filter(a =>
      a.title.includes('TP.HCM') ||
      a.title.includes('Sài Gòn') ||
      a.summary.includes('TP.HCM') ||
      a.summary.includes('Sài Gòn')
    );
  },

  async extractConstructions(article: Article): Promise<ConstructionMention[]> {
    // Fetch full article content
    const response = await fetch(article.url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const content = $('article.fck_detail').text();
    const mentions: ConstructionMention[] = [];

    // Location patterns
    const locationPatterns = [
      // "đường X, quận Y"
      /đường\s+([A-Za-zÀ-ỹ0-9\s]+),?\s*(quận|huyện|phường)\s+([A-Za-zÀ-ỹ0-9\s]+)/gi,
      // "dự án X"
      /dự\s+án\s+([^,\.]{10,100})/gi,
      // "thi công tại/trên X"
      /thi\s+công\s+(?:tại|trên)\s+([^,\.]{10,100})/gi,
      // "nâng cấp/mở rộng đường X"
      /(nâng\s+cấp|mở\s+rộng)\s+đường\s+([A-Za-zÀ-ỹ0-9\s]+)/gi,
    ];

    for (const pattern of locationPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        mentions.push({
          title: article.title,
          location: {
            raw: match[0].trim(),
            confidence: 0.7,
          },
          status: extractStatus(content),
          dates: extractDates(content),
          sourceUrl: article.url,
          scrapedAt: new Date(),
        });
      }
    }

    return mentions;
  },
};

function extractStatus(content: string): string | undefined {
  if (/hoàn thành|khánh thành|đưa vào sử dụng/i.test(content)) {
    return 'completed';
  }
  if (/đang thi công|tiếp tục thi công/i.test(content)) {
    return 'in-progress';
  }
  if (/khởi công|bắt đầu thi công/i.test(content)) {
    return 'in-progress';
  }
  if (/dự kiến|sẽ khởi công/i.test(content)) {
    return 'planned';
  }
  return undefined;
}

function extractDates(content: string): { start?: Date; end?: Date } {
  const dates: { start?: Date; end?: Date } = {};

  // "hoàn thành vào tháng X/YYYY" or "trong năm YYYY"
  const endMatch = content.match(/hoàn thành\s+(?:vào\s+)?(?:tháng\s+)?(\d{1,2})[\/\-](\d{4})/i);
  if (endMatch) {
    dates.end = new Date(parseInt(endMatch[2]), parseInt(endMatch[1]) - 1);
  }

  // "khởi công từ/vào DD/MM/YYYY"
  const startMatch = content.match(/khởi công\s+(?:từ|vào)\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
  if (startMatch) {
    dates.start = new Date(
      parseInt(startMatch[3]),
      parseInt(startMatch[2]) - 1,
      parseInt(startMatch[1])
    );
  }

  return dates;
}
```

### Geocoding Vietnamese Addresses

```typescript
// lib/geocoding.ts

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

export async function geocodeVietnameseAddress(
  address: string
): Promise<GeoJSON.Point | null> {
  // Normalize address
  const normalized = normalizeVietnameseAddress(address);

  // Add "Ho Chi Minh City, Vietnam" context
  const query = `${normalized}, Thành phố Hồ Chí Minh, Việt Nam`;

  const url = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    encodeURIComponent(query) + '.json');
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('country', 'VN');
  url.searchParams.set('bbox', '106.3,10.3,107.1,11.2');  // HCMC bounding box
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.features && data.features.length > 0) {
    const [lng, lat] = data.features[0].center;
    return {
      type: 'Point',
      coordinates: [lng, lat],
    };
  }

  return null;
}

function normalizeVietnameseAddress(address: string): string {
  return address
    .replace(/quận\s+(\d+)/gi, 'Quận $1')
    .replace(/đường\s+/gi, '')
    .replace(/phường\s+/gi, 'Phường ')
    .trim();
}
```

---

## API Routes

### Public Map API

```typescript
// app/api/map/constructions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const bounds = searchParams.get('bounds');  // "minLng,minLat,maxLng,maxLat"
  const status = searchParams.get('status');
  const district = searchParams.get('district');

  let query = db.select({
    id: constructions.id,
    slug: constructions.slug,
    title: constructions.title,
    status: constructions.status,
    progress: constructions.progress,
    geometry: constructions.geometry,
    centroid: constructions.centroid,
    startDate: constructions.startDate,
    expectedEndDate: constructions.expectedEndDate,
  })
  .from(constructions)
  .where(isNull(constructions.deletedAt));

  if (status) {
    query = query.where(eq(constructions.status, status));
  }

  if (district) {
    query = query.where(eq(constructions.districtId, district));
  }

  if (bounds) {
    const [minLng, minLat, maxLng, maxLat] = bounds.split(',').map(Number);
    query = query.where(
      sql`ST_Intersects(
        ${constructions.geometry},
        ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
      )`
    );
  }

  const results = await query;

  // Convert to GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    features: results.map(r => ({
      type: 'Feature',
      id: r.id,
      geometry: r.geometry || r.centroid,
      properties: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        status: r.status,
        progress: r.progress,
        startDate: r.startDate,
        expectedEndDate: r.expectedEndDate,
      },
    })),
  };

  return NextResponse.json(geojson);
}
```

### Suggestion Submission API

```typescript
// app/api/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { suggestions } from '@/lib/schema';

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const body = await request.json();

  // Validate input
  const { error, data } = suggestionSchema.safeParse(body);
  if (error) {
    return NextResponse.json(
      { error: 'Invalid input', details: error.issues },
      { status: 400 }
    );
  }

  // Create suggestion
  const [suggestion] = await db.insert(suggestions)
    .values({
      title: data.title,
      suggestionType: data.suggestionType,
      constructionId: data.constructionId,
      proposedData: data.proposedData,
      justification: data.justification,
      evidenceUrls: data.evidenceUrls,
      sourceType: 'community',
      submittedBy: session.user.id,
      status: 'pending',
    })
    .returning();

  // Notify moderators
  await notifyModerators('new_suggestion', suggestion);

  return NextResponse.json(suggestion, { status: 201 });
}
```

### Version History API

```typescript
// app/api/constructions/[id]/versions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const versions = await db.select({
    version: constructionVersions.version,
    data: constructionVersions.data,
    diff: constructionVersions.diff,
    changedBy: {
      id: users.id,
      name: users.name,
    },
    changeSource: constructionVersions.changeSource,
    changeSummary: constructionVersions.changeSummary,
    createdAt: constructionVersions.createdAt,
  })
  .from(constructionVersions)
  .leftJoin(users, eq(constructionVersions.changedBy, users.id))
  .where(eq(constructionVersions.constructionId, params.id))
  .orderBy(desc(constructionVersions.version));

  return NextResponse.json(versions);
}
```

---

## Frontend Components

### Map Component

```typescript
// components/Map/ConstructionMap.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STATUS_COLORS = {
  'planned': '#9CA3AF',      // gray
  'in-progress': '#F59E0B',  // amber
  'completed': '#10B981',    // green
  'paused': '#EF4444',       // red
  'cancelled': '#6B7280',    // dark gray
};

interface ConstructionMapProps {
  onSelectConstruction?: (id: string) => void;
}

export function ConstructionMap({ onSelectConstruction }: ConstructionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [106.6297, 10.8231],  // HCMC center
      zoom: 11,
    });

    map.current.on('load', () => {
      setLoaded(true);

      // Add construction data source
      map.current!.addSource('constructions', {
        type: 'geojson',
        data: '/api/map/constructions',
      });

      // Add polygon layer for construction areas
      map.current!.addLayer({
        id: 'construction-polygons',
        type: 'fill',
        source: 'constructions',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': [
            'match',
            ['get', 'status'],
            'planned', STATUS_COLORS.planned,
            'in-progress', STATUS_COLORS['in-progress'],
            'completed', STATUS_COLORS.completed,
            'paused', STATUS_COLORS.paused,
            'cancelled', STATUS_COLORS.cancelled,
            '#9CA3AF',
          ],
          'fill-opacity': 0.4,
        },
      });

      // Add outline layer
      map.current!.addLayer({
        id: 'construction-outlines',
        type: 'line',
        source: 'constructions',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': [
            'match',
            ['get', 'status'],
            'planned', STATUS_COLORS.planned,
            'in-progress', STATUS_COLORS['in-progress'],
            'completed', STATUS_COLORS.completed,
            'paused', STATUS_COLORS.paused,
            'cancelled', STATUS_COLORS.cancelled,
            '#9CA3AF',
          ],
          'line-width': 2,
        },
      });

      // Add point layer for markers
      map.current!.addLayer({
        id: 'construction-points',
        type: 'circle',
        source: 'constructions',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-color': [
            'match',
            ['get', 'status'],
            'planned', STATUS_COLORS.planned,
            'in-progress', STATUS_COLORS['in-progress'],
            'completed', STATUS_COLORS.completed,
            'paused', STATUS_COLORS.paused,
            'cancelled', STATUS_COLORS.cancelled,
            '#9CA3AF',
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Click handler
      map.current!.on('click', ['construction-points', 'construction-polygons'], (e) => {
        if (e.features && e.features[0]) {
          const id = e.features[0].properties?.id;
          onSelectConstruction?.(id);
        }
      });

      // Cursor change on hover
      map.current!.on('mouseenter', ['construction-points', 'construction-polygons'], () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current!.on('mouseleave', ['construction-points', 'construction-polygons'], () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [onSelectConstruction]);

  // Refresh data when bounds change
  useEffect(() => {
    if (!loaded || !map.current) return;

    const updateData = () => {
      const bounds = map.current!.getBounds();
      const boundsParam = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ].join(',');

      fetch(`/api/map/constructions?bounds=${boundsParam}`)
        .then(res => res.json())
        .then(data => {
          (map.current!.getSource('constructions') as mapboxgl.GeoJSONSource)
            .setData(data);
        });
    };

    map.current.on('moveend', updateData);

    return () => {
      map.current?.off('moveend', updateData);
    };
  }, [loaded]);

  return (
    <div ref={mapContainer} className="w-full h-full min-h-[500px]" />
  );
}
```

### Suggestion Form Component

```typescript
// components/Suggestions/SuggestionForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { suggestionSchema, SuggestionInput } from '@/lib/schemas';

interface SuggestionFormProps {
  constructionId?: string;
  constructionTitle?: string;
  onSuccess?: () => void;
}

export function SuggestionForm({
  constructionId,
  constructionTitle,
  onSuccess,
}: SuggestionFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SuggestionInput>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      constructionId,
      suggestionType: constructionId ? 'update' : 'create',
      proposedData: {},
      evidenceUrls: [],
    },
  });

  const onSubmit = async (data: SuggestionInput) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit suggestion');
      }

      form.reset();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-semibold">
        {constructionId
          ? `Suggest changes to: ${constructionTitle}`
          : 'Report new construction'
        }
      </h2>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Title *
        </label>
        <input
          {...form.register('title')}
          className="w-full border rounded px-3 py-2"
          placeholder="Brief description of the change"
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Type of suggestion *
        </label>
        <select
          {...form.register('suggestionType')}
          className="w-full border rounded px-3 py-2"
        >
          {!constructionId && (
            <option value="create">Report new construction</option>
          )}
          <option value="update">Update information</option>
          <option value="complete">Mark as completed</option>
          <option value="correction">Report error/correction</option>
        </select>
      </div>

      {/* Proposed data fields based on suggestionType */}
      <ProposedDataFields
        form={form}
        suggestionType={form.watch('suggestionType')}
      />

      <div>
        <label className="block text-sm font-medium mb-1">
          Justification
        </label>
        <textarea
          {...form.register('justification')}
          className="w-full border rounded px-3 py-2"
          rows={3}
          placeholder="Why are you suggesting this change? Include any relevant context."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Evidence URLs
        </label>
        <EvidenceUrlsField form={form} />
        <p className="text-gray-500 text-sm mt-1">
          Add links to news articles, official documents, or photos
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Suggestion'}
      </button>
    </form>
  );
}
```

### Version History Component

```typescript
// components/Versions/VersionHistory.tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface VersionHistoryProps {
  constructionId: string;
}

export function VersionHistory({ constructionId }: VersionHistoryProps) {
  const { data: versions, isLoading } = useSWR(
    `/api/constructions/${constructionId}/versions`
  );
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  if (isLoading) {
    return <div className="animate-pulse">Loading history...</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">Version History</h3>

      <div className="border rounded divide-y">
        {versions?.map((version) => (
          <div key={version.version} className="p-3">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedVersion(
                expandedVersion === version.version ? null : version.version
              )}
            >
              <div>
                <span className="font-medium">v{version.version}</span>
                <span className="text-gray-500 text-sm ml-2">
                  {formatDistanceToNow(new Date(version.createdAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SourceBadge source={version.changeSource} />
                <span className="text-gray-600 text-sm">
                  {version.changedBy?.name || 'System'}
                </span>
              </div>
            </div>

            {version.changeSummary && (
              <p className="text-sm text-gray-600 mt-1">
                {version.changeSummary}
              </p>
            )}

            {expandedVersion === version.version && version.diff && (
              <div className="mt-3 bg-gray-50 rounded p-3">
                <DiffViewer diff={version.diff} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors = {
    admin: 'bg-purple-100 text-purple-700',
    community: 'bg-blue-100 text-blue-700',
    scraper: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[source] || 'bg-gray-100'}`}>
      {source}
    </span>
  );
}

function DiffViewer({ diff }: { diff: any[] }) {
  return (
    <div className="space-y-2 text-sm font-mono">
      {diff.map((op, i) => (
        <div key={i} className="flex gap-2">
          <span className={
            op.op === 'add' ? 'text-green-600' :
            op.op === 'remove' ? 'text-red-600' :
            'text-amber-600'
          }>
            {op.op === 'add' ? '+' : op.op === 'remove' ? '-' : '~'}
          </span>
          <span className="text-gray-500">{op.path}</span>
          {op.value !== undefined && (
            <span className="text-gray-800">
              {JSON.stringify(op.value)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Foundation (Core MVP)

**Goals:**
- Basic app running with NextJS + PayloadCMS
- Database with PostGIS
- Map displaying construction markers
- Admin can create/edit constructions

**Tasks:**
- [ ] Initialize NextJS 14 project with App Router
- [ ] Set up PayloadCMS 3.x with PostgreSQL
- [ ] Configure PostGIS extension
- [ ] Create constructions collection
- [ ] Implement basic Mapbox integration
- [ ] Build public map view
- [ ] Deploy to Vercel + Railway

### Phase 2: Community Features

**Goals:**
- User authentication
- Suggestion submission and tracking
- Moderator review workflow
- Basic versioning

**Tasks:**
- [ ] Add NextAuth.js with email + social providers
- [ ] Create suggestions collection
- [ ] Build suggestion form component
- [ ] Implement workflow state machine
- [ ] Add version history tracking
- [ ] Build moderator review UI
- [ ] Email notifications for status changes

### Phase 3: Automation

**Goals:**
- Automated data collection from news sources
- Geocoding integration
- Scraper management dashboard

**Tasks:**
- [ ] Build scraper service infrastructure
- [ ] Implement VnExpress scraper
- [ ] Implement Tuoi Tre scraper
- [ ] Add Mapbox geocoding integration
- [ ] Create construction matching algorithm
- [ ] Build scraper management UI
- [ ] Add confidence scoring

### Phase 4: Enhancement

**Goals:**
- Mobile-responsive experience
- Advanced filtering and search
- Public API
- Analytics

**Tasks:**
- [ ] Mobile-responsive map and forms
- [ ] Advanced search with filters
- [ ] Public REST API with documentation
- [ ] Usage analytics dashboard
- [ ] Contributor leaderboard/reputation
- [ ] Push notifications

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Vercel                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    NextJS App                                │    │
│  │  - Public pages                                              │    │
│  │  - API routes                                                │    │
│  │  - PayloadCMS admin                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Database connection
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Railway                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                PostgreSQL + PostGIS                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  Scraper Service                             │    │
│  │             (Node.js with cron jobs)                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ External APIs
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      External Services                               │
│  - Mapbox (maps + geocoding)                                        │
│  - Resend/Postmark (email)                                          │
│  - Cloudflare R2 (media storage)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cost Estimates

| Service | Free Tier | Estimated Monthly Cost |
|---------|-----------|------------------------|
| Vercel | 100GB bandwidth | $0 - $20 |
| Railway PostgreSQL | $5 credit | $5 - $15 |
| Railway Scraper | $5 credit | $5 - $10 |
| Mapbox | 50K loads/month | $0 - $50 |
| Cloudflare R2 | 10GB storage | $0 - $5 |
| Resend | 3K emails/month | $0 - $20 |
| **Total** | | **$15 - $120/month** |

---

## Next Steps

1. **Set up the project structure** - Initialize NextJS + PayloadCMS + PostgreSQL
2. **Design the full database schema** - Complete SQL with all indexes and constraints
3. **Build the suggestion workflow** - State machine and API routes
4. **Create the scraper service** - Start with one news source (VnExpress)

---

*Document created: January 2025*
*Last updated: January 2025*
