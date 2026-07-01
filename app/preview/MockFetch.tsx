'use client';
import { type ReactNode, useRef } from 'react';
import { mockServices, mockSlots, mockBookings, MOCK_QUOTE } from './mockData';

// Patches window.fetch inside the preview frame so that the real, backend-driven
// components (booking widget, booking manager) render with mock data — no backend,
// no login. Only /api/** calls are intercepted; everything else (Supabase auth,
// Next.js RSC) passes straight through.
let installed = false;

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const orig = window.fetch.bind(window);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input :
      input instanceof URL ? input.toString() :
      input.url;
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
    const method = (init?.method ?? 'GET').toUpperCase();

    if (path.startsWith('/api/')) {
      if (path.includes('/mentors/') && path.endsWith('/services')) return json({ services: mockServices });
      if (path.includes('/booking/slots/'))                          return json({ slots: mockSlots() });
      if (path.includes('/questions/public'))                        return json([]);
      if (path === '/api/booking' && method === 'POST')              return json({ booking_id: 'IMG-MOCK-1A2B' });
      if (path.startsWith('/api/booking/my'))                        return json({ bookings: mockBookings('mentee') });
      if (path.startsWith('/api/mentor/availability-v2/sessions'))   return json(mockBookings('mentor'));
      if (path.startsWith('/api/quote'))                             return json(MOCK_QUOTE);
      return json({ ok: true }); // cancel/reschedule/no-show actions
    }
    return orig(input as RequestInfo, init);
  };
}

export function MockFetch({ children }: { children: ReactNode }) {
  // Install during render (before children mount) so child effects hit the shim.
  const done = useRef(false);
  if (!done.current) { install(); done.current = true; }
  return <>{children}</>;
}
