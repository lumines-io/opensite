# Authentication System

## Overview

The Authentication System provides secure user registration, login, email verification, and password management. It uses cookie-based sessions with JWT tokens managed by Payload CMS.

## Authentication Flow

### Session Management

- **Cookie-based sessions** using `payload-token`
- **2-hour token expiration**
- **Secure, HttpOnly, SameSite Lax** cookie settings
- **Automatic refresh** on activity

## Features

### User Registration

Users can create accounts with:

- **Name** - Display name
- **Email** - Unique, used for login
- **Password** - Minimum 8 characters

Registration process:
1. User submits registration form
2. Server validates input
3. User record created (unverified)
4. Verification email sent
5. User redirected to verification page

### Email Verification

Required for contributing:

1. User receives email with verification link
2. Link contains unique token
3. Clicking link verifies account
4. Token expires after 24 hours

### Login

Standard email/password authentication:

1. User enters credentials
2. Server validates against database
3. On success: Sets session cookie, redirects
4. On failure: Returns error message

### Password Reset

Self-service password recovery:

1. User requests reset via email
2. Reset token generated and emailed
3. User clicks link, enters new password
4. Token validated, password updated
5. All existing sessions invalidated

### Logout

Clean session termination:

1. Session cookie cleared
2. Token invalidated server-side
3. User redirected to home

## User Roles

| Role | Level | Capabilities |
|------|-------|--------------|
| `contributor` | Base | Submit suggestions, view own data |
| `moderator` | Elevated | Review/manage suggestions |
| `admin` | Full | All permissions + system access |

### Role Hierarchy

```
admin > moderator > contributor
```

Each role inherits permissions from lower roles.

## API Reference

### Register

```
POST /api/auth/register

Body:
{
  name: string,
  email: string,
  password: string
}

Response:
{
  success: true,
  message: "Registration successful. Please verify your email."
}

Errors:
- 400: Invalid input
- 409: Email already exists
```

### Login

```
POST /api/auth/login

Body:
{
  email: string,
  password: string
}

Response:
{
  success: true,
  user: {
    id: string,
    name: string,
    email: string,
    role: string,
    verified: boolean
  },
  token: string
}

Errors:
- 401: Invalid credentials
- 403: Email not verified (for certain actions)
```

### Get Current User

```
GET /api/auth/me

Headers:
  Cookie: payload-token=xxx

Response:
{
  user: {
    id: string,
    name: string,
    email: string,
    role: string,
    verified: boolean,
    reputation: number
  }
}

Errors:
- 401: Not authenticated
```

### Logout

```
POST /api/auth/logout

Response:
{
  success: true
}
```

### Forgot Password

```
POST /api/auth/forgot-password

Body:
{
  email: string
}

Response:
{
  success: true,
  message: "If an account exists, a reset email has been sent."
}
```

### Reset Password

```
POST /api/auth/reset-password

Body:
{
  token: string,
  password: string
}

Response:
{
  success: true,
  message: "Password has been reset."
}

Errors:
- 400: Invalid or expired token
```

### Verify Email

```
POST /api/auth/verify-email

Body:
{
  token: string
}

Response:
{
  success: true,
  message: "Email verified successfully."
}

Errors:
- 400: Invalid or expired token
```

### Resend Verification

```
POST /api/auth/resend-verification

Body:
{
  email: string
}

Response:
{
  success: true,
  message: "Verification email sent."
}
```

## User Interface

### Login Page (`/login`)

```
┌────────────────────────────────────┐
│           Welcome Back             │
├────────────────────────────────────┤
│                                    │
│  Email                             │
│  [____________________________]    │
│                                    │
│  Password                          │
│  [____________________________]    │
│                                    │
│  [Forgot password?]                │
│                                    │
│  [          Login          ]       │
│                                    │
│  Don't have an account? Register   │
└────────────────────────────────────┘
```

### Register Page (`/register`)

```
┌────────────────────────────────────┐
│         Create Account             │
├────────────────────────────────────┤
│                                    │
│  Name                              │
│  [____________________________]    │
│                                    │
│  Email                             │
│  [____________________________]    │
│                                    │
│  Password                          │
│  [____________________________]    │
│                                    │
│  Confirm Password                  │
│  [____________________________]    │
│                                    │
│  [         Register        ]       │
│                                    │
│  Already have an account? Login    │
└────────────────────────────────────┘
```

### Verify Email Page (`/verify-email`)

States:
1. **Pending** - Waiting for verification
2. **Success** - Email verified
3. **Error** - Invalid/expired token

### Forgot Password Page (`/forgot-password`)

Simple email input form with success message.

### Reset Password Page (`/reset-password`)

New password form with confirmation field.

## Security Measures

### Password Requirements

- Minimum 8 characters
- Hashed using bcrypt
- Salt rounds: 10

### Token Security

- **Session tokens** - JWT with short expiry
- **Reset tokens** - UUID, single-use, 1-hour expiry
- **Verification tokens** - UUID, single-use, 24-hour expiry

### Rate Limiting

- Login: 5 attempts per 15 minutes
- Registration: 3 per hour
- Password reset: 3 per hour
- Verification resend: 3 per hour

### CSRF Protection

- SameSite cookie attribute
- Origin header validation
- Token validation on mutations

## Protected Routes

Routes requiring authentication:

| Route | Required Role |
|-------|---------------|
| `/suggest` | contributor (verified) |
| `/suggestions` | contributor |
| `/profile` | contributor |
| `/moderator/*` | moderator |
| `/admin/*` | admin |

### Middleware

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('payload-token');

  if (isProtectedRoute(request.pathname)) {
    if (!token) {
      return redirectToLogin(request);
    }
    // Validate token and role
  }
}
```

## Email Templates

### Verification Email

Subject: `Verify your email address`

```
Welcome to HCMC Road Construction Tracker!

Please click the link below to verify your email address:
[Verify Email Button]

This link expires in 24 hours.

If you didn't create an account, please ignore this email.
```

### Password Reset Email

Subject: `Reset your password`

```
Hi {name},

You requested a password reset for your account.

Click the link below to set a new password:
[Reset Password Button]

This link expires in 1 hour.

If you didn't request this, please ignore this email.
```

## Feature Flag

**Flag:** `FEATURE_USER_REGISTRATION`

When disabled:
- Registration form hidden
- `/register` redirects to login
- Registration API returns 403
- Existing users can still login

## Environment Variables

```env
# Email configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password

# Development email (Ethereal)
ETHEREAL_USER=test@ethereal.email
ETHEREAL_PASS=password

# Server URL (for email links)
NEXT_PUBLIC_SERVER_URL=https://example.com
```

## Components

- `LoginForm` - Login form component
- `RegisterForm` - Registration form
- `UserMenu` - User dropdown menu
- `AuthPageTemplate` - Auth page layout

## Related Files

- `src/app/(frontend)/login/page.tsx`
- `src/app/(frontend)/register/page.tsx`
- `src/app/(frontend)/verify-email/page.tsx`
- `src/app/(frontend)/forgot-password/page.tsx`
- `src/app/(frontend)/reset-password/page.tsx`
- `src/app/api/auth/*/route.ts`
- `src/collections/Users.ts`
- `src/middleware.ts`
