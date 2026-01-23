# Stripe Payment Integration Plan - Credit System

## Overview

This plan outlines how to implement a **Credit-based payment system** using Stripe for OpenSite. Sponsors load credits (VND) into their organization account via Stripe, then spend those credits to promote their private constructions. **Stripe is only used for loading credits** - all promotion purchases are internal credit deductions.

---

## 1. Business Model

### 1.1 Credit System

| Aspect | Details |
|--------|---------|
| **Currency** | Vietnamese Dong (VND) |
| **Minimum Top-up** | 100,000 VND (~$4 USD) |
| **Maximum Top-up** | 10,000,000 VND (~$400 USD) |
| **Credit Expiry** | No expiry (credits never expire) |
| **Refund Policy** | Unused credits refundable within 30 days of purchase |

### 1.2 Suggested Credit Packages (Pre-defined amounts)

| Package | Amount (VND) | Bonus | Total Credits |
|---------|--------------|-------|---------------|
| **Starter** | 100,000 | 0% | 100,000 |
| **Basic** | 500,000 | 5% | 525,000 |
| **Standard** | 1,000,000 | 10% | 1,100,000 |
| **Professional** | 3,000,000 | 15% | 3,450,000 |
| **Enterprise** | 5,000,000 | 20% | 6,000,000 |
| **Premium** | 10,000,000 | 25% | 12,500,000 |

*Sponsors can also enter custom amounts within the min/max range.*

### 1.3 Promotion Packages (Paid with Credits)

| Package | Duration | Features | Cost (VND) |
|---------|----------|----------|------------|
| **Basic Boost** | 7 days | Featured badge, priority +10 | 200,000 |
| **Standard Boost** | 14 days | Featured badge, priority +20, custom marker | 350,000 |
| **Professional** | 30 days | Featured badge, priority +30, custom marker | 600,000 |
| **Premium** | 30 days | All above + homepage spotlight, search boost | 1,000,000 |
| **Enterprise** | 60 days | All features, maximum priority, dedicated placement | 1,800,000 |

---

## 2. Database Schema

### 2.1 New Collections

#### `CreditTransactions` Collection
Records all credit movements (top-ups, spending, refunds, adjustments).

```typescript
// src/collections/CreditTransactions.ts
{
  slug: 'credit-transactions',
  fields: [
    { name: 'organization', type: 'relationship', relationTo: 'organizations', required: true },
    { name: 'type', type: 'select', required: true, options: [
      { label: 'Top-up', value: 'topup' },
      { label: 'Promotion Purchase', value: 'promotion' },
      { label: 'Refund', value: 'refund' },
      { label: 'Adjustment', value: 'adjustment' },
      { label: 'Bonus', value: 'bonus' },
    ]},
    { name: 'amount', type: 'number', required: true }, // Positive for credit, negative for debit
    { name: 'balanceBefore', type: 'number', required: true },
    { name: 'balanceAfter', type: 'number', required: true },
    { name: 'description', type: 'text', localized: true },
    { name: 'reference', type: 'group', fields: [
      { name: 'type', type: 'select', options: ['stripe_payment', 'promotion', 'admin_adjustment'] },
      { name: 'stripePaymentIntentId', type: 'text' },
      { name: 'stripeCheckoutSessionId', type: 'text' },
      { name: 'promotionId', type: 'relationship', relationTo: 'promotions' },
    ]},
    { name: 'performedBy', type: 'relationship', relationTo: 'users' },
    { name: 'metadata', type: 'json' },
  ],
  timestamps: true,
  admin: {
    useAsTitle: 'type',
    defaultColumns: ['organization', 'type', 'amount', 'balanceAfter', 'createdAt'],
  }
}
```

#### `PromotionPackages` Collection
Defines the available promotion packages sponsors can purchase with credits.

