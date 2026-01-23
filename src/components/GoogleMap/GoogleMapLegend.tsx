'use client';

import { useCallback, useState } from 'react';
import {
  TYPE_COLORS,
  STATUS_COLORS,
  SOURCE_COLLECTION_COLORS,
  SOURCE_COLLECTION_LABELS,
  DEVELOPMENT_TYPE_COLORS,
  DEVELOPMENT_TYPE_LABELS,
  TYPE_LABELS,
  STATUS_LABELS_SHORT,
} from './google-map.constants';

interface FilterToggleProps {
  color: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Color dot component for legend items
 */
function ColorDot({ color, dimmed }: { color: string; dimmed?: boolean }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
      style={{
        backgroundColor: color,
        opacity: dimmed ? 0.3 : 1,
      }}
    />
  );
}

/**
 * Filter toggle item component with checkbox
 */
function FilterToggle({ color, label, checked, onChange }: FilterToggleProps) {
  const handleClick = useCallback(() => {
    onChange(!checked);
  }, [checked, onChange]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors cursor-pointer w-full text-left"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(!checked)}
        className="w-3 h-3 rounded border-border text-primary focus:ring-primary cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />
      <ColorDot color={color} dimmed={!checked} />
      <span
        className={`text-xs truncate transition-opacity ${
          checked ? 'text-card-foreground' : 'text-muted-foreground opacity-60'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Legend section component with optional "select all" toggle
 */
function LegendSection({
  title,
  allSelected,
  onToggleAll,
  children,
}: {
  title: string;
  allSelected?: boolean;
  onToggleAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-card-foreground">{title}</h4>
        {onToggleAll !== undefined && (
          <button
            type="button"
            onClick={onToggleAll}
            className="text-[10px] text-muted-foreground hover:text-card-foreground transition-colors"
          >
            {allSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">{children}</div>
    </div>
  );
}

export interface GoogleMapLegendProps {
  visibleTypes: Set<string>;
  visibleStatuses: Set<string>;
  visibleSourceCollections: Set<string>;
  visibleDevelopmentTypes?: Set<string>;
  onTypeToggle: (type: string) => void;
  onStatusToggle: (status: string) => void;
  onSourceCollectionToggle: (source: string) => void;
  onDevelopmentTypeToggle?: (type: string) => void;
  onToggleAllTypes: () => void;
  onToggleAllStatuses: () => void;
  onToggleAllSourceCollections: () => void;
  onToggleAllDevelopmentTypes?: () => void;
}

/**
 * Map legend showing construction types, statuses, and source collections with filter toggles
 */
export function GoogleMapLegend({
  visibleTypes,
  visibleStatuses,
  visibleSourceCollections,
  visibleDevelopmentTypes,
  onTypeToggle,
  onStatusToggle,
  onSourceCollectionToggle,
  onDevelopmentTypeToggle,
  onToggleAllTypes,
  onToggleAllStatuses,
  onToggleAllSourceCollections,
  onToggleAllDevelopmentTypes,
}: GoogleMapLegendProps) {
  const [showDevelopmentTypes, setShowDevelopmentTypes] = useState(false);

  const allTypesSelected = visibleTypes.size === Object.keys(TYPE_COLORS).length;
  const allStatusesSelected =
    visibleStatuses.size === Object.keys(STATUS_COLORS).length;
  const allSourceCollectionsSelected =
    visibleSourceCollections.size === Object.keys(SOURCE_COLLECTION_COLORS).length;
  const allDevelopmentTypesSelected = visibleDevelopmentTypes
    ? visibleDevelopmentTypes.size === Object.keys(DEVELOPMENT_TYPE_COLORS).length
    : false;

  // Check if developments are visible to show development type filters
  const developmentsVisible = visibleSourceCollections.has('developments');

  return (
    <div className="absolute bottom-4 left-4 bg-card rounded-lg shadow p-3 border border-border max-w-[260px] z-10 max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* Source Collections (Constructions vs Developments) */}
      <LegendSection
        title="Nguồn dữ liệu"
        allSelected={allSourceCollectionsSelected}
        onToggleAll={onToggleAllSourceCollections}
      >
        {Object.entries(SOURCE_COLLECTION_COLORS).map(([source, color]) => (
          <FilterToggle
            key={source}
            color={color}
            label={SOURCE_COLLECTION_LABELS[source] || source}
            checked={visibleSourceCollections.has(source)}
            onChange={() => onSourceCollectionToggle(source)}
          />
        ))}
      </LegendSection>

      {/* Construction Types (only show if constructions visible) */}
      {visibleSourceCollections.has('constructions') && (
        <div className="mt-3 pt-2 border-t border-border">
          <LegendSection
            title="Loại hạ tầng"
            allSelected={allTypesSelected}
            onToggleAll={onToggleAllTypes}
          >
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <FilterToggle
                key={type}
                color={color}
                label={TYPE_LABELS[type] || type}
                checked={visibleTypes.has(type)}
                onChange={() => onTypeToggle(type)}
              />
            ))}
          </LegendSection>
        </div>
      )}

      {/* Construction Statuses (only show if constructions visible) */}
      {visibleSourceCollections.has('constructions') && (
        <div className="mt-3 pt-2 border-t border-border">
          <LegendSection
            title="Trạng thái"
            allSelected={allStatusesSelected}
            onToggleAll={onToggleAllStatuses}
          >
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <FilterToggle
                key={status}
                color={color}
                label={STATUS_LABELS_SHORT[status] || status}
                checked={visibleStatuses.has(status)}
                onChange={() => onStatusToggle(status)}
              />
            ))}
          </LegendSection>
        </div>
      )}

      {/* Development Types (only show if developments visible and toggle enabled) */}
      {developmentsVisible && onDevelopmentTypeToggle && visibleDevelopmentTypes && (
        <div className="mt-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-card-foreground">Loại bất động sản</h4>
            <button
              type="button"
              onClick={() => setShowDevelopmentTypes(!showDevelopmentTypes)}
              className="text-[10px] text-muted-foreground hover:text-card-foreground transition-colors"
            >
              {showDevelopmentTypes ? 'Thu gọn' : 'Mở rộng'}
            </button>
          </div>

          {showDevelopmentTypes ? (
            <div>
              <div className="flex justify-end mb-1">
                <button
                  type="button"
                  onClick={onToggleAllDevelopmentTypes}
                  className="text-[10px] text-muted-foreground hover:text-card-foreground transition-colors"
                >
                  {allDevelopmentTypesSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {Object.entries(DEVELOPMENT_TYPE_COLORS).map(([type, color]) => (
                  <FilterToggle
                    key={type}
                    color={color}
                    label={DEVELOPMENT_TYPE_LABELS[type] || type}
                    checked={visibleDevelopmentTypes.has(type)}
                    onChange={() => onDevelopmentTypeToggle(type)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {visibleDevelopmentTypes.size} / {Object.keys(DEVELOPMENT_TYPE_COLORS).length} loại đang hiển thị
            </p>
          )}
        </div>
      )}
    </div>
  );
}
