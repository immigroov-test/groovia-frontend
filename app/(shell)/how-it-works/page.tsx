import { OrganizationPage } from '../../../components/OrganizationPage';
export const metadata = { title: 'How Groovia works - Immigroov', description: 'From your first question to a focused conversation or live webinar.' };
export default function Page() { return <OrganizationPage eyebrow="HOW IT WORKS" title="A clearer path from question to action." intro="Groovia helps you orient yourself, find relevant lived experience, and decide on a practical next step." sections={[
  { title: '1. Explain your goal', body: 'Start with your destination, situation, or the question that is holding you back. You do not need to know which service you need.' },
  { title: '2. Explore the options', body: 'Use Groovia for an initial direction, compare mentors, or review upcoming webinars without committing to a purchase.' },
  { title: '3. Choose human support', body: 'Review a mentor’s background, languages, service duration, price, and availability before booking.' },
  { title: '4. Keep moving', body: 'Use your account to return to conversations and manage booked sessions. Educational guidance does not replace regulated legal advice.' },
]} cta={{ label: 'Ask Groovia', href: '/home' }} />; }
