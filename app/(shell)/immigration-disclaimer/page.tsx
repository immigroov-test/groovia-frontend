import { OrganizationPage } from '../../../components/OrganizationPage';
export const metadata = { title: 'Immigration guidance disclaimer - Immigroov' };
export default function Page() { return <OrganizationPage eyebrow="IMPORTANT INFORMATION" title="Guidance is not a guaranteed outcome." intro="Immigration rules and individual circumstances change. Groovia helps users prepare better questions and learn from relevant experience; it does not decide applications or guarantee results." sections={[
  { title: 'Educational information', body: 'AI responses, mentor conversations, and webinars are general educational guidance unless a provider explicitly states a regulated professional capacity.' },
  { title: 'Verify important decisions', body: 'Check current requirements with official government sources and seek qualified legal advice when a decision depends on your specific circumstances.' },
  { title: 'No outcome guarantees', body: 'A mentor’s experience, a webinar, or an AI response cannot guarantee visa, admission, employment, or relocation outcomes.' },
  { title: 'Your documents and deadlines', body: 'You remain responsible for the accuracy of submissions, official deadlines, fees, and decisions made using platform information.' },
]} cta={{ label: 'Start with a question', href: '/home?chat=open' }} />; }
