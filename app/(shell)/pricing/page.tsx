import { OrganizationPage } from '../../../components/OrganizationPage';
export const metadata = { title: 'Pricing - Immigroov', description: 'How pricing works for Groovia guidance, mentor sessions, and webinars.' };
export default function Page() { return <OrganizationPage eyebrow="PRICING" title="See the price before you commit." intro="Groovia does not use a single fixed price for every service. The exact amount is shown on the relevant mentor or webinar page before payment." sections={[
  { title: 'Groovia guidance', body: 'Guests can try a limited number of questions. Any account requirements or limits are shown before you continue.' },
  { title: 'Mentor sessions', body: 'Mentors configure the services they offer. The profile shows session duration and the price presented to you before checkout. Some mentors may offer a free introduction.' },
  { title: 'Webinars', body: 'Each webinar is clearly labelled free or paid. Paid registrations show the event price before payment.' },
  { title: 'Changes and refunds', body: 'Cancellation, rescheduling, and refund eligibility depend on the relevant published terms. Review them before completing payment.' },
]} cta={{ label: 'Compare mentors', href: '/mentors' }} />; }
