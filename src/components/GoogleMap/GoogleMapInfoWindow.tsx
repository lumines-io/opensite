'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { InfoWindow } from '@react-google-maps/api';
import { Building2, ExternalLink, Star, DollarSign, Link2, CircleDot, Clock, Flag } from 'lucide-react';
import {
  STATUS_COLORS,
  DEVELOPMENT_STATUS_COLORS,
  SOURCE_COLLECTION_COLORS,
} from './google-map.constants';
import {
  getTypeColor,
  getTypeLabel,
  getStatusLabel,
  formatDateVN,
  getDevelopmentTypeLabel,
  getDevelopmentTypeColor,
  getDevelopmentStatusLabel,
  getPointTypeLabel,
} from './google-map.utils';
import type { MapFeature, Construction, Development, LatLng } from './google-map.types';
import { isConstruction, isDevelopment } from './google-map.types';
import { usePageTransition } from '@/components/PageTransition';

interface GoogleMapInfoWindowProps {
  feature: MapFeature;
  position: LatLng;
  onClose: () => void;
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
 * Status badge component for constructions
 */
function ConstructionStatusBadge({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: STATUS_COLORS[status] || STATUS_COLORS['planned'] }}
      />
      <span className="text-xs text-card-foreground">
        {getStatusLabel(status)}
      </span>
    </div>
  );
}

/**
 * Status badge component for developments
 */
function DevelopmentStatusBadge({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: DEVELOPMENT_STATUS_COLORS[status] || DEVELOPMENT_STATUS_COLORS['upcoming'] }}
      />
      <span className="text-xs text-card-foreground">
        {getDevelopmentStatusLabel(status)}
      </span>
    </div>
  );
}

/**
 * Type badge component for constructions
 */
