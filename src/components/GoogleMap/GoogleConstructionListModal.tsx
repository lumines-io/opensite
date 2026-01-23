'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ChevronRight, X, Map } from 'lucide-react';
import {
  STATUS_COLORS,
  TYPE_LABELS,
  STATUS_LABELS_SHORT,
  SOURCE_COLLECTION_LABELS,
  DEVELOPMENT_TYPE_LABELS,
  DEVELOPMENT_STATUS_LABELS,
  DEVELOPMENT_STATUS_COLORS,
} from './google-map.constants';
import {
  getTypeColor,
  getDevelopmentTypeColor,
  getDevelopmentStatusColor,
} from './google-map.utils';
import type { MapFeature, Construction, Development } from './google-map.types';
import { isConstruction, isDevelopment } from './google-map.types';

interface GoogleConstructionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  features: MapFeature[];
  onSelectFeature: (feature: MapFeature) => void;
}

/**
 * Construction list item
 */
function ConstructionListItem({
  construction,
  onClick,
}: {
  construction: Construction;
  onClick: () => void;
}) {
  const color = getTypeColor(construction.constructionType);
  const typeLabel = TYPE_LABELS[construction.constructionType] || construction.constructionType;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 p-3 w-full text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
    >
      <span
        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-card-foreground line-clamp-1">
          {construction.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{typeLabel}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span
            className="text-xs flex items-center gap-1"
            style={{ color: STATUS_COLORS[construction.constructionStatus] }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[construction.constructionStatus] }}
            />
            {STATUS_LABELS_SHORT[construction.constructionStatus]}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{construction.progress}%</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
    </button>
  );
}

/**
 * Development list item
 */
function DevelopmentListItem({
  development,
  onClick,
}: {
  development: Development;
  onClick: () => void;
}) {
  const color = getDevelopmentTypeColor(development.developmentType);
  const typeLabel = DEVELOPMENT_TYPE_LABELS[development.developmentType] || development.developmentType;
  const statusLabel = DEVELOPMENT_STATUS_LABELS[development.developmentStatus] || development.developmentStatus;
  const statusColor = getDevelopmentStatusColor(development.developmentStatus);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 p-3 w-full text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
    >
      <span
        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-card-foreground line-clamp-1">
          {development.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{typeLabel}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span
            className="text-xs flex items-center gap-1"
            style={{ color: statusColor }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            {statusLabel}
          </span>
          {development.priceDisplay && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-green-600 dark:text-green-400">{development.priceDisplay}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
    </button>
  );
}

/**
 * Feature list item (construction or development)
 */
function FeatureListItem({
  feature,
  onClick,
}: {
  feature: MapFeature;
  onClick: () => void;
}) {
  if (isConstruction(feature)) {
    return <ConstructionListItem construction={feature} onClick={onClick} />;
  }
  if (isDevelopment(feature)) {
    return <DevelopmentListItem development={feature} onClick={onClick} />;
  }
  return null;
}

/**
 * Modal showing list of features (constructions and developments) in viewport
 */
export function GoogleConstructionListModal({
  isOpen,
  onClose,
  features,
  onSelectFeature,
}: GoogleConstructionListModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  // Count by source collection
  const constructionsCount = features.filter(isConstruction).length;
  const developmentsCount = features.filter(isDevelopment).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-card rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[70vh] flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">
              Trong khu vực ({features.length})
            </h3>
            {features.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {constructionsCount > 0 && `${constructionsCount} hạ tầng`}
                {constructionsCount > 0 && developmentsCount > 0 && ' • '}
                {developmentsCount > 0 && `${developmentsCount} bất động sản`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Feature list */}
        <div className="flex-1 overflow-y-auto">
          {features.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Map className="w-12 h-12 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
              <p>Không có dữ liệu nào trong khu vực này</p>
              <p className="text-sm mt-1">
                Di chuyển bản đồ để xem dữ liệu khác
              </p>
            </div>
          ) : (
            features.map((feature) => (
              <FeatureListItem
                key={feature.id}
                feature={feature}
                onClick={() => onSelectFeature(feature)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
