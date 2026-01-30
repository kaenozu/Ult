'use client';

import { cn } from '@/app/lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false,
}: ToggleSwitchProps) {
  const sizeClasses = {
    sm: {
      track: 'h-5 w-9',
      thumb: 'h-3 w-3',
      translate: checked ? 'translate-x-5' : 'translate-x-1',
    },
    md: {
      track: 'h-6 w-11',
      thumb: 'h-4 w-4',
      translate: checked ? 'translate-x-6' : 'translate-x-1',
    },
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
          sizeClasses[size].track,
          checked ? "bg-green-500" : "bg-[#233648]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "inline-block transform rounded-full bg-white transition-transform",
            sizeClasses[size].thumb,
            sizeClasses[size].translate
          )}
        />
      </button>
      {label && (
        <span className={cn(
          "text-[#92adc9] transition-colors",
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          checked && "text-white"
        )}>
          {label}
        </span>
      )}
    </div>
  );
}
