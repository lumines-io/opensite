import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isServer = typeof window === 'undefined';

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    service: 'opensite',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
};

// Create the logger
// NOTE: pino-pretty transport disabled to prevent worker thread conflicts with Next.js dev server
// The transport spawns a worker thread that conflicts with Next.js's Jest workers
const logger = isServer
  ? pino(baseConfig)
  : pino({
      ...baseConfig,
      browser: {
        asObject: true,
      },
    });

// Log categories for structured logging
export const logCategories = {
  API: 'api',
  AUTH: 'auth',
  DATABASE: 'database',
  SCRAPER: 'scraper',
  ANALYTICS: 'analytics',
  SYSTEM: 'system',
} as const;

export type LogCategory = (typeof logCategories)[keyof typeof logCategories];

// Create child loggers for specific categories
export function createLogger(category: LogCategory) {
  return logger.child({ category });
}

// API request logging helper
export interface ApiLogContext {
  method: string;
  path: string;
  status?: number;
  duration?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  query?: Record<string, string>;
  error?: Error | string;
}

export function logApiRequest(context: ApiLogContext) {
  const apiLogger = createLogger(logCategories.API);

  const logData = {
    ...context,
    error: context.error instanceof Error ? context.error.message : context.error,
  };

  if (context.status && context.status >= 500) {
    apiLogger.error(logData, `API Error: ${context.method} ${context.path}`);
  } else if (context.status && context.status >= 400) {
    apiLogger.warn(logData, `API Warning: ${context.method} ${context.path}`);
  } else {
    apiLogger.info(logData, `API Request: ${context.method} ${context.path}`);
  }
}

// Authentication event logging
export interface AuthLogContext {
  event: 'login' | 'logout' | 'register' | 'password_reset' | 'session_expired' | 'unauthorized';
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  reason?: string;
}

export function logAuthEvent(context: AuthLogContext) {
  const authLogger = createLogger(logCategories.AUTH);

  if (context.success) {
    authLogger.info(context, `Auth: ${context.event} successful`);
  } else {
    authLogger.warn(context, `Auth: ${context.event} failed - ${context.reason}`);
  }
}

// Scraper activity logging
export interface ScraperLogContext {
  source: string;
  action: 'fetch' | 'parse' | 'save' | 'error';
  url?: string;
  itemsProcessed?: number;
  duration?: number;
  error?: Error | string;
  metadata?: {
    suggestionTitle?: string;
    suggestionType?: string;
    operation?: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
  };
}

export function logScraperActivity(context: ScraperLogContext) {
  const scraperLogger = createLogger(logCategories.SCRAPER);

  const logData = {
    ...context,
    error: context.error instanceof Error ? context.error.message : context.error,
  };

  if (context.action === 'error') {
    scraperLogger.error(logData, `Scraper Error: ${context.source}`);
  } else {
    const title = context.metadata?.suggestionTitle ? ` "${context.metadata.suggestionTitle}"` : '';
    scraperLogger.info(logData, `Scraper: ${context.action}${title} from ${context.source}`);
  }
}

// Database operation logging
export interface DatabaseLogContext {
  operation: 'query' | 'insert' | 'update' | 'delete' | 'error';
  collection: string;
  duration?: number;
  documentId?: string;
  error?: Error | string;
}

export function logDatabaseOperation(context: DatabaseLogContext) {
  const dbLogger = createLogger(logCategories.DATABASE);

  const logData = {
    ...context,
    error: context.error instanceof Error ? context.error.message : context.error,
  };

  if (context.operation === 'error') {
    dbLogger.error(logData, `Database Error: ${context.collection}`);
  } else if (context.duration && context.duration > 1000) {
    dbLogger.warn(logData, `Slow Query: ${context.collection} took ${context.duration}ms`);
  } else {
    dbLogger.debug(logData, `Database: ${context.operation} on ${context.collection}`);
  }
}

// Analytics event logging
export interface AnalyticsLogContext {
  event: string;
  properties?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

export function logAnalyticsEvent(context: AnalyticsLogContext) {
  const analyticsLogger = createLogger(logCategories.ANALYTICS);
  analyticsLogger.debug(context, `Analytics: ${context.event}`);
}

export default logger;
