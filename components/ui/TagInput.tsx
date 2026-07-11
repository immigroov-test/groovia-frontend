'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

// Keyword tag input: type a word and press Enter (or comma) to add it as a chip.
// Deduped, capped at `max`, chips removable. Used for service search/matching tags.
export function TagInput({
  value, onChange, max = 5, placeholder = 'Type a keyword, press Enter',
}: {
  value: string[]; onChange: (tags: string[]) => void; max?: number; placeholder?: string;
}) {
  const [input, setInput] = useState('');

  function add(raw: string) {
    const t = raw.trim().slice(0, 40);
    if (!t || value.length >= max) { setInput(''); return; }
    if (value.some((x) => x.toLowerCase() === t.toLowerCase())) { setInput(''); return; }
    onChange([...value, t]);
    setInput('');
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
    else if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 border border-[--color-border] focus-within:ring-2 focus-within:ring-brand-300">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-800 text-xs px-2 py-0.5">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}
              className="text-brand-500 hover:text-brand-800"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {value.length < max && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => add(input)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] text-sm bg-transparent focus:outline-none py-0.5 placeholder:text-muted"
          />
        )}
      </div>
      <p className="text-xs text-muted">{value.length}/{max} tags{value.length >= max ? ' (max reached)' : ''}</p>
    </div>
  );
}
