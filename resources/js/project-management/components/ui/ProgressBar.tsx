import React from 'react';
interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'analytics';
  showLabel?: boolean;
  animated?: boolean;
}
export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'green',
  showLabel = false,
  animated = false
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value / max * 100));
  const heights = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2.5'
  };
  const colors = {
    green: '#3BC25B',
    blue: '#3b82f6',
    yellow: '#f59e0b',
    red: '#ef4444',
    analytics: '#0E8F79'
  };
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex-1 dark:bg-dark-border bg-light-card2 rounded-full overflow-hidden ${heights[size]}`}>

        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${animated ? 'progress-animated' : ''}`}
          style={
          {
            width: `${pct}%`,
            backgroundColor: colors[color],
            '--progress-width': `${pct}%`
          } as React.CSSProperties
          } />

      </div>
      {showLabel &&
      <span className="text-xs font-medium dark:text-dark-muted text-light-muted w-9 text-right tabular-nums">
          {Math.round(pct)}%
        </span>
      }
    </div>);

}