```typescript
// src/collections/PromotionPackages.ts
{
  slug: 'promotion-packages',
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'durationDays', type: 'number', required: true },
    { name: 'costInCredits', type: 'number', required: true }, // VND amount
    { name: 'features', type: 'group', fields: [
      { name: 'priorityBoost', type: 'number', defaultValue: 0 },
      { name: 'showFeaturedBadge', type: 'checkbox', defaultValue: true },
      { name: 'useCustomMarker', type: 'checkbox', defaultValue: false },
      { name: 'homepageSpotlight', type: 'checkbox', defaultValue: false },
      { name: 'searchBoost', type: 'number', defaultValue: 0 },
    ]},
    { name: 'isActive', type: 'checkbox', defaultValue: true },
    { name: 'sortOrder', type: 'number', defaultValue: 0 },
    { name: 'badge', type: 'group', fields: [
      { name: 'text', type: 'text' }, // e.g., "Most Popular", "Best Value"
      { name: 'color', type: 'text' }, // hex color
    ]},
  ]
}
```

#### `Promotions` Collection
Tracks active promotions purchased by sponsors for their constructions.

```typescript
// src/collections/Promotions.ts
{
  slug: 'promotions',
  fields: [
    { name: 'construction', type: 'relationship', relationTo: 'constructions', required: true },
    { name: 'organization', type: 'relationship', relationTo: 'organizations', required: true },
    { name: 'package', type: 'relationship', relationTo: 'promotion-packages', required: true },
    { name: 'status', type: 'select', options: [
      { label: 'Active', value: 'active' },
      { label: 'Expired', value: 'expired' },
      { label: 'Cancelled', value: 'cancelled' },
    ], defaultValue: 'active' },
    { name: 'creditTransaction', type: 'relationship', relationTo: 'credit-transactions' },
    { name: 'creditsSpent', type: 'number', required: true },
    { name: 'startDate', type: 'date', required: true },
    { name: 'endDate', type: 'date', required: true },
    { name: 'analytics', type: 'group', fields: [
      { name: 'impressionsAtStart', type: 'number', defaultValue: 0 },
      { name: 'clicksAtStart', type: 'number', defaultValue: 0 },
      { name: 'impressionsGained', type: 'number', defaultValue: 0 },
      { name: 'clicksGained', type: 'number', defaultValue: 0 },
    ]},
    { name: 'cancelledAt', type: 'date' },
    { name: 'creditsRefunded', type: 'number' }, // Prorated refund if cancelled early
  ],
  hooks: {
    afterChange: [/* Update construction displayOptions based on active promotions */]
  }
}
```

#### `CreditTopupHistory` Collection
Records Stripe payment history specifically for credit top-ups.

```typescript
// src/collections/CreditTopupHistory.ts
{
  slug: 'credit-topup-history',
  fields: [
    { name: 'organization', type: 'relationship', relationTo: 'organizations', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'amountPaid', type: 'number', required: true }, // VND paid
    { name: 'creditsReceived', type: 'number', required: true }, // Credits added (may include bonus)
    { name: 'bonusCredits', type: 'number', defaultValue: 0 },
    { name: 'status', type: 'select', options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Completed', value: 'completed' },
      { label: 'Failed', value: 'failed' },
      { label: 'Refunded', value: 'refunded' },
    ], defaultValue: 'pending' },
    { name: 'stripePaymentIntentId', type: 'text' },
    { name: 'stripeCheckoutSessionId', type: 'text' },
    { name: 'stripeReceiptUrl', type: 'text' },
    { name: 'creditTransaction', type: 'relationship', relationTo: 'credit-transactions' },
    { name: 'refundedAt', type: 'date' },
    { name: 'refundReason', type: 'text' },
  ],
  timestamps: true,
}
```

### 2.2 Modifications to Existing Collections

#### Organizations Collection
Add credit balance tracking:

```typescript
// Add to src/collections/Organizations.ts
{
  name: 'billing',
  type: 'group',
  fields: [
    { name: 'stripeCustomerId', type: 'text', admin: { readOnly: true } },
    { name: 'creditBalance', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'totalCreditsLoaded', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'totalCreditsSpent', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'billingEmail', type: 'email' },
  ],
}
```

#### Constructions Collection
Add active promotion reference:

```typescript
// Add to src/collections/Constructions.ts
{
  name: 'activePromotion',
  type: 'relationship',
  relationTo: 'promotions',
  admin: { readOnly: true },
},
{
  name: 'promotionExpiresAt',
  type: 'date',
  admin: { readOnly: true },
},
```

---

## 3. API Endpoints

### 3.1 Credit Management Endpoints

