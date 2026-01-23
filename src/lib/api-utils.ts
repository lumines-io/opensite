import { NextRequest, NextResponse } from 'next/server';
import { logApiRequest, type ApiLogContext, createLogger, logCategories } from './logger';

const errorLogger = createLogger(logCategories.API);

// Generate a unique request ID
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Extract request metadata
export function getRequestMetadata(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const url = new URL(request.url);

  return {
    ip,
    userAgent,
    path: url.pathname,
    method: request.method,
    query: Object.fromEntries(url.searchParams),
  };
}

// Capture API error with request context (logged via Pino)
export function captureApiError(
  error: Error,
  request: NextRequest,
  extra?: Record<string, unknown>
) {
  const metadata = getRequestMetadata(request);

  errorLogger.error(
    {
      errorType: 'api_error',
      path: metadata.path,
      method: metadata.method,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      error: error.message,
      stack: error.stack,
      ...extra,
    },
    `API Error: ${error.message}`
  );
}

// Standard API error response
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

// Create standardized error response
export function createErrorResponse(
  message: string,
  status: number,
  options?: {
    code?: string;
    details?: unknown;
    requestId?: string;
  }
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: options?.code,
      details: options?.details,
      requestId: options?.requestId,
    },
    { status }
  );
}

// Type for API handler function - uses generic context to support Next.js route context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiHandler<C = any> = (
  request: NextRequest,
  context: C
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<NextResponse<any>>;

// Wrapper for API routes with error handling and logging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withApiHandler<C = any>(handler: ApiHandler<C>): ApiHandler<C> {
  return async (request, context) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const metadata = getRequestMetadata(request);

    const logContext: ApiLogContext = {
      ...metadata,
    };

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      logApiRequest({
        ...logContext,
        status: response.status,
        duration,
      });

      // Add request ID and timing headers
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', `${duration}ms`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the error
      logApiRequest({
        ...logContext,
        status: 500,
        duration,
        error: errorMessage,
      });

      // Capture error with full context
      if (error instanceof Error) {
        captureApiError(error, request, { requestId, duration });
      }

      // Return error response
      const response = createErrorResponse(
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : errorMessage,
        500,
        { requestId }
      );

      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', `${duration}ms`);

      return response;
    }
  };
}

// Helper to parse and validate request body
export async function parseRequestBody<T>(
  request: NextRequest,
  validator?: (data: unknown) => data is T
): Promise<T | null> {
  try {
    const body = await request.json();

    if (validator && !validator(body)) {
      return null;
    }

    return body as T;
  } catch {
    return null;
  }
}
