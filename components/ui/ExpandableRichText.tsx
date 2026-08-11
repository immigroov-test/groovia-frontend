'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { RichText } from './RichText';
import { cn } from '../../lib/utils';

// Clamps a rich-text block to 2 lines and offers "View more/less" only when it actually overflows
// (BUG-135). Renders the real rich text (same content shown in the RichTextEditor when adding/
// editing) instead of a plain-text flattened preview, with the toggle on its own right-aligned row
// so it reads as a distinct control rather than more description text. Shared by the customer
// booking flow (DirectBookingWidget) and the mentor's own service list (ServicesManager, BUG-137)
// so both show the identical full text - a mentor should never see a MORE truncated version of
// their own listing than the customer does.
export function ExpandableRichText({ html, textClassName }: { html: string; textClassName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Read inside the measure callback instead of closing over `expanded` (the effect only depends
  // on `html`, so a closure would keep the stale initial value forever).
  const expandedRef = useRef(expanded);
  useEffect(() => { expandedRef.current = expanded; }, [expanded]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Once expanded, the box is never clamped, so it never "overflows" - measuring then would
      // wrongly flip this back to false and yank the toggle away with no way back to collapse it.
      // Overflow is only a meaningful question while collapsed; the flag just needs to have been
      // set true once, from that state.
      if (expandedRef.current) return;
      setOverflows(el.scrollHeight - el.clientHeight > 2);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    // RichText sanitizes (DOMPurify) and injects its HTML in ITS OWN effect, asynchronously after
    // this component mounts - a plain measure-on-mount can run before that content actually lands
    // in the DOM and always see an empty box (no overflow). Re-measure whenever the content
    // actually changes, whatever triggers it.
    const observer = new MutationObserver(measure);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [html]);

  return (
    <div className="min-w-0">
      <RichText ref={ref} html={html}
        className={cn('text-xs text-muted leading-relaxed [&_p]:my-0.5 [&_p:empty]:hidden', !expanded && 'line-clamp-2', textClassName)} />
      {overflows && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="mt-1 inline-flex items-center gap-0.5 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 hover:border-brand-400 hover:bg-brand-100 transition-colors"
          >
            {expanded ? <>View less <ChevronUp className="h-3 w-3" /></> : <>View more <ChevronDown className="h-3 w-3" /></>}
          </button>
        </div>
      )}
    </div>
  );
}
