import Link from 'next/link';
import { CalendarDays, Users } from 'lucide-react';
import { serverGetPublic } from '../../../lib/backend';
import { webinarPrice, webinarWhen, type Webinar } from '../../../lib/webinars';
import { Card, CardBody } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';

export const metadata = { title: 'Live webinars - Immigroov', description: 'Upcoming live sessions from Groovia mentors and hosts.' };

export default async function WebinarsPage() {
  const result = await serverGetPublic<Webinar[]>('/webinars', 12000, 1, 60);
  const webinars = result.data ?? [];
  return <main className="container-public py-16 sm:py-20">
    <PageHeader eyebrow="Live learning" title="Focused webinars for your next move." description="See the date, host, price, and seat availability before you register. Times are shown in your local timezone." />
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {webinars.map((w) => <Link key={w.id} href={`/webinars/${w.slug}`} className="block">
        <Card className="h-full overflow-hidden hover:border-brand-300 transition-colors">
          {w.banner_url && <img src={w.banner_url} alt="" className="aspect-[16/9] w-full border-b border-[--color-border] object-cover" />}
          <CardBody className="pt-6">
          <div className="flex justify-between gap-3"><span className="text-xs font-semibold text-brand-700">{webinarPrice(w)}</span><span className="text-xs text-muted">{w.duration_minutes} min</span></div>
          <h2 className="mt-3 text-lg font-semibold text-foreground">{w.title}</h2>
          <p className="mt-2 text-sm text-muted line-clamp-3">{w.description}</p>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted"><CalendarDays className="h-4 w-4" />{webinarWhen(w)}</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted"><Users className="h-4 w-4" />{Math.max(0, w.capacity - (w.registration_count ?? 0))} seats available</div>
          {w.mentor && <p className="mt-3 text-xs text-muted">Hosted by {w.mentor.display_name}</p>}
          </CardBody>
        </Card>
      </Link>)}
    </div>
    {webinars.length === 0 && <div className="mt-10"><EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No webinars are scheduled yet." description="Published live sessions will appear here as soon as they are available." /></div>}
  </main>;
}
