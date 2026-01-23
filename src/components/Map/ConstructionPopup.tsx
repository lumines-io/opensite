'use client';

import { useRef, useCallback } from 'react';
import { Popup } from 'react-map-gl/mapbox';
import { Building2, ExternalLink, Link2, Clock, Flag, CircleDot } from 'lucide-react';
import { STATUS_COLORS, CATEGORY_COLORS } from './construction-map.constants';
import {
  getTypeColor,
  getTypeLabel,
  getStatusLabel,
  formatDateVN,
  getCategoryLabel,
  getPrivateTypeLabel,
  getPrivateTypeColor,
} from './construction-map.utils';
import type { Construction, Coordinates } from './construction-map.types';
import { usePageTransition } from '@/components/PageTransition';

interface ConstructionPopupProps {
  construction: Construction;
  coordinates: Coordinates;
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
 * Type badge component - handles both public and private constructions
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
  // For private constructions, use private type color or category color
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
 * Category/Sponsor badge for private constructions
 */
function SponsorBadge({ organizationName }: { organizationName?: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
      <Building2 size={10} className="text-purple-600 dark:text-purple-400" />
      <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300 truncate max-w-[100px]">
        {organizationName || 'Tư nhân'}
      </span>
    </div>
  );
}

/**
 * Detail marker info section (for metro stations, freeway exits)
 */
function DetailMarkerInfo({ construction }: { construction: Construction }) {
  const isMetroStation = construction.constructionType === 'metro_station';
  const isFreewayExit = construction.constructionType === 'freeway_exit';

  if (!construction.isDetailMarker) return null;

  return (
    <div className="px-3 pb-2 space-y-1">
      {/* Parent construction link */}
      {construction.parentTitle && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 size={10} />
          <span className="truncate">{construction.parentTitle}</span>
        </div>
      )}

      {/* Metro station specific info */}
      {isMetroStation && construction.stationOrder !== undefined && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={10} />
          <span>Ga thứ {construction.stationOrder}</span>
        </div>
      )}

      {/* Freeway exit specific info */}
      {isFreewayExit && (
        <>
          {construction.exitType && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CircleDot size={10} />
              <span>
                {construction.exitType === 'both' && 'Ra/Vào'}
                {construction.exitType === 'entry' && 'Chỉ vào'}
                {construction.exitType === 'exit' && 'Chỉ ra'}
                {construction.exitType === 'interchange' && 'Nút giao'}
                {construction.exitType === 'toll' && 'Trạm thu phí'}
              </span>
            </div>
          )}
          {construction.connectedRoads && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flag size={10} />
              <span className="truncate">{construction.connectedRoads}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Unified Construction Popup
 * - Clickable header for navigation with zoom transition
 * - Shows excerpt/description
 * - Proximity-aware (stays open when mouse moves into popup)
 */
export function ConstructionPopup({
  construction,
  coordinates,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: ConstructionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const { startTransition } = usePageTransition();
  const statusColor = STATUS_COLORS[construction.constructionStatus];
  const hasDateInfo = construction.startDate || construction.expectedEndDate;
  const isPrivate = construction.constructionCategory === 'private';

  const detailsUrl = construction.slug
    ? `/details/${construction.slug}`
    : `/details/${construction.id}`;

  // Get appropriate type label based on category
  const typeLabel = isPrivate && construction.privateType
    ? getPrivateTypeLabel(construction.privateType)
    : getTypeLabel(construction.constructionType);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter?.();
  }, [onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    onMouseLeave?.();
  }, [onMouseLeave]);

  const handleNavigate = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
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
  }, [startTransition, detailsUrl]);

  return (
    <Popup
      longitude={coordinates[0]}
      latitude={coordinates[1]}
      anchor="bottom"
      onClose={onClose}
      closeOnClick={false}
      closeButton={true}
      offset={[0, -10]}
    >
      <div
        ref={popupRef}
        className="min-w-[260px] max-w-[320px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Sponsor badge for private constructions */}
        {isPrivate && (
          <div className="px-3 pt-2">
            <SponsorBadge organizationName={construction.organizationName} />
          </div>
        )}

        {/* Clickable Header - Links to details page with transition */}
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
              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {typeLabel}
            </p>
          </div>
        </button>

        {/* Detail marker info (for metro stations, freeway exits) */}
        <DetailMarkerInfo construction={construction} />

        {/* Excerpt/Description */}
        {construction.excerpt && !construction.isDetailMarker && (
          <div className="px-3 pb-2">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {construction.excerpt}
            </p>
          </div>
        )}

        {/* Status & Progress Section */}
        <div className="px-3 pb-3 pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <StatusBadge status={construction.constructionStatus} />
            <span className="text-xs font-semibold text-card-foreground">
              {construction.progress}%
            </span>
          </div>
          <ProgressBar progress={construction.progress} statusColor={statusColor} />

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
    </Popup>
  );
}

// Keep old exports for backwards compatibility but mark as deprecated
/** @deprecated Use ConstructionPopup instead */
export const HoverPopup = ConstructionPopup;
/** @deprecated Use ConstructionPopup instead */
export const SelectedPopup = ConstructionPopup;
