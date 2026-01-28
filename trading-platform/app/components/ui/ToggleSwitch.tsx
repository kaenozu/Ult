'use client';

import { cn } from '@/app/lib/utils';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
  className?: string;
}

/**
 * Reusable toggle switch component
 * Used in AlertPanel, NotificationCenter, and other settings panels
 */
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel,
  className,
}: ToggleSwitchProps) {
  const sizeClasses = {
    sm: {
      track: 'w-10 h-5',
      thumb: 'w-4 h-4',
      thumbTranslateChecked: 'translate-x-5',
      thumbTranslateUnchecked: 'translate-x-0.5',
      thumbTop: 'top-0.5',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      thumbTranslateChecked: 'translate-x-5.5',
      thumbTranslateUnchecked: 'translate-x-0.5',
      thumbTop: 'top-0.5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      thumbTranslateChecked: 'translate-x-7',
      thumbTranslateUnchecked: 'translate-x-0.5',
      thumbTop: 'top-0.5',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-[#233648] focus:ring-offset-2 focus:ring-offset-[#141e27]',
        currentSize.track,
        checked ? 'bg-green-500' : 'bg-[#233648]',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      <div
        className={cn(
          'absolute rounded-full bg-white shadow transition-transform',
          currentSize.thumb,
          currentSize.thumbTop,
          checked ? currentSize.thumbTranslateChecked : currentSize.thumbTranslateUnchecked
        )}
      />
    </button>
  );
}
