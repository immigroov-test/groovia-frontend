'use client';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

// One confirmation dialog for every action that cannot be undone.
//
// These had drifted badly: cancelling a session had a proper modal, deleting a session type used the
// browser's native confirm(), and everything else - requesting a refund, reporting a no-show (which
// puts a STRIKE on a mentor), closing a disputed session, declining a request - fired on a single
// click with no way back.
//
// The second button is deliberately not a bare "Cancel". Every one of these actions has a better
// alternative the person may not have considered (deactivate rather than delete, rebook rather than
// refund, request changes rather than reject), so `alternate` offers that path and `onAlternate`
// takes them to it. Where there genuinely is no alternative, it falls back to simply dismissing.
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What actually happens, in plain words - consequences first. */
  body: React.ReactNode;
  /** The destructive action. */
  confirmLabel: string;
  onConfirm: (reason: string) => void | Promise<void>;
  /** The safer/happier path. Defaults to simply closing. */
  alternateLabel?: string;
  onAlternate?: () => void;
  onClose: () => void;
  busy?: boolean;
  /** Ask for a reason, and require it before the confirm button unlocks. */
  reason?: { label: string; placeholder?: string; hint?: string; required?: boolean };
}

export function ConfirmDialog({
  open, title, body, confirmLabel, onConfirm,
  alternateLabel, onAlternate, onClose, busy = false, reason,
}: ConfirmDialogProps) {
  const [text, setText] = useState('');
  if (!open) return null;

  const blocked = !!reason?.required && text.trim().length < 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-brand-900">{title}</h3>
        <div className="mt-2 text-sm text-muted leading-relaxed">{body}</div>

        {reason && (
          <div className="mt-4 text-left">
            <label className="text-sm font-medium text-foreground">
              {reason.label}{reason.required && <span className="text-red-600"> *</span>}
            </label>
            <textarea rows={3} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)}
              placeholder={reason.placeholder}
              className="mt-1.5 w-full px-3 py-2 rounded-xl bg-white text-sm resize-y placeholder:text-muted shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
            {reason.hint && <p className="text-xs text-muted mt-1">{reason.hint}</p>}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" loading={busy} disabled={blocked}
            onClick={async () => { await onConfirm(text.trim()); setText(''); }}>
            {confirmLabel}
          </Button>
          <Button variant="primary"
            onClick={() => { if (onAlternate) onAlternate(); else onClose(); }}>
            {alternateLabel ?? 'Keep it as it is'}
          </Button>
        </div>
      </div>
    </div>
  );
}
