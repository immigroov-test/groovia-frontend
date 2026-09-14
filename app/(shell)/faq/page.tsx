import { OrganizationPage } from '../../../components/OrganizationPage';
export const metadata = { title: 'Frequently asked questions - Immigroov' };
export default function Page() { return <OrganizationPage eyebrow="FAQ" title="Common questions, answered clearly." intro="Quick answers about guidance, mentors, webinars, bookings, and accounts." sections={[
  { title: 'Is Immigroov legal advice?', body: 'No. Immigroov and its Groovia assistant provide educational information and access to lived experience. Consult an appropriately qualified professional for legal advice about your circumstances.' },
  { title: 'How do I choose a mentor?', body: 'Filter by destination, topic, and language, then review the person’s profile, experience, services, price, and availability.' },
  { title: 'How do webinars work?', body: 'Register from the webinar page. Confirmed attendees receive access through the protected join flow when the session is available.' },
  { title: 'Can a mentor request a webinar?', body: 'Yes. Mentors can submit a hosting request from their mentor dashboard. An administrator reviews it before publication.' },
  { title: 'Where are my bookings?', body: 'Signed-in customers can review their sessions from the account area.' },
  { title: 'How do I get support?', body: 'Use the contact form and include the email attached to your account plus any relevant booking or webinar details.' },
]} cta={{ label: 'Contact support', href: '/contact' }} />; }
