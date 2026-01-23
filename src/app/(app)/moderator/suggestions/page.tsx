'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Suggestion,
  SuggestionsResponse,
  SUGGESTION_STATUS_CONFIG,
  SUGGESTION_TYPE_CONFIG,
  SOURCE_TYPE_CONFIG,
} from '@/types/suggestion';
import { SuggestionDetail } from './SuggestionDetail';
import { ContentPageTemplate } from '@/components/layout';
import { Badge, Alert, Button } from '@/components/ui';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'under_review', label: 'Đang xem xét' },
  { value: 'changes_requested', label: 'Yêu cầu sửa đổi' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
  { value: 'merged', label: 'Đã hợp nhất' },
];

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'createdAt', label: 'Ngày tạo' },
  { value: 'updatedAt', label: 'Ngày cập nhật' },
  { value: 'title', label: 'Tiêu đề' },
];

export default function ModeratorSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('pending,under_review');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalDocs: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (statusFilter) {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/suggestions?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          setError('Bạn không có quyền truy cập trang này. Chỉ moderator và admin mới được phép.');
          return;
        }
        throw new Error('Failed to fetch suggestions');
      }

      const data: SuggestionsResponse = await response.json();
      setSuggestions(data.suggestions);
      setPagination({
        totalDocs: data.pagination.totalDocs,
        totalPages: data.pagination.totalPages,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Không thể tải danh sách đề xuất. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleSuggestionUpdate = useCallback((updated: Suggestion) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    setSelectedSuggestion(updated);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <ContentPageTemplate
        pageTitle="Hàng đợi xét duyệt"
        showFullFooter={false}
      >
        <Alert variant="error" title="Không có quyền truy cập" className="text-center">
          <p className="mb-4">{error}</p>
          <Button as="link" href="/" variant="primary">
            Quay về trang chủ
          </Button>
        </Alert>
      </ContentPageTemplate>
    );
  }

  const actions = (
    <Badge variant="warning" size="lg">
      {pagination.totalDocs} đề xuất
    </Badge>
  );

  return (
    <ContentPageTemplate
      pageTitle="Hàng đợi xét duyệt"
      pageDescription="Xem xét và xử lý các đề xuất từ cộng đồng"
      showFullFooter={false}
      actions={actions}
    >
      {/* Filters */}
      <div className="border-b border-border bg-card/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Trạng thái:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="pending,under_review">Cần xử lý</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Sắp xếp:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-1.5 border border-border rounded-lg bg-card hover:bg-muted transition-colors"
                title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
              >
                {sortOrder === 'asc' ? (
                  <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  </svg>
                )}
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchSuggestions}
              disabled={isLoading}
              className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Làm mới
            </button>
          </div>
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted rounded w-20" />
                      <div className="h-6 bg-muted rounded w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Không có đề xuất nào
            </h3>
            <p className="text-muted-foreground">
              Hiện tại không có đề xuất nào khớp với bộ lọc của bạn.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onClick={() => setSelectedSuggestion(suggestion)}
                isSelected={selectedSuggestion?.id === suggestion.id}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Trước
            </button>
            <span className="px-4 py-1.5 text-sm text-muted-foreground">
              Trang {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedSuggestion && (
        <SuggestionDetail
          suggestion={selectedSuggestion}
          onClose={handleCloseDetail}
          onUpdate={handleSuggestionUpdate}
        />
      )}
    </ContentPageTemplate>
  );
}

// Suggestion Card Component
function SuggestionCard({
  suggestion,
  onClick,
  isSelected,
  formatDate,
}: {
  suggestion: Suggestion;
  onClick: () => void;
  isSelected: boolean;
  formatDate: (date: string) => string;
}) {
  const statusConfig = SUGGESTION_STATUS_CONFIG[suggestion.status];
  const typeConfig = SUGGESTION_TYPE_CONFIG[suggestion.suggestionType];
  const sourceConfig = SOURCE_TYPE_CONFIG[suggestion.sourceType];

  return (
    <div
      onClick={onClick}
      className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-border hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${statusConfig.bgColor}`}
        >
          <TypeIcon type={suggestion.suggestionType} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate">{suggestion.title}</h3>
              {suggestion.construction && (
                <p className="text-sm text-muted-foreground truncate">
                  Liên quan: {suggestion.construction.title}
                </p>
              )}
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              {typeConfig.label}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatDate(suggestion.createdAt)}
            </span>
            {suggestion.submittedBy && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {suggestion.submittedBy.name || suggestion.submittedBy.email}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                suggestion.sourceType === 'community'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : suggestion.sourceType === 'scraper'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}
            >
              {sourceConfig.label}
            </span>
          </div>

          {/* Justification preview */}
          {suggestion.justification && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {suggestion.justification}
            </p>
          )}

          {/* Assigned to */}
          {suggestion.assignedTo && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Đang xử lý bởi:</span>
              <span className="font-medium text-foreground">
                {suggestion.assignedTo.name || suggestion.assignedTo.email}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Type Icon Component
function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'create':
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'update':
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      );
    case 'complete':
      return (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'correction':
      return (
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    default:
      return null;
  }
}
