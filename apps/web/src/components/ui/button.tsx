import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: Readonly<ButtonProps>) {
  let variantClass = 'bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] shadow-md shadow-indigo-500/20';
  if (variant === 'secondary') {
    variantClass =
      'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
  }
  if (variant === 'outline') {
    variantClass =
      'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5';
  }
  if (variant === 'danger') {
    variantClass = 'bg-red-600 text-white hover:bg-red-700';
  }

  let sizeClass = 'px-3.5 py-2 text-xs font-semibold';
  if (size === 'sm') {
    sizeClass = 'px-2.5 py-1.5 text-[11px] font-semibold';
  }
  if (size === 'lg') {
    sizeClass = 'px-5 py-3 text-sm font-semibold';
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all disabled:opacity-50',
        variantClass,
        sizeClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
