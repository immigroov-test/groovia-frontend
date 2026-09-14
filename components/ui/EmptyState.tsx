import type { ReactNode } from 'react';

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-[14px] border border-dashed border-brand-300 bg-white/60 px-6 py-12 text-center">
    {icon && <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">{icon}</div>}
    <h2 className="text-lg font-semibold text-brand-900">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>;
}
