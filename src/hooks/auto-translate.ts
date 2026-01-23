import type {
  CollectionBeforeChangeHook,
  CollectionAfterChangeHook,
  PayloadRequest,
} from 'payload';
import {
  translateText,
  translateRichText,
  detectLocale,
  hasPlaceholders,
  hasHtmlTags,
  type Locale,
} from '@/lib/translate';
import { locales, defaultLocale } from '@/i18n/config';

interface TranslationJob {
  docId: string | number;
  collection: string;
  userId?: string | number;
  fields: Array<{
    fieldPath: string;
    sourceValue: string | unknown;
    sourceLocale: Locale;
    isRichText: boolean;
  }>;
}

// Queue for background translation jobs
const translationQueue: TranslationJob[] = [];
let isProcessingQueue = false;

/**
 * Translation notification types
 */
export type TranslationNotificationType =
  | 'translation_started'
  | 'translation_completed'
  | 'translation_failed';

/**
 * Send a translation notification by logging to the Logs collection
 * This provides persistence and visibility in the PayloadCMS admin
 */
async function sendTranslationNotification(
  payload: PayloadRequest['payload'],
  type: TranslationNotificationType,
  details: {
    collection: string;
    docId: string | number;
    docTitle?: string;
    userId?: string | number;
    fieldsCount?: number;
    targetLocales?: string[];
    error?: string;
  }
): Promise<void> {
  const messages: Record<TranslationNotificationType, string> = {
    translation_started: `Auto-translation started for ${details.fieldsCount} field(s) in "${details.docTitle || details.docId}" (${details.collection})`,
    translation_completed: `Auto-translation completed for "${details.docTitle || details.docId}" (${details.collection}) to ${details.targetLocales?.join(', ')}`,
    translation_failed: `Auto-translation failed for "${details.docTitle || details.docId}" (${details.collection}): ${details.error}`,
  };

  const level = type === 'translation_failed' ? 'error' : 'info';

  try {
    // Log to the Logs collection for persistence and admin visibility
    await payload.create({
      collection: 'logs',
      data: {
        level,
        message: messages[type],
        context: {
          type: 'auto_translate',
          notificationType: type,
          collection: details.collection,
          documentId: String(details.docId),
          documentTitle: details.docTitle,
          userId: details.userId ? String(details.userId) : undefined,
          fieldsCount: details.fieldsCount,
          targetLocales: details.targetLocales,
          error: details.error,
        },
      },
    });
  } catch (error) {
    // Don't fail if logging fails, just console log
    console.error('Failed to create translation notification log:', error);
  }
}

/**
 * Configuration for auto-translation
 */
export interface AutoTranslateConfig {
  /** Fields that should be auto-translated */
  fields: string[];
  /** Fields that contain rich text (Lexical JSON) */
  richTextFields?: string[];
  /** Whether to translate immediately (blocking) or in background */
  immediate?: boolean;
}

/**
 * Get the current locale from the request
 */
function getRequestLocale(req: PayloadRequest): Locale {
  // PayloadCMS sets req.locale when localization is enabled
  const locale = req.locale as string | undefined;
  if (locale && locales.includes(locale as Locale)) {
    return locale as Locale;
  }
  return defaultLocale;
}

/**
 * Extract a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Process translation queue in background
 */
