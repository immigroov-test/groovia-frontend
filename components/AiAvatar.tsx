import { Sparkles } from 'lucide-react';

// Assistant avatar: a blue-to-orange gradient circle with a sparkle. Self-contained (no
// external image), so it never breaks. Swap the sparkle for a logo later if wanted.
export function AiAvatar({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <div
      className={`${className} shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-accent-500 flex items-center justify-center text-white`}
    >
      <Sparkles className="h-3.5 w-3.5" />
    </div>
  );
}
