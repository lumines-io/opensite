import { describe, it, expect } from 'vitest';
import {
  coordinateSchema,
  nearbySearchSchema,
  routeAlertsSchema,
  constructionTypeSchema,
  constructionStatusSchema,
  pointGeometrySchema,
  lineStringGeometrySchema,
  polygonGeometrySchema,
  geometrySchema,
  scraperSubmissionSchema,
  scraperRunRequestSchema,
  scraperStatusSchema,
  paginationSchema,
  validateSearchParams,
  validateBody,
} from '../validation';

describe('Validation Utilities', () => {
  describe('coordinateSchema', () => {
    it('should accept valid HCMC coordinates', () => {
      const result = coordinateSchema.safeParse({ lat: 10.8, lng: 106.7 });
      expect(result.success).toBe(true);
    });

    it('should accept coordinates at the bounds', () => {
      const minResult = coordinateSchema.safeParse({ lat: 10.3, lng: 106.3 });
      expect(minResult.success).toBe(true);

      const maxResult = coordinateSchema.safeParse({ lat: 11.2, lng: 107.1 });
      expect(maxResult.success).toBe(true);
    });

    it('should reject latitude below minimum', () => {
      const result = coordinateSchema.safeParse({ lat: 10.2, lng: 106.7 });
      expect(result.success).toBe(false);
    });

    it('should reject latitude above maximum', () => {
      const result = coordinateSchema.safeParse({ lat: 11.3, lng: 106.7 });
      expect(result.success).toBe(false);
    });

    it('should reject longitude below minimum', () => {
      const result = coordinateSchema.safeParse({ lat: 10.8, lng: 106.2 });
      expect(result.success).toBe(false);
    });

    it('should reject longitude above maximum', () => {
      const result = coordinateSchema.safeParse({ lat: 10.8, lng: 107.2 });
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      expect(coordinateSchema.safeParse({ lat: 10.8 }).success).toBe(false);
      expect(coordinateSchema.safeParse({ lng: 106.7 }).success).toBe(false);
      expect(coordinateSchema.safeParse({}).success).toBe(false);
    });

    it('should reject non-numeric values', () => {
      const result = coordinateSchema.safeParse({ lat: 'invalid', lng: 106.7 });
      expect(result.success).toBe(false);
    });
  });

  describe('nearbySearchSchema', () => {
    it('should accept valid search parameters', () => {
      const result = nearbySearchSchema.safeParse({ lat: 10.8, lng: 106.7, radius: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radius).toBe(5);
      }
    });

    it('should apply default radius', () => {
      const result = nearbySearchSchema.safeParse({ lat: 10.8, lng: 106.7 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radius).toBe(10);
      }
    });

    it('should coerce string numbers', () => {
      const result = nearbySearchSchema.safeParse({ lat: '10.8', lng: '106.7', radius: '5' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lat).toBe(10.8);
        expect(result.data.lng).toBe(106.7);
        expect(result.data.radius).toBe(5);
      }
    });

    it('should reject radius below minimum', () => {
      const result = nearbySearchSchema.safeParse({ lat: 10.8, lng: 106.7, radius: 0.05 });
      expect(result.success).toBe(false);
    });

    it('should reject radius above maximum', () => {
      const result = nearbySearchSchema.safeParse({ lat: 10.8, lng: 106.7, radius: 51 });
      expect(result.success).toBe(false);
    });
  });

  describe('routeAlertsSchema', () => {
    it('should accept valid route with buffer', () => {
      const result = routeAlertsSchema.safeParse({
        route: [[106.7, 10.8], [106.8, 10.9]],
        buffer: 500,
      });
      expect(result.success).toBe(true);
    });

    it('should apply default buffer', () => {
      const result = routeAlertsSchema.safeParse({
        route: [[106.7, 10.8], [106.8, 10.9]],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.buffer).toBe(200);
      }
    });

    it('should reject route with fewer than 2 points', () => {
      const result = routeAlertsSchema.safeParse({
        route: [[106.7, 10.8]],
        buffer: 200,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty route', () => {
      const result = routeAlertsSchema.safeParse({
        route: [],
        buffer: 200,
      });
      expect(result.success).toBe(false);
    });

    it('should reject buffer below minimum', () => {
      const result = routeAlertsSchema.safeParse({
        route: [[106.7, 10.8], [106.8, 10.9]],
        buffer: 5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject buffer above maximum', () => {
      const result = routeAlertsSchema.safeParse({
        route: [[106.7, 10.8], [106.8, 10.9]],
        buffer: 2001,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('constructionTypeSchema', () => {
    it('should accept valid construction types', () => {
      const validTypes = ['road', 'bridge', 'metro', 'building', 'infrastructure', 'utility', 'other'];
      validTypes.forEach(type => {
        expect(constructionTypeSchema.safeParse(type).success).toBe(true);
      });
    });

    it('should reject invalid construction types', () => {
      expect(constructionTypeSchema.safeParse('invalid').success).toBe(false);
      expect(constructionTypeSchema.safeParse('highway').success).toBe(false);
      expect(constructionTypeSchema.safeParse('').success).toBe(false);
    });
  });

  describe('constructionStatusSchema', () => {
    it('should accept valid construction statuses', () => {
      const validStatuses = ['planned', 'in_progress', 'delayed', 'completed', 'cancelled'];
      validStatuses.forEach(status => {
        expect(constructionStatusSchema.safeParse(status).success).toBe(true);
      });
    });

    it('should reject invalid construction statuses', () => {
      expect(constructionStatusSchema.safeParse('active').success).toBe(false);
      expect(constructionStatusSchema.safeParse('paused').success).toBe(false);
      expect(constructionStatusSchema.safeParse('').success).toBe(false);
    });
  });

  describe('pointGeometrySchema', () => {
    it('should accept valid Point geometry', () => {
      const result = pointGeometrySchema.safeParse({
        type: 'Point',
        coordinates: [106.7, 10.8],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = pointGeometrySchema.safeParse({
        type: 'LineString',
        coordinates: [106.7, 10.8],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid coordinates format', () => {
      const result = pointGeometrySchema.safeParse({
        type: 'Point',
        coordinates: [106.7],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('lineStringGeometrySchema', () => {
    it('should accept valid LineString geometry', () => {
      const result = lineStringGeometrySchema.safeParse({
        type: 'LineString',
        coordinates: [[106.7, 10.8], [106.8, 10.9]],
      });
      expect(result.success).toBe(true);
    });

    it('should reject LineString with fewer than 2 coordinates', () => {
      const result = lineStringGeometrySchema.safeParse({
        type: 'LineString',
        coordinates: [[106.7, 10.8]],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const result = lineStringGeometrySchema.safeParse({
        type: 'Point',
        coordinates: [[106.7, 10.8], [106.8, 10.9]],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('polygonGeometrySchema', () => {
    it('should accept valid Polygon geometry', () => {
      const result = polygonGeometrySchema.safeParse({
        type: 'Polygon',
        coordinates: [[[106.7, 10.8], [106.8, 10.8], [106.8, 10.9], [106.7, 10.8]]],
      });
      expect(result.success).toBe(true);
    });

    it('should reject Polygon with fewer than 4 coordinates', () => {
      const result = polygonGeometrySchema.safeParse({
        type: 'Polygon',
        coordinates: [[[106.7, 10.8], [106.8, 10.8], [106.8, 10.9]]],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('geometrySchema', () => {
    it('should accept Point geometry', () => {
      const result = geometrySchema.safeParse({
        type: 'Point',
        coordinates: [106.7, 10.8],
      });
      expect(result.success).toBe(true);
    });

    it('should accept LineString geometry', () => {
      const result = geometrySchema.safeParse({
        type: 'LineString',
        coordinates: [[106.7, 10.8], [106.8, 10.9]],
      });
      expect(result.success).toBe(true);
    });

    it('should accept Polygon geometry', () => {
      const result = geometrySchema.safeParse({
        type: 'Polygon',
        coordinates: [[[106.7, 10.8], [106.8, 10.8], [106.8, 10.9], [106.7, 10.8]]],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('scraperSubmissionSchema', () => {
    const validSubmission = {
      source: 'vnexpress',
      sourceUrl: 'https://vnexpress.net/article/123',
      contentHash: 'a'.repeat(64),
      title: 'This is a test article title',
      extractedData: {
        rawText: 'Article content here',
      },
      confidence: 0.8,
      scrapedAt: '2024-01-15T10:30:00.000Z',
    };

    it('should accept valid scraper submission', () => {
      const result = scraperSubmissionSchema.safeParse(validSubmission);
      expect(result.success).toBe(true);
    });

    it('should accept all valid source types', () => {
      ['vnexpress', 'tuoitre', 'government', 'other'].forEach(source => {
        const result = scraperSubmissionSchema.safeParse({ ...validSubmission, source });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid source type', () => {
      const result = scraperSubmissionSchema.safeParse({ ...validSubmission, source: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const result = scraperSubmissionSchema.safeParse({ ...validSubmission, sourceUrl: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('should reject title shorter than 10 characters', () => {
      const result = scraperSubmissionSchema.safeParse({ ...validSubmission, title: 'Short' });
      expect(result.success).toBe(false);
    });

    it('should reject content hash shorter than 32 characters', () => {
      const result = scraperSubmissionSchema.safeParse({ ...validSubmission, contentHash: 'short' });
      expect(result.success).toBe(false);
    });

    it('should reject confidence below 0', () => {
      const result = scraperSubmissionSchema.safeParse({ ...validSubmission, confidence: -0.1 });
      expect(result.success).toBe(false);
    });

    it('should reject confidence above 1', () => {
      const result = scraperSubmissionSchema.safeParse({ ...validSubmission, confidence: 1.1 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid datetime format', () => {
      const result = scraperSubmissionSchema.safeParse({ ...validSubmission, scrapedAt: 'not-a-date' });
      expect(result.success).toBe(false);
    });
  });

  describe('scraperRunRequestSchema', () => {
    it('should accept valid run request', () => {
      const result = scraperRunRequestSchema.safeParse({
        sources: ['vnexpress', 'tuoitre'],
        maxResults: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const result = scraperRunRequestSchema.safeParse({
        sources: ['vnexpress'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxResults).toBe(20);
        expect(result.data.dryRun).toBe(false);
      }
    });

    it('should reject empty sources array', () => {
      const result = scraperRunRequestSchema.safeParse({
        sources: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject maxResults below 1', () => {
      const result = scraperRunRequestSchema.safeParse({
        sources: ['vnexpress'],
        maxResults: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject maxResults above 100', () => {
      const result = scraperRunRequestSchema.safeParse({
        sources: ['vnexpress'],
        maxResults: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('scraperStatusSchema', () => {
    it('should accept valid status request', () => {
      const result = scraperStatusSchema.safeParse({
        source: 'vnexpress',
        limit: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all source option', () => {
      const result = scraperStatusSchema.safeParse({
        source: 'all',
      });
      expect(result.success).toBe(true);
    });

    it('should apply default limit', () => {
      const result = scraperStatusSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe('paginationSchema', () => {
    it('should accept valid pagination params', () => {
      const result = paginationSchema.safeParse({ page: 2, limit: 50 });
      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should coerce string values', () => {
      const result = paginationSchema.safeParse({ page: '3', limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(25);
      }
    });

    it('should reject page below 1', () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit above 100', () => {
      const result = paginationSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  describe('validateSearchParams', () => {
    it('should parse valid search params', () => {
      const params = new URLSearchParams({ lat: '10.8', lng: '106.7' });
      const result = validateSearchParams(nearbySearchSchema, params);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lat).toBe(10.8);
        expect(result.lng).toBe(106.7);
      }
    });

    it('should return error for invalid params', () => {
      const params = new URLSearchParams({ lat: '5.0', lng: '106.7' }); // lat out of bounds
      const result = validateSearchParams(nearbySearchSchema, params);
      expect('error' in result).toBe(true);
    });

    it('should handle empty params with defaults', () => {
      const params = new URLSearchParams({});
      const result = validateSearchParams(paginationSchema, params);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
      }
    });
  });

  describe('validateBody', () => {
    it('should parse valid body', async () => {
      const body = { lat: 10.8, lng: 106.7 };
      const result = await validateBody(coordinateSchema, body);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lat).toBe(10.8);
        expect(result.lng).toBe(106.7);
      }
    });

    it('should return error for invalid body', async () => {
      const body = { lat: 5.0, lng: 106.7 }; // lat out of bounds
      const result = await validateBody(coordinateSchema, body);
      expect('error' in result).toBe(true);
    });

    it('should return error for null body', async () => {
      const result = await validateBody(coordinateSchema, null);
      expect('error' in result).toBe(true);
    });

    it('should return error for undefined body', async () => {
      const result = await validateBody(coordinateSchema, undefined);
      expect('error' in result).toBe(true);
    });
  });
});