function ConstructionTypeBadge({ type }: { type: string }) {
  const color = getTypeColor(type);
  return (
    <span
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Type badge component for developments
 */
function DevelopmentTypeBadge({ type }: { type: string }) {
  const color = getDevelopmentTypeColor(type);
  return (
    <span
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Sponsor badge for developments
 */
function SponsorBadge({ organizationName, showBadge = true }: { organizationName?: string; showBadge?: boolean }) {
  if (!showBadge) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
      <Building2 className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
      <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300 truncate max-w-[100px]">
        {organizationName || 'Dự án'}
      </span>
    </div>
  );
}

/**
 * Featured badge for featured developments
 */
function FeaturedBadge() {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
      <Star size={10} className="text-amber-500" fill="currentColor" />
      <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
        Nổi bật
      </span>
    </div>
  );
}

/**
 * External link icon
 */
function ExternalLinkIcon() {
  return (
    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
  );
}

/**
 * Detail marker info section (for construction detail points like metro stations)
 */
function DetailMarkerInfo({ construction }: { construction: Construction }) {
  if (!construction.isDetailMarker) return null;

  // Get point order (from new generic field or legacy fields)
  const pointOrder = construction.pointOrder ?? construction.stationOrder ?? construction.exitOrder;
  const pointType = construction.pointType;

  return (
    <div className="px-3 pb-2 space-y-1">
      {/* Parent construction link */}
      {construction.parentTitle && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 size={10} />
          <span className="truncate">{construction.parentTitle}</span>
        </div>
      )}

      {/* Point type badge */}
      {pointType && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CircleDot size={10} />
          <span>{getPointTypeLabel(pointType)}</span>
        </div>
      )}

      {/* Point order (for numbered points like stations) */}
      {pointOrder !== undefined && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={10} />
          <span>Thứ tự: {pointOrder}</span>
        </div>
      )}

      {/* Point description (additional info) */}
      {construction.pointDescription && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Flag size={10} />
          <span className="truncate">{construction.pointDescription}</span>
        </div>
      )}

      {/* Legacy: Connected roads for freeway exits */}
      {construction.connectedRoads && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Flag size={10} />
          <span className="truncate">{construction.connectedRoads}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Construction InfoWindow content
 */
function ConstructionContent({
  construction,
  onNavigate,
  containerRef,
}: {
  construction: Construction;
  onNavigate: (e: React.MouseEvent) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const statusColor = STATUS_COLORS[construction.constructionStatus] || STATUS_COLORS['planned'];
  const hasDateInfo = construction.startDate || construction.expectedEndDate;
  const typeLabel = getTypeLabel(construction.constructionType);

  return (
    <div ref={containerRef} className="min-w-[260px] max-w-[320px] bg-card">
      {/* Clickable Header */}
      <button
        onClick={onNavigate}
        className="group flex items-start gap-2.5 p-3 pb-2 hover:bg-muted/50 rounded-t-lg transition-colors cursor-pointer w-full text-left"
      >
        <ConstructionTypeBadge type={construction.constructionType} />
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

      {/* Detail marker info (for metro stations, freeway exits) */}
      <DetailMarkerInfo construction={construction} />

      {/* Excerpt */}
      {construction.excerpt && !construction.isDetailMarker && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {construction.excerpt}
          </p>
        </div>
      )}

      {/* Status & Progress */}
      <div className="px-3 pb-3 pt-2 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <ConstructionStatusBadge status={construction.constructionStatus} />
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
  );
}

/**
 * Development InfoWindow content
 */
function DevelopmentContent({
  development,
  onNavigate,
  containerRef,
}: {
  development: Development;
  onNavigate: (e: React.MouseEvent) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const typeLabel = getDevelopmentTypeLabel(development.developmentType);
  const hasDateInfo = development.launchDate || development.expectedCompletion;

  return (
    <div ref={containerRef} className="min-w-[260px] max-w-[320px] bg-card">
      {/* Badges row */}
      <div className="px-3 pt-2 flex items-center gap-2 flex-wrap">
        {development.featured && <FeaturedBadge />}
        {development.showSponsoredBadge && (
          <SponsorBadge organizationName={development.organizationName} />
        )}
      </div>

      {/* Clickable Header */}
      <button
        onClick={onNavigate}
        className="group flex items-start gap-2.5 p-3 pb-2 hover:bg-muted/50 rounded-t-lg transition-colors cursor-pointer w-full text-left"
      >
        <DevelopmentTypeBadge type={development.developmentType} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-card-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {development.title}
            </h3>
            <ExternalLinkIcon />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
        </div>
      </button>

      {/* Headline / Marketing tagline */}
      {development.headline && (
        <div className="px-3 pb-2">
          <p className="text-xs text-primary font-medium italic line-clamp-2">
            "{development.headline}"
          </p>
        </div>
      )}

      {/* Excerpt */}
      {development.excerpt && !development.headline && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {development.excerpt}
          </p>
        </div>
      )}

      {/* Price display */}
      {development.priceDisplay && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
            <DollarSign size={12} />
            <span>{development.priceDisplay}</span>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="px-3 pb-3 pt-2 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <DevelopmentStatusBadge status={development.developmentStatus} />
        </div>

        {/* Date info */}
        {hasDateInfo && (
          <div className="text-xs text-muted-foreground pt-1">
            {development.launchDate && (
              <span>Mở bán: {formatDateVN(development.launchDate)}</span>
            )}
            {development.launchDate && development.expectedCompletion && ' • '}
            {development.expectedCompletion && (
              <span>Bàn giao: {formatDateVN(development.expectedCompletion)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Google Maps InfoWindow for map feature details
 */
export function GoogleMapInfoWindow({
  feature,
  position,
  onClose,
}: GoogleMapInfoWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { startTransition } = usePageTransition();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const detailsUrl = feature.slug
    ? `/details/${feature.slug}`
    : `/details/${feature.id}`;

  // Animate in on mount
  useEffect(() => {
    // Small delay to ensure the DOM is ready for animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    // Add listener with a small delay to avoid immediate closure
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  const handleMouseLeave = useCallback(() => {
    // When mouse leaves the popup, close it
    handleClose();
  }, [handleClose]);

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
      onCloseClick={handleClose}
      options={{
        pixelOffset: new google.maps.Size(0, -10),
        disableAutoPan: true,
      }}
    >
      {/* Outer wrapper with 12px padding for better hover detection */}
      <div
        ref={wrapperRef}
        className="p-3 -m-3"
        onMouseLeave={handleMouseLeave}
      >
        {/* Inner content with animation */}
        <div
          className={`transition-all duration-150 ${
            isVisible && !isClosing
              ? 'opacity-100 scale-100 ease-out'
              : 'opacity-0 scale-95 ease-in'
          }`}
        >
          {isConstruction(feature) ? (
            <ConstructionContent
              construction={feature}
              onNavigate={handleNavigate}
              containerRef={containerRef}
            />
          ) : isDevelopment(feature) ? (
            <DevelopmentContent
              development={feature}
              onNavigate={handleNavigate}
              containerRef={containerRef}
            />
          ) : null}
        </div>
      </div>
    </InfoWindow>
  );
}
