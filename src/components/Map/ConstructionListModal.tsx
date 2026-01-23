'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { STATUS_COLORS, TYPE_COLORS } from './construction-map.constants';
import { getTypeLabel, getStatusLabel } from './construction-map.utils';
import type { Construction } from './construction-map.types';

interface ConstructionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  constructions: Construction[];
  onSelectConstruction?: (construction: Construction) => void;
}

/**
 * Progress bar component
 */
function ProgressBar({ progress, statusColor }: { progress: number; statusColor: string }) {
  return (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-1 rounded-full transition-all"
        style={{
          width: `${progress}%`,
          backgroundColor: statusColor,
        }}
      />
    </div>
  );
}

/**
 * Type badge component
 */
function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: TYPE_COLORS[type] || TYPE_COLORS['other'] }}
    />
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS['planned'];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {getStatusLabel(status)}
    </span>
  );
}

/**
 * Close icon
 */
function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * List icon for the toggle button
 */
function ListIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
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
 * Single construction item in the list
 */
function ConstructionItem({
  construction,
  onSelect,
}: {
  construction: Construction;
  onSelect?: () => void;
}) {
  const statusColor = STATUS_COLORS[construction.constructionStatus] || STATUS_COLORS['planned'];
  const detailsUrl = construction.slug
    ? `/details/${construction.slug}`
    : `/details/${construction.id}`;

  return (
    <div
      className="p-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <TypeBadge type={construction.constructionType} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={detailsUrl}
              className="group flex items-center gap-1.5 hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-medium text-sm text-card-foreground line-clamp-1 group-hover:text-primary">
                {construction.title}
              </h4>
              <ExternalLinkIcon />
            </Link>
            <StatusBadge status={construction.constructionStatus} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {getTypeLabel(construction.constructionType)}
          </p>
          {construction.excerpt && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {construction.excerpt}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar progress={construction.progress} statusColor={statusColor} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {construction.progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Toggle button to open the construction list modal
 */
export function ConstructionListToggle({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-4 left-4 bg-card rounded-lg shadow p-2.5 border border-border hover:bg-muted/50 transition-colors flex items-center gap-2"
      title="Xem danh sách công trình"
    >
      <ListIcon />
      <span className="text-sm font-medium">{count}</span>
    </button>
  );
}

/**
 * Modal showing list of all constructions visible in the map area
 */
export function ConstructionListModal({
  isOpen,
  onClose,
  constructions,
  onSelectConstruction,
}: ConstructionListModalProps) {
  // Group constructions by type
  const groupedByType = useMemo(() => {
    const groups: Record<string, Construction[]> = {};
    for (const c of constructions) {
      const type = c.constructionType || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(c);
    }
    return groups;
  }, [constructions]);

  const handleSelect = useCallback(
    (construction: Construction) => {
      onSelectConstruction?.(construction);
    },
    [onSelectConstruction]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 z-10"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute top-4 left-4 bottom-4 w-[360px] bg-card rounded-lg shadow-lg border border-border z-20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-card-foreground">
              Công trình trong khu vực
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {constructions.length} công trình
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-card-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {constructions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">Không có công trình nào trong khu vực này</p>
              <p className="text-xs mt-1">Di chuyển bản đồ để xem các công trình khác</p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedByType).map(([type, items]) => (
                <div key={type}>
                  <div className="px-4 py-2 bg-muted/30 border-b border-border sticky top-0">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={type} />
                      <span className="text-xs font-medium text-card-foreground">
                        {getTypeLabel(type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({items.length})
                      </span>
                    </div>
                  </div>
                  {items.map((construction) => (
                    <ConstructionItem
                      key={construction.id}
                      construction={construction}
                      onSelect={() => handleSelect(construction)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
