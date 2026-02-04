/**
 * ScreenLabel Component
 * 
 * Small label that displays the name/purpose of each screen
 * Positioned in the top-left corner for consistent UX
 */

'use client';

import { cn } from '@/app/lib/utils';

interface ScreenLabelProps {
  label: string;
  className?: string;
}

export function ScreenLabel({ label, className }: ScreenLabelProps) {
  return (
    <div 
      className={cn(
        "fixed top-14 left-2 z-50",
        "px-2 py-1 rounded-md",
        "bg-[#192633]/80 backdrop-blur-sm",
        "border border-[#233648]/50",
        "text-[10px] text-[#92adc9] font-medium",
        "pointer-events-none select-none",
        "shadow-sm",
        className
      )}
    >
      {label}
    </div>
  );
}
