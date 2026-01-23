'use client';

import { useRef, useCallback } from 'react';
import { InfoWindow } from '@react-google-maps/api';
import { STATUS_COLORS, CATEGORY_COLORS } from './google-map.constants';
import {
  getTypeColor,
  getTypeLabel,
  getStatusLabel,
  formatDateVN,
  getPrivateTypeLabel,
  getPrivateTypeColor,
} from './google-map.utils';
import type { Construction, LatLng } from './google-map.types';
import { usePageTransition } from '@/components/PageTransition';

interface GoogleMapInfoWindowProps {
  construction: Construction;
  position: LatLng;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Progress bar component
 */
function ProgressBar({
  progress,
  statusColor,
}: {
  progress: number;
  statusColor: string;
}) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{
          width: `${progress}%`,
          backgroundColor: statusColor,
        }}
      />
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: STATUS_COLORS[status] }}
      />
      <span className="text-xs text-card-foreground">
        {getStatusLabel(status)}
      </span>
    </div>
  );
}

/**
 * Type badge component
 */
function TypeBadge({
  type,
  category,
  privateType,
}: {
  type: string;
  category?: string;
  privateType?: string;
}) {
  const color =
    category === 'private'
      ? privateType
        ? getPrivateTypeColor(privateType)
        : CATEGORY_COLORS['private']
      : getTypeColor(type);

  return (
    <span
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Sponsor badge for private constructions
 */
function SponsorBadge({ organizationName }: { organizationName?: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-purple-600 dark:text-purple-400"
      >
        <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
        <path d="M1 21h22" />
        <path d="M9 7h1" />
        <path d="M9 11h1" />
        <path d="M9 15h1" />
        <path d="M14 7h1" />
        <path d="M14 11h1" />
        <path d="M14 15h1" />
      </svg>
      <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300 truncate max-w-[100px]">
        {organizationName || 'Tư nhân'}
      </span>
    </div>
  );
}

/**
 * External link icon
 */
function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/**
 * Google Maps InfoWindow for construction details
 */
export function GoogleMapInfoWindow({
  construction,
  position,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: GoogleMapInfoWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { startTransition } = usePageTransition();
  const statusColor = STATUS_COLORS[construction.constructionStatus];
  const hasDateInfo = construction.startDate || construction.expectedEndDate;
  const isPrivate = construction.constructionCategory === 'private';

  const detailsUrl = construction.slug
    ? `/details/${construction.slug}`
    : `/details/${construction.id}`;

  const typeLabel =
    isPrivate && construction.privateType
      ? getPrivateTypeLabel(construction.privateType)
      : getTypeLabel(construction.constructionType);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter?.();
  }, [onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    onMouseLeave?.();
  }, [onMouseLeave]);

  const handleNavigate = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        startTransition(
          {
            x: centerX,
            y: centerY,
            width: rect.width,
            height: rect.height,
          },
          detailsUrl
        );
      }
    },
    [startTransition, detailsUrl]
  );

  return (
    <InfoWindow
      position={position}
      onCloseClick={onClose}
      options={{
        pixelOffset: new google.maps.Size(0, -10),
        disableAutoPan: false,
      }}
    >
      <div
        ref={containerRef}
        className="min-w-[260px] max-w-[320px] bg-card"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Sponsor badge for private constructions */}
        {isPrivate && (
          <div className="px-3 pt-2">
            <SponsorBadge organizationName={construction.organizationName} />
          </div>
        )}

        {/* Clickable Header */}
        <button
          onClick={handleNavigate}
          className="group flex items-start gap-2.5 p-3 pb-2 hover:bg-muted/50 rounded-t-lg transition-colors cursor-pointer w-full text-left"
        >
          <TypeBadge
            type={construction.constructionType}
            category={construction.constructionCategory}
            privateType={construction.privateType}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-card-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {construction.title}
              </h3>
              <ExternalLinkIcon />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
          </div>
        </button>

        {/* Excerpt */}
        {construction.excerpt && (
          <div className="px-3 pb-2">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {construction.excerpt}
            </p>
          </div>
        )}

        {/* Status & Progress */}
        <div className="px-3 pb-3 pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <StatusBadge status={construction.constructionStatus} />
            <span className="text-xs font-semibold text-card-foreground">
              {construction.progress}%
            </span>
          </div>
          <ProgressBar
            progress={construction.progress}
            statusColor={statusColor}
          />

          {/* Date info */}
          {hasDateInfo && (
            <div className="text-xs text-muted-foreground pt-1">
              {construction.startDate && (
                <span>Bắt đầu: {formatDateVN(construction.startDate)}</span>
              )}
              {construction.startDate && construction.expectedEndDate && ' • '}
              {construction.expectedEndDate && (
                <span>Dự kiến: {formatDateVN(construction.expectedEndDate)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </InfoWindow>
  );
}
