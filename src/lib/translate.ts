import type { Locale } from '@/i18n/config';
import { locales, defaultLocale } from '@/i18n/config';

/**
 * Translate text using Google Translate API (unofficial)
 * For production, consider using Google Cloud Translation API or similar paid service
 */
export async function translateText(
  text: string,
  fromLocale: Locale,
  toLocale: Locale
): Promise<string> {
  // Don't translate if same locale or empty text
  if (fromLocale === toLocale || !text || text.trim() === '') {
    return text;
  }

  try {
    // Sanitize input to prevent injection and limit length
    const sanitizedText = text.slice(0, 5000);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLocale}&tl=${toLocale}&dt=t&q=${encodeURIComponent(sanitizedText)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const data = await response.json();

    // The response is a nested array, with translated text segments
    // Concatenate all segments for full translation
    if (data && data[0] && Array.isArray(data[0])) {
      const translatedParts = data[0]
        .filter((part: unknown[]) => part && part[0])
        .map((part: unknown[]) => part[0]);
      return translatedParts.join('');
    }

    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

/**
 * Check if a string contains placeholders like {variable}
 */
export function hasPlaceholders(text: string): boolean {
  return /\{[^}]+\}/.test(text);
}

/**
 * Check if a string contains HTML tags
 */
export function hasHtmlTags(text: string): boolean {
  return /<[^>]+>/.test(text);
}

/**
 * Detect the locale of a text (simple heuristic based on Vietnamese characters)
 */
export function detectLocale(text: string): Locale {
  // Vietnamese-specific diacritics and characters
  const vietnamesePattern = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

  if (vietnamesePattern.test(text)) {
    return 'vi';
  }

  return 'en';
}

/**
 * Auto-translate a field value from the detected source locale to all other locales
 * Returns an object with translations for each locale
 */
export async function autoTranslateField(
  value: string,
  sourceLocale?: Locale
): Promise<Record<Locale, string>> {
  const detectedLocale = sourceLocale || detectLocale(value);
  const result: Record<Locale, string> = {} as Record<Locale, string>;

  // Set the source value
  result[detectedLocale] = value;

  // Translate to other locales
  for (const targetLocale of locales) {
    if (targetLocale !== detectedLocale) {
      // Skip translation for strings with placeholders or HTML
      if (hasPlaceholders(value) || hasHtmlTags(value)) {
        result[targetLocale] = value; // Keep original for manual translation
      } else {
        result[targetLocale] = await translateText(value, detectedLocale, targetLocale);
        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  return result;
}

/**
 * Translate rich text content (Lexical JSON format)
 * This handles the nested structure of Lexical editor content
 */
export async function translateRichText(
  content: unknown,
  fromLocale: Locale,
  toLocale: Locale
): Promise<unknown> {
  if (!content || typeof content !== 'object') {
    return content;
  }

  const obj = content as Record<string, unknown>;

  // If it's a text node with text content, translate it
  if (obj.type === 'text' && typeof obj.text === 'string') {
    const translatedText = await translateText(obj.text, fromLocale, toLocale);
    return { ...obj, text: translatedText };
  }

  // Recursively translate children
  if (obj.children && Array.isArray(obj.children)) {
    const translatedChildren = await Promise.all(
      obj.children.map((child) => translateRichText(child, fromLocale, toLocale))
    );
    return { ...obj, children: translatedChildren };
  }

  // Handle root object
  if (obj.root) {
    const translatedRoot = await translateRichText(obj.root, fromLocale, toLocale);
    return { ...obj, root: translatedRoot };
  }

  return content;
}

export { locales, defaultLocale };
export type { Locale };
