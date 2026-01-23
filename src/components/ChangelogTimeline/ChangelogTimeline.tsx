'use client';

import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Clock,
  Loader2,
  AlertCircle,
  User,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

interface ChangelogEntry {
  id: string;
  title: string;
  changeType: string;
  description?: {
    root: {
      children: Array<{
        children: Array<{
          text: string;
        }>;
      }>;
    };
  };
  eventDate: string;
  createdAt: string;
  statusChange?: {
    previousStatus?: string;
    newStatus?: string;
  };
  progressChange?: {
    previousProgress?: number;
    newProgress?: number;
  };
  timelineChange?: {
    field?: string;
    previousDate?: string;
    newDate?: string;
  };
  milestone?: {
    milestoneName?: string;
    milestoneDate?: string;
  };
  source?: {
    url?: string;
    title?: string;
  };
  author?: {
    id: string;
    name: string;
  } | null;
}

interface ChangelogTimelineProps {
  slug: string;
  maxItems?: number;
  showHeader?: boolean;
}

// Change type icons and colors
const CHANGE_TYPE_CONFIG: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  status: {
    icon: '🔄',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Thay đổi trạng thái',
  },
  progress: {
    icon: '📊',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Cập nhật tiến độ',
  },
  timeline: {
    icon: '📅',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Thay đổi lịch trình',
  },
  milestone: {
    icon: '🎯',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Cột mốc',
  },
  news: {
    icon: '📰',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    label: 'Tin tức',
  },
  image: {
    icon: '📷',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    label: 'Cập nhật hình ảnh',
  },
  budget: {
    icon: '💰',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Thay đổi ngân sách',
  },
  other: {
    icon: '📝',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Khác',
  },
};

// Status labels in Vietnamese
const STATUS_LABELS: Record<string, string> = {
  planned: 'Kế hoạch',
  'in-progress': 'Đang thi công',
  completed: 'Hoàn thành',
  paused: 'Tạm dừng',
  cancelled: 'Đã hủy',
};

export function ChangelogTimeline({ slug, maxItems = 20, showHeader = true }: ChangelogTimelineProps) {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [constructionTitle, setConstructionTitle] = useState<string>('');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    async function fetchChangelog() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/constructions/${slug}/changelog`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Không tìm thấy công trình');
          } else {
            throw new Error('Failed to fetch changelog');
          }
          return;
        }

        const data = await response.json();
        setChangelog(data.changelog.slice(0, maxItems));
        setConstructionTitle(data.construction.title);
      } catch (err) {
        console.error('Changelog fetch error:', err);
        setError('Không thể tải lịch sử thay đổi');
      } finally {
        setIsLoading(false);
      }
    }

    fetchChangelog();
  }, [slug, maxItems]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Extract plain text from rich text
  const extractText = (richText?: ChangelogEntry['description'], truncate = true) => {
    if (!richText?.root?.children) return '';
    const fullText = richText.root.children
      .map((block) =>
        block.children?.map((child) => child.text || '').join('') || ''
      )
      .join(' ');
    return truncate ? fullText.slice(0, 150) : fullText;
  };

  // Check if text needs truncation
  const needsTruncation = (richText?: ChangelogEntry['description']) => {
    const fullText = extractText(richText, false);
    return fullText.length > 150;
  };

  // Render change details
  const renderChangeDetails = (entry: ChangelogEntry) => {
    switch (entry.changeType) {
      case 'status':
        if (entry.statusChange?.previousStatus && entry.statusChange?.newStatus) {
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{STATUS_LABELS[entry.statusChange.previousStatus]}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-blue-600">{STATUS_LABELS[entry.statusChange.newStatus]}</span>
            </div>
          );
        }
        break;

      case 'progress':
        if (entry.progressChange) {
          const prev = entry.progressChange.previousProgress ?? 0;
          const next = entry.progressChange.newProgress ?? 0;
          const diff = next - prev;
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{prev}%</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-green-600">{next}%</span>
              {diff > 0 && (
                <span className="text-xs text-green-500">(+{diff}%)</span>
              )}
            </div>
          );
        }
        break;

      case 'timeline':
        if (entry.timelineChange?.field && entry.timelineChange?.newDate) {
          const fieldLabels: Record<string, string> = {
            startDate: 'Ngày bắt đầu',
            expectedEndDate: 'Ngày dự kiến hoàn thành',
            actualEndDate: 'Ngày hoàn thành thực tế',
          };
          return (
            <div className="text-sm">
              <span className="text-gray-500 text-xs">{fieldLabels[entry.timelineChange.field]}</span>
              <div className="flex items-center gap-2 mt-1">
                {entry.timelineChange.previousDate ? (
                  <>
                    <span className="text-gray-500">{formatDate(entry.timelineChange.previousDate)}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-orange-600">{formatDate(entry.timelineChange.newDate)}</span>
                  </>
                ) : (
                  <span className="font-medium text-orange-600">{formatDate(entry.timelineChange.newDate)}</span>
                )}
              </div>
            </div>
          );
        }
        break;

      case 'milestone':
        if (entry.milestone?.milestoneName) {
          return (
            <div className="text-sm">
              <span className="font-medium text-purple-600">{entry.milestone.milestoneName}</span>
              {entry.milestone.milestoneDate && (
                <span className="text-gray-500"> - {formatDate(entry.milestone.milestoneDate)}</span>
              )}
            </div>
          );
        }
        break;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Đang tải...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="changelog-timeline">
      {showHeader && (
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-600" />
          </span>
          Lịch sử thay đổi
        </h3>
      )}

      {changelog.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
          <p>Chưa có lịch sử thay đổi</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Timeline entries */}
          <div className="space-y-4">
            {changelog.map((entry, index) => {
              const config = CHANGE_TYPE_CONFIG[entry.changeType] || CHANGE_TYPE_CONFIG.other;
              const isExpanded = expandedEntries.has(entry.id);
              const hasLongDescription = needsTruncation(entry.description);

              return (
                <div key={entry.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full ${config.bgColor} flex items-center justify-center text-xs`}
                  >
                    {config.icon}
                  </div>

                  {/* Entry content */}
                  <div className={`p-3 rounded-lg border transition-colors ${index === 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {entry.author && (
                          <>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {entry.author.name}
                            </span>
                            <span className="text-slate-300">•</span>
                          </>
                        )}
                        <span>{formatDate(entry.eventDate)}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-medium text-slate-900 text-sm mb-1">
                      {entry.title}
                    </h4>

                    {/* Change details */}
                    {renderChangeDetails(entry)}

                    {/* Description with expand/collapse */}
                    {entry.description && (
                      <div className="mt-2">
                        <p className={`text-sm text-slate-600 ${!isExpanded && hasLongDescription ? 'line-clamp-2' : ''}`}>
                          {isExpanded ? extractText(entry.description, false) : extractText(entry.description)}
                          {!isExpanded && hasLongDescription && '...'}
                        </p>
                        {hasLongDescription && (
                          <button
                            onClick={() => toggleExpanded(entry.id)}
                            className="text-xs text-blue-500 hover:text-blue-600 mt-1 flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Thu gọn
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                Xem thêm
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Source link */}
                    {entry.source?.url && (
                      <a
                        href={entry.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {entry.source.title || 'Nguồn'}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
