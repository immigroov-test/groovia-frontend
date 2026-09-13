import { OrganizationPage } from '../../../components/OrganizationPage';
export const metadata = { title: 'Refund and cancellation policy - Immigroov' };
export default function Page() { return <OrganizationPage eyebrow="POLICY GUIDE" title="Cancellations, rescheduling, and refunds." intro="This page is a plain-language route to the published terms. The applicable legal terms displayed at checkout and in the policy centre govern each purchase." sections={[
  { title: 'Before payment', body: 'Review the service or webinar details, date, local time, duration, price, and any cancellation notice shown before checkout.' },
  { title: 'Mentor sessions', body: 'A mentor’s cancellation and rescheduling notice window is shown in the booking flow where available. Requests outside that window may not be eligible.' },
  { title: 'Webinars', body: 'Eligibility depends on the webinar status and the published terms applying to the registration. Contact support with your registration details for help.' },
  { title: 'Payment issues', body: 'If payment was taken but confirmation is missing, do not pay repeatedly. Contact support with the payment reference so the transaction can be checked.' },
]} cta={{ label: 'Read all terms and policies', href: '/privacy' }} />; }
