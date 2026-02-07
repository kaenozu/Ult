/**
 * LoadingStates - Unified Loading State Components
 * 
 * Key features:
 * - Consistent loading indicators across the app
 * - Skeleton loaders for different component types
 * - Configurable delays to prevent flash
 * - Progress tracking for long operations
 */

import { memo, useMemo, useState, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface LoadingStateConfig {
  /** Component type for skeleton */
  component: 'chart' | 'table' | 'card' | 'list' | 'form' | 'full';
  /** Show shimmer effect */
  shimmer?: boolean;
  /** Delay before showing (ms) */
  delay?: number;
  /** Custom height */
  height?: number;
  /** Custom width */
  width?: number;
}

export interface ProgressState {
  /** Current progress (0-100) */
  progress: number;
  /** Current step */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Current operation description */
  description: string;
}

export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// Constants
// ============================================================================

const TRANSITION_DELAYS: Record<string, number> = {
  'data:fetch': 300,
  'trade:execute': 500,
  'analysis:complete': 800,
  'market:update': 200,
  'portfolio:load': 400,
};

// ============================================================================
// Skeleton Components
// ============================================================================

/**
 * Base skeleton component with shimmer effect
 */
const SkeletonBase = memo(function SkeletonBase({
  className = '',
  shimmer = true,
}: {
  className?: string;
  shimmer?: boolean;
}) {
  return (
    <div
      className={`bg-gray-700 rounded ${shimmer ? 'animate-pulse' : ''} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
});

/**
 * Chart skeleton loader
 */
export const ChartSkeleton = memo(function ChartSkeleton({
  height = 300,
  width = '100%',
}: {
  height?: number;
  width?: string | number;
}) {
  return (
    <div className="chart-skeleton space-y-4" style={{ width, height }}>
      {/* Chart area */}
      <div className="flex items-end justify-between h-4/5 gap-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <SkeletonBase key={i} className="flex-1" />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between h-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBase key={i} className="h-full w-16" shimmer={false} />
        ))}
      </div>
    </div>
  );
});

/**
 * Table skeleton loader
 */
export const TableSkeleton = memo(function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="table-skeleton space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-600 pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBase key={i} className="h-6 flex-1" shimmer={false} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonBase
              key={colIndex}
              className="h-8 flex-1"
              shimmer={colIndex === 0}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

/**
 * Card skeleton loader
 */
export const CardSkeleton = memo(function CardSkeleton({
  height = 150,
}: {
  height?: number;
}) {
  return (
    <div className="card-skeleton space-y-4 p-4">
      {/* Title */}
      <SkeletonBase className="h-6 w-1/2" shimmer={false} />
      {/* Content */}
      <div className="space-y-2">
        <SkeletonBase className="h-4 w-full" shimmer={false} />
        <SkeletonBase className="h-4 w-3/4" shimmer={false} />
        <SkeletonBase className="h-4 w-1/2" shimmer={false} />
      </div>
      {/* Action button */}
      <SkeletonBase className="h-10 w-24 mt-4" shimmer={false} />
    </div>
  );
});

/**
 * List skeleton loader
 */
export const ListSkeleton = memo(function ListSkeleton({
  items = 5,
}: {
  items?: number;
}) {
  return (
    <div className="list-skeleton space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-2">
          <SkeletonBase className="h-10 w-10 rounded-full" shimmer={false} />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-4 w-1/3" shimmer={false} />
            <SkeletonBase className="h-3 w-1/2" shimmer={false} />
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Form skeleton loader
 */
export const FormSkeleton = memo(function FormSkeleton({
  fields = 4,
}: {
  fields?: number;
}) {
  return (
    <div className="form-skeleton space-y-4 p-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBase className="h-4 w-24" shimmer={false} />
          <SkeletonBase className="h-10 w-full" shimmer={false} />
        </div>
      ))}
      <SkeletonBase className="h-10 w-full mt-4" shimmer={false} />
    </div>
  );
});

/**
 * Full page skeleton loader
 */
export const FullPageSkeleton = memo(function FullPageSkeleton({
  title = true,
}: {
  title?: boolean;
}) {
  return (
    <div className="full-page-skeleton space-y-6 p-6">
      {title && <SkeletonBase className="h-8 w-48" shimmer={false} />}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} height={120} />
        ))}
      </div>
      <TableSkeleton rows={8} columns={4} />
    </div>
  );
});

// ============================================================================
// Loading State Manager
// ============================================================================

/**
 * Create appropriate skeleton based on component type
 */
export function createSkeleton(component: LoadingStateConfig['component']): React.ReactNode {
  const skeletons: Record<LoadingStateConfig['component'], React.ReactNode> = {
    chart: <ChartSkeleton />,
    table: <TableSkeleton />,
    card: <CardSkeleton />,
    list: <ListSkeleton />,
    form: <FormSkeleton />,
    full: <FullPageSkeleton />,
  };
  return skeletons[component] || <SkeletonBase className="h-20 w-full" />;
}

/**
 * Get transition delay for an action
 */
export function getTransitionDelay(action: string): number {
  return TRANSITION_DELAYS[action] || 200;
}

// ============================================================================
// Progress Bar Component
// ============================================================================

export const ProgressBar = memo(function ProgressBar({
  progress,
  showLabel = true,
}: {
  progress: number;
  showLabel?: boolean;
}) {
  return (
    <div className="progress-bar">
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <div className="text-right text-sm text-gray-400 mt-1">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
});

/**
 * Multi-step progress indicator
 */
export const StepProgress = memo(function StepProgress({
  currentStep,
  totalSteps,
  descriptions,
}: {
  currentStep: number;
  totalSteps: number;
  descriptions: string[];
}) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="step-progress space-y-4">
      <ProgressBar progress={progress} />
      <div className="flex justify-between text-sm text-gray-400">
        {descriptions.map((desc, index) => (
          <div
            key={index}
            className={`step ${index <= currentStep ? 'text-blue-400' : ''}`}
          >
            {desc}
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// Loading State Wrapper
// ============================================================================

/**
 * Wrapper component for handling loading states
 */
export const LoadingWrapper = memo(function LoadingWrapper({
  isLoading,
  children,
  skeleton,
  delay = 0,
}: {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  delay?: number;
}) {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const prevIsLoadingRef = useRef(isLoading);

  useEffect(() => {
    // Reset skeleton state when isLoading changes from false to true
    if (isLoading && !prevIsLoadingRef.current) {
      if (delay > 0) {
        const timer = setTimeout(() => setShowSkeleton(true), delay);
        prevIsLoadingRef.current = isLoading;
        return () => clearTimeout(timer);
      } else {
        // Use requestAnimationFrame to avoid synchronous setState
        requestAnimationFrame(() => {
          setShowSkeleton(true);
        });
      }
    } else if (!isLoading && prevIsLoadingRef.current) {
      // Use requestAnimationFrame to avoid synchronous setState
      requestAnimationFrame(() => {
        setShowSkeleton(false);
      });
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, delay]);

  if (showSkeleton) {
    return <>{skeleton || <ChartSkeleton />}</>;
  }

  return <>{children}</>;
});

// ============================================================================
// Inline Loading Spinner
// ============================================================================

export const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  color = 'blue',
}: {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'white' | 'gray';
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const colorClasses = {
    blue: 'border-blue-500',
    white: 'border-white',
    gray: 'border-gray-400',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-t-transparent rounded-full animate-spin ${colorClasses[color]}`}
      role="status"
      aria-label="Loading"
    />
  );
});

// ============================================================================
// Status Badge
// ============================================================================

export const StatusBadge = memo(function StatusBadge({
  status,
  label,
}: {
  status: LoadingStatus;
  label?: string;
}) {
  const config = useMemo(() => {
    switch (status) {
      case 'idle':
        return { bg: 'bg-gray-600', text: 'text-gray-300', icon: '○' };
      case 'loading':
        return { bg: 'bg-blue-600', text: 'text-blue-200', icon: '⟳' };
      case 'success':
        return { bg: 'bg-green-600', text: 'text-green-200', icon: '✓' };
      case 'error':
        return { bg: 'bg-red-600', text: 'text-red-200', icon: '✕' };
    }
  }, [status]);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className="animate-spin">{config.icon}</span>
      {label || status}
    </span>
  );
});

// ============================================================================
// Export Types
// ============================================================================

