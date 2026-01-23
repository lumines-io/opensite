import { createLogger, logCategories, logDatabaseOperation } from './logger';

const dbLogger = createLogger(logCategories.DATABASE);

// User context for logging
export interface PayloadUserContext {
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

// Drizzle/Payload database logger
export const payloadLogger = {
  logQuery(query: string, params: unknown[]) {
    dbLogger.debug({ query, params }, 'Database query');
  },
};

// Error logging for Payload operations
export function logPayloadError(
  collection: string,
  operation: string,
  error: Error | string,
  context?: Record<string, unknown>,
  userContext?: PayloadUserContext
) {
  const errorMessage = error instanceof Error ? error.message : error;

  logDatabaseOperation({
    operation: 'error',
    collection,
    error: errorMessage,
  });

  dbLogger.error(
    {
      collection,
      operation,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      ...userContext,
      ...context,
    },
    `Payload error: ${operation} on ${collection}`
  );
}

// Map Payload operations to database log operations
const operationMap: Record<string, 'query' | 'insert' | 'update' | 'delete'> = {
  create: 'insert',
  update: 'update',
  delete: 'delete',
  read: 'query',
};

// Success logging for Payload operations
export function logPayloadOperation(
  collection: string,
  operation: 'create' | 'update' | 'delete' | 'read',
  documentId?: string | number,
  duration?: number,
  context?: {
    documentName?: string;
    userContext?: PayloadUserContext;
  }
) {
  const documentName = context?.documentName;
  const userContext = context?.userContext;

  logDatabaseOperation({
    operation: operationMap[operation],
    collection,
    documentId: documentId?.toString(),
    duration,
  });

  // Enhanced logging with document name and user context
  if (documentName || userContext) {
    const nameStr = documentName ? ` "${documentName}"` : '';
    dbLogger.info(
      {
        collection,
        operation,
        documentId: documentId?.toString(),
        documentName,
        duration,
        ...userContext,
      },
      `Payload: ${operation}${nameStr} on ${collection}`
    );
  }
}
