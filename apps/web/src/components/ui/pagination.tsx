import type React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

export type PaginationProps = React.ComponentProps<'nav'>;

export function Pagination({ className, ...props }: Readonly<PaginationProps>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

export type PaginationContentProps = React.ComponentProps<'ul'>;

export function PaginationContent({ className, ...props }: Readonly<PaginationContentProps>) {
  return <ul className={cn('flex flex-row items-center gap-1', className)} {...props} />;
}

export type PaginationItemProps = React.ComponentProps<'li'>;

export function PaginationItem({ className, ...props }: Readonly<PaginationItemProps>) {
  return <li className={cn('', className)} {...props} />;
}

export interface PaginationLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  size?: 'sm' | 'md' | 'icon';
}

export function PaginationLink({
  className,
  isActive = false,
  size = 'icon',
  children,
  type = 'button',
  ...props
}: Readonly<PaginationLinkProps>) {
  let activeClass =
    'border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131519] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5';
  if (isActive) {
    activeClass =
      'bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] shadow-sm font-semibold border-transparent';
  }

  let sizeClass = 'h-9 w-9 text-xs';
  if (size === 'sm') {
    sizeClass = 'h-8 px-2.5 text-xs';
  } else if (size === 'md') {
    sizeClass = 'h-9 px-3 text-xs';
  }

  let ariaCurrent: 'page' | undefined = undefined;
  if (isActive) {
    ariaCurrent = 'page';
  }

  return (
    <button
      type={type}
      aria-current={ariaCurrent}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all disabled:pointer-events-none disabled:opacity-40',
        activeClass,
        sizeClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface PaginationPreviousProps extends PaginationLinkProps {
  text?: string;
}

export function PaginationPrevious({
  className,
  text = 'Previous',
  size = 'md',
  ...props
}: Readonly<PaginationPreviousProps>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size={size}
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>{text}</span>
    </PaginationLink>
  );
}

export interface PaginationNextProps extends PaginationLinkProps {
  text?: string;
}

export function PaginationNext({
  className,
  text = 'Next',
  size = 'md',
  ...props
}: Readonly<PaginationNextProps>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size={size}
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span>{text}</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  );
}

export type PaginationEllipsisProps = React.ComponentProps<'span'>;

export function PaginationEllipsis({ className, ...props }: Readonly<PaginationEllipsisProps>) {
  return (
    <span
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center text-slate-400', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
