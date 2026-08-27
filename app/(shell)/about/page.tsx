import { AboutContent } from '../../../components/AboutContent';

export const metadata = {
  title: 'About - Immigroov',
  description: 'What Immigroov does and why to choose it.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return <AboutContent />;
}
