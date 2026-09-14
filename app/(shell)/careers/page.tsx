import { OrganizationPage } from '../../../components/OrganizationPage';
export const metadata = { title: 'Careers and internships - Immigroov', description: 'Learn about project-based internship opportunities at Immigroov.' };
const href = `/contact?topic=${encodeURIComponent('General Inquiry')}&message=${encodeURIComponent('I would like to ask about current internship opportunities at Immigroov. My area of interest is:')}`;
export default function CareersPage() { return <OrganizationPage eyebrow="Careers and internships" title="Build practical products with Immigroov" intro="Immigroov offers project-based internships when a suitable scope and supervisor are available. Opportunities typically run for four to six months." sections={[
  { title: '1. Scope discussion', body: 'We discuss the project, your interests, availability, and what a useful internship could deliver.' },
  { title: '2. Profile review', body: 'We review your background, motivation, relevant work, and alignment with the available scope.' },
  { title: '3. Technical discussion', body: 'For technical roles, we discuss your approach to problem solving and the tools relevant to the project.' },
  { title: '4. Expectations', body: 'A conversation with Immigroov confirms the working approach, responsibilities, communication, and mutual expectations.' },
  { title: '5. Agreed plan', body: 'Before work begins, the internship receives a defined scope, goals, milestones, and ownership.' },
  { title: '6. Delivery and closure', body: 'The internship concludes with agreed deliverables, an outcome presentation, and a final report where required.' },
]} cta={{ label: 'Ask about current openings', href }} />; }
