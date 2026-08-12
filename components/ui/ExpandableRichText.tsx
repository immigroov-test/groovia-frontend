'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { RichText } from './RichText';
import { richTextToPlain } from '../../lib/sanitizeHtml';
import { cn } from '../../lib/utils';

// Roughly what fits in the 2-line clamp at this size. Past it, there is text the reader cannot see.
const CLAMP_CHARS = 110;

// Clamps a rich-text block to 2 lines and offers "View more/less" when there is more to read
// (BUG-135 / BUG-137). Shared by the customer booking flow and the mentor's own service list, so a
// mentor never sees a MORE truncated version of their own listing than the customer does.
//
// Whether to offer the toggle is decided from the CONTENT, not by measuring the rendered box. The
// measured version was unreliable in exactly the place it mattered: RichText sanitises and injects
// its HTML in its own effect, so the element is empty when a mount-time measure runs, and any
// re-measure that lands while the card is collapsed, re-laid-out or off-screen can read zero
// overflow and silently drop the button - leaving a clamped description with no way to open it,
// which is precisely what the mentor saw. Text length is known before render and cannot race.
export function ExpandableRichText({ html, textClassName }: { html: string; textClassName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = richTextToPlain(html ?? '').trim().length > CLAMP_CHARS;

  return (
    <div className="min-w-0">
      <RichText html={html}
        className={cn('text-xs text-muted leading-relaxed [&_p]:my-0.5 [&_p:empty]:hidden',
          !expanded && 'line-clamp-2', textClassName)} />
      {canExpand && (
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
