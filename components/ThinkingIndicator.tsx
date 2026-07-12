import { Sparkles } from 'lucide-react';

// In-chat "thinking" state: a normal assistant row (avatar + bubble), with the small
// Groovia loop gif living INSIDE the bubble (the AI's chat box), not in the avatar slot.
// Replaced by the real reply when it arrives.
export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-fade-up">
      <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-brand-50/60 px-4 py-2.5 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/groovia-loop.gif" alt="" aria-hidden className="h-6 w-6 object-contain" />
        <span className="flex items-end gap-1 pb-0.5" aria-hidden>
          <Dot delay="-0.32s" />
          <Dot delay="-0.16s" />
          <Dot delay="0s" />
        </span>
        <span className="sr-only">Groovia is thinking</span>
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
