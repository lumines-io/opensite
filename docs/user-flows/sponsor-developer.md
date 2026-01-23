# Sponsor/Developer User Flow

## Overview

Sponsor/Developer users are representatives of real estate developers and commercial organizations who can create and manage private construction projects on the platform. These projects are displayed on the map after approval by moderators.

## User Roles

### Sponsor Admin (`sponsor_admin`)

Organization administrators with full control over their organization's projects.

**Capabilities:**
- Create private construction projects
- Submit projects directly for platform review (skip internal review)
- Approve/reject internal submissions from team members
- Manage organization profile
- View analytics for all organization projects
- Withdraw submissions

### Sponsor User (`sponsor_user`)

Team members within a sponsor organization with limited permissions.

**Capabilities:**
- Create draft private construction projects
- Submit projects for internal review (to Sponsor Admin)
- Edit assigned projects
- View organization analytics
- Resubmit after changes requested

## Approval Workflow

```
┌─────────┐    ┌─────────────────┐    ┌───────────┐    ┌──────────────┐
│  Draft  │───▶│ Internal Review │───▶│ Submitted │───▶│ Under Review │
└─────────┘    │ (Sponsor Admin) │    │           │    │ (Moderator)  │
     ▲         └─────────────────┘    └───────────┘    └──────┬───────┘
     │                │                      ▲                │
     │                ▼                      │    ┌───────────┼───────────┐
     │         Return to Draft               │    ▼           ▼           ▼
     │                                       │ ┌──────────┐ ┌──────────┐ ┌──────────┐
     │                                       │ │ Approved │ │ Changes  │ │ Rejected │
     │                                       │ └────┬─────┘ │Requested │ └──────────┘
     │                                       │      │       └────┬─────┘      │
     │                                       │      ▼            │            │
     │                                       │ ┌───────────┐     │            │
     │                                       └─│ Published │◀────┘            │
     │                                         └───────────┘                  │
     └────────────────────────────────────────────────────────────────────────┘
                                        (can resubmit from rejected)
```

### Workflow States

| Status | Description | Who Can Transition |
|--------|-------------|-------------------|
| `draft` | Initial state, being edited | Sponsor User/Admin |
| `internal_review` | Awaiting Sponsor Admin approval | Sponsor Admin |
| `submitted` | Awaiting moderator pickup | Moderator/Admin |
| `under_review` | Being reviewed by moderator | Moderator/Admin |
| `changes_requested` | Returned with feedback | Sponsor User/Admin |
| `approved` | Ready for publishing | Moderator/Admin |
| `rejected` | Not accepted | Sponsor can resubmit |
| `published` | Visible on public map | Moderator/Admin |

## User Flows

### 1. Creating a New Project

**Actor:** Sponsor Admin or Sponsor User

1. Navigate to `/sponsor/projects`
2. Click "Tạo dự án mới" (Create New Project)
3. Fill in required fields:
   - Title
   - Private Type (Residential, Commercial, etc.)
   - Location (map pin)
   - Description
   - Progress percentage
   - Timeline dates
4. Add marketing content (optional):
   - Headline
   - Key features
   - Price range
   - Contact information
5. Click "Save Draft" or "Submit for Review"

### 2. Submitting for Review

**Actor:** Sponsor User

1. Navigate to project detail page
2. Review all information
3. Click "Gửi duyệt nội bộ" (Submit for Internal Review)
4. Project moves to `internal_review` status
5. Sponsor Admin receives notification

**Actor:** Sponsor Admin

1. Navigate to project detail page
2. Review all information
3. Click "Gửi duyệt" (Submit for Review)
4. Project moves directly to `submitted` status

### 3. Internal Review (Sponsor Admin)

1. Navigate to `/sponsor/projects`
2. Filter by "Chờ duyệt nội bộ" (Internal Review)
3. Click on project to review
4. Options:
   - **Approve**: Click "Duyệt nội bộ" → Project moves to `submitted`
   - **Return**: Click "Trả về bản nháp" → Project returns to `draft`

### 4. Responding to Change Requests

**Actor:** Sponsor User or Sponsor Admin

1. Receive notification of changes requested
2. Navigate to project detail page
3. Review moderator's notes
4. Edit project to address feedback
5. Click "Gửi lại" (Resubmit)
6. Project moves back to `submitted`

### 5. Withdrawing a Submission

**Actor:** Sponsor Admin

1. Navigate to project detail page
2. Project must be in `submitted` or `changes_requested` status
3. Click "Rút lại" (Withdraw)
4. Project returns to `draft` status

### 6. Managing Published Projects

**Actor:** Sponsor Admin

Published projects can be:
- Edited (minor updates don't require re-approval)
- Unpublished (removed from map temporarily)
- Archived (permanently removed)

## Project Management Page

### `/sponsor/projects` - Project List

Displays all organization projects with:
- Filter tabs by approval status
- Search functionality
- Project cards showing:
  - Title
  - Status badge
  - Progress
  - Last updated date
  - Quick actions

### `/sponsor/projects/[id]` - Project Detail

Shows complete project information:
- **Overview Tab**: Basic info, progress, timeline
- **Marketing Tab**: Marketing content, CTAs
- **Analytics Tab**: Impressions, clicks, inquiries
- **History Tab**: Status changes, audit log

### `/sponsor/projects/new` - Create Project

Form for creating new private constructions with:
- Basic information fields
- Map picker for location
- Marketing content sections
- Save/Submit actions

## Map Integration

### How Private Constructions Appear on Map

1. Only `published` status projects are visible
2. Displayed with purple marker color
3. Show "Tài trợ" (Sponsored) badge
4. Organization name visible in popup
5. Enhanced popup with marketing content

### Map Filtering

Users can filter the map by:
- **Category**: Toggle public/private visibility
- **Type**: Filter by construction type
- **Status**: Filter by project status

## Analytics (Sponsor Dashboard)

Sponsors can view metrics for their published projects:

| Metric | Description |
|--------|-------------|
| Impressions | Number of times project appeared in viewport |
| Clicks | Number of marker/popup clicks |
| CTA Clicks | Number of call-to-action button clicks |
| Inquiries | Number of contact form submissions |

## Access Control

### What Sponsors CAN Do

- Create private constructions for their organization
- Edit their organization's projects
- Submit projects for review
- View analytics for their projects
- Manage project marketing content

### What Sponsors CANNOT Do

- Create public constructions
- Edit public constructions
- Approve their own submissions
- Publish projects directly (requires moderator)
- Access other organizations' projects

## Test Accounts

For testing the sponsor experience, use these accounts:

| Email | Role | Organization | Password |
|-------|------|--------------|----------|
| `sponsor-admin@vinhomes.test` | sponsor_admin | Vinhomes | test123 |
| `sponsor-user@vinhomes.test` | sponsor_user | Vinhomes | test123 |
| `sponsor-admin@novaland.test` | sponsor_admin | Novaland | test123 |
| `sponsor-user@novaland.test` | sponsor_user | Novaland | test123 |

Create test accounts by running:
```bash
npm run seed:accounts
```

Create sample private constructions by running:
```bash
npm run seed:hcmc
```

## Related Documentation

- [Construction Management](../features/construction-management.md)
- [Authentication](../features/authentication.md)
- [Moderation](../features/moderation.md)
- [Sponsor/Developer Experience Plan](../PLAN-sponsor-developer-experience.md)
