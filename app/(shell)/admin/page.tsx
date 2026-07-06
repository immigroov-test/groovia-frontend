import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { backendBaseUrl } from '../../../lib/backend';
import { AdminDashboard } from '../../../components/AdminDashboard';

export const metadata = { title: 'Admin — Immigroov' };

export interface AdminMentor {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  status: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
  submission_count: number;
}

interface AdminStats {
  pending_mentor_count: number;
  approved_mentor_count: number;
  total_bookings: number;
}

async function fetchMentors(url: string, token: string): Promise<AdminMentor[]> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch { /* render empty */ }
  return [];
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login?next=/admin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') redirect('/chat');

  const token = session.access_token;
  const base = backendBaseUrl();

  const [pending, approved, suspended, statsRes] = await Promise.all([
    fetchMentors(`${base}/admin/mentors/pending`, token),
    fetchMentors(`${base}/admin/mentors/approved`, token),
    fetchMentors(`${base}/admin/mentors/suspended`, token),
    fetch(`${base}/admin/stats`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => r.ok ? r.json() as Promise<AdminStats> : null)
      .catch(() => null),
  ]);

  const stats: AdminStats = statsRes ?? {
    pending_mentor_count: pending.length,
    approved_mentor_count: approved.length,
    total_bookings: 0,
  };

  return <AdminDashboard stats={stats} pending={pending} approved={approved} suspended={suspended} />;
}
