import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateContentHash,
  generateArticleHash,
  isHashExists,
  findExistingHashes,
} from '../hash';
import type { Payload } from 'payload';

describe('Scraper Hash Utilities', () => {
  describe('generateContentHash', () => {
    it('should generate consistent hash for same inputs', () => {
      const hash1 = generateContentHash('https://example.com/article/1', 'Test Article Title');
      const hash2 = generateContentHash('https://example.com/article/1', 'Test Article Title');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different URLs', () => {
      const hash1 = generateContentHash('https://example.com/article/1', 'Test Article Title');
      const hash2 = generateContentHash('https://example.com/article/2', 'Test Article Title');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different titles', () => {
      const hash1 = generateContentHash('https://example.com/article/1', 'Test Article Title');
      const hash2 = generateContentHash('https://example.com/article/1', 'Different Title');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64 character hex hash (SHA-256)', () => {
      const hash = generateContentHash('https://example.com/article/1', 'Test Article Title');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should normalize URL by removing tracking parameters', () => {
      const baseUrl = 'https://example.com/article/1';
      const urlWithTracking = 'https://example.com/article/1?utm_source=test&utm_medium=email&ref=twitter';

      const hash1 = generateContentHash(baseUrl, 'Title');
      const hash2 = generateContentHash(urlWithTracking, 'Title');
      expect(hash1).toBe(hash2);
    });

    it('should remove various tracking parameters', () => {
      const baseUrl = 'https://example.com/article/1';
      const trackingUrls = [
        'https://example.com/article/1?utm_campaign=test',
        'https://example.com/article/1?utm_content=test',
        'https://example.com/article/1?fbclid=test123',
        'https://example.com/article/1?gclid=test456',
      ];

      const baseHash = generateContentHash(baseUrl, 'Title');
      trackingUrls.forEach(url => {
        const hash = generateContentHash(url, 'Title');
        expect(hash).toBe(baseHash);
      });
    });

    it('should normalize URL hostname to lowercase', () => {
      const hash1 = generateContentHash('https://EXAMPLE.COM/article/1', 'Title');
      const hash2 = generateContentHash('https://example.com/article/1', 'Title');
      expect(hash1).toBe(hash2);
    });

    it('should normalize title to lowercase', () => {
      const hash1 = generateContentHash('https://example.com/article/1', 'TEST TITLE');
      const hash2 = generateContentHash('https://example.com/article/1', 'test title');
      expect(hash1).toBe(hash2);
    });

    it('should normalize whitespace in title', () => {
      const hash1 = generateContentHash('https://example.com/article/1', 'Test   Article   Title');
      const hash2 = generateContentHash('https://example.com/article/1', 'Test Article Title');
      expect(hash1).toBe(hash2);
    });

    it('should trim whitespace from title', () => {
      const hash1 = generateContentHash('https://example.com/article/1', '  Test Title  ');
      const hash2 = generateContentHash('https://example.com/article/1', 'Test Title');
      expect(hash1).toBe(hash2);
    });

    it('should handle invalid URLs gracefully', () => {
      const hash = generateContentHash('not-a-valid-url', 'Title');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle empty title', () => {
      const hash = generateContentHash('https://example.com/article/1', '');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle empty URL', () => {
      const hash = generateContentHash('', 'Title');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should preserve non-tracking query parameters', () => {
      const hash1 = generateContentHash('https://example.com/article/1?page=2', 'Title');
      const hash2 = generateContentHash('https://example.com/article/1', 'Title');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle Vietnamese characters in title', () => {
      const hash1 = generateContentHash('https://example.com/article/1', 'Xây dựng đường cao tốc');
      const hash2 = generateContentHash('https://example.com/article/1', 'Xây dựng đường cao tốc');
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateArticleHash', () => {
    it('should generate consistent hash for same content', () => {
      const hash1 = generateArticleHash('This is the article content.');
      const hash2 = generateArticleHash('This is the article content.');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateArticleHash('This is content A.');
      const hash2 = generateArticleHash('This is content B.');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64 character hex hash (SHA-256)', () => {
      const hash = generateArticleHash('Test content');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should normalize content to lowercase', () => {
      const hash1 = generateArticleHash('TEST CONTENT');
      const hash2 = generateArticleHash('test content');
      expect(hash1).toBe(hash2);
    });

    it('should normalize whitespace', () => {
      const hash1 = generateArticleHash('Test   content   here');
      const hash2 = generateArticleHash('Test content here');
      expect(hash1).toBe(hash2);
    });

    it('should trim whitespace', () => {
      const hash1 = generateArticleHash('   Test content   ');
      const hash2 = generateArticleHash('Test content');
      expect(hash1).toBe(hash2);
    });

    it('should handle newlines as whitespace', () => {
      const hash1 = generateArticleHash('Test\ncontent\nhere');
      const hash2 = generateArticleHash('Test content here');
      expect(hash1).toBe(hash2);
    });

    it('should handle tabs as whitespace', () => {
      const hash1 = generateArticleHash('Test\tcontent\there');
      const hash2 = generateArticleHash('Test content here');
      expect(hash1).toBe(hash2);
    });

    it('should handle empty content', () => {
      const hash = generateArticleHash('');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle Vietnamese characters', () => {
      const hash1 = generateArticleHash('Đây là nội dung bài viết về công trình xây dựng ở TP.HCM');
      const hash2 = generateArticleHash('Đây là nội dung bài viết về công trình xây dựng ở TP.HCM');
      expect(hash1).toBe(hash2);
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(100000);
      const hash = generateArticleHash(longContent);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should normalize Unicode (NFC normalization)', () => {
      // Vietnamese character with combining diacritical mark vs precomposed
      const hash1 = generateArticleHash('ô'); // precomposed
      const hash2 = generateArticleHash('ô'); // o + combining circumflex (may vary)
      expect(hash1).toBe(hash2);
    });
  });

  describe('hash collision resistance', () => {
    it('should produce different hashes for similar content', () => {
      const hashes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const hash = generateContentHash(`https://example.com/article/${i}`, `Article ${i}`);
        hashes.add(hash);
      }

      expect(hashes.size).toBe(100);
    });

    it('should produce different article hashes for incremental content', () => {
      const hashes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const hash = generateArticleHash(`Article content version ${i}`);
        hashes.add(hash);
      }

      expect(hashes.size).toBe(100);
    });
  });

  describe('isHashExists', () => {
    // Create a mock Payload instance
    function createMockPayload(findResult: { docs: unknown[] }): Payload {
      return {
        find: vi.fn().mockResolvedValue(findResult),
      } as unknown as Payload;
    }

    function createMockPayloadWithError(error: Error): Payload {
      return {
        find: vi.fn().mockRejectedValue(error),
      } as unknown as Payload;
    }

    it('should return true when hash exists in database', async () => {
      const mockPayload = createMockPayload({
        docs: [{ id: '1', contentHash: 'abc123' }],
      });

      const result = await isHashExists(mockPayload, 'abc123');

      expect(result).toBe(true);
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'suggestions',
        where: {
          contentHash: { equals: 'abc123' },
        },
        limit: 1,
      });
    });

    it('should return false when hash does not exist', async () => {
      const mockPayload = createMockPayload({
        docs: [],
      });

      const result = await isHashExists(mockPayload, 'nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when Payload throws an error', async () => {
      const mockPayload = createMockPayloadWithError(new Error('Database connection failed'));

      const result = await isHashExists(mockPayload, 'abc123');

      expect(result).toBe(false);
    });

    it('should handle empty hash string', async () => {
      const mockPayload = createMockPayload({
        docs: [],
      });

      const result = await isHashExists(mockPayload, '');

      expect(result).toBe(false);
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'suggestions',
        where: {
          contentHash: { equals: '' },
        },
        limit: 1,
      });
    });

    it('should handle special characters in hash', async () => {
      const specialHash = 'hash-with-special_chars.123';
      const mockPayload = createMockPayload({
        docs: [{ contentHash: specialHash }],
      });

      const result = await isHashExists(mockPayload, specialHash);

      expect(result).toBe(true);
    });
  });

  describe('findExistingHashes', () => {
    function createMockPayload(findResult: { docs: unknown[] }): Payload {
      return {
        find: vi.fn().mockResolvedValue(findResult),
      } as unknown as Payload;
    }

    function createMockPayloadWithError(error: Error): Payload {
      return {
        find: vi.fn().mockRejectedValue(error),
      } as unknown as Payload;
    }

    it('should return set of existing hashes', async () => {
      const mockPayload = createMockPayload({
        docs: [
          { contentHash: 'hash1' },
          { contentHash: 'hash2' },
          { contentHash: 'hash3' },
        ],
      });

      const result = await findExistingHashes(mockPayload, ['hash1', 'hash2', 'hash3', 'hash4']);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has('hash1')).toBe(true);
      expect(result.has('hash2')).toBe(true);
      expect(result.has('hash3')).toBe(true);
      expect(result.has('hash4')).toBe(false);
    });

    it('should return empty set when no hashes exist', async () => {
      const mockPayload = createMockPayload({
        docs: [],
      });

      const result = await findExistingHashes(mockPayload, ['hash1', 'hash2']);

      expect(result.size).toBe(0);
    });

    it('should return empty set when input array is empty', async () => {
      const mockPayload = createMockPayload({
        docs: [],
      });

      const result = await findExistingHashes(mockPayload, []);

      expect(result.size).toBe(0);
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'suggestions',
        where: {
          contentHash: { in: [] },
        },
        limit: 0,
      });
    });

    it('should return empty set when Payload throws an error', async () => {
      const mockPayload = createMockPayloadWithError(new Error('Query failed'));

      const result = await findExistingHashes(mockPayload, ['hash1', 'hash2']);

      expect(result.size).toBe(0);
    });

    it('should filter out null/undefined contentHash values', async () => {
      const mockPayload = createMockPayload({
        docs: [
          { contentHash: 'hash1' },
          { contentHash: null },
          { contentHash: undefined },
          { contentHash: 'hash2' },
          { id: '5' }, // No contentHash field
        ],
      });

      const result = await findExistingHashes(mockPayload, ['hash1', 'hash2', 'hash3']);

      expect(result.size).toBe(2);
      expect(result.has('hash1')).toBe(true);
      expect(result.has('hash2')).toBe(true);
    });

    it('should pass correct limit based on input array length', async () => {
      const mockPayload = createMockPayload({
        docs: [],
      });

      const hashes = ['a', 'b', 'c', 'd', 'e'];
      await findExistingHashes(mockPayload, hashes);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'suggestions',
        where: {
          contentHash: { in: hashes },
        },
        limit: 5,
      });
    });

    it('should handle large hash arrays', async () => {
      const largeHashArray = Array.from({ length: 1000 }, (_, i) => `hash${i}`);
      const existingHashes = largeHashArray.slice(0, 500).map(h => ({ contentHash: h }));

      const mockPayload = createMockPayload({
        docs: existingHashes,
      });

      const result = await findExistingHashes(mockPayload, largeHashArray);

      expect(result.size).toBe(500);
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'suggestions',
        where: {
          contentHash: { in: largeHashArray },
        },
        limit: 1000,
      });
    });

    it('should handle duplicate hashes in input', async () => {
      const mockPayload = createMockPayload({
        docs: [
          { contentHash: 'hash1' },
        ],
      });

      const result = await findExistingHashes(mockPayload, ['hash1', 'hash1', 'hash1']);

      expect(result.size).toBe(1);
      expect(result.has('hash1')).toBe(true);
    });

    it('should handle empty string hashes', async () => {
      const mockPayload = createMockPayload({
        docs: [
          { contentHash: '' },
        ],
      });

      const result = await findExistingHashes(mockPayload, ['', 'hash1']);

      // Empty string is falsy, so it should be filtered out
      expect(result.size).toBe(0);
    });
  });
});
