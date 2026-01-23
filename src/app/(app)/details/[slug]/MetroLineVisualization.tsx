'use client';

interface MetroStation {
  name: string;
  nameEn?: string | null;
  stationOrder?: number | null;
  stationStatus?: string | null;
  stationProgress?: number | null;
  openedAt?: string | null;
}

interface MetroLineVisualizationProps {
  stations: MetroStation[];
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  planned: { color: 'bg-slate-400', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', label: 'Kế hoạch' },
  'in-progress': { color: 'bg-amber-500', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', label: 'Đang xây' },
  completed: { color: 'bg-blue-500', bgColor: 'bg-blue-100', borderColor: 'border-blue-300', label: 'Hoàn thành' },
  operational: { color: 'bg-emerald-500', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-300', label: 'Hoạt động' },
};

export function MetroLineVisualization({ stations }: MetroLineVisualizationProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="relative">
      {/* Horizontal scrollable container for mobile */}
      <div className="overflow-x-auto pb-4 -mx-6 px-6">
        <div className="min-w-max">
          {/* Metro Line Track */}
          <div className="relative">
            {/* Main track line */}
            <div className="absolute top-6 left-6 right-6 h-2 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 rounded-full" />

            {/* Stations */}
            <div className="relative flex justify-between" style={{ minWidth: Math.max(600, stations.length * 120) }}>
              {stations.map((station, index) => {
                const config = STATUS_CONFIG[station.stationStatus || 'planned'];
                const isFirst = index === 0;
                const isLast = index === stations.length - 1;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center"
                    style={{ width: `${100 / stations.length}%` }}
                  >
                    {/* Station marker */}
                    <div className="relative z-10">
                      {/* Outer ring */}
                      <div className={`w-12 h-12 rounded-full ${config.bgColor} border-4 ${config.borderColor} flex items-center justify-center transition-transform hover:scale-110`}>
                        {/* Inner dot */}
                        <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center`}>
                          {station.stationStatus === 'operational' && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {station.stationStatus === 'in-progress' && (
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          )}
                        </div>
                      </div>

                      {/* Station number badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {station.stationOrder || index + 1}
                      </div>
                    </div>

                    {/* Station info */}
                    <div className="mt-4 text-center max-w-[100px]">
                      <p className="font-semibold text-slate-900 text-sm leading-tight">
                        {station.name}
                      </p>
                      {station.nameEn && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {station.nameEn}
                        </p>
                      )}

                      {/* Progress or status badge */}
                      <div className="mt-2">
                        {station.stationStatus === 'in-progress' && station.stationProgress !== null && station.stationProgress !== undefined ? (
                          <div className="space-y-1">
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all"
                                style={{ width: `${station.stationProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-amber-600 font-medium">
                              {station.stationProgress}%
                            </span>
                          </div>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color.replace('bg-', 'text-').replace('-500', '-700').replace('-400', '-600')}`}>
                            {config.label}
                          </span>
                        )}
                      </div>

                      {/* Opening date */}
                      {station.openedAt && (
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(station.openedAt)}
                        </p>
                      )}
                    </div>

                    {/* Terminal indicators */}
                    {(isFirst || isLast) && (
                      <div className={`absolute ${isFirst ? '-left-3' : '-right-3'} top-4`}>
                        <div className="w-3 h-3 bg-purple-600 rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex flex-wrap gap-4 justify-center">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <span className="text-xs text-slate-600">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = stations.filter(s => (s.stationStatus || 'planned') === key).length;
          if (count === 0) return null;

          return (
            <div key={key} className={`p-3 rounded-lg ${config.bgColor} text-center`}>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-600">{config.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
