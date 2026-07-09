'use client';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /[0-9]/.test(p) },
  { label: 'A special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordMeetsPolicy(p: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(p));
}

// Live checklist: each tick turns from grey to green as the rule is met.
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="flex flex-col gap-1">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            <span className={cn(
              'h-4 w-4 rounded-full flex items-center justify-center transition-colors',
              ok ? 'bg-emerald-500 text-white' : 'bg-brand-100 text-muted',
            )}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className={ok ? 'text-foreground' : 'text-muted'}>{r.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
