'use client';

import { ReactNode } from 'react';

interface FieldChangeIndicatorProps {
  isChanged: boolean;
  children: ReactNode;
  label?: string;
  originalValue?: string | number | null;
  showOriginal?: boolean;
}

export function FieldChangeIndicator({
  isChanged,
  children,
  label,
  originalValue,
  showOriginal = false,
}: FieldChangeIndicatorProps) {
  return (
    <div className={`relative ${isChanged ? 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background rounded-lg' : ''}`}>
      {/* Change indicator badge */}
      {isChanged && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full shadow-sm">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modified
          </span>
        </div>
      )}

      {children}

      {/* Original value hint */}
      {isChanged && showOriginal && originalValue !== undefined && originalValue !== null && (
        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Original{label ? ` ${label.toLowerCase()}` : ''}: <span className="font-medium">{String(originalValue)}</span></span>
        </div>
      )}
    </div>
  );
}

interface ChangeSummaryBannerProps {
  changedFieldCount: number;
  onClearChanges?: () => void;
  lastSavedAt?: Date | null;
}

export function ChangeSummaryBanner({
  changedFieldCount,
  onClearChanges,
  lastSavedAt,
}: ChangeSummaryBannerProps) {
  if (changedFieldCount === 0) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-200">
              {changedFieldCount} unsaved {changedFieldCount === 1 ? 'change' : 'changes'}
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {lastSavedAt ? (
                <>Draft auto-saved at {formatTime(lastSavedAt)}</>
              ) : (
                <>Your changes are saved locally and will persist if you refresh</>
              )}
            </p>
          </div>
        </div>

        {onClearChanges && (
          <button
            onClick={onClearChanges}
            className="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset all
          </button>
        )}
      </div>
    </div>
  );
}

interface FieldLabelWithIndicatorProps {
  label: string;
  isChanged: boolean;
  required?: boolean;
}

export function FieldLabelWithIndicator({
  label,
  isChanged,
  required = false,
}: FieldLabelWithIndicatorProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium mb-2">
      <span>{label}</span>
      {required && <span className="text-red-500">*</span>}
      {isChanged && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium rounded">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Modified
        </span>
      )}
    </label>
  );
}
