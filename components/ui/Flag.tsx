import * as Flags from 'country-flag-icons/react/3x2';

type FlagComponent = React.ComponentType<{ className?: string; title?: string }>;

// SVG country flag by ISO-3166-1 alpha-2 code. Emoji flags don't render on
// Windows, so we use SVGs which work on every platform.
export function Flag({ code, className = 'w-5 h-auto rounded-[2px] shrink-0' }: { code: string; className?: string }) {
  const C = (Flags as unknown as Record<string, FlagComponent>)[code?.toUpperCase()];
  if (!C) return <span className={className} aria-hidden />;
  return <C className={className} title={code} />;
}
