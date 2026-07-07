import { readFileSync } from 'fs';
import { join } from 'path';
import { LegalDoc } from '../../../components/LegalDoc';

export const metadata = { title: 'Terms of Service — Immigroov' };

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
      updated="Last updated: pending legal review"
      customer={read('terms-customer.md')}
      mentor={read('terms-mentor.md')}
    />
  );
}
