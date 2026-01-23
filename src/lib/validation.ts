import { z } from 'zod';

/**
 * SECURITY: Input validation limits
 * These constants define maximum sizes for various inputs to prevent DoS attacks
 */
const INPUT_LIMITS = {
  // String lengths
  MAX_SHORT_STRING: 100,    // For names, slugs, etc.
  MAX_MEDIUM_STRING: 500,   // For titles
  MAX_LONG_STRING: 5000,    // For descriptions
  MAX_TEXT_CONTENT: 50000,  // For large text fields
  MAX_URL_LENGTH: 2048,     // Standard URL max length

  // Array lengths
  MAX_ARRAY_ITEMS: 100,     // Maximum items in arrays
  MAX_COORDINATES: 1000,    // Maximum coordinates in a route/polygon

  // Numeric limits
  MAX_PAGE_SIZE: 100,       // Maximum items per page
  MAX_RADIUS_KM: 50,        // Maximum search radius in km
};

// Coordinate validation (HCMC area bounds)
const HCMC_BOUNDS = {
  minLat: 10.3,
  maxLat: 11.2,
  minLng: 106.3,
  maxLng: 107.1,
};

export const coordinateSchema = z.object({
  lat: z.number().min(HCMC_BOUNDS.minLat).max(HCMC_BOUNDS.maxLat),
  lng: z.number().min(HCMC_BOUNDS.minLng).max(HCMC_BOUNDS.maxLng),
});

// Nearby search parameters
export const nearbySearchSchema = z.object({
  lat: z.coerce.number().min(HCMC_BOUNDS.minLat).max(HCMC_BOUNDS.maxLat),
  lng: z.coerce.number().min(HCMC_BOUNDS.minLng).max(HCMC_BOUNDS.maxLng),
  radius: z.coerce.number().min(0.1).max(50).default(10), // km, max 50km
});

// Route alerts parameters
export const routeAlertsSchema = z.object({
  // SECURITY: Limit route coordinates to prevent DoS
  route: z.array(z.tuple([z.number(), z.number()])).min(2).max(INPUT_LIMITS.MAX_COORDINATES),
  buffer: z.number().min(10).max(2000).default(200), // meters, max 2km
});

// Construction type enum
export const constructionTypeSchema = z.enum([
  'road',
  'bridge',
  'metro',
  'building',
  'infrastructure',
  'utility',
  'other',
]);

// Construction status enum
export const constructionStatusSchema = z.enum([
  'planned',
  'in_progress',
  'delayed',
  'completed',
  'cancelled',
]);

// GeoJSON geometry types
export const pointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});

export const lineStringGeometrySchema = z.object({
  type: z.literal('LineString'),
  // SECURITY: Limit coordinates to prevent DoS
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2).max(INPUT_LIMITS.MAX_COORDINATES),
});

export const polygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  // SECURITY: Limit coordinates to prevent DoS
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()])).min(4).max(INPUT_LIMITS.MAX_COORDINATES)).max(10), // Max 10 rings
});

export const geometrySchema = z.union([
  pointGeometrySchema,
  lineStringGeometrySchema,
  polygonGeometrySchema,
]);

// Scraper submission schema
export const scraperSubmissionSchema = z.object({
  source: z.enum(['vnexpress', 'tuoitre', 'government', 'other']),
  // SECURITY: Limit URL length
  sourceUrl: z.string().url().max(INPUT_LIMITS.MAX_URL_LENGTH),
  contentHash: z.string().min(32).max(64),
  title: z.string().min(10).max(INPUT_LIMITS.MAX_MEDIUM_STRING),
  description: z.string().max(INPUT_LIMITS.MAX_LONG_STRING).optional(),
  extractedData: z.object({
    rawText: z.string().max(INPUT_LIMITS.MAX_TEXT_CONTENT),
    // SECURITY: Limit array sizes
    dates: z.array(z.object({
      type: z.enum(['announced', 'start', 'end', 'mentioned']),
      date: z.string().max(50), // Date string shouldn't be long
      confidence: z.number().min(0).max(1),
    })).max(INPUT_LIMITS.MAX_ARRAY_ITEMS).optional(),
    locations: z.array(z.object({
      text: z.string().max(INPUT_LIMITS.MAX_SHORT_STRING),
      confidence: z.number().min(0).max(1),
      coordinates: z.tuple([z.number(), z.number()]).optional(),
    })).max(INPUT_LIMITS.MAX_ARRAY_ITEMS).optional(),
    constructionType: constructionTypeSchema.optional(),
    status: constructionStatusSchema.optional(),
  }),
  confidence: z.number().min(0).max(1),
  scrapedAt: z.string().datetime(),
});

// Scraper run request schema
export const scraperRunRequestSchema = z.object({
  sources: z.array(z.enum(['vnexpress', 'tuoitre', 'government'])).min(1).max(3),
  // SECURITY: Limit keywords array
  keywords: z.array(z.string().max(INPUT_LIMITS.MAX_SHORT_STRING)).max(20).optional(),
  maxResults: z.number().min(1).max(INPUT_LIMITS.MAX_PAGE_SIZE).default(20),
  dryRun: z.boolean().default(false),
});

// Admin scraper status request
export const scraperStatusSchema = z.object({
  source: z.enum(['vnexpress', 'tuoitre', 'government', 'all']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Validate and parse request parameters
export const validateSearchParams = <T extends z.ZodSchema>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> | { error: string } => {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);
  if (!result.success) {
    return { error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') };
  }
  return result.data;
};

// Validate JSON body
export const validateBody = async <T extends z.ZodSchema>(
  schema: T,
  body: unknown
): Promise<z.infer<T> | { error: string }> => {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') };
  }
  return result.data;
};

// ============================================================================
// AUTHENTICATION SCHEMAS
// SECURITY: Strict validation for auth-related inputs
// ============================================================================

// Login request schema
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long') // RFC 5321 limit
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

// Registration request schema
export const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .transform(name => name.trim()),
});

// Password reset request schema
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .transform(email => email.toLowerCase().trim()),
});

// Password reset with token schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required').max(500),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long'),
});

// ============================================================================
// SUGGESTION SCHEMAS
// ============================================================================

export const suggestionCreateSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(INPUT_LIMITS.MAX_MEDIUM_STRING),
  description: z.string()
    .max(INPUT_LIMITS.MAX_LONG_STRING)
    .optional(),
  constructionType: constructionTypeSchema,
  status: constructionStatusSchema.optional(),
  geometry: geometrySchema.optional(),
  evidenceUrls: z.array(
    z.string().url().max(INPUT_LIMITS.MAX_URL_LENGTH)
  ).max(10).optional(), // Max 10 evidence URLs
});

// Type exports
export type Coordinate = z.infer<typeof coordinateSchema>;
export type NearbySearchParams = z.infer<typeof nearbySearchSchema>;
export type RouteAlertsParams = z.infer<typeof routeAlertsSchema>;
export type ConstructionType = z.infer<typeof constructionTypeSchema>;
export type ConstructionStatus = z.infer<typeof constructionStatusSchema>;
export type Geometry = z.infer<typeof geometrySchema>;
export type ScraperSubmission = z.infer<typeof scraperSubmissionSchema>;
export type ScraperRunRequest = z.infer<typeof scraperRunRequestSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SuggestionCreateInput = z.infer<typeof suggestionCreateSchema>;
