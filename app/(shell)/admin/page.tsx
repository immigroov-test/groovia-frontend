import { redirect } from 'next/navigation';
import { serverAuth } from '../../../lib/supabase/server';
import { backendBaseUrl } from '../../../lib/backend';
import { AdminDashboard } from '../../../components/AdminDashboard';
import type { AdminRevision } from '../../../components/AdminRevisionList';

export const metadata = { title: 'Admin - Immigroov' };

export interface AdminMentor {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
  submission_count: number;
  pending_submitted_at?: string | null;
  commission_pct?: number | null;
  commission_expires_at?: string | null;
}

interface AdminStats {
  pending_mentor_count: number;
  approved_mentor_count: number;
  active_mentor_count: number;
  inactive_mentor_count: number;
  no_service_mentor_count: number;
  total_bookings: number;
  global_commission_pct: number;
}

async function fetchJson<T>(url: string, token: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch { /* render empty */ }
  return fallback;
}

export default async function AdminPage() {
  const { supabase, user, token } = await serverAuth();

  if (!user || !token) redirect('/login?next=/admin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') redirect('/home');

  const base = backendBaseUrl();

  const [pending, approved, suspended, revisions, statsRes] = await Promise.all([
    fetchJson<AdminMentor[]>(`${base}/admin/mentors/pending`, token, []),
    fetchJson<AdminMentor[]>(`${base}/admin/mentors/approved`, token, []),
    fetchJson<AdminMentor[]>(`${base}/admin/mentors/suspended`, token, []),
    fetchJson<AdminRevision[]>(`${base}/admin/mentors/revisions`, token, []),
    fetch(`${base}/admin/stats`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => r.ok ? r.json() as Promise<AdminStats> : null)
      .catch(() => null),
  ]);

  const stats: AdminStats = statsRes ?? {
    pending_mentor_count: pending.length,
    approved_mentor_count: approved.length,
    active_mentor_count: approved.length,
    inactive_mentor_count: 0,
    no_service_mentor_count: 0,
    total_bookings: 0,
    global_commission_pct: 10,
  };

  return <AdminDashboard stats={stats} pending={pending} approved={approved} suspended={suspended} revisions={revisions} />;
}
