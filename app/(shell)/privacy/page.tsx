import { readFileSync } from 'fs';
import { join } from 'path';
import { LegalDoc } from '../../../components/LegalDoc';

export const metadata = { title: 'Privacy Policy - Immigroov' };

function read(name: string): string {
  try {
    return readFileSync(join(process.cwd(), 'content', 'legal', name), 'utf8');
  } catch {
    return '_Content coming soon._';
  }
}

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="Last updated: 01 Aug 2025"
      groups={[
        { label: 'For Mentors', content: read('privacy-mentor.md') },
        { label: 'For Customers', content: read('privacy-customer.md') },
        { label: 'Marketing consent', content: read('privacy-marketing-consent.md') },
      ]}
    />
  );
}
