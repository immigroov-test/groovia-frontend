import { Sparkles } from 'lucide-react';

// Lightweight, dependency-free "thinking" indicator (replaces the old GIF). A centered
// pill with a pulsing spark and three staggered bouncing dots. pointer-events-none so it
// never blocks the UI beneath it.
export function ThinkingIndicator() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="flex items-center gap-2.5 rounded-full bg-white/90 backdrop-blur px-5 py-2.5 shadow-lg border border-[--color-border]">
        <Sparkles className="h-4 w-4 text-brand-600 animate-pulse" />
        <span className="text-sm font-medium text-brand-900">Groovia is thinking</span>
        <span className="flex items-end gap-1 pb-0.5">
          <Dot delay="-0.32s" />
          <Dot delay="-0.16s" />
          <Dot delay="0s" />
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce"
      style={{ animationDelay: delay, animationDuration: '1s' }}
    />
  );
}