async function processTranslationQueue(payload: PayloadRequest['payload']): Promise<void> {
  if (isProcessingQueue || translationQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (translationQueue.length > 0) {
    const job = translationQueue.shift();
    if (!job) continue;

    // Get document title for notification
    let docTitle: string | undefined;
    try {
      const doc = await payload.findByID({
        collection: job.collection as 'constructions' | 'suggestions' | 'districts',
        id: job.docId,
      });
      docTitle = (doc as { title?: string; name?: string })?.title || (doc as { name?: string })?.name;
    } catch {
      // Ignore error, just use ID
    }

    // Collect all target locales for notification
    const allTargetLocales = new Set<string>();

    try {
      // Send start notification
      await sendTranslationNotification(payload, 'translation_started', {
        collection: job.collection,
        docId: job.docId,
        docTitle,
        userId: job.userId,
        fieldsCount: job.fields.length,
        targetLocales: locales.filter((l) => l !== job.fields[0]?.sourceLocale),
      });

      for (const field of job.fields) {
        const targetLocales = locales.filter((l) => l !== field.sourceLocale);

        for (const targetLocale of targetLocales) {
          allTargetLocales.add(targetLocale);
          let translatedValue: unknown;

          if (field.isRichText) {
            translatedValue = await translateRichText(
              field.sourceValue,
              field.sourceLocale,
              targetLocale
            );
          } else if (typeof field.sourceValue === 'string') {
            // Skip strings with placeholders or HTML
            if (hasPlaceholders(field.sourceValue) || hasHtmlTags(field.sourceValue)) {
              continue;
            }
            translatedValue = await translateText(
              field.sourceValue,
              field.sourceLocale,
              targetLocale
            );
          } else {
            continue;
          }

          // Update the document with the translated value
          try {
            await payload.update({
              collection: job.collection as 'constructions' | 'suggestions' | 'districts',
              id: job.docId,
              locale: targetLocale,
              data: {
                [field.fieldPath]: translatedValue,
              },
            });
          } catch (updateError) {
            console.error(
              `Failed to update translation for ${job.collection}/${job.docId}/${field.fieldPath}:`,
              updateError
            );
          }

          // Rate limiting delay
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      // Send completion notification
      await sendTranslationNotification(payload, 'translation_completed', {
        collection: job.collection,
        docId: job.docId,
        docTitle,
        userId: job.userId,
        fieldsCount: job.fields.length,
        targetLocales: Array.from(allTargetLocales),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Translation job failed for ${job.collection}/${job.docId}:`, error);

      // Send failure notification
      await sendTranslationNotification(payload, 'translation_failed', {
        collection: job.collection,
        docId: job.docId,
        docTitle,
        userId: job.userId,
        error: errorMessage,
      });
    }
  }

  isProcessingQueue = false;
}

/**
 * Create a beforeChange hook that queues translations
 * This hook detects the source language and prepares translations for other locales
 */
export function createAutoTranslateBeforeChangeHook(
  config: AutoTranslateConfig
): CollectionBeforeChangeHook {
  return async ({ data, req, operation }) => {
    // Only process on create/update when we have data
    if (!data || (operation !== 'create' && operation !== 'update')) {
      return data;
    }

    const requestLocale = getRequestLocale(req);

    // For each configured field, check if it has content and detect source locale
    for (const fieldPath of config.fields) {
      const value = getNestedValue(data as Record<string, unknown>, fieldPath);

      if (value && typeof value === 'string' && value.trim() !== '') {
        // Detect the locale of the content
        const detectedLocale = detectLocale(value);

        // Store metadata for the afterChange hook to use
        if (!data._translationMeta) {
          data._translationMeta = {};
        }
        data._translationMeta[fieldPath] = {
          sourceLocale: detectedLocale,
          needsTranslation: true,
        };
      }
    }

    // Same for rich text fields
    if (config.richTextFields) {
      for (const fieldPath of config.richTextFields) {
        const value = getNestedValue(data as Record<string, unknown>, fieldPath);

        if (value && typeof value === 'object') {
          // For rich text, we assume the request locale or detect from text nodes
          if (!data._translationMeta) {
            data._translationMeta = {};
          }
          data._translationMeta[fieldPath] = {
            sourceLocale: requestLocale,
            needsTranslation: true,
            isRichText: true,
          };
        }
      }
    }

    // Store user ID for notifications
    if (req.user?.id) {
      data._translationUserId = req.user.id;
    }

    return data;
  };
}

/**
 * Create an afterChange hook that performs translations
 * This runs after the document is saved, either immediately or in background
 */
export function createAutoTranslateAfterChangeHook(
  config: AutoTranslateConfig
): CollectionAfterChangeHook {
  return async ({ doc, req, operation, collection }) => {
    // Only process on create/update
    if (operation !== 'create' && operation !== 'update') {
      return doc;
    }

    const translationMeta = doc._translationMeta as
      | Record<string, { sourceLocale: Locale; needsTranslation: boolean; isRichText?: boolean }>
      | undefined;

    if (!translationMeta) {
      return doc;
    }

    const fieldsToTranslate: TranslationJob['fields'] = [];

    // Collect fields that need translation
    for (const [fieldPath, meta] of Object.entries(translationMeta)) {
      if (meta.needsTranslation) {
        const value = getNestedValue(doc as Record<string, unknown>, fieldPath);

        if (value) {
          fieldsToTranslate.push({
            fieldPath,
            sourceValue: value,
            sourceLocale: meta.sourceLocale,
            isRichText: meta.isRichText || false,
          });
        }
      }
    }

    if (fieldsToTranslate.length === 0) {
      return doc;
    }

    // Queue translation job
    const job: TranslationJob = {
      docId: doc.id,
      collection: collection.slug,
      userId: doc._translationUserId as string | number | undefined,
      fields: fieldsToTranslate,
    };

    if (config.immediate) {
      // Process immediately (blocking)
      translationQueue.push(job);
      await processTranslationQueue(req.payload);
    } else {
      // Queue for background processing
      translationQueue.push(job);
      // Start processing in background (non-blocking)
      processTranslationQueue(req.payload).catch((error) => {
        console.error('Background translation processing failed:', error);
      });
    }

    // Remove the translation meta from the returned doc
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _translationMeta, _translationUserId, ...cleanDoc } = doc;
    return cleanDoc;
  };
}

/**
 * Create a pair of hooks for auto-translation
 */
export function createAutoTranslateHooks(config: AutoTranslateConfig): {
  beforeChange: CollectionBeforeChangeHook;
  afterChange: CollectionAfterChangeHook;
} {
  return {
    beforeChange: createAutoTranslateBeforeChangeHook(config),
    afterChange: createAutoTranslateAfterChangeHook(config),
  };
}
