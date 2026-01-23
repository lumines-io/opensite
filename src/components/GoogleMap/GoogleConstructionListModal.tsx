'use client';

import { useCallback, useEffect, useRef } from 'react';
import { STATUS_COLORS, TYPE_LABELS, STATUS_LABELS_SHORT, CATEGORY_COLORS } from './google-map.constants';
import { getTypeColor, getPrivateTypeColor, getPrivateTypeLabel } from './google-map.utils';
import type { Construction } from './google-map.types';

interface GoogleConstructionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  constructions: Construction[];
  onSelectConstruction: (construction: Construction) => void;
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
  const isPrivate = construction.constructionCategory === 'private';
  const color = isPrivate
    ? construction.privateType
      ? getPrivateTypeColor(construction.privateType)
      : CATEGORY_COLORS['private']
    : getTypeColor(construction.constructionType);

  const typeLabel = isPrivate && construction.privateType
    ? getPrivateTypeLabel(construction.privateType)
    : TYPE_LABELS[construction.constructionType] || construction.constructionType;

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
      <svg
        className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}

/**
 * Modal showing list of constructions in viewport
 */
export function GoogleConstructionListModal({
  isOpen,
  onClose,
  constructions,
  onSelectConstruction,
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
          <h3 className="text-lg font-semibold text-card-foreground">
            Công trình trong khu vực ({constructions.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Construction list */}
        <div className="flex-1 overflow-y-auto">
          {constructions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <p>Không có công trình nào trong khu vực này</p>
              <p className="text-sm mt-1">
                Di chuyển bản đồ để xem các công trình khác
              </p>
            </div>
          ) : (
            constructions.map((construction) => (
              <ConstructionListItem
                key={construction.id}
                construction={construction}
                onClick={() => onSelectConstruction(construction)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