```
POST   /api/sponsor/credits/topup
       Body: { amount: number } // VND amount (100,000 - 10,000,000)
       → Creates Stripe Checkout Session for credit top-up
       → Returns { checkoutUrl, sessionId }

GET    /api/sponsor/credits/balance
       → Returns { balance, totalLoaded, totalSpent }

GET    /api/sponsor/credits/transactions
       Query: { page, limit, type? }
       → Returns paginated credit transaction history

GET    /api/sponsor/credits/topup-history
       Query: { page, limit }
       → Returns Stripe payment history for top-ups
```

### 3.2 Promotion Endpoints

```
GET    /api/sponsor/promotions/packages
       → Lists available promotion packages with costs

POST   /api/sponsor/promotions/purchase
       Body: { constructionId, packageId }
       → Deducts credits and activates promotion
       → Returns { promotion, newBalance }

GET    /api/sponsor/promotions
       Query: { constructionId?, status?, page, limit }
       → Lists promotions for organization

GET    /api/sponsor/promotions/[id]
       → Get promotion details with analytics

POST   /api/sponsor/promotions/[id]/cancel
       → Cancels promotion and refunds prorated credits
       → Returns { creditsRefunded, newBalance }
```

### 3.3 Webhook Endpoint

```
POST   /api/webhooks/stripe
       → Handles Stripe webhook events for credit top-ups
```

---

## 4. Stripe Configuration

### 4.1 Stripe Setup

Since we're using credits with variable amounts, we'll use **Stripe Checkout with custom amounts** rather than predefined products.

```typescript
// Create checkout session with dynamic amount
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'vnd',
      product_data: {
        name: 'OpenSite Credits',
        description: `${amount.toLocaleString('vi-VN')} VND credits for OpenSite`,
      },
      unit_amount: amount, // VND is zero-decimal currency
    },
    quantity: 1,
  }],
  metadata: {
    organizationId: organization.id,
    userId: user.id,
    creditsToAdd: totalCredits, // Including any bonus
    bonusCredits: bonusAmount,
  },
  success_url: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/dashboard/billing?cancelled=true`,
});
```

### 4.2 Webhook Events to Handle

```typescript
const WEBHOOK_EVENTS = [
  'checkout.session.completed',  // Credit top-up successful
  'checkout.session.expired',    // Payment abandoned
  'payment_intent.payment_failed', // Payment failed
  'charge.refunded',             // Admin refund processed
];
```

### 4.3 Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Credit system config
CREDIT_MIN_TOPUP=100000        # 100,000 VND
CREDIT_MAX_TOPUP=10000000      # 10,000,000 VND
```

---

## 5. Implementation Flows

### 5.1 Credit Top-up Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CREDIT TOP-UP FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Sponsor    │     │   OpenSite   │     │    Stripe    │     │   Webhook    │
│  Dashboard   │     │     API      │     │   Checkout   │     │   Handler    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ 1. Enter amount    │                    │                    │
       │    (e.g., 1M VND)  │                    │                    │
       ├───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ 2. Validate amount │                    │
       │                    │    Calculate bonus │                    │
       │                    │    Create checkout │                    │
       │                    ├───────────────────>│                    │
       │                    │                    │                    │
       │                    │ 3. Return URL      │                    │
       │                    │<───────────────────┤                    │
       │                    │                    │                    │
       │ 4. Redirect to     │                    │                    │
       │    Stripe          │                    │                    │
       │<───────────────────┤                    │                    │
       │                    │                    │                    │
       ├────────────────────────────────────────>│                    │
       │                    │                    │                    │
       │ 5. Enter payment   │                    │                    │
       │    details         │                    │                    │
       │                    │                    │                    │
       │<────────────────────────────────────────┤                    │
       │                    │                    │                    │
       │                    │                    │ 6. checkout.       │
       │                    │                    │    session.        │
       │                    │                    │    completed       │
       │                    │                    ├───────────────────>│
       │                    │                    │                    │
       │                    │                    │                    │ 7. Create
       │                    │                    │                    │    CreditTopupHistory
       │                    │                    │                    │
       │                    │                    │                    │ 8. Create
       │                    │                    │                    │    CreditTransaction
       │                    │                    │                    │
       │                    │                    │                    │ 9. Update org
       │                    │                    │                    │    creditBalance
       │                    │                    │                    │
       │ 10. Redirect to    │                    │                    │
       │     success page   │                    │                    │
       │     (balance       │                    │                    │
       │     updated)       │                    │                    │
       │<────────────────────────────────────────┤                    │
       │                    │                    │                    │
