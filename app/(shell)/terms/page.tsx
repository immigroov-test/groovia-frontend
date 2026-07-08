import { readFileSync } from 'fs';
import { join } from 'path';
import { LegalDoc } from '../../../components/LegalDoc';

export const metadata = { title: 'Terms of Service - Immigroov' };

function read(name: string): string {
  try {
    return readFileSync(join(process.cwd(), 'content', 'legal', name), 'utf8');
  } catch {
    return '_Content coming soon._';
  }
}

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated="Last updated: 01 Aug 2025"
      groups={[
        { label: 'For Mentors', content: read('terms-mentor.md') },
        { label: 'For Customers', content: read('terms-customer.md') },
      ]}
    />
  );
}
