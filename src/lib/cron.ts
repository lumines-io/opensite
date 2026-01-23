import { getPayload } from 'payload';
import config from '@/payload.config';
import { cronLogger } from '@/lib/persistent-logger';

export interface CronJobConfig {
  id: string;
  name: string;
  enabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any>;
}

export interface CronLogEntry {
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
}

export interface CronJobLogger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
  getEntries: () => CronLogEntry[];
}

/**
 * Check if a cron job is enabled
 */
export async function isCronJobEnabled(jobName: string): Promise<CronJobConfig | null> {
  try {
    const payload = await getPayload({ config });

    const jobs = await payload.find({
      collection: 'cron-jobs',
      where: {
        name: {
          equals: jobName,
        },
      },
      limit: 1,
    });

    if (jobs.docs.length === 0) {
      return null;
    }

    const job = jobs.docs[0];
    return {
      id: String(job.id),
      name: job.name,
      enabled: job.enabled ?? false,
      config: job.config as Record<string, unknown> | undefined,
    };
  } catch (error) {
    cronLogger.error('Error checking cron job status', error instanceof Error ? error : String(error), { jobName });
    return null;
  }
}

/**
 * Create a logger for cron job execution
 */
export function createCronLogger(): CronJobLogger {
  const entries: CronLogEntry[] = [];

  const log = (level: CronLogEntry['level'], message: string, data?: Record<string, unknown>) => {
    entries.push({
      level,
      message,
      timestamp: new Date(),
      data,
    });
  };

  return {
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warning', message, data),
    error: (message, data) => log('error', message, data),
    debug: (message, data) => log('debug', message, data),
    getEntries: () => entries,
  };
}

/**
 * Start a cron job run and create a log entry
 */
export async function startCronJobRun(
  jobName: string,
  triggeredBy: 'scheduled' | 'manual',
  userId?: string | number
): Promise<string> {
  try {
    const payload = await getPayload({ config });

    const log = await payload.create({
      collection: 'cron-job-logs',
      data: {
        jobName,
        status: 'running',
        triggeredBy,
        triggeredByUser: userId ? userId : undefined,
        startedAt: new Date().toISOString(),
        logs: [],
      },
    });

    // Update the cron job's last run status
    const jobs = await payload.find({
      collection: 'cron-jobs',
      where: { name: { equals: jobName } },
      limit: 1,
    });

    if (jobs.docs.length > 0) {
      await payload.update({
        collection: 'cron-jobs',
        id: jobs.docs[0].id,
        data: {
          lastRunAt: new Date().toISOString(),
          lastRunStatus: 'running',
        },
      });
    }

    return String(log.id);
  } catch (error) {
    cronLogger.error('Error starting cron job run', error instanceof Error ? error : String(error), { jobName });
    throw error;
  }
}

/**
 * Complete a cron job run and update the log entry
 */
export async function completeCronJobRun(
  logId: string,
  status: 'success' | 'failed',
  summary: Record<string, unknown>,
  logs: CronLogEntry[],
  error?: string
): Promise<void> {
  try {
    const payload = await getPayload({ config });

    const logDoc = await payload.findByID({
      collection: 'cron-job-logs',
      id: logId,
    });

    const startedAt = new Date(logDoc.startedAt as string);
    const completedAt = new Date();
    const duration = completedAt.getTime() - startedAt.getTime();

    await payload.update({
      collection: 'cron-job-logs',
      id: logId,
      data: {
        status,
        completedAt: completedAt.toISOString(),
        duration,
        summary,
        logs: logs.map(l => ({
          ...l,
          timestamp: l.timestamp.toISOString(),
        })),
        error,
      },
    });

    // Update the cron job's last run status
    const jobs = await payload.find({
      collection: 'cron-jobs',
      where: { name: { equals: logDoc.jobName } },
      limit: 1,
    });

    if (jobs.docs.length > 0) {
      await payload.update({
        collection: 'cron-jobs',
        id: jobs.docs[0].id,
        data: {
          lastRunStatus: status,
        },
      });
    }
  } catch (err) {
    cronLogger.error('Error completing cron job run', err instanceof Error ? err : String(err), { logId });
    throw err;
  }
}

/**
 * Seed default cron jobs if they don't exist
 */
export async function seedCronJobs(): Promise<void> {
  try {
    const payload = await getPayload({ config });

    const defaultJobs = [
      {
        name: 'translate',
        displayName: 'Auto Translation',
        description: 'Automatically translates missing i18n keys between Vietnamese and English',
        enabled: true,
        schedule: '0 3 * * *',
        endpoint: '/api/cron/translate',
        config: {},
      },
      {
        name: 'scraper',
        displayName: 'News Scraper',
        description: 'Scrapes construction news from various sources',
        enabled: true,
        schedule: '0 */6 * * *',
        endpoint: '/api/cron/scraper',
        config: {},
      },
    ];

    for (const job of defaultJobs) {
      const existing = await payload.find({
        collection: 'cron-jobs',
        where: { name: { equals: job.name } },
        limit: 1,
      });

      if (existing.docs.length === 0) {
        await payload.create({
          collection: 'cron-jobs',
          data: job,
        });
        cronLogger.info(`Created default cron job: ${job.name}`, { jobName: job.name });
      }
    }
  } catch (error) {
    cronLogger.error('Error seeding cron jobs', error instanceof Error ? error : String(error));
  }
}
