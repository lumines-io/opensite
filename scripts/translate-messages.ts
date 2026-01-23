#!/usr/bin/env tsx
/**
 * Build-time script to translate missing i18n message keys
 *
 * This script runs during the build process to ensure all locale files
 * have translations for all keys. It uses Google Translate API for
 * automatic translation.
 *
 * Usage:
 *   npx tsx scripts/translate-messages.ts
 *   npm run translate
 *
 * Options:
 *   --dry-run    Show what would be translated without making changes
 *   --verbose    Show detailed translation output
 */

import { promises as fs } from 'fs';
import * as path from 'path';

// Define the supported locales
const LOCALES = ['vi', 'en'] as const;
type Locale = (typeof LOCALES)[number];

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

// Simple translation using free Google Translate API (unofficial)
async function translateText(text: string, from: Locale, to: Locale): Promise<string> {
  try {
    const sanitizedText = text.slice(0, 5000);
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

    if (data && data[0] && Array.isArray(data[0])) {
      const translatedParts = data[0]
        .filter((part: unknown[]) => part && part[0])
        .map((part: unknown[]) => part[0]);
      return translatedParts.join('');
    }
    return text;
  } catch (error) {
    console.error(`  Translation error: ${error}`);
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
  return sourceKeys.filter((key) => !targetKeys.has(key));
}

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  i18n Message Translation');
  console.log('='.repeat(60));
  console.log('');

  if (isDryRun) {
    console.log('  Mode: DRY RUN (no changes will be made)');
    console.log('');
  }

  const messagesDir = path.join(process.cwd(), 'src', 'i18n', 'messages');
  const results: Record<string, { added: string[]; skipped: string[]; errors: string[] }> = {};

  // Load all locale files
  const messages: Record<Locale, Record<string, unknown>> = {} as Record<
    Locale,
    Record<string, unknown>
  >;

  for (const locale of LOCALES) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      messages[locale] = JSON.parse(content);
      console.log(`  Loaded: ${locale}.json`);
    } catch (error) {
      console.error(`  Error loading ${locale}.json:`, error);
      process.exit(1);
    }
  }

  console.log('');

  // For each locale pair, find and translate missing keys
  for (const sourceLocale of LOCALES) {
    for (const targetLocale of LOCALES) {
      if (sourceLocale === targetLocale) continue;

      const pairKey = `${sourceLocale} -> ${targetLocale}`;
      results[pairKey] = { added: [], skipped: [], errors: [] };

      const missingKeys = findMissingKeys(messages[sourceLocale], messages[targetLocale]);

      if (missingKeys.length === 0) {
        console.log(`  ${pairKey}: No missing keys`);
        continue;
      }

      console.log(`  ${pairKey}: Found ${missingKeys.length} missing keys`);

      for (const key of missingKeys) {
        const sourceValue = getValue(messages[sourceLocale], key);

        if (typeof sourceValue === 'string') {
          // Skip keys that contain placeholders or HTML tags
          if (sourceValue.includes('{') && sourceValue.includes('}')) {
            results[pairKey].skipped.push(`${key} (contains placeholders)`);
            if (isVerbose) {
              console.log(`    Skipped: ${key} (placeholders)`);
            }
            continue;
          }

          if (sourceValue.includes('<') && sourceValue.includes('>')) {
            results[pairKey].skipped.push(`${key} (contains HTML)`);
            if (isVerbose) {
              console.log(`    Skipped: ${key} (HTML tags)`);
            }
            continue;
          }

          try {
            if (!isDryRun) {
              const translatedValue = await translateText(sourceValue, sourceLocale, targetLocale);
              setValue(messages[targetLocale], key, translatedValue);
              results[pairKey].added.push(key);

              if (isVerbose) {
                console.log(`    Translated: ${key}`);
                console.log(`      "${sourceValue}" -> "${translatedValue}"`);
              }

              // Rate limiting delay
              await new Promise((resolve) => setTimeout(resolve, 150));
            } else {
              results[pairKey].added.push(key);
              if (isVerbose) {
                console.log(`    Would translate: ${key}`);
              }
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Translation failed';
            results[pairKey].errors.push(`${key}: ${errorMsg}`);
            console.error(`    Error translating ${key}: ${errorMsg}`);
          }
        }
      }

      // Save the updated target locale file if there were changes
      if (!isDryRun && results[pairKey].added.length > 0) {
        const filePath = path.join(messagesDir, `${targetLocale}.json`);
        await fs.writeFile(filePath, JSON.stringify(messages[targetLocale], null, 2) + '\n');
        console.log(`    Saved: ${targetLocale}.json (${results[pairKey].added.length} new)`);
      }
    }
  }

  // Print summary
  console.log('');
  console.log('-'.repeat(60));
  console.log('  Summary');
  console.log('-'.repeat(60));

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [pairKey, result] of Object.entries(results)) {
    if (result.added.length > 0 || result.skipped.length > 0 || result.errors.length > 0) {
      console.log(`  ${pairKey}:`);
      if (result.added.length > 0) {
        console.log(`    Translated: ${result.added.length}`);
        totalAdded += result.added.length;
      }
      if (result.skipped.length > 0) {
        console.log(`    Skipped: ${result.skipped.length}`);
        totalSkipped += result.skipped.length;
      }
      if (result.errors.length > 0) {
        console.log(`    Errors: ${result.errors.length}`);
        totalErrors += result.errors.length;
      }
    }
  }

  console.log('');
  console.log(`  Total: ${totalAdded} translated, ${totalSkipped} skipped, ${totalErrors} errors`);
  console.log('');
  console.log('='.repeat(60));
  console.log('');

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Translation script failed:', error);
  process.exit(1);
});
