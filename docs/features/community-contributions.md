# Community Contribution System

## Overview

The Community Contribution System enables registered users to submit suggestions for new construction projects, updates to existing projects, completion reports, and corrections. This crowdsourced approach ensures the construction database stays current and accurate.

## User Requirements

To contribute, users must:

1. **Register** an account
2. **Verify** their email address
3. Be logged in with an active session

## Suggestion Types

### 1. Create New Project

Submit information about a construction project not yet in the database.

**Required fields:**
- Title
- Description
- Construction type
- Location (geometry)
- Evidence URLs (news articles, official announcements)

**Optional fields:**
- Start date
- Expected end date
- Contractor
- Budget
- District

### 2. Update Existing Project

Propose changes to an existing construction project's information.

**Required fields:**
- Reference to existing construction
- Description of changes
- Evidence URLs

**Proposed changes can include:**
- Status updates
- Progress percentage
- Date adjustments
- Description corrections
- Additional details

### 3. Mark as Completed

Report that a construction project has finished.

**Required fields:**
- Reference to construction
- Evidence (photos, news articles)

**Optional fields:**
- Actual completion date
- Final notes

### 4. Report Correction

Flag errors in existing construction data.

**Required fields:**
- Reference to construction
- Description of error
- Correct information
- Evidence

## Suggestion Data Model

```typescript
interface Suggestion {
  id: string;
  title: string;
  suggestionType: 'create' | 'update' | 'complete' | 'correction';
  description: string;
  proposedData: Record<string, any>;  // JSON of proposed values
  proposedGeometry?: GeoJSON;
  evidenceUrls: string[];
  locationDescription?: string;

  // Status tracking
  status: SuggestionStatus;

  // References
  construction?: Construction;  // For updates/corrections
  submittedBy: User;
  assignedTo?: User;  // Moderator
  reviewedBy?: User;

  // Review data
  reviewNotes?: string;
  mergedVersion?: number;

  // Source
  sourceType: 'community' | 'scraper' | 'api';

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

## Suggestion Status Lifecycle

```
┌─────────┐
│ PENDING │ ─────────────────────────────────────┐
└────┬────┘                                      │
     │                                           │
     │ Moderator picks up                        │
     ▼                                           │
┌──────────────┐                                 │
│ UNDER_REVIEW │                                 │
└──────┬───────┘                                 │
       │                                         │
       ├──────────────────┬──────────────────┐   │
       │                  │                  │   │
       ▼                  ▼                  ▼   │
┌──────────┐     ┌───────────────────┐  ┌────────────┐
│ APPROVED │     │ CHANGES_REQUESTED │  │  REJECTED  │
└────┬─────┘     └─────────┬─────────┘  └────────────┘
     │                     │
     │                     │ User updates
     │                     └──────► Back to PENDING
     │
     │ Applied to construction
     ▼
┌─────────┐
│ MERGED  │
└─────────┘

Additional status:
┌────────────┐
│ SUPERSEDED │ (When a newer suggestion overwrites)
└────────────┘
```

## Submission Flow

### Via Suggestion Form (`/suggest`)

1. User navigates to `/suggest`
2. Selects suggestion type
3. Fills in required fields
4. Uses geometry editor for location (if applicable)
5. Adds evidence URLs
6. Submits form

### Via Construction Detail Page (`/details/[slug]/suggest`)

1. User views construction details
2. Clicks "Suggest Edit" button
3. Form pre-populates with current data
4. User modifies fields they want to change
5. Field change indicators show differences
6. User submits suggestion

## Form Components

### Suggestion Form
Main form component handling all suggestion types:
- Dynamic field rendering based on type
- Validation rules per type
- Evidence URL management
- Rich text description editor

### Geometry Editor
Interactive map tool for drawing locations:
- Point placement
- Line drawing
- Polygon drawing
- Edit existing geometry
- Clear and redraw

### Field Change Indicator
Shows which fields have been modified:
- Original value
- Proposed value
- Visual diff highlighting

## API Endpoints

### Create Suggestion
```
POST /api/suggestions
Authorization: Required (verified user)
Body: {
  title: string,
  suggestionType: string,
  description: string,
  proposedData: object,
  proposedGeometry?: object,
  evidenceUrls: string[],
  constructionId?: string
}
```

### List User's Suggestions
```
GET /api/suggestions
Authorization: Required
Query: page, limit, status
```

### Get Suggestion Details
```
GET /api/suggestions/[id]
Authorization: Required (owner or moderator)
```

## Reputation System

Users build reputation through quality contributions:

| Action | Points |
|--------|--------|
| Suggestion approved | +10 |
| Suggestion merged | +5 |
| Suggestion rejected | -2 |
| Multiple rejections | Warning |

Reputation affects:
- Suggestion priority in queue
- Future feature access
- Trust level indicators

## Evidence Requirements

### Acceptable Evidence

- News article URLs
- Government announcement links
- Official project documentation
- Dated photographs
- Social media posts from official accounts

### Evidence Validation

- URLs are stored and displayed
- Moderators verify evidence during review
- Broken links flagged during review

## User Interface

### My Suggestions Page (`/suggestions`)

Dashboard showing:
- All submitted suggestions
- Status filters (pending, approved, rejected, etc.)
- Quick stats (total, approved rate)
- Suggestion details on click

### Suggestion Card

Displays:
- Title
- Type badge
- Status badge
- Submission date
- Construction reference (if applicable)
- Action buttons (view, edit if pending)

## Feature Flag

**Flag:** `FEATURE_COMMUNITY_SUGGESTIONS`

When disabled:
- Suggestion forms hidden
- "Suggest Edit" buttons removed
- `/suggest` redirects to home
- API endpoints return 403

## Security Considerations

- Email verification required
- Rate limiting on submissions
- XSS prevention in description fields
- URL validation for evidence
- No file uploads (URLs only)

## Related Features

- [Authentication](./authentication.md)
- [Moderation Workflow](./moderation.md)
- [Search](./search.md)

## Component Files

- `src/app/(frontend)/suggest/page.tsx`
- `src/app/(frontend)/suggestions/page.tsx`
- `src/components/suggestions/SuggestionForm.tsx`
- `src/components/suggestions/GeometryEditor.tsx`
- `src/components/suggestions/FieldChangeIndicator.tsx`
- `src/collections/Suggestions.ts`
