import { readFileSync } from 'fs';
import { join } from 'path';
import { LegalDoc } from '../../../components/LegalDoc';

export const metadata = { title: 'Privacy Policy — Immigroov' };

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
      updated="Last updated: pending legal review"
      customer={read('privacy-customer.md')}
      mentor={read('privacy-mentor.md')}
    />
  );
}
