import { AiAvatar } from './AiAvatar';

// In-chat "thinking" state: a normal assistant row (avatar + bubble) with three bouncing
// dots inside the bubble. Replaced by the real reply when it arrives.
export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-fade-up">
      <AiAvatar />
      <div className="rounded-2xl rounded-bl-sm bg-brand-50/60 px-4 py-3 flex items-center">
        <span className="flex items-end gap-1" aria-hidden>
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
