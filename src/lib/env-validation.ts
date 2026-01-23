/**
 * Environment Variable Validation
 *
 * This module validates that all required environment variables are set
 * before the application starts. This prevents runtime failures due to
 * missing configuration.
 *
 * Security: Ensures critical secrets are not missing in production.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Required environment variables that MUST be set
const REQUIRED_ENV_VARS = [
  'PAYLOAD_SECRET',
  'DATABASE_URL',
] as const;

// Required in production only
const PRODUCTION_REQUIRED_ENV_VARS = [
  'CRON_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME',
] as const;

// Recommended but not strictly required
const RECOMMENDED_ENV_VARS = [
  'SCRAPER_API_KEY',
  'SMTP_HOST',
] as const;

/**
 * Validates environment variables and returns validation result
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  // Check for actual production runtime, not just NODE_ENV=production (which is also set during builds)
  // VERCEL_ENV is set by Vercel, RAILWAY_ENVIRONMENT by Railway, etc.
  const isProductionRuntime =
    process.env.NODE_ENV === 'production' &&
    (process.env.VERCEL_ENV === 'production' ||
      process.env.RAILWAY_ENVIRONMENT === 'production' ||
      process.env.IS_PRODUCTION_RUNTIME === 'true');

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Check production-required variables (only at actual runtime, not during builds)
  if (isProductionRuntime) {
    for (const envVar of PRODUCTION_REQUIRED_ENV_VARS) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable for production: ${envVar}`);
      }
    }
  }

  // Check recommended variables (warnings only)
  for (const envVar of RECOMMENDED_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(`Recommended environment variable not set: ${envVar}`);
    }
  }

  // Validate PAYLOAD_SECRET strength
  const payloadSecret = process.env.PAYLOAD_SECRET;
  if (payloadSecret) {
    if (payloadSecret.length < 32) {
      errors.push('PAYLOAD_SECRET must be at least 32 characters long');
    }
    if (payloadSecret === 'development-secret-change-me') {
      errors.push('PAYLOAD_SECRET is set to the default value. Please change it to a secure random string.');
    }
    if (isProductionRuntime && /^(dev|test|local|example|change)/i.test(payloadSecret)) {
      errors.push('PAYLOAD_SECRET appears to be a development/example value. Use a secure random string in production.');
    }
  }

  // Validate CRON_SECRET strength in production
  const cronSecret = process.env.CRON_SECRET;
  if (isProductionRuntime && cronSecret && cronSecret.length < 32) {
    errors.push('CRON_SECRET must be at least 32 characters long in production');
  }

  // Validate DATABASE_URL format
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.startsWith('postgres')) {
    warnings.push('DATABASE_URL does not appear to be a PostgreSQL connection string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment and throws if invalid
 * Call this at application startup
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironment();

  // Log warnings
  for (const warning of result.warnings) {
    console.warn(`[ENV WARNING] ${warning}`);
  }

  // Throw on errors
  if (!result.valid) {
    const errorMessage = [
      'Environment validation failed:',
      ...result.errors.map(e => `  - ${e}`),
    ].join('\n');

    throw new Error(errorMessage);
  }
}

/**
 * Get a required environment variable or throw
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}
