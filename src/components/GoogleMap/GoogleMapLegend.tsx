'use client';

import { useCallback } from 'react';
import {
  TYPE_COLORS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  TYPE_LABELS,
  STATUS_LABELS_SHORT,
} from './google-map.constants';

// Short labels for categories
const CATEGORY_LABELS_SHORT: Record<string, string> = {
  'public': 'Công cộng',
  'private': 'Tư nhân',
};

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
  visibleCategories: Set<string>;
  onTypeToggle: (type: string) => void;
  onStatusToggle: (status: string) => void;
  onCategoryToggle: (category: string) => void;
  onToggleAllTypes: () => void;
  onToggleAllStatuses: () => void;
  onToggleAllCategories: () => void;
}

/**
 * Map legend showing construction types, statuses, and categories with filter toggles
 */
export function GoogleMapLegend({
  visibleTypes,
  visibleStatuses,
  visibleCategories,
  onTypeToggle,
  onStatusToggle,
  onCategoryToggle,
  onToggleAllTypes,
  onToggleAllStatuses,
  onToggleAllCategories,
}: GoogleMapLegendProps) {
  const allTypesSelected = visibleTypes.size === Object.keys(TYPE_COLORS).length;
  const allStatusesSelected =
    visibleStatuses.size === Object.keys(STATUS_COLORS).length;
  const allCategoriesSelected =
    visibleCategories.size === Object.keys(CATEGORY_COLORS).length;

  return (
    <div className="absolute bottom-4 left-4 bg-card rounded-lg shadow p-3 border border-border max-w-[220px] z-10">
      {/* Construction Categories (Public vs Private) */}
      <LegendSection
        title="Phân loại"
        allSelected={allCategoriesSelected}
        onToggleAll={onToggleAllCategories}
      >
        {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
          <FilterToggle
            key={category}
            color={color}
            label={CATEGORY_LABELS_SHORT[category] || category}
            checked={visibleCategories.has(category)}
            onChange={() => onCategoryToggle(category)}
          />
        ))}
      </LegendSection>

      {/* Divider */}
      <div className="mt-3 pt-2 border-t border-border">
        {/* Construction Types */}
        <LegendSection
          title="Loại công trình"
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

      {/* Divider */}
      <div className="mt-3 pt-2 border-t border-border">
        {/* Construction Statuses */}
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
    </div>
  );
}
