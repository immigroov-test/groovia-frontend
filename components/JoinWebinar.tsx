'use client';
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { Button } from './ui/Button';

export function JoinWebinar({ webinarId }: { webinarId: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function join() {
    setBusy(true); setError(null);
    const result = await apiFetch<{ meeting_url?: string; detail?: string }>(`/api/webinars/${webinarId}/join`);
    if (!result.ok || !result.data.meeting_url) { setError(result.data?.detail || 'The room is unavailable.'); setBusy(false); return; }
    await apiFetch(`/api/webinars/${webinarId}/attendance`, { method: 'POST', json: { event: 'join' } });
    window.open(result.data.meeting_url, '_blank', 'noopener,noreferrer');
    setBusy(false);
  }
  return <div><Button variant="accent" loading={busy} onClick={join}>Join webinar</Button>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</div>;
}
