import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  isCronJobEnabled,
  createCronLogger,
  startCronJobRun,
  completeCronJobRun,
} from '@/lib/cron';

const JOB_NAME = 'translate';

// Define the supported locales
const LOCALES = ['vi', 'en'] as const;
type Locale = (typeof LOCALES)[number];

// Simple translation using free Google Translate API (unofficial)
// For production, you should use Google Cloud Translation API or similar
async function translateText(text: string, from: Locale, to: Locale): Promise<string> {
  try {
    // Sanitize input to prevent injection
    const sanitizedText = text.slice(0, 5000); // Limit length
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(sanitizedText)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const data = await response.json();

    // The response is a nested array, with translated text in [0][0][0]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// Get all keys from a nested object
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key] as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Get value from nested object by dot notation key
function getValue(obj: Record<string, unknown>, key: string): unknown {
  const keys = key.split('.');
  let value: unknown = obj;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return value;
}

// Set value in nested object by dot notation key
function setValue(obj: Record<string, unknown>, key: string, value: unknown): void {
  const keys = key.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

// Find missing translations between two locale files
function findMissingKeys(
  sourceMessages: Record<string, unknown>,
  targetMessages: Record<string, unknown>
): string[] {
  const sourceKeys = getAllKeys(sourceMessages);
  const targetKeys = new Set(getAllKeys(targetMessages));

  return sourceKeys.filter(key => !targetKeys.has(key));
}

async function runTranslation(
  triggeredBy: 'scheduled' | 'manual',
  userId?: string | number
) {
  const logger = createCronLogger();
  let logId: string | undefined;

  try {
    // Check if job is enabled
    const jobConfig = await isCronJobEnabled(JOB_NAME);

    if (jobConfig && !jobConfig.enabled) {
      return {
        success: false,
        skipped: true,
        message: 'Translation cron job is disabled',
      };
    }

    // Start the job run
    logId = await startCronJobRun(JOB_NAME, triggeredBy, userId);
    logger.info('Translation job started');

    const messagesDir = path.join(process.cwd(), 'src', 'i18n', 'messages');
    const results: Record<string, { added: string[]; errors: string[] }> = {};

    // Load all locale files
    const messages: Record<Locale, Record<string, unknown>> = {} as Record<Locale, Record<string, unknown>>;

    for (const locale of LOCALES) {
      const filePath = path.join(messagesDir, `${locale}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      messages[locale] = JSON.parse(content);
      logger.info(`Loaded locale file: ${locale}.json`);
    }

    // For each locale pair, find and translate missing keys
    for (const sourceLocale of LOCALES) {
      for (const targetLocale of LOCALES) {
        if (sourceLocale === targetLocale) continue;

        const pairKey = `${sourceLocale}->${targetLocale}`;
        results[pairKey] = { added: [], errors: [] };

        const missingKeys = findMissingKeys(messages[sourceLocale], messages[targetLocale]);
        logger.info(`Found ${missingKeys.length} missing keys for ${pairKey}`);

        for (const key of missingKeys) {
          const sourceValue = getValue(messages[sourceLocale], key);

          if (typeof sourceValue === 'string') {
            try {
              // Skip keys that contain placeholders or HTML tags - these need manual translation
              if (sourceValue.includes('{') && sourceValue.includes('}')) {
                results[pairKey].errors.push(`${key}: Contains placeholders, requires manual translation`);
                logger.warn(`Skipped ${key}: contains placeholders`);
                continue;
              }

              if (sourceValue.includes('<') && sourceValue.includes('>')) {
                results[pairKey].errors.push(`${key}: Contains HTML tags, requires manual translation`);
                logger.warn(`Skipped ${key}: contains HTML tags`);
                continue;
              }

              const translatedValue = await translateText(sourceValue, sourceLocale, targetLocale);
              setValue(messages[targetLocale], key, translatedValue);
              results[pairKey].added.push(`${key}: "${sourceValue}" -> "${translatedValue}"`);
              logger.info(`Translated ${key}`, { from: sourceValue, to: translatedValue });

              // Add a small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 150));
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Translation failed';
              results[pairKey].errors.push(`${key}: ${errorMsg}`);
              logger.error(`Failed to translate ${key}`, { error: errorMsg });
            }
          }
        }

        // Save the updated target locale file if there were changes
        if (results[pairKey].added.length > 0) {
          const filePath = path.join(messagesDir, `${targetLocale}.json`);
          await fs.writeFile(filePath, JSON.stringify(messages[targetLocale], null, 2) + '\n');
          logger.info(`Saved updated ${targetLocale}.json with ${results[pairKey].added.length} new translations`);
        }
      }
    }

    // Calculate summary
    const totalAdded = Object.values(results).reduce((sum, r) => sum + r.added.length, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);

    const summary = {
      totalAdded,
      totalErrors,
      timestamp: new Date().toISOString(),
      details: results,
    };

    logger.info('Translation job completed', { totalAdded, totalErrors });

    // Complete the job run
    if (logId) {
      await completeCronJobRun(logId, 'success', summary, logger.getEntries());
    }

    return {
      success: true,
      summary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Translation job failed', { error: errorMessage });

    // Complete the job run with failure status
    if (logId) {
      await completeCronJobRun(
        logId,
        'failed',
        { error: errorMessage },
        logger.getEntries(),
        errorMessage
      );
    }

    throw error;
  }
}

export async function GET(request: NextRequest) {
  // Verify the cron secret - REQUIRED for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is not set in production, deny access
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'CRON_SECRET environment variable is not configured' },
        { status: 500 }
      );
    }
    // In development, allow without secret but log a warning
    console.warn('WARNING: CRON_SECRET is not set. Running in development mode.');
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runTranslation('scheduled');

    if (result.skipped) {
      return NextResponse.json({
        success: false,
        skipped: true,
        message: result.message,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Translation cron error:', error);
    return NextResponse.json(
      {
        error: 'Translation cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST method for manual triggering - requires admin authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Check cron secret first
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Triggered via cron secret (e.g., from admin panel)
    try {
      const body = await request.json().catch(() => ({}));
      const userId = body.userId;

      const result = await runTranslation('manual', userId);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to run translation' },
        { status: 500 }
      );
    }
  }

  // Otherwise, require proper authentication via cookies
  const payloadToken = request.cookies.get('payload-token')?.value;

  if (!payloadToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin role
  try {
    // Verify the token and get user
    const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/users/me`, {
      headers: {
        Cookie: `payload-token=${payloadToken}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await response.json();

    if (userData.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Run the translation
    const result = await runTranslation('manual', userData.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Manual trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run translation' },
      { status: 500 }
    );
  }
}
