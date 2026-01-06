"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'secondary';
}

export function LiquidButton({ children, className, variant = 'default', ...props }: LiquidButtonProps) {
  return (
    <div className="relative inline-flex">
      <div
        className="absolute top-0 left-0 isolate -z-10 h-full w-full overflow-hidden rounded-md"
        style={{ filter: 'url("#radio-glass")' }}
      />
      <button
        className={cn(
          "relative z-10 inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap transition-all font-medium",
          "text-white rounded-lg bg-background/80 shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]",
          "hover:scale-[1.02] active:scale-[0.98]",
          variant === 'secondary' && "bg-surface/50",
          className
        )}
        {...props}
      >
        {children}
      </button>
    </div>
  );
}

