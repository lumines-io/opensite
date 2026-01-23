import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import {
  translateText,
  translateRichText,
  detectLocale,
  hasPlaceholders,
  hasHtmlTags,
  type Locale,
} from '@/lib/translate';
import { locales } from '@/i18n/config';

/**
 * POST /api/translate-content
 *
 * Translates content for a specific document in a collection.
 * This endpoint allows manual triggering of translations for existing content.
 *
 * Request body:
 * {
 *   collection: string,     // Collection slug (e.g., 'constructions', 'suggestions')
 *   id: string | number,    // Document ID
 *   fields?: string[],      // Optional: specific fields to translate (defaults to all localized fields)
 *   sourceLocale?: Locale,  // Optional: source locale (auto-detected if not provided)
 *   targetLocales?: Locale[] // Optional: target locales (defaults to all other locales)
 * }
 */
export async function POST(request: NextRequest) {
  // Authentication check
  const payloadToken = request.cookies.get('payload-token')?.value;

  if (!payloadToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify admin/moderator role
    const userResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/users/me`,
      {
        headers: {
          Cookie: `payload-token=${payloadToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await userResponse.json();

    if (!['admin', 'moderator'].includes(userData.user?.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin or Moderator access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { collection, id, fields, sourceLocale, targetLocales } = body;

    if (!collection || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: collection and id' },
        { status: 400 }
      );
    }

    // Validate collection
    const validCollections = ['constructions', 'suggestions', 'districts'];
    if (!validCollections.includes(collection)) {
      return NextResponse.json(
        { error: `Invalid collection. Must be one of: ${validCollections.join(', ')}` },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Fetch the document in the source locale
    const doc = await payload.findByID({
      collection: collection as 'constructions' | 'suggestions' | 'districts',
      id,
      locale: sourceLocale || 'vi',
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Define which fields are translatable for each collection
    const translatableFields: Record<string, { text: string[]; richText: string[] }> = {
      constructions: {
        text: ['title'],
        richText: ['description'],
      },
      suggestions: {
        text: ['title', 'locationDescription'],
        richText: ['justification'],
      },
      districts: {
        text: ['name'],
        richText: [],
      },
    };

    const collectionConfig = translatableFields[collection];
    const textFields = fields
      ? fields.filter((f: string) => collectionConfig.text.includes(f))
      : collectionConfig.text;
    const richTextFields = fields
      ? fields.filter((f: string) => collectionConfig.richText.includes(f))
      : collectionConfig.richText;

    const targets = targetLocales || locales.filter((l) => l !== (sourceLocale || 'vi'));
    const results: Record<string, Record<string, unknown>> = {};

    // Translate each field to target locales
    for (const targetLocale of targets) {
      results[targetLocale] = {};

      // Translate text fields
      for (const fieldName of textFields) {
        const value = doc[fieldName as keyof typeof doc];
        if (value && typeof value === 'string' && value.trim() !== '') {
          const detectedSource = sourceLocale || detectLocale(value);

          // Skip if source and target are the same
          if (detectedSource === targetLocale) {
            continue;
          }

          // Skip strings with placeholders or HTML
          if (hasPlaceholders(value) || hasHtmlTags(value)) {
            results[targetLocale][fieldName] = 'Skipped (contains placeholders or HTML)';
            continue;
          }

          const translated = await translateText(value, detectedSource as Locale, targetLocale as Locale);
          results[targetLocale][fieldName] = translated;

          // Update the document with the translation
          await payload.update({
            collection: collection as 'constructions' | 'suggestions' | 'districts',
            id,
            locale: targetLocale,
            data: {
              [fieldName]: translated,
            },
          });

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      // Translate rich text fields
      for (const fieldName of richTextFields) {
        const value = doc[fieldName as keyof typeof doc];
        if (value && typeof value === 'object') {
          const detectedSource = (sourceLocale || 'vi') as Locale;

          const translated = await translateRichText(value, detectedSource, targetLocale as Locale);
          results[targetLocale][fieldName] = 'Translated';

          // Update the document with the translation
          await payload.update({
            collection: collection as 'constructions' | 'suggestions' | 'districts',
            id,
            locale: targetLocale,
            data: {
              [fieldName]: translated,
            },
          });

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Translated document ${id} in ${collection}`,
      results,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/translate-content
 *
 * Get translation status for a document
 *
 * Query params:
 * - collection: string
 * - id: string | number
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const collection = searchParams.get('collection');
  const id = searchParams.get('id');

  if (!collection || !id) {
    return NextResponse.json(
      { error: 'Missing required query params: collection and id' },
      { status: 400 }
    );
  }

  const validCollections = ['constructions', 'suggestions', 'districts'];
  if (!validCollections.includes(collection)) {
    return NextResponse.json(
      { error: `Invalid collection. Must be one of: ${validCollections.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const payload = await getPayload({ config });

    // Fetch document in all locales to check translation status
    const localeData: Record<string, Record<string, unknown>> = {};

    for (const locale of locales) {
      const doc = await payload.findByID({
        collection: collection as 'constructions' | 'suggestions' | 'districts',
        id,
        locale,
      });

      if (doc) {
        // Extract only the translatable fields
        const translatableFields: Record<string, string[]> = {
          constructions: ['title', 'description'],
          suggestions: ['title', 'locationDescription', 'justification'],
          districts: ['name'],
        };

        const fields = translatableFields[collection];
        localeData[locale] = {};

        for (const field of fields) {
          const value = doc[field as keyof typeof doc];
          localeData[locale][field] = value ? 'present' : 'missing';
        }
      }
    }

    return NextResponse.json({
      collection,
      id,
      locales: localeData,
    });
  } catch (error) {
    console.error('Translation status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get translation status' },
      { status: 500 }
    );
  }
}
