import { getPayload } from 'payload';
import config from '@payload-config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory =
  | 'api'
  | 'auth'
  | 'database'
  | 'scraper'
  | 'cache'
  | 'cron'
  | 'system'
  | 'workflow';

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: Record<string, unknown>;
  error?: Error | string;
  source?: string;
  userId?: string | number;
  requestId?: string;
  duration?: number;
}

// In-memory queue for batching log writes
const logQueue: LogEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;
const FLUSH_INTERVAL = 1000; // Flush every 1 second
const MAX_QUEUE_SIZE = 50; // Flush when queue reaches this size

// Flag to track if we're currently flushing
let isFlushing = false;

/**
 * Flush the log queue to the database
 */
async function flushLogs(): Promise<void> {
  if (isFlushing || logQueue.length === 0) return;

  isFlushing = true;
  const logsToWrite = [...logQueue];
  logQueue.length = 0;

  try {
    const payload = await getPayload({ config });

    // Write logs in parallel for better performance
    await Promise.all(
      logsToWrite.map((log) =>
        payload.create({
          collection: 'logs',
          data: {
            level: log.level,
            category: log.category,
            message: log.message,
            context: log.context,
            error:
              log.error instanceof Error
                ? `${log.error.message}\n${log.error.stack}`
                : log.error,
            source: log.source,
            userId: log.userId,
            requestId: log.requestId,
            duration: log.duration,
            timestamp: new Date().toISOString(),
          },
        })
      )
    );
  } catch (err) {
    // If we can't write to the database, fall back to console
    // eslint-disable-next-line no-console
    console.error('Failed to persist logs:', err);
    logsToWrite.forEach((log) => {
      // eslint-disable-next-line no-console
      console.log(`[${log.level.toUpperCase()}] [${log.category}] ${log.message}`, log.context);
    });
  } finally {
    isFlushing = false;
  }
}

/**
 * Schedule a flush of the log queue
 */
function scheduleFlush(): void {
  if (flushTimeout) return;

  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushLogs();
  }, FLUSH_INTERVAL);
}

/**
 * Add a log entry to the queue
 */
function queueLog(entry: LogEntry): void {
  logQueue.push(entry);

  // Flush immediately if queue is full
  if (logQueue.length >= MAX_QUEUE_SIZE) {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    flushLogs();
  } else {
    scheduleFlush();
  }
}

/**
 * Persistent logger that stores logs in the Payload Logs collection
 */
export const persistentLogger = {
  debug(category: LogCategory, message: string, context?: Record<string, unknown>): void {
    queueLog({ level: 'debug', category, message, context });
  },

  info(category: LogCategory, message: string, context?: Record<string, unknown>): void {
    queueLog({ level: 'info', category, message, context });
  },

  warn(category: LogCategory, message: string, context?: Record<string, unknown>): void {
    queueLog({ level: 'warn', category, message, context });
  },

  error(
    category: LogCategory,
    message: string,
    error?: Error | string,
    context?: Record<string, unknown>
  ): void {
    queueLog({ level: 'error', category, message, error, context });
  },

  /**
   * Log with full options
   */
  log(entry: LogEntry): void {
    queueLog(entry);
  },

  /**
   * Force flush all pending logs (useful before process exit)
   */
  async flush(): Promise<void> {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    await flushLogs();
  },
};

// Category-specific loggers for convenience
export const apiLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.debug('api', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.info('api', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.warn('api', message, context),
  error: (message: string, error?: Error | string, context?: Record<string, unknown>) =>
    persistentLogger.error('api', message, error, context),
};

export const authLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.debug('auth', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.info('auth', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.warn('auth', message, context),
  error: (message: string, error?: Error | string, context?: Record<string, unknown>) =>
    persistentLogger.error('auth', message, error, context),
};

export const scraperLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.debug('scraper', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.info('scraper', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.warn('scraper', message, context),
  error: (message: string, error?: Error | string, context?: Record<string, unknown>) =>
    persistentLogger.error('scraper', message, error, context),
};

export const cacheLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.debug('cache', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.info('cache', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.warn('cache', message, context),
  error: (message: string, error?: Error | string, context?: Record<string, unknown>) =>
    persistentLogger.error('cache', message, error, context),
};

export const cronLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.debug('cron', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.info('cron', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.warn('cron', message, context),
  error: (message: string, error?: Error | string, context?: Record<string, unknown>) =>
    persistentLogger.error('cron', message, error, context),
};

export const systemLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.debug('system', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.info('system', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.warn('system', message, context),
  error: (message: string, error?: Error | string, context?: Record<string, unknown>) =>
    persistentLogger.error('system', message, error, context),
};

export const workflowLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.debug('workflow', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.info('workflow', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.warn('workflow', message, context),
  error: (message: string, error?: Error | string, context?: Record<string, unknown>) =>
    persistentLogger.error('workflow', message, error, context),
};

export const databaseLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.debug('database', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.info('database', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    persistentLogger.warn('database', message, context),
  error: (message: string, error?: Error | string, context?: Record<string, unknown>) =>
    persistentLogger.error('database', message, error, context),
};

export default persistentLogger;
