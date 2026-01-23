# Registration Flow

## Overview

This document describes the user registration process for creating a new account on the HCMC Road Construction Tracker.

## Prerequisites

- **Feature Flag:** `FEATURE_USER_REGISTRATION` must be enabled
- Valid email address
- Password meeting requirements

## Registration Journey

```
┌───────────────────────────────────────────────────────────────────┐
│                     REGISTRATION FLOW                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│   │   Access    │ ─► │   Fill      │ ─► │     Submit          │  │
│   │   Register  │    │   Form      │    │     Form            │  │
│   │   Page      │    │             │    │                     │  │
│   └─────────────┘    └─────────────┘    └──────────┬──────────┘  │
│                                                     │             │
│                                                     ▼             │
│                                          ┌─────────────────────┐  │
│                                          │   Verification      │  │
│                                          │   Email Sent        │  │
│                                          └──────────┬──────────┘  │
│                                                     │             │
│                                                     ▼             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│   │   Account   │ ◄─ │   Email     │ ◄─ │   Check Email       │  │
│   │   Verified  │    │   Clicked   │    │   Inbox             │  │
│   └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Flow

### Step 1: Access Registration Page

**URL:** `/register`

**Entry Points:**
- Click "Register" in header
- Click "Create Account" from login prompt
- Direct URL access
- Redirect from protected route

**Page Layout:**
```
┌────────────────────────────────────────────────────────┐
│                   Create Account                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Join the community and help track construction        │
│  projects across Ho Chi Minh City.                     │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Name                                              │  │
│  │ [_____________________________________________]   │  │
│  │                                                   │  │
│  │ Email                                             │  │
│  │ [_____________________________________________]   │  │
│  │                                                   │  │
│  │ Password                                          │  │
│  │ [_____________________________________________]   │  │
│  │ ○○○○○○○○ (strength indicator)                    │  │
│  │                                                   │  │
│  │ Confirm Password                                  │  │
│  │ [_____________________________________________]   │  │
│  │                                                   │  │
│  │ [          Create Account          ]              │  │
│  │                                                   │  │
│  │ By creating an account, you agree to our         │  │
│  │ Terms of Service and Privacy Policy.             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Already have an account? [Sign in]                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Step 2: Fill Registration Form

**Required Fields:**

| Field | Requirements |
|-------|--------------|
| Name | 2-100 characters |
| Email | Valid email format, unique |
| Password | Minimum 8 characters |
| Confirm Password | Must match password |

**Password Requirements:**
- Minimum 8 characters
- (Additional requirements if configured)

**Real-time Validation:**
- Email format check on blur
- Password strength indicator
- Confirm password match check

### Step 3: Submit Form

**On Submit:**
1. Client-side validation runs
2. Form disabled during submission
3. API request sent to `/api/auth/register`

**API Request:**
```
POST /api/auth/register

Body:
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Possible Responses:**

**Success (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Email Already Exists (409):**
```json
{
  "error": "An account with this email already exists."
}
```

**Invalid Input (400):**
```json
{
  "error": "Password must be at least 8 characters."
}
```

**Registration Disabled (403):**
```json
{
  "error": "Registration is currently disabled."
}
```

### Step 4: Verification Email

**On Successful Registration:**

1. User record created in database
2. Verification token generated (24-hour expiry)
3. Verification email queued
4. User redirected to verification pending page

**Email Content:**
```
Subject: Verify your email address

Hi [Name],

Welcome to HCMC Road Construction Tracker!

Please verify your email address by clicking the button below:

[Verify Email Address]

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
HCMC Road Construction Tracker Team
```

**Verification Pending Page:**

```
┌────────────────────────────────────────────────────────┐
│                 📧 Check Your Email                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  We've sent a verification link to:                    │
│  user@example.com                                      │
│                                                        │
│  Please click the link in the email to verify          │
│  your account and start contributing.                  │
│                                                        │
│  Didn't receive the email?                             │
│  • Check your spam folder                              │
│  • Make sure user@example.com is correct               │
│                                                        │
│  [Resend Verification Email]                           │
│                                                        │
│  [← Back to Login]                                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Step 5: Email Verification

**User Clicks Email Link:**

**URL:** `/verify-email?token=[verification-token]`

**Process:**
1. Page loads with token from URL
2. API request to verify token
3. Response determines next action

**API Request:**
```
POST /api/auth/verify-email

Body:
{
  "token": "verification-token-string"
}
```

**Possible Outcomes:**

**Success:**
```
┌────────────────────────────────────────────────────────┐
│                   ✓ Email Verified!                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Your email has been verified successfully.            │
│                                                        │
│  You can now:                                          │
│  • Submit suggestions for new projects                 │
│  • Propose updates to existing projects                │
│  • Report corrections                                  │
│                                                        │
│  [Continue to Login]                                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Invalid/Expired Token:**
```
┌────────────────────────────────────────────────────────┐
│                   ⚠️ Verification Failed               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  This verification link is invalid or has expired.    │
│                                                        │
│  Please request a new verification email.             │
│                                                        │
│  [Request New Link]                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Already Verified:**
```
┌────────────────────────────────────────────────────────┐
│                   ℹ️ Already Verified                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Your email has already been verified.                 │
│                                                        │
│  [Continue to Login]                                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Resend Verification Email

**URL:** `/verify-email` (when logged in but unverified)

**Process:**
1. User requests new verification email
2. Rate limited (3 per hour)
3. Previous token invalidated
4. New token generated and sent

**API Request:**
```
POST /api/auth/resend-verification

Body:
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent."
}
```

## Error Handling

### Form Validation Errors

| Error | Display Location |
|-------|------------------|
| Name too short | Below name field |
| Invalid email format | Below email field |
| Email already exists | Below email field |
| Password too short | Below password field |
| Passwords don't match | Below confirm field |

### Server Errors

```
┌────────────────────────────────────────────────────────┐
│                   ⚠️ Registration Failed               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  We couldn't create your account. Please try again.   │
│                                                        │
│  If the problem persists, please contact support.     │
│                                                        │
│  [Try Again]                                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Email Delivery Issues

If email doesn't arrive:
1. Check spam/junk folder
2. Verify email address is correct
3. Wait a few minutes
4. Request resend
5. Contact support if persistent

## Post-Registration State

After successful registration and verification:

| Attribute | Value |
|-----------|-------|
| Role | `contributor` |
| Verified | `true` |
| Reputation | `0` |
| Can submit suggestions | Yes |
| Can moderate | No |
| Can access admin | No |

## Registration Disabled State

When `FEATURE_USER_REGISTRATION` is `false`:

**Register Page:**
```
┌────────────────────────────────────────────────────────┐
│                Registration Unavailable                │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Registration is currently closed.                     │
│                                                        │
│  If you already have an account, you can sign in.      │
│                                                        │
│  [Sign In]                                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Analytics Events

| Event | Data |
|-------|------|
| `user.register.start` | Timestamp |
| `user.register.submit` | - |
| `user.register.success` | User ID |
| `user.register.error` | Error type |
| `user.verify.success` | User ID |
| `user.verify.error` | Error type |
| `user.verify.resend` | - |

## Security Considerations

- Password hashed with bcrypt
- Verification token expires in 24 hours
- Rate limiting on registration (3/hour/IP)
- Rate limiting on verification resend
- No password exposed in responses
- HTTPS required in production

## Related Flows

- [Login Flow](./login.md)
- [Contributor Flow](./contributor.md)
- [Password Reset Flow](./password-reset.md)
