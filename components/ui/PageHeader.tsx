import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; className?: string }) {
  return <header className={cn('max-w-3xl', className)}>
    {eyebrow && <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700">{eyebrow}</p>}
    <h1 className="font-display mt-3 text-[2.125rem] leading-[1.18] sm:text-[2.75rem] sm:leading-[1.14] font-semibold text-brand-900">{title}</h1>
    {description && <p className="mt-4 text-[17px] leading-7 sm:text-lg sm:leading-8 text-muted">{description}</p>}
    {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
  </header>;
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl">{eyebrow && <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700">{eyebrow}</p>}<h2 className="font-display mt-2 text-[1.7rem] leading-[1.25] sm:text-[2rem] font-semibold text-brand-900">{title}</h2>{description && <p className="mt-3 text-base leading-7 text-muted">{description}</p>}</div>
    {action}
  </div>;
}
