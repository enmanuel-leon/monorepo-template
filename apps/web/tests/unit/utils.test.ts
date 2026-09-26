import { describe, it, expect } from 'vitest';
import { cn } from '../../src/lib/utils';

describe('Frontend Utils: cn', () => {
  it('merges single and multiple class names properly', () => {
    const result = cn('text-sm', 'font-bold', 'bg-white');
    expect(result).toBe('text-sm font-bold bg-white');
  });

  it('filters out falsy and undefined values gracefully', () => {
    const isHidden = false;
    const isVisible = true;
    const result = cn(
      'base-class',
      isHidden && 'hidden-class',
      isVisible && 'visible-class',
      undefined,
      null,
    );
    expect(result).toBe('base-class visible-class');
  });

  it('correctly resolves conflicting Tailwind classes using tailwind-merge', () => {
    const result = cn('px-4 py-2', 'px-6');
    expect(result).toBe('py-2 px-6');
  });
});
