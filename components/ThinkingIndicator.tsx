// In-chat "thinking" indicator: the small Groovia loop mark sits in the assistant's
// message slot (left-aligned) between the user's question and the response, the way chat
// assistants like Gemini show a glyph while generating. Replaced by the reply when ready.
export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2.5 justify-start animate-fade-up">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/groovia-loop.gif"
        alt=""
        aria-hidden
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className="sr-only">Groovia is thinking</span>
      <span className="flex items-end gap-1 pb-0.5" aria-hidden>
        <Dot delay="-0.32s" />
        <Dot delay="-0.16s" />
        <Dot delay="0s" />
      </span>
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