```

### 5.2 Promotion Purchase Flow (Using Credits)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROMOTION PURCHASE FLOW (CREDITS)                     │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────────────────────────────────────┐
│   Sponsor    │     │                   OpenSite API                    │
│  Dashboard   │     │                                                   │
└──────┬───────┘     └──────────────────────┬───────────────────────────┘
       │                                    │
       │ 1. Select construction             │
       │    + promotion package             │
       ├───────────────────────────────────>│
       │                                    │
       │                                    │ 2. Validate:
       │                                    │    - Construction belongs to org
       │                                    │    - No active promotion exists
       │                                    │    - Sufficient credit balance
       │                                    │
       │                                    │ 3. BEGIN TRANSACTION
       │                                    │
       │                                    │ 4. Deduct credits from org balance
       │                                    │
       │                                    │ 5. Create CreditTransaction
       │                                    │    (type: 'promotion', negative amount)
       │                                    │
       │                                    │ 6. Create Promotion record
       │                                    │    (status: 'active')
       │                                    │
       │                                    │ 7. Update Construction
       │                                    │    displayOptions
       │                                    │
       │                                    │ 8. COMMIT TRANSACTION
       │                                    │
       │ 9. Return success                  │
       │    { promotion, newBalance }       │
       │<───────────────────────────────────┤
       │                                    │
```

### 5.3 Promotion Cancellation & Refund Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROMOTION CANCELLATION FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

1. Sponsor requests cancellation
2. Calculate prorated refund:
   - daysRemaining = endDate - today
   - totalDays = endDate - startDate
   - refundAmount = (daysRemaining / totalDays) * creditsSpent
   - Minimum 1 day must have passed (no same-day full refund)
3. BEGIN TRANSACTION
4. Update Promotion status = 'cancelled'
5. Create CreditTransaction (type: 'refund', positive amount)
6. Add credits back to org balance
7. Reset Construction displayOptions
8. COMMIT TRANSACTION
9. Return { creditsRefunded, newBalance }
```

### 5.4 Promotion Expiration Flow (Cron Job)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROMOTION EXPIRATION (DAILY CRON)                     │
└─────────────────────────────────────────────────────────────────────────┘

1. Vercel Cron runs daily at midnight (Asia/Ho_Chi_Minh timezone)
2. Query: promotions WHERE status='active' AND endDate < NOW()
3. For each expired promotion:
   a. Update promotion.status = 'expired'
   b. Snapshot final analytics
   c. Reset construction.displayOptions to defaults
   d. Send notification email to sponsor
```

---

## 6. Credit Balance Management

### 6.1 Balance Calculation

The credit balance is stored on the Organization document but can be verified by summing all transactions:

```typescript
// Verify balance integrity
async function verifyBalance(organizationId: string): Promise<boolean> {
  const org = await payload.findByID({ collection: 'organizations', id: organizationId });

  const transactions = await payload.find({
    collection: 'credit-transactions',
    where: { organization: { equals: organizationId } },
    limit: 0, // Get all
  });

  const calculatedBalance = transactions.docs.reduce((sum, tx) => sum + tx.amount, 0);

  return org.billing.creditBalance === calculatedBalance;
}
```

### 6.2 Atomic Balance Updates

All balance modifications must be atomic to prevent race conditions:

```typescript
// Use Payload's transaction support
async function deductCredits(organizationId: string, amount: number, description: string) {
  return await payload.db.transaction(async (tx) => {
    // Lock and read current balance
    const org = await payload.findByID({
      collection: 'organizations',
      id: organizationId,
      // Use SELECT FOR UPDATE equivalent
    });

    if (org.billing.creditBalance < amount) {
      throw new InsufficientCreditsError();
    }

    const newBalance = org.billing.creditBalance - amount;

    // Create transaction record
    await payload.create({
      collection: 'credit-transactions',
      data: {
        organization: organizationId,
        type: 'promotion',
        amount: -amount, // Negative for debit
        balanceBefore: org.billing.creditBalance,
        balanceAfter: newBalance,
        description,
      },
    });

    // Update balance
    await payload.update({
      collection: 'organizations',
      id: organizationId,
      data: {
        billing: {
          creditBalance: newBalance,
          totalCreditsSpent: org.billing.totalCreditsSpent + amount,
        },
      },
    });

    return newBalance;
  });
}
```

