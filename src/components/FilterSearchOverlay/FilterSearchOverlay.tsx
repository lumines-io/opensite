'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getStatusColor, getStatusLabel, getTypeLabel } from '@/lib/construction-utils';
import { useAnimatedVisibility } from '@/hooks/useAnimatedVisibility';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import type {
  SearchFilters,
  SearchResultItem,
  SearchResponse,
  FilterOption,
} from '@/types/construction';

interface FilterSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onConstructionSelect?: (construction: SearchResultItem) => void;
}

const CONSTRUCTION_TYPES: FilterOption[] = [
  { value: '', label: 'Tất cả loại' },
  { value: 'road', label: 'Công trình đường' },
  { value: 'highway', label: 'Cao tốc' },
  { value: 'metro', label: 'Metro' },
  { value: 'bridge', label: 'Cầu' },
  { value: 'tunnel', label: 'Hầm' },
  { value: 'interchange', label: 'Nút giao' },
  { value: 'station', label: 'Trạm' },
  { value: 'other', label: 'Khác' },
];

const CONSTRUCTION_STATUSES: FilterOption[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'planned', label: 'Kế hoạch' },
  { value: 'in-progress', label: 'Đang thi công' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'paused', label: 'Tạm dừng' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  type: '',
  status: '',
  startDateFrom: '',
  startDateTo: '',
  endDateFrom: '',
  endDateTo: '',
};

