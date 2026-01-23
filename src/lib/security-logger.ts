/**
 * Security Event Logger
 *
 * Centralized logging for security-relevant events.
 * This provides structured logging that can be shipped to SIEM systems
 * for security monitoring and alerting.
 */

export type SecurityEventType =
  | 'auth_login_success'
  | 'auth_login_failure'
  | 'auth_logout'
  | 'auth_register'
  | 'auth_password_reset'
  | 'auth_brute_force_attempt'
  | 'auth_account_locked'
  | 'auth_account_unlocked'
  | 'cron_auth_failure'
  | 'api_auth_failure'
  | 'rate_limit_exceeded'
  | 'csrf_failure'
  | 'admin_action'
  | 'suspicious_activity'
  | 'input_validation_failure';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Log a security event
 *
 * In production, this should be connected to a SIEM system
 * For now, it logs to console with a structured format
 */
export function logSecurityEvent(
  type: SecurityEventType,
  data: Record<string, unknown>
): void {
  const event: SecurityEvent = {
    type,
    timestamp: new Date().toISOString(),
    data: sanitizeEventData(data),
  };

  // Use console.warn for security events to distinguish from regular logs
  console.warn('[SECURITY]', JSON.stringify(event));
}

/**
 * Sanitize event data to prevent sensitive information leakage
 */
function sanitizeEventData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization'];

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Extract client info from request for logging
 */
export function getClientInfo(request: Request): Record<string, string> {
  const headers = request.headers;
  return {
    ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
    referer: headers.get('referer') || 'none',
  };
}

/**
 * Mask email for logging (show first 2 chars and domain)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '[invalid-email]';
  const maskedLocal = localPart.length > 2
    ? localPart.substring(0, 2) + '***'
    : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask IP address for privacy (show first 2 octets for IPv4)
 */
export function maskIp(ip: string): string {
  if (ip === 'unknown') return ip;

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }

  // IPv6 - show first 4 groups
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`;
    }
  }

  return '[masked]';
}
