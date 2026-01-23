/**
 * Brute Force Protection
 *
 * Provides rate limiting and account lockout protection for authentication endpoints.
 * Uses in-memory storage by default, with optional Redis backend for distributed systems.
 */

import { logSecurityEvent, maskEmail, maskIp } from './security-logger';

// Configuration
const MAX_ATTEMPTS = 5; // Maximum failed attempts before lockout
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minute window for counting attempts
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up expired entries every 5 minutes

interface AttemptRecord {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// In-memory storage for attempt tracking
// In production with multiple instances, use Redis instead
const attemptsByEmail = new Map<string, AttemptRecord>();
const attemptsByIp = new Map<string, AttemptRecord>();

// Cleanup expired records periodically
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptsByEmail) {
      if (record.lockedUntil && record.lockedUntil < now) {
        attemptsByEmail.delete(key);
      } else if (record.firstAttempt + ATTEMPT_WINDOW_MS < now) {
        attemptsByEmail.delete(key);
      }
    }
    for (const [key, record] of attemptsByIp) {
      if (record.lockedUntil && record.lockedUntil < now) {
        attemptsByIp.delete(key);
      } else if (record.firstAttempt + ATTEMPT_WINDOW_MS < now) {
        attemptsByIp.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

startCleanup();

export interface BruteForceCheckResult {
  allowed: boolean;
  reason?: 'email_locked' | 'ip_locked' | 'too_many_attempts';
  retryAfter?: number; // seconds until lockout expires
  remainingAttempts?: number;
}

/**
 * Check if a login attempt should be allowed
 */
export function checkBruteForce(email: string, ip: string): BruteForceCheckResult {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase();

  // Check email lockout
  const emailRecord = attemptsByEmail.get(normalizedEmail);
  if (emailRecord?.lockedUntil && emailRecord.lockedUntil > now) {
    return {
      allowed: false,
      reason: 'email_locked',
      retryAfter: Math.ceil((emailRecord.lockedUntil - now) / 1000),
    };
  }

  // Check IP lockout
  const ipRecord = attemptsByIp.get(ip);
  if (ipRecord?.lockedUntil && ipRecord.lockedUntil > now) {
    return {
      allowed: false,
      reason: 'ip_locked',
      retryAfter: Math.ceil((ipRecord.lockedUntil - now) / 1000),
    };
  }

  // Calculate remaining attempts for email
  let remainingAttempts = MAX_ATTEMPTS;
  if (emailRecord && emailRecord.firstAttempt + ATTEMPT_WINDOW_MS > now) {
    remainingAttempts = Math.max(0, MAX_ATTEMPTS - emailRecord.attempts);
  }

  return {
    allowed: true,
    remainingAttempts,
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string, ip: string): void {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase();

  // Update email record
  let emailRecord = attemptsByEmail.get(normalizedEmail);
  if (!emailRecord || emailRecord.firstAttempt + ATTEMPT_WINDOW_MS < now) {
    emailRecord = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
  } else {
    emailRecord.attempts++;
    emailRecord.lastAttempt = now;
  }

  // Check if we should lock the email
  if (emailRecord.attempts >= MAX_ATTEMPTS) {
    emailRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
    logSecurityEvent('auth_account_locked', {
      email: maskEmail(normalizedEmail),
      ip: maskIp(ip),
      attempts: emailRecord.attempts,
      lockoutMinutes: LOCKOUT_DURATION_MS / 60000,
    });
  }

  attemptsByEmail.set(normalizedEmail, emailRecord);

  // Update IP record
  let ipRecord = attemptsByIp.get(ip);
  if (!ipRecord || ipRecord.firstAttempt + ATTEMPT_WINDOW_MS < now) {
    ipRecord = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
  } else {
    ipRecord.attempts++;
    ipRecord.lastAttempt = now;
  }

  // Lock IP if too many attempts (higher threshold than email)
  const IP_MAX_ATTEMPTS = MAX_ATTEMPTS * 3; // 15 attempts from same IP
  if (ipRecord.attempts >= IP_MAX_ATTEMPTS) {
    ipRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
    logSecurityEvent('auth_brute_force_attempt', {
      ip: maskIp(ip),
      attempts: ipRecord.attempts,
      lockoutMinutes: LOCKOUT_DURATION_MS / 60000,
    });
  }

  attemptsByIp.set(ip, ipRecord);
}

/**
 * Clear attempts after successful login
 */
export function clearAttempts(email: string, ip: string): void {
  const normalizedEmail = email.toLowerCase();
  attemptsByEmail.delete(normalizedEmail);
  // Don't clear IP record - could be shared IP
}

/**
 * Manually unlock an email (for admin use)
 */
export function unlockEmail(email: string): void {
  const normalizedEmail = email.toLowerCase();
  attemptsByEmail.delete(normalizedEmail);
  logSecurityEvent('auth_account_unlocked', {
    email: maskEmail(normalizedEmail),
    unlockedBy: 'admin',
  });
}

/**
 * Get lockout status for an email
 */
export function getLockoutStatus(email: string): { locked: boolean; retryAfter?: number } {
  const normalizedEmail = email.toLowerCase();
  const record = attemptsByEmail.get(normalizedEmail);

  if (!record?.lockedUntil) {
    return { locked: false };
  }

  const now = Date.now();
  if (record.lockedUntil <= now) {
    attemptsByEmail.delete(normalizedEmail);
    return { locked: false };
  }

  return {
    locked: true,
    retryAfter: Math.ceil((record.lockedUntil - now) / 1000),
  };
}

/**
 * Get statistics for monitoring
 */
export function getBruteForceStats(): {
  lockedEmails: number;
  lockedIps: number;
  totalTrackedEmails: number;
  totalTrackedIps: number;
} {
  const now = Date.now();
  let lockedEmails = 0;
  let lockedIps = 0;

  for (const record of attemptsByEmail.values()) {
    if (record.lockedUntil && record.lockedUntil > now) {
      lockedEmails++;
    }
  }

  for (const record of attemptsByIp.values()) {
    if (record.lockedUntil && record.lockedUntil > now) {
      lockedIps++;
    }
  }

  return {
    lockedEmails,
    lockedIps,
    totalTrackedEmails: attemptsByEmail.size,
    totalTrackedIps: attemptsByIp.size,
  };
}