export function FilterSearchOverlay({
  isOpen,
  onClose,
  onConstructionSelect,
}: FilterSearchOverlayProps) {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { shouldRender, isVisible } = useAnimatedVisibility(isOpen, 300);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchFilters: SearchFilters, page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchFilters.query) params.set('q', searchFilters.query);
      if (searchFilters.type) params.set('type', searchFilters.type);
      if (searchFilters.status) params.set('status', searchFilters.status);
      if (searchFilters.startDateFrom) params.set('startDateFrom', searchFilters.startDateFrom);
      if (searchFilters.startDateTo) params.set('startDateTo', searchFilters.startDateTo);
      if (searchFilters.endDateFrom) params.set('endDateFrom', searchFilters.endDateFrom);
      if (searchFilters.endDateTo) params.set('endDateTo', searchFilters.endDateTo);
      params.set('page', page.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search on query change
  const handleQueryChange = useCallback(
    (value: string) => {
      setFilters((prev) => ({ ...prev, query: value }));
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        performSearch({ ...filters, query: value }, 1);
      }, 300);
    },
    [filters, performSearch]
  );

  // Update filter and search
  const handleFilterChange = useCallback(
    (key: keyof SearchFilters, value: string) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      performSearch(newFilters, 1);
    },
    [filters, performSearch]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setResults([]);
    setPagination({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  }, []);

  // Load more results
  const handleLoadMore = useCallback(() => {
    if (pagination.hasMore && !isLoading) {
      performSearch(filters, pagination.page + 1);
    }
  }, [filters, pagination, isLoading, performSearch]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.type !== '' ||
      filters.status !== '' ||
      filters.startDateFrom !== '' ||
      filters.startDateTo !== '' ||
      filters.endDateFrom !== '' ||
      filters.endDateTo !== ''
    );
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type) count++;
    if (filters.status) count++;
    if (filters.startDateFrom || filters.startDateTo) count++;
    if (filters.endDateFrom || filters.endDateTo) count++;
    return count;
  }, [filters]);

  // Handle construction click
  const handleConstructionClick = useCallback(
    (construction: SearchResultItem) => {
      if (onConstructionSelect) {
        onConstructionSelect(construction);
      }
    },
    [onConstructionSelect]
  );

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFilters) {
          setShowFilters(false);
        } else {
          onClose();
        }
      }
    },
    [onClose, showFilters]
  );

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
      });
    } catch {
      return null;
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 overlay-backdrop ${
          isVisible ? 'overlay-backdrop-visible' : 'overlay-backdrop-hidden'
        }`}
        onClick={onClose}
      />

      {/* Overlay panel */}
      <div
        className={`fixed top-0 left-0 h-full w-full sm:max-w-md bg-card shadow-xl z-50 flex flex-col overlay-panel-left ${
          isVisible ? 'overlay-panel-left-visible' : 'overlay-panel-left-hidden'
        }`}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-lg text-foreground">Tìm kiếm công trình</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <svg
                className="w-5 h-5 text-foreground"
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

          {/* Search input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={filters.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Tìm theo tên công trình, mô tả..."
              className="w-full px-4 py-3 pr-10 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            {isLoading ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg
                  className="w-5 h-5 animate-spin text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
            ) : (
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>

          {/* Filter toggle button */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-body-sm rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 text-caption bg-white text-amber-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="p-4 border-b border-border bg-muted/50 space-y-4">
            {/* Type filter */}
            <div>
              <label className="block text-label-md text-foreground mb-1">
                Loại công trình
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {CONSTRUCTION_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-label-md text-foreground mb-1">Trạng thái</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {CONSTRUCTION_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range filters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label-md text-foreground mb-1">
                  Ngày bắt đầu từ
                </label>
                <input
                  type="date"
                  value={filters.startDateFrom}
                  onChange={(e) => handleFilterChange('startDateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-label-md text-foreground mb-1">
                  Ngày bắt đầu đến
                </label>
                <input
                  type="date"
                  value={filters.startDateTo}
                  onChange={(e) => handleFilterChange('startDateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label-md text-foreground mb-1">
                  Ngày hoàn thành từ
                </label>
                <input
                  type="date"
                  value={filters.endDateFrom}
                  onChange={(e) => handleFilterChange('endDateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-label-md text-foreground mb-1">
                  Ngày hoàn thành đến
                </label>
                <input
                  type="date"
                  value={filters.endDateTo}
                  onChange={(e) => handleFilterChange('endDateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && results.length === 0 ? (
            <div className="p-4 space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-body-sm">
                {filters.query || hasActiveFilters
                  ? 'Không tìm thấy công trình nào phù hợp.'
                  : 'Nhập từ khóa hoặc chọn bộ lọc để tìm kiếm công trình'}
              </p>
            </div>
          ) : (
            <div className="p-4">
              {/* Results count */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-body-sm text-muted-foreground">
                  Tìm thấy <span className="font-medium text-foreground">{pagination.total}</span>{' '}
                  công trình
                </p>
              </div>

              {/* Results list */}
              <div className="space-y-3">
                {results.map((construction) => (
                  <div
                    key={construction.id}
                    className="p-3 bg-card border border-border rounded-lg hover:border-amber-400 cursor-pointer transition-colors"
                    onClick={() => handleConstructionClick(construction)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/details/${construction.slug}`}
                          className="text-label-lg text-foreground hover:text-amber-600 transition-colors line-clamp-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {construction.title}
                        </Link>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(construction.constructionStatus)}`}
                          />
                          <span className="text-caption text-muted-foreground">
                            {getStatusLabel(construction.constructionStatus)}
                          </span>
                          <span className="text-caption text-muted-foreground">•</span>
                          <span className="text-caption text-muted-foreground">
                            {getTypeLabel(construction.constructionType)}
                          </span>
                        </div>
                        {(construction.startDate || construction.expectedEndDate) && (
                          <div className="text-caption text-muted-foreground mt-1">
                            {formatDate(construction.startDate) && (
                              <span>Bắt đầu: {formatDate(construction.startDate)}</span>
                            )}
                            {construction.startDate && construction.expectedEndDate && (
                              <span> • </span>
                            )}
                            {formatDate(construction.expectedEndDate) && (
                              <span>Dự kiến: {formatDate(construction.expectedEndDate)}</span>
                            )}
                          </div>
                        )}
                        {construction.excerpt && (
                          <p className="text-caption text-muted-foreground mt-2 line-clamp-2">
                            {construction.excerpt}...
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-label-sm text-foreground">
                          {construction.progress}%
                        </span>
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${construction.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more button */}
              {pagination.hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="w-full mt-4 py-2 text-body-sm text-amber-600 hover:text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Đang tải...' : 'Xem thêm'}
                </button>
              )}

              {/* Page info */}
              <p className="text-center text-caption text-muted-foreground mt-3">
                Trang {pagination.page} / {pagination.totalPages}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
