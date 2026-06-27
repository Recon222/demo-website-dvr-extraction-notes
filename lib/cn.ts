import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine class names with clsx semantics (conditional objects/arrays, falsy
 * filtering) and resolve conflicting Tailwind utilities via tailwind-merge so the
 * last utility in a conflict group wins (e.g. `cn('px-2', 'px-4')` → `'px-4'`).
 *
 * The project-wide helper for conditional and override-able component classNames.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