### 6.3 Bonus Credit Tiers

```typescript
function calculateBonus(amount: number): { bonus: number; percentage: number } {
  if (amount >= 10_000_000) return { bonus: amount * 0.25, percentage: 25 };
  if (amount >= 5_000_000) return { bonus: amount * 0.20, percentage: 20 };
  if (amount >= 3_000_000) return { bonus: amount * 0.15, percentage: 15 };
  if (amount >= 1_000_000) return { bonus: amount * 0.10, percentage: 10 };
  if (amount >= 500_000) return { bonus: amount * 0.05, percentage: 5 };
  return { bonus: 0, percentage: 0 };
}
```

---

## 7. File Structure

```
src/
├── collections/
│   ├── CreditTransactions.ts     # NEW - All credit movements
│   ├── CreditTopupHistory.ts     # NEW - Stripe payment records
│   ├── PromotionPackages.ts      # NEW - Package definitions
│   ├── Promotions.ts             # NEW - Active promotions
│   ├── Organizations.ts          # MODIFY - Add billing group
│   └── Constructions.ts          # MODIFY - Add activePromotion
│
├── app/api/
│   ├── sponsor/
│   │   ├── credits/
│   │   │   ├── topup/route.ts         # POST - Create checkout session
│   │   │   ├── balance/route.ts       # GET - Current balance
│   │   │   ├── transactions/route.ts  # GET - Transaction history
│   │   │   └── topup-history/route.ts # GET - Payment history
│   │   └── promotions/
│   │       ├── route.ts               # GET list, POST purchase
│   │       ├── packages/route.ts      # GET available packages
│   │       └── [id]/
│   │           ├── route.ts           # GET details
│   │           └── cancel/route.ts    # POST cancel
│   ├── webhooks/
│   │   └── stripe/route.ts            # Stripe webhooks
│   └── cron/
│       └── expire-promotions/route.ts # Daily cron job
│
├── lib/
│   ├── stripe/
│   │   ├── client.ts              # Stripe client initialization
│   │   ├── checkout.ts            # Create checkout sessions
│   │   └── webhooks.ts            # Webhook event handlers
│   ├── credits/
│   │   ├── balance.ts             # Balance operations
│   │   ├── transactions.ts        # Transaction creation
│   │   ├── bonus.ts               # Bonus calculation
│   │   └── validation.ts          # Amount validation
│   └── promotions/
│       ├── purchase.ts            # Purchase with credits
│       ├── cancel.ts              # Cancellation logic
│       └── expiration.ts          # Expiration handling
│
├── components/
│   └── Sponsor/
│       ├── CreditBalance.tsx      # Display current balance
│       ├── TopupForm.tsx          # Credit top-up form
│       ├── TopupPackages.tsx      # Predefined amount buttons
│       ├── TransactionHistory.tsx # Credit transaction list
│       ├── PromotionPackages.tsx  # Available promotions
│       ├── PromotionPurchase.tsx  # Purchase flow
│       └── ActivePromotions.tsx   # List active promotions
│
└── app/[locale]/(sponsor)/
    └── dashboard/
        ├── billing/
        │   └── page.tsx           # Credit management page
        ├── promotions/
        │   └── page.tsx           # Promotions overview
        └── constructions/
            └── [id]/
                └── promote/
                    └── page.tsx   # Promote specific construction
```

---

## 8. Security Considerations

### 8.1 Credit System Security

1. **Atomic Transactions**: All balance modifications use database transactions
2. **Balance Verification**: Periodic job verifies balance = sum of transactions
3. **Audit Trail**: Every credit movement is logged in CreditTransactions
4. **Idempotency**: Stripe webhooks use idempotency keys to prevent double-crediting

### 8.2 Access Control

- Only `sponsor_admin` can top-up credits
- Both `sponsor_admin` and `sponsor_user` can purchase promotions
- Balance and transaction history visible to all org members
- Admin can make manual adjustments with audit logging

### 8.3 Webhook Security

