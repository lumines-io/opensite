'use client';

interface TimelineVisualProps {
  announcedDate?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  actualEndDate?: string | null;
  progress: number;
  status: string;
}

interface TimelineEvent {
  key: string;
  label: string;
  date: string | null | undefined;
  icon: string;
  color: string;
  bgColor: string;
  isPast: boolean;
  isCurrent: boolean;
}

export function TimelineVisual({
  announcedDate,
  startDate,
  expectedEndDate,
  actualEndDate,
  progress,
  status,
}: TimelineVisualProps) {
  const now = new Date();

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isDatePast = (dateString: string | null | undefined) => {
    if (!dateString) return false;
    return new Date(dateString) < now;
  };

  const events: TimelineEvent[] = [
    {
      key: 'announced',
      label: 'Công bố',
      date: announcedDate,
      icon: '📢',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      isPast: isDatePast(announcedDate),
      isCurrent: false,
    },
    {
      key: 'start',
      label: 'Khởi công',
      date: startDate,
      icon: '🚀',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      isPast: isDatePast(startDate),
      isCurrent: status === 'in-progress' && isDatePast(startDate) && !isDatePast(expectedEndDate),
    },
    {
      key: 'expected',
      label: 'Dự kiến hoàn thành',
      date: expectedEndDate,
      icon: '🎯',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      isPast: isDatePast(expectedEndDate),
      isCurrent: false,
    },
    {
      key: 'actual',
      label: 'Hoàn thành thực tế',
      date: actualEndDate,
      icon: '🏁',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      isPast: isDatePast(actualEndDate),
      isCurrent: status === 'completed',
    },
  ].filter(e => e.date);

  // Calculate progress position on timeline
  const getProgressPosition = () => {
    if (status === 'completed') return 100;
    if (status === 'planned') return 0;
    if (!startDate || !expectedEndDate) return progress;

    const start = new Date(startDate).getTime();
    const end = new Date(expectedEndDate).getTime();
    const current = now.getTime();

    if (current <= start) return 0;
    if (current >= end) return 100;

    return Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
  };

  const timelineProgress = getProgressPosition();

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>Chưa có thông tin thời gian</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Timeline Bar */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              status === 'completed'
                ? 'bg-emerald-500'
                : status === 'paused'
                ? 'bg-red-400'
                : 'bg-amber-500'
            }`}
            style={{ width: `${timelineProgress}%` }}
          />
        </div>

        {/* Event markers */}
        <div className="absolute top-0 left-0 right-0 flex justify-between">
          {events.map((event, index) => {
            const position = (index / (events.length - 1)) * 100;
            const isActive = event.isPast || event.isCurrent;

            return (
              <div
                key={event.key}
                className="relative"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-colors -mt-1 ${
                    isActive
                      ? `${event.bgColor} border-current ${event.color}`
                      : 'bg-white border-slate-300'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {events.map((event) => {
          const isActive = event.isPast || event.isCurrent;

          return (
            <div
              key={event.key}
              className={`p-4 rounded-xl transition-all ${
                event.isCurrent
                  ? `${event.bgColor} ring-2 ring-current ${event.color}`
                  : isActive
                  ? event.bgColor
                  : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{event.icon}</span>
                <span className={`text-xs font-medium uppercase tracking-wide ${
                  isActive ? event.color : 'text-slate-500'
                }`}>
                  {event.label}
                </span>
              </div>
              <p className={`font-semibold ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {formatDate(event.date) || 'Chưa xác định'}
              </p>
              {event.isCurrent && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-amber-600">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Đang thực hiện
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Time remaining or overdue indicator */}
      {status === 'in-progress' && expectedEndDate && (
        <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
          isDatePast(expectedEndDate) ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        }`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {isDatePast(expectedEndDate) ? (
            <span>
              <strong>Quá hạn</strong> {Math.abs(Math.ceil((new Date(expectedEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))} ngày
            </span>
          ) : (
            <span>
              <strong>Còn lại</strong> {Math.ceil((new Date(expectedEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} ngày
            </span>
          )}
        </div>
      )}
    </div>
  );
}
