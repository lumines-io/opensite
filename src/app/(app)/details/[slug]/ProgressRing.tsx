'use client';

import { useEffect, useState } from 'react';

interface ProgressRingProps {
  progress: number;
  status: string;
  size?: number;
}

const STATUS_COLORS: Record<string, { stroke: string; text: string; bg: string }> = {
  planned: { stroke: 'stroke-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' },
  'in-progress': { stroke: 'stroke-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  completed: { stroke: 'stroke-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  paused: { stroke: 'stroke-red-500', text: 'text-red-600', bg: 'bg-red-50' },
  cancelled: { stroke: 'stroke-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' },
};

export function ProgressRing({ progress, status, size = 140 }: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const colors = STATUS_COLORS[status] || STATUS_COLORS.planned;

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;

  return (
    <div className={`relative ${colors.bg} rounded-2xl p-4`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${colors.stroke} transition-all duration-1000 ease-out`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />

        {/* Decorative dots */}
        {[0, 25, 50, 75].map((milestone) => {
          const angle = (milestone / 100) * 360 - 90;
          const x = size / 2 + radius * Math.cos((angle * Math.PI) / 180);
          const y = size / 2 + radius * Math.sin((angle * Math.PI) / 180);
          const isPassed = progress >= milestone;

          return (
            <circle
              key={milestone}
              cx={x}
              cy={y}
              r={3}
              className={`transition-colors duration-500 ${
                isPassed ? colors.stroke.replace('stroke-', 'fill-') : 'fill-slate-300'
              }`}
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${colors.text}`}>
          {animatedProgress}%
        </span>
        <span className="text-xs text-slate-500 font-medium">
          hoàn thành
        </span>
      </div>

      {/* Status indicator */}
      {status === 'completed' && (
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {status === 'paused' && (
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
    </div>
  );
}