```typescript
// Verify Stripe signature
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Check idempotency
const processed = await kv.get(`stripe_event:${event.id}`);
if (processed) {
  return new Response('Already processed', { status: 200 });
}

// Process event...

// Mark as processed
await kv.set(`stripe_event:${event.id}`, true, { ex: 86400 * 7 }); // 7 days
```

### 8.4 Rate Limiting

- Top-up requests: 5 per hour per organization
- Promotion purchases: 20 per hour per organization
- Balance queries: 100 per minute per user

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Install Stripe SDK (`npm install stripe @stripe/stripe-js`)
- [ ] Create Stripe client initialization
- [ ] Create new Payload collections:
  - [ ] CreditTransactions
  - [ ] CreditTopupHistory
  - [ ] PromotionPackages
  - [ ] Promotions
- [ ] Modify Organizations collection (add billing group)
- [ ] Run migrations

### Phase 2: Credit Top-up (Week 1-2)
- [ ] Create `/api/sponsor/credits/topup` endpoint
- [ ] Implement Stripe Checkout with dynamic amounts
- [ ] Create webhook handler for `checkout.session.completed`
- [ ] Implement balance update logic with transactions
- [ ] Build TopupForm component
- [ ] Build CreditBalance component

### Phase 3: Promotion System (Week 2)
- [ ] Seed PromotionPackages collection with initial data
- [ ] Create `/api/sponsor/promotions/purchase` endpoint
- [ ] Implement credit deduction with atomic transactions
- [ ] Update Construction displayOptions on purchase
- [ ] Build PromotionPackages component
- [ ] Build PromotionPurchase flow

### Phase 4: Promotion Lifecycle (Week 3)
- [ ] Create Vercel Cron job for expiration
- [ ] Implement promotion expiration logic
- [ ] Create cancellation endpoint with prorated refunds
- [ ] Build ActivePromotions management UI
- [ ] Add notification emails

### Phase 5: Polish & Testing (Week 3-4)
- [ ] Build transaction history UI
- [ ] Add comprehensive error handling
- [ ] Implement balance verification job
- [ ] Write integration tests
- [ ] Test with Stripe test mode
- [ ] Add admin tools for adjustments

---

## 10. Testing Strategy

### 10.1 Stripe Test Mode

```bash
# Local webhook testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Test card: `4242424242424242`

### 10.2 Test Scenarios

1. **Top-up Happy Path**: Complete payment, verify credits added
2. **Top-up with Bonus**: 1M VND → 1.1M credits (10% bonus)
3. **Failed Payment**: Card declined, no credits added
4. **Promotion Purchase**: Verify balance deduction + promotion activation
5. **Insufficient Credits**: Attempt purchase with low balance
6. **Promotion Cancellation**: Verify prorated refund
7. **Concurrent Purchases**: Race condition handling
8. **Balance Integrity**: Verify balance matches transaction sum
9. **Expiration**: Cron job correctly expires promotions

---

## 11. Monitoring & Alerts

### 11.1 Metrics

- Daily top-up volume (VND)
- Credit usage rate
- Promotion conversion rate
- Average credit balance
- Failed payment rate

### 11.2 Alerts

- Balance mismatch detected (sum ≠ stored balance)
- High rate of failed payments
- Unusual refund activity
- Webhook processing failures

---

## 12. Future Enhancements

1. **Credit Gifting**: Transfer credits between organizations
2. **Auto-renewal**: Automatically renew promotions when expiring
3. **Bulk Discounts**: Discount when promoting multiple constructions
4. **Credit Expiry**: Optional expiry for promotional bonus credits
5. **Multiple Currencies**: USD support with exchange rate
6. **Invoice Generation**: PDF invoices for top-ups
7. **Spending Limits**: Organization-level spending controls
8. **Credit Alerts**: Notify when balance is low

---

## Summary

This Credit-based system provides:

1. **Simple Payment Flow**: Sponsors only interact with Stripe when loading credits
2. **Instant Promotions**: No payment delay when activating promotions
3. **Transparent Pricing**: All costs shown in VND
4. **Bonus Incentives**: Higher top-ups receive bonus credits
5. **Full Audit Trail**: Every credit movement is tracked
6. **Flexible Cancellation**: Prorated refunds for early cancellation

The system separates the **payment concern** (Stripe) from the **promotion concern** (internal credits), making it easier to manage, audit, and extend in the future.
