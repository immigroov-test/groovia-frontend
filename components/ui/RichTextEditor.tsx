'use client';
import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Type } from 'lucide-react';
import { sanitizeRichText } from '../../lib/sanitizeHtml';
import { cn } from '../../lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxChars?: number;
}

// Lightweight rich-text editor for the mentor bio: bold/italic/underline,
// bulleted & numbered lists, and a text-size (heading) toggle. Emits sanitized HTML.
export function RichTextEditor({ value, onChange, placeholder = 'Start typing…', maxChars }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [len, setLen] = useState(0);

  // Seed the editor from `value` only when it differs and the user isn't typing,
  // so we never clobber the caret mid-edit.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value || '';
      setLen((el.textContent || '').length);
    }
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    setLen((el.textContent || '').length);
    onChange(sanitizeRichText(el.innerHTML));
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  }

  const overLimit = maxChars != null && len > maxChars;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          'rounded-lg bg-white overflow-hidden',
          'shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]',
          focused && 'shadow-[0_0_0_2px_rgba(29,78,216,0.25),0_1px_2px_rgba(15,23,42,0.04)]',
        )}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 border-b border-[--color-border] px-2 py-1.5 flex-wrap">
          <TB onClick={() => exec('bold')} title="Bold"><Bold className="h-4 w-4" /></TB>
          <TB onClick={() => exec('italic')} title="Italic"><Italic className="h-4 w-4" /></TB>
          <TB onClick={() => exec('underline')} title="Underline"><Underline className="h-4 w-4" /></TB>
          <span className="mx-1 h-5 w-px bg-[--color-border]" />
          <TB onClick={() => exec('insertUnorderedList')} title="Bulleted list"><List className="h-4 w-4" /></TB>
          <TB onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered className="h-4 w-4" /></TB>
          <span className="mx-1 h-5 w-px bg-[--color-border]" />
          <Type className="h-4 w-4 text-muted" />
          <select
            aria-label="Text size"
            onChange={(e) => { exec('formatBlock', e.target.value); e.target.selectedIndex = 0; }}
            className="h-7 rounded-md bg-transparent px-1.5 text-xs text-muted hover:text-foreground focus:outline-none cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>Size</option>
            <option value="p">Normal text</option>
            <option value="h3">Large heading</option>
            <option value="h4">Small heading</option>
          </select>
        </div>

        {/* Editable area */}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={emit}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); emit(); }}
          data-placeholder={placeholder}
          className="rte min-h-[9rem] max-h-80 overflow-y-auto px-3 py-2.5 text-sm text-foreground outline-none"
        />
      </div>

      {maxChars != null && (
        <p className={cn('text-xs text-right', overLimit ? 'text-red-500' : 'text-muted')}>
          {len}/{maxChars}
        </p>
      )}
    </div>
  );
}

function TB({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      // Prevent the editor losing selection before the command runs.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:bg-brand-50 hover:text-brand-700 transition-colors"
    >
      {children}
    </button>
  );
}
