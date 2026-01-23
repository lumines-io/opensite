# Moderation Workflow

## Overview

The Moderation Workflow enables moderators and administrators to review, approve, reject, and merge community suggestions into the construction database. It ensures data quality and prevents abuse of the community contribution system.

## Roles and Permissions

### Contributor (Verified User)
- Submit suggestions
- View own suggestions
- Edit pending suggestions
- Cannot review suggestions

### Moderator
- All contributor permissions
- Access moderator dashboard
- Review suggestions
- Approve/reject suggestions
- Request changes
- Merge approved suggestions

### Administrator
- All moderator permissions
- Access Payload CMS admin
- Manage users
- Manage feature flags
- Run scrapers manually
- View analytics

## Moderator Dashboard

### Access
Located at `/moderator/suggestions` (or via Payload admin custom view)

### Dashboard Features

#### Suggestion Queue
- List of all suggestions pending review
- Sortable by date, type, status
- Filterable by:
  - Status (pending, under_review, etc.)
  - Type (create, update, complete, correction)
  - Source (community, scraper, api)
  - Date range

#### Quick Stats
- Total pending
- Under review count
- Today's reviewed count
- Approval rate

#### Suggestion Detail View
- Full suggestion information
- Evidence links
- Proposed changes diff
- Submitter information
- Review history

## Review Process

### Step 1: Pick Up Suggestion

Moderator selects a pending suggestion to review.

```
POST /api/suggestions/[id]/start-review
Authorization: Moderator or Admin

Response: {
  success: true,
  suggestion: {
    status: "under_review",
    assignedTo: moderatorId
  }
}
```

Status changes: `pending` → `under_review`

### Step 2: Review Content

Moderator examines:

1. **Evidence Quality**
   - Are sources reliable?
   - Do links work?
   - Does evidence support the claim?

2. **Data Accuracy**
   - Is information factually correct?
   - Are dates reasonable?
   - Is geometry accurate?

3. **Completeness**
   - Required fields filled?
   - Description adequate?
   - Location identifiable?

4. **Duplication**
   - Does this duplicate existing data?
   - Is there a similar pending suggestion?

### Step 3: Take Action

#### Approve
```
POST /api/suggestions/[id]/approve
Authorization: Moderator or Admin
Body: {
  notes?: string  // Optional review notes
}
```

Status changes: `under_review` → `approved`

#### Reject
```
POST /api/suggestions/[id]/reject
Authorization: Moderator or Admin
Body: {
  reason: string  // Required rejection reason
}
```

Status changes: `under_review` → `rejected`

#### Request Changes
```
POST /api/suggestions/[id]/request-changes
Authorization: Moderator or Admin
Body: {
  notes: string  // What needs to be changed
}
```

Status changes: `under_review` → `changes_requested`

The submitter receives notification and can update their suggestion.

### Step 4: Merge (After Approval)

For approved suggestions, moderator merges changes into the database.

```
POST /api/suggestions/[id]/merge
Authorization: Moderator or Admin
```

**For "Create" suggestions:**
- New construction record created
- Suggestion linked to new record
- Changelog entry created

**For "Update" suggestions:**
- Existing construction updated
- Changes applied as JSON patch
- Changelog entry created
- Version incremented

**For "Complete" suggestions:**
- Status set to "completed"
- End date set if provided
- Changelog entry created

**For "Correction" suggestions:**
- Specified fields corrected
- Changelog entry created

Status changes: `approved` → `merged`

## Suggestion States

| Status | Description | Next Actions |
|--------|-------------|--------------|
| `pending` | Awaiting review | Start review |
| `under_review` | Being reviewed | Approve, Reject, Request changes |
| `approved` | Approved, awaiting merge | Merge |
| `rejected` | Rejected by moderator | None (final) |
| `changes_requested` | Needs submitter updates | Submitter edits → pending |
| `merged` | Applied to database | None (final) |
| `superseded` | Replaced by newer suggestion | None (final) |

## Review Interface Components

### Suggestion Review Panel
- Side-by-side comparison (current vs proposed)
- Diff highlighting
- Action buttons
- Notes input field

### Evidence Viewer
- Link previews
- URL validation indicator
- Open in new tab

### Geometry Comparison
- Map showing current geometry (if exists)
- Overlay of proposed geometry
- Toggle between views

### History Panel
- Previous review actions
- Status change log
- Moderator comments

## Notification System

### To Submitter
- Suggestion approved notification
- Suggestion rejected notification (with reason)
- Changes requested notification (with notes)
- Suggestion merged notification

### To Moderator
- New suggestions in queue (optional digest)
- Assigned suggestion updated

## API Endpoints Summary

```
# List all suggestions (admin/moderator)
GET /api/admin/suggestions
Query: status, type, source, page, limit

# Start review
POST /api/suggestions/[id]/start-review

# Approve suggestion
POST /api/suggestions/[id]/approve

# Reject suggestion
POST /api/suggestions/[id]/reject

# Request changes
POST /api/suggestions/[id]/request-changes

# Merge suggestion
POST /api/suggestions/[id]/merge

# Unassign (release back to queue)
POST /api/suggestions/[id]/unassign
```

## Batch Operations

Moderators can perform batch operations:

- Bulk approve multiple suggestions
- Bulk reject spam suggestions
- Bulk assign to moderator

```
POST /api/admin/suggestions/batch
Authorization: Admin
Body: {
  action: "approve" | "reject" | "assign",
  suggestionIds: string[],
  data?: {
    assignTo?: string,
    reason?: string
  }
}
```

## Conflict Resolution

### Same Construction, Multiple Suggestions

When multiple suggestions target the same construction:

1. Moderator reviews in chronological order
2. First merged suggestion takes precedence
3. Subsequent suggestions checked for conflicts
4. Non-conflicting changes can still be merged
5. Conflicting suggestions marked as `superseded`

### Stale Suggestions

Suggestions older than configurable threshold:
- Flagged in dashboard
- May require re-verification of evidence
- Can be bulk-closed by admin

## Moderator Guidelines

### Do
- Verify evidence before approving
- Provide clear rejection reasons
- Use "request changes" for fixable issues
- Check for duplicates before merging
- Add helpful review notes

### Don't
- Approve without checking evidence
- Reject without explanation
- Ignore submission context
- Merge conflicting data
- Skip the review process

## Feature Flag

**Flag:** `FEATURE_MODERATOR_DASHBOARD`

When disabled:
- Dashboard hidden from navigation
- Moderation endpoints return 403
- Suggestions remain in pending state

## Metrics & Analytics

Tracked metrics:
- Review time (pickup to decision)
- Approval rate by moderator
- Rejection reasons breakdown
- Queue wait time
- Suggestions per day

## Related Files

- `src/app/(frontend)/moderator/suggestions/page.tsx`
- `src/app/api/suggestions/[id]/start-review/route.ts`
- `src/app/api/suggestions/[id]/approve/route.ts`
- `src/app/api/suggestions/[id]/reject/route.ts`
- `src/app/api/suggestions/[id]/request-changes/route.ts`
- `src/app/api/admin/suggestions/route.ts`
- `src/collections/Suggestions.ts`
