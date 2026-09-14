import { OrganizationPage } from '../../../components/OrganizationPage';
export const metadata = { title: 'Mentor approval - Immigroov', description: 'What an approved mentor profile means on Groovia.' };
export default function Page() { return <OrganizationPage eyebrow="MENTOR STANDARDS" title="What an approved mentor means." intro="The approval badge identifies a mentor profile that Immigroov has reviewed and activated. It is not a guarantee of an immigration outcome or a professional licence." sections={[
  { title: 'Who can apply', body: 'Expats and locals with relevant lived or professional experience can apply to offer guidance through Immigroov.' },
  { title: 'What applicants provide', items: ['Profile and contact information', 'Countries, languages, and areas of experience', 'A professional introduction and service descriptions', 'Session pricing and availability'] },
  { title: 'What we review', items: ['Submitted profile details and completeness', 'Relevant lived or professional experience shared in the application', 'Services, pricing, availability, and areas of guidance', 'Agreement to platform responsibilities and conduct expectations'] },
  { title: 'Expected conduct', body: 'Mentors must communicate respectfully, protect personal information, represent their experience honestly, and stay within the scope of the service booked.' },
  { title: 'What users should review', items: ['Whether the mentor’s experience matches your destination and goal', 'The exact session description, duration, and price', 'Languages and availability', 'Published reviews, when genuine reviews are available'] },
  { title: 'Scope of guidance', body: 'Mentors share practical experience and educational guidance. Unless explicitly qualified and permitted, they do not provide regulated legal advice.' },
  { title: 'Questions or concerns', body: 'If a profile or session creates a concern, contact Immigroov support with the relevant details so it can be reviewed.' },
  { title: 'Approval can be removed', body: 'Immigroov may suspend or remove access when profile information, conduct, service delivery, or platform responsibilities do not meet the required standard.' },
]} cta={{ label: 'Browse approved mentors', href: '/mentors' }} />; }
