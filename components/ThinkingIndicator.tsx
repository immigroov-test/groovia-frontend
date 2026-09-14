import { AiAvatar } from './AiAvatar';

// In-chat "typing" state: an assistant row (avatar + bubble) with three bouncing dots inside the
// bubble. Replaced by the real reply when it arrives.
export function ThinkingIndicator() {
  return (
    <div className="flex items-end gap-2.5 justify-start animate-fade-up">
      <AiAvatar />
      <div>
        <div className="rounded-2xl rounded-bl-md border border-(--color-border) bg-white px-4 py-3.5 shadow-(--shadow-1) flex items-center">
          <span className="flex items-end gap-1" aria-hidden>
            <Dot delay="-0.32s" />
            <Dot delay="-0.16s" />
            <Dot delay="0s" />
          </span>
        </div>
        <p className="mt-1 pl-1 text-xs text-muted">Groovia is typing…</p>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce"
      style={{ animationDelay: delay, animationDuration: '1s' }}
    />
  );
}
