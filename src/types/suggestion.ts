export type SuggestionStatus =
  | 'pending'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'merged'
  | 'superseded';

export type SuggestionType = 'create' | 'update' | 'complete' | 'correction';

export type SourceType = 'community' | 'scraper' | 'api';

export interface SuggestionUser {
  id: string;
  email: string;
  name?: string;
  role: 'contributor' | 'moderator' | 'admin';
}

export interface SuggestionConstruction {
  id: number;
  title: string;
  slug: string;
  constructionStatus: string;
  constructionType: string;
}

export interface Suggestion {
  id: string;
  title: string;
  suggestionType: SuggestionType;
  construction?: SuggestionConstruction;
  proposedData: Record<string, unknown>;
  proposedGeometry?: GeoJSON.Geometry;
  locationDescription?: string;
  justification?: string;
  evidenceUrls?: Array<{ url: string }>;
  status: SuggestionStatus;
  sourceType: SourceType;
  sourceUrl?: string;
  sourceConfidence?: number;
  contentHash?: string;
  submittedBy?: SuggestionUser;
  assignedTo?: SuggestionUser;
  reviewedBy?: SuggestionUser;
  reviewedAt?: string;
  reviewNotes?: string;
  mergedAt?: string;
  mergedVersion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  pagination: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Status display config
export const SUGGESTION_STATUS_CONFIG: Record<
  SuggestionStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: 'Chờ duyệt',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  under_review: {
    label: 'Đang xem xét',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  changes_requested: {
    label: 'Yêu cầu sửa đổi',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  approved: {
    label: 'Đã duyệt',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  rejected: {
    label: 'Từ chối',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  merged: {
    label: 'Đã hợp nhất',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  superseded: {
    label: 'Đã thay thế',
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

export const SUGGESTION_TYPE_CONFIG: Record<
  SuggestionType,
  { label: string; icon: string }
> = {
  create: { label: 'Dự án mới', icon: 'plus' },
  update: { label: 'Cập nhật', icon: 'pencil' },
  complete: { label: 'Đánh dấu hoàn thành', icon: 'check' },
  correction: { label: 'Sửa lỗi', icon: 'exclamation' },
};

export const SOURCE_TYPE_CONFIG: Record<SourceType, { label: string }> = {
  community: { label: 'Cộng đồng' },
  scraper: { label: 'Thu thập tự động' },
  api: { label: 'API chính thức' },
};
