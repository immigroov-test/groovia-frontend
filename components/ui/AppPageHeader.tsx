import type { ReactNode } from 'react';

// Header for signed-in pages (account, sessions, dashboards): the marketing PageHeader's typography
// at a size that suits a working screen rather than a landing page.
export function AppPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700">{eyebrow}</p>}
        <h1 className="font-display mt-2 text-3xl sm:text-4xl font-bold leading-tight text-brand-900">{title}</h1>
        {description && <p className="mt-2 text-[15px] sm:text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
