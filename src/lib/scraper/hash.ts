import { createHash } from 'crypto';
import type { Payload } from 'payload';

/**
 * Generate a content hash for deduplication
 * Uses SHA-256 to create a unique identifier based on URL and title
 */
export function generateContentHash(url: string, title: string): string {
  const normalizedUrl = normalizeUrl(url);
  const normalizedTitle = normalizeText(title);
  const content = `${normalizedUrl}|${normalizedTitle}`;

  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a hash for the full article content
 * Used for detecting if an article has been updated
 */
export function generateArticleHash(content: string): string {
  const normalized = normalizeText(content);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalize URL for consistent hashing
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'fbclid', 'gclid'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    // Lowercase the hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Normalize text for consistent hashing
 * Removes extra whitespace, normalizes unicode, etc.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC') // Unicode normalization
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if a content hash already exists in the database
 */
export async function isHashExists(
  payload: Payload,
  contentHash: string
): Promise<boolean> {
  try {
    const existing = await payload.find({
      collection: 'suggestions',
      where: {
        contentHash: { equals: contentHash },
      },
      limit: 1,
    });

    return existing.docs.length > 0;
  } catch {
    return false;
  }
}

/**
 * Batch check for existing hashes
 */
export async function findExistingHashes(
  payload: Payload,
  hashes: string[]
): Promise<Set<string>> {
  try {
    const existing = await payload.find({
      collection: 'suggestions',
      where: {
        contentHash: { in: hashes },
      },
      limit: hashes.length,
    });

    return new Set(
      existing.docs
        .map(doc => (doc as { contentHash?: string }).contentHash)
        .filter((hash): hash is string => !!hash)
    );
  } catch {
    return new Set();
  }
}
