'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { ErrorModal } from './ErrorModal';

export interface ErrorModalData {
  id: string;
  title: string;
  message: string;
  details?: string;
  errorId?: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: Date;
}

interface ErrorModalContextType {
  showError: (error: {
    title?: string;
    message: string;
    details?: string;
    errorId?: string;
    severity?: 'error' | 'warning' | 'info';
  }) => void;
  dismissError: (id: string) => void;
  dismissAll: () => void;
  errors: ErrorModalData[];
  countdownDuration: number;
  setCountdownDuration: (duration: number) => void;
}

const ErrorModalContext = createContext<ErrorModalContextType | undefined>(undefined);

const DEFAULT_COUNTDOWN_DURATION = 10; // seconds

export function ErrorModalProvider({
  children,
  initialCountdownDuration,
}: {
  children: ReactNode;
  initialCountdownDuration?: number;
}) {
  const [errors, setErrors] = useState<ErrorModalData[]>([]);
  const [countdownDuration, setCountdownDuration] = useState(
    initialCountdownDuration ?? DEFAULT_COUNTDOWN_DURATION
  );

  const showError = useCallback(
    (error: {
      title?: string;
      message: string;
      details?: string;
      errorId?: string;
      severity?: 'error' | 'warning' | 'info';
    }) => {
      const newError: ErrorModalData = {
        id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: error.title || 'Error',
        message: error.message,
        details: error.details,
        errorId: error.errorId,
        severity: error.severity || 'error',
        timestamp: new Date(),
      };

      setErrors((prev) => [...prev, newError]);

      // Log to console for server-side capture
      console.error('Error modal triggered:', {
        ...newError,
        countdownDuration,
      });
    },
    [countdownDuration]
  );

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorModalContext.Provider
      value={{
        showError,
        dismissError,
        dismissAll,
        errors,
        countdownDuration,
        setCountdownDuration,
      }}
    >
      {children}
      {errors.map((error) => (
        <ErrorModal
          key={error.id}
          error={error}
          countdownDuration={countdownDuration}
          onDismiss={() => dismissError(error.id)}
        />
      ))}
    </ErrorModalContext.Provider>
  );
}

export function useErrorModal() {
  const context = useContext(ErrorModalContext);
  if (context === undefined) {
    throw new Error('useErrorModal must be used within an ErrorModalProvider');
  }
  return context;
}

// Hook that can capture errors from async operations
export function useErrorHandler() {
  const { showError } = useErrorModal();

  const handleError = useCallback(
    (error: Error | string, options?: { title?: string; severity?: 'error' | 'warning' | 'info' }) => {
      const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      const message = error instanceof Error ? error.message : error;
      const details = error instanceof Error ? error.stack : undefined;

      showError({
        title: options?.title || 'An error occurred',
        message,
        details,
        errorId,
        severity: options?.severity || 'error',
      });

      return errorId;
    },
    [showError]
  );

  // Wrapper for async functions
  const withErrorHandling = useCallback(
    <T,>(
      fn: () => Promise<T>,
      options?: { title?: string; severity?: 'error' | 'warning' | 'info' }
    ): Promise<T | null> => {
      return fn().catch((error) => {
        handleError(error, options);
        return null;
      });
    },
    [handleError]
  );

  return { handleError, withErrorHandling };
}
