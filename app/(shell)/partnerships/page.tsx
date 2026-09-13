import { OrganizationPage } from '../../../components/OrganizationPage';
export const metadata = { title: 'Partner with Immigroov', description: 'Explore relevant institutional, community, service, and webinar collaborations with Immigroov.' };
const href = `/contact?topic=${encodeURIComponent('Business Inquiry / Collaboration')}&message=${encodeURIComponent('I would like to discuss a potential partnership with Immigroov.')}`;
export default function PartnershipsPage() { return <OrganizationPage eyebrow="Partnerships" title="Work with Immigroov" intro="We are open to relevant collaborations that help international movers access useful information, lived experience, and appropriate services." sections={[
  { title: 'Educational institutions', body: 'Collaborations around student orientation, international mobility, practical preparation, and relevant live sessions.' },
  { title: 'Relocation service providers', body: 'Clear referral or educational collaborations with providers whose scope, responsibilities, and commercial relationship can be explained transparently.' },
  { title: 'International communities', body: 'Community sessions and guidance initiatives designed around recurring questions from people planning or completing a move.' },
  { title: 'Employers and talent networks', body: 'Practical support for internationally mobile professionals and the organizations helping them relocate.' },
  { title: 'Webinar collaborations', body: 'Focused sessions with suitable hosts around a defined audience, topic, scope, and expected learning outcome.' },
  { title: 'How we assess fit', items: ['A clear benefit for international movers', 'Transparent responsibilities and commercial terms', 'Accurate representation of expertise', 'Respect for privacy and responsible guidance'] },
]} cta={{ label: 'Discuss a partnership', href }} />; }
