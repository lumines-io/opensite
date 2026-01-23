// Status color mappings
export const STATUS_COLORS: Record<string, string> = {
  'planned': 'bg-gray-400',
  'in-progress': 'bg-amber-500',
  'completed': 'bg-green-500',
  'paused': 'bg-red-500',
  'cancelled': 'bg-gray-600',
};

// Vietnamese status labels
export const STATUS_LABELS: Record<string, string> = {
  'planned': 'Kế hoạch',
  'in-progress': 'Đang thi công',
  'completed': 'Hoàn thành',
  'paused': 'Tạm dừng',
  'cancelled': 'Đã hủy',
};

// Construction type labels
export const TYPE_LABELS: Record<string, string> = {
  'road': 'Công trình đường',
  'highway': 'Cao tốc',
  'metro': 'Metro',
  'bridge': 'Cầu',
  'tunnel': 'Hầm',
  'interchange': 'Nút giao',
  'station': 'Trạm',
  'other': 'Khác',
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-400';
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}
