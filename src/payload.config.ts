import { buildConfig, type Config } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { payloadLogger } from './lib/payload-logger';
import { assertValidEnvironment, getRequiredEnv } from './lib/env-validation';
import { locales, defaultLocale } from './i18n/config';

// Validate environment variables at startup
assertValidEnvironment();

// Collections
import { Users } from './collections/Users';
import { Organizations } from './collections/Organizations';
import { Constructions } from './collections/Constructions';
import { ConstructionChangelog } from './collections/ConstructionChangelog';
import { Suggestions } from './collections/Suggestions';
import { Media } from './collections/Media';
import { CronJobs } from './collections/CronJobs';
import { CronJobLogs } from './collections/CronJobLogs';
import { AnalyticsEvents } from './collections/AnalyticsEvents';
import { AnalyticEvent } from './collections/AnalyticEvent';
import { Logs } from './collections/Logs';

// Billing Collections
import { CreditTransactions } from './collections/CreditTransactions';
import { CreditTopupHistory } from './collections/CreditTopupHistory';
import { PromotionPackages } from './collections/PromotionPackages';
import { Promotions } from './collections/Promotions';

// Globals
import { Settings } from './globals/Settings';
import { AdSettings } from './globals/AdSettings';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Create nodemailer transport based on environment
const createEmailTransport = () => {
  // In production, use SMTP configuration from environment variables
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // In development, use Ethereal (fake SMTP for testing) or console logging
  // Ethereal credentials can be generated at https://ethereal.email/
  if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS,
      },
    });
  }

  // Fallback: return undefined to let Payload handle it (logs to console)
  return undefined;
};

// Configure S3 storage plugin (only enabled when AWS credentials are present)
const getStoragePlugins = () => {
  // Only enable S3 in production when credentials are configured
  if (
    process.env.AWS_S3_BUCKET_NAME &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  ) {
    return [
      s3Storage({
        collections: {
          media: {
            prefix: 'media',
          },
        },
        bucket: process.env.AWS_S3_BUCKET_NAME,
        config: {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
          region: process.env.AWS_REGION,
        },
      }),
    ];
  }

  // In local development, use local file storage (default behavior)
  return [];
};

export default buildConfig({
  // i18n / Localization configuration
  localization: {
    locales: [
      {
        label: 'Tiếng Việt',
        code: 'vi',
      },
      {
        label: 'English',
        code: 'en',
      },
    ],
    defaultLocale: defaultLocale,
    fallback: true, // Fall back to default locale if translation is missing
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- OpenSite',
    },
    components: {
      views: {
        dashboard: {
          Component: '/payload/components/views/DashboardOverviewWrapper#DashboardOverviewWrapper',
        },
        'suggestions-queue': {
          Component: '/payload/components/views/SuggestionsQueueViewWrapper#SuggestionsQueueViewWrapper',
          path: '/suggestions-queue',
        },
        scrapers: {
          Component: '/payload/components/views/ScraperManagementViewWrapper#ScraperManagementViewWrapper',
          path: '/scrapers',
        },
        analytics: {
          Component: '/payload/components/views/AnalyticsViewWrapper#AnalyticsViewWrapper',
          path: '/analytics',
        },
        'feature-toggles': {
          Component: '/payload/components/views/FeatureTogglesViewWrapper#FeatureTogglesViewWrapper',
          path: '/feature-toggles',
        },
        'private-constructions-review': {
          Component: '/payload/components/views/PrivateConstructionsReviewViewWrapper#PrivateConstructionsReviewViewWrapper',
          path: '/private-constructions-review',
        },
      },
      afterNavLinks: [
        '/payload/components/nav/CustomNavLinks#CustomNavLinks',
      ],
    },
  },
  collections: [
    Users,
    Organizations,
    Constructions,
    ConstructionChangelog,
    Suggestions,
    Media,
    CronJobs,
    CronJobLogs,
    AnalyticsEvents,
    AnalyticEvent,
    Logs,
    // Billing Collections
    CreditTransactions,
    CreditTopupHistory,
    PromotionPackages,
    Promotions,
  ],
  globals: [Settings, AdSettings],
  editor: lexicalEditor(),
  // SECURITY: JWT secret is required - no fallback to prevent insecure defaults
  secret: getRequiredEnv('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    logger: payloadLogger,
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.EMAIL_FROM || 'noreply@opensite.local',
    defaultFromName: process.env.EMAIL_FROM_NAME || 'OpenSite',
    transport: createEmailTransport(),
  }),
  plugins: getStoragePlugins(),
  sharp,
});
